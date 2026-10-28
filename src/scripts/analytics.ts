// Browser analytics (Firebase Analytics / GA4) behind the consent banner.
// firebase/analytics is only loaded through a dynamic import, after the page is idle, so it never
// weighs on the first paint. Until then events wait in a small queue.
import {
  CONSENT_KEY,
  LOAD_BEFORE_CONSENT,
  analyticsPageUrl,
  calculatorLinkEvent,
  consentModeSettings,
  parseConsentRecord,
  serializeConsentRecord,
  shouldSendAnalytics,
  type AnalyticsEventName,
  type AnalyticsEvents,
  type ConsentChoice,
} from '../lib/analytics';

type AnalyticsSdk = typeof import('firebase/analytics');

interface Client {
  analytics: import('firebase/analytics').Analytics;
  logEvent: AnalyticsSdk['logEvent'];
  setConsent: AnalyticsSdk['setConsent'];
}

type QueuedEvent = [name: AnalyticsEventName, params: Record<string, unknown>];

const MAX_QUEUE = 50;

const sendingEnabled =
  Boolean(import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID) &&
  shouldSendAnalytics(location.hostname, import.meta.env.DEV);

let queue: QueuedEvent[] = [];
/** The choice made on this page, for when storage is unavailable (private mode, full quota). */
let pageChoice: ConsentChoice | null = null;
let client: Client | null = null;
/** True once loading has started; also true after a failed load, so nothing retries. */
let started = false;
/** Set when the SDK can't run here (blocked, unsupported, not configured). */
let unavailable = false;

/** GA4 ignores undefined values anyway; dropping them keeps DebugView tidy. */
function definedParams(params: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

/** Records an event. It is sent once analytics is ready, or logged to the console off production. */
export function track<K extends AnalyticsEventName>(name: K, params: AnalyticsEvents[K]): void {
  const values = definedParams(params);
  if (!sendingEnabled || unavailable) {
    console.debug('[analytics]', name, values);
    return;
  }
  if (client) {
    client.logEvent(client.analytics, name as string, values);
    return;
  }
  if (!LOAD_BEFORE_CONSENT && getConsentChoice() === 'denied') return;
  if (queue.length < MAX_QUEUE) queue.push([name, values]);
}

function giveUp() {
  unavailable = true;
  queue = [];
}

function whenIdle(task: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(task, { timeout: 5000 });
  } else if (document.readyState === 'complete') {
    setTimeout(task, 0);
  } else {
    addEventListener('load', () => setTimeout(task, 0), { once: true });
  }
}

async function load() {
  try {
    const [{ firebaseApp }, sdk] = await Promise.all([
      import('./firebase-app'),
      import('firebase/analytics'),
    ]);
    if (!(await sdk.isSupported())) return giveUp();

    // Consent must be set before initialization so the first hit already respects it.
    sdk.setConsent(consentModeSettings(getConsentChoice() ?? 'denied'));
    const analytics = sdk.initializeAnalytics(firebaseApp, {
      config: {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        // The automatic page view (and every later event) would otherwise carry the full URL,
        // and a shared result URL encodes the answers.
        page_location: analyticsPageUrl(location.href),
        page_referrer: document.referrer ? analyticsPageUrl(document.referrer) : undefined,
      },
    });
    client = { analytics, logEvent: sdk.logEvent, setConsent: sdk.setConsent };

    const pending = queue;
    queue = [];
    for (const [name, params] of pending) client.logEvent(analytics, name as string, params);
  } catch {
    // Missing Firebase config, an ad blocker or a network error: analytics simply stays off.
    giveUp();
  }
}

/** Starts loading analytics when the page is idle. Safe to call many times. */
export function initAnalytics(): void {
  if (started) return;
  if (!sendingEnabled) {
    queue = [];
    return;
  }
  if (!LOAD_BEFORE_CONSENT && getConsentChoice() !== 'granted') return;
  started = true;
  whenIdle(() => void load());
}

/** The visitor's stored, still valid choice, or null when the banner should ask. */
export function getConsentChoice(): ConsentChoice | null {
  try {
    return parseConsentRecord(localStorage.getItem(CONSENT_KEY))?.choice ?? pageChoice;
  } catch {
    return pageChoice;
  }
}

export function saveConsentChoice(choice: ConsentChoice): void {
  pageChoice = choice;
  try {
    localStorage.setItem(CONSENT_KEY, serializeConsentRecord(choice));
  } catch {
    // Private mode or full storage: the choice holds for this page only.
  }
  client?.setConsent({ analytics_storage: choice });
  if (!LOAD_BEFORE_CONSENT) {
    if (choice === 'granted') initAnalytics();
    else if (!client) queue = [];
  }
}

/** One delegated listener for every link to the calculator (header, footer, CTAs, shared results). */
function trackCalculatorLinks(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return;

  let url: URL;
  try {
    url = new URL(link.href, location.href);
  } catch {
    return;
  }
  if (url.origin !== location.origin) return;

  const tracked = calculatorLinkEvent({
    linkPath: url.pathname,
    currentPath: location.pathname,
    location:
      link.closest<HTMLElement>('[data-track-location]')?.dataset.trackLocation || 'unknown',
    inSharedResult: link.closest('[data-shared-result]') !== null,
  });
  if (tracked) track(tracked[0], tracked[1]);
}

// Module scope runs once per page, however many components import this file.
document.addEventListener('click', trackCalculatorLinks, { capture: true });

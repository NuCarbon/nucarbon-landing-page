// Analytics contract: every event the site sends and its parameters (GA4 snake_case).
// Never send calculator answers or user ids, only aggregate values.
import type { StepId } from './calculator/answers.ts';
import type { CalculationResult } from './calculator/calculate.ts';
import type { CategoryId } from './calculator/categories.ts';
import type { ShareMethod } from './share-links.ts';

export type ConsentChoice = 'granted' | 'denied';

export interface AnalyticsEvents {
  calculator_view: { entry: 'direct' | 'project'; ref?: string };
  calculator_start: { step_id: StepId };
  /** `step_index` is 1-based. */
  calculator_step_complete: { step_id: StepId; step_index: number };
  calculator_back: { step_id: StepId; step_index: number };
  calculator_complete: { total_tonnes: number; largest_category: CategoryId | 'none' };
  calculator_restart: Record<string, never>;
  calculator_result_restored: { source: 'draft' | 'account' };
  share_open: { surface: 'calculator_result' };
  share_click: { method: ShareMethod };
  /** Only where completion is observable: native share, Instagram, copy and download. */
  share_complete: { method: ShareMethod };
  shared_result_view: {
    share_version: number;
    total_tonnes: number;
    largest_category: CategoryId | 'none';
  };
  shared_result_cta_click: { location: string };
  calculator_cta_click: { location: string; page_path: string };
  login_prompt_shown: { context: 'calculator_result' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Distributes over `K`: `[name, params]` pairs that a caller can spread into `track`. */
export type AnalyticsEvent<K extends AnalyticsEventName = AnalyticsEventName> = {
  [Name in K]: [Name, AnalyticsEvents[Name]];
}[K];

// Consent ------------------------------------------------------------------------------------

/** localStorage key holding the visitor's analytics choice. */
export const CONSENT_KEY = 'nucarbon:consent';
/** Bump when the banner copy or the purposes change, so everyone is asked again. */
export const CONSENT_VERSION = 1;
/** A stored choice is asked again after about 12 months. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Advanced consent mode (true): the SDK loads with every storage denied and sends cookieless,
 * identifier-free pings until the visitor clicks Aceitar, which keeps funnel counts close to real
 * traffic. LGPD trade-off: those pings still reach Google (IP address, user agent, page) before
 * any choice, and the Firebase SDK keeps an installation id in IndexedDB; we rely on legitimate
 * interest for that aggregate measurement. Set it to false for basic mode: nothing loads and
 * nothing is sent until Aceitar, and events tracked before that are dropped.
 */
export const LOAD_BEFORE_CONSENT: boolean = true;

export interface ConsentRecord {
  choice: ConsentChoice;
  version: number;
  /** Epoch milliseconds of the choice. */
  updatedAt: number;
}

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'granted' || value === 'denied';
}

/** The stored record, or null when it is missing, malformed, from another version or expired. */
export function parseConsentRecord(
  raw: string | null,
  now: number = Date.now(),
): ConsentRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { choice, version, updatedAt } = value as Record<string, unknown>;
  if (!isConsentChoice(choice) || version !== CONSENT_VERSION) return null;
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return null;
  if (updatedAt > now || now - updatedAt > CONSENT_MAX_AGE_MS) return null;
  return { choice, version, updatedAt };
}

export function serializeConsentRecord(choice: ConsentChoice, now: number = Date.now()): string {
  const record: ConsentRecord = { choice, version: CONSENT_VERSION, updatedAt: now };
  return JSON.stringify(record);
}

/** Google consent mode state: only analytics storage follows the choice, ads stay denied. */
export function consentModeSettings(choice: ConsentChoice) {
  return {
    analytics_storage: choice,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  } as const satisfies Record<string, ConsentChoice>;
}

// Sending rules ------------------------------------------------------------------------------

const PRODUCTION_HOSTS: readonly string[] = ['nucarbon.com.br', 'www.nucarbon.com.br'];

/** Events reach GA4 only from the production site; previews, localhost and dev log instead. */
export function shouldSendAnalytics(hostname: string, isDev: boolean): boolean {
  return !isDev && PRODUCTION_HOSTS.includes(hostname.toLowerCase());
}

/** A `ref` query value that is safe to send as-is (short slug), otherwise undefined. */
export function sanitizeRef(raw: string | null | undefined): string | undefined {
  return raw && /^[a-z0-9_-]{1,32}$/.test(raw) ? raw : undefined;
}

// Param builders -----------------------------------------------------------------------------

/** Params for step events; `index0` is the 0-based position, GA4 gets it 1-based. */
export function stepParams(stepId: StepId, index0: number) {
  return { step_id: stepId, step_index: index0 + 1 } satisfies AnalyticsEvents['calculator_back'];
}

export function calculatorCompleteParams(
  result: Pick<CalculationResult, 'total' | 'largestCategory'>,
): AnalyticsEvents['calculator_complete'] {
  return {
    total_tonnes: Math.round(result.total * 100) / 100,
    largest_category: result.largestCategory ?? 'none',
  };
}

const CALCULATOR_PATH = /^\/calculadora\/?$/;
const SHARED_RESULT_PATH = /^\/calculadora\/resultado\/[^/]+/;

/** Path without query, hash or trailing slash ("/" stays "/"). */
function normalizePath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/** `page_path` for events: shared result codes are collapsed so no answers leave the browser. */
export function analyticsPagePath(path: string): string {
  return normalizePath(path).replace(SHARED_RESULT_PATH, '/calculadora/resultado');
}

/**
 * A page URL as reported to analytics (`page_location`, `page_referrer`): the share code is
 * removed from shared result paths, because it encodes the visitor's answers. The query is
 * kept, so UTM attribution still works. Unparseable values become an empty string.
 */
export function analyticsPageUrl(href: string): string {
  try {
    const url = new URL(href);
    url.pathname = url.pathname.replace(SHARED_RESULT_PATH, '/calculadora/resultado');
    return url.href;
  } catch {
    return '';
  }
}

export interface CalculatorLinkContext {
  /** Pathname (query and hash are ignored) of the clicked same-origin link. */
  linkPath: string;
  /** Pathname of the current page. */
  currentPath: string;
  /** Nearest `data-track-location`, e.g. "header", "footer", "hero". */
  location: string;
  /** Whether the link sits inside `[data-shared-result]`. */
  inSharedResult: boolean;
}

/** The event for a click on a link to the calculator, or null when it is not tracked. */
export function calculatorLinkEvent({
  linkPath,
  currentPath,
  location,
  inSharedResult,
}: CalculatorLinkContext): AnalyticsEvent<
  'shared_result_cta_click' | 'calculator_cta_click'
> | null {
  if (!CALCULATOR_PATH.test(normalizePath(linkPath))) return null;
  if (inSharedResult) return ['shared_result_cta_click', { location }];
  if (CALCULATOR_PATH.test(normalizePath(currentPath))) return null;
  return ['calculator_cta_click', { location, page_path: analyticsPagePath(currentPath) }];
}

// Browser analytics (Firebase Analytics / GA4) behind the consent banner.
// Stub: implemented by workstream B; the signatures are the contract other scripts use.
import type { AnalyticsEventName, AnalyticsEvents, ConsentChoice } from '../lib/analytics';

export function track<K extends AnalyticsEventName>(_name: K, _params: AnalyticsEvents[K]): void {}

export function initAnalytics(): void {}

export function getConsentChoice(): ConsentChoice | null {
  return null;
}

export function saveConsentChoice(_choice: ConsentChoice): void {}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONSENT_KEY,
  CONSENT_MAX_AGE_MS,
  CONSENT_VERSION,
  analyticsPagePath,
  analyticsPageUrl,
  calculatorCompleteParams,
  calculatorLinkEvent,
  consentModeSettings,
  parseConsentRecord,
  sanitizeRef,
  serializeConsentRecord,
  shouldSendAnalytics,
  stepParams,
} from '../src/lib/analytics.ts';

const NOW = Date.UTC(2026, 9, 28);
const record = (fields) =>
  JSON.stringify({ choice: 'granted', version: 1, updatedAt: NOW, ...fields });

test('the consent key follows the nucarbon: namespace', () => {
  assert.equal(CONSENT_KEY, 'nucarbon:consent');
  assert.equal(CONSENT_VERSION, 1);
});

test('a valid consent record is parsed', () => {
  assert.deepEqual(parseConsentRecord(record({}), NOW), {
    choice: 'granted',
    version: 1,
    updatedAt: NOW,
  });
  assert.equal(parseConsentRecord(record({ choice: 'denied' }), NOW)?.choice, 'denied');
});

test('missing or invalid JSON is no choice', () => {
  for (const raw of [null, '', '{', 'granted', 'undefined']) {
    assert.equal(parseConsentRecord(raw, NOW), null, String(raw));
  }
});

test('records with the wrong shape are rejected', () => {
  for (const raw of [
    'null',
    '42',
    '"granted"',
    '[]',
    record({ choice: 'yes' }),
    record({ choice: undefined }),
    record({ updatedAt: '2026-10-28' }),
    record({ updatedAt: null }),
    record({ version: '1' }),
  ]) {
    assert.equal(parseConsentRecord(raw, NOW), null, raw);
  }
});

test('records from another version are rejected', () => {
  assert.equal(parseConsentRecord(record({ version: 0 }), NOW), null);
  assert.equal(parseConsentRecord(record({ version: CONSENT_VERSION + 1 }), NOW), null);
});

test('records expire after about 12 months and cannot come from the future', () => {
  const day = 24 * 60 * 60 * 1000;
  assert.ok(CONSENT_MAX_AGE_MS >= 360 * day && CONSENT_MAX_AGE_MS <= 370 * day);
  assert.notEqual(parseConsentRecord(record({ updatedAt: NOW - CONSENT_MAX_AGE_MS }), NOW), null);
  assert.equal(parseConsentRecord(record({ updatedAt: NOW - CONSENT_MAX_AGE_MS - 1 }), NOW), null);
  assert.equal(parseConsentRecord(record({ updatedAt: NOW + day }), NOW), null);
});

test('serialized records round-trip', () => {
  for (const choice of ['granted', 'denied']) {
    assert.deepEqual(parseConsentRecord(serializeConsentRecord(choice, NOW), NOW), {
      choice,
      version: CONSENT_VERSION,
      updatedAt: NOW,
    });
  }
  assert.equal(parseConsentRecord(serializeConsentRecord('granted')).choice, 'granted');
});

test('consent mode only follows the choice for analytics storage', () => {
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  assert.deepEqual(consentModeSettings('granted'), { analytics_storage: 'granted', ...denied });
  assert.deepEqual(consentModeSettings('denied'), { analytics_storage: 'denied', ...denied });
});

test('sanitizeRef keeps short slugs only', () => {
  for (const ref of ['shared_result', 'shared_invalid', 'hero', 'a', 'x-1', 'a'.repeat(32)]) {
    assert.equal(sanitizeRef(ref), ref);
  }
  for (const ref of [
    null,
    undefined,
    '',
    'a'.repeat(33),
    'Hero',
    'a b',
    'joao@x.com',
    '<script>',
  ]) {
    assert.equal(sanitizeRef(ref), undefined, String(ref));
  }
});

test('analytics only sends from the production hosts outside dev', () => {
  assert.equal(shouldSendAnalytics('nucarbon.com.br', false), true);
  assert.equal(shouldSendAnalytics('www.nucarbon.com.br', false), true);
  assert.equal(shouldSendAnalytics('nucarbon.com.br', true), false);
  for (const host of [
    'localhost',
    '127.0.0.1',
    'deploy-preview-12--nucarbon.netlify.app',
    'nucarbon.com.br.evil.com',
    'staging.nucarbon.com.br',
  ]) {
    assert.equal(shouldSendAnalytics(host, false), false, host);
  }
});

test('step params are 1-based', () => {
  assert.deepEqual(stepParams('profile', 0), { step_id: 'profile', step_index: 1 });
  assert.deepEqual(stepParams('waste', 5), { step_id: 'waste', step_index: 6 });
});

test('completion params round the total and name the largest category', () => {
  assert.deepEqual(calculatorCompleteParams({ total: 4.8349, largestCategory: 'transport' }), {
    total_tonnes: 4.83,
    largest_category: 'transport',
  });
  assert.deepEqual(calculatorCompleteParams({ total: 0, largestCategory: null }), {
    total_tonnes: 0,
    largest_category: 'none',
  });
});

test('links to the calculator from other pages are calculator CTA clicks', () => {
  for (const linkPath of [
    '/calculadora',
    '/calculadora/',
    '/calculadora?ref=hero',
    '/calculadora/#x',
  ]) {
    assert.deepEqual(
      calculatorLinkEvent({
        linkPath,
        currentPath: '/',
        location: 'header',
        inSharedResult: false,
      }),
      ['calculator_cta_click', { location: 'header', page_path: '/' }],
      linkPath,
    );
  }
  assert.deepEqual(
    calculatorLinkEvent({
      linkPath: '/calculadora',
      currentPath: '/projetos/mata-atlantica/',
      location: 'unknown',
      inSharedResult: false,
    }),
    ['calculator_cta_click', { location: 'unknown', page_path: '/projetos/mata-atlantica' }],
  );
});

test('links inside a shared result are shared result CTA clicks', () => {
  assert.deepEqual(
    calculatorLinkEvent({
      linkPath: '/calculadora',
      currentPath: '/calculadora/resultado/1abcd2',
      location: 'shared_result',
      inSharedResult: true,
    }),
    ['shared_result_cta_click', { location: 'shared_result' }],
  );
});

test('shared result codes never reach page_path', () => {
  assert.deepEqual(
    calculatorLinkEvent({
      linkPath: '/calculadora',
      currentPath: '/calculadora/resultado/1abcd2',
      location: 'header',
      inSharedResult: false,
    }),
    ['calculator_cta_click', { location: 'header', page_path: '/calculadora/resultado' }],
  );
  assert.equal(analyticsPagePath('/calculadora/resultado/1abcd2/'), '/calculadora/resultado');
  assert.equal(analyticsPagePath('/'), '/');
});

test('page URLs sent to analytics drop the share code but keep the query', () => {
  assert.equal(
    analyticsPageUrl('https://nucarbon.com.br/calculadora/resultado/100u9g?utm_source=whatsapp'),
    'https://nucarbon.com.br/calculadora/resultado?utm_source=whatsapp',
  );
  assert.equal(
    analyticsPageUrl('https://nucarbon.com.br/calculadora/resultado/100u9g/og.png'),
    'https://nucarbon.com.br/calculadora/resultado/og.png',
  );
  assert.equal(
    analyticsPageUrl('https://nucarbon.com.br/calculadora?ref=shared_result'),
    'https://nucarbon.com.br/calculadora?ref=shared_result',
  );
  assert.equal(analyticsPageUrl('not a url'), '');
});

test('other links and links within the calculator are not tracked', () => {
  const base = { currentPath: '/', location: 'header', inSharedResult: false };
  for (const linkPath of [
    '/',
    '/projetos',
    '/calculadora/resultado/1abcd2',
    '/calculadora-x',
    '/app',
  ]) {
    assert.equal(calculatorLinkEvent({ ...base, linkPath }), null, linkPath);
  }
  assert.equal(calculatorLinkEvent({ ...base, linkPath: '/projetos', inSharedResult: true }), null);
  for (const currentPath of ['/calculadora', '/calculadora/']) {
    assert.equal(calculatorLinkEvent({ ...base, linkPath: '/calculadora', currentPath }), null);
  }
});

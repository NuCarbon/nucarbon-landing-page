import assert from 'node:assert/strict';
import test from 'node:test';
import { shareMessage, socialShareHref, withShareUtm } from '../src/lib/share-links.ts';

const URL_TO_SHARE = 'https://nucarbon.com.br/calculadora/resultado/100u9g?utm_source=copy_link';

test('UTM tags are set, replacing older ones and keeping other parameters', () => {
  const tagged = new URL(
    withShareUtm(
      'https://nucarbon.com.br/calculadora/resultado/100u9g?ref=a&utm_source=x#top',
      'instagram_stories',
    ),
  );
  assert.equal(tagged.pathname, '/calculadora/resultado/100u9g');
  assert.equal(tagged.hash, '#top');
  assert.equal(tagged.searchParams.get('ref'), 'a');
  assert.deepEqual(tagged.searchParams.getAll('utm_source'), ['instagram_stories']);
  assert.equal(tagged.searchParams.get('utm_medium'), 'social');
  assert.equal(tagged.searchParams.get('utm_campaign'), 'calculator_share');
  assert.equal(
    new URL(withShareUtm(new URL('https://nucarbon.com.br/x'), 'copy_link')).searchParams.get(
      'utm_source',
    ),
    'copy_link',
  );
});

test('the message uses the pt-BR tonnes format', () => {
  assert.equal(
    shareMessage(4.8),
    'Minha pegada de carbono estimada é de 4,8 tCO₂e por ano. Calcule a sua:',
  );
  assert.match(shareMessage(12.345), /de 12,35 tCO₂e/);
});

test('each network gets its share URL with encoded parameters', () => {
  const text = shareMessage(4.8);
  const cases = {
    whatsapp: ['https://wa.me/', { text: `${text} ${URL_TO_SHARE}` }],
    x: ['https://x.com/intent/post', { text, url: URL_TO_SHARE }],
    facebook: ['https://www.facebook.com/sharer/sharer.php', { u: URL_TO_SHARE }],
    linkedin: ['https://www.linkedin.com/sharing/share-offsite/', { url: URL_TO_SHARE }],
    telegram: ['https://t.me/share/url', { url: URL_TO_SHARE, text }],
  };
  for (const [network, [base, params]] of Object.entries(cases)) {
    const href = socialShareHref(network, URL_TO_SHARE, text);
    const parsed = new URL(href);
    assert.equal(`${parsed.origin}${parsed.pathname}`, base, network);
    assert.deepEqual(Object.fromEntries(parsed.searchParams), params, network);
    // The shared URL's own query must not leak into the share URL's parameters.
    assert.doesNotMatch(href, /[?&]utm_source=/, network);
    assert.doesNotMatch(href, /[ ₂é]/, network);
  }
});

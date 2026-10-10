import assert from 'node:assert/strict';
import test from 'node:test';
import { missingProjectFields } from '../netlify/functions/_project-content.ts';

test('known demo projects have unique immutable slugs and demo prices', () => {
  const ids = [
    'a834e161-c18c-48f6-bc36-091a7c359231',
    'cf4c1d20-559c-41a0-b080-f07d3eccfa36',
    'a872b723-e559-480d-8684-adc8d0d0697f',
  ];
  const fields = ids.map((id) => missingProjectFields(id, 'Demo'));
  assert.equal(new Set(fields.map(({ slug }) => slug)).size, ids.length);
  assert.ok(fields.every(({ published, pricePerTonneCents }) => published && pricePerTonneCents === 7500));
});
test('unknown existing projects remain unpublished by default', () => {
  const fields = missingProjectFields('11111111-1111-4111-8111-111111111111', 'Projeto Exemplo');
  assert.equal(fields.published, false);
  assert.match(fields.slug, /^projeto-exemplo-11111111$/);
  assert.deepEqual(fields.documents, []);
});

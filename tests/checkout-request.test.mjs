import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCheckoutRequest } from '../src/server/checkout.ts';
import { HttpError } from '../src/server/http.ts';

const key = '9b2f8f4e-6a39-4c55-9a43-3c8d8a1f0e21';
const slug = 'corredores-mata-atlantica';

const rejects = (body, message) =>
  assert.throws(
    () => parseCheckoutRequest(body),
    (error) => error instanceof HttpError && error.status === 400 && error.message === message,
    JSON.stringify(body),
  );

test('manual and percentage selections keep only the fields the server uses', () => {
  assert.deepEqual(
    parseCheckoutRequest({ key, slug, mode: 'manual', quantity: 0.29, createdAt: 1 }),
    { key, slug, mode: 'manual', quantity: 0.29 },
  );
  assert.deepEqual(
    parseCheckoutRequest({ key, slug, mode: 'percentage', percentage: 25, quantity: 999 }),
    { key, slug, mode: 'percentage', percentage: 25 },
  );
  assert.equal(
    parseCheckoutRequest({ key, slug, mode: 'percentage', percentage: 100 }).percentage,
    100,
  );
});

test('malformed keys, slugs and modes are rejected', () => {
  for (const body of [
    null,
    [],
    'checkout',
    { slug, mode: 'manual', quantity: 1 },
    { key: 'not-a-uuid', slug, mode: 'manual', quantity: 1 },
    { key, slug: '../admin', mode: 'manual', quantity: 1 },
    { key, slug: 'Mata Atlântica', mode: 'manual', quantity: 1 },
    { key, slug, mode: 'free', quantity: 1 },
    { key, slug },
  ])
    rejects(body, 'Invalid checkout');
});

test('percentages and quantities must be offered values', () => {
  for (const percentage of [50, '25', 0, null, undefined])
    rejects({ key, slug, mode: 'percentage', percentage }, 'Invalid percentage');
  for (const quantity of [0, -1, 0.001, 1000.01, NaN, '1', null, undefined])
    rejects({ key, slug, mode: 'manual', quantity }, 'Invalid quantity');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import { buildUserCalculation, createSaveCalculationHandler, parseAnswers } from '../netlify/functions/_calculator.ts';
import { initialAnswers, ProfileAnswer } from '../src/scripts/calculator/state.ts';
import { calculateFootprint } from '../src/scripts/calculator/calculate.ts';

const request = (body, method = 'POST', contentType = 'application/json') => new Request('https://example.test/api/calculator-result', {
  method, headers: { 'Content-Type': contentType }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
});

test('save uses authenticated identity and server-calculated totals', async () => {
  const writes = [];
  const timestamp = Timestamp.fromMillis(1791547200000);
  const handler = createSaveCalculationHandler(async (uid, data) => { writes.push({ uid, data }); }, () => timestamp);
  const response = await handler(request({ answers: initialAnswers }), {}, { uid: 'verified-user-123' });
  assert.equal(response.status, 200);
  assert.equal(writes[0].uid, 'verified-user-123');
  const calculation = writes[0].data;
  assert.equal(calculation.footprint.annualEmissionsTonnes, calculateFootprint(initialAnswers).total);
  assert.equal(calculation.footprint.updatedAt, calculation.calculator.updatedAt);
  assert.deepEqual(await response.json(), { footprint: {
    annualEmissionsTonnes: calculateFootprint(initialAnswers).total, updatedAt: timestamp.toMillis(),
  } });
  assert.ok(Object.values(calculation.calculator.answers).every((value) => typeof value === 'number'));
  assert.ok(Object.values(calculation.calculator.categoryEmissionsTonnes).every((value) => typeof value === 'number'));
  assert.equal(calculation.calculator.answers.weeklyDistanceKm, initialAnswers.distance);
});

test('rejects missing/invalid answers, unsupported profiles, and forged identity or totals without writing', async () => {
  let writes = 0;
  const handler = createSaveCalculationHandler(async () => { writes++; });
  for (const body of [
    {}, { answers: {} }, { answers: { ...initialAnswers, distance: -1 } },
    { answers: { ...initialAnswers, distance: 501 } }, { answers: { ...initialAnswers, distance: '180' } },
    { answers: { ...initialAnswers, food: 'unknown' } },
    { answers: { ...initialAnswers, profile: ProfileAnswer.Company } },
    { answers: initialAnswers, userId: 'someone-else' },
    { answers: initialAnswers, total: 0 },
  ]) {
    const response = await handler(request(body), {}, { uid: 'owner' });
    assert.equal(response.status, 400);
  }
  assert.equal(writes, 0);
  assert.throws(() => parseAnswers({ ...initialAnswers, distance: NaN }));
});

test('rejects unsupported methods, media types, and oversized requests', async () => {
  const handler = createSaveCalculationHandler(async () => { assert.fail('Must not write'); });
  assert.equal((await handler(request({}, 'GET'), {}, { uid: 'owner' })).status, 405);
  assert.equal((await handler(request({}, 'POST', 'text/plain'), {}, { uid: 'owner' })).status, 415);
  assert.equal((await handler(request({ answers: 'x'.repeat(5000) }), {}, { uid: 'owner' })).status, 413);
});

test('failed persistence cannot report success; retry updates the same user', async () => {
  let attempts = 0;
  const writes = new Map();
  const handler = createSaveCalculationHandler(async (uid, data) => {
    if (++attempts === 1) throw new Error('Database unavailable');
    writes.set(uid, data);
  });
  await assert.rejects(handler(request({ answers: initialAnswers }), {}, { uid: 'owner' }));
  assert.equal((await handler(request({ answers: initialAnswers }), {}, { uid: 'owner' })).status, 200);
  assert.equal((await handler(request({ answers: { ...initialAnswers, distance: 60 } }), {}, { uid: 'owner' })).status, 200);
  assert.equal(writes.size, 1);
  assert.equal(writes.get('owner').calculator.answers.weeklyDistanceKm, 60);
});

test('calculations keep a numeric result snapshot rather than display copy', () => {
  const data = buildUserCalculation(initialAnswers, Timestamp.now());
  assert.equal('attention' in data.calculator, false);
  assert.equal('tips' in data.calculator, false);
});

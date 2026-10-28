import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import {
  answerCodes,
  buildUserCalculation,
  createSaveCalculationHandler,
  decodeAnswers,
  encodeAnswers,
  savedCalculatorResult,
} from '../src/server/calculator.ts';
import { route } from '../src/server/http.ts';
import {
  initialAnswers,
  parseAnswers,
  ProfileAnswer,
  SUPPORTED_ANSWERS,
} from '../src/lib/calculator/answers.ts';
import { calculateFootprint } from '../src/lib/calculator/calculate.ts';

const request = (body, method = 'POST', contentType = 'application/json') =>
  new Request('https://example.test/api/calculator-result', {
    method,
    headers: { 'Content-Type': contentType, Authorization: 'Bearer test-token' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });

/** The save handler as deployed: behind route(), with a fake verified identity. */
const endpoint = (persist, { uid = 'owner', now } = {}) =>
  route(
    { POST: createSaveCalculationHandler(persist, now) },
    { auth: true, errorMessage: 'Unable to save', verifyToken: async () => ({ uid }) },
  );

test('save uses authenticated identity and server-calculated totals', async () => {
  const writes = [];
  const timestamp = Timestamp.fromMillis(1791547200000);
  const handler = endpoint(
    async (uid, data) => {
      writes.push({ uid, data });
    },
    { uid: 'verified-user-123', now: () => timestamp },
  );
  const response = await handler(request({ answers: initialAnswers }), {});
  assert.equal(response.status, 200);
  assert.equal(writes[0].uid, 'verified-user-123');
  const calculation = writes[0].data;
  assert.equal(
    calculation.footprint.annualEmissionsTonnes,
    calculateFootprint(initialAnswers).total,
  );
  assert.equal(calculation.footprint.updatedAt, calculation.calculator.updatedAt);
  assert.deepEqual(await response.json(), {
    footprint: {
      annualEmissionsTonnes: calculateFootprint(initialAnswers).total,
      updatedAt: timestamp.toMillis(),
    },
  });
  assert.ok(
    Object.values(calculation.calculator.answers).every((value) => typeof value === 'number'),
  );
  assert.ok(
    Object.values(calculation.calculator.categoryEmissionsTonnes).every(
      (value) => typeof value === 'number',
    ),
  );
  assert.equal(calculation.calculator.answers.weeklyDistanceKm, initialAnswers.distance);
});

test('rejects missing/invalid answers, unsupported profiles, and forged identity or totals without writing', async () => {
  let writes = 0;
  const handler = endpoint(async () => {
    writes++;
  });
  for (const body of [
    {},
    null,
    [],
    { answers: {} },
    { answers: { ...initialAnswers, distance: -1 } },
    { answers: { ...initialAnswers, distance: 501 } },
    { answers: { ...initialAnswers, distance: '180' } },
    { answers: { ...initialAnswers, food: 'unknown' } },
    { answers: { ...initialAnswers, profile: ProfileAnswer.Company } },
    { answers: initialAnswers, userId: 'someone-else' },
    { answers: initialAnswers, total: 0 },
  ]) {
    const response = await handler(request(body), {});
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), { error: 'Invalid calculator answers' });
  }
  assert.equal(writes, 0);
  assert.throws(() => parseAnswers({ ...initialAnswers, distance: NaN }));
});

test('rejects unsupported methods, media types, and oversized requests', async () => {
  const handler = endpoint(async () => {
    assert.fail('Must not write');
  });
  assert.equal((await handler(request({}, 'GET'), {})).status, 405);
  assert.equal((await handler(request({}, 'POST', 'text/plain'), {})).status, 415);
  assert.equal((await handler(request({ answers: 'x'.repeat(5000) }), {})).status, 413);
});

test('failed persistence cannot report success; retry updates the same user', async (t) => {
  t.mock.method(console, 'error', () => {});
  let attempts = 0;
  const writes = new Map();
  const handler = endpoint(async (uid, data) => {
    if (++attempts === 1) throw new Error('Database unavailable');
    writes.set(uid, data);
  });
  const failed = await handler(request({ answers: initialAnswers }), {});
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'Unable to save' });
  assert.equal((await handler(request({ answers: initialAnswers }), {})).status, 200);
  assert.equal(
    (await handler(request({ answers: { ...initialAnswers, distance: 60 } }), {})).status,
    200,
  );
  assert.equal(writes.size, 1);
  assert.equal(writes.get('owner').calculator.answers.weeklyDistanceKm, 60);
});

test('calculations keep a numeric result snapshot rather than display copy', () => {
  const data = buildUserCalculation(initialAnswers, Timestamp.now());
  assert.equal('attention' in data.calculator, false);
  assert.equal('tips' in data.calculator, false);
});

test('storage codes cover every supported answer, are unique per step, and round-trip', () => {
  for (const [step, values] of Object.entries(SUPPORTED_ANSWERS)) {
    const codes = answerCodes[step];
    assert.ok(codes, `missing codes for ${step}`);
    for (const value of values) {
      assert.ok(Number.isSafeInteger(codes[value]), `missing code for ${step} "${value}"`);
    }
    const used = Object.values(codes);
    assert.equal(new Set(used).size, used.length, `duplicate code in ${step}`);
  }
  assert.deepEqual(Object.keys(answerCodes).sort(), Object.keys(SUPPORTED_ANSWERS).sort());

  for (const [step, values] of Object.entries(SUPPORTED_ANSWERS)) {
    for (const value of values) {
      const answers = { ...initialAnswers, [step]: value };
      assert.deepEqual(decodeAnswers(encodeAnswers(answers)), answers);
    }
  }
});

test('saved answers that can no longer be decoded read as no result', (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const footprint = { annualEmissionsTonnes: 4.8, updatedAt: 1791547200000 };
  const user = { uid: 'owner', footprint, metrics: [] };
  assert.deepEqual(
    savedCalculatorResult({ ...user, calculatorAnswers: encodeAnswers(initialAnswers) }),
    { answers: initialAnswers, footprint },
  );
  for (const calculatorAnswers of [
    { ...encodeAnswers(initialAnswers), food: 99 },
    { ...encodeAnswers(initialAnswers), weeklyDistanceKm: 'far' },
    'corrupt',
  ]) {
    assert.equal(savedCalculatorResult({ ...user, calculatorAnswers }), null);
  }
  assert.equal(logged.mock.callCount(), 3);
  assert.equal(savedCalculatorResult({ ...user, footprint: null, calculatorAnswers: {} }), null);
  assert.equal(savedCalculatorResult({ ...user, calculatorAnswers: undefined }), null);
});

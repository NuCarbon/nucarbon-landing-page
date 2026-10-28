import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAmount } from '../src/lib/checkout/amount.ts';

test('manual quantities and percentage selections use integer cents', () => {
  assert.deepEqual(calculateAmount({ mode: 'manual', quantity: 0.29 }, 7500), {
    quantityTonnes: 0.29,
    totalCents: 2175,
  });
  assert.deepEqual(
    calculateAmount({ mode: 'percentage', percentage: 25, annualFootprint: 4.8 }, 7500),
    { quantityTonnes: 1.2, totalCents: 9000 },
  );
  assert.deepEqual(
    calculateAmount({ mode: 'percentage', percentage: 100, annualFootprint: 4.8 }, 7500),
    { quantityTonnes: 4.8, totalCents: 36000 },
  );
  assert.deepEqual(calculateAmount({ mode: 'manual', quantity: 0.01 }, 7555), {
    quantityTonnes: 0.01,
    totalCents: 76,
  });
});
test('rejects invalid quantities and prices', () => {
  for (const quantity of [0, -0.01, 0.001, 1000.01, NaN, Infinity])
    assert.throws(() => calculateAmount({ mode: 'manual', quantity }, 7500));
  assert.throws(() =>
    calculateAmount({ mode: 'percentage', percentage: 25, annualFootprint: 0 }, 7500),
  );
  assert.throws(() =>
    calculateAmount({ mode: 'percentage', percentage: 50, annualFootprint: 4.8 }, 7500),
  );
  assert.throws(() => calculateAmount({ mode: 'manual', quantity: 1 }, 0));
});

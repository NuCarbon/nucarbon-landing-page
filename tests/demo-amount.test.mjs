import assert from 'node:assert/strict';
import test from 'node:test';
import { demoAmount } from '../src/scripts/checkout/amount.ts';

test('manual quantities and percentage selections use integer cents', () => {
  assert.deepEqual(demoAmount({ mode:'manual', quantity: .29 }, 7500), { quantityTonnes:.29, totalCents:2175 });
  assert.deepEqual(demoAmount({ mode:'percentage', percentage:25, annualFootprint:4.8 }, 7500), { quantityTonnes:1.2, totalCents:9000 });
  assert.deepEqual(demoAmount({ mode:'percentage', percentage:100, annualFootprint:4.8 }, 7500), { quantityTonnes:4.8, totalCents:36000 });
  assert.deepEqual(demoAmount({ mode:'manual', quantity:.01 }, 7555), { quantityTonnes:.01, totalCents:76 });
});
test('rejects invalid quantities and prices', () => {
  for (const quantity of [0, -.01, .001, 1000.01, NaN, Infinity]) assert.throws(() => demoAmount({ mode:'manual', quantity }, 7500));
  assert.throws(() => demoAmount({ mode:'percentage', percentage:25, annualFootprint:0 }, 7500));
  assert.throws(() => demoAmount({ mode:'percentage', percentage:50, annualFootprint:4.8 }, 7500));
  assert.throws(() => demoAmount({ mode:'manual', quantity:1 }, 0));
});

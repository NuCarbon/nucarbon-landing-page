import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DISTANCE_KM,
  initialAnswers,
  isCalculatorAnswers,
  parseAnswers,
  ProfileAnswer,
} from '../src/lib/calculator/answers.ts';

test('initial answers are valid and parsing returns a copy', () => {
  const parsed = parseAnswers(initialAnswers);
  assert.deepEqual(parsed, initialAnswers);
  assert.notEqual(parsed, initialAnswers);
  assert.equal(isCalculatorAnswers(initialAnswers), true);
});

test('profiles shown as "Em breve" are rejected', () => {
  for (const profile of [ProfileAnswer.Family, ProfileAnswer.Company, ProfileAnswer.Event]) {
    assert.throws(() => parseAnswers({ ...initialAnswers, profile }), /Invalid profile/);
    assert.equal(isCalculatorAnswers({ ...initialAnswers, profile }), false);
  }
});

test('answers must have exactly the expected fields', () => {
  assert.throws(() => parseAnswers({ ...initialAnswers, uid: 'someone-else' }), /fields/);
  const { waste: _waste, ...missing } = initialAnswers;
  assert.throws(() => parseAnswers(missing), /fields/);
  assert.throws(() => parseAnswers({ ...initialAnswers, home: 'castle' }), /Invalid home/);
  for (const value of [null, undefined, 'answers', 42, [initialAnswers]]) {
    assert.equal(isCalculatorAnswers(value), false);
  }
});

test('weekly distance must be a multiple of the step within the slider range', () => {
  for (const distance of [DISTANCE_KM.min, 250, DISTANCE_KM.max]) {
    assert.equal(isCalculatorAnswers({ ...initialAnswers, distance }), true, String(distance));
  }
  for (const distance of [185, DISTANCE_KM.max + 10, -10, Number.NaN, Infinity, '180']) {
    assert.throws(
      () => parseAnswers({ ...initialAnswers, distance }),
      /distance/,
      String(distance),
    );
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DISTANCE_KM,
  EnergyAnswer,
  FoodAnswer,
  HomeAnswer,
  initialAnswers,
  ProfileAnswer,
  SUPPORTED_ANSWERS,
  TransportAnswer,
  WasteAnswer,
} from '../src/lib/calculator/answers.ts';
import {
  decodeShareCode,
  encodeShareCode,
  SHARE_V1_DISTANCE,
  SHARE_V1_OPTIONS,
} from '../src/lib/calculator/share.ts';

const CODE_PATTERN = /^1[0-9a-z]{5}$/;
const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

function* supportedAnswers() {
  const distances = [];
  for (let km = DISTANCE_KM.min; km <= DISTANCE_KM.max; km += DISTANCE_KM.step) distances.push(km);
  for (const profile of SUPPORTED_ANSWERS.profile)
    for (const home of SUPPORTED_ANSWERS.home)
      for (const transport of SUPPORTED_ANSWERS.transport)
        for (const energy of SUPPORTED_ANSWERS.energy)
          for (const food of SUPPORTED_ANSWERS.food)
            for (const waste of SUPPORTED_ANSWERS.waste)
              for (const distance of distances)
                yield { profile, home, transport, distance, energy, food, waste };
}

test('every supported combination round-trips through a unique code', () => {
  const codes = new Set();
  for (const answers of supportedAnswers()) {
    const code = encodeShareCode(answers);
    assert.match(code, CODE_PATTERN);
    assert.deepEqual(decodeShareCode(code), answers);
    codes.add(code);
  }
  assert.equal(codes.size, 1 * 3 * 6 * 3 * 5 * 3 * 51);
});

test('the code of the initial answers never changes', () => {
  assert.equal(encodeShareCode(initialAnswers), '100u9g');
});

test('the v1 tables list every enum value exactly once', () => {
  const enums = {
    profile: ProfileAnswer,
    home: HomeAnswer,
    transport: TransportAnswer,
    energy: EnergyAnswer,
    food: FoodAnswer,
    waste: WasteAnswer,
  };
  assert.deepEqual(Object.keys(SHARE_V1_OPTIONS), Object.keys(enums));
  for (const [step, values] of Object.entries(enums)) {
    const table = SHARE_V1_OPTIONS[step];
    assert.equal(new Set(table).size, table.length, step);
    assert.deepEqual([...table].sort(), Object.values(values).sort(), step);
  }
});

test('the v1 tables keep their positions', () => {
  assert.deepEqual(SHARE_V1_OPTIONS, {
    profile: ['person', 'family', 'company', 'event'],
    home: ['apartment', 'small-house', 'large-house'],
    transport: ['gas', 'ethanol', 'electric', 'motorcycle', 'public', 'bike'],
    energy: ['low', 'medium', 'high'],
    food: ['vegan', 'vegetarian', 'flexitarian', 'moderate', 'high'],
    waste: ['recycle', 'sometimes', 'trash'],
  });
  assert.deepEqual(SHARE_V1_DISTANCE, { min: 0, max: 500, step: 10 });
});

test('the v1 distance range matches the calculator', () => {
  assert.deepEqual(SHARE_V1_DISTANCE, DISTANCE_KM);
});

test('encoding rejects invalid answers', () => {
  assert.throws(() => encodeShareCode({ ...initialAnswers, distance: 15 }));
  assert.throws(() => encodeShareCode({ ...initialAnswers, profile: ProfileAnswer.Family }));
  assert.throws(() => encodeShareCode({ ...initialAnswers, home: 'castle' }));
});

/** Recomputes the checksum so only the property under test is wrong. */
function withChecksum(body) {
  const weights = [1, 5, 7, 11, 13];
  const sum = [...body].reduce((total, char, i) => total + BASE36.indexOf(char) * weights[i], 0);
  return body + BASE36[sum % 36];
}

test('malformed codes are rejected', () => {
  const valid = encodeShareCode(initialAnswers);
  assert.equal(withChecksum(valid.slice(0, 5)), valid);

  for (const code of [
    withChecksum(`2${valid.slice(1, 5)}`), // Other version.
    withChecksum(`0${valid.slice(1, 5)}`),
    `${valid.slice(0, 5)}${BASE36[(BASE36.indexOf(valid[5]) + 1) % 36]}`, // Bad checksum.
    `${valid.slice(0, 2)}${valid[2] === 'a' ? 'b' : 'a'}${valid.slice(3)}`, // Mistyped digit.
    valid.toUpperCase(),
    valid.slice(0, 5),
    `${valid}0`,
    ` ${valid}`,
    withChecksum('1zzzz'), // Index past the last combination.
    withChecksum(`1${(4 * 3 * 6 * 3 * 5 * 3 * 51).toString(36).padStart(4, '0')}`),
    '',
  ]) {
    assert.equal(decodeShareCode(code), null, code);
  }
  for (const value of [null, undefined, 100, ['100u9g'], { code: '100u9g' }]) {
    assert.equal(decodeShareCode(value), null, String(value));
  }
});

test('codes for profiles the calculator does not accept yet are rejected', () => {
  // Profile is the most significant digit: index = profile × (3·6·3·5·3·51) + rest.
  const perProfile = 3 * 6 * 3 * 5 * 3 * 51;
  const rest = parseInt(encodeShareCode(initialAnswers).slice(1, 5), 36);
  for (const profile of [1, 2, 3]) {
    const index = profile * perProfile + rest;
    assert.equal(decodeShareCode(withChecksum(`1${index.toString(36).padStart(4, '0')}`)), null);
  }
  assert.equal(SHARE_V1_OPTIONS.profile[0], ProfileAnswer.Person);
});

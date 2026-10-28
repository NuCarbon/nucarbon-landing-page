import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFootprint, coefficients } from '../src/lib/calculator/calculate.ts';
import {
  initialAnswers,
  ProfileAnswer,
  HomeAnswer,
  TransportAnswer,
  EnergyAnswer,
  FoodAnswer,
  WasteAnswer,
} from '../src/lib/calculator/answers.ts';

test('every input affects the result', () => {
  const baseline = calculateFootprint(initialAnswers);
  for (const [key, value] of Object.entries({
    profile: ProfileAnswer.Family,
    home: HomeAnswer.LargeHouse,
    transport: TransportAnswer.Bike,
    distance: 50,
    energy: EnergyAnswer.High,
    food: FoodAnswer.Vegan,
    waste: WasteAnswer.Trash,
  })) {
    assert.notEqual(
      calculateFootprint({ ...initialAnswers, [key]: value }).total,
      baseline.total,
      key,
    );
  }
});

test('total, category shares, and tree equivalence agree', () => {
  const result = calculateFootprint(initialAnswers);
  const sum = result.categories.reduce((total, category) => total + category.tonnes, 0);
  assert.equal(result.total, Math.round(sum * 100) / 100);
  assert.ok(
    Math.abs(result.categories.reduce((total, category) => total + category.percentage, 0) - 100) <
      1e-8,
  );
  assert.equal(result.trees, Math.ceil(result.total / coefficients.treeAbsorption));
});

test('attention and tips follow the largest categories and refresh for new answers', () => {
  const driving = calculateFootprint({ ...initialAnswers, distance: 500 });
  assert.match(driving.attention.title, /Transporte/);
  assert.equal(driving.tips[0].id, 'transport');
  const cycling = calculateFootprint({ ...initialAnswers, transport: TransportAnswer.Bike });
  assert.match(cycling.attention.title, /Alimentação/);
  assert.ok(cycling.tips.every((tip) => tip.id !== 'transport'));
  assert.deepEqual(
    cycling.tips.map((tip) => tip.id),
    [...cycling.categories]
      .sort((a, b) => b.tonnes - a.tonnes)
      .slice(0, 3)
      .map((category) => category.id),
  );
  assert.deepEqual(calculateFootprint({ ...initialAnswers, distance: 500 }), driving);
});

test('food advice respects an already plant-based diet', () => {
  const result = calculateFootprint({
    ...initialAnswers,
    transport: TransportAnswer.Bike,
    food: FoodAnswer.Vegan,
  });
  const tip = result.tips.find((item) => item.id === 'food');
  assert.equal(tip.title, 'Evite desperdício de alimentos');
  assert.doesNotMatch(tip.description, /refeições com carne/);
});

test('coefficients can be replaced independently of the UI', () => {
  const replacement = {
    ...coefficients,
    energy: { ...coefficients.energy, [EnergyAnswer.Medium]: 8 },
    treeAbsorption: 0.5,
  };
  const result = calculateFootprint(initialAnswers, replacement);
  assert.equal(result.categories.find((item) => item.id === 'energy').tonnes, 8);
  assert.match(result.attention.title, /Energia/);
  assert.equal(result.trees, Math.ceil(result.total / 0.5));
});

test('zero emissions and invalid distances produce finite nonnegative results', () => {
  for (const distance of [0, -10, NaN, Infinity]) {
    const result = calculateFootprint({ ...initialAnswers, distance });
    assert.equal(result.categories.find((item) => item.id === 'transport').tonnes, 0);
    assert.ok(Number.isFinite(result.total));
  }
  const zero = calculateFootprint(initialAnswers, {
    ...coefficients,
    profile: { ...coefficients.profile, [ProfileAnswer.Person]: 0 },
  });
  assert.equal(zero.total, 0);
  assert.equal(zero.trees, 0);
  assert.deepEqual(zero.tips, []);
  assert.ok(zero.categories.every((item) => item.percentage === 0));
});

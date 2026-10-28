import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCalculatorFlow,
  EnergyAnswer,
  FoodAnswer,
  TransportAnswer,
} from '../src/scripts/calculator/state.ts';

test('navigation follows configured order and keeps choices when going back or restarting', () => {
  const flow = createCalculatorFlow(['food', 'profile', 'transport']);
  assert.equal(flow.currentStep, 'food');
  flow.setAnswer('food', FoodAnswer.Vegetarian);
  flow.next();
  assert.equal(flow.currentStep, 'profile');
  flow.next();
  flow.setAnswer('transport', TransportAnswer.Bike);
  flow.setAnswer('distance', 60);
  assert.equal(flow.isLastStep, true);
  flow.next();
  assert.equal(flow.currentStep, 'transport');
  flow.back();
  flow.restart();
  flow.back();
  assert.equal(flow.currentStep, 'food');
  assert.equal(flow.snapshot().answers.food, FoodAnswer.Vegetarian);
  assert.equal(flow.snapshot().answers.transport, TransportAnswer.Bike);
  assert.equal(flow.snapshot().answers.distance, 60);
});

test('state passed to a panel cannot mutate the flow or another calculator', () => {
  const flow = createCalculatorFlow(['energy']);
  flow.setAnswer('energy', EnergyAnswer.High);
  const snapshot = flow.snapshot();
  snapshot.answers.energy = EnergyAnswer.Low;
  assert.equal(flow.snapshot().answers.energy, EnergyAnswer.High);
  assert.equal(createCalculatorFlow(['energy']).snapshot().answers.energy, EnergyAnswer.Medium);
});

test('empty or duplicate steps are rejected', () => {
  assert.throws(() => createCalculatorFlow([]));
  assert.throws(() => createCalculatorFlow(['home', 'home']));
});

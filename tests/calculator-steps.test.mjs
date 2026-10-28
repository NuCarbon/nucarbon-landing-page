import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatorSteps } from '../src/components/calculator/steps.ts';
import { icons } from '../src/components/calculator/icons.ts';
import { initialAnswers, SUPPORTED_ANSWERS } from '../src/lib/calculator/answers.ts';
import { categoryDetails } from '../src/lib/calculator/categories.ts';

test('there is one step per answer', () => {
  assert.deepEqual(
    calculatorSteps.map((step) => step.id).sort(),
    Object.keys(SUPPORTED_ANSWERS).sort(),
  );
});

test('selectable options are exactly the answers the server accepts', () => {
  for (const step of calculatorSteps) {
    const values = step.options.map((option) => option.value);
    assert.equal(new Set(values).size, values.length, `${step.id} has duplicate options`);
    assert.deepEqual(
      step.options.filter((option) => !option.disabled).map((option) => option.value),
      SUPPORTED_ANSWERS[step.id],
      step.id,
    );
    assert.ok(
      step.options.filter((option) => option.disabled).every((option) => option.badge),
      `${step.id}: disabled options explain why`,
    );
    assert.ok(SUPPORTED_ANSWERS[step.id].includes(initialAnswers[step.id]), step.id);
  }
});

test('steps use known icons and the shared category labels', () => {
  for (const step of calculatorSteps) {
    for (const option of step.options) assert.ok(option.icon in icons, option.icon);
    if (step.id in categoryDetails) assert.equal(step.label, categoryDetails[step.id].label);
  }
});

test('every icon names its Material Symbol and has path data', () => {
  for (const [name, icon] of Object.entries(icons)) {
    assert.ok(icon.symbol.length > 0, `${name} has no symbol`);
    // Path data only (the official bolt path opens with a relative moveto); no SVG markup.
    assert.match(icon.path, /^[Mm][MmLlHhVvCcSsQqTtAaZz\d.,\s-]*$/, `${name} is not path data`);
  }
});

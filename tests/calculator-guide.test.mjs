import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculatorFaq,
  methodologyFormula,
  methodologyGroups,
  relatedLinks,
} from '../src/components/calculator/guide/content.ts';
import { SUPPORTED_ANSWERS } from '../src/lib/calculator/answers.ts';
import { CATEGORY_IDS } from '../src/lib/calculator/categories.ts';
import { coefficients } from '../src/lib/calculator/coefficients.ts';
import { formatDecimal } from '../src/lib/format.ts';

test('the methodology table has one group per category, in display order', () => {
  assert.deepEqual(
    methodologyGroups().map((group) => group.id),
    CATEGORY_IDS,
  );
});

test('methodology rows cover every supported answer with its coefficient', () => {
  for (const group of methodologyGroups()) {
    assert.deepEqual(
      group.rows.map((row) => row.answer),
      SUPPORTED_ANSWERS[group.id],
      group.id,
    );
    for (const row of group.rows) {
      assert.equal(row.factor, coefficients[group.id][row.answer], `${group.id}.${row.answer}`);
      assert.ok(row.label, `${group.id}.${row.answer} has a label`);
      assert.ok(row.value.startsWith(formatDecimal(row.factor)), row.value);
    }
  }
});

test('the formula reflects the transport constants and the person multiplier', () => {
  const text = methodologyFormula.join(' ');
  assert.ok(text.includes(`${coefficients.weeksPerYear} semanas`));
  assert.deepEqual(SUPPORTED_ANSWERS.profile, ['person']);
  assert.ok(text.includes(`multiplicador é ${formatDecimal(coefficients.profile.person)}`));
});

test('the tree absorption factor is not published', () => {
  const published = JSON.stringify({ groups: methodologyGroups(), methodologyFormula });
  assert.ok(!published.includes('treeAbsorption'));
  assert.ok(!published.includes(formatDecimal(coefficients.treeAbsorption)));
});

test('FAQ items have a question and an answer', () => {
  assert.ok(calculatorFaq.length >= 5);
  for (const item of calculatorFaq) {
    assert.ok(item.question.trim().endsWith('?'), item.question);
    assert.ok(item.answer.trim().length > 0, item.question);
  }
  const questions = calculatorFaq.map((item) => item.question);
  assert.equal(new Set(questions).size, questions.length);
});

test('related links are site-relative', () => {
  for (const link of relatedLinks) assert.match(link.href, /^\/[^/]/);
});

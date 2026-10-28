import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatComments,
  formatFootprint,
  formatHectares,
  formatMetric,
  formatMoney,
  formatPercent,
  formatPlace,
  formatReactions,
  formatTonnes,
} from '../src/lib/format.ts';
import { MetricType, ReactionType } from '../src/types/app.ts';

// Intl output uses a non-breaking space between "R$" and the amount.
const normalizeSpaces = (value) => value.replace(/\s/g, ' ');

test('money is formatted from integer cents in BRL', () => {
  assert.equal(normalizeSpaces(formatMoney(7500)), 'R$ 75,00');
  assert.equal(normalizeSpaces(formatMoney(2175)), 'R$ 21,75');
  assert.equal(normalizeSpaces(formatMoney(123456789)), 'R$ 1.234.567,89');
});

test('tonnes use a decimal comma and at most two decimals', () => {
  assert.equal(formatTonnes(4.8), '4,8');
  assert.equal(formatTonnes(1.236), '1,24');
  assert.equal(formatTonnes(1200), '1.200');
  assert.equal(formatFootprint(4.8), '4,8 tCO₂e / ano');
  assert.equal(formatHectares(120), '120 hectares');
  assert.equal(formatPercent(0.65), '65%');
});

test('places, comments and reactions read naturally in Portuguese', () => {
  assert.equal(formatPlace({ municipality: 'Campinas', state: 'SP' }), 'Campinas, SP');
  assert.equal(formatComments(1), '1 comentário');
  assert.equal(formatComments(2), '2 comentários');
  assert.equal(
    formatReactions([
      { type: ReactionType.Heart, count: 1420 },
      { type: ReactionType.Seedling, count: 0 },
      { type: ReactionType.Applause, count: 3 },
    ]),
    '❤️ 1.420 · 👏 3',
  );
  assert.equal(formatReactions([]), '');
});

test('metrics of an unknown type are not displayed', () => {
  assert.deepEqual(formatMetric({ type: MetricType.TreesSupported, value: 1 }), {
    label: 'Árvores apoiadas',
    value: '1 muda nativa',
    icon: '♣',
  });
  assert.equal(
    formatMetric({ type: MetricType.TreesSupported, value: 32 }).value,
    '32 mudas nativas',
  );
  assert.equal(formatMetric({ type: MetricType.CarbonOffset, value: 1.2 }).value, '1,2 tCO₂e');
  assert.equal(formatMetric({ type: 99, value: 1 }), null);
});

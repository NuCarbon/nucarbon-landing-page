// Entry point of the footprint estimate, shared by the browser, the API and tests.
import type { CalculatorAnswers } from './answers.ts';
import { CATEGORY_IDS, type CategoryId, type CategoryResult } from './categories.ts';
import { coefficients, type CalculationCoefficients } from './coefficients.ts';
import { attentionFor, reductionTips, type Attention, type ReductionTip } from './tips.ts';

export { coefficients, type CalculationCoefficients } from './coefficients.ts';
export { categoryDetails, type CategoryId, type CategoryResult } from './categories.ts';
export type { Attention, ReductionTip } from './tips.ts';

export interface CalculationResult {
  /** tCO₂e per year. */
  total: number;
  trees: number;
  categories: CategoryResult[];
  /** The category with the most emissions, or null when nothing is emitted. */
  largestCategory: CategoryId | null;
  attention: Attention;
  /** Up to three tips for the largest non-zero categories, largest first. */
  tips: ReductionTip[];
}

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateFootprint(
  answers: CalculatorAnswers,
  coef: CalculationCoefficients = coefficients,
): CalculationResult {
  const distance = Number.isFinite(answers.distance) ? Math.max(0, answers.distance) : 0;
  const multiplier = coef.profile[answers.profile];
  const annual: Record<CategoryId, number> = {
    transport:
      (distance * coef.weeksPerYear * coef.transport[answers.transport]) / coef.kilogramsPerTonne,
    home: coef.home[answers.home],
    energy: coef.energy[answers.energy],
    food: coef.food[answers.food],
    waste: coef.waste[answers.waste],
  };

  const categories: CategoryResult[] = CATEGORY_IDS.map((id) => ({
    id,
    tonnes: round(annual[id] * multiplier),
    percentage: 0,
  }));

  const total = round(categories.reduce((sum, category) => sum + category.tonnes, 0));
  categories.forEach((category) => {
    category.percentage = total > 0 ? (category.tonnes / total) * 100 : 0;
  });

  const ranked = [...categories].sort((a, b) => b.tonnes - a.tonnes);
  const largest = total > 0 ? ranked[0] : null;
  const tipsByCategory = reductionTips(answers);

  return {
    total,
    trees: Math.ceil(total / coef.treeAbsorption),
    categories,
    largestCategory: largest?.id ?? null,
    attention: attentionFor(largest, tipsByCategory),
    tips: ranked
      .filter((category) => category.tonnes > 0)
      .slice(0, 3)
      .map((category) => tipsByCategory[category.id]),
  };
}

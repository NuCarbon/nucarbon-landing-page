import type { StepId } from './answers.ts';

/** Every answered step except the profile, which multiplies the others. */
export type CategoryId = Exclude<StepId, 'profile'>;

/** Display order of the results breakdown. */
export const CATEGORY_IDS: readonly CategoryId[] = ['transport', 'home', 'energy', 'food', 'waste'];

// Shared by the step progress label, the results breakdown and the advice copy.
export const categoryDetails: Record<CategoryId, { label: string }> = {
  transport: { label: 'Transporte' },
  home: { label: 'Moradia' },
  energy: { label: 'Energia' },
  food: { label: 'Alimentação e consumo' },
  waste: { label: 'Resíduos' },
};

export interface CategoryResult {
  id: CategoryId;
  /** tCO₂e per year. */
  tonnes: number;
  /** Share of the total, 0–100. */
  percentage: number;
}

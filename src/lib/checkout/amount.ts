// Contribution pricing shared by the project page (preview) and the checkout API (authoritative).

/** Selectable tonnes of CO₂e per contribution, in steps of 0.01 t. */
export const QUANTITY_TONNES = { min: 0.01, max: 1000, step: 0.01 } as const;

/** Shares of the annual footprint offered as presets. */
export const CONTRIBUTION_PERCENTAGES = [25, 100] as const;
export type ContributionPercentage = (typeof CONTRIBUTION_PERCENTAGES)[number];

export type AmountInput =
  | { mode: 'manual'; quantity: number }
  | { mode: 'percentage'; percentage: ContributionPercentage; annualFootprint: number };

const hasCentesimalPrecision = (value: number) =>
  Math.abs(Math.round(value * 100) - value * 100) <= 1e-8;

export function isValidQuantity(quantity: number): boolean {
  return (
    Number.isFinite(quantity) &&
    hasCentesimalPrecision(quantity) &&
    quantity >= QUANTITY_TONNES.min &&
    quantity <= QUANTITY_TONNES.max
  );
}

/** Resolves the tonnes and the integer-cent total. Throws for any invalid input. */
export function calculateAmount(input: AmountInput, pricePerTonneCents: number) {
  if (!Number.isSafeInteger(pricePerTonneCents) || pricePerTonneCents <= 0) {
    throw new Error('Invalid price');
  }

  let quantity: number;
  if (input.mode === 'manual') {
    quantity = input.quantity;
    if (!Number.isFinite(quantity) || !hasCentesimalPrecision(quantity)) {
      throw new Error('Invalid quantity');
    }
  } else {
    if (
      !CONTRIBUTION_PERCENTAGES.includes(input.percentage) ||
      !Number.isFinite(input.annualFootprint) ||
      input.annualFootprint < 0
    ) {
      throw new Error('Invalid footprint or percentage');
    }
    quantity = Math.round(input.annualFootprint * input.percentage) / 100;
  }

  if (quantity < QUANTITY_TONNES.min || quantity > QUANTITY_TONNES.max) {
    throw new Error('Quantity out of range');
  }
  const totalCents = Math.round(quantity * pricePerTonneCents);
  if (!Number.isSafeInteger(totalCents)) throw new Error('Invalid total');

  return { quantityTonnes: quantity, totalCents };
}

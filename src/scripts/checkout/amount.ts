export function calculateAmount(input: { mode: 'manual'; quantity: number } | { mode: 'percentage'; percentage: 25 | 100; annualFootprint: number }, pricePerTonneCents: number) {
  if (!Number.isSafeInteger(pricePerTonneCents) || pricePerTonneCents <= 0) throw new Error('Invalid price');
  let quantity: number;
  if (input.mode === 'manual') {
    quantity = input.quantity;
    if (!Number.isFinite(quantity) || Math.abs(Math.round(quantity * 100) - quantity * 100) > 1e-8) throw new Error('Invalid quantity');
  } else {
    if (![25,100].includes(input.percentage) || !Number.isFinite(input.annualFootprint) || input.annualFootprint < 0) throw new Error('Invalid footprint or percentage');
    quantity = Math.round(input.annualFootprint * input.percentage) / 100;
  }
  if (quantity < .01 || quantity > 1000) throw new Error('Quantity out of range');
  const totalCents = Math.round(quantity * pricePerTonneCents);
  if (!Number.isSafeInteger(totalCents)) throw new Error('Invalid total');
  return { quantityTonnes: quantity, totalCents };
}

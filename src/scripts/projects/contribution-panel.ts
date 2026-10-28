// Contribution panel on /projetos/[slug] (components/projects/ContributionPanel.astro).
import { calculateFootprint } from '../../lib/calculator/calculate';
import {
  CONTRIBUTION_PERCENTAGES,
  calculateAmount,
  isValidQuantity,
  type AmountInput,
  type ContributionPercentage,
} from '../../lib/checkout/amount';
import { formatCo2e, formatMoney, formatTonnes } from '../../lib/format';
import type { CalculatorResultResponse, CheckoutRequest } from '../../types/app';
import { getJson } from '../api';
import { currentUser, loginUrl } from '../auth';
import { readDraft, savePendingDraft } from '../calculator/draft';
import { saveCheckoutIntent } from '../checkout/storage';
import { requireElement, setText } from '../dom';

type Selection = ContributionPercentage | 'custom';
type Amount = ReturnType<typeof calculateAmount>;
type Choice = { amount: Amount; request: Omit<CheckoutRequest, 'key'> };

/** The annual footprint: the unsaved calculator draft first, then the saved result. */
async function readFootprint(): Promise<number | null> {
  const draft = readDraft();
  if (draft) return calculateFootprint(draft.answers).total;
  if (!(await currentUser())) return null;

  try {
    const { result } = await getJson<CalculatorResultResponse>('/api/calculator-result');
    return result?.footprint.annualEmissionsTonnes ?? null;
  } catch {
    return null; // Without a footprint the visitor can still type a quantity.
  }
}

function tryCalculateAmount(input: AmountInput, price: number): Amount | null {
  try {
    return calculateAmount(input, price);
  } catch {
    return null;
  }
}

/** Presets within the quantity limits, e.g. 100% of a very large footprint is left out. */
function presetAmounts(footprint: number | null, price: number) {
  const amounts = new Map<ContributionPercentage, Amount>();
  if (footprint === null || footprint <= 0) return amounts;

  for (const percentage of CONTRIBUTION_PERCENTAGES) {
    const amount = tryCalculateAmount(
      { mode: 'percentage', percentage, annualFootprint: footprint },
      price,
    );
    if (amount) amounts.set(percentage, amount);
  }
  return amounts;
}

export async function initializeContributionPanel(panel: HTMLElement): Promise<void> {
  const slug = panel.dataset.slug ?? '';
  const price = Number(panel.dataset.price);
  const quantityInput = requireElement<HTMLInputElement>(panel, '[data-quantity]');
  const presets = requireElement<HTMLFieldSetElement>(panel, '[data-presets]');
  const participate = requireElement<HTMLButtonElement>(panel, '[data-participate]');
  const error = requireElement(panel, '[data-contribution-error]');
  const option = (value: Selection) =>
    requireElement<HTMLInputElement>(presets, `input[value="${value}"]`);

  const footprint = await readFootprint();
  const amounts = presetAmounts(footprint, price);

  for (const percentage of CONTRIBUTION_PERCENTAGES) {
    const amount = amounts.get(percentage);
    option(percentage).disabled = !amount;
    if (amount) {
      setText(
        presets,
        `[data-preset-label="${percentage}"]`,
        `${percentage}% (${formatTonnes(amount.quantityTonnes)} t)`,
      );
    }
  }
  if (footprint !== null && amounts.size) {
    const note = requireElement(panel, '[data-footprint-note]');
    note.textContent = `Sua pegada de carbono estimada é de ${formatCo2e(footprint)} por ano.`;
    note.hidden = false;
    presets.hidden = false;
  }

  let selection: Selection = amounts.has(100) ? 100 : 'custom';
  option(selection).checked = true;

  /** The previewed amount and the API request for the current selection; null while invalid. */
  function currentChoice(): Choice | null {
    if (selection !== 'custom') {
      const amount = amounts.get(selection);
      return amount
        ? { amount, request: { slug, mode: 'percentage', percentage: selection } }
        : null;
    }
    const quantity = quantityInput.valueAsNumber;
    const amount = isValidQuantity(quantity)
      ? tryCalculateAmount({ mode: 'manual', quantity }, price)
      : null;
    return amount ? { amount, request: { slug, mode: 'manual', quantity } } : null;
  }

  function render(): void {
    const choice = currentChoice();
    if (choice && selection !== 'custom') {
      quantityInput.value = String(choice.amount.quantityTonnes);
    }
    quantityInput.setAttribute('aria-invalid', String(!choice));
    setText(
      panel,
      '[data-selected-quantity]',
      choice ? formatCo2e(choice.amount.quantityTonnes) : '—',
    );
    setText(panel, '[data-total]', choice ? formatMoney(choice.amount.totalCents) : '—');
    participate.disabled = !choice;
  }

  function showError(cause: unknown): void {
    error.textContent =
      cause instanceof Error ? cause.message : 'Não foi possível continuar. Tente novamente.';
    error.hidden = false;
  }

  // Guests leave the selection behind and sign in on /entrar, which saves their calculator
  // draft before returning to /checkout. A percentage is resolved against that saved footprint.
  async function continueToCheckout(request: Choice['request']): Promise<void> {
    try {
      const user = await currentUser();
      if (user) await savePendingDraft(user);
      saveCheckoutIntent({ ...request, key: crypto.randomUUID(), createdAt: Date.now() });
      location.assign(user ? '/checkout' : loginUrl('/checkout'));
    } catch (cause) {
      showError(cause);
    }
  }

  presets.addEventListener('change', (event) => {
    const { value } = event.target as HTMLInputElement;
    selection = value === 'custom' ? 'custom' : (Number(value) as ContributionPercentage);
    render();
  });

  // Typing a quantity switches to "Personalizar".
  quantityInput.addEventListener('input', () => {
    if (selection !== 'custom') {
      selection = 'custom';
      option('custom').checked = true;
    }
    render();
  });

  participate.addEventListener('click', () => {
    const choice = currentChoice();
    if (!choice) return;
    error.hidden = true;
    void continueToCheckout(choice.request);
  });

  render();
}

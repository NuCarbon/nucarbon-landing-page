import { categoryDetails, formatTonnes, type CalculationResult } from './calculate';

export function renderResults(root: HTMLElement, result: CalculationResult): void {
  const text = (selector: string, value: string) => {
    root.querySelector<HTMLElement>(selector)!.textContent = value;
  };

  text('[data-total]', formatTonnes(result.total));
  text('[data-trees]', result.trees.toLocaleString('pt-BR'));
  text('[data-attention-title]', result.attention.title);
  text('[data-attention-description]', result.attention.description);
  const largest = [...result.categories].sort((a, b) => b.tonnes - a.tonnes)[0];
  for (const category of result.categories) {
    const row = root.querySelector<HTMLElement>(`[data-category="${category.id}"]`)!;
    row.querySelector('[data-category-value]')!.textContent = `${formatTonnes(category.tonnes)} tCO₂e`;
    const bar = row.querySelector<HTMLElement>('[data-category-bar]')!;
    bar.style.setProperty('--bar-width', `${category.percentage}%`);
    bar.classList.toggle('result-breakdown__bar--danger', result.total > 0 && category.id === largest.id);
    row.setAttribute('aria-label', `${categoryDetails[category.id].label}: ${formatTonnes(category.tonnes)} tCO₂e, ${Math.round(category.percentage)}%`);
  }

  root.querySelectorAll<HTMLElement>('[data-tip]').forEach((tip) => { tip.hidden = true; });

  const list = root.querySelector<HTMLElement>('[data-tips-list]')!;
  for (const tip of result.tips) {
    const element = root.querySelector<HTMLElement>(`[data-tip="${tip.id}"]`)!;
    element.querySelector('[data-tip-title]')!.textContent = tip.title;
    element.querySelector('[data-tip-description]')!.textContent = tip.description;
    element.hidden = false;
    list.append(element);
  }

  root.querySelector<HTMLElement>('[data-tips-section]')!.hidden = result.tips.length === 0;
}

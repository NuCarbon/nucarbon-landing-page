// Fills the server-rendered results markup (components/calculator/results) with a new result.
import type { CalculationResult } from '../../lib/calculator/calculate';
import { formatCo2e, formatInteger, formatTonnes } from '../../lib/format';

export function renderResults(root: HTMLElement, result: CalculationResult): void {
  const find = (selector: string, scope: ParentNode = root) =>
    scope.querySelector<HTMLElement>(selector)!;

  find('[data-total]').textContent = formatTonnes(result.total);
  find('[data-trees]').textContent = formatInteger(result.trees);
  find('[data-attention-title]').textContent = result.attention.title;
  find('[data-attention-description]').textContent = result.attention.description;

  for (const { id, tonnes, percentage } of result.categories) {
    const row = find(`[data-category="${id}"]`);
    find('[data-category-value]', row).textContent = formatCo2e(tonnes);
    find('[data-category-share]', row).textContent = `, ${Math.round(percentage)}%`;
    const bar = find('[data-category-bar]', row);
    bar.style.setProperty('--bar-width', `${percentage}%`);
    bar.classList.toggle('category-breakdown__bar--largest', id === result.largestCategory);
  }

  // Show the current tips, in order, and hide the rest.
  const list = find('[data-tips-list]');
  list.querySelectorAll<HTMLElement>('[data-tip]').forEach((item) => {
    item.hidden = true;
  });
  for (const tip of result.tips) {
    const item = find(`[data-tip="${tip.id}"]`, list);
    find('[data-tip-title]', item).textContent = tip.title;
    find('[data-tip-description]', item).textContent = tip.description;
    item.hidden = false;
    list.append(item);
  }
  find('[data-tips-section]').hidden = result.tips.length === 0;
}

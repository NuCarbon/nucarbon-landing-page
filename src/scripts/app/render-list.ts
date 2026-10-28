import { requireElement } from '../dom';

/**
 * Replaces the items of `list` with one clone of its <template data-item-template> per entry,
 * each filled by `fill`, and hides the list when there are none. The template itself stays in
 * the list for the next render.
 */
export function renderList<T>(
  list: HTMLElement,
  entries: readonly T[],
  fill: (item: DocumentFragment, entry: T) => void,
): void {
  const template = requireElement<HTMLTemplateElement>(list, 'template[data-item-template]');
  const items = entries.map((entry) => {
    const item = template.content.cloneNode(true) as DocumentFragment;
    fill(item, entry);
    return item;
  });

  list.replaceChildren(template, ...items);
  list.hidden = items.length === 0;
}

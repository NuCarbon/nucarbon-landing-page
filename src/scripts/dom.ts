export function requireElement<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

/** Sets the text of the first match, if present. Never interprets the value as HTML. */
export function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

export function cloneTemplate(root: ParentNode, selector: string): DocumentFragment {
  return requireElement<HTMLTemplateElement>(root, selector).content.cloneNode(
    true,
  ) as DocumentFragment;
}

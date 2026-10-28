/** Marks the link of the section named in the URL hash as current; the first one by default. */
export function initializeSectionNav(nav: HTMLElement): void {
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  if (!links.length) return;

  const update = () => {
    const current = links.find((link) => link.hash === location.hash) ?? links[0];
    for (const link of links) {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  update();
  window.addEventListener('hashchange', update);
}

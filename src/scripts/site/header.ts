// Site header behaviour:
// - hides while scrolling down and reappears when scrolling up;
// - pages that start under a hero keep it transparent until the page scrolls;
// - mobile menu toggle (Escape closes it and returns focus to the toggle).

// Same width as the `xl` breakpoint in styles/_breakpoints.scss.
const DESKTOP_QUERY = '(min-width: 1120px)';
// Fallback for browsers without `scrollend`, and for anchor links that do not scroll at all.
const SCROLL_SETTLE_MS = 150;
const SCROLL_START_MS = 400;

function initHeader(header: HTMLElement): void {
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = header.querySelector<HTMLElement>('[data-menu]');
  const transparentAtTop = header.hasAttribute('data-transparent');

  let lastY = Math.max(window.scrollY, 0);
  let hidden = false;
  let menuOpen = false;
  let frame = 0;
  let anchorScroll = false;
  let settleTimer: number | undefined;

  function render(): void {
    header.classList.toggle('header--transparent', transparentAtTop && lastY === 0 && !menuOpen);
    header.classList.toggle('header--hidden', hidden && !menuOpen);
  }

  function onScrollFrame(): void {
    frame = 0;
    const y = Math.max(window.scrollY, 0);
    if (anchorScroll) waitForScrollToSettle(SCROLL_SETTLE_MS);
    else if (y === 0 || y < lastY) hidden = false;
    else if (y > lastY) hidden = true;
    lastY = y;
    render();
  }

  // After jumping to a section the header stays out of the way so it does not cover the heading.
  function finishAnchorScroll(): void {
    if (!anchorScroll) return;
    anchorScroll = false;
    window.clearTimeout(settleTimer);
    lastY = Math.max(window.scrollY, 0);
    hidden = lastY > 0;
    render();
  }

  function waitForScrollToSettle(delay: number): void {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(finishAnchorScroll, delay);
  }

  function startAnchorScroll(): void {
    anchorScroll = true;
    hidden = true;
    render();
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', finishAnchorScroll, { once: true });
    }
    waitForScrollToSettle(SCROLL_START_MS);
  }

  function setMenuOpen(open: boolean): void {
    if (!toggle || !menu) return;
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    header.classList.toggle('header--menu-open', open);
    render();
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = window.requestAnimationFrame(onScrollFrame);
    },
    { passive: true },
  );

  toggle?.addEventListener('click', () => setMenuOpen(!menuOpen));

  menu?.addEventListener('click', (event) => {
    const link = (event.target as Element).closest('a');
    if (!link) return;
    setMenuOpen(false);
    if (link.hash && link.pathname === window.location.pathname) startAnchorScroll();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menuOpen) return;
    setMenuOpen(false);
    toggle?.focus();
  });

  window.matchMedia(DESKTOP_QUERY).addEventListener('change', (event) => {
    if (event.matches) setMenuOpen(false);
  });

  render();
}

document.querySelectorAll<HTMLElement>('[data-header]').forEach(initHeader);

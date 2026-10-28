/** Shows the chosen thumbnail as the main image (components/projects/ProjectGallery.astro). */
export function initializeGallery(gallery: HTMLElement): void {
  const main = gallery.querySelector<HTMLImageElement>('[data-gallery-main]');
  const thumbs = [...gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]')];
  if (!main) return;

  for (const thumb of thumbs) {
    thumb.addEventListener('click', () => {
      const { url, alt = '' } = thumb.dataset;
      if (!url) return;
      main.src = url;
      main.alt = alt;
      for (const other of thumbs) other.setAttribute('aria-pressed', String(other === thumb));
    });
  }
}

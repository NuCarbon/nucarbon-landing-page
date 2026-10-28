import { projectCardView } from '../../lib/projects';
import type { Project } from '../../types/app';
import { requireElement, setText } from '../dom';

/** Fills a cloned ProjectCard template (components/projects/ProjectCard.astro). */
export function fillProjectCard(root: ParentNode, project: Project): void {
  const view = projectCardView(project);

  setText(root, '[data-project-biome]', view.biome);
  setText(root, '[data-project-place]', view.place);
  setText(root, '[data-project-name]', view.name);
  setText(root, '[data-project-summary]', view.summary);
  setText(root, '[data-project-area]', view.area);
  setText(root, '[data-project-status]', view.status);
  setText(root, '[data-project-progress]', view.progressLabel);
  requireElement<HTMLAnchorElement>(root, '[data-project-link]').href = view.href;
  requireElement(root, '[data-project-progress-bar]').style.width = `${view.progressPercent}%`;

  const image = requireElement<HTMLImageElement>(root, '[data-project-image]');
  const placeholder = requireElement(root, '[data-project-placeholder]');
  if (view.image) {
    image.src = view.image.url;
    image.alt = view.image.alt;
  }
  image.hidden = !view.image;
  placeholder.hidden = Boolean(view.image);
}

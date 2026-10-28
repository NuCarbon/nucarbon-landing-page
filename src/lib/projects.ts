import type { Project } from '../types/app.ts';
import { biomeLabels, formatHectares, formatPercent, formatPlace, statusLabels } from './format.ts';

export const projectPath = (slug: string) => `/projetos/${encodeURIComponent(slug)}`;

/** Display-ready card fields, shared by the server-rendered and client-filled ProjectCard. */
export function projectCardView(project: Project) {
  const progress = Math.min(Math.max(project.restorationProgress, 0), 1);
  const image = project.gallery[0];

  return {
    href: projectPath(project.slug),
    name: project.name,
    biome: biomeLabels[project.biome],
    place: formatPlace(project),
    summary: project.summary,
    area: formatHectares(project.areaHectares),
    status: statusLabels[project.status],
    progressLabel: formatPercent(progress),
    progressPercent: progress * 100,
    image: image ? { url: image.url, alt: image.alt } : null,
  };
}

export type ProjectCardView = ReturnType<typeof projectCardView>;

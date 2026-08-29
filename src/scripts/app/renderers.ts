import type { CommunityPost, ImpactMetric, Project } from './types';

const ERROR_MESSAGE =
  'Não foi possível carregar os dados. Atualize a página para tentar novamente.';

function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
}

function replaceChildren(selector: string, children: Node[]): void {
  document.querySelector<HTMLElement>(selector)?.replaceChildren(...children);
}

function projectImageClass(id: string): string {
  const safeId = id.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return safeId ? `project-image project-image-${safeId}` : 'project-image';
}

function createProjectCard(project: Project): HTMLElement {
  const card = element('article', 'project-card');
  const image = element('div', projectImageClass(project.id));
  const content = element('div', 'project-content');
  const tags = element('p', 'project-tags');
  const progress = element('div', 'project-progress');
  const progressTrack = element('i');
  const progressBar = element('b');
  const progressValue = Math.min(100, Math.max(0, project.progress));

  tags.append(
    element('span', undefined, project.biome),
    element('span', undefined, project.location),
  );

  progressBar.style.width = `${progressValue}%`;
  progressTrack.append(progressBar);
  progress.append(
    element('span', undefined, 'Progresso'),
    element('strong', undefined, `${project.progress}%`),
    progressTrack,
  );

  content.append(
    tags,
    element('h3', undefined, project.name),
    element('p', undefined, `${project.hectares} hectares em restauração`),
    progress,
    element('small', undefined, project.status),
  );
  card.append(image, content);

  return card;
}

function createMetricCard(metric: ImpactMetric): HTMLElement {
  const card = element('article', 'metric-card');
  const content = element('div');

  content.append(
    element('p', undefined, metric.label),
    element('strong', undefined, metric.value),
  );
  card.append(element('span', undefined, metric.icon), content);

  return card;
}

function createCommunityPost(post: CommunityPost): HTMLElement {
  const article = element('article', 'community-post');
  const header = element('header');
  const authorDetails = element('div');
  const footer = element('footer');

  authorDetails.append(
    element('strong', undefined, post.author),
    element('small', undefined, post.timestamp),
  );
  header.append(
    element('div', 'post-avatar', post.author.charAt(0)),
    authorDetails,
  );
  footer.append(
    element('span', undefined, post.reactions),
    element('span', undefined, `${post.comments} comentários`),
  );
  article.append(header, element('p', undefined, post.body), footer);

  return article;
}

export function renderProjects(projects: Project[]): void {
  replaceChildren('[data-projects]', projects.map(createProjectCard));
}

export function renderMetrics(metrics: ImpactMetric[]): void {
  replaceChildren('[data-metrics]', metrics.map(createMetricCard));
}

export function renderCommunity(posts: CommunityPost[]): void {
  replaceChildren('[data-community]', posts.map(createCommunityPost));
}

export function renderFootprint(value: string, updatedLabel: string): void {
  const valueElement = document.querySelector<HTMLElement>('[data-footprint]');
  const dateElement = document.querySelector<HTMLElement>('[data-footprint-date]');

  if (valueElement) valueElement.textContent = value;
  if (dateElement) dateElement.textContent = updatedLabel;
}

export function renderLoadError(view: 'community' | 'dashboard' | 'projects'): void {
  const target = document.querySelector<HTMLElement>(`[data-app-view="${view}"]`);

  if (target) {
    target.replaceChildren(element('p', 'app-error', ERROR_MESSAGE));
  }
}

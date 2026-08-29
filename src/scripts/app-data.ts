import { authorizationHeader } from './auth';

type Project = { id: string; biome: string; location: string; name: string; hectares: number; progress: number; status: string };
type Dashboard = { footprint: { value: string; updatedLabel: string }; metrics: { label: string; value: string; icon: string }[]; projects: Project[] };
type CommunityPost = { id: string; author: string; timestamp: string; body: string; reactions: string; comments: number };

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Authorization: await authorizationHeader() } });
  if (response.status === 401) { window.location.assign('/entrar'); throw new Error('Sessão inválida.'); }
  if (!response.ok) throw new Error('Não foi possível carregar estes dados agora.');
  return response.json() as Promise<T>;
}

const escape = (text: string) => text.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
function projectsMarkup(projects: Project[]) { return projects.map((project) => `<article class="project-card"><div class="project-image project-image-${project.id}"></div><div class="project-content"><p class="project-tags"><span>${escape(project.biome)}</span><span>${escape(project.location)}</span></p><h3>${escape(project.name)}</h3><p>${project.hectares} hectares em restauração</p><div class="project-progress"><span>Progresso</span><strong>${project.progress}%</strong><i><b style="width:${project.progress}%"></b></i></div><small>${escape(project.status)}</small></div></article>`).join(''); }
function showError(selector: string) { const target = document.querySelector<HTMLElement>(selector); if (target) target.innerHTML = '<p class="app-error">Não foi possível carregar os dados. Atualize a página para tentar novamente.</p>'; }

export async function loadDashboard() {
  try {
    const data = await api<Dashboard>('/api/dashboard');
    console.log(data);
    const footprint = document.querySelector('[data-footprint]'); if (footprint) footprint.textContent = data.footprint.value;
    console.log(footprint);
    const date = document.querySelector('[data-footprint-date]'); if (date) date.textContent = data.footprint.updatedLabel;
    const metrics = document.querySelector('[data-metrics]'); if (metrics) metrics.innerHTML = data.metrics.map((metric) => `<article class="metric-card"><span>${metric.icon}</span><div><p>${escape(metric.label)}</p><strong>${escape(metric.value)}</strong></div></article>`).join('');
    const projects = document.querySelector('[data-projects]'); if (projects) projects.innerHTML = projectsMarkup(data.projects);
  } catch (e) { console.log(e); showError('[data-app-view="dashboard"]'); }
}
export async function loadProjects() { try { const data = await api<{ projects: Project[] }>('/api/projects'); const target = document.querySelector('[data-projects]'); if (target) target.innerHTML = projectsMarkup(data.projects); } catch { showError('[data-app-view="projects"]'); } }
export async function loadCommunity() { try { const data = await api<{ posts: CommunityPost[] }>('/api/community'); const target = document.querySelector('[data-community]'); if (target) target.innerHTML = data.posts.map((post) => `<article class="community-post"><header><div class="post-avatar">${escape(post.author.charAt(0))}</div><div><strong>${escape(post.author)}</strong><small>${escape(post.timestamp)}</small></div></header><p>${escape(post.body)}</p><footer><span>${escape(post.reactions)}</span><span>${post.comments} comentários</span></footer></article>`).join(''); } catch { showError('[data-app-view="community"]'); } }

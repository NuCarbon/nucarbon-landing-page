import { fetchAppData } from './app/api';
import {
  renderCommunity,
  renderFootprint,
  renderLoadError,
  renderMetrics,
  renderProjects,
} from './app/renderers';
import type { CommunityResponse, Dashboard, ProjectsResponse } from './app/types';

export async function loadDashboard() {
  try {
    const data = await fetchAppData<Dashboard>('/api/dashboard');

    renderFootprint(data.footprint.value, data.footprint.updatedLabel);
    renderMetrics(data.metrics);
    renderProjects(data.projects);
  } catch {
    renderLoadError('dashboard');
  }
}

export async function loadProjects() {
  try {
    const data = await fetchAppData<ProjectsResponse>('/api/projects');
    renderProjects(data.projects);
  } catch {
    renderLoadError('projects');
  }
}

export async function loadCommunity() {
  try {
    const data = await fetchAppData<CommunityResponse>('/api/community');
    renderCommunity(data.posts);
  } catch {
    renderLoadError('community');
  }
}

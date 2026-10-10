import type { Config } from '@netlify/functions';
import { json, unavailable } from './_api';
import { readProjectBySlug, readProjects } from './_repository';

export default async (request: Request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  try {
    const slug = new URL(request.url).searchParams.get('slug');
    if (slug) {
      const project = await readProjectBySlug(slug);
      return project ? json({ project }) : json({ error: 'Not found' }, { status: 404 });
    }
    return json({ projects: await readProjects() });
  } catch { return unavailable(); }
};

export const config: Config = { path: '/api/projects' };

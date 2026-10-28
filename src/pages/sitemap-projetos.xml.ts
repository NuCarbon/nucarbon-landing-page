// Project pages are rendered on request, so @astrojs/sitemap cannot list them; robots.txt
// points crawlers here as well.
import type { APIRoute } from 'astro';
import { projectPath, setProjectsCacheHeaders } from '../lib/projects';
import { readProjects } from '../server/repository';

export const prerender = false;

export const GET: APIRoute = async ({ site, url }) => {
  let slugs: string[];
  try {
    slugs = (await readProjects()).map((project) => project.slug);
  } catch {
    return new Response('Projects temporarily unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // Paths are percent-encoded by projectPath, so they need no XML escaping.
  const locations = ['/projetos', ...slugs.map(projectPath)].map(
    (path) => new URL(path, site ?? url).href,
  );
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map((location) => `  <url><loc>${location}</loc></url>`),
    '</urlset>',
  ].join('\n');

  const headers = new Headers({ 'Content-Type': 'application/xml; charset=utf-8' });
  setProjectsCacheHeaders(headers, true);
  return new Response(body, { headers });
};

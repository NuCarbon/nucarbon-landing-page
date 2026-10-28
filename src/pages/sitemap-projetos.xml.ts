import type { APIRoute } from 'astro';
import { readProjects } from '../../netlify/functions/_repository';
export const prerender = false;
export const GET: APIRoute = async () => {
  try {
    const projects = await readProjects();
    const urls = [
      'https://nucarbon.com.br/projetos',
      ...projects.map((project) => `https://nucarbon.com.br/projetos/${project.slug}`),
    ];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`,
      {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      },
    );
  } catch {
    return new Response('Projects temporarily unavailable', { status: 503 });
  }
};

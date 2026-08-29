import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { json, requireUser } from './_api';

export default async (request: Request) => {
  if (!await requireUser(request)) return json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const [dashboard, projects] = await Promise.all([db().doc('demo/dashboard').get(), db().doc('demo/projects').get()]);
    if (!dashboard.exists || !projects.exists) return json({ error: 'Demo data unavailable' }, { status: 503 });
    return json({ ...dashboard.data(), projects: projects.data()?.items?.slice(0, 2) ?? [] });
  } catch { return json({ error: 'Unable to load dashboard' }, { status: 500 }); }
};
export const config: Config = { path: '/api/dashboard' };

import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { authenticated, json, unavailable } from './_api';

export default authenticated(async () => {
  const database = db();
  const [dashboard, projects] = await Promise.all([
    database.doc('demo/dashboard').get(),
    database.doc('demo/projects').get(),
  ]);

  if (!dashboard.exists || !projects.exists) return unavailable();

  return json({
    ...dashboard.data(),
    projects: projects.data()?.items?.slice(0, 2) ?? [],
  });
}, 'Unable to load dashboard');

export const config: Config = { path: '/api/dashboard' };

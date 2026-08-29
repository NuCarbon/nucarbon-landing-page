import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { authenticated, json, unavailable } from './_api';

export default authenticated(async () => {
  const document = await db().doc('demo/projects').get();

  if (!document.exists) return unavailable();

  return json({ projects: document.data()?.items ?? [] });
}, 'Unable to load projects');

export const config: Config = { path: '/api/projects' };

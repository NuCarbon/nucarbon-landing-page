import type { Config } from '@netlify/functions';
import { authenticated, json } from './_api';
import { readProjects } from './_repository';

export default authenticated(async () => {
  return json({ projects: await readProjects() });
}, 'Unable to load projects');

export const config: Config = { path: '/api/projects' };

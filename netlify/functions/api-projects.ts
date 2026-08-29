import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { json, requireUser } from './_api';
export default async (request: Request) => { if (!await requireUser(request)) return json({ error: 'Unauthorized' }, { status: 401 }); try { const doc = await db().doc('demo/projects').get(); return doc.exists ? json({ projects: doc.data()?.items ?? [] }) : json({ error: 'Demo data unavailable' }, { status: 503 }); } catch { return json({ error: 'Unable to load projects' }, { status: 500 }); } };
export const config: Config = { path: '/api/projects' };

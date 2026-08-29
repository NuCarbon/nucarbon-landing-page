import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { authenticated, json, unavailable } from './_api';

export default authenticated(async () => {
  const document = await db().doc('demo/community').get();

  if (!document.exists) return unavailable();

  return json({ posts: document.data()?.posts ?? [] });
}, 'Unable to load community');

export const config: Config = { path: '/api/community' };

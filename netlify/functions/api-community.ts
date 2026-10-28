import type { Config } from '@netlify/functions';
import { authenticated, json } from '../../src/server/http';
import { readCommunityPosts } from '../../src/server/repository';

export default authenticated(async () => {
  return json({ posts: await readCommunityPosts() });
}, 'Unable to load community');

export const config: Config = { path: '/api/community' };

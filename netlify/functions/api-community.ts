import type { Config } from '@netlify/functions';
import { authenticated, json } from './_api';
import { readCommunityPosts } from './_repository';

export default authenticated(async () => {
  return json({ posts: await readCommunityPosts() });
}, 'Unable to load community');

export const config: Config = { path: '/api/community' };

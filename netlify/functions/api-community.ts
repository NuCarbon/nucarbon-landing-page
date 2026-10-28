import type { Config } from '@netlify/functions';
import { json, route } from '../../src/server/http';
import { readCommunityPosts } from '../../src/server/repository';
import type { CommunityResponse } from '../../src/types/app';

export default route(
  {
    GET: async () => json({ posts: await readCommunityPosts() } satisfies CommunityResponse),
  },
  { auth: true, errorMessage: 'Unable to load community' },
);

export const config: Config = { path: '/api/community' };

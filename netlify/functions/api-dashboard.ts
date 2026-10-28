import type { Config } from '@netlify/functions';
import { json, route } from '../../src/server/http';
import {
  readProjects,
  readProjectsByIds,
  readSupportedProjectIds,
  readUser,
} from '../../src/server/repository';
import type { DashboardResponse } from '../../src/types/app';

/** Published projects suggested next to the ones the user already supports. */
const DISCOVER_COUNT = 2;

export default route(
  {
    GET: async (_request, _context, user) => {
      const [account, supportedIds] = await Promise.all([
        readUser(user.uid),
        readSupportedProjectIds(user.uid),
      ]);
      // Fetching one extra project per supported ID still leaves DISCOVER_COUNT to suggest.
      const [supportedProjects, published] = await Promise.all([
        readProjectsByIds(supportedIds),
        readProjects(supportedIds.length + DISCOVER_COUNT),
      ]);
      const supported = new Set<string>(supportedIds);
      const projects = published
        .filter((project) => !supported.has(project.id))
        .slice(0, DISCOVER_COUNT);

      return json({
        footprint: account.footprint,
        metrics: account.metrics,
        projects,
        supportedProjects,
      } satisfies DashboardResponse);
    },
  },
  { auth: true, errorMessage: 'Unable to load dashboard' },
);

export const config: Config = { path: '/api/dashboard' };

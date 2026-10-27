import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { authenticated, json } from './_api';
import { MetricType, type ImpactMetric } from '../../src/types/app';
import { readProjects } from './_repository';
import type { UserCalculation } from './_calculator';

export default authenticated(async (_request, _context, user) => {
  const database = db();
  const [allProjects, userDocument, supports] = await Promise.all([
    readProjects(),
    database.collection('users').doc(user.uid).get(),
    database.collection('users').doc(user.uid).collection('supportedProjects').limit(20).get(),
  ]);

  const userData = userDocument.data() as (Partial<UserCalculation> & { impactMetrics?: ImpactMetric[] }) | undefined;
  const saved = userData?.footprint;
  const metrics = (Array.isArray(userData?.impactMetrics) ? userData.impactMetrics : []).filter((metric) =>
    Object.values(MetricType).includes(metric.type) && Number.isFinite(metric.value) && metric.value >= 0,
  );
  const supportedIds = new Set(supports.docs.filter((doc) => doc.data().status === 'active' && doc.data().projectId === doc.id).map((doc) => doc.id));
  const supportedProjects = allProjects.filter((project) => supportedIds.has(project.id));
  const projects = allProjects.filter((project) => !supportedIds.has(project.id)).slice(0, 2);

  return json({
    footprint: saved ? {
      annualEmissionsTonnes: saved.annualEmissionsTonnes,
      updatedAt: saved.updatedAt.toMillis(),
    } : null,
    metrics,
    projects,
    supportedProjects,
  });
}, 'Unable to load dashboard');

export const config: Config = { path: '/api/dashboard' };

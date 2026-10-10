import type { Config } from '@netlify/functions';
import { db } from './_firebase';
import { authenticated, json } from './_api';
import { DATASET_PATH, SCHEMA_VERSION, validateDocument, type DatasetDocument } from './_schema';
import { readProjects } from './_repository';
import type { UserCalculation } from './_calculator';

export default authenticated(async (_request, _context, user) => {
  const database = db();
  const [dashboard, projects, userDocument] = await Promise.all([
    database.doc(DATASET_PATH).get(),
    readProjects(2),
    database.collection('users').doc(user.uid).get(),
  ]);

  const data = dashboard.data() as DatasetDocument | undefined;
  if (data) {
    if (data.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported dataset schema');
    validateDocument('', data);
  }
  const saved = (userDocument.data() as Partial<UserCalculation> | undefined)?.footprint;

  return json({
    footprint: saved ? {
      annualEmissionsTonnes: saved.annualEmissionsTonnes,
      updatedAt: saved.updatedAt.toMillis(),
    } : null,
    metrics: data?.metrics ?? [],
    projects,
  });
}, 'Unable to load dashboard');

export const config: Config = { path: '/api/dashboard' };

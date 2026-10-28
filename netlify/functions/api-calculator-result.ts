import type { Config } from '@netlify/functions';
import { authenticated, json } from '../../src/server/http';
import { db } from '../../src/server/firebase';
import {
  createSaveCalculationHandler,
  decodeAnswers,
  type UserCalculation,
} from '../../src/server/calculator';

const save = createSaveCalculationHandler(async (uid, calculation) => {
  // A single atomic merge preserves unrelated profile data and updates the
  // latest calculation and dashboard summary together. Retrying adds no history.
  await db().collection('users').doc(uid).set(calculation, { merge: true });
});
export default authenticated(async (request, context, user) => {
  if (request.method === 'POST') return save(request, context, user);
  if (request.method !== 'GET')
    return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  const snapshot = await db().collection('users').doc(user.uid).get();
  const data = snapshot.data() as Partial<UserCalculation> | undefined;
  if (!data?.calculator || !data.footprint) return json({ result: null });
  return json({
    result: {
      answers: decodeAnswers(data.calculator.answers as Record<string, number>),
      footprint: {
        annualEmissionsTonnes: data.footprint.annualEmissionsTonnes,
        updatedAt: data.footprint.updatedAt.toMillis(),
      },
    },
  });
}, 'Unable to load calculator result');

export const config: Config = { path: '/api/calculator-result' };

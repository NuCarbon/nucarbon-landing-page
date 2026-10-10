import type { Config } from '@netlify/functions';
import { authenticated } from './_api';
import { db } from './_firebase';
import { createSaveCalculationHandler } from './_calculator';

export default authenticated(createSaveCalculationHandler(async (uid, calculation) => {
  // A single atomic merge preserves unrelated profile data and updates the
  // latest calculation and dashboard summary together. Retrying adds no history.
  await db().collection('users').doc(uid).set(calculation, { merge: true });
}), 'Unable to save calculator result');

export const config: Config = { path: '/api/calculator-result' };

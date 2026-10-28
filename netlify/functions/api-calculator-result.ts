import type { Config } from '@netlify/functions';
import { createSaveCalculationHandler, savedCalculatorResult } from '../../src/server/calculator';
import { json, route } from '../../src/server/http';
import { readUser, saveUserCalculation } from '../../src/server/repository';

export default route(
  {
    GET: async (_request, _context, user) =>
      json({ result: savedCalculatorResult(await readUser(user.uid)) }),
    POST: createSaveCalculationHandler(saveUserCalculation),
  },
  { auth: true, errorMessage: 'Unable to process calculator result' },
);

export const config: Config = { path: '/api/calculator-result' };

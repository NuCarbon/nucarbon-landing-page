import { Timestamp } from 'firebase-admin/firestore';
import { calculateFootprint } from '../lib/calculator/calculate.ts';
import {
  EnergyAnswer,
  FoodAnswer,
  HomeAnswer,
  ProfileAnswer,
  TransportAnswer,
  WasteAnswer,
  parseAnswers,
  type CalculatorAnswers,
} from '../lib/calculator/answers.ts';
import type { AuthenticatedHandler } from './http.ts';

// Stable numeric storage codes; do not reorder when adding new answers.
const codes = {
  profile: { [ProfileAnswer.Person]: 1 },
  home: { [HomeAnswer.Apartment]: 1, [HomeAnswer.SmallHouse]: 2, [HomeAnswer.LargeHouse]: 3 },
  transport: {
    [TransportAnswer.Gas]: 1,
    [TransportAnswer.Ethanol]: 2,
    [TransportAnswer.Electric]: 3,
    [TransportAnswer.Motorcycle]: 4,
    [TransportAnswer.Public]: 5,
    [TransportAnswer.Bike]: 6,
  },
  energy: { [EnergyAnswer.Low]: 1, [EnergyAnswer.Medium]: 2, [EnergyAnswer.High]: 3 },
  food: {
    [FoodAnswer.Vegan]: 1,
    [FoodAnswer.Vegetarian]: 2,
    [FoodAnswer.Flexitarian]: 3,
    [FoodAnswer.Moderate]: 4,
    [FoodAnswer.High]: 5,
  },
  waste: { [WasteAnswer.Recycle]: 1, [WasteAnswer.Sometimes]: 2, [WasteAnswer.Trash]: 3 },
};

export function decodeAnswers(stored: Record<string, number>): CalculatorAnswers {
  const result: Record<string, unknown> = {};
  for (const [key, options] of Object.entries(codes)) {
    const entry = Object.entries(options).find(([, code]) => code === stored[key]);
    if (!entry) throw new Error('Invalid saved answers');
    result[key] = entry[0];
  }
  result.distance = stored.weeklyDistanceKm;
  return parseAnswers(result);
}

export function buildUserCalculation(answers: CalculatorAnswers, updatedAt: Timestamp) {
  const result = calculateFootprint(answers);
  const storedAnswers = Object.fromEntries(
    Object.entries(codes).map(([key, options]) => [
      key,
      (options as Record<string, number>)[answers[key as keyof typeof codes]],
    ]),
  );
  return {
    footprint: { annualEmissionsTonnes: result.total, updatedAt },
    calculator: {
      answers: { ...storedAnswers, weeklyDistanceKm: answers.distance },
      annualEmissionsTonnes: result.total,
      treeEquivalent: result.trees,
      categoryEmissionsTonnes: Object.fromEntries(
        result.categories.map(({ id, tonnes }) => [id, tonnes]),
      ),
      updatedAt,
    },
  };
}

export type UserCalculation = ReturnType<typeof buildUserCalculation>;

export function createSaveCalculationHandler(
  persist: (uid: string, calculation: UserCalculation) => Promise<void>,
  now = () => Timestamp.now(),
): AuthenticatedHandler {
  const respond = (body: unknown, status: number) =>
    Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
  return async (request, _context, user) => {
    if (request.method !== 'POST')
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return respond({ error: 'Expected JSON' }, 415);
    let answers: CalculatorAnswers;
    try {
      const raw = await request.text();
      if (raw.length > 4096) return respond({ error: 'Request too large' }, 413);
      const body = JSON.parse(raw);
      if (!body || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'answers'))
        throw new Error('Invalid request');
      answers = parseAnswers(body.answers);
    } catch {
      return respond({ error: 'Invalid calculator answers' }, 400);
    }
    // Identity comes only from the verified token. Never trust client totals or UIDs.
    const calculation = buildUserCalculation(answers, now());
    await persist(user.uid, calculation);
    return respond(
      {
        footprint: {
          annualEmissionsTonnes: calculation.footprint.annualEmissionsTonnes,
          updatedAt: calculation.footprint.updatedAt.toMillis(),
        },
      },
      200,
    );
  };
}

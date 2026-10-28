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
  type StepId,
} from '../lib/calculator/answers.ts';
import type { CalculatorResultResponse, Footprint } from '../types/app';
import { HttpError, json, readJsonBody, type AuthenticatedHandler } from './http.ts';
import type { UserRecord } from './repository.ts';
import { isRecord } from './schema.ts';

type AnswerCodes = {
  readonly [K in StepId]: Readonly<Partial<Record<CalculatorAnswers[K], number>>>;
};

// Numeric codes persisted in users/{uid}.calculator.answers. Never renumber or reuse a code:
// give a new answer the next unused number in its step.
export const answerCodes: AnswerCodes = {
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

const STEPS = Object.keys(answerCodes) as StepId[];

export type StoredAnswers = Record<StepId, number> & { weeklyDistanceKm: number };

export function encodeAnswers(answers: CalculatorAnswers): StoredAnswers {
  const stored: Record<string, number> = {};
  for (const step of STEPS) {
    const code = (answerCodes[step] as Record<string, number | undefined>)[answers[step]];
    if (code === undefined) throw new Error(`No storage code for ${step} "${answers[step]}"`);
    stored[step] = code;
  }
  return { ...stored, weeklyDistanceKm: answers.distance } as StoredAnswers;
}

/** Inverse of encodeAnswers. Throws if the stored codes are unknown or no longer valid. */
export function decodeAnswers(stored: unknown): CalculatorAnswers {
  if (!isRecord(stored)) throw new Error('Invalid saved answers');
  const answers: Record<string, unknown> = { distance: stored.weeklyDistanceKm };
  for (const step of STEPS) {
    const entry = Object.entries(answerCodes[step]).find(([, code]) => code === stored[step]);
    if (!entry) throw new Error(`Invalid saved ${step} answer`);
    answers[step] = entry[0];
  }
  return parseAnswers(answers);
}

export function buildUserCalculation(answers: CalculatorAnswers, updatedAt: Timestamp) {
  const result = calculateFootprint(answers);
  return {
    footprint: { annualEmissionsTonnes: result.total, updatedAt },
    calculator: {
      answers: encodeAnswers(answers),
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

/**
 * The saved result for GET /api/calculator-result. Unreadable answers (e.g. written by an older
 * version) count as no result, so the user can recalculate instead of hitting a 500 forever.
 */
export function savedCalculatorResult(user: UserRecord): CalculatorResultResponse['result'] {
  if (!user.footprint || user.calculatorAnswers === undefined) return null;
  try {
    return { answers: decodeAnswers(user.calculatorAnswers), footprint: user.footprint };
  } catch (error) {
    console.error(`Ignoring unreadable calculator answers in users/${user.uid}`, error);
    return null;
  }
}

function parseSaveRequest(body: unknown): CalculatorAnswers {
  // Exactly { answers }: a client-sent total or user ID is rejected rather than ignored.
  if (!isRecord(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'answers')) {
    throw new HttpError(400, 'Invalid calculator answers');
  }
  try {
    return parseAnswers(body.answers);
  } catch {
    throw new HttpError(400, 'Invalid calculator answers');
  }
}

/** POST /api/calculator-result. `persist` is injected so the handler can be tested offline. */
export function createSaveCalculationHandler(
  persist: (uid: string, calculation: UserCalculation) => Promise<void>,
  now = () => Timestamp.now(),
): AuthenticatedHandler {
  return async (request, _context, user) => {
    const answers = parseSaveRequest(await readJsonBody(request));
    // Identity comes only from the verified token. Never trust client totals or UIDs.
    const calculation = buildUserCalculation(answers, now());
    await persist(user.uid, calculation);
    const footprint: Footprint = {
      annualEmissionsTonnes: calculation.footprint.annualEmissionsTonnes,
      updatedAt: calculation.footprint.updatedAt.toMillis(),
    };
    return json({ footprint });
  };
}

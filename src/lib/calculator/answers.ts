export enum ProfileAnswer {
  Person = 'person',
  Family = 'family',
  Company = 'company',
  Event = 'event',
}

export enum HomeAnswer {
  Apartment = 'apartment',
  SmallHouse = 'small-house',
  LargeHouse = 'large-house',
}

export enum TransportAnswer {
  Gas = 'gas',
  Ethanol = 'ethanol',
  Electric = 'electric',
  Motorcycle = 'motorcycle',
  Public = 'public',
  Bike = 'bike',
}

export enum EnergyAnswer {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum FoodAnswer {
  Vegan = 'vegan',
  Vegetarian = 'vegetarian',
  Flexitarian = 'flexitarian',
  Moderate = 'moderate',
  High = 'high',
}

export enum WasteAnswer {
  Recycle = 'recycle',
  Sometimes = 'sometimes',
  Trash = 'trash',
}

export interface CalculatorAnswers {
  profile: ProfileAnswer;
  home: HomeAnswer;
  transport: TransportAnswer;
  distance: number;
  energy: EnergyAnswer;
  food: FoodAnswer;
  waste: WasteAnswer;
}

export type StepId = Exclude<keyof CalculatorAnswers, 'distance'>;

export const initialAnswers: Readonly<CalculatorAnswers> = {
  profile: ProfileAnswer.Person,
  home: HomeAnswer.Apartment,
  transport: TransportAnswer.Gas,
  distance: 180,
  energy: EnergyAnswer.Medium,
  food: FoodAnswer.Flexitarian,
  waste: WasteAnswer.Recycle,
};

// Answers the calculator currently accepts. Profiles other than Person are
// shown as "Em breve" and rejected until their factors are validated.
export const SUPPORTED_ANSWERS: { readonly [K in StepId]: readonly CalculatorAnswers[K][] } = {
  profile: [ProfileAnswer.Person],
  home: Object.values(HomeAnswer),
  transport: Object.values(TransportAnswer),
  energy: Object.values(EnergyAnswer),
  food: Object.values(FoodAnswer),
  waste: Object.values(WasteAnswer),
};

/** Weekly distance by car or transit, in kilometres. */
export const DISTANCE_KM = { min: 0, max: 500, step: 10 } as const;

const STEP_IDS = Object.keys(SUPPORTED_ANSWERS) as StepId[];
const ANSWER_COUNT = STEP_IDS.length + 1; // Every step plus the distance.

function isValidDistance(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= DISTANCE_KM.min &&
    value <= DISTANCE_KM.max &&
    value % DISTANCE_KM.step === 0
  );
}

/** Validates untrusted answers (request bodies, browser storage). Throws a descriptive error. */
export function parseAnswers(value: unknown): CalculatorAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid answers');
  }
  const answers = value as Record<string, unknown>;
  if (Object.keys(answers).length !== ANSWER_COUNT) throw new Error('Invalid answer fields');
  for (const key of STEP_IDS) {
    if (!(SUPPORTED_ANSWERS[key] as readonly unknown[]).includes(answers[key])) {
      throw new Error(`Invalid ${key}`);
    }
  }
  if (!isValidDistance(answers.distance)) throw new Error('Invalid weekly distance');
  return { ...answers } as unknown as CalculatorAnswers;
}

export function isCalculatorAnswers(value: unknown): value is CalculatorAnswers {
  try {
    parseAnswers(value);
    return true;
  } catch {
    return false;
  }
}

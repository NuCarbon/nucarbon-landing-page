// Share codes: a short, versioned, checksummed encoding of the calculator answers used in
// /calculadora/resultado/<code>. A code is 6 characters of [0-9a-z]: the version ("1"), four
// base36 digits of a mixed-radix index over the answers, and one checksum digit.
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
} from './answers.ts';

export const SHARE_IMAGE_FORMATS = ['og', 'story'] as const;
export type ShareImageFormat = (typeof SHARE_IMAGE_FORMATS)[number];

/** Pixel sizes: link previews (1.91:1) and Instagram Stories (9:16). */
export const SHARE_IMAGE_SIZES: Readonly<
  Record<ShareImageFormat, { readonly width: number; readonly height: number }>
> = {
  og: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
};

export function isShareImageFormat(value: unknown): value is ShareImageFormat {
  return SHARE_IMAGE_FORMATS.includes(value as ShareImageFormat);
}

export const SHARE_CODE_VERSION = 1;

// Frozen v1 tables. Codes already shared depend on these positions: never reorder or append;
// a new option means version 2. They list every enum value, including profiles the calculator
// does not accept yet (decoding still rejects those through parseAnswers).
export const SHARE_V1_OPTIONS: { readonly [K in StepId]: readonly CalculatorAnswers[K][] } = {
  profile: [ProfileAnswer.Person, ProfileAnswer.Family, ProfileAnswer.Company, ProfileAnswer.Event],
  home: [HomeAnswer.Apartment, HomeAnswer.SmallHouse, HomeAnswer.LargeHouse],
  transport: [
    TransportAnswer.Gas,
    TransportAnswer.Ethanol,
    TransportAnswer.Electric,
    TransportAnswer.Motorcycle,
    TransportAnswer.Public,
    TransportAnswer.Bike,
  ],
  energy: [EnergyAnswer.Low, EnergyAnswer.Medium, EnergyAnswer.High],
  food: [
    FoodAnswer.Vegan,
    FoodAnswer.Vegetarian,
    FoodAnswer.Flexitarian,
    FoodAnswer.Moderate,
    FoodAnswer.High,
  ],
  waste: [WasteAnswer.Recycle, WasteAnswer.Sometimes, WasteAnswer.Trash],
};

/** Weekly distance in km as encoded by v1. Frozen like the tables above. */
export const SHARE_V1_DISTANCE = { min: 0, max: 500, step: 10 } as const;

const STEP_ORDER = ['profile', 'home', 'transport', 'energy', 'food', 'waste'] as const;
const DISTANCE_COUNT = (SHARE_V1_DISTANCE.max - SHARE_V1_DISTANCE.min) / SHARE_V1_DISTANCE.step + 1;
/** Mixed radix, most significant first: the six steps, then the distance. */
const RADIX = [...STEP_ORDER.map((step) => SHARE_V1_OPTIONS[step].length), DISTANCE_COUNT];
const INDEX_COUNT = RADIX.reduce((product, radix) => product * radix, 1);

const BASE = 36;
const INDEX_DIGITS = 4;
// Coprime with 36, so any single mistyped character changes the checksum.
const CHECKSUM_WEIGHTS = [1, 5, 7, 11, 13];
const CODE_PATTERN = /^[0-9a-z]{6}$/;

function checksum(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    sum += parseInt(body[i], BASE) * CHECKSUM_WEIGHTS[i];
  }
  return (sum % BASE).toString(BASE);
}

/** Encodes valid answers. Throws on anything `parseAnswers` rejects. */
export function encodeShareCode(answers: CalculatorAnswers): string {
  const valid = parseAnswers(answers);
  const digits = [
    ...STEP_ORDER.map((step) => (SHARE_V1_OPTIONS[step] as readonly string[]).indexOf(valid[step])),
    (valid.distance - SHARE_V1_DISTANCE.min) / SHARE_V1_DISTANCE.step,
  ];
  if (digits.some((digit, i) => !Number.isInteger(digit) || digit < 0 || digit >= RADIX[i])) {
    throw new Error('Answers cannot be encoded by share code v1');
  }
  const index = digits.reduce((value, digit, i) => value * RADIX[i] + digit, 0);
  const body = `${SHARE_CODE_VERSION}${index.toString(BASE).padStart(INDEX_DIGITS, '0')}`;
  return body + checksum(body);
}

/** Decodes an untrusted code. Returns null for anything malformed or unsupported. */
export function decodeShareCode(code: unknown): CalculatorAnswers | null {
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) return null;
  if (code[0] !== String(SHARE_CODE_VERSION)) return null;
  const body = code.slice(0, -1);
  if (checksum(body) !== code.slice(-1)) return null;

  let index = parseInt(body.slice(1), BASE);
  if (!Number.isInteger(index) || index < 0 || index >= INDEX_COUNT) return null;

  const digits = new Array<number>(RADIX.length);
  for (let i = RADIX.length - 1; i >= 0; i -= 1) {
    digits[i] = index % RADIX[i];
    index = Math.floor(index / RADIX[i]);
  }

  const answers: Record<string, unknown> = {};
  STEP_ORDER.forEach((step, i) => {
    answers[step] = SHARE_V1_OPTIONS[step][digits[i]];
  });
  answers.distance = SHARE_V1_DISTANCE.min + digits[RADIX.length - 1] * SHARE_V1_DISTANCE.step;

  try {
    return parseAnswers(answers);
  } catch {
    return null;
  }
}

export function sharedResultPath(code: string): string {
  return `/calculadora/resultado/${code}`;
}

export function shareImagePath(code: string, format: ShareImageFormat): string {
  return `${sharedResultPath(code)}/${format}.png`;
}

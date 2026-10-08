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

export interface CalculatorState {
  answers: CalculatorAnswers;
}

export const initialAnswers: Readonly<CalculatorAnswers> = {
  profile: ProfileAnswer.Person,
  home: HomeAnswer.Apartment,
  transport: TransportAnswer.Gas,
  distance: 180,
  energy: EnergyAnswer.Medium,
  food: FoodAnswer.Flexitarian,
  waste: WasteAnswer.Recycle,
};

// Panels receive independent snapshots and a calculator:state event whenever
// choices change. A step or results component can consume the complete state.
export interface CalculatorPanel extends HTMLElement {
  calculatorState: CalculatorState;
}

export function createCalculatorFlow(order: readonly StepId[]) {
  if (!order.length || new Set(order).size !== order.length) {
    throw new Error('Calculator steps must have unique IDs and cannot be empty.');
  }

  let index = 0;
  const answers = { ...initialAnswers };

  return {
    get index() { return index; },
    get currentStep() { return order[index]; },
    get isLastStep() { return index === order.length - 1; },
    snapshot(): CalculatorState {
      return { answers: { ...answers } };
    },
    setAnswer<K extends keyof CalculatorAnswers>(key: K, value: CalculatorAnswers[K]) {
      answers[key] = value;
    },
    next() { index = Math.min(index + 1, order.length - 1); },
    back() { index = Math.max(index - 1, 0); },
    restart() { index = 0; },
  };
}

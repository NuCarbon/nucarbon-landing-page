import { initialAnswers, type CalculatorAnswers, type StepId } from './answers.ts';

export interface CalculatorState {
  answers: CalculatorAnswers;
}

/** Step navigation and answers for one calculator. Snapshots are copies. */
export function createCalculatorFlow(order: readonly StepId[]) {
  if (!order.length || new Set(order).size !== order.length) {
    throw new Error('Calculator steps must have unique IDs and cannot be empty.');
  }

  let index = 0;
  const answers = { ...initialAnswers };

  return {
    get index() {
      return index;
    },
    get currentStep() {
      return order[index];
    },
    get isLastStep() {
      return index === order.length - 1;
    },
    snapshot(): CalculatorState {
      return { answers: { ...answers } };
    },
    setAnswer<K extends keyof CalculatorAnswers>(key: K, value: CalculatorAnswers[K]) {
      answers[key] = value;
    },
    next() {
      index = Math.min(index + 1, order.length - 1);
    },
    back() {
      index = Math.max(index - 1, 0);
    },
    restart() {
      index = 0;
    },
  };
}

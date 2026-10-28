// Session storage handoff between a project page, sign-in and /checkout.
import type { CheckoutRequest } from '../../types/app';

const INTENT_KEY = 'nucarbon:checkout-intent';
const ORDER_KEY = 'nucarbon:checkout-order';

/** A selection older than this must be made again on the project page. */
export const INTENT_TTL_MS = 30 * 60 * 1000;

export interface CheckoutIntent extends CheckoutRequest {
  createdAt: number; // Unix milliseconds.
}

export function saveCheckoutIntent(intent: CheckoutIntent): void {
  sessionStorage.removeItem(ORDER_KEY);
  sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
}

export function readCheckoutIntent(now = Date.now()): CheckoutIntent | null {
  try {
    const intent = JSON.parse(
      sessionStorage.getItem(INTENT_KEY) ?? 'null',
    ) as CheckoutIntent | null;
    if (
      !intent ||
      typeof intent.key !== 'string' ||
      typeof intent.slug !== 'string' ||
      typeof intent.createdAt !== 'number' ||
      now < intent.createdAt ||
      now - intent.createdAt > INTENT_TTL_MS
    ) {
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

/** Once an order exists, reloading /checkout reads the order instead of creating another. */
export function saveCheckoutOrderId(id: string): void {
  sessionStorage.setItem(ORDER_KEY, id);
  sessionStorage.removeItem(INTENT_KEY);
}

export const readCheckoutOrderId = () => sessionStorage.getItem(ORDER_KEY);

export function clearCheckoutState(): void {
  sessionStorage.removeItem(INTENT_KEY);
  sessionStorage.removeItem(ORDER_KEY);
}

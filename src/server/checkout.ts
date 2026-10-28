// Contribution orders: users/{uid}/orders/{key}. Registering interest does not collect money.
import { Timestamp } from 'firebase-admin/firestore';
import {
  CONTRIBUTION_PERCENTAGES,
  calculateAmount,
  isValidQuantity,
  type AmountInput,
  type ContributionPercentage,
} from '../lib/checkout/amount.ts';
import type { CheckoutRequest, Order, UUID } from '../types/app';
import { db } from './firebase.ts';
import { HttpError } from './http.ts';
import { isSlug, isUuid } from './ids.ts';
import { readProjectBySlug, readUser } from './repository.ts';
import { isRecord } from './schema.ts';

/** A pending order can be confirmed for this long after it is created. */
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

interface OrderDocument extends Omit<Order, 'id' | 'createdAt' | 'expiresAt' | 'registeredAt'> {
  createdAt: Timestamp;
  expiresAt: Timestamp;
  registeredAt?: Timestamp;
}

export type ValidCheckoutRequest = CheckoutRequest &
  (
    | { mode: 'manual'; quantity: number }
    | { mode: 'percentage'; percentage: ContributionPercentage }
  );

const orderRef = (uid: string, id: string) =>
  db().collection('users').doc(uid).collection('orders').doc(id);

const isContributionPercentage = (value: unknown): value is ContributionPercentage =>
  (CONTRIBUTION_PERCENTAGES as readonly unknown[]).includes(value);

/** Validates a POST /api/checkouts body. Unknown fields (e.g. the client's createdAt) are ignored. */
export function parseCheckoutRequest(body: unknown): ValidCheckoutRequest {
  if (!isRecord(body) || !isUuid(body.key) || !isSlug(body.slug)) {
    throw new HttpError(400, 'Invalid checkout');
  }
  const key = body.key;
  const slug = body.slug;

  if (body.mode === 'percentage') {
    if (!isContributionPercentage(body.percentage)) throw new HttpError(400, 'Invalid percentage');
    return { key, slug, mode: 'percentage', percentage: body.percentage };
  }
  if (body.mode === 'manual') {
    if (typeof body.quantity !== 'number' || !isValidQuantity(body.quantity)) {
      throw new HttpError(400, 'Invalid quantity');
    }
    return { key, slug, mode: 'manual', quantity: body.quantity };
  }
  throw new HttpError(400, 'Invalid checkout');
}

function toOrder(id: string, order: OrderDocument): Order {
  return {
    id: id as UUID,
    projectId: order.projectId,
    projectSlug: order.projectSlug,
    projectName: order.projectName,
    quantityTonnes: order.quantityTonnes,
    mode: order.mode,
    percentage: order.percentage,
    pricePerTonneCents: order.pricePerTonneCents,
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt.toMillis(),
    expiresAt: order.expiresAt.toMillis(),
    registeredAt: order.registeredAt?.toMillis() ?? null,
  };
}

/** The server resolves the price and the saved footprint; the client only picks an option. */
async function resolveAmount(
  uid: string,
  request: ValidCheckoutRequest,
  pricePerTonneCents: number,
) {
  let input: AmountInput;
  if (request.mode === 'manual') {
    input = { mode: 'manual', quantity: request.quantity };
  } else {
    const { footprint } = await readUser(uid);
    if (!footprint) throw new HttpError(400, 'Saved footprint required');
    input = {
      mode: 'percentage',
      percentage: request.percentage,
      annualFootprint: footprint.annualEmissionsTonnes,
    };
  }

  try {
    return calculateAmount(input, pricePerTonneCents);
  } catch {
    throw new HttpError(400, 'Invalid quantity');
  }
}

/** Idempotent: the client-generated key becomes the order ID, so retries return the same order. */
export async function createOrder(uid: string, request: ValidCheckoutRequest): Promise<Order> {
  const ref = orderRef(uid, request.key);
  // A retry must return the original order even if the project or footprint changed since.
  const existing = await ref.get();
  if (existing.exists) return toOrder(ref.id, existing.data() as OrderDocument);

  const project = await readProjectBySlug(request.slug);
  if (!project) throw new HttpError(404, 'Project not found');
  const amount = await resolveAmount(uid, request, project.pricePerTonneCents);

  const now = Date.now();
  const order: OrderDocument = {
    projectId: project.id,
    projectSlug: project.slug,
    projectName: project.name,
    quantityTonnes: amount.quantityTonnes,
    mode: request.mode,
    percentage: request.mode === 'percentage' ? request.percentage : null,
    pricePerTonneCents: project.pricePerTonneCents,
    totalCents: amount.totalCents,
    status: 'pending',
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + ORDER_TTL_MS),
  };
  const stored = await db().runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (current.exists) return current.data() as OrderDocument;
    transaction.create(ref, order);
    return order;
  });
  return toOrder(ref.id, stored);
}

export async function getOrder(uid: string, id: string): Promise<Order> {
  if (!isUuid(id)) throw new HttpError(404, 'Order not found');
  const snapshot = await orderRef(uid, id).get();
  if (!snapshot.exists) throw new HttpError(404, 'Order not found');
  return toOrder(id, snapshot.data() as OrderDocument);
}

/** Registered → 200 (idempotent); pending but expired → 410; any other status → 409. */
export async function confirmOrder(uid: string, id: string): Promise<Order> {
  if (!isUuid(id)) throw new HttpError(404, 'Order not found');
  const ref = orderRef(uid, id);

  return db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpError(404, 'Order not found');
    const order = snapshot.data() as OrderDocument;

    if (order.status === 'registered') return toOrder(id, order);
    if (order.status !== 'pending') throw new HttpError(409, 'Order cannot be confirmed');
    if (order.expiresAt.toMillis() <= Date.now()) throw new HttpError(410, 'Checkout expired');

    const registeredAt = Timestamp.now();
    transaction.update(ref, { status: 'registered', registeredAt });
    return toOrder(id, { ...order, status: 'registered', registeredAt });
  });
}

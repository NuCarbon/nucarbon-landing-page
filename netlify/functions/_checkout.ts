import { Timestamp } from 'firebase-admin/firestore';
import { db } from './_firebase';
import { readProjectBySlug } from './_repository';
import { json } from './_api';
import { demoAmount } from '../../src/scripts/checkout/amount';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const DAY = 24 * 60 * 60 * 1000;
export async function createOrder(uid: string, body: any) {
  if (!body || !uuid(body.key) || typeof body.slug !== 'string' || !['manual','percentage'].includes(body.mode)) return json({ error:'Invalid checkout' }, { status:400 });
  const ref = db().doc(`users/${uid}/demoOrders/${body.key}`);
  const existing = await ref.get();
  if (existing.exists) return json({ order: serialize(existing.id, existing.data()!) });
  const project = await readProjectBySlug(body.slug);
  if (!project) return json({ error:'Project not found' }, { status:404 });
  let amount;
  if (body.mode === 'percentage') {
    if (![25,100].includes(body.percentage)) return json({ error:'Invalid percentage' }, { status:400 });
    const user = await db().doc(`users/${uid}`).get();
    const annual = user.data()?.footprint?.annualEmissionsTonnes;
    if (typeof annual !== 'number' || !Number.isFinite(annual)) return json({ error:'Saved footprint required' }, { status:400 });
    try { amount = demoAmount({ mode:'percentage', percentage:body.percentage, annualFootprint:annual }, project.pricePerTonneCents); }
    catch { return json({ error:'Invalid quantity' }, { status:400 }); }
  } else {
    try { amount = demoAmount({ mode:'manual', quantity:body.quantity }, project.pricePerTonneCents); }
    catch { return json({ error:'Invalid quantity' }, { status:400 }); }
  }
  const order = { projectId:project.id, projectSlug:project.slug, projectName:project.name, quantityTonnes:amount.quantityTonnes, mode:body.mode, percentage:body.mode === 'percentage' ? body.percentage : null, pricePerTonneCents:project.pricePerTonneCents, totalCents:amount.totalCents, status:'pending', createdAt:Timestamp.now(), expiresAt:Timestamp.fromMillis(Date.now()+DAY) };
  const result = await db().runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (current.exists) return current.data()!;
    transaction.create(ref, order);
    return order;
  });
  return json({ order: serialize(ref.id, result) });
}
export function serialize(id: string, data: FirebaseFirestore.DocumentData) {
  return { id, projectId:data.projectId, projectSlug:data.projectSlug, projectName:data.projectName, quantityTonnes:data.quantityTonnes, mode:data.mode, percentage:data.percentage, pricePerTonneCents:data.pricePerTonneCents, totalCents:data.totalCents, status:data.status, createdAt:data.createdAt.toMillis(), expiresAt:data.expiresAt.toMillis(), completedAt:data.completedAt?.toMillis() ?? null };
}
export async function getOrder(uid: string, id: string) {
  if (!uuid(id)) return json({ error:'Not found' }, { status:404 });
  const snapshot = await db().doc(`users/${uid}/demoOrders/${id}`).get();
  return snapshot.exists ? json({ order:serialize(id,snapshot.data()!) }) : json({ error:'Not found' }, { status:404 });
}
export async function confirmOrder(uid: string, id: string) {
  if (!uuid(id)) return json({ error:'Not found' }, { status:404 });
  const ref = db().doc(`users/${uid}/demoOrders/${id}`);
  const result = await db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data()!;
    if (data.status === 'completed') return data;
    if (data.status !== 'pending' || data.expiresAt.toMillis() < Date.now()) return 'expired';
    const completed = { ...data, status:'completed', completedAt:Timestamp.now() };
    transaction.update(ref, { status:completed.status, completedAt:completed.completedAt });
    return completed;
  });
  if (!result) return json({ error:'Not found' }, { status:404 });
  if (result === 'expired') return json({ error:'Checkout expired' }, { status:410 });
  return json({ order:serialize(id,result) });
}

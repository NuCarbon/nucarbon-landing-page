import type { Config } from '@netlify/functions';
import { authenticated, json } from '../../src/server/http';
import { createOrder, getOrder, confirmOrder } from '../../src/server/checkout';

export default authenticated(async (request, _context, user) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (request.method === 'GET')
    return id ? getOrder(user.uid, id) : json({ error: 'Order ID required' }, { status: 400 });
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Expected JSON' }, { status: 415 });
  const raw = await request.text();
  if (raw.length > 4096) return json({ error: 'Request too large' }, { status: 413 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (request.method === 'POST' && !id) return createOrder(user.uid, body);
  if (request.method === 'POST' && id && body?.action === 'confirm')
    return confirmOrder(user.uid, id);
  return json({ error: 'Invalid request' }, { status: 400 });
}, 'Unable to process checkout');

export const config: Config = { path: '/api/checkouts' };

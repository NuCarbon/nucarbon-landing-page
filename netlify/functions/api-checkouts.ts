import type { Config } from '@netlify/functions';
import {
  confirmOrder,
  createOrder,
  getOrder,
  parseCheckoutRequest,
} from '../../src/server/checkout';
import { HttpError, json, readJsonBody, route } from '../../src/server/http';
import { isRecord } from '../../src/server/schema';

const orderId = (request: Request) => new URL(request.url).searchParams.get('id');

export default route(
  {
    // GET ?id=… reads an order.
    GET: async (request, _context, user) => {
      const id = orderId(request);
      if (!id) throw new HttpError(400, 'Order ID required');
      return json({ order: await getOrder(user.uid, id) });
    },
    // POST creates an order from a CheckoutRequest; POST ?id=… with { action: 'confirm' } confirms it.
    POST: async (request, _context, user) => {
      const id = orderId(request);
      const body = await readJsonBody(request);
      if (!id) return json({ order: await createOrder(user.uid, parseCheckoutRequest(body)) });
      if (isRecord(body) && body.action === 'confirm') {
        return json({ order: await confirmOrder(user.uid, id) });
      }
      throw new HttpError(400, 'Invalid request');
    },
  },
  { auth: true, errorMessage: 'Unable to process checkout' },
);

export const config: Config = { path: '/api/checkouts' };

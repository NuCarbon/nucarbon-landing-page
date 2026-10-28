import type { Context } from '@netlify/functions';
import { adminAuth } from './_firebase';
import type { DecodedIdToken } from 'firebase-admin/auth';

export type Handler = (request: Request, context: Context) => Promise<Response>;
export type AuthenticatedHandler = (
  request: Request,
  context: Context,
  user: DecodedIdToken,
) => Promise<Response>;

export async function requireUser(request: Request) {
  const header = request.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) return null;

  try {
    return await adminAuth().verifyIdToken(header.slice(7));
  } catch {
    return null;
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': 'no-store',
      ...init.headers,
    },
  });
}

export function authenticated(handler: AuthenticatedHandler, errorMessage: string): Handler {
  return async (request, context) => {
    const user = await requireUser(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      return await handler(request, context, user);
    } catch {
      return json({ error: errorMessage }, { status: 500 });
    }
  };
}

export function unavailable() {
  return json({ error: 'Data unavailable' }, { status: 503 });
}

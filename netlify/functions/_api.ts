import type { Context } from '@netlify/functions';
import { adminAuth } from './_firebase';

export type Handler = (request: Request, context: Context) => Promise<Response>;

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

export function authenticated(
  handler: Handler,
  errorMessage: string,
): Handler {
  return async (request, context) => {
    if (!(await requireUser(request))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      return await handler(request, context);
    } catch {
      return json({ error: errorMessage }, { status: 500 });
    }
  };
}

export function unavailable() {
  return json({ error: 'Demo data unavailable' }, { status: 503 });
}

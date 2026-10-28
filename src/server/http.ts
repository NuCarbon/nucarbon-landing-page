import type { Context } from '@netlify/functions';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase.ts';

/** An expected failure. Its message is returned to the client, so keep it generic. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export type Handler = (request: Request, context: Context) => Promise<Response>;
export type AuthenticatedHandler = (
  request: Request,
  context: Context,
  user: DecodedIdToken,
) => Promise<Response>;
export type TokenVerifier = (idToken: string) => Promise<DecodedIdToken>;

type Method = 'GET' | 'POST';

interface RouteOptions {
  /** Returned with every unexpected 500; the cause is only logged. */
  errorMessage: string;
  /** Replaces Firebase token verification in tests. */
  verifyToken?: TokenVerifier;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return Response.json(data, { ...init, headers });
}

/** Reads a size-limited `application/json` body. Callers must still validate its shape. */
export async function readJsonBody<T = unknown>(
  request: Request,
  { maxBytes = 4096 }: { maxBytes?: number } = {},
): Promise<T> {
  const mediaType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') throw new HttpError(415, 'Expected JSON');

  if (Number(request.headers.get('content-length')) > maxBytes) {
    throw new HttpError(413, 'Request too large');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, 'Request too large');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

const verifyWithFirebase: TokenVerifier = (idToken) => adminAuth().verifyIdToken(idToken);

// These auth/* codes describe a misconfigured server, not a bad token.
const SERVER_AUTH_ERRORS = new Set(['auth/internal-error', 'auth/invalid-credential']);

function isRejectedToken(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && code.startsWith('auth/') && !SERVER_AUTH_ERRORS.has(code);
}

/**
 * Verifies the Firebase ID token in the Authorization header. Invalid tokens become a 401;
 * anything else (e.g. missing Admin credentials) is rethrown so it surfaces as a logged 500.
 */
export async function requireUser(
  request: Request,
  verifyToken: TokenVerifier = verifyWithFirebase,
): Promise<DecodedIdToken> {
  const header = request.headers.get('authorization') ?? '';
  const idToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!idToken) throw new HttpError(401, 'Unauthorized');

  try {
    return await verifyToken(idToken);
  } catch (error) {
    if (isRejectedToken(error)) throw new HttpError(401, 'Unauthorized');
    throw error;
  }
}

/**
 * Builds a Netlify Function from one handler per HTTP method. Other methods get a 405 before
 * authentication or body parsing; HttpErrors map to their status and anything else to a 500.
 */
export function route(
  methods: Partial<Record<Method, AuthenticatedHandler>>,
  options: RouteOptions & { auth: true },
): Handler;
export function route(
  methods: Partial<Record<Method, Handler>>,
  options: RouteOptions & { auth: false },
): Handler;
export function route(
  methods: Partial<Record<Method, AuthenticatedHandler | Handler>>,
  { auth, errorMessage, verifyToken }: RouteOptions & { auth: boolean },
): Handler {
  const allow = Object.keys(methods).join(', ');

  return async (request, context) => {
    const handler = Object.hasOwn(methods, request.method)
      ? methods[request.method as Method]
      : undefined;
    if (!handler) {
      return json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: allow } });
    }

    try {
      if (!auth) return await (handler as Handler)(request, context);
      const user = await requireUser(request, verifyToken);
      return await (handler as AuthenticatedHandler)(request, context, user);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, { status: error.status });
      }
      console.error(errorMessage, error);
      return json({ error: errorMessage }, { status: 500 });
    }
  };
}

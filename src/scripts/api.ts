// Same-origin JSON requests authenticated with the signed-in user's Firebase ID token.
import { currentUser } from './auth';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const SESSION_EXPIRED = 'Sua sessão expirou. Entre novamente.';

async function bearer(forceRefresh: boolean): Promise<string> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, SESSION_EXPIRED);
  return `Bearer ${await user.getIdToken(forceRefresh)}`;
}

/** Sends a fresh ID token; on 401 retries once with a force-refreshed token. */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (forceRefresh: boolean) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', await bearer(forceRefresh));
    return fetch(path, { ...init, headers });
  };

  const response = await send(false);
  return response.status === 401 ? send(true) : response;
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;

  // A rejected request does not clear Firebase's persisted session, so a 401
  // is reported to the caller instead of redirecting back to the login page.
  throw new ApiError(
    response.status,
    response.status === 401 ? SESSION_EXPIRED : 'Não foi possível carregar estes dados agora.',
  );
}

export async function getJson<T>(path: string): Promise<T> {
  return readJson<T>(await authorizedFetch(path));
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return readJson<T>(
    await authorizedFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

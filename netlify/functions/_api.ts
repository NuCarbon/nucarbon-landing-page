import type { Context } from '@netlify/functions';
import { adminAuth } from './_firebase';

export async function requireUser(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try { return await adminAuth().verifyIdToken(header.slice(7)); } catch { return null; }
}

export function json(data: unknown, init: ResponseInit = {}) { return Response.json(data, { ...init, headers: { 'cache-control': 'no-store', ...init.headers } }); }
export type Handler = (request: Request, context: Context) => Promise<Response>;

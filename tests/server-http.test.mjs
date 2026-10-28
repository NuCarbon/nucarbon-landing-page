import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError, json, readJsonBody, requireUser, route } from '../src/server/http.ts';

const user = { uid: 'verified-user' };
const verifyToken = async (token) => {
  if (token !== 'valid')
    throw Object.assign(new Error('bad token'), { code: 'auth/argument-error' });
  return user;
};
const ok = async (_request, _context, verified) => json({ uid: verified.uid });

const call = (handler, { method = 'GET', token = 'valid', body, headers = {} } = {}) =>
  handler(
    new Request('https://example.test/api/thing', {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body,
    }),
    {},
  );

test('json responses are not cached unless the caller says otherwise', async () => {
  assert.equal(json({}).headers.get('cache-control'), 'no-store');
  assert.equal(
    json({}, { headers: { 'Cache-Control': 'public, max-age=60' } }).headers.get('cache-control'),
    'public, max-age=60',
  );
  const response = json({ a: 1 }, { status: 201 });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { a: 1 });
});

test('unsupported methods get 405 with Allow before authentication', async () => {
  let verified = 0;
  const handler = route(
    { GET: ok, POST: ok },
    {
      auth: true,
      errorMessage: 'Failed',
      verifyToken: async () => {
        verified++;
        return user;
      },
    },
  );
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const response = await call(handler, { method, token: null });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, POST');
  }
  assert.equal((await call(handler, { method: 'toString' })).status, 405);
  assert.equal(verified, 0);
});

test('authenticated routes pass the verified user and reject missing or invalid tokens', async () => {
  const handler = route({ GET: ok }, { auth: true, errorMessage: 'Failed', verifyToken });
  const response = await call(handler);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { uid: 'verified-user' });

  for (const token of [null, 'expired']) {
    const rejected = await call(handler, { token });
    assert.equal(rejected.status, 401);
    assert.deepEqual(await rejected.json(), { error: 'Unauthorized' });
  }
  const notBearer = await handler(
    new Request('https://example.test/', { headers: { Authorization: 'Basic valid' } }),
    {},
  );
  assert.equal(notBearer.status, 401);
});

test('a verifier failure that is not about the token is a logged 500, not a 401', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  for (const failure of [
    new Error('Firebase Admin is not configured'),
    Object.assign(new Error('no project id'), { code: 'auth/invalid-credential' }),
  ]) {
    const handler = route(
      { GET: ok },
      {
        auth: true,
        errorMessage: 'Unable to load',
        verifyToken: async () => {
          throw failure;
        },
      },
    );
    const response = await call(handler);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Unable to load' });
  }
  assert.equal(logged.mock.callCount(), 2);
  await assert.rejects(
    requireUser(
      new Request('https://example.test/', { headers: { Authorization: 'Bearer x' } }),
      async () => {
        throw new TypeError('network');
      },
    ),
    TypeError,
  );
});

test('HttpErrors keep their status and message; other errors become a generic 500', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const handler = route(
    {
      GET: async () => {
        throw new HttpError(409, 'Conflict');
      },
      POST: async () => {
        throw new Error('secret stack detail');
      },
    },
    { auth: true, errorMessage: 'Unable to process', verifyToken },
  );
  const conflict = await call(handler);
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: 'Conflict' });
  assert.equal(conflict.headers.get('cache-control'), 'no-store');

  const failed = await call(handler, { method: 'POST' });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'Unable to process' });
  assert.equal(logged.mock.callCount(), 1);
});

test('public routes do not verify tokens', async () => {
  const handler = route(
    { GET: async (_request, _context, verified) => json({ verified: verified ?? null }) },
    {
      auth: false,
      errorMessage: 'Failed',
      verifyToken: async () => assert.fail('Must not verify'),
    },
  );
  const response = await call(handler, { token: null });
  assert.deepEqual(await response.json(), { verified: null });
});

test('JSON bodies require the media type, a size limit, and valid syntax', async () => {
  const handler = route(
    { POST: async (request) => json({ body: await readJsonBody(request, { maxBytes: 32 }) }) },
    { auth: true, errorMessage: 'Failed', verifyToken },
  );
  const post = (body, headers = { 'Content-Type': 'application/json' }) =>
    call(handler, { method: 'POST', body, headers });

  const accepted = await post('{"a":1}', { 'Content-Type': 'application/json; charset=utf-8' });
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { body: { a: 1 } });

  assert.equal((await post('{"a":1}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('{"a":1}', {})).status, 415);
  assert.equal((await post('{"a":1}', { 'Content-Type': 'application/jsonp' })).status, 415);
  assert.equal((await post(JSON.stringify({ text: 'x'.repeat(40) }))).status, 413);
  // Multi-byte characters count as bytes, not string length.
  assert.equal((await post(JSON.stringify({ text: 'ç'.repeat(14) }))).status, 413);
  assert.equal(
    (await post('{}', { 'Content-Type': 'application/json', 'Content-Length': '100' })).status,
    413,
  );
  const invalid = await post('{"a":');
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: 'Invalid JSON' });
});

test('body errors from an unauthenticated request are never reached', async () => {
  const handler = route(
    { POST: async (request) => json(await readJsonBody(request)) },
    { auth: true, errorMessage: 'Failed', verifyToken },
  );
  const response = await call(handler, {
    method: 'POST',
    token: null,
    body: 'not json',
    headers: { 'Content-Type': 'text/plain' },
  });
  assert.equal(response.status, 401);
});

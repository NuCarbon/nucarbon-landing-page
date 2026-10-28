import assert from 'node:assert/strict';
import test from 'node:test';
import { loginPath, safeReturnTo } from '../src/lib/urls.ts';

test('same-origin paths are kept with their query and hash', () => {
  assert.equal(safeReturnTo('/projetos/x?y=1'), '/projetos/x?y=1');
  assert.equal(safeReturnTo('/app#comunidade'), '/app#comunidade');
  assert.equal(safeReturnTo('/'), '/');
});

test('anything that could leave the site falls back', () => {
  for (const raw of [
    '//evil.com',
    '/\\evil.com',
    'https://evil.com/app',
    'http:/evil.com',
    'javascript:alert(1)',
    'projetos',
    '',
    null,
    undefined,
  ]) {
    assert.equal(safeReturnTo(raw), '/app', String(raw));
  }
  assert.equal(safeReturnTo('//evil.com', '/projetos'), '/projetos');
});

test('the login path carries an encoded returnTo that safeReturnTo accepts', () => {
  const path = loginPath('/projetos/x?y=1');
  assert.equal(path, '/entrar?returnTo=%2Fprojetos%2Fx%3Fy%3D1');
  const returnTo = new URL(path, 'https://nucarbon.invalid').searchParams.get('returnTo');
  assert.equal(safeReturnTo(returnTo), '/projetos/x?y=1');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { safeReturnTo } from '../src/lib/urls.ts';

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

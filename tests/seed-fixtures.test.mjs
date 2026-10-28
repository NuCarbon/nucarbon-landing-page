import assert from 'node:assert/strict';
import test from 'node:test';
import { isUuid } from '../src/server/ids.ts';
import { validateDocument } from '../src/server/schema.ts';
import { fixtures, ids } from '../scripts/seed/fixtures.mjs';

const ofCollection = (collection) =>
  fixtures.filter(({ path }) => path.startsWith(`${collection}/`));

test('every fixture is a valid document', () => {
  assert.equal(ofCollection('projects').length, 3);
  assert.equal(ofCollection('authors').length, 2);
  assert.equal(ofCollection('posts').length, 2);
  for (const { path, data } of fixtures) validateDocument(path, data);
});

test('fixture IDs, paths and project slugs are unique', () => {
  const idValues = Object.values(ids);
  assert.ok(idValues.every(isUuid));
  assert.equal(new Set(idValues).size, idValues.length);
  const paths = fixtures.map(({ path }) => path);
  assert.equal(new Set(paths).size, paths.length);
  const slugs = ofCollection('projects').map(({ data }) => data.slug);
  assert.deepEqual(slugs.sort(), [
    'corredores-mata-atlantica',
    'guardioes-cerrado-nascentes',
    'vale-do-paraiba',
  ]);
});

test('posts reference seeded authors and projects are published', () => {
  const authorPaths = new Set(ofCollection('authors').map(({ path }) => path));
  for (const { data } of ofCollection('posts'))
    assert.ok(authorPaths.has(`authors/${data.authorId}`));
  for (const { data } of ofCollection('projects')) {
    assert.equal(data.published, true);
    assert.equal(data.pricePerTonneCents, 7500);
  }
});

test('no demo markers leak into production copy', () => {
  const text = JSON.stringify(fixtures.map(({ data }) => data));
  assert.doesNotMatch(text, /fict[ií]cia/i);
  assert.doesNotMatch(text, /\(exemplo\)/i);
});

test('no user-specific documents are seeded', () => {
  assert.ok(fixtures.every(({ path }) => /^(projects|authors|posts)\/[^/]+$/.test(path)));
});

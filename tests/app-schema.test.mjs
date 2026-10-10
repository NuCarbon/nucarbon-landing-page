import assert from 'node:assert/strict';
import test from 'node:test';
import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { createDemoDocuments } from '../scripts/demo-data.mjs';
import { validateDocument, projectToJSON, postToJSON } from '../netlify/functions/_schema.ts';
import { MetricType, ReactionType } from '../src/types/app.ts';
import { formatMetric, formatProgress, formatReactions, formatLocation, formatFootprint } from '../src/scripts/app/format.ts';

const documents = createDemoDocuments();
const [projectPath, project] = documents.find(([path]) => path.startsWith('projects/'));
const [postPath, post] = documents.find(([path]) => path.startsWith('posts/'));

test('demo documents have valid stable IDs, native dates/coordinates, and resolvable authors', () => {
  assert.equal(new Set(documents.map(([path]) => path)).size, documents.length);
  assert.deepEqual(createDemoDocuments(), documents);
  for (const [path, data] of documents) {
    validateDocument(path, data);
    if (path.startsWith('posts/')) assert.ok(documents.some(([authorPath]) => authorPath === `authors/${data.authorId}`));
  }
  assert.ok(project.location instanceof GeoPoint);
  assert.ok(post.createdAt instanceof Timestamp);
});

test('API serialization returns numeric units and explicit geographic coordinates', () => {
  const result = projectToJSON(projectPath.split('/')[1], project);
  assert.deepEqual(result.location, { latitude: -22.53, longitude: -52.17 });
  assert.equal(result.areaHectares, 120);
  assert.equal(result.restorationProgress, 0.65);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  const author = documents.find(([path]) => path === `authors/${post.authorId}`)[1];
  const serialized = postToJSON(postPath.split('/')[1], post, { id: post.authorId, ...author });
  assert.equal(serialized.createdAt, Date.parse('2026-10-07T12:00:00Z'));
  assert.equal(serialized.reactions[0].count, 142);
  assert.equal(serialized.author.id, post.authorId);
});

test('invalid IDs, legacy strings, invalid enum codes, and invalid numeric ranges are rejected', () => {
  assert.throws(() => validateDocument('projects/mata', project));
  for (const patch of [
    { areaHectares: '120 hectares' }, { areaHectares: NaN },
    { restorationProgress: 65 }, { restorationProgress: -0.1 },
    { location: 'Teodoro Sampaio / SP' }, { biome: 999 }, { status: 'Monitoramento' },
    { createdAt: 'Há 2 horas' },
  ]) assert.throws(() => validateDocument(projectPath, { ...project, ...patch }));
  assert.throws(() => validateDocument(postPath, { ...post, commentCount: 1.5 }));
  assert.throws(() => validateDocument(postPath, { ...post, reactions: [{ type: ReactionType.Heart, count: -1 }] }));
  assert.throws(() => validateDocument('', { ...documents[0][1], metrics: [{ type: MetricType.TreesSupported, value: 1.5 }] }));
});

test('units, localized labels, and emoji are derived in client formatters', () => {
  assert.equal(formatFootprint(4.8), '4,8 tCO₂e / ano');
  assert.equal(formatProgress(0.65), '65%');
  assert.equal(formatMetric({ type: MetricType.CarbonOffset, value: 1.2 }).value, '1,2 tCO₂e');
  assert.equal(formatMetric({ type: MetricType.TreesSupported, value: 1 }).value, '1 muda nativa');
  assert.equal(formatReactions([{ type: ReactionType.Heart, count: 142 }]), '❤️ 142');
  assert.equal(formatLocation({ latitude: -22.53, longitude: -52.17 }), '22.5300° S, 52.1700° O');
});

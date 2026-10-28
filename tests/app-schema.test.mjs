import assert from 'node:assert/strict';
import test from 'node:test';
import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import {
  footprintToJSON,
  isEnumValue,
  metricsToJSON,
  postToJSON,
  projectToJSON,
  validateDocument,
} from '../src/server/schema.ts';
import { Biome, MetricType, ProjectStatus, ReactionType } from '../src/types/app.ts';
import {
  formatMetric,
  formatPercent,
  formatReactions,
  formatFootprint,
} from '../src/lib/format.ts';

const projectId = 'a834e161-c18c-48f6-bc36-091a7c359231';
const authorId = 'f279c946-504b-49bc-9e20-cf29c1c0c728';
const postId = '60e5ca51-7f92-46df-a36c-5c7438bd58e7';
const project = {
  name: 'Projeto de Teste',
  slug: 'projeto-de-teste',
  published: true,
  biome: Biome.AtlanticForest,
  status: ProjectStatus.Monitoring,
  location: new GeoPoint(-22.53, -52.17),
  areaHectares: 120,
  restorationProgress: 0.65,
  createdAt: Timestamp.fromMillis(1791547200000),
  summary: 'Resumo do projeto',
  description: 'Descrição do projeto',
  municipality: 'Município',
  state: 'SP',
  gallery: [{ url: '/projects/forest-hero-2.jpg', alt: 'Floresta' }],
  treesPlanted: 10,
  carbonTonnes: 1.2,
  participants: 2,
  species: [{ name: 'Árvore', scientificName: 'Arbor test' }],
  impacts: [],
  timeline: [],
  methodology: 'Método registrado',
  documents: [],
  pricePerTonneCents: 7500,
};
const post = {
  authorId,
  createdAt: Timestamp.fromMillis(1791547200000),
  body: 'Texto de teste',
  reactions: [{ type: ReactionType.Heart, count: 2 }],
  commentCount: 1,
};

test('root collection documents retain native dates and coordinates', () => {
  validateDocument(`projects/${projectId}`, project);
  validateDocument(`authors/${authorId}`, { displayName: 'Autor' });
  validateDocument(`posts/${postId}`, post);
  assert.ok(project.location instanceof GeoPoint);
  assert.ok(post.createdAt instanceof Timestamp);
});

test('public project serialization includes only explicit fields', () => {
  const result = projectToJSON(projectId, { ...project, internalNote: 'private' });
  assert.deepEqual(result.location, { latitude: -22.53, longitude: -52.17 });
  assert.equal(result.areaHectares, 120);
  assert.equal(result.restorationProgress, 0.65);
  assert.equal('internalNote' in result, false);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  const serialized = postToJSON(postId, post, { id: authorId, displayName: 'Autor' });
  assert.equal(serialized.createdAt, post.createdAt.toMillis());
});

test('invalid IDs, fields, and unsafe URLs are rejected', () => {
  assert.throws(() => validateDocument('projects/mata', project));
  for (const patch of [
    { areaHectares: '120 hectares' },
    { areaHectares: NaN },
    { restorationProgress: 65 },
    { restorationProgress: -0.1 },
    { location: 'SP' },
    { biome: 999 },
    { status: 'Monitoramento' },
    { createdAt: 'yesterday' },
    { slug: undefined },
    { pricePerTonneCents: 0 },
    { gallery: [{ url: 'javascript:alert(1)', alt: 'bad' }] },
  ])
    assert.throws(() => validateDocument(`projects/${projectId}`, { ...project, ...patch }));
  assert.throws(() => validateDocument(`posts/${postId}`, { ...post, commentCount: 1.5 }));
  assert.throws(
    () =>
      validateDocument(`posts/${postId}`, {
        ...post,
        reactions: [
          { type: ReactionType.Heart, count: 1 },
          { type: ReactionType.Heart, count: 2 },
        ],
      }),
    /reaction type/,
  );
  assert.throws(() => validateDocument(`posts/${postId}`, { ...post, authorId: 'Carlos' }));
  assert.throws(() => validateDocument(`orders/${postId}`, {}), /Unknown collection/);
  assert.throws(() => validateDocument(`projects/${projectId}/extra`, project));
  assert.throws(
    () => validateDocument(`projects/${projectId}`, { ...project, name: ' ' }),
    new RegExp(`projects/${projectId}: name`),
  );
});

test('enum codes accept only numeric members', () => {
  assert.equal(isEnumValue(MetricType.CarbonOffset, MetricType), true);
  assert.equal(isEnumValue('CarbonOffset', MetricType), false);
  assert.equal(isEnumValue('2', MetricType), false);
  assert.equal(isEnumValue(99, MetricType), false);
});

test('user footprint and metrics drop malformed values', () => {
  const updatedAt = Timestamp.fromMillis(1791547200000);
  assert.deepEqual(footprintToJSON({ annualEmissionsTonnes: 4.8, updatedAt }), {
    annualEmissionsTonnes: 4.8,
    updatedAt: 1791547200000,
  });
  for (const value of [
    undefined,
    { annualEmissionsTonnes: -1, updatedAt },
    { annualEmissionsTonnes: 4.8, updatedAt: 1791547200000 },
  ])
    assert.equal(footprintToJSON(value), null);
  assert.deepEqual(
    metricsToJSON([
      { type: MetricType.TreesSupported, value: 32 },
      { type: 'CarbonOffset', value: 1 },
      { type: MetricType.CarbonOffset, value: -1 },
      { type: MetricType.CarbonOffset, value: Infinity },
      { type: 99, value: 1 },
      null,
      { type: MetricType.CarbonOffset, value: 1.2, note: 'private' },
    ]),
    [
      { type: MetricType.TreesSupported, value: 32 },
      { type: MetricType.CarbonOffset, value: 1.2 },
    ],
  );
  assert.deepEqual(metricsToJSON('none'), []);
});

test('units and labels remain presentation concerns', () => {
  assert.equal(formatFootprint(4.8), '4,8 tCO₂e / ano');
  assert.equal(formatPercent(0.65), '65%');
  assert.equal(formatMetric({ type: MetricType.CarbonOffset, value: 1.2 }).value, '1,2 tCO₂e');
  assert.equal(formatReactions([{ type: ReactionType.Heart, count: 2 }]), '❤️ 2');
});

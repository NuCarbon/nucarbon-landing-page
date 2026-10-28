import assert from 'node:assert/strict';
import test from 'node:test';
import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { validateDocument, projectToJSON, postToJSON } from '../netlify/functions/_schema.ts';
import { Biome, MetricType, ProjectStatus, ReactionType } from '../src/types/app.ts';
import {
  formatMetric,
  formatProgress,
  formatReactions,
  formatLocation,
  formatFootprint,
} from '../src/scripts/app/format.ts';

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
});

test('units and labels remain presentation concerns', () => {
  assert.equal(formatFootprint(4.8), '4,8 tCO₂e / ano');
  assert.equal(formatProgress(0.65), '65%');
  assert.equal(formatMetric({ type: MetricType.CarbonOffset, value: 1.2 }).value, '1,2 tCO₂e');
  assert.equal(formatReactions([{ type: ReactionType.Heart, count: 2 }]), '❤️ 2');
  assert.equal(formatLocation({ latitude: -22.53, longitude: -52.17 }), '22.5300° S, 52.1700° O');
});

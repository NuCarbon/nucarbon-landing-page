import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { Biome, MetricType, ProjectStatus, ReactionType } from '../src/types/app.ts';

// Fixed UUIDs make repeated seeds idempotent. New production entities should
// receive crypto.randomUUID() at creation; Firebase Auth UIDs remain unchanged.
const ids = {
  mata: 'a834e161-c18c-48f6-bc36-091a7c359231',
  cerrado: 'cf4c1d20-559c-41a0-b080-f07d3eccfa36',
  paraiba: 'a872b723-e559-480d-8684-adc8d0d0697f',
  official: 'f279c946-504b-49bc-9e20-cf29c1c0c728',
  carlos: '0249b8b1-90ce-49d8-83c2-51a1a1d387d5',
  plantingPost: '60e5ca51-7f92-46df-a36c-5c7438bd58e7',
  visitPost: '37a7a8bc-c222-45eb-bcb3-65f2cd38b280',
};
const timestamp = (date) => Timestamp.fromDate(new Date(date));

// Dates and coordinates are explicit demo fixtures, not recovered legacy dates
// or verified project survey points. Never use them as a production migration.
export function createDemoDocuments() {
  return [
    ['', {
      schemaVersion: 2,
      footprint: { annualEmissionsTonnes: 4.8, updatedAt: timestamp('2026-07-07T12:00:00Z') },
      metrics: [
        { type: MetricType.TreesSupported, value: 32 },
        { type: MetricType.CarbonOffset, value: 1.2 },
      ],
    }],
    [`authors/${ids.official}`, { displayName: 'Nucarbon Oficial' }],
    [`authors/${ids.carlos}`, { displayName: 'Carlos M.' }],
    [`projects/${ids.mata}`, {
      name: 'Restauração Corredores da Mata Atlântica',
      biome: Biome.AtlanticForest, status: ProjectStatus.Monitoring,
      location: new GeoPoint(-22.53, -52.17), areaHectares: 120, restorationProgress: 0.65,
      createdAt: timestamp('2026-01-01T12:00:00Z'),
    }],
    [`projects/${ids.cerrado}`, {
      name: 'Guardiões do Cerrado e Nascentes',
      biome: Biome.Cerrado, status: ProjectStatus.Planting,
      location: new GeoPoint(-14.13, -47.51), areaHectares: 85, restorationProgress: 0.4,
      createdAt: timestamp('2026-01-02T12:00:00Z'),
    }],
    [`projects/${ids.paraiba}`, {
      name: 'Reflorestamento Biodiverso Vale do Paraíba',
      biome: Biome.AtlanticForest, status: ProjectStatus.Monitoring,
      location: new GeoPoint(-22.47, -44.45), areaHectares: 135, restorationProgress: 0.85,
      createdAt: timestamp('2026-01-03T12:00:00Z'),
    }],
    [`posts/${ids.plantingPost}`, {
      authorId: ids.official, createdAt: timestamp('2026-10-07T12:00:00Z'),
      body: 'Alcançamos a marca histórica de 340 hectares em restauração ativa! Iniciamos hoje o plantio de mais 1.200 mudas nativas na bacia do Rio Paranapanema.',
      reactions: [{ type: ReactionType.Heart, count: 142 }, { type: ReactionType.Seedling, count: 89 }],
      commentCount: 2,
    }],
    [`posts/${ids.visitPost}`, {
      authorId: ids.carlos, createdAt: timestamp('2026-10-07T09:00:00Z'),
      body: 'Visitar o projeto Guardiões do Cerrado foi uma oportunidade incrível. O trabalho das comunidades tradicionais cuidando das nascentes é inspirador.',
      reactions: [{ type: ReactionType.Applause, count: 32 }, { type: ReactionType.Heart, count: 24 }],
      commentCount: 5,
    }],
  ];
}

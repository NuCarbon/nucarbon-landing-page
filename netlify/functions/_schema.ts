import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { Biome, MetricType, ProjectStatus, ReactionType } from '../../src/types/app.ts';
import type { Author, CommunityPost, Footprint, ImpactMetric, Project, UUID } from '../../src/types/app';

export const DATASET_PATH = 'datasets/demo-v2';
export const SCHEMA_VERSION = 2;

export interface ProjectDocument extends Omit<Project, 'id' | 'location'> {
  location: GeoPoint;
  createdAt: Timestamp;
}
export interface PostDocument extends Omit<CommunityPost, 'id' | 'author' | 'createdAt'> {
  authorId: UUID;
  createdAt: Timestamp;
}
export type AuthorDocument = Omit<Author, 'id'>;
export interface DatasetDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  footprint: Omit<Footprint, 'updatedAt'> & { updatedAt: Timestamp };
  metrics: ImpactMetric[];
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid schema v2 document: ${message}`);
}
function object(value: unknown): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected object');
  return value as Record<string, unknown>;
}
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value: unknown) => nonnegative(value) && Number.isSafeInteger(value);
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const enumCode = (value: unknown, codes: object) => typeof value === 'number' && Object.values(codes).includes(value);

// Validate on both writes and reads: a TS cast alone cannot validate Firestore.
export function validateDocument(path: string, value: unknown): void {
  const data = object(value);
  if (path === '') {
    ensure(data.schemaVersion === SCHEMA_VERSION, 'schemaVersion');
    const footprint = object(data.footprint);
    ensure(nonnegative(footprint.annualEmissionsTonnes), 'annualEmissionsTonnes');
    ensure(footprint.updatedAt instanceof Timestamp, 'footprint.updatedAt');
    ensure(Array.isArray(data.metrics), 'metrics');
    const seen = new Set();
    for (const entry of data.metrics) {
      const metric = object(entry);
      ensure(enumCode(metric.type, MetricType) && !seen.has(metric.type), 'metric type');
      ensure(nonnegative(metric.value), 'metric value');
      if (metric.type === MetricType.TreesSupported) ensure(count(metric.value), 'tree count');
      seen.add(metric.type);
    }
    return;
  }
  const [collection, id, extra] = path.split('/');
  ensure(uuid(id) && !extra, 'document UUID');
  if (collection === 'authors') {
    ensure(text(data.displayName), 'displayName');
  } else if (collection === 'projects') {
    ensure(text(data.name), 'project name');
    ensure(enumCode(data.biome, Biome), 'biome code');
    ensure(enumCode(data.status, ProjectStatus), 'status code');
    ensure(data.location instanceof GeoPoint, 'location must be a GeoPoint');
    ensure(nonnegative(data.areaHectares), 'areaHectares');
    ensure(nonnegative(data.restorationProgress) && data.restorationProgress <= 1, 'restorationProgress ratio');
    ensure(data.createdAt instanceof Timestamp, 'project createdAt');
  } else if (collection === 'posts') {
    ensure(uuid(data.authorId), 'authorId');
    ensure(text(data.body), 'post body');
    ensure(data.createdAt instanceof Timestamp, 'post createdAt');
    ensure(count(data.commentCount), 'commentCount');
    ensure(Array.isArray(data.reactions), 'reactions');
    const seen = new Set();
    for (const entry of data.reactions) {
      const reaction = object(entry);
      ensure(enumCode(reaction.type, ReactionType) && !seen.has(reaction.type), 'reaction type');
      ensure(count(reaction.count), 'reaction count');
      seen.add(reaction.type);
    }
  } else {
    throw new Error('Unknown schema v2 collection.');
  }
}

export function projectToJSON(id: string, project: ProjectDocument): Project {
  validateDocument(`projects/${id}`, project);
  return {
    id: id as UUID, name: project.name, biome: project.biome, status: project.status,
    areaHectares: project.areaHectares, restorationProgress: project.restorationProgress,
    location: { latitude: project.location.latitude, longitude: project.location.longitude },
  };
}

export function postToJSON(id: string, post: PostDocument, author: Author): CommunityPost {
  validateDocument(`posts/${id}`, post);
  validateDocument(`authors/${author.id}`, author);
  ensure(post.authorId === author.id, 'post author reference');
  return {
    id: id as UUID, author, createdAt: post.createdAt.toMillis(),
    body: post.body, reactions: post.reactions, commentCount: post.commentCount,
  };
}

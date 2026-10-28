// Firestore document shapes and their validation. Validate on both writes and reads:
// a TypeScript cast alone cannot validate what is stored in Firestore.
import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { Biome, MetricType, ProjectStatus, ReactionType } from '../types/app.ts';
import type { Author, CommunityPost, Footprint, ImpactMetric, Project, UUID } from '../types/app';
import { isSlug, isUuid } from './ids.ts';

export interface ProjectDocument extends Omit<Project, 'id' | 'location'> {
  location: GeoPoint;
  createdAt: Timestamp;
}
export interface PostDocument extends Omit<CommunityPost, 'id' | 'author' | 'createdAt'> {
  authorId: UUID;
  createdAt: Timestamp;
}
export type AuthorDocument = Omit<Author, 'id'>;

type Fields = Record<string, unknown>;

export const isRecord = (value: unknown): value is Fields =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Accepts only the numeric members of a numeric enum. `Object.values` of a numeric TS enum
 * also lists its member names, so a plain `includes` would accept "CarbonOffset".
 */
export function isEnumValue<E extends object>(
  value: unknown,
  enumObject: E,
): value is Extract<E[keyof E], number> {
  return typeof value === 'number' && Object.values(enumObject).includes(value);
}

const isNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isCount = (value: unknown): value is number =>
  isNonNegative(value) && Number.isSafeInteger(value);
const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
/** HTTPS URLs or same-origin absolute paths; rejects javascript:, data: and "//host". */
const isSafeUrl = (value: unknown) =>
  typeof value === 'string' && (/^https:\/\/[^\s]+$/.test(value) || /^\/(?!\/)[^\s]*$/.test(value));

function ensure(condition: unknown, path: string, field: string): asserts condition {
  if (!condition) throw new Error(`Invalid document ${path}: ${field}`);
}

function fields(value: unknown, path: string, field: string): Fields {
  ensure(isRecord(value), path, field);
  return value;
}

function ensureList(
  value: unknown,
  path: string,
  field: string,
  isValidItem: (item: Fields) => boolean,
) {
  ensure(Array.isArray(value), path, field);
  for (const item of value) ensure(isValidItem(fields(item, path, field)), path, field);
}

function validateAuthor(data: Fields, path: string) {
  ensure(isText(data.displayName), path, 'displayName');
}

function validateProject(data: Fields, path: string) {
  ensure(isText(data.name), path, 'name');
  ensure(isSlug(data.slug), path, 'slug');
  ensure(typeof data.published === 'boolean', path, 'published');
  ensure(isEnumValue(data.biome, Biome), path, 'biome');
  ensure(isEnumValue(data.status, ProjectStatus), path, 'status');
  ensure(data.location instanceof GeoPoint, path, 'location must be a GeoPoint');
  ensure(data.createdAt instanceof Timestamp, path, 'createdAt');
  ensure(isNonNegative(data.areaHectares), path, 'areaHectares');
  ensure(
    isNonNegative(data.restorationProgress) && data.restorationProgress <= 1,
    path,
    'restorationProgress must be a 0-1 ratio',
  );
  ensure(
    isCount(data.pricePerTonneCents) && data.pricePerTonneCents > 0,
    path,
    'pricePerTonneCents',
  );
  for (const key of ['summary', 'description', 'municipality', 'state', 'methodology']) {
    ensure(isText(data[key]), path, key);
  }
  for (const key of ['treesPlanted', 'carbonTonnes', 'participants']) {
    ensure(isNonNegative(data[key]), path, key);
  }
  ensureList(data.gallery, path, 'gallery', (item) => isSafeUrl(item.url) && isText(item.alt));
  ensureList(
    data.species,
    path,
    'species',
    (item) => isText(item.name) && isText(item.scientificName),
  );
  ensureList(
    data.impacts,
    path,
    'impacts',
    (item) => isText(item.title) && isText(item.description),
  );
  ensureList(
    data.timeline,
    path,
    'timeline',
    (item) => isText(item.label) && isText(item.description),
  );
  ensureList(
    data.documents,
    path,
    'documents',
    (item) => isText(item.title) && isSafeUrl(item.url),
  );
}

function validatePost(data: Fields, path: string) {
  ensure(isUuid(data.authorId), path, 'authorId');
  ensure(isText(data.body), path, 'body');
  ensure(data.createdAt instanceof Timestamp, path, 'createdAt');
  ensure(isCount(data.commentCount), path, 'commentCount');
  ensure(Array.isArray(data.reactions), path, 'reactions');
  const seen = new Set<number>();
  for (const entry of data.reactions) {
    const reaction = fields(entry, path, 'reactions');
    ensure(
      isEnumValue(reaction.type, ReactionType) && !seen.has(reaction.type),
      path,
      'reaction type must be known and unique',
    );
    ensure(isCount(reaction.count), path, 'reaction count');
    seen.add(reaction.type);
  }
}

const validators: Record<string, (data: Fields, path: string) => void> = {
  authors: validateAuthor,
  projects: validateProject,
  posts: validatePost,
};

/** Throws a descriptive error unless `value` is a valid document for the root-collection `path`. */
export function validateDocument(path: string, value: unknown): void {
  const [collection, id, ...rest] = path.split('/');
  const validate = Object.hasOwn(validators, collection) ? validators[collection] : undefined;
  if (!validate) throw new Error(`Unknown collection: ${collection}`);
  ensure(isUuid(id) && rest.length === 0, path, 'document ID must be a UUID');
  validate(fields(value, path, 'expected an object'), path);
}

export function projectToJSON(id: string, data: unknown): Project {
  validateDocument(`projects/${id}`, data);
  const project = data as ProjectDocument;
  return {
    id: id as UUID,
    name: project.name,
    biome: project.biome,
    status: project.status,
    areaHectares: project.areaHectares,
    restorationProgress: project.restorationProgress,
    location: { latitude: project.location.latitude, longitude: project.location.longitude },
    slug: project.slug,
    published: project.published,
    summary: project.summary,
    description: project.description,
    municipality: project.municipality,
    state: project.state,
    gallery: project.gallery,
    treesPlanted: project.treesPlanted,
    carbonTonnes: project.carbonTonnes,
    participants: project.participants,
    species: project.species,
    impacts: project.impacts,
    timeline: project.timeline,
    methodology: project.methodology,
    documents: project.documents,
    pricePerTonneCents: project.pricePerTonneCents,
  };
}

export function postToJSON(id: string, data: unknown, author: Author): CommunityPost {
  validateDocument(`posts/${id}`, data);
  validateDocument(`authors/${author.id}`, author);
  const post = data as PostDocument;
  ensure(post.authorId === author.id, `posts/${id}`, 'authorId must match the author');
  return {
    id: id as UUID,
    author,
    createdAt: post.createdAt.toMillis(),
    body: post.body,
    reactions: post.reactions,
    commentCount: post.commentCount,
  };
}

/** `users/{uid}.footprint`, or null when it is absent or malformed. */
export function footprintToJSON(value: unknown): Footprint | null {
  if (!isRecord(value)) return null;
  const { annualEmissionsTonnes, updatedAt } = value;
  return isNonNegative(annualEmissionsTonnes) && updatedAt instanceof Timestamp
    ? { annualEmissionsTonnes, updatedAt: updatedAt.toMillis() }
    : null;
}

/** `users/{uid}.impactMetrics`, keeping only known types with finite, non-negative values. */
export function metricsToJSON(value: unknown): ImpactMetric[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((metric) =>
    isRecord(metric) && isEnumValue(metric.type, MetricType) && isNonNegative(metric.value)
      ? [{ type: metric.type, value: metric.value }]
      : [],
  );
}

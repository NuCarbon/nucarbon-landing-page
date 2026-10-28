import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { Biome, ProjectStatus, ReactionType } from '../../src/types/app.ts';
import type { Author, CommunityPost, Project, UUID } from '../../src/types/app';

export interface ProjectDocument extends Omit<Project, 'id' | 'location'> {
  location: GeoPoint;
  createdAt: Timestamp;
}
export interface PostDocument extends Omit<CommunityPost, 'id' | 'author' | 'createdAt'> {
  authorId: UUID;
  createdAt: Timestamp;
}
export type AuthorDocument = Omit<Author, 'id'>;
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.log(message);
    throw new Error(`Invalid document: ${message}`);
  }
}

function object(value: unknown): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected object');
  return value as Record<string, unknown>;
}

const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value: unknown) => nonnegative(value) && Number.isSafeInteger(value);
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const uuid = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const enumCode = (value: unknown, codes: object) =>
  typeof value === 'number' && Object.values(codes).includes(value);
const safeUrl = (value: unknown) =>
  typeof value === 'string' && (/^https:\/\/[^\s]+$/.test(value) || /^\/(?!\/)[^\s]*$/.test(value));

// Validate on both writes and reads: a TS cast alone cannot validate Firestore.
export function validateDocument(path: string, value: unknown): void {
  const data = object(value);
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
    ensure(
      nonnegative(data.restorationProgress) && data.restorationProgress <= 1,
      'restorationProgress ratio',
    );
    ensure(data.createdAt instanceof Timestamp, 'project createdAt');
    ensure(typeof data.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug), 'slug');
    ensure(typeof data.published === 'boolean', 'published');
    ensure(
      typeof data.pricePerTonneCents === 'number' &&
        count(data.pricePerTonneCents) &&
        data.pricePerTonneCents > 0,
      'pricePerTonneCents',
    );
    for (const key of ['summary', 'description', 'municipality', 'state', 'methodology'])
      ensure(text(data[key]), key);
    for (const key of ['treesPlanted', 'carbonTonnes', 'participants'])
      ensure(nonnegative(data[key]), key);
    for (const key of ['gallery', 'species', 'impacts', 'timeline', 'documents'])
      ensure(Array.isArray(data[key]), key);
    for (const image of (data.gallery ?? []) as unknown[]) {
      const item = object(image);
      ensure(safeUrl(item.url) && text(item.alt), 'gallery image');
    }
    for (const species of (data.species ?? []) as unknown[]) {
      const item = object(species);
      ensure(text(item.name) && text(item.scientificName), 'species');
    }
    for (const impact of (data.impacts ?? []) as unknown[]) {
      const item = object(impact);
      ensure(text(item.title) && text(item.description), 'impact');
    }
    for (const event of (data.timeline ?? []) as unknown[]) {
      const item = object(event);
      ensure(text(item.label) && text(item.description), 'timeline');
    }
    for (const document of (data.documents ?? []) as unknown[]) {
      const item = object(document);
      ensure(text(item.title) && safeUrl(item.url), 'document');
    }
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
    throw new Error('Unknown collection.');
  }
}

export function projectToJSON(id: string, project: ProjectDocument): Project {
  validateDocument(`projects/${id}`, project);
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

export function postToJSON(id: string, post: PostDocument, author: Author): CommunityPost {
  validateDocument(`posts/${id}`, post);
  validateDocument(`authors/${author.id}`, author);
  ensure(post.authorId === author.id, 'post author reference');
  return {
    id: id as UUID,
    author,
    createdAt: post.createdAt.toMillis(),
    body: post.body,
    reactions: post.reactions,
    commentCount: post.commentCount,
  };
}

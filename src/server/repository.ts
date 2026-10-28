// Firestore reads and writes. Every document is validated before it reaches a response.
import { db } from './firebase.ts';
import { isSlug, isUuid } from './ids.ts';
import {
  footprintToJSON,
  metricsToJSON,
  postToJSON,
  projectToJSON,
  type AuthorDocument,
} from './schema.ts';
import type { Author, CommunityPost, Footprint, ImpactMetric, Project } from '../types/app';
import type { UserCalculation } from './calculator.ts';

const COMMUNITY_FEED_SIZE = 50;

/** Lists skip a malformed document instead of failing the whole response. */
function validOrSkipped<T>(path: string, read: () => T): T[] {
  try {
    return [read()];
  } catch (error) {
    console.error(`Skipping ${path}`, error);
    return [];
  }
}

const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'pt-BR');

export async function readProjects(limit = 50): Promise<Project[]> {
  const snapshot = await db()
    .collection('projects')
    .where('published', '==', true)
    .limit(limit)
    .get();
  return snapshot.docs
    .flatMap((doc) => validOrSkipped(doc.ref.path, () => projectToJSON(doc.id, doc.data())))
    .sort(byName);
}

/** Published projects among `ids`, in the given order; unknown or unpublished IDs are dropped. */
export async function readProjectsByIds(ids: readonly string[]): Promise<Project[]> {
  const validIds = [...new Set(ids)].filter(isUuid);
  if (!validIds.length) return [];
  const database = db();
  const snapshots = await database.getAll(
    ...validIds.map((id) => database.collection('projects').doc(id)),
  );
  return snapshots
    .filter((doc) => doc.exists && doc.data()?.published === true)
    .flatMap((doc) => validOrSkipped(doc.ref.path, () => projectToJSON(doc.id, doc.data())));
}

export async function readProjectBySlug(slug: string): Promise<Project | null> {
  if (!isSlug(slug)) return null;
  const snapshot = await db().collection('projects').where('slug', '==', slug).limit(2).get();
  if (snapshot.size > 1) throw new Error(`Duplicate project slug: ${slug}`);
  const doc = snapshot.docs[0];
  return doc?.data().published === true ? projectToJSON(doc.id, doc.data()) : null;
}

export async function readCommunityPosts(): Promise<CommunityPost[]> {
  const database = db();
  const snapshot = await database
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(COMMUNITY_FEED_SIZE)
    .get();
  if (snapshot.empty) return [];

  const authorIds = [...new Set(snapshot.docs.map((doc) => doc.data().authorId))].filter(isUuid);
  const authorDocs = authorIds.length
    ? await database.getAll(...authorIds.map((id) => database.collection('authors').doc(id)))
    : [];
  const authors = new Map<string, Author>();
  for (const doc of authorDocs) {
    if (!doc.exists) continue;
    const data = doc.data() as AuthorDocument;
    authors.set(doc.id, { id: doc.id as Author['id'], displayName: data.displayName });
  }

  return snapshot.docs.flatMap((doc) =>
    validOrSkipped(doc.ref.path, () => {
      const author = authors.get(doc.data().authorId);
      if (!author) throw new Error('Missing author');
      return postToJSON(doc.id, doc.data(), author);
    }),
  );
}

export interface UserRecord {
  uid: string;
  footprint: Footprint | null;
  metrics: ImpactMetric[];
  /** Stored answer codes; decode them with decodeAnswers, which validates them. */
  calculatorAnswers: unknown;
}

/** The parts of `users/{uid}` the API exposes. Malformed fields read as absent. */
export async function readUser(uid: string): Promise<UserRecord> {
  const data = (await db().collection('users').doc(uid).get()).data();
  return {
    uid,
    footprint: footprintToJSON(data?.footprint),
    metrics: metricsToJSON(data?.impactMetrics),
    calculatorAnswers: data?.calculator?.answers,
  };
}

/**
 * A single atomic merge preserves unrelated profile data and updates the latest calculation and
 * the dashboard footprint together. Retrying overwrites the same fields and adds no history.
 */
export async function saveUserCalculation(uid: string, calculation: UserCalculation) {
  await db().collection('users').doc(uid).set(calculation, { merge: true });
}

/** Projects the user actively supports (`users/{uid}/supportedProjects/{projectId}`). */
export async function readSupportedProjectIds(uid: string, limit = 20): Promise<string[]> {
  const snapshot = await db()
    .collection('users')
    .doc(uid)
    .collection('supportedProjects')
    .where('status', '==', 'active')
    .limit(limit)
    .get();
  return snapshot.docs.filter((doc) => doc.data().projectId === doc.id).map((doc) => doc.id);
}

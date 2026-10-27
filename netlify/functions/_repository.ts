import { db } from './_firebase';
import { postToJSON, projectToJSON, type AuthorDocument, type PostDocument, type ProjectDocument } from './_schema';
import type { UUID } from '../../src/types/app';

export async function readProjects(limit = 50) {
  const snapshot = await db().collection('projects').where('published', '==', true).limit(limit).get();
  return snapshot.docs
    .map((doc) => projectToJSON(doc.id, doc.data() as ProjectDocument))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function readProjectBySlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const snapshot = await db().collection('projects').where('slug', '==', slug).limit(2).get();
  if (snapshot.size > 1) throw new Error('Duplicate project slug');
  const doc = snapshot.docs[0];
  return doc?.data().published === true ? projectToJSON(doc.id, doc.data() as ProjectDocument) : null;
}

export async function readCommunityPosts() {
  const database = db();
  const snapshot = await database.collection('posts').orderBy('createdAt', 'desc').limit(50).get();
  if (snapshot.empty) return [];
  const authorIds = [...new Set(snapshot.docs.map((doc) => (doc.data() as PostDocument).authorId))];
  const authors = await database.getAll(...authorIds.map((id) => database.doc(`authors/${id}`)));
  const byId = new Map(authors.filter((doc) => doc.exists).map((doc) => [doc.id, {
    id: doc.id as UUID, displayName: (doc.data() as AuthorDocument).displayName,
  }]));
  return snapshot.docs.map((doc) => {
    const post = doc.data() as PostDocument;
    const author = byId.get(post.authorId);
    if (!author) throw new Error('Community post references a missing author.');
    return postToJSON(doc.id, post, author);
  });
}

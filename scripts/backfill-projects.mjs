import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DATASET_PATH } from '../netlify/functions/_schema.ts';
import { missingProjectFields } from '../netlify/functions/_project-content.ts';

const dryRun = process.argv.includes('--dry-run');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!projectId || !clientEmail || !privateKey) throw new Error('Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.');
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const database = getFirestore(app);
const docs = await database.collection(`${DATASET_PATH}/projects`).get();
const usedSlugs = new Set();
for (const doc of docs.docs) {
  const data = doc.data();
  const slug = data.slug ?? missingProjectFields(doc.id, data.name).slug;
  if (usedSlugs.has(slug)) throw new Error(`Slug duplicado: ${slug}`);
  usedSlugs.add(slug);
}
for (const doc of docs.docs) {
  const data = doc.data();
  const defaults = missingProjectFields(doc.id, data.name);
  const missing = Object.fromEntries(Object.entries(defaults).filter(([key]) => data[key] === undefined));
  if (!Object.keys(missing).length) continue;
  console.log(`${dryRun ? 'DRY RUN ' : ''}${doc.id}: ${Object.keys(missing).join(', ')}`);
  if (!dryRun) await doc.ref.update(missing);
}
console.log(`${docs.size} projetos examinados. ${dryRun ? 'Nenhuma alteração feita.' : 'Campos ausentes preenchidos.'}`);

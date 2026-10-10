import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createDemoDocuments } from './demo-data.mjs';
import { DATASET_PATH, validateDocument } from '../netlify/functions/_schema.ts';

const documents = createDemoDocuments();
for (const [path, data] of documents) validateDocument(path, data);

if (process.argv.includes('--dry-run')) {
  console.log('Validated schema v2. Documents that would be created:');
  for (const [path] of documents) console.log(path ? DATASET_PATH + '/' + path : DATASET_PATH);
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY antes de executar o seed.');
  }
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const database = getFirestore(app);
  // Create missing documents atomically; never overwrite existing user edits.
  const created = await database.runTransaction(async (transaction) => {
    const refs = documents.map(([path]) => database.doc(path ? DATASET_PATH + '/' + path : DATASET_PATH));
    const snapshots = await transaction.getAll(...refs);
    let count = 0;
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        transaction.create(refs[index], documents[index][1]);
        count++;
      }
    });
    return count;
  });
  console.log(created + ' documentos demonstrativos criados em ' + DATASET_PATH + '. Documentos existentes preservados.');
}

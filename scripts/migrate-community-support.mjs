import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { validateDocument } from '../netlify/functions/_schema.ts';

const apply = process.argv.includes('--apply');
if (process.argv.some((arg) => arg.startsWith('--') && arg !== '--apply')) {
  throw new Error('Usage: node --experimental-transform-types scripts/migrate-community-support.mjs [--apply]');
}
if (process.env.FIREBASE_PROJECT_ID !== 'nucarbon-page') throw new Error('Unexpected Firebase project.');

const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}) });
const db = getFirestore(app);
const uid = 'ZEvbshzp6XbAm3GKPh0ki6HaqUE2';
const projectId = 'a834e161-c18c-48f6-bc36-091a7c359231';
const oldRef = db.doc(`users/${uid}/sampleSupportedProjects/${projectId}`);
const supportRef = db.doc(`users/${uid}/supportedProjects/${projectId}`);

const changes = [
  ['authors/f279c946-504b-49bc-9e20-cf29c1c0c728', 'displayName', 'Nucarbon Oficial (exemplo)', 'Nucarbon Oficial'],
  ['authors/0249b8b1-90ce-49d8-83c2-51a1a1d387d5', 'displayName', 'Carlos M. (exemplo)', 'Carlos M.'],
  ['posts/60e5ca51-7f92-46df-a36c-5c7438bd58e7', 'body',
    'Publicação fictícia: Alcançamos a marca histórica de 340 hectares em restauração ativa! Iniciamos hoje o plantio de mais 1.200 mudas nativas na bacia do Rio Paranapanema.',
    'Alcançamos a marca histórica de 340 hectares em restauração ativa! Iniciamos hoje o plantio de mais 1.200 mudas nativas na bacia do Rio Paranapanema.'],
  ['posts/37a7a8bc-c222-45eb-bcb3-65f2cd38b280', 'body',
    'Publicação fictícia: Visitar o projeto Guardiões do Cerrado foi uma oportunidade incrível. O trabalho das comunidades tradicionais cuidando das nascentes é inspirador.',
    'Visitar o projeto Guardiões do Cerrado foi uma oportunidade incrível. O trabalho das comunidades tradicionais cuidando das nascentes é inspirador.'],
];
const refs = changes.map(([path]) => db.doc(path));

function plan(snapshots) {
  const actions = [];
  for (let index = 0; index < changes.length; index++) {
    const snapshot = snapshots[index];
    const [path, field, oldValue, newValue] = changes[index];
    if (!snapshot.exists) throw new Error(`Missing ${path}`);
    const data = snapshot.data();
    if (data[field] !== oldValue && data[field] !== newValue) throw new Error(`Unexpected content at ${path}`);
    validateDocument(path, { ...data, [field]: newValue });
    if (data[field] !== newValue) actions.push({ action: 'update', path, field });
  }
  const old = snapshots.at(-2);
  const current = snapshots.at(-1);
  if (old.exists && (old.data()?.kind !== 'sample' || old.data()?.projectId !== projectId)) {
    throw new Error('Unexpected old support record.');
  }
  if (current.exists && (current.data()?.status !== 'active' || current.data()?.projectId !== projectId)) {
    throw new Error('Unexpected current support record.');
  }
  if (!current.exists) actions.push({ action: 'create', path: supportRef.path });
  if (old.exists) actions.push({ action: 'delete', path: oldRef.path });
  return actions;
}

const allRefs = [...refs, oldRef, supportRef];
let actions;
if (apply) {
  actions = await db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...allRefs);
    const planned = plan(snapshots);
    for (let index = 0; index < changes.length; index++) {
      const [, field, , newValue] = changes[index];
      if (snapshots[index].data()[field] !== newValue) transaction.update(refs[index], { [field]: newValue });
    }
    if (!snapshots.at(-1).exists) transaction.create(supportRef, {
      projectId, status: 'active', createdAt: snapshots.at(-2).data()?.createdAt ?? Timestamp.now(),
    });
    if (snapshots.at(-2).exists) transaction.delete(oldRef);
    return planned;
  });
} else {
  actions = plan(await db.getAll(...allRefs));
}
console.log(JSON.stringify({ project: process.env.FIREBASE_PROJECT_ID, applied: apply, actions }, null, 2));

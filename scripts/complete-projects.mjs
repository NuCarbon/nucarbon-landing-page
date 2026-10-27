import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { validateDocument } from '../netlify/functions/_schema.ts';

const apply = process.argv.includes('--apply');
if (process.argv.some((arg) => arg.startsWith('--') && arg !== '--apply')) {
  throw new Error('Usage: node --experimental-transform-types scripts/complete-projects.mjs [--apply]');
}
if (process.env.FIREBASE_PROJECT_ID !== 'nucarbon-page') {
  throw new Error('Unexpected Firebase project.');
}

const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}) });
const db = getFirestore(app);

// Existing IDs, measured values, publication flags and prices are never changed here.
const content = {
  'a834e161-c18c-48f6-bc36-091a7c359231': {
    summary: 'Projeto ilustrativo de restauração da Mata Atlântica para conhecer a plataforma Nucarbon.',
    description: 'Esta página apresenta um projeto ilustrativo de corredores da Mata Atlântica. Os dados de área e progresso são os valores já cadastrados. Imagens e localização servem à demonstração; resultados de carbono, plantio e participação ainda não foram informados.',
    municipality: 'Município não informado', state: 'SP',
    gallery: [
      { url: '/projects/forest-hero-2.jpg', alt: 'Imagem ilustrativa de floresta, sem vínculo com a área do projeto' },
      { url: '/projects/forest-portrait.jpg', alt: 'Imagem ilustrativa de vegetação, sem vínculo com a área do projeto' },
    ],
  },
  'a872b723-e559-480d-8684-adc8d0d0697f': {
    summary: 'Projeto ilustrativo de reflorestamento no Vale do Paraíba para conhecer a plataforma Nucarbon.',
    description: 'Esta página apresenta um projeto ilustrativo de reflorestamento biodiverso no Vale do Paraíba. Os dados de área e progresso são os valores já cadastrados. Imagens e localização servem à demonstração; resultados de carbono, plantio e participação ainda não foram informados.',
    municipality: 'Município não informado', state: 'RJ',
    gallery: [
      { url: '/projects/forest-hero-4.jpg', alt: 'Imagem ilustrativa de floresta, sem vínculo com a área do projeto' },
      { url: '/projects/forest-portrait-2.jpg', alt: 'Imagem ilustrativa de vegetação, sem vínculo com a área do projeto' },
    ],
  },
  'cf4c1d20-559c-41a0-b080-f07d3eccfa36': {
    summary: 'Projeto ilustrativo de proteção de nascentes no Cerrado para conhecer a plataforma Nucarbon.',
    description: 'Esta página apresenta um projeto ilustrativo de conservação do Cerrado e de nascentes. Os dados de área e progresso são os valores já cadastrados. Imagens e localização servem à demonstração; resultados de carbono, plantio e participação ainda não foram informados.',
    municipality: 'Município não informado', state: 'GO',
    gallery: [
      { url: '/projects/forest-hero-2.jpg', alt: 'Imagem ilustrativa de vegetação, sem vínculo com a área do projeto' },
      { url: '/projects/forest-portrait-2.jpg', alt: 'Imagem ilustrativa de paisagem natural, sem vínculo com a área do projeto' },
    ],
  },
};

const shared = {
  treesPlanted: 0,
  carbonTonnes: 0,
  participants: 0,
  species: [],
  impacts: [],
  timeline: [],
  methodology: 'Projeto ilustrativo. A metodologia de execução e monitoramento ainda não foi cadastrada. Nenhuma certificação é declarada nesta página.',
  documents: [],
};

const refs = Object.keys(content).map((id) => db.doc(`projects/${id}`));
const plan = (snapshot) => {
  if (!snapshot.exists) throw new Error(`Missing project ${snapshot.id}`);
  const current = snapshot.data();
  const defaults = { ...shared, ...content[snapshot.id] };
  const patch = Object.fromEntries(Object.entries(defaults).filter(([key]) => current[key] === undefined || current[key] === null));
  validateDocument(snapshot.ref.path, { ...current, ...patch });
  return { id: snapshot.id, name: current.name, fields: Object.keys(patch), patch };
};

if (apply) {
  const results = await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const changes = snapshots.map(plan);
    for (const change of changes) {
      if (change.fields.length) transaction.update(db.doc(`projects/${change.id}`), change.patch);
    }
    return changes;
  });
  console.log(JSON.stringify({ project: process.env.FIREBASE_PROJECT_ID, applied: true, projects: results.map(({ id, name, fields }) => ({ id, name, fields })) }, null, 2));
} else {
  const snapshots = await db.getAll(...refs);
  const results = snapshots.map(plan);
  console.log(JSON.stringify({ project: process.env.FIREBASE_PROJECT_ID, applied: false, projects: results.map(({ id, name, fields }) => ({ id, name, fields })) }, null, 2));
}

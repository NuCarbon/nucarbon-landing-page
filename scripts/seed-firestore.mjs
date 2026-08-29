import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!projectId || !clientEmail || !privateKey) throw new Error('Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY antes de executar o seed.');
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);
await db.doc('demo/dashboard').set({ footprint: { value: '4,8 tCO₂e / ano', updatedLabel: 'Atualizado há 3 meses' }, metrics: [{ label: 'Árvores apoiadas', value: '32 mudas nativas', icon: '♣' }, { label: 'CO₂e compensado', value: '1,2 tCO₂e', icon: '◌' }] });
await db.doc('demo/projects').set({ items: [
  { id: 'mata', biome: 'Mata Atlântica', location: 'Teodoro Sampaio / SP', name: 'Restauração Corredores da Mata Atlântica', hectares: 120, progress: 65, status: 'Monitoramento' },
  { id: 'cerrado', biome: 'Cerrado', location: 'Alto Paraíso / GO', name: 'Guardiões do Cerrado e Nascentes', hectares: 85, progress: 40, status: 'Plantio' },
  { id: 'paraiba', biome: 'Mata Atlântica', location: 'Resende / RJ', name: 'Reflorestamento Biodiverso Vale do Paraíba', hectares: 135, progress: 85, status: 'Monitoramento' },
] });
await db.doc('demo/community').set({ posts: [
  { id: 'plantio', author: 'Nucarbon Oficial', timestamp: 'Há 2 horas', body: 'Alcançamos a marca histórica de 340 hectares em restauração ativa! Iniciamos hoje o plantio de mais 1.200 mudas nativas na bacia do Rio Paranapanema.', reactions: '❤️ 142   🌱 89', comments: 2 },
  { id: 'visita', author: 'Carlos M.', timestamp: 'Há 5 horas', body: 'Visitar o projeto Guardiões do Cerrado foi uma oportunidade incrível. O trabalho das comunidades tradicionais cuidando das nascentes é inspirador.', reactions: '👏 32   ❤️ 24', comments: 5 },
] });
console.log('Dados demonstrativos criados em Firestore.');

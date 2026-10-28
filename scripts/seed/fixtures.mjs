// Initial content for a fresh database: the three launch projects and the community demo
// feed. Pure data (no I/O), so tests can validate it offline.
//
// IDs are fixed so that seeding is idempotent. New production records should receive
// crypto.randomUUID() at creation. Dates and coordinates are illustrative, not survey data.
import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { Biome, ProjectStatus, ReactionType } from '../../src/types/app.ts';

export const ids = {
  mataAtlantica: 'a834e161-c18c-48f6-bc36-091a7c359231',
  cerrado: 'cf4c1d20-559c-41a0-b080-f07d3eccfa36',
  valeDoParaiba: 'a872b723-e559-480d-8684-adc8d0d0697f',
  officialAuthor: 'f279c946-504b-49bc-9e20-cf29c1c0c728',
  carlosAuthor: '0249b8b1-90ce-49d8-83c2-51a1a1d387d5',
  plantingPost: '60e5ca51-7f92-46df-a36c-5c7438bd58e7',
  visitPost: '37a7a8bc-c222-45eb-bcb3-65f2cd38b280',
};

const at = (isoDate) => Timestamp.fromDate(new Date(isoDate));

// Fields every launch project starts with until its owner publishes measured results.
const unmeasured = {
  published: true,
  pricePerTonneCents: 7500,
  treesPlanted: 0,
  carbonTonnes: 0,
  participants: 0,
  species: [],
  impacts: [],
  timeline: [],
  documents: [],
  methodology:
    'Projeto ilustrativo. A metodologia de execução e monitoramento ainda não foi cadastrada. Nenhuma certificação é declarada nesta página.',
};

const projects = [
  {
    id: ids.mataAtlantica,
    data: {
      ...unmeasured,
      name: 'Restauração Corredores da Mata Atlântica',
      slug: 'corredores-mata-atlantica',
      biome: Biome.AtlanticForest,
      status: ProjectStatus.Monitoring,
      location: new GeoPoint(-22.53, -52.17),
      areaHectares: 120,
      restorationProgress: 0.65,
      createdAt: at('2026-01-01T12:00:00Z'),
      summary:
        'Projeto ilustrativo de restauração da Mata Atlântica para conhecer a plataforma Nucarbon.',
      description:
        'Esta página apresenta um projeto ilustrativo de corredores da Mata Atlântica. Os dados de área e progresso são os valores já cadastrados. Imagens e localização servem à demonstração; resultados de carbono, plantio e participação ainda não foram informados.',
      municipality: 'Município não informado',
      state: 'SP',
      gallery: [
        {
          url: '/projects/forest-hero-2.jpg',
          alt: 'Imagem ilustrativa de floresta, sem vínculo com a área do projeto',
        },
        {
          url: '/projects/forest-portrait.jpg',
          alt: 'Imagem ilustrativa de vegetação, sem vínculo com a área do projeto',
        },
      ],
    },
  },
  {
    id: ids.cerrado,
    data: {
      ...unmeasured,
      name: 'Guardiões do Cerrado e Nascentes',
      slug: 'guardioes-cerrado-nascentes',
      biome: Biome.Cerrado,
      status: ProjectStatus.Planting,
      location: new GeoPoint(-14.13, -47.51),
      areaHectares: 85,
      restorationProgress: 0.4,
      createdAt: at('2026-01-02T12:00:00Z'),
      summary:
        'Projeto ilustrativo de proteção de nascentes no Cerrado para conhecer a plataforma Nucarbon.',
      description:
        'Esta página apresenta um projeto ilustrativo de conservação do Cerrado e de nascentes. Os dados de área e progresso são os valores já cadastrados. Imagens e localização servem à demonstração; resultados de carbono, plantio e participação ainda não foram informados.',
      municipality: 'Município não informado',
      state: 'GO',
      gallery: [
        {
          url: '/projects/forest-hero-2.jpg',
          alt: 'Imagem ilustrativa de vegetação, sem vínculo com a área do projeto',
        },
        {
          url: '/projects/forest-portrait-2.jpg',
          alt: 'Imagem ilustrativa de paisagem natural, sem vínculo com a área do projeto',
        },
      ],
    },
  },
  {
    id: ids.valeDoParaiba,
    data: {
      ...unmeasured,
      name: 'Reflorestamento Biodiverso Vale do Paraíba',
      slug: 'vale-do-paraiba',
      biome: Biome.AtlanticForest,
      status: ProjectStatus.Monitoring,
      location: new GeoPoint(-22.47, -44.45),
      areaHectares: 135,
      restorationProgress: 0.85,
      createdAt: at('2026-01-03T12:00:00Z'),
      summary:
        'Projeto ilustrativo de reflorestamento no Vale do Paraíba para conhecer a plataforma Nucarbon.',
      description:
        'Esta página apresenta um projeto ilustrativo de reflorestamento biodiverso no Vale do Paraíba. Os dados de área e progresso são os valores já cadastrados. Imagens e localização servem à demonstração; resultados de carbono, plantio e participação ainda não foram informados.',
      municipality: 'Município não informado',
      state: 'RJ',
      gallery: [
        {
          url: '/projects/forest-hero-4.jpg',
          alt: 'Imagem ilustrativa de floresta, sem vínculo com a área do projeto',
        },
        {
          url: '/projects/forest-portrait-2.jpg',
          alt: 'Imagem ilustrativa de vegetação, sem vínculo com a área do projeto',
        },
      ],
    },
  },
];

const authors = [
  { id: ids.officialAuthor, data: { displayName: 'Nucarbon Oficial' } },
  { id: ids.carlosAuthor, data: { displayName: 'Carlos M.' } },
];

const posts = [
  {
    id: ids.plantingPost,
    data: {
      authorId: ids.officialAuthor,
      createdAt: at('2026-10-07T12:00:00Z'),
      body: 'Alcançamos a marca histórica de 340 hectares em restauração ativa! Iniciamos hoje o plantio de mais 1.200 mudas nativas na bacia do Rio Paranapanema.',
      reactions: [
        { type: ReactionType.Heart, count: 142 },
        { type: ReactionType.Seedling, count: 89 },
      ],
      commentCount: 2,
    },
  },
  {
    id: ids.visitPost,
    data: {
      authorId: ids.carlosAuthor,
      createdAt: at('2026-10-07T09:00:00Z'),
      body: 'Visitar o projeto Guardiões do Cerrado foi uma oportunidade incrível. O trabalho das comunidades tradicionais cuidando das nascentes é inspirador.',
      reactions: [
        { type: ReactionType.Applause, count: 32 },
        { type: ReactionType.Heart, count: 24 },
      ],
      commentCount: 5,
    },
  },
];

/** Every seeded document, authors before the posts that reference them. */
export const fixtures = [
  ...projects.map(({ id, data }) => ({ path: `projects/${id}`, data })),
  ...authors.map(({ id, data }) => ({ path: `authors/${id}`, data })),
  ...posts.map(({ id, data }) => ({ path: `posts/${id}`, data })),
];

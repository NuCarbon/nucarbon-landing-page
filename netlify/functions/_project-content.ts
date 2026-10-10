// Demonstration copy for legacy projects. These values are illustrative until
// a project owner replaces them; the migration only fills absent fields.
export function missingProjectFields(id: string, name: string) {
  const slugs: Record<string, string> = {
    'a834e161-c18c-48f6-bc36-091a7c359231': 'corredores-mata-atlantica',
    'cf4c1d20-559c-41a0-b080-f07d3eccfa36': 'guardioes-cerrado-nascentes',
    'a872b723-e559-480d-8684-adc8d0d0697f': 'vale-do-paraiba',
  };
  const slug = slugs[id] ?? `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45)}-${id.slice(0, 8)}`;
  return {
    slug, published: Object.hasOwn(slugs, id),
    summary: 'Projeto demonstrativo de restauração ecológica no Brasil.',
    description: 'Esta página apresenta dados demonstrativos para explorar uma possível contribuição à restauração ecológica. Os indicadores exibidos são exemplos e não representam resultados auditados.',
    municipality: 'Localização aproximada', state: 'Brasil',
    gallery: [
      { url: '/projects/forest-hero-2.jpg', alt: 'Floresta tropical com vegetação nativa' },
      { url: '/projects/forest-hero-4.jpg', alt: 'Vista de floresta tropical' },
      { url: '/projects/forest-portrait.jpg', alt: 'Vegetação em área florestal' },
    ],
    treesPlanted: 0, carbonTonnes: 0, participants: 0,
    species: [], impacts: [], timeline: [],
    methodology: 'Metodologia ainda não disponibilizada para este projeto demonstrativo.',
    documents: [], pricePerTonneCents: 7500,
  };
}

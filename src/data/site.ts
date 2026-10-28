// Site-wide content used by the header, footer, contact section and page metadata.

export const site = {
  name: 'Nucarbon',
  description: 'Nucarbon - Soluções sustentáveis em créditos de carbono e projetos agroflorestais',
  tagline: 'Soluções sustentáveis em créditos de carbono e projetos agroflorestais.',
  /** Shared when a page has no image of its own. Served from public/. */
  defaultImage: {
    url: '/projects/forest-hero-2.jpg',
    alt: 'Floresta nativa coberta por neblina',
  },
} as const;

export interface NavLink {
  label: string;
  href: string;
}

export const mainNav: NavLink[] = [
  { label: 'Quem Somos', href: '/#quem-somos' },
  { label: 'Soluções', href: '/#solucoes' },
  { label: 'Projetos', href: '/projetos' },
  { label: 'Calculadora', href: '/calculadora' },
  { label: 'Créditos de Carbono', href: '/#creditos-carbono' },
  { label: 'Contato', href: '/#contato' },
];

export const footerNav: NavLink[] = [
  { label: 'Quem Somos', href: '/#quem-somos' },
  { label: 'Nossas Soluções', href: '/#solucoes' },
  { label: 'Créditos de Carbono', href: '/#creditos-carbono' },
  { label: 'Projetos', href: '/projetos' },
  { label: 'Calculadora de carbono', href: '/calculadora' },
  { label: 'Dúvidas', href: '/#faq' },
  { label: 'Contato', href: '/#contato' },
];

export const solutionNav: NavLink[] = [
  { label: 'Projetos de Carbono', href: '/solucoes/projetos-carbono' },
  { label: 'Projetos Agroflorestais', href: '/solucoes/projetos-agroflorestais' },
  { label: 'Treinamentos', href: '/solucoes/treinamentos' },
];

export const contact = {
  email: 'contato@nucarbon.com.br',
  phones: [
    { label: '+55 (19) 97159-8636', href: 'tel:+5519971598636' },
    { label: '+55 (11) 99396-0431', href: 'tel:+5511993960431' },
  ],
} as const;

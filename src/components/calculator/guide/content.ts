// Copy and data of the guide below the calculator (how it works, what a carbon
// footprint is, the methodology table and the FAQ). Plain TypeScript so tests can
// check it against the calculator's own factors and steps.
import {
  SUPPORTED_ANSWERS,
  initialAnswers,
  TransportAnswer,
} from '../../../lib/calculator/answers.ts';
import {
  CATEGORY_IDS,
  categoryDetails,
  type CategoryId,
} from '../../../lib/calculator/categories.ts';
import { coefficients } from '../../../lib/calculator/coefficients.ts';
import {
  formatDecimal,
  formatFootprint,
  formatInteger,
  formatTonnes,
} from '../../../lib/format.ts';
import type { FaqItem } from '../../../lib/structured-data.ts';
import { calculatorSteps, type CalculatorStep } from '../steps.ts';
import type { IconName } from '../icons.ts';

/** The calculator page. Matches the sitemap URL, which has a trailing slash. */
export const CALCULATOR_PATH = '/calculadora/';
export const CALCULATOR_NAME = 'Calculadora de pegada de carbono';

const stepCount = calculatorSteps.length;

export const howItWorks: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'person',
    title: `Responda ${stepCount} perguntas`,
    text: 'Conte como é sua moradia, como você se desloca, quanto de energia consome, como se alimenta e o que faz com os resíduos.',
  },
  {
    icon: 'leaf',
    title: 'Veja sua estimativa por categoria',
    text: 'A calculadora soma as emissões de cada área e mostra o total anual em toneladas de CO₂ equivalente (tCO₂e).',
  },
  {
    icon: 'info',
    title: 'Descubra como reduzir',
    text: 'Receba dicas para as categorias que mais pesam no seu resultado e acompanhe sua evolução ao refazer o cálculo.',
  },
];

export const footprintParagraphs: string[] = [
  'Pegada de carbono é a quantidade de gases de efeito estufa emitida, direta ou indiretamente, pelas atividades de uma pessoa, empresa, evento ou produto. Ela é expressa em CO₂ equivalente (CO₂e): gases como o metano e o óxido nitroso são convertidos na quantidade de dióxido de carbono que causaria o mesmo aquecimento, o que permite somar tudo em uma única unidade.',
  'No dia a dia, a maior parte da pegada pessoal vem de transporte, alimentação e consumo de energia. Uma estimativa individual não é um inventário certificado, mas mostra quais hábitos pesam mais e onde uma mudança tem mais efeito, o primeiro passo para reduzir as emissões e, quando fizer sentido, compensar o que não puder ser evitado.',
];

// Methodology

export interface MethodologyRow {
  answer: string;
  label: string;
  description?: string;
  /** The emission factor, straight from coefficients.ts. */
  factor: number;
  /** The factor with its unit, formatted for display. */
  value: string;
}

export interface MethodologyGroup {
  id: CategoryId;
  label: string;
  rows: MethodologyRow[];
}

const transportFactor = (factor: number) => `${formatDecimal(factor)} kgCO₂e / km`;

function stepFor(id: CategoryId): CalculatorStep {
  const step = calculatorSteps.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`Missing calculator step ${id}`);
  return step;
}

/** One group per category, one row per answer the calculator accepts. */
export function methodologyGroups(): MethodologyGroup[] {
  return CATEGORY_IDS.map((id) => {
    const factors: Record<string, number> = coefficients[id];
    const supported: readonly string[] = SUPPORTED_ANSWERS[id];
    const rows = stepFor(id)
      .options.filter((option) => supported.includes(option.value))
      .map((option) => {
        const factor = factors[option.value];
        return {
          answer: option.value,
          label: option.label,
          description: option.description,
          factor,
          value: id === 'transport' ? transportFactor(factor) : formatFootprint(factor),
        };
      });
    return { id, label: categoryDetails[id].label, rows };
  });
}

const exampleDistance = initialAnswers.distance;
const exampleFactor = coefficients.transport[TransportAnswer.Gas];
const exampleTonnes =
  (exampleDistance * coefficients.weeksPerYear * exampleFactor) / coefficients.kilogramsPerTonne;
const personMultiplier = coefficients.profile[SUPPORTED_ANSWERS.profile[0]];

export const methodologyFormula: string[] = [
  `Transporte: quilômetros por semana × ${formatInteger(coefficients.weeksPerYear)} semanas × fator do meio de transporte (kgCO₂e por km) ÷ ${formatInteger(coefficients.kilogramsPerTonne)}. Por exemplo, ${formatInteger(exampleDistance)} km por semana de carro a gasolina somam cerca de ${formatTonnes(exampleTonnes)} tCO₂e por ano.`,
  'Moradia, energia, alimentação e resíduos: cada resposta corresponde a um valor anual médio, em tCO₂e por ano.',
  `O total é a soma das cinco categorias. No perfil Pessoa física, o único disponível por enquanto, o multiplicador é ${formatDecimal(personMultiplier)}.`,
];

// FAQ

export const calculatorFaq: FaqItem[] = [
  {
    question: 'Como calcular minha pegada de carbono?',
    answer: `Responda às ${stepCount} perguntas da calculadora sobre perfil, moradia, transporte, energia, alimentação e resíduos. Cada resposta corresponde a um fator de emissão médio, e a soma das categorias resulta na sua estimativa anual em toneladas de CO₂ equivalente (tCO₂e). Leva cerca de 2 minutos.`,
  },
  {
    question: 'O que significa tCO₂e?',
    answer:
      'Toneladas de dióxido de carbono equivalente. É a unidade que reúne diferentes gases de efeito estufa, como metano e óxido nitroso, convertendo cada um na quantidade de CO₂ que teria o mesmo efeito de aquecimento. Uma tonelada equivale a 1.000 kg.',
  },
  {
    question: 'A calculadora é gratuita?',
    answer:
      'Sim. A calculadora é gratuita e mostra o resultado sem cadastro. Entrar com sua conta Google é opcional e serve para guardar o cálculo na sua conta Nucarbon.',
  },
  {
    question: 'Meus dados ficam salvos?',
    answer:
      'Suas respostas ficam guardadas no seu navegador por até 7 dias, para você rever o resultado quando voltar. Se você entrar na sua conta, o cálculo também é salvo nela. O resultado só é visto por outras pessoas se você decidir compartilhá-lo.',
  },
  {
    question: 'Como reduzir minha pegada de carbono?',
    answer:
      'Os maiores ganhos costumam vir de trocar parte dos trajetos de carro por transporte público, bicicleta ou caminhada, incluir mais refeições vegetais, reduzir o consumo de energia e separar os resíduos para reciclagem. Ao final do cálculo, você recebe dicas para as categorias que mais pesam no seu resultado.',
  },
  {
    question: 'A estimativa é precisa?',
    answer:
      'É uma estimativa baseada em fatores médios de emissão, pensada para mostrar a ordem de grandeza da sua pegada e as categorias que mais pesam. Ela não substitui um inventário de emissões feito com dados medidos, como contas de energia e consumo de combustível.',
  },
  {
    question: 'Posso calcular a pegada de uma família ou empresa?',
    answer:
      'Por enquanto, a calculadora estima a pegada de uma pessoa. Os perfis Família, Empresa e Evento aparecem como “Em breve” e serão liberados quando seus fatores de emissão forem validados.',
  },
];

// Internal links

export const relatedLinks: { title: string; text: string; href: string }[] = [
  {
    title: 'Projetos de restauração',
    text: 'Conheça projetos de restauração ecológica e escolha como contribuir.',
    href: '/projetos',
  },
  {
    title: 'Créditos de carbono',
    text: 'Entenda como funcionam os créditos de carbono e como eles são gerados.',
    href: '/#creditos-carbono',
  },
  {
    title: 'Projetos de carbono',
    text: 'Da análise de viabilidade ao monitoramento de projetos de créditos de carbono.',
    href: '/solucoes/projetos-carbono',
  },
  {
    title: 'Projetos agroflorestais',
    text: 'Projetos que combinam produção agrícola com conservação florestal.',
    href: '/solucoes/projetos-agroflorestais',
  },
  {
    title: 'Treinamentos',
    text: 'Treinamentos em créditos de carbono, projetos agroflorestais e gestão sustentável.',
    href: '/solucoes/treinamentos',
  },
];

// pt-BR advice shown on the results screen.
import { FoodAnswer, TransportAnswer, WasteAnswer, type CalculatorAnswers } from './answers.ts';
import { categoryDetails, type CategoryId, type CategoryResult } from './categories.ts';
import { formatTonnes } from '../format.ts';

export interface ReductionTip {
  id: CategoryId;
  title: string;
  description: string;
}

export interface Attention {
  title: string;
  description: string;
}

const PERSONAL_VEHICLES = [
  TransportAnswer.Gas,
  TransportAnswer.Ethanol,
  TransportAnswer.Motorcycle,
];
const PLANT_BASED_DIETS = [FoodAnswer.Vegan, FoodAnswer.Vegetarian];

/** One tip per category, worded for the given answers. */
export function reductionTips(answers: CalculatorAnswers): Record<CategoryId, ReductionTip> {
  const personalVehicle = PERSONAL_VEHICLES.includes(answers.transport);
  const plantBased = PLANT_BASED_DIETS.includes(answers.food);
  const recycles = answers.waste === WasteAnswer.Recycle;
  return {
    transport: {
      id: 'transport',
      title: personalVehicle ? 'Repense os deslocamentos' : 'Otimize seus trajetos',
      description: personalVehicle
        ? 'Experimente substituir parte dos trajetos de carro ou moto por transporte coletivo, bicicleta ou caronas.'
        : 'Agrupe compromissos e encurte os trajetos quando possível, mantendo as opções de menor emissão.',
    },
    home: {
      id: 'home',
      title: 'Aproveite melhor sua moradia',
      description:
        'Priorize ventilação e iluminação naturais e concentre o uso dos ambientes para reduzir a demanda da casa.',
    },
    energy: {
      id: 'energy',
      title: 'Reduza o consumo de energia',
      description:
        'Identifique os aparelhos que mais consomem, ajuste o tempo de uso e evite equipamentos ligados sem necessidade.',
    },
    food: {
      id: 'food',
      title: plantBased ? 'Evite desperdício de alimentos' : 'Mais refeições vegetais',
      description: plantBased
        ? 'Planeje as compras, aproveite os alimentos por inteiro e priorize produtos da estação para complementar sua alimentação vegetal.'
        : 'Substitua algumas refeições com carne por opções vegetais e planeje as compras para evitar desperdício.',
    },
    waste: {
      id: 'waste',
      title: recycles ? 'Reduza antes de reciclar' : 'Separe e reduza os resíduos',
      description: recycles
        ? 'Prefira produtos reutilizáveis e com menos embalagem. Considere compostar os resíduos orgânicos.'
        : 'Separe os recicláveis, procure a coleta seletiva local e reduza descartáveis no dia a dia.',
    },
  };
}

/** Highlights the largest category, or explains an empty result. */
export function attentionFor(
  largest: CategoryResult | null,
  tips: Record<CategoryId, ReductionTip>,
): Attention {
  if (!largest) {
    return {
      title: 'Nenhuma emissão estimada',
      description: 'Com as respostas e os fatores atuais, o cálculo não identificou emissões.',
    };
  }
  const { label } = categoryDetails[largest.id];
  return {
    title: `Foco de atenção: ${label}`,
    description: `${label} representa ${Math.round(largest.percentage)}% da sua pegada estimada (${formatTonnes(largest.tonnes)} tCO₂e/ano). ${tips[largest.id].description}`,
  };
}

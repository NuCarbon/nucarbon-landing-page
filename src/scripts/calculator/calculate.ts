import {
  EnergyAnswer, FoodAnswer, HomeAnswer, ProfileAnswer, TransportAnswer, WasteAnswer,
  type CalculatorAnswers,
} from './state.ts';

// Annual factors are tCO₂e/year; transport factors are kgCO₂e/km and tree absorption is tCO₂e/tree/year.
export const coefficients = {
  weeksPerYear: 52,
  kilogramsPerTonne: 1000,
  treeAbsorption: 0.15,
  profile: {
    [ProfileAnswer.Person]: 1,
    [ProfileAnswer.Family]: 3,
    [ProfileAnswer.Company]: 10,
    [ProfileAnswer.Event]: 5,
  },
  home: {
    [HomeAnswer.Apartment]: 0.35,
    [HomeAnswer.SmallHouse]: 0.6,
    [HomeAnswer.LargeHouse]: 1.1,
  },
  transport: {
    [TransportAnswer.Gas]: 0.24,
    [TransportAnswer.Ethanol]: 0.16,
    [TransportAnswer.Electric]: 0.05,
    [TransportAnswer.Motorcycle]: 0.1,
    [TransportAnswer.Public]: 0.06,
    [TransportAnswer.Bike]: 0,
  },
  energy: {
    [EnergyAnswer.Low]: 0.2,
    [EnergyAnswer.Medium]: 0.55,
    [EnergyAnswer.High]: 1.3,
  },
  food: {
    [FoodAnswer.Vegan]: 0.5,
    [FoodAnswer.Vegetarian]: 0.8,
    [FoodAnswer.Flexitarian]: 1.2,
    [FoodAnswer.Moderate]: 1.8,
    [FoodAnswer.High]: 2.7,
  },
  waste: {
    [WasteAnswer.Recycle]: 0.1,
    [WasteAnswer.Sometimes]: 0.25,
    [WasteAnswer.Trash]: 0.45,
  },
};

export type CalculationCoefficients = typeof coefficients;
export type CategoryId = 'transport' | 'home' | 'energy' | 'food' | 'waste';

export const categoryDetails: Record<CategoryId, { label: string; icon: string }> = {
  transport: { label: 'Transporte', icon: 'bus' },
  home: { label: 'Moradia', icon: 'home' },
  energy: { label: 'Energia', icon: 'energy' },
  food: { label: 'Alimentação', icon: 'bowl' },
  waste: { label: 'Resíduos', icon: 'trash' },
};

export interface CategoryResult {
  id: CategoryId;
  tonnes: number;
  percentage: number;
}

export interface ReductionTip {
  id: CategoryId;
  title: string;
  description: string;
}

export interface CalculationResult {
  total: number;
  trees: number;
  categories: CategoryResult[];
  attention: { title: string; description: string };
  tips: ReductionTip[];
}

const round = (value: number) => Math.round(value * 100) / 100;
export const formatTonnes = (value: number) => value.toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function reductionTips(answers: CalculatorAnswers): Record<CategoryId, ReductionTip> {
  const personalVehicle = [TransportAnswer.Gas, TransportAnswer.Ethanol, TransportAnswer.Motorcycle].includes(answers.transport);
  const plantBased = [FoodAnswer.Vegan, FoodAnswer.Vegetarian].includes(answers.food);
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
      description: 'Priorize ventilação e iluminação naturais e concentre o uso dos ambientes para reduzir a demanda da casa.',
    },
    energy: {
      id: 'energy',
      title: 'Reduza o consumo de energia',
      description: 'Identifique os aparelhos que mais consomem, ajuste o tempo de uso e evite equipamentos ligados sem necessidade.',
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
      title: answers.waste === WasteAnswer.Recycle ? 'Reduza antes de reciclar' : 'Separe e reduza os resíduos',
      description: answers.waste === WasteAnswer.Recycle
        ? 'Prefira produtos reutilizáveis e com menos embalagem. Considere compostar os resíduos orgânicos.'
        : 'Separe os recicláveis, procure a coleta seletiva local e reduza descartáveis no dia a dia.',
    },
  };
}

export function calculateFootprint(
  answers: CalculatorAnswers,
  coef: CalculationCoefficients = coefficients,
): CalculationResult {
  const distance = Number.isFinite(answers.distance) ? Math.max(0, answers.distance) : 0;
  const multiplier = coef.profile[answers.profile];
  const annual: Record<CategoryId, number> = {
    transport: distance * coef.weeksPerYear * coef.transport[answers.transport] / coef.kilogramsPerTonne,
    home: coef.home[answers.home],
    energy: coef.energy[answers.energy],
    food: coef.food[answers.food],
    waste: coef.waste[answers.waste],
  };

  const categories: CategoryResult[] = (Object.keys(annual) as CategoryId[]).map((id) => ({
    id, tonnes: round(annual[id] * multiplier), percentage: 0,
  }));

  const total = round(categories.reduce((sum, category) => sum + category.tonnes, 0));
  categories.forEach((category) => { category.percentage = total > 0 ? category.tonnes / total * 100 : 0; });

  const ranked = [...categories].sort((a, b) => b.tonnes - a.tonnes);
  const largest = ranked[0];
  const tipsByCategory = reductionTips(answers);

  return {
    total,
    trees: Math.ceil(total / coef.treeAbsorption),
    categories,
    attention: total > 0 ? {
      title: `Foco de atenção: ${categoryDetails[largest.id].label}`,
      description: `${categoryDetails[largest.id].label} representa ${Math.round(largest.percentage)}% da sua pegada estimada (${formatTonnes(largest.tonnes)} tCO₂e/ano). ${tipsByCategory[largest.id].description}`,
    } : {
      title: 'Nenhuma emissão estimada',
      description: 'Com as respostas e os fatores atuais, o cálculo não identificou emissões.',
    },
    tips: ranked.filter((category) => category.tonnes > 0).slice(0, 3).map((category) => tipsByCategory[category.id]),
  };
}

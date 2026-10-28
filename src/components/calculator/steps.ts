// Content of every calculator step. ChoiceStep renders each entry; the order
// of calculatorSteps drives navigation, progress and rendering.
import {
  EnergyAnswer,
  FoodAnswer,
  HomeAnswer,
  ProfileAnswer,
  TransportAnswer,
  WasteAnswer,
  type CalculatorAnswers,
  type StepId,
} from '../../lib/calculator/answers.ts';
import { categoryDetails } from '../../lib/calculator/categories.ts';
import type { IconName } from './icons.ts';

/** Card size: `compact` for short labels, `dense` for many options with descriptions. */
export type OptionDensity = 'default' | 'compact' | 'dense';

export interface StepOption<K extends StepId = StepId> {
  value: CalculatorAnswers[K];
  label: string;
  description?: string;
  icon: IconName;
  /** Visible but not selectable. */
  disabled?: boolean;
  badge?: string;
}

export interface CalculatorStep<K extends StepId = StepId> {
  id: K;
  /** Short name shown in the progress header. */
  label: string;
  /** The question; the heading of the step. */
  title: string;
  /** Columns on wide screens. Narrow screens use fewer, depending on density. */
  columns: 2 | 3;
  density: OptionDensity;
  options: StepOption<K>[];
}

const defineStep = <K extends StepId>(step: CalculatorStep<K>) => step;

// Profiles without validated factors yet; SUPPORTED_ANSWERS rejects them too.
const comingSoon = { disabled: true, badge: 'Em breve' } as const;

export const calculatorSteps: readonly CalculatorStep[] = [
  defineStep({
    id: 'profile',
    label: 'Perfil',
    title: 'Qual o seu perfil de cálculo?',
    columns: 2,
    density: 'default',
    options: [
      {
        value: ProfileAnswer.Person,
        label: 'Pessoa física',
        description: 'Hábitos pessoais de transporte, moradia e consumo.',
        icon: 'person',
      },
      {
        value: ProfileAnswer.Family,
        label: 'Família',
        description: 'Cálculo consolidado para todos os membros da residência.',
        icon: 'home',
        ...comingSoon,
      },
      {
        value: ProfileAnswer.Company,
        label: 'Empresa',
        description: 'Diagnóstico de emissões operacionais e escritórios.',
        icon: 'building',
        ...comingSoon,
      },
      {
        value: ProfileAnswer.Event,
        label: 'Evento',
        description: 'Estime emissões geradas por celebrações ou congressos.',
        icon: 'calendar',
        ...comingSoon,
      },
    ],
  }),
  defineStep({
    id: 'home',
    label: categoryDetails.home.label,
    title: 'Como é a sua moradia?',
    columns: 3,
    density: 'default',
    options: [
      {
        value: HomeAnswer.Apartment,
        label: 'Apartamento',
        description: 'Edifício com áreas e serviços compartilhados.',
        icon: 'apartment',
      },
      {
        value: HomeAnswer.SmallHouse,
        label: 'Casa pequena',
        description: 'Casa de até 100 m².',
        icon: 'house',
      },
      {
        value: HomeAnswer.LargeHouse,
        label: 'Casa grande',
        description: 'Casa com mais de 100 m².',
        icon: 'home',
      },
    ],
  }),
  defineStep({
    id: 'transport',
    label: categoryDetails.transport.label,
    title: 'Qual o seu principal meio de transporte?',
    columns: 3,
    density: 'compact',
    options: [
      { value: TransportAnswer.Gas, label: 'Carro (gasolina)', icon: 'car' },
      { value: TransportAnswer.Ethanol, label: 'Carro (etanol)', icon: 'leaf' },
      { value: TransportAnswer.Electric, label: 'Carro (elétrico)', icon: 'plug' },
      { value: TransportAnswer.Motorcycle, label: 'Moto', icon: 'motorcycle' },
      { value: TransportAnswer.Public, label: 'Transporte público', icon: 'bus' },
      { value: TransportAnswer.Bike, label: 'Bicicleta/a pé', icon: 'bike' },
    ],
  }),
  defineStep({
    id: 'energy',
    label: categoryDetails.energy.label,
    title: 'Qual é o seu consumo mensal de energia?',
    columns: 3,
    density: 'default',
    options: [
      {
        value: EnergyAnswer.Low,
        label: 'Baixo',
        description: 'Até 150 kWh por mês.',
        icon: 'leaf',
      },
      {
        value: EnergyAnswer.Medium,
        label: 'Médio',
        description: 'Entre 150 e 300 kWh por mês.',
        icon: 'energy',
      },
      {
        value: EnergyAnswer.High,
        label: 'Alto',
        description: 'Mais de 300 kWh por mês.',
        icon: 'energy',
      },
    ],
  }),
  defineStep({
    id: 'food',
    label: categoryDetails.food.label,
    title: 'Como você descreveria sua alimentação habitual?',
    columns: 3,
    density: 'dense',
    options: [
      {
        value: FoodAnswer.Vegan,
        label: 'Vegana',
        description: 'Apenas alimentos vegetais, sem carnes ou derivados.',
        icon: 'vegan',
      },
      {
        value: FoodAnswer.Vegetarian,
        label: 'Vegetariana',
        description: 'Sem carnes, mas consome ovos e laticínios.',
        icon: 'egg',
      },
      {
        value: FoodAnswer.Flexitarian,
        label: 'Flexitariana',
        description: 'Base vegetal, consumindo carnes raramente.',
        icon: 'bowl',
      },
      {
        value: FoodAnswer.Moderate,
        label: 'Moderada',
        description: 'Carne presente na maioria das refeições.',
        icon: 'meat',
      },
      {
        value: FoodAnswer.High,
        label: 'Alto consumo de carne',
        description: 'Base proteica focada em carnes todos os dias.',
        icon: 'meat',
      },
    ],
  }),
  defineStep({
    id: 'waste',
    label: categoryDetails.waste.label,
    title: 'Como você lida com seus resíduos?',
    columns: 3,
    density: 'default',
    options: [
      {
        value: WasteAnswer.Recycle,
        label: 'Reciclo sempre',
        description: 'Separo recicláveis e reduzo o desperdício.',
        icon: 'leaf',
      },
      {
        value: WasteAnswer.Sometimes,
        label: 'Às vezes',
        description: 'Separo apenas alguns tipos de materiais.',
        icon: 'bag',
      },
      {
        value: WasteAnswer.Trash,
        label: 'Não separo',
        description: 'Descarto a maior parte no lixo comum.',
        icon: 'trash',
      },
    ],
  }),
];

import ProfileStep from './steps/ProfileStep.astro';
import HomeStep from './steps/HomeStep.astro';
import TransportStep from './steps/TransportStep.astro';
import EnergyStep from './steps/EnergyStep.astro';
import FoodStep from './steps/FoodStep.astro';
import WasteStep from './steps/WasteStep.astro';
import type { StepId } from '../../scripts/calculator/state';

// Reorder this list to change navigation, progress, and rendering together.
export const calculatorSteps = [
  { id: 'profile', label: 'Perfil', component: ProfileStep },
  { id: 'home', label: 'Moradia', component: HomeStep },
  { id: 'transport', label: 'Transporte', component: TransportStep },
  { id: 'energy', label: 'Energia', component: EnergyStep },
  { id: 'food', label: 'Alimentação e consumo', component: FoodStep },
  { id: 'waste', label: 'Resíduos', component: WasteStep },
] satisfies { id: StepId; label: string; component: typeof ProfileStep }[];

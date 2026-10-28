import {
  EnergyAnswer,
  FoodAnswer,
  HomeAnswer,
  ProfileAnswer,
  TransportAnswer,
  WasteAnswer,
} from './answers.ts';

// Emission factors behind every estimate. Units:
// - profile: unitless multiplier applied to every category.
// - home, energy, food, waste: tCO₂e per year.
// - transport: kgCO₂e per km, multiplied by the weekly distance.
// - treeAbsorption: tCO₂e absorbed per tree per year.
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

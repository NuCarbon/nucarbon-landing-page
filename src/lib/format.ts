// pt-BR display formatting shared by server-rendered pages, browser scripts and tests.
import {
  Biome,
  MetricType,
  ProjectStatus,
  ReactionType,
  type Coordinates,
  type ImpactMetric,
  type Project,
  type ReactionCount,
} from '../types/app.ts';

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
});

export const biomeLabels: Record<Biome, string> = {
  [Biome.AtlanticForest]: 'Mata Atlântica',
  [Biome.Cerrado]: 'Cerrado',
};

export const statusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.Planting]: 'Plantio',
  [ProjectStatus.Monitoring]: 'Monitoramento',
};

export const formatInteger = (value: number) => integer.format(value);
export const formatDecimal = (value: number) => decimal.format(value);

/** Tonnes with up to two decimals: "4,8". */
export const formatTonnes = (value: number) => decimal.format(value);
/** "4,8 tCO₂e" */
export const formatCo2e = (value: number) => `${formatTonnes(value)} tCO₂e`;
/** "4,8 tCO₂e / ano" */
export const formatFootprint = (value: number) => `${formatCo2e(value)} / ano`;

/** Integer cents to "R$ 75,00". */
export const formatMoney = (cents: number) => currency.format(cents / 100);

export const formatHectares = (value: number) => `${decimal.format(value)} hectares`;
/** A 0–1 ratio to "65%". */
export const formatPercent = (ratio: number) => percent.format(ratio);
export const formatProgress = formatPercent;

export const formatDate = (timestamp: number) => date.format(timestamp);
export const formatUpdatedAt = (timestamp: number) => `Atualizado em ${date.format(timestamp)}`;

/** "Campinas, SP" */
export const formatPlace = ({ municipality, state }: Pick<Project, 'municipality' | 'state'>) =>
  `${municipality}, ${state}`;

export const formatComments = (count: number) =>
  `${integer.format(count)} ${count === 1 ? 'comentário' : 'comentários'}`;

const reactionIcons: Record<ReactionType, string> = {
  [ReactionType.Heart]: '❤️',
  [ReactionType.Seedling]: '🌱',
  [ReactionType.Applause]: '👏',
};

export const formatReactions = (reactions: ReactionCount[]) =>
  reactions
    .filter(({ count }) => count > 0)
    .map(({ type, count }) => `${reactionIcons[type]} ${integer.format(count)}`)
    .join(' · ');

export interface FormattedMetric {
  label: string;
  value: string;
  icon: string;
}

/** Returns null for metric types this version does not know how to display. */
export function formatMetric(metric: ImpactMetric): FormattedMetric | null {
  switch (metric.type) {
    case MetricType.TreesSupported:
      return {
        label: 'Árvores apoiadas',
        value: `${integer.format(metric.value)} ${metric.value === 1 ? 'muda nativa' : 'mudas nativas'}`,
        icon: '♣',
      };
    case MetricType.CarbonOffset:
      return { label: 'CO₂e compensado', value: formatCo2e(metric.value), icon: '◌' };
    default:
      return null;
  }
}

/** @deprecated Use formatHectares. Removed once the app project card is replaced. */
export const formatArea = (value: number) => `${decimal.format(value)} hectares em restauração`;

/** @deprecated Coordinates are no longer displayed. Removed once the app project card is replaced. */
export const formatLocation = ({ latitude, longitude }: Coordinates) =>
  `${Math.abs(latitude).toFixed(4)}° ${latitude < 0 ? 'S' : 'N'}, ${Math.abs(longitude).toFixed(4)}° ${longitude < 0 ? 'O' : 'L'}`;

/** @deprecated Project cards use gallery images. Removed once the app project card is replaced. */
export const projectImageClass = (biome: Biome) =>
  biome === Biome.Cerrado ? 'project-image project-image-cerrado' : 'project-image';

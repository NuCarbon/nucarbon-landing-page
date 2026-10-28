import {
  Biome,
  MetricType,
  ProjectStatus,
  ReactionType,
  type Coordinates,
  type ImpactMetric,
  type ReactionCount,
} from '../../types/app.ts';

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
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
export const formatFootprint = (value: number) => `${decimal.format(value)} tCO₂e / ano`;
export const formatUpdatedAt = (timestamp: number) => `Atualizado em ${date.format(timestamp)}`;
export const formatDate = (timestamp: number) => date.format(timestamp);
export const formatArea = (value: number) => `${decimal.format(value)} hectares em restauração`;
export const formatProgress = (ratio: number) => percent.format(ratio);
export const formatComments = (count: number) =>
  `${integer.format(count)} ${count === 1 ? 'comentário' : 'comentários'}`;
export const formatLocation = ({ latitude, longitude }: Coordinates) =>
  `${Math.abs(latitude).toFixed(4)}° ${latitude < 0 ? 'S' : 'N'}, ${Math.abs(longitude).toFixed(4)}° ${longitude < 0 ? 'O' : 'L'}`;
export const projectImageClass = (biome: Biome) =>
  biome === Biome.Cerrado ? 'project-image project-image-cerrado' : 'project-image';

export function formatMetric(metric: ImpactMetric) {
  switch (metric.type) {
    case MetricType.TreesSupported:
      return {
        label: 'Árvores apoiadas',
        value: `${integer.format(metric.value)} ${metric.value === 1 ? 'muda nativa' : 'mudas nativas'}`,
        icon: '♣',
      };
    case MetricType.CarbonOffset:
      return {
        label: 'CO₂e compensado',
        value: `${decimal.format(metric.value)} tCO₂e`,
        icon: '◌',
      };
  }
}

const reactionIcons: Record<ReactionType, string> = {
  [ReactionType.Heart]: '❤️',
  [ReactionType.Seedling]: '🌱',
  [ReactionType.Applause]: '👏',
};
export const formatReactions = (reactions: ReactionCount[]) =>
  reactions
    .filter(({ count }) => count > 0)
    .map(({ type, count }) => `${reactionIcons[type]} ${integer.format(count)}`)
    .join('   ');

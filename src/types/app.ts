// Persisted codes: never renumber or reuse an existing value.
export enum Biome { AtlanticForest = 1, Cerrado = 2 }
export enum ProjectStatus { Planting = 1, Monitoring = 2 }
export enum MetricType { TreesSupported = 1, CarbonOffset = 2 }
export enum ReactionType { Heart = 1, Seedling = 2, Applause = 3 }

export type UUID = `${string}-${string}-${string}-${string}-${string}`;
export interface Coordinates { latitude: number; longitude: number }

export interface Project {
  id: UUID;
  biome: Biome;
  location: Coordinates;
  name: string;
  areaHectares: number;
  restorationProgress: number; // Ratio from 0 to 1.
  status: ProjectStatus;
}

export interface ImpactMetric {
  type: MetricType;
  value: number; // Tree count or tonnes CO₂e, determined by type.
}

export interface Footprint {
  annualEmissionsTonnes: number;
  updatedAt: number; // Unix milliseconds in JSON; Firestore Timestamp in storage.
}

export interface Dashboard {
  footprint: Footprint | null;
  metrics: ImpactMetric[];
  projects: Project[];
}

export interface Author { id: UUID; displayName: string }
export interface ReactionCount { type: ReactionType; count: number }

export interface CommunityPost {
  id: UUID;
  author: Author;
  createdAt: number; // Unix milliseconds.
  body: string;
  reactions: ReactionCount[];
  commentCount: number;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CommunityResponse {
  posts: CommunityPost[];
}

import type { CalculatorAnswers } from '../lib/calculator/answers.ts';
import type { ContributionPercentage } from '../lib/checkout/amount.ts';

// Persisted codes: never renumber or reuse an existing value.
export enum Biome {
  AtlanticForest = 1,
  Cerrado = 2,
}
export enum ProjectStatus {
  Planting = 1,
  Monitoring = 2,
}
export enum MetricType {
  TreesSupported = 1,
  CarbonOffset = 2,
}
export enum ReactionType {
  Heart = 1,
  Seedling = 2,
  Applause = 3,
}

export type UUID = `${string}-${string}-${string}-${string}-${string}`;
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Project {
  id: UUID;
  slug: string;
  published: boolean;
  biome: Biome;
  location: Coordinates;
  name: string;
  areaHectares: number;
  restorationProgress: number; // Ratio from 0 to 1.
  status: ProjectStatus;
  summary: string;
  description: string;
  municipality: string;
  state: string;
  gallery: { url: string; alt: string }[];
  treesPlanted: number;
  carbonTonnes: number;
  participants: number;
  species: { name: string; scientificName: string }[];
  impacts: { title: string; description: string }[];
  timeline: { label: string; description: string }[];
  methodology: string;
  documents: { title: string; url: string }[];
  pricePerTonneCents: number;
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
  supportedProjects: Project[];
}

export interface Author {
  id: UUID;
  displayName: string;
}
export interface ReactionCount {
  type: ReactionType;
  count: number;
}

export interface CommunityPost {
  id: UUID;
  author: Author;
  createdAt: number; // Unix milliseconds.
  body: string;
  reactions: ReactionCount[];
  commentCount: number;
}

export interface CommunityResponse {
  posts: CommunityPost[];
}

export type DashboardResponse = Dashboard;

export interface CalculatorResultResponse {
  result: { answers: CalculatorAnswers; footprint: Footprint } | null;
}

export type ContributionMode = 'manual' | 'percentage';
export type OrderStatus = 'pending' | 'registered';

/** Body of POST /api/checkouts. Quantity is ignored for percentage selections. */
export interface CheckoutRequest {
  key: UUID; // Client-generated idempotency key; becomes the order ID.
  slug: string;
  mode: ContributionMode;
  percentage?: ContributionPercentage;
  quantity?: number;
}

export interface Order {
  id: UUID;
  projectId: UUID;
  projectSlug: string;
  projectName: string;
  quantityTonnes: number;
  mode: ContributionMode;
  percentage: ContributionPercentage | null;
  pricePerTonneCents: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: number; // Unix milliseconds.
  expiresAt: number;
  registeredAt: number | null;
}

export interface OrderResponse {
  order: Order;
}

export interface ApiErrorBody {
  error: string;
}

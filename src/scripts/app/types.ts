export interface Project {
  id: string;
  biome: string;
  location: string;
  name: string;
  hectares: number;
  progress: number;
  status: string;
}

export interface ImpactMetric {
  label: string;
  value: string;
  icon: string;
}

export interface Dashboard {
  footprint: {
    value: string;
    updatedLabel: string;
  };
  metrics: ImpactMetric[];
  projects: Project[];
}

export interface CommunityPost {
  id: string;
  author: string;
  timestamp: string;
  body: string;
  reactions: string;
  comments: number;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CommunityResponse {
  posts: CommunityPost[];
}

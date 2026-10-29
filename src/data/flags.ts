// Build-time feature flags from PUBLIC_FEATURE_* variables (inlined by Vite, so changing one
// needs a rebuild). Every flag defaults to off. Import from components and scripts only.

const enabled = (value: string | undefined): boolean => value === 'true';

export const features = {
  /** "Conhecer projetos de restauração" as the main action of the calculator result. */
  projectsCta: enabled(import.meta.env.PUBLIC_FEATURE_PROJECTS_CTA),
} as const;

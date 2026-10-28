import type { UUID } from '../types/app';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** RFC 4122 UUID, as used for every document ID except Firebase Auth UIDs. */
export const isUuid = (value: unknown): value is UUID =>
  typeof value === 'string' && UUID_PATTERN.test(value);

/** Lowercase, hyphen-separated URL segment: "corredores-mata-atlantica". */
export const isSlug = (value: unknown): value is string =>
  typeof value === 'string' && SLUG_PATTERN.test(value);

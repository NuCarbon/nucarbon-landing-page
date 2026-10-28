// Share codes: a short, versioned, checksummed encoding of the calculator answers used in
// /calculadora/resultado/<code>. Implemented by workstream A; signatures are the contract.
import type { CalculatorAnswers } from './answers.ts';

export const SHARE_IMAGE_FORMATS = ['og', 'story'] as const;
export type ShareImageFormat = (typeof SHARE_IMAGE_FORMATS)[number];

/** Pixel sizes: link previews (1.91:1) and Instagram Stories (9:16). */
export const SHARE_IMAGE_SIZES: Readonly<
  Record<ShareImageFormat, { readonly width: number; readonly height: number }>
> = {
  og: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
};

export function isShareImageFormat(value: unknown): value is ShareImageFormat {
  return SHARE_IMAGE_FORMATS.includes(value as ShareImageFormat);
}

export function encodeShareCode(_answers: CalculatorAnswers): string {
  throw new Error('Not implemented');
}

export function decodeShareCode(_code: unknown): CalculatorAnswers | null {
  throw new Error('Not implemented');
}

export function sharedResultPath(code: string): string {
  return `/calculadora/resultado/${code}`;
}

export function shareImagePath(code: string, format: ShareImageFormat): string {
  return `${sharedResultPath(code)}/${format}.png`;
}

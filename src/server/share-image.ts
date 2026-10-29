// Share images for calculator results: a display view, a satori element tree, then SVG and PNG.
// Pure and Vite-free so tests can run it under node --test; endpoints pass the assets from
// share-image-assets.ts and tests load them with fs.
//
// Satori only supports flexbox: every element with more than one child needs display: flex, and
// there are no CSS variables, grid or calc(). Kollektif has no "₂" glyph and satori has no font
// fallback, so "CO2" is drawn with a smaller, lowered "2" (see `co2e`). A test checks every text
// node against the font's character map.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';
import type { CalculationResult } from '../lib/calculator/calculate.ts';
import { CATEGORY_IDS, categoryDetails, type CategoryId } from '../lib/calculator/categories.ts';
import { SHARE_IMAGE_SIZES, type ShareImageFormat } from '../lib/calculator/share.ts';
import { formatPercent, formatTonnes } from '../lib/format.ts';

/**
 * Mirrors the `--color-*` tokens of src/styles/global.scss, because satori cannot read CSS
 * variables. Keys are the token names in camelCase; a test checks the values against the file.
 */
export const SHARE_IMAGE_PALETTE = {
  primary: '#2e7d32',
  primaryDark: '#1b5e20',
  primarySoft: '#e8f5e9',
  primaryTint: '#c8e6c9',
  surface: '#fff',
  surfaceMuted: '#f3f3ee',
  text: '#1a1a1a',
  textMuted: '#555552',
  onDark: '#fff',
  onDarkMuted: 'rgba(255, 255, 255, 0.78)',
  onDarkLine: 'rgba(255, 255, 255, 0.16)',
  warningAccent: '#e07b00',
} as const;

const palette = SHARE_IMAGE_PALETTE;
const FONT_FAMILY = 'Kollektif';

export interface ShareImageAssets {
  /** Kollektif Regular and Bold TTFs. */
  regular: ArrayBuffer;
  bold: ArrayBuffer;
  /** The logo as a data URL, so the SVG is self-contained. */
  logoDataUrl: string;
  /** @resvg/resvg-wasm's index_bg.wasm. */
  wasm: ArrayBuffer;
}

export interface ShareImageCategory {
  id: CategoryId;
  label: string;
  /** "1,2 t" */
  tonnes: string;
  /** "25%" */
  share: string;
  /** Bar length, 0–1, relative to the largest category. */
  ratio: number;
  largest: boolean;
}

interface ShareImageBase {
  /** "Calcule a sua em" + `site`. */
  cta: string;
  site: string;
}

export type ShareImageView =
  | (ShareImageBase & {
      kind: 'result';
      eyebrow: string;
      /** "4,8", drawn before the "tCO2e/ano" unit. */
      total: string;
      breakdownTitle: string;
      categories: ShareImageCategory[];
    })
  | (ShareImageBase & {
      kind: 'generic';
      title: string;
      subtitle: string;
      breakdownTitle: string;
      categories: { id: CategoryId; label: string }[];
    });

const SITE = 'nucarbon.com.br/calculadora';

/** Display strings for a result, or the generic invitation (the /calculadora OG image). */
export function shareImageView(result: CalculationResult | null): ShareImageView {
  if (!result) {
    return {
      kind: 'generic',
      title: 'Calcule sua pegada de carbono',
      subtitle: 'Responda 6 perguntas e descubra sua estimativa anual em 2 minutos.',
      breakdownTitle: 'O que entra no cálculo',
      categories: CATEGORY_IDS.map((id) => ({ id, label: categoryDetails[id].label })),
      cta: 'Faça o cálculo em',
      site: SITE,
    };
  }

  const byId = new Map(result.categories.map((category) => [category.id, category]));
  const max = Math.max(0, ...result.categories.map((category) => category.tonnes));
  return {
    kind: 'result',
    eyebrow: 'Minha pegada de carbono estimada',
    total: formatTonnes(result.total),
    breakdownTitle: 'Distribuição por categoria',
    categories: CATEGORY_IDS.map((id) => {
      const tonnes = byId.get(id)?.tonnes ?? 0;
      const percentage = byId.get(id)?.percentage ?? 0;
      return {
        id,
        label: categoryDetails[id].label,
        tonnes: `${formatTonnes(tonnes)} t`,
        share: formatPercent(Math.round(percentage) / 100),
        ratio: max > 0 ? tonnes / max : 0,
        largest: id === result.largestCategory,
      };
    }),
    cta: 'Calcule a sua em',
    site: SITE,
  };
}

// Minimal satori element tree (the shape of a React element, without React).
type Style = Record<string, string | number>;
export type ShareImageNode = ShareImageElement | string;
export interface ShareImageElement {
  type: string;
  props: { style?: Style; children?: ShareImageNode[]; [attribute: string]: unknown };
}

// Satori defaults to content-box sizing; the layout below assumes border-box like the site.
function h(type: string, style: Style, ...children: ShareImageNode[]): ShareImageElement {
  return { type, props: { style: { boxSizing: 'border-box', ...style }, children } };
}

const row = (style: Style, ...children: ShareImageNode[]) =>
  h('div', { display: 'flex', ...style }, ...children);
const column = (style: Style, ...children: ShareImageNode[]) =>
  h('div', { display: 'flex', flexDirection: 'column', ...style }, ...children);
const text = (style: Style, value: string) => h('div', { display: 'flex', ...style }, value);

/** `before` + "CO" + a subscript-like "2" + `after`, at `size` px. */
function co2e(size: number, before: string, after: string, style: Style = {}): ShareImageElement {
  return row(
    { alignItems: 'flex-start', fontSize: size, lineHeight: 1, ...style },
    `${before}CO`,
    h('span', { fontSize: Math.round(size * 0.62), marginTop: Math.round(size * 0.48) }, '2'),
    after,
  );
}

interface Layout {
  /** Top, sides, bottom. */
  padding: [number, number, number];
  logo: number;
  wordmark: number;
  eyebrow: number;
  total: number;
  unit: number;
  title: number;
  subtitle: number;
  cardPadding: number;
  cardTitle: number;
  label: number;
  bar: number;
  rowGap: number;
  cta: number;
}

const LAYOUTS: Record<ShareImageFormat, Layout> = {
  og: {
    padding: [48, 64, 44],
    logo: 56,
    wordmark: 38,
    eyebrow: 24,
    total: 156,
    unit: 44,
    title: 72,
    subtitle: 30,
    cardPadding: 32,
    cardTitle: 24,
    label: 24,
    bar: 12,
    rowGap: 18,
    cta: 28,
  },
  story: {
    // Instagram draws its own UI over the top ~250 px and bottom ~340 px.
    padding: [270, 80, 370],
    logo: 72,
    wordmark: 50,
    eyebrow: 32,
    total: 220,
    unit: 60,
    title: 104,
    subtitle: 42,
    cardPadding: 44,
    cardTitle: 34,
    label: 34,
    bar: 18,
    rowGap: 26,
    cta: 32,
  },
};

function brand(layout: Layout, logoDataUrl: string): ShareImageElement {
  return row(
    { alignItems: 'center', gap: Math.round(layout.logo * 0.25) },
    {
      type: 'img',
      props: { src: logoDataUrl, width: layout.logo, height: layout.logo, style: {} },
    },
    text({ color: palette.onDark, fontSize: layout.wordmark, fontWeight: 700 }, 'Nucarbon'),
  );
}

function categoryRow(category: ShareImageCategory, layout: Layout): ShareImageElement {
  return column(
    { gap: Math.round(layout.bar * 0.8) },
    row(
      { justifyContent: 'space-between', alignItems: 'baseline', fontSize: layout.label },
      text({ color: palette.text, fontWeight: category.largest ? 700 : 400 }, category.label),
      row(
        { gap: Math.round(layout.label * 0.5), color: palette.textMuted },
        text({ fontWeight: 700, color: palette.text }, category.tonnes),
        text({}, category.share),
      ),
    ),
    row(
      {
        width: '100%',
        height: layout.bar,
        borderRadius: layout.bar,
        backgroundColor: palette.surfaceMuted,
      },
      h('div', {
        width: `${Math.max(category.ratio > 0 ? 2 : 0, category.ratio * 100)}%`,
        height: '100%',
        borderRadius: layout.bar,
        backgroundColor: category.largest ? palette.warningAccent : palette.primary,
      }),
    ),
  );
}

function genericRow(label: string, layout: Layout): ShareImageElement {
  const dot = Math.round(layout.label * 0.5);
  return row(
    { alignItems: 'center', gap: Math.round(layout.label * 0.6), fontSize: layout.label },
    h('div', {
      width: dot,
      height: dot,
      borderRadius: dot,
      backgroundColor: palette.primary,
    }),
    text({ color: palette.text }, label),
  );
}

function card(view: ShareImageView, layout: Layout, style: Style): ShareImageElement {
  const rows =
    view.kind === 'result'
      ? view.categories.map((category) => categoryRow(category, layout))
      : view.categories.map((category) => genericRow(category.label, layout));
  return column(
    {
      gap: layout.rowGap,
      padding: layout.cardPadding,
      borderRadius: Math.round(layout.cardPadding * 0.75),
      backgroundColor: palette.surface,
      ...style,
    },
    text(
      {
        color: palette.primaryDark,
        fontSize: layout.cardTitle,
        fontWeight: 700,
        marginBottom: Math.round(layout.rowGap * 0.25),
      },
      view.breakdownTitle,
    ),
    ...rows,
  );
}

function headline(view: ShareImageView, layout: Layout, style: Style): ShareImageElement {
  if (view.kind === 'generic') {
    return column(
      { gap: Math.round(layout.subtitle * 0.8), ...style },
      text(
        { color: palette.onDark, fontSize: layout.title, fontWeight: 700, lineHeight: 1.05 },
        view.title,
      ),
      text(
        { color: palette.onDarkMuted, fontSize: layout.subtitle, lineHeight: 1.35 },
        view.subtitle,
      ),
    );
  }
  return column(
    { ...style },
    text(
      {
        color: palette.primaryTint,
        fontSize: layout.eyebrow,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
      },
      view.eyebrow,
    ),
    text(
      {
        color: palette.onDark,
        fontSize: layout.total,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: -2,
        marginTop: Math.round(layout.total * 0.12),
      },
      view.total,
    ),
    co2e(layout.unit, 't', 'e/ano', {
      color: palette.onDark,
      fontWeight: 700,
      marginTop: Math.round(layout.unit * 0.2),
    }),
  );
}

/** "Calcule a sua em nucarbon.com.br/calculadora": a footer line (og) or a pill (story). */
function callToAction(
  view: ShareImageView,
  layout: Layout,
  tone: 'line' | 'pill',
): ShareImageElement {
  const style: Style =
    tone === 'line'
      ? {
          paddingTop: Math.round(layout.cta * 0.7),
          borderTop: `2px solid ${palette.onDarkLine}`,
          color: palette.onDarkMuted,
        }
      : {
          justifyContent: 'center',
          padding: `${Math.round(layout.cta * 0.75)}px ${layout.cta}px`,
          borderRadius: layout.cta * 2,
          backgroundColor: palette.primarySoft,
          color: palette.primaryDark,
        };
  return row(
    { alignItems: 'center', gap: Math.round(layout.cta * 0.3), fontSize: layout.cta, ...style },
    text({}, view.cta),
    text(
      { color: tone === 'line' ? palette.onDark : palette.primaryDark, fontWeight: 700 },
      view.site,
    ),
  );
}

/** The satori element tree for a view. Plain objects, no JSX. */
export function shareImageTree(
  view: ShareImageView,
  format: ShareImageFormat,
  logoDataUrl: string,
): ShareImageElement {
  const { width, height } = SHARE_IMAGE_SIZES[format];
  const layout = LAYOUTS[format];
  const [paddingTop, paddingX, paddingBottom] = layout.padding;
  const root: Style = {
    width,
    height,
    paddingTop,
    paddingRight: paddingX,
    paddingBottom,
    paddingLeft: paddingX,
    backgroundColor: palette.primaryDark,
    fontFamily: FONT_FAMILY,
    color: palette.onDark,
  };
  const logo = brand(layout, logoDataUrl);

  if (format === 'og') {
    return column(
      { ...root, justifyContent: 'space-between' },
      logo,
      row(
        { alignItems: 'center', justifyContent: 'space-between', gap: 48 },
        headline(view, layout, { width: 470, flexShrink: 0 }),
        card(view, layout, { width: 540, flexShrink: 0 }),
      ),
      callToAction(view, layout, 'line'),
    );
  }

  return column(
    { ...root, justifyContent: 'space-between' },
    logo,
    headline(view, layout, {}),
    card(view, layout, {}),
    callToAction(view, layout, 'pill'),
  );
}

export async function renderShareImageSvg(
  view: ShareImageView,
  format: ShareImageFormat,
  assets: ShareImageAssets,
): Promise<string> {
  const { width, height } = SHARE_IMAGE_SIZES[format];
  // satori's ReactNode type comes from React, which this project does not install.
  return satori(shareImageTree(view, format, assets.logoDataUrl) as never, {
    width,
    height,
    fonts: [
      { name: FONT_FAMILY, data: assets.regular, weight: 400, style: 'normal' },
      { name: FONT_FAMILY, data: assets.bold, weight: 700, style: 'normal' },
    ],
  });
}

let wasmReady: Promise<void> | null = null;

function initResvg(wasm: ArrayBuffer): Promise<void> {
  wasmReady ??= initWasm(wasm).catch((error: unknown) => {
    wasmReady = null;
    throw error;
  });
  return wasmReady;
}

export async function renderShareImagePng(
  view: ShareImageView,
  format: ShareImageFormat,
  assets: ShareImageAssets,
): Promise<Uint8Array<ArrayBuffer>> {
  const [svg] = await Promise.all([
    renderShareImageSvg(view, format, assets),
    initResvg(assets.wasm),
  ]);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: SHARE_IMAGE_SIZES[format].width },
  });
  const image = resvg.render();
  try {
    // A copy typed over ArrayBuffer, which Response and Blob accept.
    return new Uint8Array(image.asPng());
  } finally {
    image.free();
    resvg.free();
  }
}

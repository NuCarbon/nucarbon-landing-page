import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { initialAnswers } from '../src/lib/calculator/answers.ts';
import { calculateFootprint } from '../src/lib/calculator/calculate.ts';
import { categoryDetails, CATEGORY_IDS } from '../src/lib/calculator/categories.ts';
import { SHARE_IMAGE_SIZES } from '../src/lib/calculator/share.ts';
import { formatTonnes } from '../src/lib/format.ts';
import {
  renderShareImagePng,
  renderShareImageSvg,
  SHARE_IMAGE_PALETTE,
  shareImageTree,
  shareImageView,
} from '../src/server/share-image.ts';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const toArrayBuffer = (bytes) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

const regular = read('src/assets/fonts/kollektif/Kollektif.ttf');
const bold = read('src/assets/fonts/kollektif/Kollektif-Bold.ttf');
const assets = {
  regular: toArrayBuffer(regular),
  bold: toArrayBuffer(bold),
  logoDataUrl: `data:image/png;base64,${read('src/images/logo.png').toString('base64')}`,
  wasm: toArrayBuffer(
    readFileSync(createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm')),
  ),
};

const result = calculateFootprint(initialAnswers);
const views = { result: shareImageView(result), generic: shareImageView(null) };

/** Code points mapped by a TrueType font's Unicode (format 4) cmap subtables. */
function fontCodePoints(font) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  let cmap = -1;
  for (let i = 0; i < view.getUint16(4); i += 1) {
    const record = 12 + i * 16;
    if (font.toString('latin1', record, record + 4) === 'cmap') cmap = view.getUint32(record + 8);
  }
  assert.notEqual(cmap, -1, 'cmap table');
  const points = new Set();
  for (let i = 0; i < view.getUint16(cmap + 2); i += 1) {
    const subtable = cmap + view.getUint32(cmap + 8 + i * 8);
    if (view.getUint16(subtable) !== 4) continue;
    const segments = view.getUint16(subtable + 6) / 2;
    const ends = subtable + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const offsets = deltas + segments * 2;
    for (let s = 0; s < segments; s += 1) {
      const start = view.getUint16(starts + s * 2);
      const end = view.getUint16(ends + s * 2);
      const delta = view.getInt16(deltas + s * 2);
      const offset = view.getUint16(offsets + s * 2);
      for (let code = start; code <= end && code !== 0xffff; code += 1) {
        const glyph =
          offset === 0
            ? (code + delta) & 0xffff
            : view.getUint16(offsets + s * 2 + offset + (code - start) * 2);
        if (glyph !== 0) points.add(code);
      }
    }
  }
  return points;
}

/** Every text node of a satori tree, with the style it inherits. */
function textNodes(node, inherited = {}) {
  if (typeof node === 'string') return [{ text: node, style: inherited }];
  const style = { ...inherited, ...node.props.style };
  return (node.props.children ?? []).flatMap((child) => textNodes(child, style));
}

test('the palette mirrors the design tokens in global.scss', () => {
  const scss = readFileSync(new URL('src/styles/global.scss', root), 'utf8');
  for (const [name, value] of Object.entries(SHARE_IMAGE_PALETTE)) {
    const token = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const match = scss.match(new RegExp(`--color-${token}:\\s*([^;]+);`));
    assert.ok(match, `--color-${token} exists`);
    assert.equal(value, match[1].trim(), `--color-${token}`);
  }
});

test('the result view shows the formatted total and every category', () => {
  const view = views.result;
  assert.equal(view.kind, 'result');
  assert.equal(view.total, formatTonnes(result.total));
  assert.deepEqual(
    view.categories.map(({ id }) => id),
    CATEGORY_IDS,
  );
  assert.equal(view.categories.filter(({ largest }) => largest).length, 1);
  assert.equal(view.categories.find(({ largest }) => largest).id, result.largestCategory);
  assert.equal(Math.max(...view.categories.map(({ ratio }) => ratio)), 1);
  for (const format of ['og', 'story']) {
    const texts = textNodes(shareImageTree(view, format, assets.logoDataUrl)).map(
      ({ text }) => text,
    );
    assert.ok(texts.includes(view.total), format);
    for (const id of CATEGORY_IDS) assert.ok(texts.includes(categoryDetails[id].label), id);
    assert.ok(texts.includes('nucarbon.com.br/calculadora'), format);
  }
});

test('the generic view invites visitors to calculate', () => {
  assert.equal(views.generic.kind, 'generic');
  const texts = textNodes(shareImageTree(views.generic, 'og', assets.logoDataUrl)).map(
    ({ text }) => text,
  );
  assert.ok(texts.includes('Calcule sua pegada de carbono'));
});

test('every character drawn exists in Kollektif', () => {
  const fonts = { 400: fontCodePoints(regular), 700: fontCodePoints(bold) };
  for (const view of Object.values(views)) {
    for (const format of ['og', 'story']) {
      for (const { text, style } of textNodes(shareImageTree(view, format, assets.logoDataUrl))) {
        assert.doesNotMatch(text, /₂/);
        const shown = style.textTransform === 'uppercase' ? text.toUpperCase() : text;
        const font = fonts[style.fontWeight === 700 ? 700 : 400];
        for (const char of shown) {
          assert.ok(font.has(char.codePointAt(0)), `"${char}" in "${text}"`);
        }
      }
    }
  }
});

test('SVGs have the size of their format', async () => {
  for (const format of ['og', 'story']) {
    const svg = await renderShareImageSvg(views.result, format, assets);
    const { width, height } = SHARE_IMAGE_SIZES[format];
    assert.match(svg, new RegExp(`^<svg[^>]* width="${width}" height="${height}"`), format);
  }
});

test('PNGs have the right size and stay under the share limits', async () => {
  const limits = { og: 300 * 1024, story: 1024 * 1024 };
  for (const view of Object.values(views)) {
    for (const format of ['og', 'story']) {
      const png = Buffer.from(await renderShareImagePng(view, format, assets));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'signature');
      assert.equal(png.toString('latin1', 12, 16), 'IHDR');
      const { width, height } = SHARE_IMAGE_SIZES[format];
      assert.equal(png.readUInt32BE(16), width, `${view.kind} ${format} width`);
      assert.equal(png.readUInt32BE(20), height, `${view.kind} ${format} height`);
      assert.ok(png.length < limits[format], `${view.kind} ${format}: ${png.length} bytes`);
    }
  }
});

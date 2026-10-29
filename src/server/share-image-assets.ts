// Fonts, logo and the resvg WebAssembly binary for share images, inlined into the server bundle
// by Vite so SSR functions and the prerender step need no files at runtime. Imported only by SSR
// and prerendered endpoints: the `?inline` imports are Vite-only, so tests load the same files
// with fs instead. The wasm needs `vite.assetsInclude` in astro.config.mjs to be inlined.
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?inline';
import kollektifBold from '../assets/fonts/kollektif/Kollektif-Bold.ttf?inline';
import kollektifRegular from '../assets/fonts/kollektif/Kollektif.ttf?inline';
import logo from '../images/logo.png?inline';
import type { ShareImageAssets } from './share-image.ts';

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Buffer.from(base64, 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

let assets: ShareImageAssets | null = null;

/** Decoded once per server instance. */
export function loadShareImageAssets(): ShareImageAssets {
  assets ??= {
    regular: dataUrlToArrayBuffer(kollektifRegular),
    bold: dataUrlToArrayBuffer(kollektifBold),
    logoDataUrl: logo,
    wasm: dataUrlToArrayBuffer(resvgWasm),
  };
  return assets;
}

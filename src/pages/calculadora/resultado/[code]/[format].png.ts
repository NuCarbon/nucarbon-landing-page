// Share image of a shared result: /calculadora/resultado/<code>/{og,story}.png. The server
// recomputes the footprint from the decoded answers, so an image can't claim a forged total.
export const prerender = false;

import type { APIRoute } from 'astro';
import { setDeterministicCacheHeaders } from '../../../../lib/cache';
import { calculateFootprint } from '../../../../lib/calculator/calculate';
import { decodeShareCode, isShareImageFormat } from '../../../../lib/calculator/share';
import { renderShareImagePng, shareImageView } from '../../../../server/share-image';
import { loadShareImageAssets } from '../../../../server/share-image-assets';

const noStore = (status: number) =>
  new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ params }) => {
  const answers = decodeShareCode(params.code);
  const { format } = params;
  if (!answers || !isShareImageFormat(format)) return noStore(404);

  try {
    const view = shareImageView(calculateFootprint(answers));
    const png = await renderShareImagePng(view, format, loadShareImageAssets());
    const headers = new Headers({ 'Content-Type': 'image/png' });
    setDeterministicCacheHeaders(headers);
    return new Response(png, { headers });
  } catch (error) {
    console.error('Share image rendering failed', error);
    return noStore(500);
  }
};

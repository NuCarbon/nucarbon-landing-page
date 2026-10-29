// The /calculadora social card: the generic share image, rendered once at build time.
import type { APIRoute } from 'astro';
import { renderShareImagePng, shareImageView } from '../../server/share-image';
import { loadShareImageAssets } from '../../server/share-image-assets';

export const GET: APIRoute = async () => {
  const png = await renderShareImagePng(shareImageView(null), 'og', loadShareImageAssets());
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};

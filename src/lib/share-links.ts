// Share targets for the calculator result: UTM-tagged links and the networks' share URLs.
import { formatTonnes } from './format.ts';

/** Every way a visitor can share a result; also the `utm_source` and the analytics `method`. */
export type ShareMethod =
  | 'whatsapp'
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'telegram'
  | 'instagram_stories'
  | 'native'
  | 'copy_link'
  | 'download';

/** Networks reached through a share URL in a new tab. */
export type ShareNetwork = Extract<
  ShareMethod,
  'whatsapp' | 'x' | 'facebook' | 'linkedin' | 'telegram'
>;

/** Adds the calculator share UTM tags, keeping any other query parameters and the hash. */
export function withShareUtm(url: string | URL, method: ShareMethod): string {
  const tagged = new URL(url);
  tagged.searchParams.set('utm_source', method);
  tagged.searchParams.set('utm_medium', 'social');
  tagged.searchParams.set('utm_campaign', 'calculator_share');
  return tagged.toString();
}

/** "Minha pegada de carbono estimada é de 4,8 tCO₂e por ano. Calcule a sua:" */
export function shareMessage(total: number): string {
  return `Minha pegada de carbono estimada é de ${formatTonnes(total)} tCO₂e por ano. Calcule a sua:`;
}

/** The network's share dialog for `url`, prefilled with `text` where the network supports it. */
export function socialShareHref(network: ShareNetwork, url: string, text: string): string {
  switch (network) {
    case 'whatsapp':
      return withParams('https://wa.me/', { text: `${text} ${url}` });
    case 'x':
      return withParams('https://x.com/intent/post', { text, url });
    case 'facebook':
      return withParams('https://www.facebook.com/sharer/sharer.php', { u: url });
    case 'linkedin':
      return withParams('https://www.linkedin.com/sharing/share-offsite/', { url });
    case 'telegram':
      return withParams('https://t.me/share/url', { url, text });
  }
}

function withParams(base: string, params: Record<string, string>): string {
  const href = new URL(base);
  for (const [key, value] of Object.entries(params)) href.searchParams.set(key, value);
  return href.toString();
}

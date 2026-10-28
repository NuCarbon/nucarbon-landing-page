// Share targets for the calculator result: UTM-tagged links and the networks' share URLs.
// Implemented by workstream A; signatures are the contract used by the share modal.

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

export function withShareUtm(_url: string | URL, _method: ShareMethod): string {
  throw new Error('Not implemented');
}

export function shareMessage(_total: number): string {
  throw new Error('Not implemented');
}

export function socialShareHref(_network: ShareNetwork, _url: string, _text: string): string {
  throw new Error('Not implemented');
}

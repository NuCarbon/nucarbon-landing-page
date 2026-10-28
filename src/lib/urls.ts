/**
 * Accepts only same-origin absolute paths ("/app", "/projetos/x?y=1"), so a
 * returnTo query parameter can never redirect to another site.
 */
export function safeReturnTo(raw: string | null | undefined, fallback = '/app'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }
  try {
    const url = new URL(raw, 'https://nucarbon.invalid');
    return url.origin === 'https://nucarbon.invalid'
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

/** The sign-in page, sending the visitor to `returnTo` afterwards. */
export const loginPath = (returnTo: string) => `/entrar?returnTo=${encodeURIComponent(returnTo)}`;

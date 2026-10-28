// Cache headers shared by SSR pages and endpoints.

/**
 * For responses that are a pure function of the URL within a deploy (shared result pages and
 * their images). Browsers keep them for a day; Netlify's durable CDN cache keeps them for a
 * year, which is safe because every deploy purges it. Never use it for error responses.
 */
export function setDeterministicCacheHeaders(headers: Headers): void {
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=31536000');
}

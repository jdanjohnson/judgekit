/**
 * Safe fetch wrapper that works when the page is loaded via a URL with
 * embedded basic-auth credentials (e.g. https://user:pass@host/).
 *
 * Browsers block `fetch("/api/...")` in that scenario because the
 * Request constructor rejects URLs that "include credentials".
 * We work around it by building an absolute URL from
 * `location.protocol + "//" + location.host` which naturally strips
 * the userinfo component.
 */
export function safeFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  return fetch(`${base}${path}`, init);
}

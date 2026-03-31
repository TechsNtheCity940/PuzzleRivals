const PRODUCTION_CANONICAL_ORIGIN = "https://www.puzzlerivals.com";
const RELATED_PRODUCTION_HOSTS = new Set(["puzzlerivals.com", "www.puzzlerivals.com"]);

function safeUrl(raw: string) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function resolveAppOrigin(rawOrigin?: string) {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : PRODUCTION_CANONICAL_ORIGIN;
  const origin = rawOrigin ?? fallbackOrigin;
  const url = safeUrl(origin);
  if (!url) {
    return fallbackOrigin;
  }

  if (RELATED_PRODUCTION_HOSTS.has(url.hostname)) {
    return PRODUCTION_CANONICAL_ORIGIN;
  }

  return url.origin;
}

export function buildAppUrl(path = "/", rawOrigin?: string) {
  return new URL(path, resolveAppOrigin(rawOrigin)).toString();
}

export function resolveCanonicalBrowserUrl(rawHref?: string) {
  if (typeof window === "undefined" && !rawHref) {
    return PRODUCTION_CANONICAL_ORIGIN;
  }

  const href = rawHref ?? window.location.href;
  const url = safeUrl(href);
  if (!url) {
    return href;
  }

  if (RELATED_PRODUCTION_HOSTS.has(url.hostname)) {
    url.protocol = "https:";
    url.hostname = "www.puzzlerivals.com";
    return url.toString();
  }

  return href;
}

export function shouldRedirectToCanonical(rawHref?: string) {
  const href = rawHref ?? (typeof window !== "undefined" ? window.location.href : PRODUCTION_CANONICAL_ORIGIN);
  return resolveCanonicalBrowserUrl(href) !== href;
}

export { PRODUCTION_CANONICAL_ORIGIN };

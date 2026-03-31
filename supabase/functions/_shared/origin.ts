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
  const origin = rawOrigin ?? PRODUCTION_CANONICAL_ORIGIN;
  const url = safeUrl(origin);
  if (!url) {
    return PRODUCTION_CANONICAL_ORIGIN;
  }

  if (RELATED_PRODUCTION_HOSTS.has(url.hostname)) {
    return PRODUCTION_CANONICAL_ORIGIN;
  }

  return url.origin;
}
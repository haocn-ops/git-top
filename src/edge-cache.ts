const canonicalOrigin = "https://git.top";

export interface PublicEdgeCacheOptions {
  browserTtlSeconds?: number;
  edgeTtlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
}

export async function cachedPublicResponse(
  request: Request,
  ctx: ExecutionContext | undefined,
  load: () => Promise<Response>,
  options: PublicEdgeCacheOptions = {}
): Promise<Response> {
  const cacheControl = publicCacheControl(options);
  if (request.method !== "GET" || !ctx || typeof caches === "undefined") {
    return withCacheControl(await load(), cacheControl);
  }

  const cache = (caches as CacheStorage & { default: Cache }).default;
  const cacheKey = canonicalEdgeCacheRequest(request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const response = new Response(cached.body, cached);
    response.headers.set("cache-control", cacheControl);
    response.headers.set("x-git-top-cache", "hit");
    return response;
  }

  const response = withCacheControl(await load(), cacheControl);
  if (!response.ok || response.headers.has("set-cookie")) {
    return response;
  }

  response.headers.set("x-git-top-cache", "miss");
  ctx.waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
  return response;
}

export async function matchCachedPublicJson<T>(path: string): Promise<T | null> {
  if (typeof caches === "undefined") {
    return null;
  }

  const cache = (caches as CacheStorage & { default: Cache }).default;
  const request = canonicalEdgeCacheRequest(new Request(new URL(path, canonicalOrigin)));
  const response = await cache.match(request);
  if (!response?.ok) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function canonicalEdgeCacheRequest(request: Request): Request {
  const source = new URL(request.url);
  const cacheUrl = new URL(`${source.pathname}${source.search}`, canonicalOrigin);
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function publicCacheControl(options: PublicEdgeCacheOptions): string {
  const browserTtl = boundedTtl(options.browserTtlSeconds, 30);
  const edgeTtl = boundedTtl(options.edgeTtlSeconds, 300);
  const staleTtl = boundedTtl(options.staleWhileRevalidateSeconds, 1_800);
  return `public, max-age=${browserTtl}, s-maxage=${edgeTtl}, stale-while-revalidate=${staleTtl}`;
}

function boundedTtl(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(86_400, Math.trunc(value!)));
}

function withCacheControl(response: Response, cacheControl: string): Response {
  const result = new Response(response.body, response);
  result.headers.set("cache-control", cacheControl);
  return result;
}

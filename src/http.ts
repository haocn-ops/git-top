export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", headers.get("cache-control") ?? "public, max-age=60");

  return new Response(JSON.stringify(toApiShape(data), null, 2), {
    ...init,
    headers
  });
}

export function stringifyApiJson(data: unknown): string {
  return JSON.stringify(toApiShape(data), null, 2);
}

export function rawJson(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", headers.get("cache-control") ?? "public, max-age=300");

  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers
  });
}

export function errorJson(status: number, code: string, message: string): Response {
  return json(
    {
      error: {
        code,
        message
      }
    },
    {
      status,
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}

export function parseBool(value: string | null): boolean | undefined {
  if (value === null || value === "") {
    return undefined;
  }
  if (["1", "true", "yes"].includes(value.toLowerCase())) {
    return true;
  }
  if (["0", "false", "no"].includes(value.toLowerCase())) {
    return false;
  }
  return undefined;
}

export function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toApiShape(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toApiShape);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[toSnakeCase(key)] = toApiShape(nestedValue);
  }
  return output;
}

function toSnakeCase(value: string): string {
  const knownKeys: Record<string, string> = {
    stars30dDelta: "stars_30d_delta",
    commits30d: "commits_30d",
    releases180d: "releases_180d",
    contributors90d: "contributors_90d",
    releaseFrequency180d: "release_frequency_180d"
  };

  if (knownKeys[value]) {
    return knownKeys[value];
  }

  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

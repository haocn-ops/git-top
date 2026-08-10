export async function requestJsonWithRetry({
  path,
  init,
  baseUrls,
  maxRetries,
  timeoutMs,
  baseDelayMs = 2_000,
  maxDelayMs = 30_000,
  fetchImpl = fetch,
  sleep = delay,
  onRetry = () => {}
}) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const baseUrl = baseUrls[(attempt - 1) % baseUrls.length];
    try {
      return await requestJson({ path, init, baseUrl, timeoutMs, fetchImpl });
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isRetryableRequestError(error)) {
        throw error;
      }
      const delayMs = retryDelayMs({ attempt, baseDelayMs, maxDelayMs, retryAfterMs: error.retryAfterMs });
      onRetry({ attempt, nextAttempt: attempt + 1, maxRetries, baseUrl, delayMs, error });
      await sleep(delayMs);
    }
  }
  throw lastError ?? new Error(`Request failed for ${path}`);
}

export async function requestJson({ path, init, baseUrl, timeoutMs, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new ProductionHttpError(
        `Request failed for ${path} with HTTP ${response.status}: ${responsePreview(text)}`,
        {
          status: response.status,
          retryAfterMs: parseRetryAfter(response.headers.get("retry-after"))
        }
      );
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new ProductionHttpError(`Expected JSON from ${path}, got HTTP ${response.status}: ${text.slice(0, 200)}`, {
        status: response.status,
        retryable: false
      });
    }
  } finally {
    clearTimeout(timeout);
  }
}

export class ProductionHttpError extends Error {
  constructor(message, { status, retryAfterMs, retryable } = {}) {
    super(message);
    this.name = "ProductionHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.retryable = retryable;
  }
}

export function isRetryableRequestError(error) {
  if (error?.retryable === false) {
    return false;
  }
  if (error?.name === "AbortError" || error instanceof TypeError) {
    return true;
  }
  const status = Number(error?.status);
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function retryDelayMs({ attempt, baseDelayMs, maxDelayMs, retryAfterMs }) {
  const backoffMs = baseDelayMs * 2 ** (attempt - 1);
  const requestedDelayMs = Number.isFinite(retryAfterMs) ? Math.max(backoffMs, retryAfterMs) : backoffMs;
  return Math.min(requestedDelayMs, maxDelayMs);
}

export function parseRetryAfter(value, nowMs = Date.now()) {
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - nowMs) : undefined;
}

function responsePreview(text) {
  if (!text) {
    return "empty response";
  }
  try {
    return JSON.stringify(JSON.parse(text)).slice(0, 300);
  } catch {
    return text.replace(/\s+/g, " ").trim().slice(0, 200);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

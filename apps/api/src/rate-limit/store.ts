const store = new Map<string, { count: number; windowStart: number }>();

let enabled = true;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowSec: number,
): RateLimitResult {
  if (!enabled) {
    return { allowed: true, limit: max, remaining: max, resetAt: Date.now() + windowSec * 1000 };
  }

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowSec * 1000) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      limit: max,
      remaining: max - 1,
      resetAt: now + windowSec * 1000,
    };
  }

  entry.count++;

  if (entry.count > max) {
    return {
      allowed: false,
      limit: max,
      remaining: 0,
      resetAt: entry.windowStart + windowSec * 1000,
    };
  }

  return {
    allowed: true,
    limit: max,
    remaining: max - entry.count,
    resetAt: entry.windowStart + windowSec * 1000,
  };
}

export function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 120_000) {
      store.delete(key);
    }
  }
}

export function startCleanup() {
  return setInterval(cleanupExpiredEntries, 60_000);
}

export function resetStore() {
  store.clear();
}

export function setEnabled(value: boolean) {
  enabled = value;
}

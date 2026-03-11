export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var rateLimits: Map<string, RateEntry> | undefined;
}

const store = global.rateLimits || new Map<string, RateEntry>();
if (!global.rateLimits) global.rateLimits = store;

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  store.set(key, entry);
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

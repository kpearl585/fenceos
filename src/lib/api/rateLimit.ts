type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __fenceRateLimitStore?: Map<string, RateLimitEntry>;
};

function getStore() {
  if (!globalStore.__fenceRateLimitStore) {
    globalStore.__fenceRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return globalStore.__fenceRateLimitStore;
}

function cleanupExpiredEntries(now: number) {
  const store = getStore();
  for (const [key, entry] of Array.from(store.entries())) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function takeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

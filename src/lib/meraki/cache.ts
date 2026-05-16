/**
 * Per-process TTL cache for Meraki API responses.
 *
 * Meraki rate-limits at 10 req/s per org. Many endpoints (orgs, networks,
 * device statuses) change rarely — caching them in-memory eliminates the
 * 429 storm that comes from every browser tab re-fetching on mount.
 *
 * In-process only (not Redis-backed). Survives within a Next.js dev server
 * session; cleared on rebuild.
 */

type Entry<T> = {
  value: T;
  expires: number;
  inflight?: Promise<T>;
};

// Anchor the store on globalThis so HMR module replacement in dev doesn't
// wipe the cache on every edit. In production this just acts like a normal Map.
const globalRef = globalThis as unknown as {
  __merakiCache?: Map<string, Entry<unknown>>;
};
const store = globalRef.__merakiCache ?? new Map<string, Entry<unknown>>();
globalRef.__merakiCache = store;

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && hit.expires > now) {
    console.log(`[cache] hit ${key} (expires in ${Math.round((hit.expires - now) / 1000)}s)`);
    return hit.value;
  }

  // Coalesce concurrent misses on the same key so we make a single upstream call
  if (hit?.inflight) {
    console.log(`[cache] coalesce ${key}`);
    return hit.inflight;
  }

  console.log(`[cache] miss ${key} — calling upstream`);

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      // On failure: drop the inflight marker but keep the stale entry, if any,
      // so other callers can serve stale rather than all failing together.
      const existing = store.get(key) as Entry<T> | undefined;
      if (existing) {
        store.set(key, { value: existing.value, expires: existing.expires });
      } else {
        store.delete(key);
      }
      throw err;
    });

  // Mark the entry as inflight without losing any stale value
  store.set(key, {
    value: (hit?.value as T) ?? (undefined as unknown as T),
    expires: hit?.expires ?? 0,
    inflight: promise,
  });

  return promise;
}

export function invalidate(key: string): void {
  store.delete(key);
}

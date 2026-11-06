/*
|--------------------------------------------------------------------------
| SHARED API CACHE (fewer calls to the server)
|--------------------------------------------------------------------------
|
| Several screens need the same data (purchases, catalog, points...) and
| reload it each time they are opened. With this module:
|
|  - cached(key, loader, { ttl })   the same data is reused during "ttl"
|                                   (30 s by default) by ALL the screens
|  - the same call already running is shared (never sent twice at once)
|  - errors are never kept: the next call tries again
|  - throttled(key, fn, { ttl })    runs fn at most once per "ttl"
|                                   (e.g. customer data refresh on focus)
|  - invalidateApiCache()           after an action that changes the data
|                                   (payment, planning, pet saved...)
|  - force: true                    pull to refresh: always a new call
|
*/

type Entry = { at: number; value: unknown };

export const DEFAULT_TTL_MS = 30 * 1000;

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const lastRun = new Map<string, number>();

// Changes on every invalidation: a call started before it is not kept
let generation = 0;

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  options: { ttl?: number; force?: boolean } = {}
): Promise<T> {
  const ttl = options.ttl ?? DEFAULT_TTL_MS;
  const entry = store.get(key);

  if (!options.force && entry && Date.now() - entry.at < ttl) {
    return entry.value as T;
  }

  const running = inflight.get(key);
  if (running) {
    return running as Promise<T>;
  }

  const startedAt = generation;

  const promise = (async () => {
    try {
      const value = await loader();

      if (startedAt === generation) {
        store.set(key, { at: Date.now(), value });
      }

      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);

  return promise;
}

/** Runs fn at most once per ttl (shared by all the screens). */
export async function throttled(
  key: string,
  fn: () => Promise<unknown> | unknown,
  options: { ttl?: number; force?: boolean } = {}
): Promise<void> {
  const ttl = options.ttl ?? DEFAULT_TTL_MS;
  const last = lastRun.get(key) ?? 0;

  if (!options.force && Date.now() - last < ttl) {
    return;
  }

  lastRun.set(key, Date.now());

  try {
    await fn();
  } catch (error) {
    // Failed: can run again at once
    lastRun.delete(key);
    throw error;
  }
}

/**
 * Data changed (payment, planning, pet saved, logout...): the next
 * call of each screen goes to the server again.
 * prefix: only the keys starting with it ("purchases:" ...).
 */
export function invalidateApiCache(prefix?: string): void {
  generation++;

  if (!prefix) {
    store.clear();
    lastRun.clear();
    return;
  }

  Array.from(store.keys()).forEach(key => {
    if (key.startsWith(prefix)) store.delete(key);
  });

  Array.from(lastRun.keys()).forEach(key => {
    if (key.startsWith(prefix)) lastRun.delete(key);
  });
}
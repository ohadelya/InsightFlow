const MAX_CACHE_ENTRIES = 40;
const ENTRY_TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  expiry: number;
  payload: unknown;
};

const cache = new Map<string, CacheEntry>();

export function getCachedAnalysis(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

export function setCachedAnalysis(key: string, payload: unknown) {
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) break;
    cache.delete(firstKey);
  }
  cache.set(key, { expiry: Date.now() + ENTRY_TTL_MS, payload });
}

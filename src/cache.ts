import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "weather-cache.json");

type CacheEntry<T> = {
  savedAt: number;
  value: T;
};

type CacheStore = {
  entries: Record<string, CacheEntry<unknown>>;
};

async function readCacheFile(): Promise<CacheStore> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<CacheStore>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.entries !== "object") {
      return { entries: {} };
    }
    return { entries: parsed.entries as Record<string, CacheEntry<unknown>> };
  } catch {
    return { entries: {} };
  }
}

async function writeCacheFile(cache: CacheStore): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function makeKey(parts: Array<string | number>): string {
  return parts.join("::").toLowerCase();
}

async function getCachedValue<T>(key: string, ttlMs: number): Promise<T | null> {
  const cache = await readCacheFile();
  const entry = cache.entries[key];

  if (!entry) {
    return null;
  }

  if (typeof entry.savedAt !== "number") {
    delete cache.entries[key];
    await writeCacheFile(cache);
    return null;
  }

  if (Date.now() - entry.savedAt > ttlMs) {
    delete cache.entries[key];
    await writeCacheFile(cache);
    return null;
  }

  return entry.value as T;
}

async function setCachedValue<T>(key: string, value: T): Promise<void> {
  const cache = await readCacheFile();
  cache.entries[key] = {
    savedAt: Date.now(),
    value
  };
  await writeCacheFile(cache);
}

export { getCachedValue, makeKey, setCachedValue };

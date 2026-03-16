import fs from "node:fs/promises";
import path from "node:path";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "weather-cache.json");
async function readCacheFile() {
    try {
        const raw = await fs.readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || typeof parsed.entries !== "object") {
            return { entries: {} };
        }
        return { entries: parsed.entries };
    }
    catch {
        return { entries: {} };
    }
}
async function writeCacheFile(cache) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}
function makeKey(parts) {
    return parts.join("::").toLowerCase();
}
async function getCachedValue(key, ttlMs) {
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
    return entry.value;
}
async function setCachedValue(key, value) {
    const cache = await readCacheFile();
    cache.entries[key] = {
        savedAt: Date.now(),
        value
    };
    await writeCacheFile(cache);
}
export { getCachedValue, makeKey, setCachedValue };

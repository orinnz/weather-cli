import fs from "node:fs/promises";
import path from "node:path";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const FAVORITES_FILE = path.join(CACHE_DIR, "favorites.json");
async function readFavorites() {
    try {
        const raw = await fs.readFile(FAVORITES_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || typeof parsed.aliases !== "object") {
            return { aliases: {} };
        }
        return { aliases: parsed.aliases };
    }
    catch {
        return { aliases: {} };
    }
}
async function writeFavorites(store) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(FAVORITES_FILE, JSON.stringify(store, null, 2), "utf8");
}
function normalizeAlias(alias) {
    return alias.trim().toLowerCase();
}
async function saveFavorite(alias, location) {
    const store = await readFavorites();
    store.aliases[normalizeAlias(alias)] = location.trim();
    await writeFavorites(store);
}
async function removeFavorite(alias) {
    const store = await readFavorites();
    const key = normalizeAlias(alias);
    if (!(key in store.aliases)) {
        return false;
    }
    delete store.aliases[key];
    await writeFavorites(store);
    return true;
}
async function listFavorites() {
    const store = await readFavorites();
    return Object.entries(store.aliases)
        .map(([alias, location]) => ({ alias, location }))
        .sort((a, b) => a.alias.localeCompare(b.alias));
}
async function resolveFavorite(aliasOrLocation) {
    const store = await readFavorites();
    const key = normalizeAlias(aliasOrLocation);
    return store.aliases[key] ?? aliasOrLocation;
}
export { listFavorites, removeFavorite, resolveFavorite, saveFavorite };

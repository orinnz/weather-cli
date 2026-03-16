import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const FAVORITES_FILE = path.join(CACHE_DIR, "favorites.json");

type FavoritesStore = {
  aliases: Record<string, string>;
};

async function readFavorites(): Promise<FavoritesStore> {
  try {
    const raw = await fs.readFile(FAVORITES_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<FavoritesStore>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.aliases !== "object") {
      return { aliases: {} };
    }
    return { aliases: parsed.aliases as Record<string, string> };
  } catch {
    return { aliases: {} };
  }
}

async function writeFavorites(store: FavoritesStore): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(FAVORITES_FILE, JSON.stringify(store, null, 2), "utf8");
}

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

async function saveFavorite(alias: string, location: string): Promise<void> {
  const store = await readFavorites();
  store.aliases[normalizeAlias(alias)] = location.trim();
  await writeFavorites(store);
}

async function removeFavorite(alias: string): Promise<boolean> {
  const store = await readFavorites();
  const key = normalizeAlias(alias);
  if (!(key in store.aliases)) {
    return false;
  }

  delete store.aliases[key];
  await writeFavorites(store);
  return true;
}

async function listFavorites(): Promise<Array<{ alias: string; location: string }>> {
  const store = await readFavorites();
  return Object.entries(store.aliases)
    .map(([alias, location]) => ({ alias, location }))
    .sort((a, b) => a.alias.localeCompare(b.alias));
}

async function resolveFavorite(aliasOrLocation: string): Promise<string> {
  const store = await readFavorites();
  const key = normalizeAlias(aliasOrLocation);
  return store.aliases[key] ?? aliasOrLocation;
}

export { listFavorites, removeFavorite, resolveFavorite, saveFavorite };

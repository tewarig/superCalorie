import type { Food } from "@supercalorie/core";
import { foods } from "../repo";
import { searchOpenFoodFacts } from "./openfoodfacts";
import { searchUsda } from "./usda";

/**
 * Food search across three sources, in descending order of usefulness for
 * this app:
 *
 *   1. the curated library — instant, offline, and the only source that
 *      covers home-cooked dishes like dal tadka or masala dosa;
 *   2. USDA — lab-analysed, best for generic whole foods;
 *   3. Open Food Facts — label data, best for packaged and branded products.
 *
 * Remote results are cached into the local table on first sight, so a food
 * is only ever fetched once and every later search for it is offline.
 */

/**
 * If the library already answers the query well, don't call anyone. This is
 * what keeps typing "ban" from firing two API requests per keystroke — the
 * common case never leaves the process.
 */
const LOCAL_RESULTS_ARE_ENOUGH = 5;

/** Remote search is a nicety; the local list must not wait long for it. */
const REMOTE_TIMEOUT_MS = 4000;

export interface SearchOutcome {
  foods: Food[];
  /** Providers that failed or timed out, so the UI can say so honestly. */
  degraded: string[];
}

export async function searchAllSources(query: string, limit = 20): Promise<SearchOutcome> {
  const local = foods.search(query, limit);
  if (local.length >= LOCAL_RESULTS_ARE_ENOUGH) {
    return { foods: local.slice(0, limit), degraded: [] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);

  // Settled, not `all` — one provider being down must not lose the other's
  // results, nor the local ones we already have.
  const [usda, off] = await Promise.allSettled([
    searchUsda(query, controller.signal),
    searchOpenFoodFacts(query, controller.signal),
  ]).finally(() => clearTimeout(timer));

  const degraded: string[] = [];
  if (usda.status === "rejected") degraded.push("usda");
  if (off.status === "rejected") degraded.push("off");

  const remote = [
    ...(usda.status === "fulfilled" ? usda.value : []),
    ...(off.status === "fulfilled" ? off.value : []),
  ];

  const merged = [...local];
  const seen = new Set(local.map((food) => normalise(food.name)));

  for (const candidate of remote) {
    if (!isRelevant(candidate.name, query)) continue;

    const key = normalise(candidate.name);
    if (seen.has(key)) continue;
    seen.add(key);

    // `candidate.id` is "usda:<fdcId>" or "off:<barcode>"; the local row gets
    // a real uuid, which is what the rest of the app works with.
    const [, externalId] = splitProviderId(candidate.id);
    merged.push(foods.cacheRemote({ ...candidate, externalId }));

    if (merged.length >= limit) break;
  }

  return { foods: merged, degraded };
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Open Food Facts ranks on more than the product name — searching "dal"
 * returns an Italian biscuit, presumably matched via its ingredients. The
 * name has to actually contain a word the user typed, or the result is
 * noise sitting above genuinely useful hits.
 *
 * Short tokens are ignored so "of"/"a" can't wave anything through.
 */
function isRelevant(name: string, query: string): boolean {
  const haystack = normalise(name);
  const tokens = normalise(query)
    .split(" ")
    .filter((token) => token.length >= 3);

  return tokens.length === 0 || tokens.some((token) => haystack.includes(token));
}

function splitProviderId(id: string): [string, string] {
  const separator = id.indexOf(":");
  return separator === -1 ? ["library", id] : [id.slice(0, separator), id.slice(separator + 1)];
}

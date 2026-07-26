import type { Food } from "@supercalorie/core";
import { fetchJson } from "./fetch-json";

/**
 * Open Food Facts — crowd-sourced from product labels. No API key. Strong
 * on packaged goods worldwide, including Indian brands, and the same ids are
 * barcodes, so this is what a scanner would eventually query.
 *
 * The numbers come off the packaging rather than a lab, so treat them as
 * "what the label claims" and surface that provenance in the UI.
 */
const ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";

// Open Food Facts asks that clients identify themselves.
const USER_AGENT = "superCalorie/0.1 (https://github.com/tewarig/superCalorie)";

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(value: number | string | undefined): number {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? Math.round(parsed as number) : 0;
}

export async function searchOpenFoodFacts(query: string, signal: AbortSignal): Promise<Food[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "12");
  url.searchParams.set(
    "fields",
    "code,product_name,brands,serving_size,nutriments",
  );

  const body = await fetchJson<{ products?: OffProduct[] }>(url, signal, {
    "User-Agent": USER_AGENT,
  });

  return (body.products ?? [])
    .filter((product) => {
      const calories = num(product.nutriments?.["energy-kcal_100g"]);
      // Plenty of entries are barely-filled stubs; a product with no name or
      // no energy value is noise in a search list.
      return Boolean(product.code) && Boolean(product.product_name?.trim()) && calories > 0;
    })
    .map((product) => ({
      id: `off:${product.code}`,
      name: product.product_name!.trim(),
      servingLabel: "100 g",
      calories: num(product.nutriments?.["energy-kcal_100g"]),
      protein: num(product.nutriments?.["proteins_100g"]),
      carbs: num(product.nutriments?.["carbohydrates_100g"]),
      fat: num(product.nutriments?.["fat_100g"]),
      source: "off" as const,
      brand: product.brands?.split(",")[0]?.trim() || undefined,
    }));
}

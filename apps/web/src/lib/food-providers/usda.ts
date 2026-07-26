import type { Food } from "@supercalorie/core";
import { fetchJson } from "./fetch-json";

/**
 * USDA FoodData Central — lab-analysed data, the authoritative source for
 * generic whole foods ("chicken breast", "banana", "rolled oats").
 *
 * DEMO_KEY works without signing up but is rate limited to roughly 30
 * requests an hour per IP, so a real deployment should set USDA_API_KEY
 * (free, instant, from api.data.gov).
 */
const ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";

/** Foundation and SR Legacy are the curated sets; Branded is OFF's job. */
const DATA_TYPES = "Foundation,SR Legacy";

interface UsdaNutrient {
  nutrientName: string;
  unitName: string;
  value: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaNutrient[];
}

/**
 * USDA reports Energy twice — once in kcal and once in kJ — under the same
 * nutrient name. Matching on the name alone silently picks whichever came
 * last, which is how you end up with calories inflated 4.184x.
 */
function nutrient(food: UsdaFood, name: string, unit: string): number {
  const match = food.foodNutrients?.find(
    (item) => item.nutrientName === name && item.unitName?.toUpperCase() === unit,
  );
  return Math.round(match?.value ?? 0);
}

export async function searchUsda(query: string, signal: AbortSignal): Promise<Food[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("dataType", DATA_TYPES);
  url.searchParams.set("api_key", process.env.USDA_API_KEY ?? "DEMO_KEY");

  const body = await fetchJson<{ foods?: UsdaFood[] }>(url, signal);

  return (body.foods ?? []).map((food) => ({
    id: `usda:${food.fdcId}`,
    // USDA descriptions are comma-inverted ("Bananas, raw"); leave them as
    // they are so the wording still matches what the source actually says.
    name: food.description,
    // Every value in these datasets is per 100 g.
    servingLabel: "100 g",
    calories: nutrient(food, "Energy", "KCAL"),
    protein: nutrient(food, "Protein", "G"),
    carbs: nutrient(food, "Carbohydrate, by difference", "G"),
    fat: nutrient(food, "Total lipid (fat)", "G"),
    source: "usda" as const,
  }));
}

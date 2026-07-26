import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as searchFoods } from "@/app/api/foods/route";
import { call, createAccount, getRequest } from "./helpers";

/**
 * Provider behaviour, with USDA and Open Food Facts stubbed. The global
 * `fetch` stub in setup.ts rejects by default; each test here replaces it
 * with exactly the responses it wants, so nothing depends on either service
 * being reachable or on their data staying the same.
 */

function stubProviders(handlers: {
  usda?: () => Response | Promise<Response>;
  off?: () => Response | Promise<Response>;
}) {
  vi.mocked(fetch).mockImplementation((async (input: unknown) => {
    const url = String(input);
    if (url.includes("nal.usda.gov")) {
      if (!handlers.usda) throw new Error("USDA unavailable");
      return handlers.usda();
    }
    if (url.includes("openfoodfacts.org")) {
      if (!handlers.off) throw new Error("Open Food Facts unavailable");
      return handlers.off();
    }
    throw new Error(`Unexpected call to ${url}`);
  }) as typeof fetch);
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

/** A USDA hit that includes Energy twice, in kcal and kJ, as the real API does. */
const usdaBody = {
  foods: [
    {
      fdcId: 999001,
      description: "Kale, raw",
      foodNutrients: [
        { nutrientName: "Energy", unitName: "kJ", value: 146 },
        { nutrientName: "Energy", unitName: "KCAL", value: 35 },
        { nutrientName: "Protein", unitName: "G", value: 3 },
        { nutrientName: "Carbohydrate, by difference", unitName: "G", value: 4 },
        { nutrientName: "Total lipid (fat)", unitName: "G", value: 1 },
      ],
    },
  ],
};

const offBody = {
  products: [
    {
      code: "1234567890",
      product_name: "Kale Crisps",
      brands: "SnackCo, Other",
      nutriments: {
        "energy-kcal_100g": 450,
        proteins_100g: 9,
        carbohydrates_100g: 40,
        fat_100g: 28,
      },
    },
    // Missing energy — a stub entry that should be filtered out.
    { code: "222", product_name: "Mystery Item", nutriments: {} },
  ],
};

async function search(query: string, token: string) {
  const response = await call(searchFoods, getRequest(`/api/foods?q=${query}`, token));
  return response.json();
}

afterEach(() => vi.mocked(fetch).mockReset());

describe("food search across providers", () => {
  it("takes kcal, not kJ, when USDA reports Energy twice", async () => {
    const { token } = await createAccount("kcal@example.com");
    stubProviders({ usda: () => json(usdaBody) });

    const { foods } = await search("kale", token);
    const kale = foods.find((food: { name: string }) => food.name === "Kale, raw");

    // 35 kcal, not the 146 kJ sitting under the same nutrient name.
    expect(kale).toMatchObject({ calories: 35, protein: 3, source: "usda", servingLabel: "100 g" });
  });

  it("keeps library results ahead of remote ones and drops stub products", async () => {
    const { token } = await createAccount("order@example.com");
    stubProviders({ usda: () => json(usdaBody), off: () => json(offBody) });

    const { foods, degraded } = await search("kale", token);

    expect(degraded).toEqual([]);
    expect(foods.some((f: { name: string }) => f.name === "Kale Crisps")).toBe(true);
    // The product with no energy value is noise, not a choice worth showing.
    expect(foods.some((f: { name: string }) => f.name === "Mystery Item")).toBe(false);
  });

  it("filters remote hits that don't actually match the query", async () => {
    const { token } = await createAccount("relevance@example.com");
    // Open Food Facts matches on more than the name; searching "dal" really
    // does return Italian biscuits.
    stubProviders({
      off: () =>
        json({
          products: [
            {
              code: "1",
              product_name: "Biscotti Pan di Stelle",
              nutriments: { "energy-kcal_100g": 485 },
            },
            { code: "2", product_name: "Moong Dal", nutriments: { "energy-kcal_100g": 350 } },
          ],
        }),
    });

    const { foods } = await search("dal", token);
    const names = foods.map((f: { name: string }) => f.name);

    expect(names).toContain("Moong Dal");
    expect(names).not.toContain("Biscotti Pan di Stelle");
  });

  it("still returns library results when both providers are down", async () => {
    const { token } = await createAccount("degraded@example.com");
    stubProviders({}); // both reject

    const { foods, degraded } = await search("dosa", token);

    expect(degraded.sort()).toEqual(["off", "usda"]);
    expect(foods.length).toBeGreaterThan(0);
    expect(foods.every((f: { source: string }) => f.source === "library")).toBe(true);
  });

  it("caches a remote food so the next search needs no network", async () => {
    const { token } = await createAccount("cache@example.com");
    stubProviders({ usda: () => json(usdaBody) });
    await search("kale", token);

    const callsAfterFirst = vi.mocked(fetch).mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    // Second time around the food is a local row, so nothing is fetched.
    vi.mocked(fetch).mockImplementation((async () => {
      throw new Error("should not reach the network for a cached food");
    }) as typeof fetch);

    const { foods } = await search("kale", token);
    expect(foods.some((f: { name: string }) => f.name === "Kale, raw")).toBe(true);
  });
});

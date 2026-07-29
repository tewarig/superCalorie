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

it("short-circuits the network when the library already answers well", async () => {
    const { token } = await createAccount("local-enough@example.com");
    stubProviders({});

    // A short query matches plenty of curated foods, so no provider is
    // consulted — this is what stops mid-typing from costing two upstream
    // requests per keystroke. ("chicken" would not do: it matches only four,
    // under the threshold, and does go to the network.)
    const { foods, degraded } = await search("a", token);

    expect(fetch).not.toHaveBeenCalled();
    expect(degraded).toEqual([]);
    expect(foods.length).toBeGreaterThanOrEqual(5);
  });

  it("copes with upstreams that return no results key at all", async () => {
    const { token } = await createAccount("emptybody@example.com");
    stubProviders({ usda: () => json({}), off: () => json({}) });

    // A term with no library match and no cached remote from an earlier test
    // in this file — the database is shared across tests here.
    const { foods, degraded } = await search("quinoberry", token);

    // A 200 with an unexpected shape is not an error, just nothing useful.
    expect(degraded).toEqual([]);
    expect(foods).toEqual([]);
  });

  it("reads Open Food Facts values that arrive as strings", async () => {
    const { token } = await createAccount("stringy@example.com");
    stubProviders({
      off: () =>
        json({
          products: [
            {
              code: "555",
              product_name: "Kale Chips",
              // Open Food Facts is not consistent about number vs string.
              nutriments: { "energy-kcal_100g": "450.4", proteins_100g: "9" },
            },
          ],
        }),
    });

    const { foods } = await search("kale", token);
    const chips = foods.find((f: { name: string }) => f.name === "Kale Chips");

    expect(chips).toMatchObject({ calories: 450, protein: 9 });
  });

  it("treats a USDA food with no nutrients as zeroes rather than NaN", async () => {
    const { token } = await createAccount("nonutrients@example.com");
    stubProviders({
      usda: () => json({ foods: [{ fdcId: 1, description: "Mystery item" }] }),
    });

    const { foods } = await search("mystery", token);
    const mystery = foods.find((f: { name: string }) => f.name === "Mystery item");

    // NaN would propagate into the day's totals and render as "NaN kcal".
    expect(mystery).toMatchObject({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("caps how many results it returns, however many an upstream sends", async () => {
    const { token } = await createAccount("flood@example.com");
    stubProviders({
      off: () =>
        json({
          products: Array.from({ length: 40 }, (_, index) => ({
            code: String(index),
            // A term of its own: these get cached into the shared database,
            // and reusing "kale" would leave a later test finding them
            // locally and never reaching the network it means to assert on.
            product_name: `Floodberry product ${index}`,
            nutriments: { "energy-kcal_100g": 100 + index },
          })),
        }),
    });

    const { foods } = await search("floodberry", token);

    // Unbounded, a chatty upstream would push dozens of near-identical
    // products into a list meant to be scanned in a second.
    expect(foods.length).toBeLessThanOrEqual(20);
  });

  it("abandons a provider that hangs, rather than waiting forever", async () => {
    const { token } = await createAccount("timeout@example.com");

    // A provider that never answers, but does honour the abort signal — the
    // shape of a real upstream that has stopped responding.
    vi.mocked(fetch).mockImplementation(((_url: unknown, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")));
      })) as unknown as typeof fetch);

    vi.useFakeTimers();
    try {
      const pending = search("hangingfood", token);
      // Push past the 4s cap the search gives its providers.
      await vi.advanceTimersByTimeAsync(5000);

      const { degraded, foods } = await pending;

      // Both gave up, and the request still returned instead of hanging the
      // caller's search box indefinitely.
      expect(degraded.sort()).toEqual(["off", "usda"]);
      expect(foods).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
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

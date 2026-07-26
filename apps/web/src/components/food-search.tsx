"use client";

import { MEAL_LABELS, MEAL_TYPES, type Food, type MealType } from "@supercalorie/core";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * The heart of the app: type, see matches, click to log. Results are
 * debounced and the meal defaults to whatever's plausible for the current
 * hour, so logging lunch at 1pm is a single click.
 */
export function FoodSearch({ onLogged }: { onLogged: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [source, setSource] = useState<"search" | "recent">("recent");
  const [meal, setMeal] = useState<MealType>(defaultMealForNow);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const data = await api.searchFoods(query.trim() || undefined);
          if (!cancelled) {
            setResults(data.foods);
            setSource(data.source);
          }
        } catch {
          if (!cancelled) setResults([]);
        }
      },
      query ? 180 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function log(food: Food, quantity: number) {
    setLoggingId(food.id);
    setError(null);
    try {
      await api.logEntry({ foodId: food.id, quantity, meal, date: localDate() });
      setQuery("");
      inputRef.current?.focus();
      onLogged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not log that.");
    } finally {
      setLoggingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-sand bg-white p-6 shadow-[0_20px_50px_-32px_rgba(28,42,36,0.4)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink">Log food</h2>
        <div className="flex gap-1 rounded-full bg-parchment p-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMeal(type)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                meal === type ? "bg-leaf text-cream" : "text-ink-soft hover:text-ink"
              }`}
            >
              {MEAL_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search foods — try “dal”, “banana”, “paneer”…"
        className="mt-4 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-leaf focus:shadow-[0_0_0_3px_var(--mint)]"
      />

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {source === "recent" ? "Your usuals" : `Results for “${query}”`}
      </p>

      <ul className="mt-2 max-h-80 divide-y divide-sand overflow-y-auto">
        {results.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-faint">
            No matches. Anything not here can be added as a custom entry.
          </li>
        )}
        {results.map((food) => (
          <li key={food.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{food.name}</p>
              <p className="text-xs text-ink-faint">
                {food.servingLabel} · {food.calories} kcal · P{food.protein} C{food.carbs} F
                {food.fat}
              </p>
            </div>
            <button
              type="button"
              disabled={loggingId === food.id}
              onClick={() => log(food, 0.5)}
              className="rounded-full border border-sand px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
              title="Log half a serving"
            >
              ½
            </button>
            <button
              type="button"
              disabled={loggingId === food.id}
              onClick={() => log(food, 1)}
              className="rounded-full bg-leaf px-4 py-1.5 text-sm font-semibold text-cream transition-colors hover:bg-leaf-deep disabled:opacity-40"
            >
              {loggingId === food.id ? "…" : "Add"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function defaultMealForNow(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

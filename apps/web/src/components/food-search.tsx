"use client";

import {
  MEAL_LABELS,
  MEAL_TYPES,
  SOURCE_LABELS,
  type Food,
  type MealType,
} from "@supercalorie/core";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [degraded, setDegraded] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // Object URLs have to be released by hand or the blob leaks for the life
  // of the page.
  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const data = await api.searchFoods(query.trim() || undefined);
          if (!cancelled) {
            setResults(data.foods);
            setSource(data.source);
            setDegraded(data.degraded ?? []);
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
      // Upload first: an entry may only reference a photo that already
      // exists, and a failed upload shouldn't silently log without it.
      let photoId: string | undefined;
      if (photo) {
        const form = new FormData();
        form.append("photo", photo);
        photoId = (await api.uploadPhoto(form)).photoId;
      }

      await api.logEntry({ foodId: food.id, quantity, meal, date: localDate(), photoId });
      setQuery("");
      setPhoto(null);
      if (photoRef.current) photoRef.current.value = "";
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

      <div className="mt-3 flex items-center gap-3">
        {/* `capture` makes a phone open the camera; desktop still gets a file picker. */}
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          className="hidden"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-sand px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <span aria-hidden>📷</span>
          {photo ? "Change photo" : "Add photo"}
        </button>

        {photoPreview && (
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview, not a remote asset */}
            <img
              src={photoPreview}
              alt="Selected meal"
              className="h-9 w-9 rounded-lg border border-sand object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                if (photoRef.current) photoRef.current.value = "";
              }}
              className="text-xs font-semibold text-ink-faint underline underline-offset-2 hover:text-ink"
            >
              Remove
            </button>
          </span>
        )}
        {photo && (
          <span className="text-xs text-ink-faint">attaches to the next food you add</span>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {source === "recent" ? "Your usuals" : `Results for “${query}”`}
      </p>

      {degraded.length > 0 && (
        <p className="mt-1 text-xs text-ink-faint">
          {degraded.includes("usda") && degraded.includes("off")
            ? "Both food databases are unreachable — showing saved foods only."
            : `${degraded.includes("usda") ? "USDA" : "Open Food Facts"} is unreachable, so this list is partial.`}
        </p>
      )}

      <ul className="mt-2 max-h-80 divide-y divide-sand overflow-y-auto">
        {results.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-faint">
            Nothing found — try a simpler word, like “rice” rather than a dish name.
          </li>
        )}
        {results.map((food) => (
          <li key={food.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{food.name}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                <span
                  title={
                    food.source === "usda"
                      ? "USDA FoodData Central — lab analysed"
                      : food.source === "off"
                        ? "Open Food Facts — taken from the product label"
                        : "Our curated list — a reasonable estimate"
                  }
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    food.source === "usda"
                      ? "bg-mint text-leaf-deep"
                      : food.source === "off"
                        ? "bg-parchment text-ink-soft"
                        : "bg-tangerine-soft text-tangerine"
                  }`}
                >
                  {SOURCE_LABELS[food.source]}
                </span>
                <span>
                  {food.servingLabel} · {food.calories} kcal · P{food.protein} C{food.carbs} F
                  {food.fat}
                </span>
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

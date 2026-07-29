"use client";

import {
  MEAL_LABELS,
  MEAL_TYPES,
  SOURCE_LABELS,
  defaultMealForHour,
  formatDateLabel,
  macroTargets,
  mostLoggedFoods,
  searchFoods as searchLocalFoods,
  todayISO,
  type Food,
  type MealType,
} from "@supercalorie/core";
import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalorieRing } from "@/components/calorie-ring";
import { DataMenu } from "@/components/data-menu";
import { LocalPhoto } from "@/components/local-photo";
import { Onboarding } from "@/components/onboarding";
import {
  commitConnection,
  getConnection,
  getServerConnection,
  subscribeToConnection,
} from "@/lib/local-store";
import { useTracker } from "@/lib/use-tracker";

const MACROS = [
  { key: "protein", label: "Protein", color: "var(--berry)" },
  { key: "carbs", label: "Carbs", color: "var(--honey)" },
  { key: "fat", label: "Fat", color: "var(--leaf-bright)" },
] as const;

/** Steps a YYYY-MM-DD string by whole days without tripping over timezones. */
function shiftDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return todayISO(date);
}

export function Tracker() {
  // Null until a choice is made; the server render is always null so the
  // onboarding screen never flashes for someone who already chose.
  const connection = useSyncExternalStore(
    subscribeToConnection,
    getConnection,
    getServerConnection,
  );

  const [date, setDate] = useState(todayISO());
  const tracker = useTracker(date);
  const { day, profile } = tracker;

  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState<MealType>(() => defaultMealForHour(new Date().getHours()));
  const [photo, setPhoto] = useState<File | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () =>
      query.trim()
        ? searchLocalFoods(query, tracker.snapshot.customFoods)
        : mostLoggedFoods(tracker.snapshot.entries, tracker.snapshot.customFoods),
    [query, tracker.snapshot],
  );

  const targets = macroTargets(day.goal);
  const over = day.totals.calories > day.goal;
  const isToday = date === todayISO();

  async function log(food: Food, quantity: number) {
    await tracker.logFood(food, quantity, meal, photo);
    setQuery("");
    setPhoto(null);
    if (photoRef.current) photoRef.current.value = "";
  }

  if (connection === null) return <Onboarding onChoose={commitConnection} />;

  return (
    <div className="grain min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          super<span className="text-tangerine">Calorie</span>
        </Link>
        <span className="text-sm text-ink-faint">
          {connection.mode === "local"
            ? "Saved on this device"
            : connection.mode === "self-hosted"
              ? `Syncing with ${connection.serverUrl}`
              : "Signed-in sync available"}
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-6 pb-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-sand bg-white p-6 shadow-[0_20px_50px_-32px_rgba(28,42,36,0.4)]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDate(shiftDate(date, -1))}
                aria-label="Previous day"
                className="rounded-full px-2 py-1 text-ink-soft transition-colors hover:bg-parchment hover:text-ink"
              >
                ←
              </button>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {formatDateLabel(date)}
              </p>
              <button
                type="button"
                onClick={() => setDate(shiftDate(date, 1))}
                disabled={isToday}
                aria-label="Next day"
                className="rounded-full px-2 py-1 text-ink-soft transition-colors hover:bg-parchment hover:text-ink disabled:opacity-25"
              >
                →
              </button>
            </div>

            <div className="mt-5 flex items-center gap-5">
              <CalorieRing eaten={day.totals.calories} goal={day.goal} />
              <div>
                <p className="font-display text-2xl text-ink">
                  {over ? `${day.totals.calories - day.goal} over` : `${day.remaining} left`}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {day.entries.length === 0
                    ? "Nothing logged yet."
                    : `${day.entries.length} item${day.entries.length === 1 ? "" : "s"} logged`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {MACROS.map((macro) => {
                const grams = day.totals[macro.key];
                return (
                  <div key={macro.key}>
                    <div className="flex justify-between text-xs font-semibold text-ink-soft">
                      <span>{macro.label}</span>
                      <span className="tabular-nums">
                        {grams} / {targets[macro.key]} g
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-parchment">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((grams / targets[macro.key]) * 100, 100)}%`,
                          backgroundColor: macro.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="mt-6 flex items-center justify-between gap-3 border-t border-sand pt-4 text-sm">
              <span className="font-semibold text-ink-soft">Daily goal</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min={800}
                  max={10000}
                  step={50}
                  value={profile.dailyCalorieGoal}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) tracker.setGoal(next);
                  }}
                  className="w-24 rounded-lg border border-sand bg-cream px-3 py-1.5 text-right tabular-nums text-ink outline-none focus:border-leaf"
                />
                <span className="text-ink-faint">kcal</span>
              </span>
            </label>
          </section>

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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search foods — try “dal”, “banana”, “paneer”…"
              className="mt-4 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-leaf focus:shadow-[0_0_0_3px_var(--mint)]"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
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
              {photo && (
                <>
                  <span className="text-xs text-ink-faint">attaches to the next food you add</span>
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
                </>
              )}
              <button
                type="button"
                onClick={() => setShowCustom((open) => !open)}
                className="ml-auto text-xs font-semibold text-leaf underline underline-offset-4"
              >
                {showCustom ? "Cancel" : "Add something not listed"}
              </button>
            </div>

            {showCustom && (
              <CustomEntryForm
                onSubmit={async (values) => {
                  await tracker.logCustom(values, meal, photo);
                  setPhoto(null);
                  setShowCustom(false);
                }}
              />
            )}

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {query.trim() ? `Results for “${query.trim()}”` : "Your usuals"}
            </p>

            <ul className="mt-2 max-h-80 divide-y divide-sand overflow-y-auto">
              {results.length === 0 && (
                <li className="py-6 text-center text-sm text-ink-faint">
                  Nothing matched. Use “Add something not listed” to enter it by hand.
                </li>
              )}
              {results.map((food) => (
                <li key={food.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{food.name}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                      <span className="rounded bg-tangerine-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tangerine">
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
                    onClick={() => log(food, 0.5)}
                    title="Log half a serving"
                    className="rounded-full border border-sand px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={() => log(food, 1)}
                    className="rounded-full bg-leaf px-4 py-1.5 text-sm font-semibold text-cream transition-colors hover:bg-leaf-deep"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="flex flex-col gap-4">
          {MEAL_TYPES.map((type) => {
            const items = day.entries.filter((entry) => entry.meal === type);
            const total = items.reduce((sum, entry) => sum + entry.calories, 0);

            return (
              <div key={type} className="rounded-2xl border border-sand bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {MEAL_LABELS[type]}
                  </h3>
                  <span className="text-sm font-semibold tabular-nums text-ink-soft">
                    {total} kcal
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-faint">Nothing yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-sand">
                    {items.map((entry) => (
                      <li key={entry.id} className="group flex items-center gap-3 py-2.5">
                        {entry.photoId && (
                          <LocalPhoto photoId={entry.photoId} alt={`Photo of ${entry.name}`} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink">{entry.name}</p>
                          <p className="text-xs text-ink-faint">
                            {entry.quantity === 1
                              ? entry.servingLabel
                              : `${entry.quantity} × ${entry.servingLabel}`}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-ink">
                          {entry.calories}
                        </span>
                        <button
                          type="button"
                          onClick={() => tracker.removeEntry(entry.id)}
                          aria-label={`Remove ${entry.name}`}
                          className="shrink-0 rounded-full px-2 py-1 text-ink-faint opacity-0 transition-opacity hover:bg-parchment hover:text-ink group-hover:opacity-100 focus:opacity-100"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <DataMenu
            exportJSON={tracker.exportJSON}
            exportCSV={tracker.exportCSV}
            importFile={tracker.importFile}
          />
        </section>
      </main>
    </div>
  );
}

function CustomEntryForm({
  onSubmit,
}: {
  onSubmit: (values: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const valid = name.trim() !== "" && Number(calories) >= 0 && calories !== "";

  return (
    <div className="mt-4 rounded-xl border border-sand bg-cream p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="What was it?"
          className="rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-leaf sm:col-span-2"
        />
        {[
          ["Calories", calories, setCalories],
          ["Protein g", protein, setProtein],
          ["Carbs g", carbs, setCarbs],
          ["Fat g", fat, setFat],
        ].map(([label, value, set]) => (
          <input
            key={label as string}
            type="number"
            min={0}
            value={value as string}
            onChange={(event) => (set as (v: string) => void)(event.target.value)}
            placeholder={label as string}
            className="rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-leaf"
          />
        ))}
      </div>
      <button
        type="button"
        disabled={!valid}
        onClick={() =>
          onSubmit({
            name: name.trim(),
            calories: Number(calories),
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0,
          })
        }
        className="mt-3 rounded-full bg-tangerine px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C9520F] disabled:opacity-40"
      >
        Log it
      </button>
    </div>
  );
}

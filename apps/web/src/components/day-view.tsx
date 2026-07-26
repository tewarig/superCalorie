"use client";

import {
  MEAL_LABELS,
  MEAL_TYPES,
  macroTargets,
  todayISO,
  type DaySummary,
  type MealType,
  type User,
} from "@supercalorie/core";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CalorieRing } from "@/components/calorie-ring";
import { FoodSearch } from "@/components/food-search";

const MACROS = [
  { key: "protein", label: "Protein", color: "var(--berry)" },
  { key: "carbs", label: "Carbs", color: "var(--honey)" },
  { key: "fat", label: "Fat", color: "var(--leaf-bright)" },
] as const;

export function DayView({ user }: { user: User }) {
  const router = useRouter();
  const [day, setDay] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setDay(await api.getDay(todayISO()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(id: string) {
    // Optimistic: drop it locally, then reconcile with the server.
    setDay((current) =>
      current ? { ...current, entries: current.entries.filter((e) => e.id !== id) } : current,
    );
    await api.deleteEntry(id).catch(() => {});
    refresh();
  }

  async function logout() {
    await api.logout();
    router.push("/");
    router.refresh();
  }

  const eaten = day?.totals.calories ?? 0;
  const goal = day?.goal ?? user.dailyCalorieGoal;
  const remaining = Math.max(goal - eaten, 0);
  const over = eaten > goal;
  const targets = macroTargets(goal);

  return (
    <div className="grain min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          super<span className="text-tangerine">Calorie</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-soft">{user.name}</span>
          <button
            type="button"
            onClick={logout}
            className="font-semibold text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-6 pb-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-sand bg-white p-6 shadow-[0_20px_50px_-32px_rgba(28,42,36,0.4)]">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Today
            </p>
            <div className="mt-5 flex items-center gap-5">
              <CalorieRing eaten={eaten} goal={goal} />
              <div>
                <p className="font-display text-2xl text-ink">
                  {over ? `${eaten - goal} over` : `${remaining} left`}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {loading
                    ? "Loading your day…"
                    : day && day.entries.length === 0
                      ? "Nothing logged yet."
                      : `${day?.entries.length} item${day?.entries.length === 1 ? "" : "s"} logged`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {MACROS.map((macro) => {
                const grams = day?.totals[macro.key] ?? 0;
                const target = targets[macro.key];
                return (
                  <div key={macro.key}>
                    <div className="flex justify-between text-xs font-semibold text-ink-soft">
                      <span>{macro.label}</span>
                      <span className="tabular-nums">
                        {grams} / {target} g
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-parchment">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((grams / target) * 100, 100)}%`,
                          backgroundColor: macro.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <FoodSearch onLogged={refresh} />
        </div>

        <section className="flex flex-col gap-4">
          {MEAL_TYPES.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={day?.entries.filter((entry) => entry.meal === meal) ?? []}
              onRemove={remove}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function MealSection({
  meal,
  entries,
  onRemove,
}: {
  meal: MealType;
  entries: DaySummary["entries"];
  onRemove: (id: string) => void;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.calories, 0);

  return (
    <div className="rounded-2xl border border-sand bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">{MEAL_LABELS[meal]}</h3>
        <span className="text-sm font-semibold tabular-nums text-ink-soft">{total} kcal</span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">Nothing yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-sand">
          {entries.map((entry) => (
            <li key={entry.id} className="group flex items-center gap-3 py-2.5">
              {entry.photoId && (
                /* eslint-disable-next-line @next/next/no-img-element -- served by our own API, not a static asset */
                <img
                  src={`/api/photos/${entry.photoId}`}
                  alt={`Photo of ${entry.name}`}
                  loading="lazy"
                  className="h-10 w-10 shrink-0 rounded-lg border border-sand object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{entry.name}</p>
                <p className="text-xs text-ink-faint">
                  {entry.quantity === 1 ? entry.servingLabel : `${entry.quantity} × ${entry.servingLabel}`}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{entry.calories}</span>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
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
}

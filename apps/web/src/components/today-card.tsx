"use client";

import { useState } from "react";
import { Button } from "@supercalorie/ui/button";

interface DemoEntry {
  name: string;
  calories: number;
  meal: string;
}

const STARTER_ENTRIES: DemoEntry[] = [
  { name: "Oats, berries & honey", calories: 340, meal: "Breakfast" },
  { name: "Chicken burrito bowl", calories: 620, meal: "Lunch" },
];

const QUICK_ADDS: DemoEntry[] = [
  { name: "Greek yogurt", calories: 120, meal: "Snack" },
  { name: "Banana", calories: 105, meal: "Snack" },
  { name: "Paneer wrap", calories: 410, meal: "Dinner" },
];

const GOAL = 2000;
const RING_CIRCUMFERENCE = 2 * Math.PI * 54; // r=54 → ≈339

export function TodayCard() {
  const [entries, setEntries] = useState(STARTER_ENTRIES);

  const eaten = entries.reduce((sum, e) => sum + e.calories, 0);
  const progress = Math.min(eaten / GOAL, 1);
  const remaining = Math.max(GOAL - eaten, 0);

  return (
    <div className="rise rounded-3xl border border-sand bg-white p-6 shadow-[0_24px_60px_-30px_rgba(28,42,36,0.35)] sm:p-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Today
        </p>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-leaf-deep">
          live demo
        </span>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--parchment)" strokeWidth="10" />
            <circle
              className="ring-anim"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--tangerine)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
              style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold text-ink">{eaten}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              of {GOAL} kcal
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-ink">
            {remaining > 0 ? `${remaining} kcal to go` : "Goal reached 🎉"}
          </p>
          <ul className="mt-3 space-y-2">
            {entries.slice(-3).map((entry, i) => (
              <li key={`${entry.name}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink-soft">{entry.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">
                  {entry.calories}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 border-t border-sand pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Quick add
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADDS.map((item) => (
            <Button
              key={item.name}
              size="sm"
              variant="outline"
              onPress={() => setEntries((prev) => [...prev, item])}
            >
              {item.name} · {item.calories}
            </Button>
          ))}
          {entries.length > STARTER_ENTRIES.length && (
            <Button size="sm" variant="ghost" onPress={() => setEntries(STARTER_ENTRIES)}>
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

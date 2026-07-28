"use client";

import {
  mergeEntries,
  mergeSnapshot,
  parseCSV,
  parseJSON,
  scaleFood,
  summariseDay,
  todayISO,
  toCSV,
  toJSON,
  type Food,
  type ImportResult,
  type MealType,
  type Snapshot,
} from "@supercalorie/core";
import { useCallback, useSyncExternalStore } from "react";
import {
  commit,
  deletePhoto,
  getServerSnapshot,
  getSnapshot,
  savePhoto,
  subscribe,
} from "./local-store";

/**
 * The app's data layer. Every operation is local and synchronous-ish; none
 * of it needs an account or a reachable server.
 */
export function useTracker(date: string = todayISO()) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((change: (current: Snapshot) => Snapshot) => {
    commit(change(getSnapshot()));
  }, []);

  const logFood = useCallback(
    async (food: Food, quantity: number, meal: MealType, photo?: Blob | null) => {
      let photoId: string | null = null;
      if (photo) {
        photoId = crypto.randomUUID();
        await savePhoto(photoId, photo);
      }

      update((current) => ({
        ...current,
        entries: [
          ...current.entries,
          {
            id: crypto.randomUUID(),
            foodId: food.id,
            name: food.name,
            quantity,
            servingLabel: food.servingLabel,
            ...scaleFood(food, quantity),
            meal,
            date,
            createdAt: new Date().toISOString(),
            photoId,
          },
        ],
      }));
    },
    [date, update],
  );

  const logCustom = useCallback(
    async (
      input: { name: string; calories: number; protein: number; carbs: number; fat: number },
      meal: MealType,
      photo?: Blob | null,
    ) => {
      let photoId: string | null = null;
      if (photo) {
        photoId = crypto.randomUUID();
        await savePhoto(photoId, photo);
      }

      update((current) => ({
        ...current,
        entries: [
          ...current.entries,
          {
            id: crypto.randomUUID(),
            foodId: null,
            name: input.name,
            quantity: 1,
            servingLabel: "1 serving",
            calories: Math.round(input.calories),
            protein: Math.round(input.protein),
            carbs: Math.round(input.carbs),
            fat: Math.round(input.fat),
            meal,
            date,
            createdAt: new Date().toISOString(),
            photoId,
          },
        ],
      }));
    },
    [date, update],
  );

  const removeEntry = useCallback(
    (id: string) => {
      update((current) => {
        const going = current.entries.find((entry) => entry.id === id);
        // Drop the image too, or IndexedDB accumulates orphans forever.
        if (going?.photoId) void deletePhoto(going.photoId);
        return { ...current, entries: current.entries.filter((entry) => entry.id !== id) };
      });
    },
    [update],
  );

  const setGoal = useCallback(
    (dailyCalorieGoal: number) => {
      update((current) => ({
        ...current,
        profile: { ...current.profile, dailyCalorieGoal },
      }));
    },
    [update],
  );

  const setName = useCallback(
    (name: string) => {
      update((current) => ({ ...current, profile: { ...current.profile, name } }));
    },
    [update],
  );

  /** Reads a JSON or CSV export and folds it in without losing local data. */
  const importFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const text = await file.text();
      const isCsv = file.name.toLowerCase().endsWith(".csv") || !text.trimStart().startsWith("{");

      const current = getSnapshot();
      const result = isCsv
        ? mergeEntries(current, parseCSV(text, () => crypto.randomUUID()))
        : mergeSnapshot(current, parseJSON(text));

      commit(result.snapshot);
      return result;
    },
    [],
  );

  return {
    snapshot,
    profile: snapshot.profile,
    day: summariseDay(snapshot.entries, date, snapshot.profile.dailyCalorieGoal),
    logFood,
    logCustom,
    removeEntry,
    setGoal,
    setName,
    importFile,
    exportJSON: () => toJSON(snapshot),
    exportCSV: () => toCSV(snapshot),
  };
}

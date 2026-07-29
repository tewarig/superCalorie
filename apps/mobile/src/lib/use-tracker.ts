import {
  emptySnapshot,
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
  type MacroSplit,
  type MealType,
  type Snapshot,
} from "@supercalorie/core";
import { useCallback, useEffect, useState } from "react";
import {
  deletePhoto,
  loadSnapshot,
  readImportedFile,
  savePhoto,
  saveSnapshot,
  writeExport,
} from "./local-store";
import type { PickedPhoto } from "./photo";

function randomId(): string {
  // Hermes has crypto.randomUUID from SDK 52 onward, but fall back rather
  // than crash if it's ever missing on an older runtime.
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extensionFor(photo: PickedPhoto): string {
  return photo.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
}

/** Local-first data layer for the mobile app. No account, no server. */
export function useTracker(date: string = todayISO()) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot().then((loaded) => {
      if (cancelled) return;
      setSnapshot(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((change: (current: Snapshot) => Snapshot) => {
    setSnapshot((current) => {
      const next = change(current);
      saveSnapshot(next);
      return next;
    });
  }, []);

  const logFood = useCallback(
    (food: Food, quantity: number, meal: MealType, photo?: PickedPhoto | null) => {
      let photoId: string | null = null;
      if (photo) {
        photoId = `${randomId()}.${extensionFor(photo)}`;
        savePhoto(photoId.split(".")[0], photo.uri, extensionFor(photo));
      }

      update((current) => ({
        ...current,
        entries: [
          ...current.entries,
          {
            id: randomId(),
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
    (
      input: { name: string; calories: number; protein: number; carbs: number; fat: number },
      meal: MealType,
    ) => {
      update((current) => ({
        ...current,
        entries: [
          ...current.entries,
          {
            id: randomId(),
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
            photoId: null,
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
        if (going?.photoId) {
          const [photoId, extension] = going.photoId.split(".");
          try {
            deletePhoto(photoId, extension ?? "jpg");
          } catch {
            // An orphaned file is not worth failing the delete over.
          }
        }
        return { ...current, entries: current.entries.filter((entry) => entry.id !== id) };
      });
    },
    [update],
  );

  const setGoal = useCallback(
    (dailyCalorieGoal: number) => {
      update((current) => ({ ...current, profile: { ...current.profile, dailyCalorieGoal } }));
    },
    [update],
  );

  const setMacroSplit = useCallback(
    (macroSplit: MacroSplit) => {
      update((current) => ({ ...current, profile: { ...current.profile, macroSplit } }));
    },
    [update],
  );

  const importFile = useCallback(async (): Promise<ImportResult | null> => {
    const picked = await readImportedFile();
    if (!picked) return null;

    const isCsv =
      picked.name.toLowerCase().endsWith(".csv") || !picked.text.trimStart().startsWith("{");

    let result: ImportResult | null = null;
    setSnapshot((current) => {
      result = isCsv
        ? mergeEntries(current, parseCSV(picked.text, randomId))
        : mergeSnapshot(current, parseJSON(picked.text));
      saveSnapshot(result.snapshot);
      return result.snapshot;
    });
    return result;
  }, []);

  const exportFile = useCallback(
    (format: "json" | "csv") =>
      writeExport(format === "json" ? toJSON(snapshot) : toCSV(snapshot), format),
    [snapshot],
  );

  return {
    ready,
    snapshot,
    profile: snapshot.profile,
    day: summariseDay(snapshot.entries, date, snapshot.profile.dailyCalorieGoal),
    logFood,
    logCustom,
    removeEntry,
    setGoal,
    setMacroSplit,
    importFile,
    exportFile,
  };
}

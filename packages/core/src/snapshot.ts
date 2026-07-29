import { DEFAULT_MACRO_SPLIT, parseMacroSplit, type MacroSplit } from "./macros";
import type { Food, FoodEntry, MealType } from "./types";
import { MEAL_TYPES } from "./types";

/**
 * Everything the app knows about one person, in one document.
 *
 * This is deliberately both the on-device store and the export format. One
 * shape means export is "write the store out", import is "read a store in",
 * and there is no second serialiser to drift out of sync.
 */
export interface Snapshot {
  /** Bumped when the shape changes, so an old file can be migrated. */
  version: 3;
  profile: Profile;
  entries: FoodEntry[];
  /** Foods the user typed in themselves; the built-in library is not copied. */
  customFoods: Food[];
  /** Entries deleted here, remembered so a merge cannot resurrect them. */
  deletions: Deletion[];
}

/**
 * A record that an entry was deleted, kept after the entry itself is gone.
 *
 * Without this, merging is strictly additive: delete a meal on your phone,
 * import a backup or sync with a server that still has it, and it comes
 * straight back with no way to tell it apart from a new entry. The tombstone
 * is what makes a deletion survive the round trip.
 *
 * `deletedAt` is not used for conflict resolution yet — it is recorded now so
 * that a later sync can decide between a delete and a re-add by time rather
 * than by whoever spoke last.
 */
export interface Deletion {
  id: string;
  deletedAt: string;
}

export interface Profile {
  name: string;
  dailyCalorieGoal: number;
  /** How the goal divides between macros. Added in version 2. */
  macroSplit: MacroSplit;
}

export const SNAPSHOT_VERSION = 3 as const;

/**
 * Versions this app can read. Anything older is upgraded on import rather
 * than rejected — someone's year of logging should survive an app update,
 * and the only difference in v1 is a profile field with a sane default.
 */
const READABLE_VERSIONS = [1, 2, 3];

export function emptySnapshot(): Snapshot {
  return {
    version: SNAPSHOT_VERSION,
    profile: { name: "", dailyCalorieGoal: 2000, macroSplit: DEFAULT_MACRO_SPLIT },
    entries: [],
    customFoods: [],
    deletions: [],
  };
}

export interface ImportResult {
  snapshot: Snapshot;
  added: number;
  skipped: number;
}

/* -------------------------------------------------------------------------
 * JSON — full fidelity, the format to use for backup and device transfer.
 * ---------------------------------------------------------------------- */

export function toJSON(snapshot: Snapshot): string {
  return JSON.stringify(
    { ...snapshot, exportedAt: new Date().toISOString(), app: "superCalorie" },
    null,
    2,
  );
}

export function parseJSON(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (!raw || typeof raw !== "object") throw new Error("That file isn't a superCalorie export.");
  const candidate = raw as Partial<Snapshot>;

  if (typeof candidate.version !== "number" || !READABLE_VERSIONS.includes(candidate.version)) {
    throw new Error(
      `Unsupported export version ${String(candidate.version)} — this app reads versions ${READABLE_VERSIONS.join(" and ")}.`,
    );
  }
  if (!Array.isArray(candidate.entries)) throw new Error("That export has no entries list.");

  return {
    version: SNAPSHOT_VERSION,
    profile: {
      name: typeof candidate.profile?.name === "string" ? candidate.profile.name : "",
      dailyCalorieGoal: clampGoal(candidate.profile?.dailyCalorieGoal),
      // A v1 file has no split; parseMacroSplit returns the default for it,
      // which is the same 30/40/30 those exports were always displayed with.
      macroSplit: parseMacroSplit(candidate.profile?.macroSplit),
    },
    entries: candidate.entries.map(normaliseEntry).filter((e): e is FoodEntry => e !== null),
    customFoods: Array.isArray(candidate.customFoods)
      ? candidate.customFoods.filter((food) => typeof food?.id === "string")
      : [],
    // Absent in versions 1 and 2, which had no concept of a deletion.
    deletions: Array.isArray(candidate.deletions)
      ? candidate.deletions.filter(
          (deletion): deletion is Deletion =>
            typeof deletion?.id === "string" && typeof deletion?.deletedAt === "string",
        )
      : [],
  };
}

/* -------------------------------------------------------------------------
 * CSV — one row per entry, for spreadsheets. Lossy by design: it carries no
 * profile, custom foods, or photos, so JSON stays the backup format.
 * ---------------------------------------------------------------------- */

const CSV_COLUMNS = [
  "date",
  "meal",
  "name",
  "quantity",
  "serving",
  "calories",
  "protein",
  "carbs",
  "fat",
] as const;

function csvCell(value: string | number): string {
  const text = String(value);
  // Quote anything containing a delimiter, quote, or newline; double inner
  // quotes. Without this a food named 'Rice, boiled' silently splits a row.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(snapshot: Snapshot): string {
  const rows = snapshot.entries.map((entry) =>
    [
      entry.date,
      entry.meal,
      entry.name,
      entry.quantity,
      entry.servingLabel,
      entry.calories,
      entry.protein,
      entry.carbs,
      entry.fat,
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

/** Splits one CSV line, honouring quoted fields and escaped quotes. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

export function parseCSV(text: string, makeId: () => string): FoodEntry[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) throw new Error("That file is empty.");

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const index = (column: string) => header.indexOf(column);
  if (index("date") === -1 || index("calories") === -1) {
    throw new Error("That CSV needs at least 'date' and 'calories' columns.");
  }

  const entries: FoodEntry[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const at = (column: string) => cells[index(column)]?.trim() ?? "";

    const date = at("date");
    const caloriesCell = at("calories");
    const calories = Number(caloriesCell);

    // An empty cell is not zero. `Number("")` is 0, which would quietly
    // import a blank row as a real 0 kcal entry; an explicit "0" is fine,
    // since black coffee genuinely is zero.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (caloriesCell === "" || !Number.isFinite(calories) || calories < 0) continue;

    const meal = at("meal").toLowerCase();
    entries.push({
      id: makeId(),
      foodId: null,
      name: at("name") || "Imported entry",
      quantity: Number(at("quantity")) || 1,
      servingLabel: at("serving") || "1 serving",
      calories: Math.round(calories),
      protein: Math.round(Number(at("protein")) || 0),
      carbs: Math.round(Number(at("carbs")) || 0),
      fat: Math.round(Number(at("fat")) || 0),
      meal: (MEAL_TYPES as string[]).includes(meal) ? (meal as MealType) : "snack",
      date,
      createdAt: new Date().toISOString(),
      photoId: null,
    });
  }
  return entries;
}

/* -------------------------------------------------------------------------
 * Merging
 * ---------------------------------------------------------------------- */

/**
 * Folds imported entries into what's already stored.
 *
 * Import is additive and safe to repeat: entries are matched on id, so
 * re-importing the same file changes nothing. Restoring a backup onto a
 * device that has newer entries keeps both rather than overwriting.
 */
export function mergeEntries(current: Snapshot, incoming: FoodEntry[]): ImportResult {
  const known = new Set(current.entries.map((entry) => entry.id));
  const deleted = new Set(current.deletions.map((deletion) => deletion.id));
  // A tombstoned entry is skipped like a duplicate rather than re-added: the
  // alternative is that every import undoes every delete.
  const added = incoming.filter((entry) => !known.has(entry.id) && !deleted.has(entry.id));

  return {
    snapshot: {
      ...current,
      entries: [...current.entries, ...added].sort((a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
      ),
    },
    added: added.length,
    skipped: incoming.length - added.length,
  };
}

/** Union of two tombstone lists, keeping the earliest time seen for each id. */
export function mergeDeletions(current: Deletion[], incoming: Deletion[]): Deletion[] {
  const byId = new Map(current.map((deletion) => [deletion.id, deletion]));

  for (const deletion of incoming) {
    const existing = byId.get(deletion.id);
    if (!existing || deletion.deletedAt < existing.deletedAt) byId.set(deletion.id, deletion);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Records an entry as deleted and removes it in one step.
 *
 * Callers should use this rather than filtering `entries` themselves, or the
 * deletion is invisible to the next merge.
 */
export function deleteEntry(snapshot: Snapshot, id: string, now = new Date()): Snapshot {
  if (!snapshot.entries.some((entry) => entry.id === id)) return snapshot;

  return {
    ...snapshot,
    entries: snapshot.entries.filter((entry) => entry.id !== id),
    deletions: mergeDeletions(snapshot.deletions, [
      { id, deletedAt: now.toISOString() },
    ]),
  };
}

/** Merges a whole imported snapshot: entries, custom foods, and the goal. */
export function mergeSnapshot(current: Snapshot, incoming: Snapshot): ImportResult {
  const result = mergeEntries(current, incoming.entries);
  const knownFoods = new Set(current.customFoods.map((food) => food.id));

  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      // An imported profile only fills gaps — it never overwrites a goal the
      // person set on this device.
      profile: {
        name: current.profile.name || incoming.profile.name,
        dailyCalorieGoal: current.profile.dailyCalorieGoal,
        macroSplit: current.profile.macroSplit,
      },
      // Tombstones from both sides are kept. Dropping the incoming ones would
      // let this device resurrect entries the other one deleted the next time
      // the merge ran in the other direction.
      deletions: mergeDeletions(current.deletions, incoming.deletions),
      customFoods: [
        ...current.customFoods,
        ...incoming.customFoods.filter((food) => !knownFoods.has(food.id)),
      ],
    },
  };
}

function clampGoal(value: unknown): number {
  const goal = Number(value);
  if (!Number.isFinite(goal)) return 2000;
  return Math.min(Math.max(Math.round(goal), 800), 10000);
}

function normaliseEntry(raw: unknown): FoodEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<FoodEntry>;

  if (typeof entry.id !== "string" || typeof entry.date !== "string") return null;
  if (!Number.isFinite(Number(entry.calories))) return null;

  return {
    id: entry.id,
    foodId: typeof entry.foodId === "string" ? entry.foodId : null,
    name: typeof entry.name === "string" ? entry.name : "Imported entry",
    quantity: Number(entry.quantity) || 1,
    servingLabel: typeof entry.servingLabel === "string" ? entry.servingLabel : "1 serving",
    calories: Math.round(Number(entry.calories)),
    protein: Math.round(Number(entry.protein) || 0),
    carbs: Math.round(Number(entry.carbs) || 0),
    fat: Math.round(Number(entry.fat) || 0),
    meal: (MEAL_TYPES as string[]).includes(entry.meal as string)
      ? (entry.meal as MealType)
      : "snack",
    date: entry.date,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    photoId: typeof entry.photoId === "string" ? entry.photoId : null,
  };
}

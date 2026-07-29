import { describe, expect, it } from "vitest";
import {
  DEFAULT_MACRO_SPLIT,
  SNAPSHOT_VERSION,
  emptySnapshot,
  mergeEntries,
  mergeSnapshot,
  parseCSV,
  parseJSON,
  toCSV,
  toJSON,
  type FoodEntry,
  type Snapshot,
} from "@supercalorie/core";

let counter = 0;
const makeId = () => `generated-${++counter}`;

function entry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: overrides.id ?? makeId(),
    foodId: null,
    name: "Roti",
    quantity: 2,
    servingLabel: "1 roti",
    calories: 208,
    protein: 6,
    carbs: 40,
    fat: 4,
    meal: "dinner",
    date: "2026-07-26",
    createdAt: "2026-07-26T18:00:00.000Z",
    photoId: null,
    ...overrides,
  };
}

function snapshotWith(entries: FoodEntry[]): Snapshot {
  return { ...emptySnapshot(), entries };
}

describe("JSON export and import", () => {
  it("round-trips a snapshot without losing anything", () => {
    const original = {
      ...emptySnapshot(),
      profile: { name: "Gaurav", dailyCalorieGoal: 2400, macroSplit: DEFAULT_MACRO_SPLIT },
      entries: [entry({ id: "a", photoId: "photo-1", foodId: "lib:roti-whole-wheat" })],
      customFoods: [
        {
          id: "custom-1",
          name: "Mum's dal",
          servingLabel: "1 bowl",
          calories: 210,
          protein: 11,
          carbs: 28,
          fat: 6,
          source: "library" as const,
        },
      ],
    };

    const restored = parseJSON(toJSON(original));

    expect(restored.profile).toEqual(original.profile);
    expect(restored.entries).toEqual(original.entries);
    expect(restored.customFoods).toEqual(original.customFoods);
  });

  it.each([
    ["not json at all", "That file isn't valid JSON."],
    ['{"version":99,"entries":[]}', "Unsupported export version"],
    ['{"version":1}', "no entries list"],
  ])("rejects %s", (text, message) => {
    expect(() => parseJSON(text)).toThrow(new RegExp(message.replace(/[.'"]/g, ".")));
  });

  it.each([
    ["null", "null"],
    ["a bare number", "42"],
    ["a quoted string", '"just a string"'],
  ])("rejects valid JSON that isn't an export at all (%s)", (_label, text) => {
    expect(() => parseJSON(text)).toThrow(/superCalorie export/);
  });

  it("survives a hand-edited file with junk in it", () => {
    const restored = parseJSON(
      JSON.stringify({
        version: 1,
        profile: { dailyCalorieGoal: "not a number" },
        entries: [
          entry({ id: "good" }),
          { id: "no-date", calories: 100 },
          null,
          "nonsense",
          { ...entry({ id: "bad-meal" }), meal: "brunch" },
        ],
      }),
    );

    expect(restored.entries.map((e) => e.id)).toEqual(["good", "bad-meal"]);
    // An unknown meal lands in snacks rather than corrupting the day view.
    expect(restored.entries[1].meal).toBe("snack");
    expect(restored.profile.dailyCalorieGoal).toBe(2000);
  });

  it("fills in defaults for an entry that carries only the essentials", () => {
    const restored = parseJSON(
      JSON.stringify({
        version: 1,
        // The minimum normaliseEntry accepts: an id, a date, and a number.
        entries: [{ id: "bare", date: "2026-07-26", calories: 250 }],
      }),
    );

    expect(restored.entries[0]).toMatchObject({
      id: "bare",
      foodId: null,
      name: "Imported entry",
      quantity: 1,
      servingLabel: "1 serving",
      calories: 250,
      protein: 0,
      carbs: 0,
      fat: 0,
      meal: "snack",
      photoId: null,
    });
    // Stamped now, since the file didn't say when it was logged.
    expect(restored.entries[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects an entry whose calories aren't a number at all", () => {
    const restored = parseJSON(
      JSON.stringify({
        version: 1,
        entries: [{ id: "nan", date: "2026-07-26", calories: "banana" }],
      }),
    );
    expect(restored.entries).toEqual([]);
  });

  it("clamps an absurd calorie goal instead of trusting the file", () => {
    expect(parseJSON('{"version":1,"profile":{"dailyCalorieGoal":999999},"entries":[]}').profile
      .dailyCalorieGoal).toBe(10000);
    expect(parseJSON('{"version":1,"profile":{"dailyCalorieGoal":5},"entries":[]}').profile
      .dailyCalorieGoal).toBe(800);
  });

  describe("version 1 files, written before macro splits existed", () => {
    // A real v1 export, as the app wrote them: no macroSplit anywhere.
    const v1 = JSON.stringify({
      version: 1,
      profile: { name: "Gaurav", dailyCalorieGoal: 2400 },
      entries: [
        {
          id: "e1",
          name: "Masoor dal",
          quantity: 1,
          servingLabel: "1 bowl",
          calories: 232,
          protein: 14,
          carbs: 38,
          fat: 2,
          meal: "lunch",
          date: "2026-07-26",
          createdAt: "2026-07-26T12:00:00.000Z",
          photoId: null,
        },
      ],
      customFoods: [],
    });

    it("still imports, rather than rejecting someone's history on an app update", () => {
      const restored = parseJSON(v1);
      expect(restored.entries).toHaveLength(1);
      expect(restored.profile.dailyCalorieGoal).toBe(2400);
    });

    it("upgrades to the current version and fills in the default split", () => {
      const restored = parseJSON(v1);
      expect(restored.version).toBe(SNAPSHOT_VERSION);
      // 30/40/30 is what a v1 file was always displayed with, so the targets
      // do not move under the user on upgrade.
      expect(restored.profile.macroSplit).toEqual(DEFAULT_MACRO_SPLIT);
    });

    it("round-trips back out as version 2", () => {
      expect(JSON.parse(toJSON(parseJSON(v1))).version).toBe(2);
    });
  });

  it("rejects a version it does not know how to read", () => {
    expect(() => parseJSON('{"version":99,"entries":[]}')).toThrow(/Unsupported export version 99/);
  });
});

describe("CSV export and import", () => {
  it("quotes fields that would otherwise break the row", () => {
    const csv = toCSV(snapshotWith([entry({ name: 'Rice, "boiled"' })]));
    const [, row] = csv.split("\n");

    expect(row).toContain('"Rice, ""boiled"""');
    // One row in, one row out — the comma didn't split the record.
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("round-trips through a spreadsheet-shaped file", () => {
    const csv = toCSV(snapshotWith([entry({ name: 'Rice, "boiled"', calories: 205 })]));
    const parsed = parseCSV(csv, makeId);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      name: 'Rice, "boiled"',
      calories: 205,
      meal: "dinner",
      date: "2026-07-26",
    });
  });

  it("skips rows that aren't usable rather than failing the whole import", () => {
    const parsed = parseCSV(
      [
        "date,meal,name,calories",
        "2026-07-26,lunch,Good row,300",
        "not-a-date,lunch,Bad date,300",
        "2026-07-27,lunch,No calories,",
      ].join("\n"),
      makeId,
    );

    expect(parsed.map((e) => e.name)).toEqual(["Good row"]);
  });

  it("accepts a minimal file a person could type by hand", () => {
    const parsed = parseCSV("date,calories\n2026-07-26,450", makeId);

    expect(parsed[0]).toMatchObject({
      name: "Imported entry",
      calories: 450,
      meal: "snack",
      quantity: 1,
    });
  });

  it("refuses an empty file rather than silently importing nothing", () => {
    expect(() => parseCSV("", makeId)).toThrow(/empty/i);
    // Whitespace-only is the same thing to a person.
    expect(() => parseCSV("\n\n  \n", makeId)).toThrow(/empty/i);
  });

  it("refuses a file missing the columns it needs", () => {
    expect(() => parseCSV("name,protein\nRoti,6", makeId)).toThrow(/date.*calories/);
  });
});

describe("merging", () => {
  it("is idempotent — importing the same file twice changes nothing", () => {
    const start = snapshotWith([entry({ id: "a" })]);
    const incoming = [entry({ id: "a" }), entry({ id: "b" })];

    const first = mergeEntries(start, incoming);
    expect(first.added).toBe(1);
    expect(first.skipped).toBe(1);

    const second = mergeEntries(first.snapshot, incoming);
    expect(second.added).toBe(0);
    expect(second.snapshot.entries).toHaveLength(2);
  });

  it("keeps newer local entries when restoring an older backup", () => {
    const local = snapshotWith([entry({ id: "local-new", date: "2026-07-26" })]);
    const backup = snapshotWith([entry({ id: "from-backup", date: "2026-07-01" })]);

    const merged = mergeEntries(local, backup.entries);

    expect(merged.snapshot.entries.map((e) => e.id)).toEqual(["from-backup", "local-new"]);
  });

  it("never lets an imported goal overwrite the one set on this device", () => {
    const local: Snapshot = {
      ...emptySnapshot(),
      profile: { name: "Gaurav", dailyCalorieGoal: 2400, macroSplit: DEFAULT_MACRO_SPLIT },
    };
    const incoming: Snapshot = {
      ...emptySnapshot(),
      profile: { name: "Someone else", dailyCalorieGoal: 1200, macroSplit: DEFAULT_MACRO_SPLIT },
    };

    const merged = mergeSnapshot(local, incoming);

    expect(merged.snapshot.profile.dailyCalorieGoal).toBe(2400);
    expect(merged.snapshot.profile.name).toBe("Gaurav");
  });

  it("brings in custom foods without duplicating ones already known", () => {
    const mine = {
      id: "custom-1",
      name: "Mum's dal",
      servingLabel: "1 bowl",
      calories: 210,
      protein: 11,
      carbs: 28,
      fat: 6,
      source: "library" as const,
    };
    const theirs = { ...mine, id: "custom-2", name: "Dad's dal" };

    const local: Snapshot = { ...emptySnapshot(), customFoods: [mine] };
    const incoming: Snapshot = { ...emptySnapshot(), customFoods: [mine, theirs] };

    const merged = mergeSnapshot(local, incoming);

    expect(merged.snapshot.customFoods.map((f) => f.id)).toEqual(["custom-1", "custom-2"]);
  });

  it("adopts an imported name only when this device has none", () => {
    const merged = mergeSnapshot(emptySnapshot(), {
      ...emptySnapshot(),
      profile: { name: "Gaurav", dailyCalorieGoal: 1800, macroSplit: DEFAULT_MACRO_SPLIT },
    });

    expect(merged.snapshot.profile.name).toBe("Gaurav");
  });
});

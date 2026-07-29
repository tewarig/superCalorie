import {
  deleteEntry,
  emptySnapshot,
  mergeDeletions,
  mergeEntries,
  mergeSnapshot,
  parseJSON,
  toJSON,
  type FoodEntry,
  type Snapshot,
} from "@supercalorie/core";
import { describe, expect, it } from "vitest";

function entry(id: string): FoodEntry {
  return {
    id,
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
  };
}

function withEntries(...ids: string[]): Snapshot {
  return { ...emptySnapshot(), entries: ids.map(entry) };
}

describe("deleteEntry", () => {
  it("removes the entry and leaves a tombstone", () => {
    const after = deleteEntry(withEntries("a", "b"), "a", new Date("2026-07-27T10:00:00Z"));

    expect(after.entries.map((e) => e.id)).toEqual(["b"]);
    expect(after.deletions).toEqual([{ id: "a", deletedAt: "2026-07-27T10:00:00.000Z" }]);
  });

  it("does nothing for an id that is not there", () => {
    const before = withEntries("a");
    const after = deleteEntry(before, "missing");

    // Returned unchanged, so no tombstone accumulates for entries that never
    // existed on this device.
    expect(after).toBe(before);
  });
});

describe("merging with tombstones", () => {
  it("does not resurrect a deleted entry on import", () => {
    const local = deleteEntry(withEntries("a", "b"), "a");
    const backup = [entry("a"), entry("b")];

    const { snapshot, added, skipped } = mergeEntries(local, backup);

    // This is the whole point: without the tombstone "a" comes back, and it is
    // indistinguishable from a genuinely new entry.
    expect(snapshot.entries.map((e) => e.id)).toEqual(["b"]);
    expect(added).toBe(0);
    expect(skipped).toBe(2);
  });

  it("still accepts entries that were never deleted", () => {
    const local = deleteEntry(withEntries("a"), "a");

    const { snapshot, added } = mergeEntries(local, [entry("a"), entry("c")]);

    expect(snapshot.entries.map((e) => e.id)).toEqual(["c"]);
    expect(added).toBe(1);
  });

  it("keeps tombstones from both sides of a snapshot merge", () => {
    const local = deleteEntry(withEntries("a", "b"), "a");
    const remote = deleteEntry(withEntries("a", "b"), "b");

    const { snapshot } = mergeSnapshot(local, remote);

    // Dropping the incoming tombstones would let this device hand "b" back to
    // the other one the next time the merge ran the other way.
    expect(snapshot.deletions.map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("mergeDeletions", () => {
  it("keeps the earliest time seen for an id", () => {
    const merged = mergeDeletions(
      [{ id: "a", deletedAt: "2026-07-27T12:00:00.000Z" }],
      [{ id: "a", deletedAt: "2026-07-27T09:00:00.000Z" }],
    );

    expect(merged).toEqual([{ id: "a", deletedAt: "2026-07-27T09:00:00.000Z" }]);
  });

  it("does not move a time later", () => {
    const merged = mergeDeletions(
      [{ id: "a", deletedAt: "2026-07-27T09:00:00.000Z" }],
      [{ id: "a", deletedAt: "2026-07-27T12:00:00.000Z" }],
    );

    expect(merged[0].deletedAt).toBe("2026-07-27T09:00:00.000Z");
  });

  it("unions ids and orders them predictably", () => {
    const merged = mergeDeletions(
      [{ id: "c", deletedAt: "2026-07-27T09:00:00.000Z" }],
      [{ id: "a", deletedAt: "2026-07-27T09:00:00.000Z" }],
    );

    expect(merged.map((d) => d.id)).toEqual(["a", "c"]);
  });
});

describe("the export format", () => {
  it("round-trips tombstones", () => {
    const restored = parseJSON(toJSON(deleteEntry(withEntries("a"), "a")));

    expect(restored.deletions.map((d) => d.id)).toEqual(["a"]);
    expect(restored.version).toBe(3);
  });

  it("reads a version 2 file, which had no deletions at all", () => {
    const v2 = JSON.stringify({
      version: 2,
      profile: { name: "", dailyCalorieGoal: 2000, macroSplit: { protein: 30, carbs: 40, fat: 30 } },
      entries: [],
      customFoods: [],
    });

    expect(parseJSON(v2).deletions).toEqual([]);
  });

  it("discards tombstones that are not shaped like one", () => {
    const junk = JSON.stringify({
      version: 3,
      entries: [],
      deletions: [{ id: "good", deletedAt: "2026-07-27T09:00:00.000Z" }, { id: 42 }, null, "x"],
    });

    expect(parseJSON(junk).deletions.map((d) => d.id)).toEqual(["good"]);
  });
});

import { DEFAULT_MACRO_SPLIT, type Connection, type FoodEntry, type Snapshot, type User } from "@supercalorie/core";
import * as localStore from "../local-store";
import * as session from "../session";
import { performSync, scheduleSync, syncNow, type SyncDeps } from "../sync";
import * as tracker from "../use-tracker";

jest.mock("../session", () => ({ getSession: jest.fn(), apiClient: jest.fn() }));
jest.mock("../local-store", () => ({
  getConnection: jest.fn(),
  hasSyncedBefore: jest.fn(),
  loadSyncWatermark: jest.fn(),
  saveSyncWatermark: jest.fn(),
}));
jest.mock("../use-tracker", () => ({
  getCurrentSnapshot: jest.fn(),
  applySyncResult: jest.fn(),
  ensureTrackerLoaded: jest.fn(),
  subscribeToSnapshot: jest.fn(),
}));

// sync.ts wires "a local mutation happened" to "schedule a sync" once, at
// import time, by subscribing to use-tracker's snapshot store. Captured here
// before anything resets the mock, so the later "triggered by a local edit"
// test can invoke it directly rather than reaching into use-tracker for real.
const onSnapshotChanged = jest.mocked(tracker.subscribeToSnapshot).mock.calls[0][0];

const EPOCH = "1970-01-01T00:00:00.000Z";
const HOSTED: Connection = { mode: "hosted", serverUrl: "" };
const LOCAL: Connection = { mode: "local", serverUrl: "" };

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "a@example.com",
    name: "A",
    dailyCalorieGoal: 2000,
    macroSplit: DEFAULT_MACRO_SPLIT,
    createdAt: EPOCH,
    ...overrides,
  };
}

function emptySnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    version: 3,
    profile: { name: "", dailyCalorieGoal: 2000, macroSplit: DEFAULT_MACRO_SPLIT },
    entries: [],
    customFoods: [],
    deletions: [],
    ...overrides,
  };
}

function fakeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: "entry-1",
    foodId: null,
    name: "Something",
    quantity: 1,
    servingLabel: "1 serving",
    calories: 100,
    protein: 0,
    carbs: 0,
    fat: 0,
    meal: "snack",
    date: "2026-08-01",
    createdAt: "2026-08-01T00:00:00.000Z",
    photoId: null,
    ...overrides,
  };
}

function fakeClient(overrides: Partial<SyncDeps["client"]> = {}): SyncDeps["client"] {
  return {
    pullSince: jest.fn().mockResolvedValue({
      since: EPOCH,
      entries: [],
      deletions: [],
      syncedAt: "2026-08-02T00:00:00.000Z",
    }),
    pushSync: jest.fn().mockResolvedValue({ entries: 0, deletions: 0, syncedAt: "2026-08-02T00:00:00.000Z" }),
    me: jest.fn(),
    updateProfile: jest.fn().mockResolvedValue({ user: fakeUser() }),
    ...overrides,
  };
}

describe("performSync", () => {
  it("adopts the server's profile on a device's first sync for an already-configured account", async () => {
    const client = fakeClient({
      me: jest.fn().mockResolvedValue({
        user: fakeUser({ dailyCalorieGoal: 2500, macroSplit: { protein: 25, carbs: 45, fat: 30 } }),
      }),
    });
    let applied: Snapshot | undefined;
    let watermark: unknown;

    await performSync("u1", {
      client,
      getSnapshot: () => emptySnapshot(),
      applySnapshot: (next) => {
        applied = next;
      },
      loadWatermark: () => ({ pulledThrough: EPOCH, pushedEntriesThrough: EPOCH, pushedDeletionsThrough: EPOCH }),
      saveWatermark: (_userId, next) => {
        watermark = next;
      },
      hasSyncedBefore: () => false,
    });

    expect(client.me).toHaveBeenCalledTimes(1);
    expect(client.updateProfile).not.toHaveBeenCalled();
    expect(applied?.profile).toEqual({
      name: "",
      dailyCalorieGoal: 2500,
      macroSplit: { protein: 25, carbs: 45, fat: 30 },
    });
    expect(watermark).toEqual({
      pulledThrough: "2026-08-02T00:00:00.000Z",
      pushedEntriesThrough: EPOCH,
      pushedDeletionsThrough: EPOCH,
    });
  });

  it("pushes local values on a device's first sync when the account is still at its factory-default profile", async () => {
    // A brand-new account (this device most likely just signed up) has
    // nothing worth adopting yet — the device's own pre-existing profile
    // should win rather than being stomped by the stock default.
    const client = fakeClient({
      me: jest.fn().mockResolvedValue({ user: fakeUser({ dailyCalorieGoal: 2000, macroSplit: DEFAULT_MACRO_SPLIT }) }),
    });
    let applied: Snapshot | undefined;

    await performSync("u1", {
      client,
      getSnapshot: () => emptySnapshot({ profile: { name: "Me", dailyCalorieGoal: 1600, macroSplit: DEFAULT_MACRO_SPLIT } }),
      applySnapshot: (next) => {
        applied = next;
      },
      loadWatermark: () => ({ pulledThrough: EPOCH, pushedEntriesThrough: EPOCH, pushedDeletionsThrough: EPOCH }),
      saveWatermark: () => {},
      hasSyncedBefore: () => false,
    });

    expect(client.me).toHaveBeenCalledTimes(1);
    expect(client.updateProfile).toHaveBeenCalledWith({ dailyCalorieGoal: 1600, macroSplit: DEFAULT_MACRO_SPLIT });
    // Nothing pulled in either, so the store was never re-written.
    expect(applied).toBeUndefined();
  });

  it("pushes the local profile on every sync after the first, rather than adopting the server's", async () => {
    const client = fakeClient();
    let applied: Snapshot | undefined;

    await performSync("u1", {
      client,
      getSnapshot: () => emptySnapshot({ profile: { name: "Me", dailyCalorieGoal: 1800, macroSplit: DEFAULT_MACRO_SPLIT } }),
      applySnapshot: (next) => {
        applied = next;
      },
      loadWatermark: () => ({ pulledThrough: EPOCH, pushedEntriesThrough: EPOCH, pushedDeletionsThrough: EPOCH }),
      saveWatermark: () => {},
      hasSyncedBefore: () => true,
    });

    expect(client.me).not.toHaveBeenCalled();
    expect(client.updateProfile).toHaveBeenCalledWith({
      dailyCalorieGoal: 1800,
      macroSplit: DEFAULT_MACRO_SPLIT,
    });
    // Nothing else changed, so the snapshot store was never re-written.
    expect(applied).toBeUndefined();
  });

  it("pushes only entries and deletions created after the watermark, using a strict boundary", async () => {
    const client = fakeClient();
    // "later" sorts before "newer" in the array on purpose: the watermark is
    // the max timestamp seen, not the last one, so the reduce that computes
    // it has to keep an earlier running max in front of a smaller later one.
    const snapshot = emptySnapshot({
      entries: [
        fakeEntry({ id: "old", createdAt: "2026-08-01T00:00:00.000Z" }),
        fakeEntry({ id: "newer", createdAt: "2026-08-01T00:00:00.003Z" }),
        fakeEntry({ id: "later", createdAt: "2026-08-01T00:00:00.001Z" }),
      ],
      deletions: [
        { id: "old-del", deletedAt: "2026-08-01T00:00:00.000Z" },
        { id: "newer-del", deletedAt: "2026-08-01T00:00:00.003Z" },
        { id: "later-del", deletedAt: "2026-08-01T00:00:00.001Z" },
      ],
    });
    let watermark: { pushedEntriesThrough: string; pushedDeletionsThrough: string } | undefined;

    await performSync("u1", {
      client,
      getSnapshot: () => snapshot,
      applySnapshot: () => {},
      loadWatermark: () => ({
        pulledThrough: EPOCH,
        pushedEntriesThrough: "2026-08-01T00:00:00.000Z",
        pushedDeletionsThrough: "2026-08-01T00:00:00.000Z",
      }),
      saveWatermark: (_userId, next) => {
        watermark = next;
      },
      hasSyncedBefore: () => true,
    });

    expect(client.pushSync).toHaveBeenCalledWith({
      entries: [expect.objectContaining({ id: "newer" }), expect.objectContaining({ id: "later" })],
      deletions: [expect.objectContaining({ id: "newer-del" }), expect.objectContaining({ id: "later-del" })],
    });
    expect(watermark?.pushedEntriesThrough).toBe("2026-08-01T00:00:00.003Z");
    expect(watermark?.pushedDeletionsThrough).toBe("2026-08-01T00:00:00.003Z");
  });

  it("skips the push call, and keeps the watermark, when nothing is pending", async () => {
    const client = fakeClient();
    let watermark: { pushedEntriesThrough: string; pushedDeletionsThrough: string } | undefined;

    await performSync("u1", {
      client,
      getSnapshot: () => emptySnapshot(),
      applySnapshot: () => {},
      loadWatermark: () => ({
        pulledThrough: EPOCH,
        pushedEntriesThrough: "2026-08-01T00:00:00.000Z",
        pushedDeletionsThrough: "2026-08-01T00:00:00.000Z",
      }),
      saveWatermark: (_userId, next) => {
        watermark = next;
      },
      hasSyncedBefore: () => true,
    });

    expect(client.pushSync).not.toHaveBeenCalled();
    expect(watermark?.pushedEntriesThrough).toBe("2026-08-01T00:00:00.000Z");
    expect(watermark?.pushedDeletionsThrough).toBe("2026-08-01T00:00:00.000Z");
  });

  it("merges pulled entries and deletions into the snapshot and commits it", async () => {
    const client = fakeClient({
      pullSince: jest.fn().mockResolvedValue({
        since: EPOCH,
        entries: [fakeEntry({ id: "remote-1", date: "2026-08-02", createdAt: "2026-08-02T00:00:00.000Z" })],
        deletions: [{ id: "remote-del", deletedAt: "2026-08-02T00:00:00.000Z" }],
        syncedAt: "2026-08-02T01:00:00.000Z",
      }),
    });
    let applied: Snapshot | undefined;

    await performSync("u1", {
      client,
      getSnapshot: () => emptySnapshot(),
      applySnapshot: (next) => {
        applied = next;
      },
      loadWatermark: () => ({ pulledThrough: EPOCH, pushedEntriesThrough: EPOCH, pushedDeletionsThrough: EPOCH }),
      saveWatermark: () => {},
      hasSyncedBefore: () => true,
    });

    expect(applied?.entries.map((e) => e.id)).toEqual(["remote-1"]);
    expect(applied?.deletions.map((d) => d.id)).toEqual(["remote-del"]);
  });

  it("does not resurrect an entry this device already tombstoned locally", async () => {
    const client = fakeClient({
      pullSince: jest.fn().mockResolvedValue({
        since: EPOCH,
        entries: [fakeEntry({ id: "already-deleted-here" })],
        deletions: [],
        syncedAt: "2026-08-02T01:00:00.000Z",
      }),
    });

    let applied: Snapshot | undefined;
    await performSync("u1", {
      client,
      getSnapshot: () => emptySnapshot({ deletions: [{ id: "already-deleted-here", deletedAt: EPOCH }] }),
      applySnapshot: (next) => {
        applied = next;
      },
      loadWatermark: () => ({ pulledThrough: EPOCH, pushedEntriesThrough: EPOCH, pushedDeletionsThrough: EPOCH }),
      saveWatermark: () => {},
      hasSyncedBefore: () => true,
    });

    expect(applied?.entries).toEqual([]);
  });
});

describe("syncNow", () => {
  beforeEach(() => {
    jest.mocked(session.getSession).mockReset();
    jest.mocked(session.apiClient).mockReset();
    jest.mocked(localStore.getConnection).mockReset();
    jest.mocked(localStore.hasSyncedBefore).mockReset();
    jest.mocked(localStore.loadSyncWatermark).mockReset();
    jest.mocked(localStore.saveSyncWatermark).mockReset();
    jest.mocked(tracker.getCurrentSnapshot).mockReset();
    jest.mocked(tracker.applySyncResult).mockReset();
    jest.mocked(tracker.ensureTrackerLoaded).mockReset().mockResolvedValue(undefined);
  });

  it("does nothing when there is no session", async () => {
    jest.mocked(session.getSession).mockReturnValue(null);
    jest.mocked(localStore.getConnection).mockReturnValue(HOSTED);

    await syncNow();

    expect(tracker.ensureTrackerLoaded).not.toHaveBeenCalled();
  });

  it("does nothing when the connection is local-only", async () => {
    jest.mocked(session.getSession).mockReturnValue({ token: "t", user: fakeUser() });
    jest.mocked(localStore.getConnection).mockReturnValue(LOCAL);

    await syncNow();

    expect(tracker.ensureTrackerLoaded).not.toHaveBeenCalled();
  });

  it("does nothing when no connection has ever been chosen", async () => {
    jest.mocked(session.getSession).mockReturnValue({ token: "t", user: fakeUser() });
    jest.mocked(localStore.getConnection).mockReturnValue(null);

    await syncNow();

    expect(tracker.ensureTrackerLoaded).not.toHaveBeenCalled();
  });

  it("runs a full round when signed in and connected", async () => {
    const client = fakeClient();
    jest.mocked(session.getSession).mockReturnValue({ token: "t", user: fakeUser() });
    jest.mocked(session.apiClient).mockReturnValue(client as ReturnType<typeof session.apiClient>);
    jest.mocked(localStore.getConnection).mockReturnValue(HOSTED);
    jest.mocked(localStore.hasSyncedBefore).mockReturnValue(true);
    jest.mocked(localStore.loadSyncWatermark).mockReturnValue({
      pulledThrough: EPOCH,
      pushedEntriesThrough: EPOCH,
      pushedDeletionsThrough: EPOCH,
    });
    jest.mocked(tracker.getCurrentSnapshot).mockReturnValue(emptySnapshot());

    await syncNow();

    expect(tracker.ensureTrackerLoaded).toHaveBeenCalled();
    expect(client.pullSince).toHaveBeenCalledWith(EPOCH);
    expect(localStore.saveSyncWatermark).toHaveBeenCalled();
  });

  it("never throws — a failed round is swallowed and simply retried later", async () => {
    const client = fakeClient({ pullSince: jest.fn().mockRejectedValue(new Error("offline")) });
    jest.mocked(session.getSession).mockReturnValue({ token: "t", user: fakeUser() });
    jest.mocked(session.apiClient).mockReturnValue(client as ReturnType<typeof session.apiClient>);
    jest.mocked(localStore.getConnection).mockReturnValue(HOSTED);
    jest.mocked(localStore.hasSyncedBefore).mockReturnValue(true);
    jest.mocked(localStore.loadSyncWatermark).mockReturnValue({
      pulledThrough: EPOCH,
      pushedEntriesThrough: EPOCH,
      pushedDeletionsThrough: EPOCH,
    });
    jest.mocked(tracker.getCurrentSnapshot).mockReturnValue(emptySnapshot());

    await expect(syncNow()).resolves.toBeUndefined();
    expect(localStore.saveSyncWatermark).not.toHaveBeenCalled();
  });

  it("shares one in-flight round between concurrent callers", async () => {
    const client = fakeClient();
    jest.mocked(session.getSession).mockReturnValue({ token: "t", user: fakeUser() });
    jest.mocked(session.apiClient).mockReturnValue(client as ReturnType<typeof session.apiClient>);
    jest.mocked(localStore.getConnection).mockReturnValue(HOSTED);
    jest.mocked(localStore.hasSyncedBefore).mockReturnValue(true);
    jest.mocked(localStore.loadSyncWatermark).mockReturnValue({
      pulledThrough: EPOCH,
      pushedEntriesThrough: EPOCH,
      pushedDeletionsThrough: EPOCH,
    });
    jest.mocked(tracker.getCurrentSnapshot).mockReturnValue(emptySnapshot());

    await Promise.all([syncNow(), syncNow()]);

    expect(client.pullSince).toHaveBeenCalledTimes(1);
  });
});

describe("scheduleSync", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(session.getSession).mockReset();
    jest.mocked(session.apiClient).mockReset();
    jest.mocked(localStore.getConnection).mockReset();
    jest.mocked(localStore.hasSyncedBefore).mockReset();
    jest.mocked(localStore.loadSyncWatermark).mockReset();
    jest.mocked(localStore.saveSyncWatermark).mockReset();
    jest.mocked(tracker.getCurrentSnapshot).mockReset();
    jest.mocked(tracker.applySyncResult).mockReset();
    jest.mocked(tracker.ensureTrackerLoaded).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function connectAndSignIn(client: SyncDeps["client"]) {
    jest.mocked(session.getSession).mockReturnValue({ token: "t", user: fakeUser() });
    jest.mocked(session.apiClient).mockReturnValue(client as ReturnType<typeof session.apiClient>);
    jest.mocked(localStore.getConnection).mockReturnValue(HOSTED);
    jest.mocked(localStore.hasSyncedBefore).mockReturnValue(true);
    jest.mocked(localStore.loadSyncWatermark).mockReturnValue({
      pulledThrough: EPOCH,
      pushedEntriesThrough: EPOCH,
      pushedDeletionsThrough: EPOCH,
    });
    jest.mocked(tracker.getCurrentSnapshot).mockReturnValue(emptySnapshot());
  }

  it("debounces rapid calls into a single sync", async () => {
    const client = fakeClient();
    connectAndSignIn(client);

    scheduleSync();
    await jest.advanceTimersByTimeAsync(1000);
    scheduleSync(); // resets the timer — the first would have fired at 3000
    await jest.advanceTimersByTimeAsync(2999);
    expect(client.pullSince).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(client.pullSince).toHaveBeenCalledTimes(1);
  });

  it("is what the shared snapshot store's own subscription schedules after a local edit", async () => {
    const client = fakeClient();
    connectAndSignIn(client);

    onSnapshotChanged();
    await jest.advanceTimersByTimeAsync(3000);

    expect(client.pullSince).toHaveBeenCalledTimes(1);
  });
});

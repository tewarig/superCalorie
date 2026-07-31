import {
  DEFAULT_MACRO_SPLIT,
  mergeDeletions,
  mergeEntries,
  type ApiClient,
  type MacroSplit,
  type Snapshot,
} from "@supercalorie/core";
import {
  getConnection,
  hasSyncedBefore,
  loadSyncWatermark,
  saveSyncWatermark,
  type SyncWatermark,
} from "./local-store";
import { apiClient, getSession } from "./session";
import {
  applySyncResult,
  ensureTrackerLoaded,
  getCurrentSnapshot,
  subscribeToSnapshot,
} from "./use-tracker";

/**
 * Reconciles the on-device snapshot with a server, for a device that is
 * both connected and signed in. The snapshot stays the source of truth
 * either way — this only runs at all once someone has opted into a server,
 * and it never blocks or fails the local action that triggered it.
 */

export interface SyncDeps {
  client: Pick<ApiClient, "pullSince" | "pushSync" | "me" | "updateProfile">;
  getSnapshot: () => Snapshot;
  applySnapshot: (next: Snapshot) => void;
  loadWatermark: (userId: string) => SyncWatermark;
  saveWatermark: (userId: string, watermark: SyncWatermark) => void;
  hasSyncedBefore: (userId: string) => boolean;
}

/** The latest of a batch of timestamps, or `previous` if the batch is empty. */
function latestOf(timestamps: string[], previous: string): string {
  return timestamps.reduce((latest, timestamp) => (timestamp > latest ? timestamp : latest), previous);
}

/** A brand-new account's profile — the shape `users.create` gives every signup. */
function isFactoryDefaultProfile(dailyCalorieGoal: number, macroSplit: MacroSplit): boolean {
  return (
    dailyCalorieGoal === 2000 &&
    macroSplit.protein === DEFAULT_MACRO_SPLIT.protein &&
    macroSplit.carbs === DEFAULT_MACRO_SPLIT.carbs &&
    macroSplit.fat === DEFAULT_MACRO_SPLIT.fat
  );
}

/**
 * One push-then-pull round for one account.
 *
 * Exported separately from `syncNow` so it can be tested with plain fakes —
 * everything it touches (the network, the watermark, the shared snapshot
 * store) arrives as a parameter rather than being read from a module.
 *
 * Push goes first, so local work reaches the server even if the pull that
 * follows fails. Every step is safe to repeat: `pushSync` is idempotent on
 * the server, `mergeEntries`/`mergeDeletions` dedupe by id, and the
 * watermark is only written once, at the very end — a failure partway
 * through simply means the same round runs again next time, which is
 * always safe and never loses anything.
 *
 * The profile policy is a deliberate first cut, not full last-write-wins:
 * there is no `updated_at` on the server's `users` table to compare against,
 * and today nothing but this same device's own goals screen ever writes
 * `dailyCalorieGoal` or `macroSplit` — the web app has no editor for either
 * yet. Without a timestamp, a device's first sync for an account can't truly
 * tell "this account already has a real goal set on another device" apart
 * from "I just signed up and the account has never touched these fields" —
 * so it approximates: if the server's profile is still exactly the factory
 * default (`isFactoryDefaultProfile`), this is almost certainly a brand-new
 * signup, and pushing local up protects whatever this device already had
 * before creating the account. Otherwise, an established account's real
 * values win, so a second device signing in doesn't overwrite them with its
 * own untouched defaults. Every sync after the first pushes local up. Real
 * timestamp-based resolution only matters once a second writer exists to
 * conflict with.
 */
export async function performSync(userId: string, deps: SyncDeps): Promise<void> {
  const watermark = deps.loadWatermark(userId);
  const firstSyncForThisAccount = !deps.hasSyncedBefore(userId);
  const snapshot = deps.getSnapshot();

  const pendingEntries = snapshot.entries.filter(
    (entry) => entry.createdAt > watermark.pushedEntriesThrough,
  );
  const pendingDeletions = snapshot.deletions.filter(
    (deletion) => deletion.deletedAt > watermark.pushedDeletionsThrough,
  );

  if (pendingEntries.length > 0 || pendingDeletions.length > 0) {
    await deps.client.pushSync({ entries: pendingEntries, deletions: pendingDeletions });
  }

  const pulled = await deps.client.pullSince(watermark.pulledThrough);

  let merged = snapshot;
  let changed = false;
  if (pulled.entries.length > 0 || pulled.deletions.length > 0) {
    const { snapshot: withEntries } = mergeEntries(merged, pulled.entries);
    merged = { ...withEntries, deletions: mergeDeletions(withEntries.deletions, pulled.deletions) };
    changed = true;
  }

  if (firstSyncForThisAccount) {
    const { user } = await deps.client.me();
    if (isFactoryDefaultProfile(user.dailyCalorieGoal, user.macroSplit)) {
      await deps.client.updateProfile({
        dailyCalorieGoal: merged.profile.dailyCalorieGoal,
        macroSplit: merged.profile.macroSplit,
      });
    } else {
      merged = {
        ...merged,
        profile: {
          ...merged.profile,
          dailyCalorieGoal: user.dailyCalorieGoal,
          macroSplit: user.macroSplit,
        },
      };
      changed = true;
    }
  } else {
    await deps.client.updateProfile({
      dailyCalorieGoal: merged.profile.dailyCalorieGoal,
      macroSplit: merged.profile.macroSplit,
    });
  }

  // Only commits (and only notifies every screen via applySyncResult) when
  // something actually moved — an unnecessary write would also re-emit the
  // change event this module itself listens for, below, and loop forever.
  if (changed) deps.applySnapshot(merged);

  deps.saveWatermark(userId, {
    pulledThrough: pulled.syncedAt,
    pushedEntriesThrough: latestOf(
      pendingEntries.map((entry) => entry.createdAt),
      watermark.pushedEntriesThrough,
    ),
    pushedDeletionsThrough: latestOf(
      pendingDeletions.map((deletion) => deletion.deletedAt),
      watermark.pushedDeletionsThrough,
    ),
  });
}

let inFlight: Promise<void> | null = null;

/**
 * Runs one sync round now, if this device is signed in to a server.
 *
 * Never throws and never rejects: a failed round (offline, an unreachable
 * server, a transient error) is simply retried on the next trigger. It must
 * never surface as an error from whatever provoked it — the local action
 * that led here already succeeded before this was even called.
 */
export function syncNow(): Promise<void> {
  inFlight ??= run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(): Promise<void> {
  const session = getSession();
  const connection = getConnection();
  if (!session || !connection || connection.mode === "local") return;

  await ensureTrackerLoaded();

  try {
    await performSync(session.user.id, {
      client: apiClient(),
      getSnapshot: getCurrentSnapshot,
      applySnapshot: applySyncResult,
      loadWatermark: loadSyncWatermark,
      saveWatermark: saveSyncWatermark,
      hasSyncedBefore,
    });
  } catch {
    // See above — offline and transient failures are ordinary, not errors.
  }
}

const DEBOUNCE_MS = 3000;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced trigger for after a local edit, so logging several things in a
 * row schedules one sync rather than one per tap.
 */
export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, DEBOUNCE_MS);
}

// Every local mutation — logging, deleting, editing the goal, importing a
// file — already goes through use-tracker's one shared snapshot store.
// Subscribing here is what schedules a sync after any of them, without
// use-tracker needing to import this module back.
subscribeToSnapshot(() => scheduleSync());

import { normaliseEntry } from "@supercalorie/core";
import { getSessionUser } from "@/lib/auth";
import { entries, foods } from "@/lib/repo";

function isValidDeletion(raw: unknown): raw is { id: string; deletedAt: string } {
  if (!raw || typeof raw !== "object") return false;
  const deletion = raw as { id?: unknown; deletedAt?: unknown };
  return typeof deletion.id === "string" && typeof deletion.deletedAt === "string";
}

/**
 * POST /api/entries/sync — the push half of mobile sync.
 *
 * Bulk and idempotent on both halves: entries insert by the id the client
 * already assigned (`createWithId`, INSERT OR IGNORE), so a retried push
 * cannot duplicate one; tombstones upsert unconditionally (`tombstone`), so
 * a delete for an entry this server never received still lands. Malformed
 * items are skipped rather than failing the whole batch — the same
 * normalising parser import already uses, since a synced entry and an
 * imported one are shaped identically.
 */
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.entries) || !Array.isArray(body.deletions)) {
    return Response.json(
      { error: "Body must include `entries` and `deletions` arrays." },
      { status: 400 },
    );
  }

  let entriesWritten = 0;
  for (const raw of body.entries) {
    const entry = normaliseEntry(raw);
    if (!entry) continue;

    // A foodId is only meaningful if this server actually has that food —
    // it may have been cached on a different instance the device used to
    // point at. Dropping the link rather than rejecting the entry keeps the
    // denormalised name and macros, which travelled with the entry anyway.
    const foodId = entry.foodId && foods.byId(entry.foodId) ? entry.foodId : null;

    entries.createWithId({ ...entry, foodId, userId: user.id });
    entriesWritten += 1;
  }

  let deletionsWritten = 0;
  for (const raw of body.deletions) {
    if (!isValidDeletion(raw)) continue;
    entries.tombstone(user.id, raw.id, raw.deletedAt);
    deletionsWritten += 1;
  }

  return Response.json({
    entries: entriesWritten,
    deletions: deletionsWritten,
    syncedAt: new Date().toISOString(),
  });
}

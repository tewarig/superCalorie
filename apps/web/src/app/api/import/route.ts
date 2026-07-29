import { parseJSON } from "@supercalorie/core";
import { getSessionUser } from "@/lib/auth";
import { entries } from "@/lib/repo";

/**
 * POST /api/import — push a Snapshot up, e.g. to back up a device.
 *
 * Additive and idempotent, matching the apps: entries are matched on id, so
 * sending the same document twice adds nothing and nothing already stored is
 * overwritten. The account's own calorie goal is left alone.
 */
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let snapshot;
  try {
    snapshot = parseJSON(await request.text());
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Unreadable document." },
      { status: 400 },
    );
  }

  const known = new Set(entries.all(user.id).map((entry) => entry.id));
  let added = 0;

  for (const entry of snapshot.entries) {
    if (known.has(entry.id)) continue;
    entries.createWithId({ ...entry, userId: user.id });
    added += 1;
  }

  return Response.json({ added, skipped: snapshot.entries.length - added });
}

import { DEFAULT_MACRO_SPLIT, SNAPSHOT_VERSION, type Snapshot } from "@supercalorie/core";
import { getSessionUser } from "@/lib/auth";
import { entries } from "@/lib/repo";

/**
 * GET /api/export — everything this account has stored, in one document.
 *
 * Deliberately the same Snapshot shape the apps write locally, so a server
 * export can be imported straight into a device and vice versa. Storing data
 * here never means losing the ability to take it somewhere else.
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const snapshot: Snapshot = {
    version: SNAPSHOT_VERSION,
    profile: {
      name: user.name,
      dailyCalorieGoal: user.dailyCalorieGoal,
      // The macro split is a client-side preference for now — the users table
      // has no column for it, so a server export carries the default and the
      // importing device keeps whatever split it already had. Worth moving
      // server-side when the split needs to follow someone between devices.
      macroSplit: DEFAULT_MACRO_SPLIT,
    },
    entries: entries.all(user.id),
    // Foods are resolved into each entry at log time, so an export needs no
    // separate library to be complete.
    customFoods: [],
  };

  return Response.json(snapshot, {
    headers: {
      "content-disposition": `attachment; filename="supercalorie-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}

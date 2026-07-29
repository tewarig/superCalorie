import { splitTotal, type MacroSplit } from "@supercalorie/core";
import { getSessionUser, publicUser } from "@/lib/auth";
import { users } from "@/lib/repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  return Response.json({ user: publicUser(user) });
}

/**
 * Reads a macro split from a request body.
 *
 * Rejects rather than normalises: a split that does not total 100 means the
 * client got its arithmetic wrong, and quietly rescaling it would show
 * targets nobody chose. The reason comes back so the caller can say why.
 */
function readSplit(value: unknown): { split: MacroSplit } | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "macroSplit must be an object with protein, carbs and fat." };
  }
  const candidate = value as Partial<Record<keyof MacroSplit, unknown>>;
  const split = {} as MacroSplit;

  for (const key of ["protein", "carbs", "fat"] as const) {
    const percent = candidate[key];
    if (typeof percent !== "number" || !Number.isInteger(percent) || percent < 0 || percent > 100) {
      return { error: `macroSplit.${key} must be a whole number between 0 and 100.` };
    }
    split[key] = percent;
  }

  if (splitTotal(split) !== 100) {
    return { error: `macroSplit must total 100, not ${splitTotal(split)}.` };
  }
  return { split };
}

/**
 * Update the daily calorie goal, the macro split, or both.
 *
 * Both fields are optional, but a body carrying neither is reported rather
 * than accepted — otherwise a typo in a field name looks like a successful
 * no-op.
 */
export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const wantsGoal = body?.dailyCalorieGoal !== undefined;
  const wantsSplit = body?.macroSplit !== undefined;

  if (!wantsGoal && !wantsSplit) {
    return Response.json({ error: "Send dailyCalorieGoal, macroSplit, or both." }, { status: 400 });
  }

  const goal = Number(body.dailyCalorieGoal);
  if (wantsGoal && (!Number.isFinite(goal) || goal < 800 || goal > 10000)) {
    return Response.json({ error: "Goal must be between 800 and 10000 kcal." }, { status: 400 });
  }

  const parsed = wantsSplit ? readSplit(body.macroSplit) : null;
  if (parsed && "error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  // Both are validated before either is written, so a bad split cannot leave
  // the goal applied while the request is reported as failed.
  if (wantsGoal) users.setGoal(user.id, Math.round(goal));
  if (parsed) users.setMacroSplit(user.id, parsed.split);

  return Response.json({ user: publicUser(users.byId(user.id)!) });
}

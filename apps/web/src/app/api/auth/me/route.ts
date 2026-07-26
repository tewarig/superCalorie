import { getSessionUser, publicUser } from "@/lib/auth";
import { users } from "@/lib/repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  return Response.json({ user: publicUser(user) });
}

/** Update the daily calorie goal. */
export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const goal = Number(body?.dailyCalorieGoal);
  if (!Number.isFinite(goal) || goal < 800 || goal > 10000) {
    return Response.json({ error: "Goal must be between 800 and 10000 kcal." }, { status: 400 });
  }

  const updated = users.setGoal(user.id, Math.round(goal));
  return Response.json({ user: publicUser(updated!) });
}

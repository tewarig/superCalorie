import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { db, type FoodEntry } from "@/lib/db";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

/** GET /api/entries?date=YYYY-MM-DD — list the current user's entries. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date");
  const entries = [...db.entries.values()]
    .filter((e) => e.userId === user.id && (!date || e.date === date))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return Response.json({ entries, totals, goal: user.dailyCalorieGoal });
}

/** POST /api/entries — log a food entry. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const calories = Number(body?.calories);
  const meal = MEALS.includes(body?.meal) ? (body.meal as FoodEntry["meal"]) : "snack";

  if (!name) {
    return Response.json({ error: "Food name is required." }, { status: 400 });
  }
  if (!Number.isFinite(calories) || calories < 0 || calories > 10000) {
    return Response.json({ error: "Calories must be between 0 and 10000." }, { status: 400 });
  }

  const entry: FoodEntry = {
    id: randomUUID(),
    userId: user.id,
    name,
    calories: Math.round(calories),
    protein: Math.max(0, Math.round(Number(body?.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(body?.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(body?.fat) || 0)),
    meal,
    date:
      typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  db.entries.set(entry.id, entry);

  return Response.json({ entry }, { status: 201 });
}

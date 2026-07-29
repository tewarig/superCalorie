import { MEAL_TYPES, todayISO, type MealType } from "@supercalorie/core";
import { getSessionUser } from "@/lib/auth";
import { entries, foods, photos, sumTotals } from "@/lib/repo";

const isValidDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * GET /api/entries — one day of logging, or everything changed since a time.
 *
 * `?date=YYYY-MM-DD` is the day view. `?since=<ISO timestamp>` is the sync
 * view: entries created after that moment plus the tombstones for anything
 * deleted since, which is what lets a client catch up without re-downloading
 * a year of logging. The two are mutually exclusive; `since` wins.
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const since = params.get("since");

  if (since !== null) {
    // Rejected rather than ignored: a malformed timestamp silently treated as
    // "everything" would look like a working sync that re-sends the world.
    if (Number.isNaN(Date.parse(since))) {
      return Response.json(
        { error: "`since` must be an ISO 8601 timestamp." },
        { status: 400 },
      );
    }
    return Response.json({
      since,
      entries: entries.changedSince(user.id, since),
      deletions: entries.deletions(user.id, since),
      // Echoed so the client has a watermark that came from the server's
      // clock rather than its own, which may be skewed.
      syncedAt: new Date().toISOString(),
    });
  }

  const requested = params.get("date");
  const date = isValidDate(requested) ? requested : todayISO();

  const list = entries.forDay(user.id, date);
  const totals = sumTotals(list);

  return Response.json({
    date,
    entries: list,
    totals,
    goal: user.dailyCalorieGoal,
    remaining: Math.max(user.dailyCalorieGoal - totals.calories, 0),
  });
}

/**
 * POST /api/entries — log food, either by `foodId` from the library
 * (macros are scaled by `quantity`) or as a free-text custom entry.
 */
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const meal: MealType = MEAL_TYPES.includes(body?.meal) ? body.meal : "snack";
  const date = isValidDate(body?.date) ? body.date : todayISO();

  const quantity = Number(body?.quantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 50) {
    return Response.json({ error: "Quantity must be between 0 and 50." }, { status: 400 });
  }

  // Verified against the caller, so an entry can only ever reference a photo
  // that account uploaded.
  let photoId: string | null = null;
  if (typeof body?.photoId === "string" && body.photoId) {
    if (!photos.byId(user.id, body.photoId)) {
      return Response.json({ error: "Photo not found." }, { status: 404 });
    }
    photoId = body.photoId;
  }

  if (typeof body?.foodId === "string") {
    const food = foods.byId(body.foodId);
    if (!food) return Response.json({ error: "Food not found." }, { status: 404 });

    const entry = entries.create({
      userId: user.id,
      foodId: food.id,
      name: food.name,
      quantity,
      servingLabel: food.servingLabel,
      calories: Math.round(food.calories * quantity),
      protein: Math.round(food.protein * quantity),
      carbs: Math.round(food.carbs * quantity),
      fat: Math.round(food.fat * quantity),
      meal,
      date,
      photoId,
    });
    return Response.json({ entry }, { status: 201 });
  }

  // Custom entry — the escape hatch for anything not in the library.
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const calories = Number(body?.calories);
  if (!name) return Response.json({ error: "Food name is required." }, { status: 400 });
  if (!Number.isFinite(calories) || calories < 0 || calories > 10000) {
    return Response.json({ error: "Calories must be between 0 and 10000." }, { status: 400 });
  }

  const entry = entries.create({
    userId: user.id,
    foodId: null,
    name,
    quantity: 1,
    servingLabel: "1 serving",
    calories: Math.round(calories),
    protein: Math.max(0, Math.round(Number(body?.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(body?.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(body?.fat) || 0)),
    meal,
    date,
    photoId,
  });
  return Response.json({ entry }, { status: 201 });
}

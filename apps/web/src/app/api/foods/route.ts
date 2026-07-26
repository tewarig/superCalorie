import { getSessionUser } from "@/lib/auth";
import { searchAllSources } from "@/lib/food-providers";
import { foods } from "@/lib/repo";

/**
 * GET /api/foods?q=banana — search the curated library, USDA, and Open Food
 *                           Facts, nearest-to-useful first.
 * GET /api/foods          — the user's most-logged foods, so the log screen
 *                           is useful before they type anything.
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    const recent = foods.mostLogged(user.id);
    return Response.json({
      foods: recent.length > 0 ? recent : foods.starters(),
      source: "recent",
      degraded: [],
    });
  }

  const { foods: results, degraded } = await searchAllSources(query);
  return Response.json({ foods: results, source: "search", degraded });
}

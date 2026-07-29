import { buildPublicStats, type PublicProfile } from "@supercalorie/core";
import { entries, profiles, users } from "@/lib/repo";

/**
 * GET /api/public/:handle — a profile as the world sees it.
 *
 * Unauthenticated by design; that is the whole point of a shareable page.
 * The safety comes from the fact that a profile publishes nothing until its
 * owner switches sections on, and a profile that isn't public is a 404 —
 * indistinguishable from a handle nobody has claimed, so the existence of a
 * private account can't be probed.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = profiles.byHandle(handle);

  if (!profile || !profile.isPublic) {
    return Response.json({ error: "No such profile." }, { status: 404 });
  }

  const owner = users.byId(profile.userId);
  /* v8 ignore next -- profiles cascade-delete with their user, so a profile
     without one cannot exist; this keeps the types honest. */
  if (!owner) return Response.json({ error: "No such profile." }, { status: 404 });

  const payload: PublicProfile = {
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarPhotoId: profile.avatarPhotoId,
    joinedAt: profile.createdAt,
    stats: buildPublicStats(
      entries.all(profile.userId),
      owner.dailyCalorieGoal,
      profile,
    ),
  };

  return Response.json(payload, {
    headers: {
      // Deliberately uncached. A shared cache held this for 60s after the
      // owner switched a section off, so "hide" briefly meant "still
      // visible" — which is the one thing a privacy control must never do.
      // The endpoint is cheap; correctness is worth more than the caching.
      "cache-control": "no-store",
    },
  });
}

import { HIDDEN_PROFILE, handleError, normaliseHandle } from "@supercalorie/core";
import { getSessionUser } from "@/lib/auth";
import { photos, profiles } from "@/lib/repo";

/** GET /api/profile — the caller's own profile, hidden or not. */
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  return Response.json({ profile: profiles.byUser(user.id) });
}

/**
 * PUT /api/profile — claim a handle and set what, if anything, is published.
 *
 * Visibility flags are read individually rather than spread from the body,
 * so a client that omits one gets the private default instead of inheriting
 * whatever happened to be there.
 */
export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const handle = normaliseHandle(typeof body?.handle === "string" ? body.handle : "");

  const problem = handleError(handle);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const owner = profiles.byHandle(handle);
  if (owner && owner.userId !== user.id) {
    return Response.json({ error: "That handle is taken." }, { status: 409 });
  }

  // An avatar has to be a photo this account uploaded, or one user could
  // point their profile at another's image.
  let avatarPhotoId: string | null = null;
  if (typeof body?.avatarPhotoId === "string" && body.avatarPhotoId) {
    if (!photos.byId(user.id, body.avatarPhotoId)) {
      return Response.json({ error: "Photo not found." }, { status: 404 });
    }
    avatarPhotoId = body.avatarPhotoId;
  }

  const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 280) : null;
  const flag = (name: keyof typeof HIDDEN_PROFILE) => body?.[name] === true;

  const profile = profiles.upsert({
    userId: user.id,
    handle,
    displayName:
      typeof body?.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim().slice(0, 60)
        : user.name,
    bio: bio || null,
    avatarPhotoId,
    visibility: {
      isPublic: flag("isPublic"),
      showToday: flag("showToday"),
      showTotals: flag("showTotals"),
      showTopFoods: flag("showTopFoods"),
      showHeatmap: flag("showHeatmap"),
      showRecent: flag("showRecent"),
    },
  });

  return Response.json({ profile });
}

/** DELETE /api/profile — give up the handle and take the page down. */
export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  profiles.remove(user.id);
  return Response.json({ ok: true });
}

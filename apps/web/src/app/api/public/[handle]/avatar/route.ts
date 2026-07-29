import { photos, profiles } from "@/lib/repo";
import { readPhoto } from "@/lib/photo-store";

/**
 * GET /api/public/:handle/avatar — the one image a public profile exposes.
 *
 * Deliberately separate from /api/photos/:id, which stays scoped to its
 * owner. Meal photos are private; only the single image someone chose as
 * their avatar becomes readable, and only while their profile is public.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = profiles.byHandle(handle);

  if (!profile || !profile.isPublic || !profile.avatarPhotoId) {
    return Response.json({ error: "No avatar." }, { status: 404 });
  }

  const photo = photos.byId(profile.userId, profile.avatarPhotoId);
  /* v8 ignore next -- the avatar column is a foreign key that nulls on
     delete, so a referenced photo always exists. */
  if (!photo) return Response.json({ error: "No avatar." }, { status: 404 });

  try {
    const bytes = await readPhoto(photo.id, photo.contentType);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": photo.contentType,
        // Same reasoning as the profile itself: taking a profile private
        // has to remove the avatar with it, immediately.
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Avatar is unavailable." }, { status: 410 });
  }
}

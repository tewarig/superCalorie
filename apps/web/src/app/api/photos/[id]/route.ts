import { getSessionUser } from "@/lib/auth";
import { readPhoto } from "@/lib/photo-store";
import { photos } from "@/lib/repo";

/**
 * GET /api/photos/:id — stream a meal photo back.
 *
 * The lookup is scoped to the caller, so knowing an id is not enough to view
 * someone else's meals; an id belonging to another account is a 404, not a
 * 403, so this cannot be used to probe which ids exist.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const photo = photos.byId(user.id, id);
  if (!photo) return Response.json({ error: "Photo not found." }, { status: 404 });

  try {
    const bytes = await readPhoto(photo.id, photo.contentType);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": photo.contentType,
        // Immutable: a photo id always refers to the same bytes. Private, so
        // shared caches never hold one user's meal photo for another.
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    // Row exists but the file is gone — a half-restored backup, say.
    return Response.json({ error: "Photo data is unavailable." }, { status: 410 });
  }
}

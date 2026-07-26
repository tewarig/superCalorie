import { getSessionUser } from "@/lib/auth";
import { ALLOWED_TYPES, MAX_PHOTO_BYTES, writePhoto } from "@/lib/photo-store";
import { photos } from "@/lib/repo";

/**
 * POST /api/photos — upload a meal photo, returning an id to attach to an
 * entry. Takes multipart form data under the field `photo`, which is what
 * both a browser `<input type="file">` and React Native's FormData produce.
 */
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "No photo was included." }, { status: 400 });
  }

  const contentType = file.type.toLowerCase();
  if (!ALLOWED_TYPES[contentType]) {
    return Response.json(
      { error: `Unsupported image type. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return Response.json(
      { error: `Photo is too large (max ${MAX_PHOTO_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }
  if (file.size === 0) {
    return Response.json({ error: "Photo is empty." }, { status: 400 });
  }

  const id = photos.create({ userId: user.id, contentType, byteSize: file.size });
  await writePhoto(id, contentType, new Uint8Array(await file.arrayBuffer()));

  return Response.json({ photoId: id }, { status: 201 });
}

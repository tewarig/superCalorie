import { getSessionUser } from "@/lib/auth";
import { entries } from "@/lib/repo";

/** DELETE /api/entries/:id — remove one of the caller's entries. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  if (!entries.remove(user.id, id)) {
    return Response.json({ error: "Entry not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}

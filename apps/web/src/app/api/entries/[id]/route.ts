import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** DELETE /api/entries/:id — remove one of the current user's entries. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const entry = db.entries.get(id);
  if (!entry || entry.userId !== user.id) {
    return Response.json({ error: "Entry not found." }, { status: 404 });
  }

  db.entries.delete(id);
  return Response.json({ ok: true });
}

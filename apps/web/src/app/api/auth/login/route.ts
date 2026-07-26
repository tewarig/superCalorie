import { createSession, publicUser, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user)) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({ user: publicUser(user) });
}

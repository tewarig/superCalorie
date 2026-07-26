import { createSession, hashPassword, publicUser } from "@/lib/auth";
import { users } from "@/lib/repo";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (users.byEmail(email)) {
    return Response.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { hash, salt } = hashPassword(password);
  const user = users.create({
    email,
    passwordHash: hash,
    salt,
    name: name || email.split("@")[0],
  });

  const token = await createSession(user.id);
  return Response.json({ user: publicUser(user), token }, { status: 201 });
}

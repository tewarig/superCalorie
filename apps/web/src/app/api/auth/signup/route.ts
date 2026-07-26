import { randomUUID } from "node:crypto";
import { createSession, hashPassword, publicUser } from "@/lib/auth";
import { db, findUserByEmail, type User } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (findUserByEmail(email)) {
    return Response.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { hash, salt } = hashPassword(password);
  const user: User = {
    id: randomUUID(),
    email,
    passwordHash: hash,
    salt,
    name: name || email.split("@")[0],
    dailyCalorieGoal: 2000,
    createdAt: new Date().toISOString(),
  };
  db.users.set(user.id, user);

  await createSession(user.id);
  return Response.json({ user: publicUser(user) }, { status: 201 });
}

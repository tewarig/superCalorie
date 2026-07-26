import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, type User } from "./db";

const SESSION_COOKIE = "sc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// In production set SESSION_SECRET; the dev fallback is regenerated per
// process, which invalidates sessions on every server restart.
const secret = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");

export function hashPassword(password: string, salt?: string) {
  const actualSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, actualSalt, 64).toString("hex");
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, user: User): boolean {
  const { hash } = hashPassword(password, user.salt);
  return timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
}

function sign(payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Token format: base64url(userId:expiresAt).signature */
function createToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = Buffer.from(`${userId}:${expiresAt}`).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function parseToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [userId, expiresAt] = Buffer.from(payload, "base64url").toString().split(":");
  if (!userId || Number(expiresAt) < Date.now()) return null;
  return userId;
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = parseToken(token);
  if (!userId) return null;
  return db.users.get(userId) ?? null;
}

/** Strips credential fields before a user object leaves the API. */
export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    dailyCalorieGoal: user.dailyCalorieGoal,
    createdAt: user.createdAt,
  };
}

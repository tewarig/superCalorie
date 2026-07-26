import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cookies } from "next/headers";
import { users, type UserRecord } from "./repo";

const SESSION_COOKIE = "sc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Production must supply SESSION_SECRET — failing loudly beats silently
 * signing sessions with a key that dies with the process. In development
 * we cache a generated secret on disk so restarting the dev server doesn't
 * log you out on every code change.
 */
function loadSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production. Generate one with: openssl rand -hex 32",
    );
  }

  const cachePath = resolve(process.cwd(), ".data/dev-session-secret");
  if (existsSync(cachePath)) return readFileSync(cachePath, "utf8").trim();

  const generated = randomBytes(32).toString("hex");
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, generated, { mode: 0o600 });
  return generated;
}

let cachedSecret: string | null = null;
function getSecret(): string {
  return (cachedSecret ??= loadSecret());
}

export function hashPassword(password: string, salt?: string) {
  const actualSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, actualSalt, 64).toString("hex");
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, user: UserRecord): boolean {
  const { hash } = hashPassword(password, user.salt);
  const a = Buffer.from(hash);
  const b = Buffer.from(user.passwordHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Token format: base64url(userId:expiresAt).signature */
export function createToken(userId: string): string {
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

export async function createSession(userId: string): Promise<string> {
  const token = createToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Resolves the caller from either transport: the web app sends an httpOnly
 * cookie, the mobile app an `Authorization: Bearer` header (React Native
 * has no reliable shared cookie jar).
 */
export async function getSessionUser(request?: Request): Promise<UserRecord | null> {
  let token: string | undefined;

  const header = request?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7).trim();
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE)?.value;
  }
  if (!token) return null;

  const userId = parseToken(token);
  return userId ? users.byId(userId) : null;
}

export { publicUser } from "./repo";

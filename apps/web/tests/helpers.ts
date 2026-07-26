import type { User } from "@supercalorie/core";
import { POST as signup } from "@/app/api/auth/signup/route";

const ORIGIN = "http://localhost:3000";

export function jsonRequest(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  token?: string,
): Request {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function getRequest(path: string, token?: string): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`${ORIGIN}${path}`, { headers });
}

/**
 * Creates an account through the real signup route, so tests exercise the
 * same password hashing and session issuing the app uses. Returns the
 * bearer token, which keeps subsequent requests independent of the cookie
 * jar (and mirrors how the mobile app authenticates).
 */
export async function createAccount(
  email = "test@example.com",
  password = "password123",
  name = "Test",
): Promise<{ user: User; token: string }> {
  const response = await signup(jsonRequest("POST", "/api/auth/signup", { email, password, name }));
  if (response.status !== 201) {
    throw new Error(`signup failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

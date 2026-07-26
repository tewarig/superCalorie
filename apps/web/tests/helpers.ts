import type { User } from "@supercalorie/core";
import { POST as signup } from "@/app/api/auth/signup/route";
import { RequestCookies, runWithCookies } from "./request-cookies";

const ORIGIN = "http://localhost:3000";

export function jsonRequest(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  token?: string,
  cookie?: string,
): Request {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (cookie) headers.set("cookie", cookie);

  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function getRequest(path: string, token?: string, cookie?: string): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (cookie) headers.set("cookie", cookie);
  return new Request(`${ORIGIN}${path}`, { headers });
}

/**
 * Invokes a route handler the way the server would: whatever cookies the
 * request carries are visible to `cookies()`, and whatever the handler sets
 * comes back on the response as Set-Cookie.
 *
 * Handlers that never touch cookies can be called directly — outside this
 * wrapper the cookie store is simply empty.
 */
export async function call<Rest extends unknown[]>(
  handler: (request: Request, ...rest: Rest) => Promise<Response>,
  request: Request,
  ...rest: Rest
): Promise<Response> {
  const cookies = new RequestCookies(request.headers.get("cookie"));
  const response = await runWithCookies(cookies, () => handler(request, ...rest));

  for (const header of cookies.setCookieHeaders()) {
    response.headers.append("set-cookie", header);
  }
  return response;
}

/**
 * Collapses a response's Set-Cookie headers into the Cookie header a client
 * would send back, so a test can carry a session from one request to the
 * next the way a browser does.
 */
export function cookiesFrom(response: Response): string {
  const headers =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];

  return headers
    .filter(Boolean)
    .map((entry) => entry.split(";")[0])
    .join("; ");
}

/**
 * Creates an account through the real signup route, so tests exercise the
 * same password hashing and session issuing the app uses. Returns the bearer
 * token (how mobile authenticates) and the session cookie (how web does), so
 * a test can pick whichever transport it means to exercise.
 */
export async function createAccount(
  email = "test@example.com",
  password = "password123",
  name = "Test",
): Promise<{ user: User; token: string; cookie: string }> {
  const response = await call(
    signup,
    jsonRequest("POST", "/api/auth/signup", { email, password, name }),
  );
  if (response.status !== 201) {
    throw new Error(`signup failed: ${response.status} ${await response.text()}`);
  }
  return { ...(await response.json()), cookie: cookiesFrom(response) };
}

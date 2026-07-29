import { baseUrlFor, createApiClient, type ApiClient, type User } from "@supercalorie/core";
import * as SecureStore from "expo-secure-store";
import { getConnection } from "./local-store";

/**
 * Who is signed in on this device, if anyone.
 *
 * Signing in is entirely optional and changes nothing about where data is
 * stored — the on-device snapshot stays the source of truth either way. An
 * account exists so a log can reach a second device and so a profile can be
 * published; it is not a prerequisite for using the app.
 */

const TOKEN_KEY = "supercalorie.session.token";

export interface Session {
  token: string;
  user: User;
}

let session: Session | null = null;
let restored = false;
let restoring: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession(): Session | null {
  return session;
}

export function getRestored(): boolean {
  return restored;
}

/**
 * The token is kept in the keychain rather than alongside the snapshot.
 *
 * A bearer token is a credential; the snapshot is a document the user is
 * encouraged to export and share. Writing one into the other would put a
 * live token into every backup.
 */
async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A device with no keychain available is a device that cannot stay
    // signed in — which is a degraded account, not a broken app.
    return null;
  }
}

/** An API client pointed at whichever server this device chose. */
export function apiClient(): ApiClient {
  const connection = getConnection();
  return createApiClient({
    baseUrl: connection ? baseUrlFor(connection) : "",
    getToken: async () => session?.token ?? (await readToken()),
  });
}

/**
 * Restores a session on launch, once per app run.
 *
 * The stored token is verified against the server rather than trusted: it may
 * have expired, been revoked, or belong to a server this device no longer
 * points at. A token that does not check out is discarded quietly, because
 * "you were signed out a while ago" is not worth an alert on launch.
 */
export function restoreSession(): Promise<void> {
  restoring ??= (async () => {
    const token = await readToken();
    const connection = getConnection();

    if (token && connection && connection.mode !== "local") {
      try {
        const { user } = await createApiClient({
          baseUrl: baseUrlFor(connection),
          getToken: async () => token,
        }).me();
        session = { token, user };
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      }
    }

    restored = true;
    emit();
  })();

  return restoring;
}

async function adopt(result: { token: string; user: User }): Promise<Session> {
  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  session = { token: result.token, user: result.user };
  emit();
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  return adopt(await apiClient().login({ email, password }));
}

export async function signUp(email: string, password: string, name: string): Promise<Session> {
  return adopt(await apiClient().signup({ email, password, name }));
}

/**
 * Signs out locally even if the server call fails.
 *
 * Someone tapping sign out on a train with no signal must still end up signed
 * out on the device; leaving them signed in because a request timed out is
 * the wrong way round for a credential.
 */
export async function signOut(): Promise<void> {
  try {
    await apiClient().logout();
  } catch {
    // Ignored on purpose — see above.
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  session = null;
  emit();
}

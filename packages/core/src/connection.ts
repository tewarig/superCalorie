/**
 * How this device talks to a server, if at all.
 *
 * The app is local-first, so "no server" is a first-class, fully-supported
 * state rather than a degraded one. A connection only matters for syncing
 * between devices, backing up, and publishing a profile.
 */

export type ConnectionMode =
  /** Everything stays on this device. No account, no network. */
  | "local"
  /** The instance this app was served from. */
  | "hosted"
  /** A backend the user runs themselves. */
  | "self-hosted";

export interface Connection {
  mode: ConnectionMode;
  /** Only meaningful when self-hosted; empty otherwise. */
  serverUrl: string;
}

export const LOCAL_ONLY: Connection = { mode: "local", serverUrl: "" };

/**
 * Resolves the origin to call. Hosted means same-origin on the web, so an
 * empty string is correct there and keeps relative URLs working.
 */
export function baseUrlFor(connection: Connection, hostedUrl = ""): string {
  if (connection.mode === "self-hosted") return connection.serverUrl.replace(/\/+$/, "");
  if (connection.mode === "hosted") return hostedUrl;
  return "";
}

/**
 * Validates a self-hosted URL before anything is sent to it.
 *
 * Requiring http(s) explicitly matters: a bare host would otherwise be
 * resolved relative to the current page and quietly send credentials
 * somewhere unintended.
 */
export function serverUrlError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter the address of your server.";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "That isn't a valid URL — include http:// or https://";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http:// and https:// are supported.";
  }
  // Not an error, but worth saying out loud rather than silently allowing.
  if (url.protocol === "http:" && !isLoopback(url.hostname)) {
    return "Use https:// for anything other than localhost — http would send your password in the clear.";
  }
  return null;
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

import { AsyncLocalStorage } from "node:async_hooks";

export interface StoredCookie {
  name: string;
  value: string;
}

/**
 * Stand-in for the store Next.js hands back from `cookies()`.
 *
 * The important property is that an instance belongs to exactly one
 * request: reads see only the cookies that request arrived with, and writes
 * are collected for that one response. A single shared jar would let a
 * cookie set during setup leak into a later request that was supposed to be
 * anonymous — which passes the test for the wrong reason.
 */
export class RequestCookies {
  private readonly incoming = new Map<string, string>();
  /** Pending writes for the response; `null` means "cleared". */
  private readonly outgoing = new Map<string, string | null>();

  constructor(cookieHeader?: string | null) {
    for (const pair of (cookieHeader ?? "").split(";")) {
      const separator = pair.indexOf("=");
      if (separator < 1) continue;
      this.incoming.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
  }

  get(name: string): StoredCookie | undefined {
    // A write earlier in the same request wins over what arrived, matching
    // how Next.js resolves a cookie it just set.
    if (this.outgoing.has(name)) {
      const pending = this.outgoing.get(name);
      return pending == null ? undefined : { name, value: pending };
    }
    const value = this.incoming.get(name);
    return value === undefined ? undefined : { name, value };
  }

  set(name: string, value: string): void {
    this.outgoing.set(name, value);
  }

  delete(name: string): void {
    this.outgoing.set(name, null);
  }

  /** What the response would send back, in Set-Cookie form. */
  setCookieHeaders(): string[] {
    return [...this.outgoing].map(([name, value]) =>
      value === null ? `${name}=; Path=/; Max-Age=0` : `${name}=${value}; Path=/`,
    );
  }
}

const storage = new AsyncLocalStorage<RequestCookies>();

export function runWithCookies<T>(cookies: RequestCookies, run: () => T): T {
  return storage.run(cookies, run);
}

/**
 * Outside a `call()` wrapper there is no request in flight, so hand back an
 * empty store: reads find nothing, writes go nowhere. Defaulting to
 * "anonymous" means a handler invoked directly can never pick up a session
 * some earlier test happened to create.
 */
export function currentCookies(): RequestCookies {
  return storage.getStore() ?? new RequestCookies();
}

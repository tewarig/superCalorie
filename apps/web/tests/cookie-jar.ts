/**
 * Minimal stand-in for the cookie store Next.js hands back from
 * `cookies()`. Route handlers only ever call `set`/`get`/`delete` on it,
 * so that is all this implements.
 */
export interface StoredCookie {
  name: string;
  value: string;
}

class CookieJar {
  private store = new Map<string, string>();

  set(name: string, value: string): void {
    this.store.set(name, value);
  }

  get(name: string): StoredCookie | undefined {
    const value = this.store.get(name);
    return value === undefined ? undefined : { name, value };
  }

  delete(name: string): void {
    this.store.delete(name);
  }

  /** Test-only: forget every cookie, i.e. a fresh browser. */
  reset(): void {
    this.store.clear();
  }
}

export const cookieJar = new CookieJar();

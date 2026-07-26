import { vi } from "vitest";

/**
 * Every test file gets its own module registry, and therefore its own
 * `:memory:` database that is created, seeded, and thrown away with the
 * file. No temp files, no cleanup, no cross-file bleed.
 *
 * Both variables must be set before `src/lib/db.ts` and `src/lib/auth.ts`
 * are imported — they read the environment once, at module scope. Setup
 * files run before the test file's imports are evaluated, so this is the
 * right place for it.
 */
process.env.DATABASE_PATH = ":memory:";
process.env.SESSION_SECRET = "test-secret-not-used-anywhere-real";

// `cookies()` only exists inside a real request scope. `call()` from
// ./helpers establishes that scope per request; outside one the store is
// empty. There is no shared state here to reset between tests.
vi.mock("next/headers", async () => {
  const { currentCookies } = await import("./request-cookies");
  return { cookies: async () => currentCookies() };
});

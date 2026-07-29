import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Picks up the `@/*` alias from tsconfig.json, so tests import route
    // handlers by exactly the same specifier the app uses.
    tsconfigPaths: true,
  },
  test: {
    // These are API-route and query-layer tests — no DOM involved.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],

    coverage: {
      provider: "v8",
      // json-summary feeds the coverage table CI posts to the run summary.
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",

      // Measure the shared package too. Most of the app's real logic moved
      // there when the apps went local-first, so excluding it would report a
      // flattering number about code nobody runs.
      //
      // allowExternal is required: packages/core sits outside this project's
      // root, and v8 drops such files silently — the report simply omits
      // them, which looks like passing rather than like a gap.
      allowExternal: true,
      // Globs resolve against this, so it has to be the workspace root or
      // packages/core is not reachable and drops out of the report entirely
      // — 373 statements measured instead of 523, reported as a clean 100%.
      //
      // @ts-expect-error vitest honours `root` at runtime but omits it from
      // CoverageOptions in v4. When they add it, this line starts failing
      // and can simply be deleted.
      root: "../..",
      include: [
        "apps/web/src/lib/**/*.ts",
        // The route handlers are the API's actual surface; leaving them out
        // measured the helpers while the endpoints went unchecked.
        "apps/web/src/app/api/**/*.ts",
        "packages/core/src/**/*.ts",
      ],

      exclude: [
        // A 60-item data table. Covering it asserts nothing about behaviour;
        // domain.test.ts already checks its shape and id uniqueness.
        "packages/core/src/foods-seed.ts",
        // The HTTP client is exercised against a live server, not here — the
        // apps are local-first and no test drives it.
        "packages/core/src/client.ts",
        // Browser-only: IndexedDB and localStorage. Would need jsdom plus
        // fake-indexeddb to reach, and would test the fakes as much as us.
        "apps/web/src/lib/local-store.ts",
        "apps/web/src/lib/use-tracker.ts",
      ],

      // Enforced, not decorative: a drop in coverage fails the run.
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});

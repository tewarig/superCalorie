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
  },
});

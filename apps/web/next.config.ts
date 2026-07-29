import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The shared packages ship raw TypeScript; compile them as part of this app.
  transpilePackages: ["@supercalorie/ui", "@supercalorie/core"],

  // Emits .next/standalone with a self-contained server and only the
  // node_modules actually reached — the difference between a ~250 MB image
  // and a ~1 GB one.
  output: "standalone",

  // Tracing has to start at the workspace root, or it misses the linked
  // @supercalorie/* packages and pnpm's symlinked store, and the container
  // dies on a missing module at runtime rather than at build time.
  outputFileTracingRoot: join(here, "../.."),

  // Coverage output sits under the traced root, so a build that follows a
  // test run tries to copy its temp files into the standalone bundle and
  // warns when they vanish mid-trace. Nothing at runtime needs them.
  outputFileTracingExcludes: {
    "*": ["**/coverage/**", "**/.turbo/**", "**/*.test.*", "**/tests/**"],
  },
};

export default nextConfig;

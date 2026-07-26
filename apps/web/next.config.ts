import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared packages ship raw TypeScript; compile them as part of this app.
  transpilePackages: ["@supercalorie/ui", "@supercalorie/core"],
};

export default nextConfig;

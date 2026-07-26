import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The design system ships raw TypeScript; compile it as part of this app.
  transpilePackages: ["@supercalorie/ui"],
};

export default nextConfig;

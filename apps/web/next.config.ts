import path from "node:path";
import type { NextConfig } from "next";

// The repository root: the web app imports the shared workspace package.
const monorepoRoot = path.join(import.meta.dirname, "../..");

const nextConfig: NextConfig = {
  // A self-contained server for the container image (the hosting platform ignores it).
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
  transpilePackages: ["@starsagitarian/shared"],
  turbopack: {
    root: monorepoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

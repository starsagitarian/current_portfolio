import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    server: "src/server.ts",
    app: "src/app.ts",
    // Migrations and seeds for deploy pipelines, without needing tsx in production.
    "db-cli": "src/db/cli.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // The shared package ships TypeScript source, so bundle it into the API output.
  noExternal: ["@starsagitarian/shared"],
});

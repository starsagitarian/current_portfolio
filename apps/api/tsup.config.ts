import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/app.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // The shared package ships TypeScript source, so bundle it into the API output.
  noExternal: ["@starsagitarian/shared"],
});

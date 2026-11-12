/**
 * Writes the OpenAPI document to apps/api/openapi.json. The file is committed so that changes
 * to the API contract show up in pull requests; a test fails if it falls out of date.
 *
 *   npm run openapi -w @starsagitarian/api
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOpenApiDocument } from "../src/openapi/document";

const target = path.resolve(import.meta.dirname, "../openapi.json");
await writeFile(target, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.info(`Wrote ${path.relative(process.cwd(), target)}`);

import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { Response } from "supertest";
import { expect } from "vitest";
import { buildOpenApiDocument } from "../../src/openapi/document";

interface MediaType {
  schema?: Record<string, unknown>;
}
interface DocumentedResponse {
  headers?: Record<string, unknown>;
  content?: Record<string, MediaType>;
}
interface Operation {
  responses: Record<string, DocumentedResponse>;
}
type Paths = Record<string, Record<string, Operation>>;

/**
 * Checks real responses against the OpenAPI document: the status must be documented for the
 * operation, the content type must be one it lists, every documented header must be present and
 * the body must match the schema. It also records which documented responses were seen, so a
 * test can fail when one is never exercised.
 */
export function createContract() {
  const document = buildOpenApiDocument();
  const paths = document.paths as Paths;

  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema({ components: document.components }, "openapi");
  const validators = new Map<string, ValidateFunction>();

  function validatorFor(schema: Record<string, unknown>): ValidateFunction {
    const key = JSON.stringify(schema);
    let validate = validators.get(key);
    if (validate === undefined) {
      const pointer = typeof schema.$ref === "string" ? `openapi${schema.$ref}` : undefined;
      validate = ajv.compile(pointer === undefined ? schema : { $ref: pointer });
      validators.set(key, validate);
    }
    return validate;
  }

  const seen = new Set<string>();

  function check(res: Response, method: string, path: string): void {
    const label = `${method.toUpperCase()} ${path} → ${res.status}`;
    const operation = paths[path]?.[method];
    expect(operation, `${method.toUpperCase()} ${path} is documented`).toBeDefined();
    const documented = operation?.responses[String(res.status)];
    expect(documented, `${label} is documented`).toBeDefined();
    if (documented === undefined) return;
    seen.add(`${method} ${path} ${res.status}`);

    for (const name of Object.keys(documented.headers ?? {})) {
      expect(res.headers[name.toLowerCase()], `${label} sends ${name}`).toBeDefined();
    }

    if (documented.content === undefined) {
      expect(res.text, `${label} has no body`).toBe("");
      return;
    }
    const type = String(res.headers["content-type"]).split(";")[0] ?? "";
    expect(Object.keys(documented.content), `${label} content type`).toContain(type);

    const schema = documented.content[type]?.schema;
    if (schema === undefined) return;
    const validate = validatorFor(schema);
    const valid = validate(res.body);
    expect(validate.errors ?? [], `${label} body matches the spec`).toEqual([]);
    expect(valid).toBe(true);
  }

  /** Documented responses that no test has produced yet. */
  function unexercised(): string[] {
    const all = Object.entries(paths).flatMap(([path, operations]) =>
      Object.entries(operations).flatMap(([method, operation]) =>
        Object.keys(operation.responses).map((status) => `${method} ${path} ${status}`),
      ),
    );
    return all.filter((key) => !seen.has(key));
  }

  return { document, check, unexercised };
}

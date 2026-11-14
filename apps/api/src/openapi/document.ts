import { z } from "zod";
import {
  CertificationSchema,
  CONTACT_LIMITS,
  ContactReceiptSchema,
  ContactRequestSchema,
  EducationSchema,
  ExperienceSchema,
  HealthResponseSchema,
  PROBLEM_CONTENT_TYPE,
  ProblemSchema,
  ProfileSchema,
  ProjectDetailSchema,
  ProjectListSchema,
  PROJECTS_PAGE_SIZE,
  ProjectSummarySchema,
  PurgeResultSchema,
  site,
  SkillGroupSchema,
  SLUG_PATTERN,
  TagSchema,
} from "@starsagitarian/shared";
import pkg from "../../package.json" with { type: "json" };

/*
 * The OpenAPI 3.1 description of the API. Response bodies come straight from the Zod schemas the
 * routes validate against, so the documentation cannot describe a different shape from the one
 * that is sent. The contract tests check every response against this document.
 */

type JsonObject = Record<string, unknown>;

/** Every named schema, in the order they appear in the docs. */
const COMPONENTS = {
  ProjectList: ProjectListSchema,
  ProjectSummary: ProjectSummarySchema,
  ProjectDetail: ProjectDetailSchema,
  Tag: TagSchema,
  Profile: ProfileSchema,
  Experience: ExperienceSchema,
  SkillGroup: SkillGroupSchema,
  Certification: CertificationSchema,
  Education: EducationSchema,
  ContactRequest: ContactRequestSchema,
  ContactReceipt: ContactReceiptSchema,
  PurgeResult: PurgeResultSchema,
  Health: HealthResponseSchema,
  Problem: ProblemSchema,
} satisfies Record<string, z.ZodType>;

export type ComponentName = keyof typeof COMPONENTS;

const ref = (name: ComponentName) => ({ $ref: `#/components/schemas/${name}` });

function componentSchemas(): Record<string, JsonObject> {
  const registry = z.registry<{ id: string }>();
  for (const [id, schema] of Object.entries(COMPONENTS)) registry.add(schema, { id });
  const { schemas } = z.toJSONSchema(registry, {
    io: "output",
    uri: (id) => `#/components/schemas/${id}`,
  });
  // Components live inside the document, so they carry no dialect or identifier of their own.
  return Object.fromEntries(
    Object.entries(schemas).map(([id, schema]) => {
      const component: JsonObject = { ...schema };
      delete component.$schema;
      delete component.$id;
      return [id, component];
    }),
  );
}

const string = (description: string) => ({ description, schema: { type: "string" } });

const CONTENT_HEADERS = {
  "Cache-Control": string(
    "Cached for 5 minutes by browsers and an hour by the CDN, then served stale for up to a day while it refreshes.",
  ),
  ETag: string("Version of the response; send it back in If-None-Match to get a 304."),
};

const RATE_LIMIT_HEADERS = {
  RateLimit: string("Requests left in the current window (IETF draft-8 format)."),
  "RateLimit-Policy": string("The limit and window that apply (IETF draft-8 format)."),
};

function json(name: ComponentName, description: string, headers: JsonObject = {}) {
  return {
    description,
    headers: { ...CONTENT_HEADERS, ...RATE_LIMIT_HEADERS, ...headers },
    content: { "application/json": { schema: ref(name) } },
  };
}

function problem(description: string, headers: JsonObject = {}) {
  return {
    description,
    headers: { "Cache-Control": string("Always `no-store`: errors are never cached."), ...headers },
    content: { [PROBLEM_CONTENT_TYPE]: { schema: ref("Problem") } },
  };
}

const NOT_MODIFIED = { description: "Not modified: the copy named in If-None-Match is current." };

const RATE_LIMITED = problem("Too many requests from this client in the last minute.", {
  "Retry-After": string("Seconds to wait before trying again."),
});
const UNAVAILABLE = problem("The database is not configured or cannot be reached.");

const IF_NONE_MATCH = {
  name: "If-None-Match",
  in: "header",
  required: false,
  description: "An ETag from an earlier response, to get a 304 if nothing has changed.",
  schema: { type: "string" },
};

function paths(): JsonObject {
  return {
    "/v1/projects": {
      get: {
        operationId: "listProjects",
        tags: ["Projects"],
        summary: "List projects",
        description:
          "Published projects in their curated order, or best match first when searching. Filter by tag, search the text and page through the results.",
        parameters: [
          {
            name: "tag",
            in: "query",
            description: "Only projects with this tag, by slug (for example `cloud`).",
            schema: { type: "string", pattern: SLUG_PATTERN.source, maxLength: 40 },
          },
          {
            name: "q",
            in: "query",
            description:
              'Words to search for in titles, organisations, summaries and write-ups. Supports "quoted phrases", `or` and `-excluded` words.',
            schema: { type: "string", minLength: 1, maxLength: 100 },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 1000, default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: PROJECTS_PAGE_SIZE.max,
              default: PROJECTS_PAGE_SIZE.default,
            },
          },
          IF_NONE_MATCH,
        ],
        responses: {
          "200": json("ProjectList", "A page of projects."),
          "304": NOT_MODIFIED,
          "400": problem("A query parameter is invalid; the detail names it."),
          "429": RATE_LIMITED,
          "503": UNAVAILABLE,
        },
      },
    },
    "/v1/projects/{slug}": {
      get: {
        operationId: "getProject",
        tags: ["Projects"],
        summary: "Get a project",
        description: "One published project with its full write-up.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", pattern: SLUG_PATTERN.source, maxLength: 80 },
            example: "lightning-observation",
          },
          IF_NONE_MATCH,
        ],
        responses: {
          "200": json("ProjectDetail", "The project."),
          "304": NOT_MODIFIED,
          "404": problem("No published project has that slug."),
          "429": RATE_LIMITED,
          "503": UNAVAILABLE,
        },
      },
    },
    "/v1/profile": {
      get: {
        operationId: "getProfile",
        tags: ["Profile"],
        summary: "Get the résumé",
        description:
          "Headline, experience, skills, certifications and education. Dates are months (`YYYY-MM`).",
        parameters: [IF_NONE_MATCH],
        responses: {
          "200": json("Profile", "The résumé."),
          "304": NOT_MODIFIED,
          "404": problem("No profile has been set up."),
          "429": RATE_LIMITED,
          "503": UNAVAILABLE,
        },
      },
    },
    "/v1/profile/cv.pdf": {
      get: {
        operationId: "getCv",
        tags: ["Profile"],
        summary: "Download the CV",
        description:
          "The résumé as an A4 PDF, drawn from the same data as `GET /v1/profile`. It contains no phone number, email address or postal address.",
        parameters: [IF_NONE_MATCH],
        responses: {
          "200": {
            description: "The CV as a file download.",
            headers: {
              ...CONTENT_HEADERS,
              ...RATE_LIMIT_HEADERS,
              "Content-Disposition": string("`attachment` with the file name."),
            },
            content: { "application/pdf": {} },
          },
          "304": NOT_MODIFIED,
          "404": problem("No profile has been set up."),
          "429": RATE_LIMITED,
          "503": UNAVAILABLE,
        },
      },
    },
    "/v1/contact": {
      post: {
        operationId: "sendMessage",
        tags: ["Contact"],
        summary: "Send a message",
        description: [
          "Takes a message from the contact form on the site. In order: the body is validated, a filled-in honeypot field is dropped silently, the Cloudflare Turnstile token is verified, the sender is held to a few messages an hour, then the message is stored and emailed to the site owner.",
          "",
          "The site's script sends JSON. A browser without JavaScript posts the form itself (`application/x-www-form-urlencoded`, the same fields, with no token): that is answered with a 303 redirect back to the site, to `/contact/sent` or `/contact/not-sent/{reason}`. Messages without a token skip the bot check and are capped site-wide each day; the alert email flags them.",
          "",
          `Messages are kept for 12 months. The sender's IP address is stored only as a keyed hash. Browsers may call this only from the site itself (CORS). Limits: name ${CONTACT_LIMITS.name}, email ${CONTACT_LIMITS.email}, message ${CONTACT_LIMITS.message} characters.`,
        ].join("\n"),
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: ref("ContactRequest") },
            "application/x-www-form-urlencoded": { schema: ref("ContactRequest") },
          },
        },
        responses: {
          "303": {
            description:
              "A plain form post: back to the site, to `/contact/sent` or `/contact/not-sent/{reason}` (invalid, bot-check, limited, busy or unavailable).",
            headers: {
              Location: string("The page on the site that says what happened."),
              "Cache-Control": string("Always `no-store`."),
            },
          },
          "202": {
            description: "Received.",
            headers: {
              "Cache-Control": string("Always `no-store`."),
              ...RATE_LIMIT_HEADERS,
            },
            content: { "application/json": { schema: ref("ContactReceipt") } },
          },
          "400": problem("The body is invalid; the detail names the fields."),
          "403": problem(
            "The bot check failed, or the request came from a site that is not allowed.",
          ),
          "429": problem(
            "Too many messages from this sender, or today's allowance of messages without the bot check is used up.",
            {
              "Retry-After": string("Seconds to wait before trying again."),
            },
          ),
          "503": problem(
            "The contact form is not configured, the database is unreachable or the bot check is unavailable.",
          ),
        },
      },
    },
    "/cron/purge-contact-messages": {
      get: {
        operationId: "purgeContactMessages",
        tags: ["Maintenance"],
        summary: "Delete expired messages",
        description:
          "Deletes contact messages older than 12 months. Run daily by the scheduler, which authenticates with a bearer token.",
        security: [{ cronSecret: [] }],
        responses: {
          "200": {
            description: "How many messages were deleted.",
            headers: { "Cache-Control": string("Always `no-store`.") },
            content: { "application/json": { schema: ref("PurgeResult") } },
          },
          "401": problem("The bearer token is missing or wrong.", {
            "WWW-Authenticate": string("`Bearer`."),
          }),
          "503": problem("Scheduled jobs or the database are not configured."),
        },
      },
    },
    "/health": {
      get: {
        operationId: "getHealth",
        tags: ["Health"],
        summary: "Check the service",
        description:
          "A cheap liveness check. With `deep=1` it also checks the database, which wakes it if it is asleep.",
        parameters: [
          {
            name: "deep",
            in: "query",
            description: "`1` or `true` to check the database too.",
            schema: { type: "string", enum: ["1", "true"] },
          },
        ],
        responses: {
          "200": {
            description: "The service is up (and so is the database, on a deep check).",
            headers: { "Cache-Control": string("Always `no-store`.") },
            content: { "application/json": { schema: ref("Health") } },
          },
          "503": problem("Deep check only: the database is not configured or cannot be reached."),
        },
      },
    },
  };
}

/** Builds the OpenAPI document. It depends only on code, so it is the same on every server. */
export function buildOpenApiDocument(): JsonObject {
  return {
    openapi: "3.1.0",
    info: {
      title: "starsagitarian API",
      version: pkg.version,
      summary: `The content API behind ${site.url.replace(/^https:\/\//, "")}.`,
      description:
        "Projects, the résumé and the contact form of Baiju Joseph's portfolio, backed by PostgreSQL. Reads are cached at the CDN, errors use RFC 9457 problem details, and each client may make a limited number of requests a minute.",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: "/", description: "This server" }],
    tags: [
      { name: "Projects", description: "Portfolio projects." },
      { name: "Profile", description: "The résumé, as JSON or PDF." },
      { name: "Contact", description: "The contact form." },
      { name: "Health", description: "Service checks." },
      { name: "Maintenance", description: "Scheduled jobs, for the scheduler only." },
    ],
    paths: paths(),
    components: {
      schemas: componentSchemas(),
      securitySchemes: {
        cronSecret: {
          type: "http",
          scheme: "bearer",
          description: "The scheduler's secret (CRON_SECRET).",
        },
      },
    },
  };
}

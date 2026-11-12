import { Router } from "express";
import { buildOpenApiDocument } from "../openapi/document";

/** The spec and the docs page change only with a deploy: a day at the CDN, an hour in browsers. */
export const DOCS_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

/*
 * Swagger UI is loaded from jsDelivr at a pinned version, with Subresource Integrity, so the API
 * ships none of it and a changed file on the CDN would be refused by the browser.
 */
const SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.34.0";
const SCRIPT_INTEGRITY = "sha384-9Td7MKiIr2S83E1kZyyVi8KdJw/S8CpAvu0llLyMeg0xq/hDGiZJfVn0fV4llCmK";
const STYLE_INTEGRITY = "sha384-4c3vsE5f+trhFyHrFrLM1fFGUn531NIaC7dcqEWIJdoRQJ5CkJbSuSCwXLpaS1KF";

/** Only this page may load the CDN files; the rest of the API keeps Helmet's stricter default. */
const DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Swagger UI is styled for a light page; keep browsers in dark mode from darkening it. -->
    <meta name="color-scheme" content="light" />
    <title>starsagitarian API</title>
    <style>
      body {
        margin: 0;
        background: #fff;
      }
    </style>
    <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css" integrity="${STYLE_INTEGRITY}" crossorigin="anonymous" />
  </head>
  <body>
    <div id="docs"></div>
    <script src="${SWAGGER_UI}/swagger-ui-bundle.js" integrity="${SCRIPT_INTEGRITY}" crossorigin="anonymous"></script>
    <script src="/docs/init.js"></script>
  </body>
</html>
`;

// A separate file rather than an inline script, so the page needs no 'unsafe-inline' for scripts.
const INIT_SCRIPT = `SwaggerUIBundle({
  url: "/openapi.json",
  dom_id: "#docs",
  deepLinking: true,
  displayRequestDuration: true,
  validatorUrl: null,
});
`;

/**
 * `GET /openapi.json` is the OpenAPI 3.1 document.
 * `GET /docs` is the interactive documentation, where every endpoint can be tried.
 */
export function docsRouter(): Router {
  const router = Router();
  const document = buildOpenApiDocument();

  router.get("/openapi.json", (_req, res) => {
    res.set("Cache-Control", DOCS_CACHE_CONTROL).json(document);
  });

  router.get("/docs", (_req, res) => {
    res
      .set("Cache-Control", DOCS_CACHE_CONTROL)
      .set("Content-Security-Policy", DOCS_CSP)
      .type("html")
      .send(PAGE);
  });

  router.get("/docs/init.js", (_req, res) => {
    res.set("Cache-Control", DOCS_CACHE_CONTROL).type("text/javascript").send(INIT_SCRIPT);
  });

  return router;
}

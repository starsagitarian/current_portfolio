import { apiUrl } from "@/lib/api";

/**
 * GET /resume/cv.pdf: the CV, fetched from the API and served from the site's own address, so
 * the browser's download attribute applies (it is ignored for links to another site). Cached by
 * the CDN like the API's own response.
 */
export async function GET(): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl()}/v1/profile/cv.pdf`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return unavailable();
  }
  if (!upstream.ok || upstream.body === null) return unavailable();

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="cv.pdf"',
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function unavailable(): Response {
  return new Response("The CV is unavailable right now. Please try again in a minute.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

import type { MetadataRoute } from "next";
import { site } from "@starsagitarian/shared";

/**
 * Search engines may read everything but the working pages: the design prototype, the offline
 * page and the pages a form without JavaScript lands on. (Preview deployments are kept out of
 * search by the host itself.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/prototype", "/offline", "/contact/sent", "/contact/not-sent/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

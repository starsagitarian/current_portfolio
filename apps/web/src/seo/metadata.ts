import type { Metadata } from "next";
import { site } from "@starsagitarian/shared";

/** What every page's link preview shares: the site's name, language and kind. */
export const OPEN_GRAPH_BASE = {
  siteName: site.name,
  locale: "en_GB",
  type: "website",
} as const;

/**
 * A page's title, description, canonical address and link preview, in one place, so each page
 * states them once. (A page's own openGraph replaces the parent's whole, so the shared fields
 * are spread in here.)
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title?: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
}): Metadata {
  return {
    ...(title !== undefined && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      type,
      url: path,
      title: title === undefined ? `${site.name} · ${site.title}` : `${title} · ${site.name}`,
      description,
    },
  };
}

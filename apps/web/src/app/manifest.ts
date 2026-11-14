import type { MetadataRoute } from "next";
import { site } from "@starsagitarian/shared";

/**
 * The web app manifest: what lets the site be added to a home screen and open on its own,
 * without the browser's bars, like an installed app. No store is involved.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${site.name} · ${site.title}`,
    short_name: site.name,
    description: `Portfolio of ${site.name}, ${site.title.toLowerCase()} in London.`,
    lang: "en-GB",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // the daylight sky of the phone painting, and the cream of the icon for the splash screen
    theme_color: "#58aefb",
    background_color: "#ffefd6",
    categories: ["portfolio", "personalization"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // a long press on the icon (Android) goes straight to a section
    shortcuts: [
      { name: "Résumé", url: "/resume", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      {
        name: "Projects",
        url: "/projects",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Contact",
        url: "/contact",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

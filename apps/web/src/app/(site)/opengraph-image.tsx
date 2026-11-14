import { site } from "@starsagitarian/shared";
import { SHARE_SIZE, SHARE_TYPE, shareCard } from "@/seo/share-card";

export const alt = `${site.name}, ${site.title}, on the Thames at night`;
export const size = SHARE_SIZE;
export const contentType = SHARE_TYPE;

/** The link preview for the home page. */
export default function Image() {
  return shareCard({ title: "Hi, I’m Baiju.", lede: site.tagline });
}

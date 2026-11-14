import { site } from "@starsagitarian/shared";
import { SHARE_SIZE, SHARE_TYPE, shareCard } from "@/seo/share-card";

export const alt = `Credits for ${site.name}'s portfolio`;
export const size = SHARE_SIZE;
export const contentType = SHARE_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Credits",
    title: "What this site is made of",
    lede: "The artwork, typeface, icons, software and services behind it, and their licences.",
  });
}

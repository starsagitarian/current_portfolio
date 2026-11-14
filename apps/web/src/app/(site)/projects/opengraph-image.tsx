import { site } from "@starsagitarian/shared";
import { SHARE_SIZE, SHARE_TYPE, shareCard } from "@/seo/share-card";

export const alt = `Projects by ${site.name}`;
export const size = SHARE_SIZE;
export const contentType = SHARE_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Projects",
    title: "What I’ve built",
    lede: "Cloud pipelines, data services and websites, for publishers, a weather service and this site.",
  });
}

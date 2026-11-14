import { site } from "@starsagitarian/shared";
import { SHARE_SIZE, SHARE_TYPE, shareCard } from "@/seo/share-card";

export const alt = `Contact ${site.name}`;
export const size = SHARE_SIZE;
export const contentType = SHARE_TYPE;

export default function Image() {
  return shareCard({
    kicker: "Contact",
    title: "Let’s talk",
    lede: "Have a role or project in mind? Write to me: I read every message.",
  });
}

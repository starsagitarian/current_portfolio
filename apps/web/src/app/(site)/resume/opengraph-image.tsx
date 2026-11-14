import { site } from "@starsagitarian/shared";
import { getProfile } from "@/lib/profile";
import { SHARE_SIZE, SHARE_TYPE, shareCard } from "@/seo/share-card";

export const alt = `The résumé of ${site.name}, ${site.title}`;
export const size = SHARE_SIZE;
export const contentType = SHARE_TYPE;

export default async function Image() {
  const { profile } = await getProfile();
  const firstSentence = profile.summary.split(/(?<=\.)\s/)[0] ?? profile.summary;
  return shareCard({ kicker: "Résumé", title: profile.title, lede: firstSentence });
}

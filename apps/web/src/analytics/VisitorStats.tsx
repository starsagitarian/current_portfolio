import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Visitor statistics, the hosting platform's own and free: Web Analytics (pages viewed, where
 * visitors come from, their devices) and Speed Insights (how fast the site loads and responds for
 * real visitors, Interaction to Next Paint included, which the lab tests can only estimate).
 * Neither sets cookies or keeps anything that identifies a visitor, so there is no consent banner.
 *
 * Only on the hosting platform, which sets VERCEL while building: the scripts are served from
 * the deployment itself, so a local, Docker or CI build would only ask for files that are not
 * there.
 */
export function VisitorStats() {
  if (process.env.VERCEL !== "1") return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

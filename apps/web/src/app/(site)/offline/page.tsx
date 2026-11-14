import type { Metadata } from "next";
import { PageIntro } from "@/components/page/PageIntro";
import { TryAgain } from "./TryAgain";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

/**
 * What the service worker shows for a page that needs the network while there is none. Pages
 * already opened still open from the copy kept on the device.
 */
export default function OfflinePage() {
  return (
    <PageIntro
      title="You’re offline"
      lede="This page needs a connection. Pages you’ve already opened still work without one."
    >
      <TryAgain />
    </PageIntro>
  );
}

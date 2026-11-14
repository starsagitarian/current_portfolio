import type { ReactNode } from "react";
import { ScenePlates } from "@/components/scene/ScenePlates";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { TabBar } from "@/components/shell/TabBar";
import { InstallHint } from "@/pwa/InstallHint";
import "@/components/shell/shell.css";

/** The shell around every page: skip link, painted scene, header, content and tab bar. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="site-scene">
        <ScenePlates />
      </div>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="site-main">
        {children}
      </main>
      <TabBar />
      <InstallHint />
    </div>
  );
}

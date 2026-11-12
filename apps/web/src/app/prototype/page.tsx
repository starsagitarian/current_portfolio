import type { Metadata } from "next";
import { site } from "@starsagitarian/shared";
import { Character } from "@/components/character/Character";
import { ScenePlates } from "@/components/scene/ScenePlates";
import { SkyPanel } from "./SkyPanel";
import "./prototype.css";

// Art prototype: the painted scene, the character and the brand mark, for review before the real
// pages are built on them. Not linked from the site and kept out of search results.
export const metadata: Metadata = {
  title: "Art prototype",
  robots: { index: false, follow: false },
};

export default function PrototypePage() {
  return (
    <main className="proto">
      <ScenePlates />
      <header className="proto-header surface">
        <span className="proto-badge">
          {/* A pre-optimised static file; skips Vercel's image service and its monthly quota. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.webp" width={228} height={255} alt={`${site.brand} logo`} />
        </span>
        <span>
          <span className="proto-name">{site.name}</span>
          <span className="proto-title">{site.title}</span>
        </span>
      </header>
      <Character />
      <SkyPanel />
    </main>
  );
}

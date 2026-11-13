"use client";

import { useSyncExternalStore } from "react";
import { Character } from "./Character";

/**
 * The standing figure on the promenade beside a page's content, only where the screen has a
 * clear column for him (pages set the media query and the place, in CSS). Rendered only when the
 * query matches, so smaller screens never download the artwork.
 */
export function SceneFigure({ media, className }: { media: string; className: string }) {
  const shown = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(media);
      query.addEventListener("change", onChange);
      return () => {
        query.removeEventListener("change", onChange);
      };
    },
    () => window.matchMedia(media).matches,
    () => false,
  );
  if (!shown) return null;
  return (
    <div className={`scene-figure ${className}`} aria-hidden="true">
      <Character pose="standing" />
    </div>
  );
}

"use client";

import { ViewTransition, type ReactNode } from "react";

/** A project's tile, drawn on the server, with what the filter needs to know about it. */
export interface ProjectItem {
  slug: string;
  tags: string[];
  tile: ReactNode;
}

/**
 * The grid of tiles. The tiles themselves are drawn on the server and arrive ready-made, so the
 * browser runs no code for them; this only places them, and lets each keep its identity as the
 * filter adds and removes others (they glide, fade in and fade out).
 */
export function TileGrid({ items }: { items: ProjectItem[] }) {
  return (
    <ul className="project-grid">
      {items.map((item) => (
        <ViewTransition
          key={item.slug}
          name={`project-tile-${item.slug}`}
          enter={{ filter: "tile-in", default: "none" }}
          exit={{ filter: "tile-out", default: "none" }}
          update={{ filter: "tile-move", default: "none" }}
          share={{ filter: "tile-move", default: "none" }}
          default="none"
        >
          <li className="project-cell">{item.tile}</li>
        </ViewTransition>
      ))}
    </ul>
  );
}

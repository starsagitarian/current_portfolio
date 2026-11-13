"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addTransitionType, startTransition, useState, type MouseEvent } from "react";
import type { ProjectSummary, Tag } from "@starsagitarian/shared";
import { ProjectGrid } from "./ProjectTile";

type TagCount = Tag & { count: number };

const hrefFor = (tag: string | null) =>
  tag === null ? "/projects" : `/projects?tag=${encodeURIComponent(tag)}`;

/** A click the browser should handle itself: a new tab, a new window, a download. */
const isModified = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * The project list with its filter. The filter lives in the URL (?tag=web), so it survives a
 * refresh, can be shared, and the back button steps through it. Choosing a filter updates the
 * address and the grid at once, with no trip to the server: tiles that stay glide to their new
 * places, the rest fade in and out. The chips are ordinary links, so they also work as links.
 */
export function ProjectBrowser({
  projects,
  tags,
}: {
  projects: ProjectSummary[];
  tags: TagCount[];
}) {
  const known = (value: string | null) =>
    value !== null && tags.some((tag) => tag.slug === value) ? value : null;
  const fromUrl = known(useSearchParams().get("tag"));

  // Follow the address when it changes underneath (back, forward): adjusted while rendering.
  const [tag, setTag] = useState(fromUrl);
  const [lastUrlTag, setLastUrlTag] = useState(fromUrl);
  if (fromUrl !== lastUrlTag) {
    setLastUrlTag(fromUrl);
    setTag(fromUrl);
  }

  function choose(event: MouseEvent<HTMLAnchorElement>, next: string | null) {
    if (isModified(event)) return;
    event.preventDefault();
    if (next === tag) return;
    startTransition(() => {
      addTransitionType("filter");
      setTag(next);
    });
    window.history.pushState(null, "", hrefFor(next));
  }

  const shown =
    tag === null ? projects : projects.filter((p) => p.tags.some((t) => t.slug === tag));
  const label = tags.find((t) => t.slug === tag)?.label;
  const options = [{ slug: null, label: "All", count: projects.length }, ...tags];

  return (
    <>
      <nav className="project-filter" aria-label="Filter projects">
        <span className="filter-indicator" aria-hidden="true" />
        {options.map((option) => (
          <Link
            key={option.label}
            href={hrefFor(option.slug)}
            prefetch={false}
            scroll={false}
            className="filter-chip"
            aria-current={option.slug === tag ? "true" : undefined}
            onClick={(event) => {
              choose(event, option.slug);
            }}
          >
            {option.label}
            <span className="filter-count" aria-hidden="true">
              {option.count}
            </span>
            <span className="sr-only"> ({option.count} projects)</span>
          </Link>
        ))}
      </nav>
      <p className="sr-only" role="status">
        {label === undefined
          ? `Showing all ${shown.length} projects`
          : `Showing ${shown.length} ${label.toLowerCase()} projects`}
      </p>
      <ProjectGrid projects={shown} />
    </>
  );
}

"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCurrent, SECTIONS } from "./nav";

/**
 * The bottom tab bar on phones and tablets: a glass capsule with the three sections. A gold
 * pill slides to the current one.
 */
export function TabBar() {
  const pathname = usePathname();
  const current = SECTIONS.findIndex((item) => isCurrent(item, pathname));
  return (
    <nav
      aria-label="Sections"
      // Home on a tablet has a card for each section, so it needs no tab bar.
      className={`tab-bar veil${pathname === "/" ? " tab-bar-home" : ""}`}
      data-current={current >= 0 ? "" : undefined}
      style={{ "--tab": Math.max(current, 0) } as CSSProperties}
    >
      <span className="tab-indicator" aria-hidden="true" />
      {SECTIONS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="tab"
          aria-current={isCurrent(item, pathname) ? "page" : undefined}
        >
          <item.icon aria-hidden="true" size={22} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

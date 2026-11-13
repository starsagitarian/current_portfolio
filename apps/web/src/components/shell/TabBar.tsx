"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCurrent, SECTIONS } from "./nav";

/** The bottom tab bar on phones and tablets: the three sections, the current one in a gold pill. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="tab-bar surface">
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

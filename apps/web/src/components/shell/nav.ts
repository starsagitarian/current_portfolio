import { FileText, Folder, House, Mail, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/resume" | "/projects" | "/contact";
  label: string;
  icon: LucideIcon;
}

export const HOME: NavItem = { href: "/", label: "Home", icon: House };

/** The three sections, in the order of the tab bar and the desktop navigation. */
export const SECTIONS: NavItem[] = [
  { href: "/resume", label: "Résumé", icon: FileText },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/contact", label: "Contact", icon: Mail },
];

/** Whether a nav item is the current page (a section stays current on its sub-pages). */
export function isCurrent(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

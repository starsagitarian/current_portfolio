import type { ReactNode } from "react";

/**
 * Re-created on every navigation (unlike the layout), so each page's content slides and fades in
 * while the header, the tab bar and the scene stay where they are.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}

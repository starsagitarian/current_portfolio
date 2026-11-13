import type { ReactNode } from "react";
import "./page.css";

/**
 * A page's title and opening line, set straight on the painting like the home hero: a feathered
 * scrim behind the block and a halo around each letter keep it readable with no card around it.
 */
export function PageIntro({
  title,
  lede,
  children,
}: {
  title: string;
  lede: ReactNode;
  /** Buttons or links under the lede. */
  children?: ReactNode;
}) {
  return (
    <div className="page-intro bare rise">
      <h1 className="page-title">{title}</h1>
      <p className="page-lede">{lede}</p>
      {children !== undefined && <div className="page-actions">{children}</div>}
    </div>
  );
}

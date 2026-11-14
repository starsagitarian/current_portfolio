import Link from "next/link";
import { site } from "@starsagitarian/shared";

const REPOSITORY = "https://github.com/starsagitarian/current_portfolio";

/** A quiet line at the end of the longer pages: who made it, the credits and the code. */
export function SiteFooter() {
  return (
    <footer className="site-footer bare">
      <span>© {site.name}</span>
      <span aria-hidden="true">·</span>
      <Link href="/credits">Credits</Link>
      <span aria-hidden="true">·</span>
      <a href={REPOSITORY} rel="noopener">
        Source code
      </a>
    </footer>
  );
}

import type { ReactNode } from "react";
import { Character } from "@/components/character/Character";
import "@/components/contact/contact.css";
import "@/components/page/page.css";

/**
 * The contact pages (the form, and the pages a form without JavaScript lands on): Baiju waves
 * from the foot of the page on phones and tablets, and from beside the form on desktops. Kept in
 * the layout, so he stays put from the form to its thank-you.
 */
export default function ContactLayout({ children }: { children: ReactNode }) {
  return (
    <div className="contact">
      <div className="contact-content">{children}</div>
      <div className="contact-figure" aria-hidden="true">
        <Character pose="waving" />
      </div>
    </div>
  );
}

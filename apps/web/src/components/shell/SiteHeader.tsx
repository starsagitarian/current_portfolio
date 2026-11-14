"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { site } from "@starsagitarian/shared";
import { Character } from "@/components/character/Character";
import { GitHubIcon, LinkedInIcon } from "./BrandIcons";
import { HOME, isCurrent, SECTIONS } from "./nav";

/**
 * The header on every page. Phones and tablets: home, name and a menu button. Desktops: the
 * emblem, the name and the three sections, the current one in a gold pill.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // a link in the menu changes the page: close the menu when it does
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <header className="site-header">
      <Link href="/" className="header-home icon-button veil" aria-label="Home">
        <HOME.icon aria-hidden="true" size={22} />
      </Link>
      <Link href="/" className="header-brand bare">
        <span className="header-emblem">
          {/* A pre-optimised static file; skips Vercel's image service and its monthly quota. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.webp" width={40} height={40} alt="" />
        </span>
        <span>
          <span className="header-name">{site.name}</span>
          <span className="header-title">{site.title}</span>
        </span>
      </Link>

      <nav aria-label="Sections" className="header-nav veil">
        <span className="nav-indicator" aria-hidden="true" />
        {SECTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            aria-current={isCurrent(item, pathname) ? "page" : undefined}
          >
            <item.icon aria-hidden="true" size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="header-menu icon-button veil"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-controls="site-menu"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Menu aria-hidden="true" size={26} />
      </button>

      {/* A modal dialog: the browser keeps focus inside it, closes it on Escape and hands focus
          back to the menu button. */}
      <dialog
        id="site-menu"
        ref={dialog}
        className="site-menu"
        aria-label="Menu"
        onClose={() => {
          setOpen(false);
        }}
      >
        <div className="menu-top">
          <Link href="/" className="icon-button veil" aria-label="Home">
            <HOME.icon aria-hidden="true" size={22} />
          </Link>
          <span className="menu-brand">
            <span className="header-name">{site.name}</span>
            <span className="header-title">{site.title}</span>
          </span>
          <button
            type="button"
            className="icon-button veil"
            aria-label="Close menu"
            onClick={() => {
              dialog.current?.close();
            }}
          >
            <X aria-hidden="true" size={26} />
          </button>
        </div>
        <nav aria-label="Menu" className="menu-links">
          {[HOME, ...SECTIONS].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item, pathname) ? "page" : undefined}
              onClick={() => {
                dialog.current?.close();
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {open && <Character pose="waving" className="menu-character" />}
        <div className="menu-profiles">
          <a href={site.links.github} rel="me noopener" className="profile-link">
            <GitHubIcon />
            GitHub
          </a>
          <a href={site.links.linkedin} rel="me noopener" className="profile-link">
            <LinkedInIcon />
            LinkedIn
          </a>
          <Link
            href="/credits"
            className="profile-link"
            onClick={() => {
              dialog.current?.close();
            }}
          >
            Credits
          </Link>
        </div>
      </dialog>
    </header>
  );
}

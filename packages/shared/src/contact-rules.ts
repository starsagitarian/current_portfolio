/*
 * The contact form's rules that the browser needs too, kept apart from the Zod schemas so the
 * site's scripts can use them without loading Zod.
 */

/** Field limits, matching the database columns. */
export const CONTACT_LIMITS = { name: 100, email: 254, message: 5000 } as const;

/** Why a message was not sent, as the site explains it. */
export const CONTACT_FAILURES = ["invalid", "bot-check", "limited", "busy", "unavailable"] as const;
export type ContactFailure = (typeof CONTACT_FAILURES)[number];

/**
 * Where a plain HTML form post (no JavaScript) is sent back to on the site, by outcome. The API
 * answers such posts with a 303 redirect to one of these pages.
 */
export const CONTACT_PAGES = {
  sent: "/contact/sent",
  notSent: (reason: ContactFailure) => `/contact/not-sent/${reason}`,
} as const;

import { z } from "zod";

/** Field limits, matching the database columns. */
export const CONTACT_LIMITS = { name: 100, email: 254, message: 5000 } as const;

/** What the contact form sends to `POST /v1/contact`. */
export const ContactRequestSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT_LIMITS.name),
  /** Send it trimmed: the format is checked as given. */
  email: z.email().max(CONTACT_LIMITS.email),
  message: z.string().trim().min(1).max(CONTACT_LIMITS.message),
  /**
   * Honeypot. The form hides this field from people, so only bots fill it in. A request with
   * it set is answered as if it worked, and dropped.
   */
  website: z.string().max(200).optional(),
  /**
   * The token from the Cloudflare Turnstile widget on the form. Missing when the visitor's
   * browser runs no JavaScript: such messages skip the check and are capped site-wide each day.
   */
  turnstileToken: z.string().min(1).max(2048).optional(),
});

/**
 * Where a plain HTML form post (no JavaScript) is sent back to on the site, by outcome. The API
 * answers such posts with a 303 redirect to one of these pages.
 */
export const CONTACT_PAGES = {
  sent: "/contact/sent",
  notSent: (reason: ContactFailure) => `/contact/not-sent/${reason}`,
} as const;

/** Why a message was not sent, as the site explains it. */
export const CONTACT_FAILURES = ["invalid", "bot-check", "limited", "busy", "unavailable"] as const;
export type ContactFailure = (typeof CONTACT_FAILURES)[number];

/** The answer to an accepted message. */
export const ContactReceiptSchema = z.object({
  status: z.literal("received"),
});

/** The answer to the daily clean-up of old contact messages. */
export const PurgeResultSchema = z.object({
  /** How many messages were deleted. */
  deleted: z.number().int().min(0),
  /** Messages received before this time were deleted. */
  before: z.iso.datetime(),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;
export type ContactReceipt = z.infer<typeof ContactReceiptSchema>;
export type PurgeResult = z.infer<typeof PurgeResultSchema>;

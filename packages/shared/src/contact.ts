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
  /** The token from the Cloudflare Turnstile widget on the form. */
  turnstileToken: z.string().min(1).max(2048),
});

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

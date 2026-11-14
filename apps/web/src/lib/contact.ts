import { CONTACT_LIMITS } from "@starsagitarian/shared";
import { apiUrl } from "./api";

/** Cloudflare's published test site key: the widget always passes (pairs with the test secret). */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

/**
 * Where browsers send the form: the API's public address. Inside Docker the server reaches the
 * API by its container name, which a browser cannot, so PUBLIC_API_URL can say otherwise.
 */
export function contactEndpoint(): string {
  const base = (process.env.PUBLIC_API_URL ?? apiUrl()).replace(/\/$/, "");
  return `${base}/v1/contact`;
}

/** The Turnstile site key (public by design); the test key when none is set. */
export function turnstileSiteKey(): string {
  return process.env.TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY;
}

export type Field = "name" | "email" | "message";
export type FieldErrors = Partial<Record<Field, string>>;

// The same rule the API applies (z.email), in a form a browser can show while typing.
const EMAIL = /^(?!\.)(?!.*\.\.)([\w'+.-]+)@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i;

/** Checks the fields as the API will, so most mistakes are caught before sending. */
export function validate(fields: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  const name = fields.name.trim();
  const email = fields.email.trim();
  const message = fields.message.trim();
  if (name === "") errors.name = "Please tell me your name.";
  else if (name.length > CONTACT_LIMITS.name) {
    errors.name = `Please keep your name under ${CONTACT_LIMITS.name} characters.`;
  }
  if (email === "") errors.email = "Please add your email address, so I can reply.";
  else if (email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) {
    errors.email = "That email address doesn't look right.";
  }
  if (message === "") errors.message = "Please write a message.";
  else if (message.length > CONTACT_LIMITS.message) {
    errors.message = `Please keep it under ${CONTACT_LIMITS.message.toLocaleString("en-GB")} characters.`;
  }
  return errors;
}

/** Field errors from the API's 400 detail ("Invalid request body. email: Invalid email; ..."). */
export function fieldErrorsFromDetail(detail: string): FieldErrors {
  const errors: FieldErrors = {};
  const messages: Record<Field, string> = {
    name: "Please check your name.",
    email: "That email address doesn't look right.",
    message: "Please check your message.",
  };
  for (const field of Object.keys(messages) as Field[]) {
    if (new RegExp(`(^|[ ;.])${field}:`).test(detail)) errors[field] = messages[field];
  }
  return errors;
}

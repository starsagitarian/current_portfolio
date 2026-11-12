import { Router } from "express";
import { ContactReceiptSchema, ContactRequestSchema } from "@starsagitarian/shared";
import { BotCheckUnavailableError } from "../contact/bot-check";
import { HttpError } from "../errors";
import { restrictedCors } from "../http/cors";
import { NO_STORE } from "../http/cache";
import { parseBody } from "../http/query";
import type { ContactService } from "../services/contact";

export interface ContactRouteOptions {
  /** Undefined when the form is not configured: every request then gets a 503. */
  contact: ContactService | undefined;
  isAllowedOrigin: (origin: string) => boolean;
}

const RECEIPT = ContactReceiptSchema.parse({ status: "received" });

/**
 * `POST /v1/contact` takes a message from the contact form: validated, bot-checked, limited per
 * sender, stored, then emailed to the site owner. Messages are deleted after 12 months.
 */
export function contactRouter({ contact, isAllowedOrigin }: ContactRouteOptions): Router {
  const router = Router();
  router.use("/contact", restrictedCors(isAllowedOrigin));

  router.post("/contact", async (req, res) => {
    // Browsers always send Origin on a cross-site POST, so a site that is not listed is refused.
    const origin = req.headers.origin;
    if (origin !== undefined && !isAllowedOrigin(origin)) {
      throw new HttpError(403, "Forbidden", "This site may not send messages to the API.");
    }
    if (contact === undefined) {
      throw new HttpError(503, "Service Unavailable", "The contact form is not configured.");
    }

    const request = parseBody(ContactRequestSchema, req.body);

    let outcome;
    try {
      outcome = await contact.submit(request, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    } catch (error) {
      if (!(error instanceof BotCheckUnavailableError)) throw error;
      req.log.error({ err: error }, "contact: bot check unavailable");
      throw new HttpError(503, "Service Unavailable", "The bot check is unavailable. Try again.");
    }

    switch (outcome.kind) {
      case "ignored":
        req.log.info("contact: honeypot filled, message dropped");
        break;
      case "bot":
        throw new HttpError(403, "Forbidden", "The bot check failed. Please try again.");
      case "limited":
        res.set("Retry-After", String(outcome.retryAfterSeconds));
        throw new HttpError(
          429,
          "Too Many Requests",
          "You have sent several messages in the last hour. Please try again later.",
        );
      case "stored":
        // Never the message or the sender's details: only what traces it. The mailer's errors
        // carry a status code, never the provider's response body.
        if (outcome.emailError !== undefined) {
          req.log.error(
            {
              messageId: outcome.id,
              reason: outcome.emailError instanceof Error ? outcome.emailError.message : "unknown",
            },
            "contact: stored, but the alert email failed",
          );
        } else {
          req.log.info({ messageId: outcome.id, emailed: outcome.emailed }, "contact: stored");
        }
        break;
    }

    res.status(202).set("Cache-Control", NO_STORE).json(RECEIPT);
  });

  return router;
}

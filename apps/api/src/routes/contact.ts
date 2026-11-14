import express, { Router, type Request, type Response } from "express";
import {
  CONTACT_PAGES,
  ContactReceiptSchema,
  ContactRequestSchema,
  type ContactFailure,
} from "@starsagitarian/shared";
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

/** A refusal the site can explain: the problem response for scripts, a page for plain forms. */
class Refusal extends HttpError {
  constructor(
    status: number,
    title: string,
    detail: string,
    readonly reason: ContactFailure,
  ) {
    super(status, title, detail);
  }
}

/** A plain HTML form post, sent by a browser without JavaScript. */
const isFormPost = (req: Request) =>
  typeof req.is("application/x-www-form-urlencoded") === "string";

/** A form post's fields, in the shape of the JSON body (repeated fields stay arrays, and fail). */
function fromForm(body: Record<string, unknown>) {
  const token = body["cf-turnstile-response"];
  return {
    name: body.name,
    email: typeof body.email === "string" ? body.email.trim() : body.email,
    message: body.message,
    website: body.website,
    turnstileToken: typeof token === "string" && token !== "" ? token : undefined,
  };
}

/**
 * `POST /v1/contact` takes a message from the contact form: validated, bot-checked, limited per
 * sender, stored, then emailed to the site owner. Messages are deleted after 12 months.
 *
 * The site's script sends JSON and reads the answer. Without JavaScript the browser posts the
 * form itself; that is answered with a redirect back to a page on the site that says what
 * happened (see CONTACT_PAGES). Such posts carry no bot-check token, so they are held to a small
 * site-wide daily allowance.
 */
export function contactRouter({ contact, isAllowedOrigin }: ContactRouteOptions): Router {
  const router = Router();
  router.use("/contact", restrictedCors(isAllowedOrigin));

  async function accept(req: Request, body: unknown): Promise<void> {
    if (contact === undefined) {
      throw new Refusal(
        503,
        "Service Unavailable",
        "The contact form is not configured.",
        "unavailable",
      );
    }
    let request;
    try {
      request = parseBody(ContactRequestSchema, body);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      throw new Refusal(400, error.title, error.detail ?? error.title, "invalid");
    }

    let outcome;
    try {
      outcome = await contact.submit(request, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    } catch (error) {
      if (!(error instanceof BotCheckUnavailableError)) throw error;
      req.log.error({ err: error }, "contact: bot check unavailable");
      throw new Refusal(
        503,
        "Service Unavailable",
        "The bot check is unavailable. Try again.",
        "unavailable",
      );
    }

    switch (outcome.kind) {
      case "ignored":
        req.log.info("contact: honeypot filled, message dropped");
        return;
      case "bot":
        throw new Refusal(403, "Forbidden", "The bot check failed. Please try again.", "bot-check");
      case "limited":
      case "busy": {
        const error = new Refusal(
          429,
          "Too Many Requests",
          outcome.kind === "limited"
            ? "You have sent several messages in the last hour. Please try again later."
            : "Messages sent without the bot check are limited each day, and today's are used up. Turn on JavaScript, or try again tomorrow.",
          outcome.kind,
        );
        req.res?.set("Retry-After", String(outcome.retryAfterSeconds));
        throw error;
      }
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
        return;
    }
  }

  /** Sends a plain form back to the site page for the outcome. */
  function backTo(res: Response, origin: string, path: string) {
    // no body: the browser follows the Location straight away
    res.status(303).set("Cache-Control", NO_STORE).location(`${origin}${path}`).end();
  }

  router.post(
    "/contact",
    express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 20 }),
    async (req, res) => {
      // Browsers always send Origin on a cross-site POST, so a site that is not listed is refused.
      const origin = req.headers.origin;
      if (origin !== undefined && !isAllowedOrigin(origin)) {
        throw new HttpError(403, "Forbidden", "This site may not send messages to the API.");
      }

      if (!isFormPost(req)) {
        await accept(req, req.body);
        res.status(202).set("Cache-Control", NO_STORE).json(RECEIPT);
        return;
      }

      // A plain form: it can only be sent back to the site it came from.
      if (origin === undefined) {
        throw new HttpError(403, "Forbidden", "A form post must come from the site.");
      }
      try {
        await accept(req, fromForm(req.body as Record<string, unknown>));
        backTo(res, origin, CONTACT_PAGES.sent);
      } catch (error) {
        if (!(error instanceof Refusal)) {
          req.log.error({ err: error }, "contact: form post failed");
        }
        const reason = error instanceof Refusal ? error.reason : "unavailable";
        backTo(res, origin, CONTACT_PAGES.notSent(reason));
      }
    },
  );

  return router;
}

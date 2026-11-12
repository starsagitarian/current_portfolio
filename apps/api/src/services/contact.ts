import { createHmac } from "node:crypto";
import type { ContactRequest } from "@starsagitarian/shared";
import type { BotCheck } from "../contact/bot-check";
import type { Mailer } from "../contact/mailer";
import type { ContactMessageRepository } from "../repositories/contact-messages";

const HOUR_MS = 60 * 60 * 1000;
/** Messages are kept for 12 months, then deleted by the daily clean-up. */
export const RETENTION_MONTHS = 12;

export interface ContactSettings {
  ipHashSalt: string;
  limitPerHour: number;
  /** Where alerts go; undefined stores messages without emailing. */
  alertEmail: string | undefined;
}

export interface Sender {
  ip: string | undefined;
  userAgent: string | undefined;
}

export type SubmitOutcome =
  /** The honeypot was filled in: answered like a success, not stored or sent. */
  | { kind: "ignored" }
  | { kind: "bot" }
  | { kind: "limited"; retryAfterSeconds: number }
  | { kind: "stored"; id: string; emailed: boolean; emailError?: unknown };

/** One line per field, and no line breaks inside one, so a name cannot add email headers. */
const singleLine = (text: string) => text.replace(/[\r\n]+/g, " ").trim();

export class ContactService {
  constructor(
    private readonly repository: ContactMessageRepository,
    private readonly botCheck: BotCheck,
    private readonly mailer: Mailer | undefined,
    private readonly settings: ContactSettings,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** A keyed hash of the IP: stable enough to count messages, useless without the salt. */
  hashIp(ip: string | undefined): string {
    return createHmac("sha256", this.settings.ipHashSalt)
      .update(ip ?? "unknown")
      .digest("hex");
  }

  async submit(request: ContactRequest, sender: Sender): Promise<SubmitOutcome> {
    if (request.website !== undefined && request.website.trim() !== "") return { kind: "ignored" };

    // The bot check comes before the database, so automated traffic never wakes it.
    if (!(await this.botCheck.verify(request.turnstileToken, sender.ip))) return { kind: "bot" };

    const now = this.now();
    const result = await this.repository.storeWithinLimit(
      {
        name: request.name,
        email: request.email,
        message: request.message,
        ipHash: this.hashIp(sender.ip),
        userAgent: sender.userAgent?.slice(0, 300) ?? null,
      },
      {
        limit: this.settings.limitPerHour,
        windowStart: new Date(now.getTime() - HOUR_MS),
        windowMs: HOUR_MS,
      },
    );
    if (!result.stored) {
      const seconds = Math.ceil((result.retryAt.getTime() - now.getTime()) / 1000);
      return { kind: "limited", retryAfterSeconds: Math.max(1, seconds) };
    }

    const { alertEmail } = this.settings;
    if (this.mailer === undefined || alertEmail === undefined) {
      return { kind: "stored", id: result.id, emailed: false };
    }
    // The message is already safe in the database, so a failed alert does not fail the request.
    try {
      await this.mailer.send({
        to: alertEmail,
        replyTo: request.email,
        subject: `Portfolio message from ${singleLine(request.name)}`,
        text: [
          "A new message came in through the contact form on your portfolio.",
          "",
          `From: ${singleLine(request.name)} <${request.email}>`,
          `Sent: ${result.createdAt.toISOString()}`,
          "",
          request.message,
          "",
          "Reply to this email to answer them.",
        ].join("\n"),
        idempotencyKey: `contact-${result.id}`,
      });
      return { kind: "stored", id: result.id, emailed: true };
    } catch (error) {
      return { kind: "stored", id: result.id, emailed: false, emailError: error };
    }
  }
}

/** Deletes contact messages once they are older than the retention period. */
export class RetentionService {
  constructor(
    private readonly repository: ContactMessageRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async purgeExpired(): Promise<{ deleted: number; before: Date }> {
    const before = new Date(this.now().getTime());
    before.setUTCMonth(before.getUTCMonth() - RETENTION_MONTHS);
    return { deleted: await this.repository.deleteOlderThan(before), before };
  }
}

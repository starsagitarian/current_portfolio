const RESEND_EMAILS = "https://api.resend.com/emails";
const TIMEOUT_MS = 8_000;

export interface Mail {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  /** Sending twice with the same key delivers once. */
  idempotencyKey: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Sends email through Resend's HTTP API, so no SMTP client or SDK is needed. */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(mail: Mail): Promise<void> {
    const res = await fetch(RESEND_EMAILS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": mail.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.from,
        to: [mail.to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // The response body can echo the request, so only the status is reported.
    if (!res.ok) throw new Error(`Resend answered ${res.status}`);
  }
}

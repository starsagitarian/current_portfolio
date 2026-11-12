const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;

/** Decides whether a form submission came from a person. */
export interface BotCheck {
  /** True when the token is valid. Throws when the check itself cannot be made. */
  verify(token: string, ip: string | undefined): Promise<boolean>;
}

/** Thrown when the verification service cannot be reached or answers with an error. */
export class BotCheckUnavailableError extends Error {
  constructor(cause: unknown) {
    super("The bot check service is unavailable.", { cause });
    this.name = "BotCheckUnavailableError";
  }
}

/** Cloudflare Turnstile server-side verification. */
export class TurnstileBotCheck implements BotCheck {
  constructor(private readonly secret: string) {}

  async verify(token: string, ip: string | undefined): Promise<boolean> {
    const body = new URLSearchParams({ secret: this.secret, response: token });
    if (ip !== undefined) body.set("remoteip", ip);

    let result: unknown;
    try {
      const res = await fetch(SITEVERIFY, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`siteverify answered ${res.status}`);
      result = await res.json();
    } catch (error) {
      throw new BotCheckUnavailableError(error);
    }
    return typeof result === "object" && result !== null && "success" in result
      ? result.success === true
      : false;
  }
}

"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Check, LoaderCircle, Send } from "lucide-react";
import { CONTACT_LIMITS, ProblemSchema } from "@starsagitarian/shared";
import { fieldErrorsFromDetail, validate, type Field, type FieldErrors } from "@/lib/contact";

/** The part of Cloudflare Turnstile's browser API the form uses. */
interface Turnstile {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      appearance: "interaction-only";
      size: "flexible";
      theme: "light" | "dark";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** How long to wait for the bot check to hand over its token when Send is pressed early. */
const TOKEN_WAIT_MS = 12_000;

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; name: string; email: string }
  | { kind: "failed"; message: string };

const EMPTY = { name: "", email: "", message: "" };
const subscribeNever = () => () => undefined;

/** Night or day, as the page is painted now: the widget (when it shows at all) matches it. */
const pageTheme = (): "light" | "dark" =>
  Number(document.documentElement.style.getPropertyValue("--sky") || "0") > 1.5 ? "dark" : "light";

/**
 * The contact form. With JavaScript, it checks each field as you go, runs Cloudflare's invisible
 * bot check, sends the message to the API and says how it went, all without leaving the page.
 * Without JavaScript it is an ordinary form: the browser posts it to the API, which sends the
 * visitor back to a page saying what happened.
 */
export function ContactForm({ endpoint, siteKey }: { endpoint: string; siteKey: string }) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const tokenWaiters = useRef<((token: string | null) => void)[]>([]);
  const thanks = useRef<HTMLHeadingElement>(null);

  // true once React runs in the browser: the form's own checks then replace the browser's
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [scriptReady, setScriptReady] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const formShown = status.kind !== "sent";

  // Render the invisible check once its script is in; it hands over a single-use token.
  useEffect(() => {
    const turnstile = window.turnstile;
    const element = widget.current;
    if (!scriptReady || turnstile === undefined || element === null) return;
    const settle = (value: string | null) => {
      token.current = value;
      if (value === null) return;
      for (const resolve of tokenWaiters.current.splice(0)) resolve(value);
    };
    widgetId.current = turnstile.render(element, {
      sitekey: siteKey,
      appearance: "interaction-only",
      size: "flexible",
      theme: pageTheme(),
      callback: settle,
      "expired-callback": () => {
        settle(null);
      },
      "error-callback": () => {
        settle(null);
      },
    });
    return () => {
      if (widgetId.current !== null) turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady, siteKey, formShown]);

  useEffect(() => {
    if (status.kind === "sent") thanks.current?.focus();
  }, [status.kind]);

  const clientErrors = validate(values);
  const errorFor = (field: Field) =>
    serverErrors[field] ?? (touched[field] === true ? clientErrors[field] : undefined);

  /** The bot check's token: at once if ready, or when it arrives, or null after a while. */
  function awaitToken(): Promise<string | null> {
    if (token.current !== null) return Promise.resolve(token.current);
    return new Promise((resolve) => {
      tokenWaiters.current.push(resolve);
      setTimeout(() => {
        resolve(null);
      }, TOKEN_WAIT_MS);
    });
  }

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    if (status.kind === "failed") setStatus({ kind: "idle" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;
    setTouched({ name: true, email: true, message: true });
    const errors = validate(values);
    const first = (Object.keys(errors) as Field[])[0];
    if (first !== undefined) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setStatus({ kind: "sending" });
    const turnstileToken = await awaitToken();
    if (turnstileToken === null) {
      setStatus({
        kind: "failed",
        message:
          "The spam check didn't finish. Please wait a moment and press Send again, or reload the page.",
      });
      return;
    }

    const honeypot = form.current?.querySelector<HTMLInputElement>('[name="website"]')?.value;
    const body = {
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
      ...(honeypot ? { website: honeypot } : {}),
      turnstileToken,
    };

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setStatus({
        kind: "failed",
        message: "I couldn't reach the server. Please check your connection and try again.",
      });
      return;
    } finally {
      // a token works once: get a fresh one for whatever comes next
      token.current = null;
      if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
    }

    if (res.ok) {
      setStatus({ kind: "sent", name: body.name, email: body.email });
      setValues(EMPTY);
      setTouched({});
      return;
    }

    const problem = ProblemSchema.safeParse(await res.json().catch(() => null));
    const detail = problem.success ? (problem.data.detail ?? "") : "";
    if (res.status === 400) {
      const fields = fieldErrorsFromDetail(detail);
      setServerErrors(fields);
      setStatus({
        kind: "failed",
        message: "Something in the form needs another look. The fields to check are marked.",
      });
      return;
    }
    const messages: Record<number, string> = {
      403: "The spam check didn't pass. Please try again; if it keeps happening, reach me on LinkedIn.",
      429:
        detail || "You've sent several messages in the last hour. Please try again a little later.",
    };
    setStatus({
      kind: "failed",
      message:
        messages[res.status] ??
        "The message couldn't be sent just now. Please try again in a few minutes.",
    });
  }

  if (status.kind === "sent") {
    const first = status.name.split(/\s+/)[0] ?? status.name;
    return (
      <div className="contact-sent" role="status">
        <span className="contact-sent-mark" aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </span>
        <h2 ref={thanks} tabIndex={-1} className="contact-sent-title">
          Thank you, {first}.
        </h2>
        <p className="contact-sent-text">
          Your message is on its way. I&apos;ll reply to <strong>{status.email}</strong> soon.
        </p>
        <button
          type="button"
          className="button contact-again"
          onClick={() => {
            setStatus({ kind: "idle" });
          }}
        >
          Send another message
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    );
  }

  const sending = status.kind === "sending";
  const remaining = CONTACT_LIMITS.message - values.message.length;

  return (
    <form
      ref={form}
      className="contact-form"
      action={endpoint}
      method="post"
      // with JavaScript, the form's own messages replace the browser's
      noValidate={hydrated}
      onSubmit={(event) => {
        void submit(event);
      }}
      aria-describedby={status.kind === "failed" ? `${id}-failed` : undefined}
    >
      <Script
        src={TURNSTILE_SCRIPT}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      <TextField
        id={`${id}-name`}
        label="Name"
        name="name"
        autoComplete="name"
        maxLength={CONTACT_LIMITS.name}
        value={values.name}
        error={errorFor("name")}
        onChange={(value) => {
          update("name", value);
        }}
        onBlur={() => {
          setTouched((t) => ({ ...t, name: true }));
        }}
      />
      <TextField
        id={`${id}-email`}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        maxLength={CONTACT_LIMITS.email}
        hint="Only to reply to you; never shared."
        value={values.email}
        error={errorFor("email")}
        onChange={(value) => {
          update("email", value);
        }}
        onBlur={() => {
          setTouched((t) => ({ ...t, email: true }));
        }}
      />
      <TextField
        id={`${id}-message`}
        label="Message"
        name="message"
        multiline
        maxLength={CONTACT_LIMITS.message}
        hint={
          remaining < 500
            ? `${remaining.toLocaleString("en-GB")} characters left`
            : "A role, a project, a question: anything."
        }
        value={values.message}
        error={errorFor("message")}
        onChange={(value) => {
          update("message", value);
        }}
        onBlur={() => {
          setTouched((t) => ({ ...t, message: true }));
        }}
      />

      {/* For bots only: people never see it, so anything typed here marks the message as spam. */}
      <div className="contact-trap" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div ref={widget} className="contact-check" />

      {status.kind === "failed" && (
        <p id={`${id}-failed`} className="contact-failed" role="alert">
          <AlertCircle aria-hidden="true" size={20} />
          {status.message}
        </p>
      )}

      <button type="submit" className="button button-gold contact-send" aria-disabled={sending}>
        {sending ? (
          <>
            <LoaderCircle aria-hidden="true" size={20} className="contact-spinner" />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden="true" size={20} />
            Send message
          </>
        )}
      </button>
      <p className="sr-only" role="status">
        {sending ? "Sending your message" : ""}
      </p>
    </form>
  );
}

function TextField({
  id,
  label,
  name,
  value,
  error,
  hint,
  multiline = false,
  onChange,
  onBlur,
  ...input
}: {
  id: string;
  label: string;
  name: Field;
  value: string;
  error: string | undefined;
  hint?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "email";
  spellCheck?: boolean;
  maxLength: number;
}) {
  const showHint = hint !== undefined && error === undefined;
  const describedBy = [error ? `${id}-error` : null, showHint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  const shared = {
    id,
    name,
    value,
    required: true,
    "aria-invalid": error !== undefined,
    "aria-describedby": describedBy || undefined,
    onBlur,
    ...input,
  };
  return (
    <div className={`contact-field${error ? " has-error" : ""}`}>
      <label htmlFor={id} className="contact-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={6}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      ) : (
        <input
          {...shared}
          type={input.type ?? "text"}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
      {error !== undefined && (
        <p id={`${id}-error`} className="contact-error">
          <AlertCircle aria-hidden="true" size={16} />
          {error}
        </p>
      )}
      {showHint && (
        <p id={`${id}-hint`} className="contact-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

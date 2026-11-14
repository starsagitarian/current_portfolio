"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Share, X } from "lucide-react";
import "./install-hint.css";

/** Chromium's install prompt, which it hands over instead of showing its own bar. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-hint-dismissed";
const VIEWS_KEY = "install-hint-views";
const LAST_KEY = "install-hint-last-page";
const QUIET_FOR_MS = 60 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 1200;

/** Storage can be missing or refuse (private browsing): then the hint simply keeps quiet. */
function stored(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}
function store(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    // nothing to do: the hint may show again
  }
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isAppleTouch = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

const dismissedLately = () =>
  Date.now() - Number(stored(() => localStorage, DISMISSED_KEY) ?? 0) < QUIET_FOR_MS;

/**
 * A quiet card suggesting the site be kept on the Home Screen, where it opens full-screen like
 * an app. Safari has no install prompt, so on iPhone and iPad it says how (Share, then Add to
 * Home Screen); on Android it offers the browser's own install. It waits for the second page
 * of a visit, never shows once installed, and keeps away for 60 days once dismissed.
 */
export function InstallHint() {
  const pathname = usePathname();
  const [mode, setMode] = useState<"apple" | "install" | null>(null);
  const deferred = useRef<InstallPromptEvent | null>(null);

  // Chromium: keep its prompt for when the visitor chooses to install.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as InstallPromptEvent;
    };
    const onInstalled = () => {
      deferred.current = null;
      setMode(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Count the pages of this visit; from the second, offer the hint where it applies.
  useEffect(() => {
    // a page counts once, however often it renders (or is reloaded)
    let views = Number(stored(() => sessionStorage, VIEWS_KEY) ?? 0);
    if (stored(() => sessionStorage, LAST_KEY) !== pathname) {
      views += 1;
      store(() => sessionStorage, VIEWS_KEY, String(views));
      store(() => sessionStorage, LAST_KEY, pathname);
    }
    if (views < 2 || isStandalone() || dismissedLately()) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const timer = setTimeout(() => {
      if (isAppleTouch()) setMode("apple");
      else if (deferred.current !== null) setMode("install");
    }, SHOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  if (mode === null) return null;

  const dismiss = () => {
    store(() => localStorage, DISMISSED_KEY, String(Date.now()));
    setMode(null);
  };
  const install = async () => {
    const event = deferred.current;
    if (event === null) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred.current = null;
    if (outcome === "dismissed") dismiss();
    else setMode(null);
  };

  return (
    <aside className="install-hint veil" aria-label="Add to Home Screen">
      {/* eslint-disable-next-line @next/next/no-img-element -- a 44 px icon, already sized */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="install-icon" />
      <div className="install-words">
        <p className="install-title">Add to your Home Screen</p>
        {mode === "apple" ? (
          <p className="install-text">
            Tap <Share aria-label="Share" role="img" size={16} className="install-share" /> then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="install-text">It opens full-screen, like an app. No store needed.</p>
        )}
      </div>
      {mode === "install" && (
        <button
          type="button"
          className="button button-gold install-go"
          onClick={() => {
            void install();
          }}
        >
          Install
        </button>
      )}
      <button type="button" className="install-close" aria-label="Dismiss" onClick={dismiss}>
        <X aria-hidden="true" size={18} />
      </button>
    </aside>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Starts the service worker (public/sw.js) once the page has loaded, in production builds only:
 * in development it would serve stale pages over the live reloader.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      const version = process.env.NEXT_PUBLIC_SW_VERSION ?? "dev";
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(version)}`, { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => {
          console.warn("Offline support is unavailable:", error);
        });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

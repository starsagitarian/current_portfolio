"use client";

import { useEffect } from "react";
import { applySky, SKY_MANUAL_ATTRIBUTE, skyForWidth } from "./sky";

/**
 * Keeps --sky in step with the window width while it is resized. At most one update per
 * animation frame, and only the one CSS variable changes, so the browser restyles but never has
 * to lay the page out again. The inline script in <head> has already set the first value.
 */
export function SkyFollower() {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (document.documentElement.hasAttribute(SKY_MANUAL_ATTRIBUTE)) return;
      applySky(skyForWidth(window.innerWidth));
    };
    const onResize = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

/** On <html> while the tab is hidden: motion.css pauses every animation. */
export const TAB_HIDDEN_ATTRIBUTE = "data-tab-hidden";

/**
 * Pauses the scene's loops while the tab is in the background, so a page nobody is looking at
 * costs nothing, and resumes them where they were when it comes back.
 */
export function TabMotionPause() {
  useEffect(() => {
    const sync = () => {
      document.documentElement.toggleAttribute(TAB_HIDDEN_ATTRIBUTE, document.hidden);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return null;
}

"use client";

import { RotateCw } from "lucide-react";

/** Reloads the page the visitor was trying to open (the address is still theirs). */
export function TryAgain() {
  return (
    <button
      type="button"
      className="button button-gold"
      onClick={() => {
        window.location.reload();
      }}
    >
      <RotateCw aria-hidden="true" size={20} />
      Try again
    </button>
  );
}

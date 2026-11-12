"use client";

import { useEffect, useState } from "react";
import { skyForWidth, skyLabel } from "@/components/scene/sky";

/**
 * Follows the window width (one update per animation frame while resizing) and offers a slider
 * to preview any light on any device. Prototype-only controls; SP-10 keeps just the follower.
 */
export function SkyPanel() {
  const [width, setWidth] = useState(0);
  const [override, setOverride] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const sky = override ?? skyForWidth(width);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setWidth(window.innerWidth);
    };
    const onResize = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (width) document.documentElement.style.setProperty("--sky", sky.toFixed(3));
  }, [sky, width]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-motion-paused", paused);
  }, [paused]);

  return (
    <aside className="sky-panel" aria-label="Prototype controls">
      <p className="sky-panel-title">
        <span>Art prototype</span>
        <span className="sky-panel-phase">{skyLabel(sky)}</span>
      </p>
      <div className="sky-panel-row">
        <input
          aria-label="Light, from daylight to blue hour"
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={sky}
          onChange={(e) => {
            setOverride(Number(e.target.value));
          }}
          aria-valuetext={skyLabel(sky)}
        />
      </div>
      <p className="sky-panel-meta">
        {width} px · sky {sky.toFixed(2)}
        {override === null ? " · follows width" : " · manual"}
      </p>
      <div className="sky-panel-actions">
        <button
          type="button"
          onClick={() => {
            setOverride(null);
          }}
          disabled={override === null}
        >
          Follow width
        </button>
        <button
          type="button"
          onClick={() => {
            setPaused((p) => !p);
          }}
          aria-pressed={paused}
        >
          {paused ? "Play motion" : "Pause motion"}
        </button>
      </div>
    </aside>
  );
}

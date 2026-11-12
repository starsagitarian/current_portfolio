"use client";

import { useEffect, useState } from "react";
import { SKY_MANUAL_EVENT } from "@/components/scene/ScenePlates";
import { setManualSky, skyForWidth, skyLabel } from "@/sky/sky";

/**
 * A slider to preview any light on any device. The site-wide follower keeps the light in step
 * with the width; moving the slider fixes it by hand until "Follow width" hands it back.
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
    if (override !== null) setManualSky(override);
  }, [override]);

  // Leaving the page hands the light back to the width.
  useEffect(
    () => () => {
      setManualSky(null);
    },
    [],
  );

  useEffect(() => {
    document.documentElement.toggleAttribute("data-motion-paused", paused);
  }, [paused]);

  return (
    <aside className="sky-panel surface" aria-label="Prototype controls">
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
            // a hand-picked light can show any layer, so load them all
            window.dispatchEvent(new Event(SKY_MANUAL_EVENT));
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
            setManualSky(null);
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

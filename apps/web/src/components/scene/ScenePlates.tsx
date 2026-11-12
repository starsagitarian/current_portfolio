"use client";

import { useEffect, useState } from "react";
import {
  BLANK,
  LANDMARKS,
  LANDSCAPE,
  LANDSCAPE_SIZES,
  LAYER_MEDIA,
  PORTRAIT_MEDIA,
  PORTRAIT_SIZES,
  srcSet,
} from "./plates";
import "./plates.css";

/** Fired when the light is set by hand (the prototype slider): every layer must then be loaded. */
export const SKY_MANUAL_EVENT = "sky:manual";

/** Small deterministic PRNG, so the glints and stars sit in the same places on every render. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (n: number) => Math.round(n * 100) / 100;

function Layer({ name, all }: { name: "day" | "dusk" | "night"; all: boolean }) {
  const media = all ? undefined : LAYER_MEDIA[name];
  return (
    <picture className={`plate plate-${name}`}>
      {name === "day" && !all && (
        <>
          <source
            type="image/avif"
            media={PORTRAIT_MEDIA}
            srcSet={srcSet("day-portrait", "avif")}
            sizes={PORTRAIT_SIZES}
          />
          <source
            type="image/webp"
            media={PORTRAIT_MEDIA}
            srcSet={srcSet("day-portrait", "webp")}
            sizes={PORTRAIT_SIZES}
          />
        </>
      )}
      <source
        type="image/avif"
        media={media}
        srcSet={srcSet(name, "avif")}
        sizes={LANDSCAPE_SIZES}
      />
      <source
        type="image/webp"
        media={media}
        srcSet={srcSet(name, "webp")}
        sizes={LANDSCAPE_SIZES}
      />
      {/* Outside its widths a layer is fully covered, so it falls back to a blank pixel. */}
      <img
        src={all ? `/art/scene/${name}-1920.webp` : BLANK}
        width={LANDSCAPE.width}
        height={LANDSCAPE.height}
        alt=""
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}

interface Glint {
  x: number;
  y: number;
  w: number;
  d: number;
  delay: number;
}

function glints(variant: "landscape" | "portrait", seed: number): Glint[] {
  const { river, towers, lamps } = LANDMARKS[variant];
  const rand = random(seed);
  const span = river.bottom - river.top;
  const anchors = [...towers, ...lamps.map((l) => l.x)];
  return Array.from({ length: 30 }, (_, i) => {
    // two in three glints gather in the reflections under the towers and lamps
    const near = i % 3 !== 2 && anchors.length > 0;
    const anchor = anchors[i % anchors.length] ?? 50;
    const x = near ? anchor + (rand() - 0.5) * 7 : river.left + rand() * (river.right - river.left);
    const w = 1.2 + rand() * 3.4;
    return {
      // keep the whole streak on the water, clear of the lamp pedestals
      x: r2(Math.min(river.right - w, Math.max(river.left, x))),
      y: r2(river.top + 1 + rand() * (span - 2)),
      w: r2(w),
      d: r2(4 + rand() * 5),
      delay: r2(-rand() * 9),
    };
  });
}

function River({ variant }: { variant: "landscape" | "portrait" }) {
  return (
    <div className={`fx fx-river fx-${variant}`}>
      {glints(variant, variant === "landscape" ? 3 : 4).map((g, i) => (
        <span
          key={i}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${g.w}%`,
            animationDuration: `${g.d}s`,
            animationDelay: `${g.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Stars() {
  const rand = random(9);
  const stars = [];
  while (stars.length < 26) {
    const x = r2(2 + rand() * 96);
    const y = r2(1 + rand() * 25);
    if (x < 31 && y < 27) continue; // the tree in the top-left corner
    stars.push({ x, y, s: r2(1.4 + rand() * 1.8), delay: r2(-rand() * 5) });
  }
  return (
    <div className="fx fx-stars">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.s}px`,
            height: `${s.s}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

const WISPS = [
  { x: 4, y: 8, w: 15, h: 5 },
  { x: 22, y: 20, w: 11, h: 3.6 },
  { x: 33, y: 5, w: 9, h: 3 },
  { x: 41, y: 15, w: 13, h: 4.4 },
];

function Clouds() {
  // two copies of the same wisps side by side; sliding by one copy loops seamlessly
  return (
    <div className="fx fx-clouds">
      <div className="fx-clouds-strip">
        {[0, 50].map((offset) =>
          WISPS.map((w, i) => (
            <span
              key={`${offset}-${i}`}
              style={{
                left: `${offset + w.x}%`,
                top: `${w.y}%`,
                width: `${w.w}%`,
                height: `${w.h}%`,
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}

function Lamps() {
  return (
    <div className="fx fx-lamps fx-landscape">
      {LANDMARKS.landscape.lamps.map((l) => (
        <span key={l.x} style={{ left: `${l.x}%`, top: `${l.y}%` }}>
          <i />
        </span>
      ))}
    </div>
  );
}

/**
 * The painted backdrop with its ambient motion: drifting cloud wisps, glints on the river,
 * flickering lamp glow and stars after dark. Transforms and opacity only, so it stays smooth.
 */
export function ScenePlates({ className = "" }: { className?: string }) {
  const [all, setAll] = useState(false);

  useEffect(() => {
    const onManual = () => {
      setAll(true);
    };
    window.addEventListener(SKY_MANUAL_EVENT, onManual);
    return () => {
      window.removeEventListener(SKY_MANUAL_EVENT, onManual);
    };
  }, []);

  return (
    <div className={`plates ${className}`} data-all={all || undefined} aria-hidden="true">
      {(["day", "dusk", "night"] as const).map((name) => (
        <Layer key={`${name}-${String(all)}`} name={name} all={all} />
      ))}
      <Clouds />
      <Stars />
      <River variant="landscape" />
      <River variant="portrait" />
      <Lamps />
    </div>
  );
}

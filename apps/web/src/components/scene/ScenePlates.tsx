"use client";

import { useEffect, useRef, useState } from "react";
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

/** The image addresses a <picture>'s sources offer for the window as it is now. */
function offered(picture: HTMLPictureElement): string[] {
  return [...picture.querySelectorAll("source")]
    .filter((source) => source.media === "" || window.matchMedia(source.media).matches)
    .flatMap((source) =>
      source.srcset.split(",").map((entry) => entry.trim().split(/\s+/)[0] ?? ""),
    )
    .filter(Boolean);
}

/**
 * Safari (WebKit) picks a <picture>'s image once, on load, and keeps it when the window is
 * resized or a tablet is turned; a layer that was out of range at load stays blank. So on start
 * and after each resize (once a frame at most), any layer showing something other than what its
 * sources now offer gets a fresh copy of its image, which picks again. (Re-assigning the image's
 * address does not make WebKit pick again; a new element does.) An image still loading is left
 * alone. Chromium and Firefox already pick again by themselves, so for them this finds nothing.
 */
function useRepickOnResize(root: React.RefObject<HTMLDivElement | null>, layers: unknown) {
  useEffect(() => {
    const element = root.current;
    if (element === null) return;
    const repick = () => {
      for (const picture of element.querySelectorAll("picture")) {
        const img = picture.querySelector("img");
        if (img === null || !img.complete) continue;
        const wanted = offered(picture);
        if (wanted.length === 0 || wanted.some((url) => img.currentSrc.endsWith(url))) continue;
        img.replaceWith(img.cloneNode(true));
      }
    };
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(repick);
    };
    repick();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [root, layers]);
}

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

interface Wisp {
  x: number;
  y: number;
  w: number;
  h: number;
}

/*
 * Three layers of cloud wisps, each drifting at its own speed: far ones small, high and slow,
 * near ones larger, lower and quicker, for a gentle parallax. Positions are percentages of a
 * strip twice the painting's width, which slides by half its width and loops seamlessly.
 */
const CLOUD_LAYERS: { name: string; seconds: number; wisps: Wisp[] }[] = [
  {
    name: "far",
    seconds: 180,
    wisps: [
      { x: 6, y: 4, w: 9, h: 2.6 },
      { x: 25, y: 10, w: 7, h: 2 },
      { x: 40, y: 3, w: 8, h: 2.4 },
    ],
  },
  {
    name: "mid",
    seconds: 120,
    wisps: [
      { x: 4, y: 8, w: 15, h: 5 },
      { x: 22, y: 20, w: 11, h: 3.6 },
      { x: 33, y: 5, w: 9, h: 3 },
      { x: 41, y: 15, w: 13, h: 4.4 },
    ],
  },
  {
    name: "near",
    seconds: 70,
    wisps: [
      { x: 12, y: 15, w: 18, h: 5.5 },
      { x: 36, y: 22, w: 14, h: 4.4 },
    ],
  },
];

function Clouds() {
  return (
    <div className="fx fx-clouds">
      {CLOUD_LAYERS.map((layer) => (
        <div
          key={layer.name}
          className={`fx-clouds-strip fx-clouds-${layer.name}`}
          style={{ animationDuration: `${layer.seconds}s` }}
        >
          {/* two copies of the same wisps side by side; sliding by one copy loops seamlessly */}
          {[0, 50].map((offset) =>
            layer.wisps.map((w, i) => (
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
      ))}
    </div>
  );
}

/** A slow band of light sliding across the river's ripples. */
function Shimmer({ variant }: { variant: "landscape" | "portrait" }) {
  const { river } = LANDMARKS[variant];
  return (
    <div
      className={`fx fx-shimmer fx-${variant}`}
      style={{
        left: `${river.left}%`,
        top: `${river.top}%`,
        width: `${river.right - river.left}%`,
        height: `${river.bottom - river.top}%`,
      }}
    >
      <span />
    </div>
  );
}

/** Tower Bridge after dark: floodlit towers that breathe, and strings of lights that ripple. */
function Bridge() {
  const { towers, bridge } = LANDMARKS.landscape;
  const { walkway, deck, towerBody } = bridge;
  const lights: { x: number; y: number; delay: number }[] = [];
  const string = (y: number, from: number, to: number) => {
    const count = Math.round((to - from) / 1.3) + 1;
    for (let i = 0; i < count; i++) {
      lights.push({
        x: r2(from + ((to - from) * i) / (count - 1)),
        y,
        // each light a little behind the last, so a gentle wave runs along the string
        delay: r2(-i * 0.22),
      });
    }
  };
  string(walkway.y, walkway.from, walkway.to);
  for (const [from, to] of deck.spans) string(deck.y, from, to);

  return (
    <div className="fx fx-bridge fx-landscape">
      {towers.map((x) => (
        <span
          key={x}
          className="bridge-tower"
          style={{
            left: `${x}%`,
            top: `${towerBody.top}%`,
            width: `${towerBody.width}%`,
            height: `${towerBody.bottom - towerBody.top}%`,
          }}
        />
      ))}
      {lights.map((light, i) => (
        <span
          key={i}
          className="bridge-light"
          style={{ left: `${light.x}%`, top: `${light.y}%`, animationDelay: `${light.delay}s` }}
        />
      ))}
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
 * The painted backdrop with its ambient motion: three layers of drifting cloud, a band of light
 * and glints on the river, and after dark the bridge lights, lamp glow and stars. Every loop
 * animates transform or opacity only, so it runs on the compositor and stays smooth.
 */
export function ScenePlates({ className = "" }: { className?: string }) {
  const [all, setAll] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useRepickOnResize(root, all);

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
    <div
      ref={root}
      className={`plates ${className}`}
      data-all={all || undefined}
      aria-hidden="true"
    >
      {(["day", "dusk", "night"] as const).map((name) => (
        <Layer key={`${name}-${String(all)}`} name={name} all={all} />
      ))}
      <Clouds />
      <Stars />
      <Shimmer variant="landscape" />
      <Shimmer variant="portrait" />
      <River variant="landscape" />
      <River variant="portrait" />
      <Bridge />
      <Lamps />
    </div>
  );
}

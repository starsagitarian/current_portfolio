"use client";

import { useEffect, useState } from "react";
import "./character.css";

/*
 * The character cut-out with SVG eyes drawn over the artwork. The overlay shares the image's own
 * pixel coordinates (viewBox = image size), so the eyes stay aligned at every size. Each eye fully
 * covers the painted one, so the original pupils never show through a blink.
 */

const IMAGE = { width: 579, height: 1343 };
const EYES = [
  { id: "l", centre: [280.4, 161.2], pupil: [278.6, 159.2] },
  { id: "r", centre: [369.2, 162.8], pupil: [367.2, 159.8] },
] as const;
const RX = 17.5;
const RY = 12.2;

interface Gaze {
  dx: number;
  dy: number;
  lid: number;
}
const CENTRE: Gaze = { dx: 0, dy: 0, lid: 0 };

function almond(cx: number, cy: number) {
  const top = `M${cx - RX},${cy} C${cx - RX * 0.45},${cy - RY * 1.36} ${cx + RX * 0.45},${cy - RY * 1.36} ${cx + RX},${cy}`;
  const bottom = `C${cx + RX * 0.45},${cy + RY * 1.28} ${cx - RX * 0.45},${cy + RY * 1.28} ${cx - RX},${cy} Z`;
  return {
    shape: `${top} ${bottom}`,
    top,
    bottom: `M${cx + RX},${cy} ${bottom.replace(" Z", "")}`,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits, then keeps waiting while the tab is hidden, so the idle eyes pause with the page. */
async function idle(ms: number) {
  await wait(ms);
  while (document.hidden) {
    await new Promise((resolve) => {
      document.addEventListener("visibilitychange", resolve, { once: true });
    });
  }
}
const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Idle behaviour: blinks every 3-6 s, glances now and then, and the odd eye roll. */
function useIdleEyes(): Gaze {
  const [gaze, setGaze] = useState<Gaze>(CENTRE);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let current = CENTRE;
    const set = (g: Partial<Gaze>) => {
      current = { ...current, ...g };
      if (alive) setGaze(current);
    };

    async function blinking() {
      while (alive) {
        await idle(between(3000, 6000));
        set({ lid: 1 });
        await wait(110);
        set({ lid: 0 });
      }
    }
    async function looking() {
      let count = 0;
      while (alive) {
        await idle(between(3500, 7000));
        count++;
        if (count % 4 === 0) {
          // eye roll: up and round, with heavy lids
          for (const [dx, dy] of [
            [-5, -4],
            [0, -6],
            [5, -4],
            [6, 0],
          ] as const) {
            set({ dx, dy, lid: 0.18 });
            await wait(170);
          }
          await wait(250);
          set({ dx: 0, dy: 0, lid: 0 });
        } else {
          set({ dx: between(-6, 6), dy: between(-2.5, 2.5) });
          await wait(between(900, 1800));
          set({ dx: 0, dy: 0 });
        }
      }
    }
    void blinking();
    void looking();
    return () => {
      alive = false;
    };
  }, []);

  return gaze;
}

function Eye({ centre, pupil, id, gaze }: (typeof EYES)[number] & { gaze: Gaze }) {
  const [cx, cy] = centre;
  const [px, py] = pupil;
  const path = almond(cx, cy);
  const lidTop = cy - RY * 2.5;
  const lidOpen = cy - RY * 1.36 - 2;
  const travel = RY * 2.4 + 2;
  return (
    <g>
      <clipPath id={`eye-${id}`}>
        <path d={path.shape} />
      </clipPath>
      <path d={path.shape} fill="#f6f1e7" />
      <g clipPath={`url(#eye-${id})`}>
        <g
          className="character-pupil"
          style={{ transform: `translate(${gaze.dx}px, ${gaze.dy}px)` }}
        >
          <circle cx={px} cy={py} r={10.8} fill="#1a1411" />
          <circle cx={px - 3.2} cy={py - 3.4} r={3} fill="#fff" />
        </g>
        <rect
          className="character-lid"
          x={cx - RX - 2}
          y={lidTop}
          width={RX * 2 + 4}
          height={lidOpen - lidTop}
          fill="#ae5f32"
          style={{ transform: `translateY(${gaze.lid * travel}px)` }}
        />
      </g>
      <path d={path.bottom} fill="none" stroke="#2a1a12" strokeWidth={1.6} strokeLinecap="round" />
      <path d={path.top} fill="none" stroke="#1a1210" strokeWidth={3.4} strokeLinecap="round" />
    </g>
  );
}

export function Character({ className = "" }: { className?: string }) {
  const gaze = useIdleEyes();
  return (
    <div className={`character ${className}`} aria-hidden="true">
      <div className="character-body">
        <picture>
          <source
            type="image/avif"
            srcSet="/art/character-standing-290.avif 290w, /art/character-standing-579.avif 579w"
            sizes="30vh"
          />
          <img
            src="/art/character-standing-579.webp"
            srcSet="/art/character-standing-290.webp 290w, /art/character-standing-579.webp 579w"
            sizes="30vh"
            width={IMAGE.width}
            height={IMAGE.height}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <svg viewBox={`0 0 ${IMAGE.width} ${IMAGE.height}`} className="character-eyes">
          {EYES.map((eye) => (
            <Eye key={eye.id} {...eye} gaze={gaze} />
          ))}
        </svg>
      </div>
    </div>
  );
}

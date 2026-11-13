"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import "./character.css";

/*
 * The character cut-outs with SVG eyes drawn over the artwork. The overlay shares the image's own
 * pixel coordinates (viewBox = image size), so the eyes stay aligned at every size. Each eye fully
 * covers the painted one, so the original pupils never show through a blink.
 *
 * Idle, he breathes, blinks every 3-6 s, glances now and then and rolls his eyes once in a while.
 * On a desktop his eyes follow the mouse pointer. Waving, he rocks gently from the shoulders.
 */

export type Pose = "standing" | "waving";

interface EyeGeometry {
  id: string;
  centre: readonly [number, number];
  pupil: readonly [number, number];
}

interface PoseArt {
  /** File name stem under /art, with a 1x and a 2x width. */
  name: string;
  widths: readonly [number, number];
  width: number;
  height: number;
  eyes: readonly [EyeGeometry, EyeGeometry];
  /** Half-width and half-height of the eye shape, in image pixels. */
  rx: number;
  ry: number;
  /** How far the head is tilted, so the eyes are drawn along the same line. */
  tilt: number;
}

/** Eye positions were measured on each cut-out (see the art notes in the pull requests). */
export const POSES: Record<Pose, PoseArt> = {
  standing: {
    name: "character-standing",
    widths: [290, 579],
    width: 579,
    height: 1343,
    eyes: [
      { id: "l", centre: [280.4, 161.2], pupil: [278.6, 159.2] },
      { id: "r", centre: [369.2, 162.8], pupil: [367.2, 159.8] },
    ],
    rx: 17.5,
    ry: 12.2,
    tilt: 0,
  },
  waving: {
    name: "character-waving",
    widths: [291, 581],
    width: 581,
    height: 556,
    eyes: [
      { id: "l", centre: [351, 153], pupil: [349.2, 152.2] },
      { id: "r", centre: [435, 170], pupil: [433.4, 169.2] },
    ],
    rx: 18,
    ry: 12.6,
    tilt: 11.4,
  },
};

interface Gaze {
  dx: number;
  dy: number;
  lid: number;
}
const CENTRE: Gaze = { dx: 0, dy: 0, lid: 0 };
/** How far the pupils may travel inside the eye, in image pixels. */
const REACH = { x: 6, y: 3 };

function almond(cx: number, cy: number, rx: number, ry: number) {
  const top = `M${cx - rx},${cy} C${cx - rx * 0.45},${cy - ry * 1.36} ${cx + rx * 0.45},${cy - ry * 1.36} ${cx + rx},${cy}`;
  const bottom = `C${cx + rx * 0.45},${cy + ry * 1.28} ${cx - rx * 0.45},${cy + ry * 1.28} ${cx - rx},${cy} Z`;
  return {
    shape: `${top} ${bottom}`,
    top,
    bottom: `M${cx + rx},${cy} ${bottom.replace(" Z", "")}`,
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
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The pointer is followed for this long after it last moved, then the idle glances resume. */
const FOLLOW_MS = 2500;

/**
 * Where the eyes look. Idle: blinks, glances and the odd eye roll. On a device with a fine
 * pointer that can hover (a desktop), the pupils follow the pointer while it moves. Nothing moves
 * for visitors who prefer reduced motion.
 */
function useGaze(svg: RefObject<SVGSVGElement | null>, art: PoseArt): Gaze {
  const [gaze, setGaze] = useState<Gaze>(CENTRE);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let current = CENTRE;
    let followingUntil = 0;
    const set = (g: Partial<Gaze>) => {
      current = { ...current, ...g };
      if (alive) setGaze(current);
    };
    const following = () => performance.now() < followingUntil;

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
        if (following()) continue;
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
          set({ dx: between(-REACH.x, REACH.x), dy: between(-2.5, 2.5) });
          await wait(between(900, 1800));
          if (!following()) set({ dx: 0, dy: 0 });
        }
      }
    }

    // Pointer following, at most once per animation frame.
    const desktop = window.matchMedia("(pointer: fine) and (hover: hover)");
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const follow = () => {
      frame = 0;
      const el = svg.current;
      if (pointer === null || el === null) return;
      const box = el.getBoundingClientRect();
      const [left, right] = art.eyes;
      // midway between the eyes, in screen pixels
      const ex = box.left + (((left.centre[0] + right.centre[0]) / 2) * box.width) / art.width;
      const ey = box.top + (((left.centre[1] + right.centre[1]) / 2) * box.height) / art.height;
      const vx = pointer.x - ex;
      const vy = pointer.y - ey;
      const distance = Math.hypot(vx, vy) || 1;
      // full reach once the pointer is a little way off; a gentle look when it is close
      const strength = clamp(distance / 220, 0, 1);
      set({
        dx: (vx / distance) * REACH.x * strength,
        dy: (vy / distance) * REACH.y * strength,
      });
    };
    const onMove = (event: PointerEvent) => {
      if (!desktop.matches || event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      followingUntil = performance.now() + FOLLOW_MS;
      if (frame === 0) frame = requestAnimationFrame(follow);
    };
    const onLeave = () => {
      pointer = null;
      followingUntil = 0;
      set({ dx: 0, dy: 0 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    void blinking();
    void looking();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [svg, art]);

  return gaze;
}

function Eye({ eye, art, gaze }: { eye: EyeGeometry; art: PoseArt; gaze: Gaze }) {
  const [cx, cy] = eye.centre;
  const [px, py] = eye.pupil;
  const { rx, ry } = art;
  const path = almond(cx, cy, rx, ry);
  const lidTop = cy - ry * 2.5;
  const lidOpen = cy - ry * 1.36 - 2;
  const travel = ry * 2.4 + 2;
  const clip = `eye-${art.name}-${eye.id}`;
  return (
    <g
      className="character-eye"
      transform={art.tilt ? `rotate(${art.tilt} ${cx} ${cy})` : undefined}
    >
      <clipPath id={clip}>
        <path d={path.shape} />
      </clipPath>
      <path d={path.shape} fill="#f6f1e7" />
      <g clipPath={`url(#${clip})`}>
        <g
          className="character-pupil"
          style={{ transform: `translate(${gaze.dx}px, ${gaze.dy}px)` }}
        >
          <circle cx={px} cy={py} r={ry * 0.885} fill="#1a1411" />
          <circle cx={px - ry * 0.26} cy={py - ry * 0.28} r={ry * 0.25} fill="#fff" />
        </g>
        <rect
          className="character-lid"
          x={cx - rx - 2}
          y={lidTop}
          width={rx * 2 + 4}
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

/** The character, standing (Home) or waving (Menu and Contact). Decorative, so hidden from screen readers. */
export function Character({
  pose = "standing",
  className = "",
}: {
  pose?: Pose;
  className?: string;
}) {
  const art = POSES[pose];
  const svg = useRef<SVGSVGElement>(null);
  const gaze = useGaze(svg, art);
  const [small, large] = art.widths;
  const set = (format: string) =>
    `/art/${art.name}-${small}.${format} ${small}w, /art/${art.name}-${large}.${format} ${large}w`;
  // standing he is about 64vh tall, so 30vh wide; waving he is about 42vh tall and as wide
  const sizes = pose === "standing" ? "30vh" : "44vh";

  return (
    <div className={`character ${className}`} data-pose={pose} aria-hidden="true">
      <div className="character-body">
        <picture>
          <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
          <img
            src={`/art/${art.name}-${large}.webp`}
            srcSet={set("webp")}
            sizes={sizes}
            width={art.width}
            height={art.height}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <svg ref={svg} viewBox={`0 0 ${art.width} ${art.height}`} className="character-eyes">
          {art.eyes.map((eye) => (
            <Eye key={eye.id} eye={eye} art={art} gaze={gaze} />
          ))}
        </svg>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import type { Tag } from "@starsagitarian/shared";
import "./project-art.css";

/*
 * A small drawing for each project, in place of screenshots (client work cannot be shown). Drawn
 * in the scene's own colours: ink lines, paper that turns to navy glass at night, the gold of
 * the star and the sky at the top of the painting, so each one follows the light with the page.
 * Purely decorative: the title beside it says what it is.
 *
 * Classes: a-line (ink outline), a-fine (a thinner, fainter line), a-paper (filled like a page),
 * a-soft (a faint ink wash), a-gold / a-gold-soft / a-gold-line, a-on-gold (ink on gold), and
 * a-paper-edge (paper-coloured, to hide the seam where a speech bubble meets its tail).
 * Motion classes (a-float, a-flow, a-flash, a-spin, a-ping) only move when the tile is hovered
 * or the drawing is the hero of a project page; see project-art.css.
 */

interface ArtProps {
  /** Unique on the page: gradient and clip ids are built from it. */
  id: string;
}

/** A four-pointed sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

/** A browser window: frame, title bar, three dots and an address bar. */
function Window({ address = true }: { address?: boolean }) {
  return (
    <>
      <rect x="44" y="30" width="232" height="144" rx="14" className="a-line a-paper" />
      <path d="M44 56H276" className="a-line" />
      <circle cx="62" cy="43" r="4.5" className="a-gold" />
      <circle cx="76" cy="43" r="4.5" className="a-soft" />
      <circle cx="90" cy="43" r="4.5" className="a-soft" />
      {address && <rect x="108" y="37" width="128" height="12" rx="6" className="a-soft" />}
    </>
  );
}

/** This site: a window onto a riverside at sunset, and a code badge. */
function PortfolioArt({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="a-stop-sky" />
          <stop offset="1" className="a-stop-cloud" />
        </linearGradient>
        <clipPath id={`${id}-view`}>
          <rect x="52" y="64" width="216" height="102" rx="8" />
        </clipPath>
      </defs>
      <g className="a-float">
        <Window />
        <g clipPath={`url(#${id}-view)`}>
          <rect x="52" y="64" width="216" height="102" fill={`url(#${id}-sky)`} />
          <circle cx="230" cy="96" r="13" className="a-gold a-flash" />
          <rect x="52" y="138" width="216" height="28" className="a-water" />
          <path d="M70 150h22M136 156h30M206 149h24" className="a-shimmer" />
          <path
            d="M52 112Q86 130 112 100M124 100Q156 126 188 100M200 100Q232 130 268 112"
            className="a-fine"
          />
          <path d="M112 138V96l6-12 6 12v42ZM188 138V96l6-12 6 12v42Z" className="a-line a-paper" />
          <path d="M52 128H268" className="a-line" />
        </g>
      </g>
      <g className="a-pop">
        <circle cx="266" cy="166" r="22" className="a-gold" />
        <path d="M257 158l-8 8 8 8M275 158l8 8-8 8M269 154l-6 24" className="a-on-gold" />
      </g>
    </>
  );
}

/** XML and ONIX out of a book, along a pipeline, into JSON. */
function PipelineArt() {
  return (
    <>
      <g className="a-float">
        <path d="M98 70Q72 60 38 66v82q34-6 60 4Z" className="a-line a-paper" />
        <path d="M98 70q26-10 60-4v82q-34-6-60 4Z" className="a-line a-paper" />
        <path
          d="M50 86q20-4 36 2M50 100q20-4 36 2M50 114q20-4 36 2M50 128q14-3 26 1M110 88q18-6 36-2M110 102q18-6 36-2M110 116q18-6 36-2"
          className="a-fine"
        />
        <rect x="70" y="36" width="56" height="22" rx="11" className="a-gold" />
        <path d="M90 42l-6 5 6 5M106 42l6 5-6 5M100 40l-4 14" className="a-on-gold a-thin" />
      </g>
      <path
        d="M158 96c34 0 36 12 72 12M158 108h72M158 120c34 0 36-12 72-12"
        className="a-fine a-dashed"
      />
      <g className="a-flow">
        <circle cx="176" cy="99" r="4" className="a-gold" />
        <circle cx="196" cy="108" r="4" className="a-gold" />
        <circle cx="178" cy="118" r="4" className="a-gold" />
      </g>
      <path
        d="M252 64q-12 0-12 14v20q0 10-8 10 8 0 8 10v20q0 14 12 14M280 64q12 0 12 14v20q0 10 8 10-8 0-8 10v20q0 14-12 14"
        className="a-line"
      />
      <rect x="250" y="80" width="12" height="7" rx="3.5" className="a-gold" />
      <rect x="266" y="80" width="18" height="7" rx="3.5" className="a-soft" />
      <rect x="250" y="104" width="12" height="7" rx="3.5" className="a-gold" />
      <rect x="266" y="104" width="12" height="7" rx="3.5" className="a-soft" />
      <rect x="250" y="128" width="12" height="7" rx="3.5" className="a-gold" />
      <rect x="266" y="128" width="20" height="7" rx="3.5" className="a-soft" />
    </>
  );
}

/** A learning site: search, a starred reading banner, cards and a basket. */
function MicrositeArt() {
  return (
    <>
      <g className="a-float">
        <Window address={false} />
        <rect x="64" y="68" width="156" height="18" rx="9" className="a-soft" />
        <circle cx="206" cy="76" r="4.5" className="a-line a-thin" />
        <path d="M209.5 79.5l4 4" className="a-line a-thin" />
        <rect x="64" y="96" width="108" height="62" rx="9" className="a-gold-soft" />
        <polygon
          points="118,112 121.5,121.1 131.3,121.7 123.7,127.9 126.2,137.3 118,132 109.8,137.3 112.3,127.9 104.7,121.7 114.5,121.1"
          className="a-gold a-flash"
        />
        <path d="M100 147h36" className="a-fine" />
        <rect x="184" y="96" width="76" height="28" rx="7" className="a-soft" />
        <rect x="184" y="130" width="76" height="28" rx="7" className="a-soft" />
        <path d="M194 106h40M194 114h24M194 140h44M194 148h20" className="a-fine" />
      </g>
      <path d={sparkle(296, 50, 9)} className="a-gold a-ping" />
      <path d={sparkle(26, 150, 7)} className="a-gold a-ping a-later" />
      <g className="a-pop">
        <circle cx="266" cy="166" r="22" className="a-gold" />
        <path d="M252 157h4l4 13h12l3-9h-17" className="a-on-gold" />
        <circle cx="261" cy="175" r="2" className="a-on-gold-fill" />
        <circle cx="271" cy="175" r="2" className="a-on-gold-fill" />
      </g>
    </>
  );
}

/** Sales and stock kept in step: a shop bag of phonics books, a parcel, sync arrows between. */
function SalesArt() {
  return (
    <>
      <g className="a-float">
        <path d="M70 92V82q14-20 28 0v10" className="a-line" />
        <path d="M50 92h68l-6 64H56Z" className="a-line a-paper" />
        <rect x="66" y="110" width="36" height="24" rx="7" className="a-gold" />
        <path d="M72 122q4-8 8 0t8 0t8 0" className="a-on-gold a-thin" />
      </g>
      <g className="a-spin">
        <path d="M131 100a22 22 0 0 1 38 0" className="a-line" />
        <path d="M162 99l7 2 2-7" className="a-line" />
        <path d="M169 120a22 22 0 0 1-38 0" className="a-line" />
        <path d="M138 121l-7-2-2 7" className="a-line" />
      </g>
      <circle cx="150" cy="110" r="5" className="a-gold a-flash" />
      <g className="a-float a-later">
        <path d="M222 78l32 16-32 16-32-16Z" className="a-line a-paper" />
        <path d="M190 94v40l32 16v-40Z" className="a-line a-soft" />
        <path d="M254 94v40l-32 16v-40Z" className="a-line a-paper" />
        <path d="M206 86l32 16" className="a-gold-line" />
        <path d="M232 128l12-6" className="a-fine" />
      </g>
      <path d="M40 176h240" className="a-fine" />
      <path d="M188 168l18-8 16 4 22-14" className="a-gold-line a-thin" />
    </>
  );
}

/** A storm cloud, a strike, and the sensors across Europe that catch it. */
const SENSORS: [number, number][] = [
  [24, 184],
  [51, 174],
  [78, 188],
  [106, 178],
  [133, 190],
  [160, 180],
  [187, 190],
  [214, 176],
  [242, 188],
  [269, 174],
  [296, 184],
];

function LightningArt() {
  const route = SENSORS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("");
  return (
    <>
      <path d={route} className="a-fine a-dashed" />
      <polygon
        points="152,104 130,144 148,144 136,178 174,130 155,130 168,104"
        className="a-gold a-flash"
      />
      <g className="a-float">
        <path
          d="M96 118a20 20 0 0 1 4-39.6a30 30 0 0 1 56-12a24 24 0 0 1 42 14a18 18 0 0 1 2 37.6Z"
          className="a-line a-paper"
        />
        <path d="M112 102q10-8 22-4M172 92q10-4 18 4" className="a-fine" />
      </g>
      <path d={sparkle(232, 48, 8)} className="a-gold a-ping" />
      <path d={sparkle(70, 56, 6)} className="a-gold a-ping a-later" />
      {SENSORS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="4" className="a-dot" />
      ))}
      <circle cx="133" cy="190" r="9" className="a-gold-line a-thin a-ping" />
      <circle cx="160" cy="180" r="9" className="a-gold-line a-thin a-ping a-later" />
    </>
  );
}

/** Data services: a database, a chart and an assistant's speech bubble, linked up. */
function DataServicesArt() {
  return (
    <>
      <path d="M108 104h26M216 104c6 0 6-8 12-8" className="a-fine a-dashed" />
      <g className="a-float">
        <path d="M46 70v70a30 10 0 0 0 60 0V70" className="a-line a-paper" />
        <ellipse cx="76" cy="70" rx="30" ry="10" className="a-line a-paper" />
        <path d="M46 94a30 10 0 0 0 60 0M46 118a30 10 0 0 0 60 0" className="a-line" />
        <circle cx="92" cy="84" r="3" className="a-gold" />
        <circle cx="92" cy="108" r="3" className="a-gold" />
      </g>
      <path d="M136 156h80" className="a-line" />
      <rect x="144" y="112" width="16" height="44" rx="4" className="a-soft" />
      <rect x="168" y="90" width="16" height="66" rx="4" className="a-gold" />
      <rect x="192" y="70" width="16" height="86" rx="4" className="a-line a-paper" />
      <g className="a-float a-later">
        <rect x="226" y="62" width="74" height="50" rx="16" className="a-line a-paper" />
        <path d="M246 112l-6 16 18-16" className="a-line a-paper" />
        <path d="M247 111.5h10" className="a-paper-edge" />
        <circle cx="249" cy="87" r="4" className="a-gold a-flash" />
        <circle cx="263" cy="87" r="4" className="a-gold a-flash a-later" />
        <circle cx="277" cy="87" r="4" className="a-gold a-flash" />
      </g>
      <path d={sparkle(300, 46, 9)} className="a-gold a-ping" />
    </>
  );
}

/** A consultation in any language: doctor and patient talking, a globe, a heartbeat. */
function ConsultationArt() {
  return (
    <>
      <g className="a-float">
        <rect x="40" y="48" width="128" height="72" rx="18" className="a-line a-paper" />
        <path d="M66 120l-6 18 24-18" className="a-line a-paper" />
        <path d="M66 119.5h20" className="a-paper-edge" />
        <rect x="96" y="70" width="16" height="30" rx="3" className="a-gold" />
        <rect x="89" y="77" width="30" height="16" rx="3" className="a-gold" />
      </g>
      <g className="a-float a-later">
        <rect x="150" y="104" width="130" height="62" rx="18" className="a-line a-gold-soft" />
        <path d="M170 124h68M170 136h88M170 148h52" className="a-fine" />
      </g>
      <g className="a-float">
        <circle cx="258" cy="56" r="22" className="a-line a-paper" />
        <ellipse cx="258" cy="56" rx="9" ry="22" className="a-fine" />
        <path d="M236 56h44M240 45q18 6 36 0M240 67q18-6 36 0" className="a-fine" />
      </g>
      <path d="M40 178h44l7-14 9 26 8-20h34" className="a-gold-line a-flash" />
    </>
  );
}

/* For projects added later without a drawing of their own: one per kind of work. */

function WebArt() {
  return (
    <g className="a-float">
      <Window />
      <rect x="64" y="70" width="100" height="84" rx="9" className="a-gold-soft" />
      <rect x="176" y="70" width="80" height="38" rx="8" className="a-soft" />
      <rect x="176" y="116" width="80" height="38" rx="8" className="a-soft" />
      <path d="M80 94h60M80 108h44" className="a-fine" />
    </g>
  );
}

function CloudArt() {
  return (
    <>
      <g className="a-float">
        <path
          d="M96 128a20 20 0 0 1 4-39.6a30 30 0 0 1 56-12a24 24 0 0 1 42 14a18 18 0 0 1 2 37.6Z"
          className="a-line a-paper"
        />
      </g>
      <path d="M126 176v-30M118 154l8-8 8 8M174 146v30M166 168l8 8 8-8" className="a-gold-line" />
      <path d={sparkle(240, 52, 8)} className="a-gold a-ping" />
    </>
  );
}

function DataArt() {
  return (
    <>
      <path d="M70 160h180" className="a-line" />
      <rect x="86" y="112" width="24" height="48" rx="5" className="a-soft" />
      <rect x="124" y="84" width="24" height="76" rx="5" className="a-gold" />
      <rect x="162" y="100" width="24" height="60" rx="5" className="a-line a-paper" />
      <rect x="200" y="64" width="24" height="96" rx="5" className="a-gold-soft" />
      <path d="M92 96l42-26 40 16 38-36" className="a-gold-line a-flash" />
    </>
  );
}

/** Each drawing, given the id its gradients and clip paths are named after. */
const BY_PROJECT: Record<string, (id: string) => ReactNode> = {
  "portfolio-platform": (id) => <PortfolioArt id={id} />,
  "book-content-pipelines": () => <PipelineArt />,
  "dk-learning-microsite": () => <MicrositeArt />,
  "phonic-books-automation": () => <SalesArt />,
  "lightning-observation": () => <LightningArt />,
  "saas-data-services": () => <DataServicesArt />,
  remedic: () => <ConsultationArt />,
};

const BY_TAG: Record<string, () => ReactNode> = {
  web: () => <WebArt />,
  cloud: () => <CloudArt />,
  data: () => <DataArt />,
};

export function ProjectArt({
  slug,
  tags,
  variant,
}: {
  slug: string;
  tags: Tag[];
  /** Where it is drawn: a tile in the list, or the hero of the project's own page. */
  variant: "tile" | "hero";
}) {
  const draw = BY_PROJECT[slug] ?? tags.map((tag) => BY_TAG[tag.slug]).find(Boolean) ?? BY_TAG.web;
  return (
    <div className={`project-art project-art-${variant}`}>
      <svg viewBox="0 0 320 200" aria-hidden="true" focusable="false">
        {draw?.(`art-${slug}-${variant}`)}
      </svg>
    </div>
  );
}

import "./scene.css";

/*
 * Tower Bridge at the river's edge, drawn as layered SVG. Every fill reads a CSS variable from
 * scene.css, so one number (--sky) recolours the whole scene from daylight to blue hour.
 * Coordinates: a 1600 x 900 canvas, waterline at y = 600, scaled to cover the viewport and
 * anchored to the bottom so the bridge and embankment always stay in view.
 */

const W = 1600;
const WATER = 600;

/** Small deterministic PRNG so the stars and lit windows are identical on every render. */
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

const r1 = (n: number) => Math.round(n * 10) / 10;

// ------------------------------------------------------------------ sky

function Stars() {
  const rand = random(7);
  const stars = Array.from({ length: 70 }, () => ({
    x: r1(rand() * W),
    y: r1(rand() * 380),
    r: r1(0.8 + rand() * 1.6),
  }));
  return (
    <g className="stars">
      {stars.map((s, i) => (
        <circle key={i} className="f-light twinkle" cx={s.x} cy={s.y} r={s.r} />
      ))}
    </g>
  );
}

function Moon() {
  return (
    <g className="moon">
      <circle cx={1225} cy={150} r={70} fill="url(#moon-glow)" />
      <circle cx={1225} cy={150} r={30} fill="#f3ecd2" mask="url(#crescent)" />
    </g>
  );
}

function Sun() {
  return (
    <g className="sun">
      <circle cx={1210} cy={175} r={120} fill="url(#sun-glow)" />
      <circle className="f-sun" cx={1210} cy={175} r={40} />
    </g>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse className="f-cloud-shade" cx={0} cy={14} rx={92} ry={20} />
      <circle className="f-cloud" cx={-46} cy={0} r={28} />
      <circle className="f-cloud" cx={-8} cy={-18} r={38} />
      <circle className="f-cloud" cx={34} cy={-6} r={30} />
      <circle className="f-cloud" cx={66} cy={6} r={20} />
      <ellipse className="f-cloud" cx={8} cy={8} rx={86} ry={16} />
    </g>
  );
}

function CloudLayer({
  className,
  clouds,
}: {
  className: string;
  clouds: { x: number; y: number; s: number }[];
}) {
  // Two copies side by side, so a drift of one canvas width loops seamlessly.
  return (
    <g className={className}>
      {[0, W].map((offset) => (
        <g key={offset} transform={`translate(${offset} 0)`}>
          {clouds.map((c, i) => (
            <Cloud key={i} {...c} />
          ))}
        </g>
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ the City

interface Building {
  x: number;
  w: number;
  top: number;
}

function Windows({ buildings, seed }: { buildings: Building[]; seed: number }) {
  const rand = random(seed);
  const lights: { x: number; y: number }[] = [];
  for (const b of buildings) {
    for (let y = b.top + 10; y < WATER - 14; y += 11) {
      for (let x = b.x + 4; x < b.x + b.w - 5; x += 8) {
        if (rand() < 0.32) lights.push({ x: r1(x), y: r1(y) });
      }
    }
  }
  return (
    <g className="lit">
      {lights.map((l, i) => (
        <rect key={i} className="f-light" x={l.x} y={l.y} width={3.2} height={4.6} />
      ))}
    </g>
  );
}

const FAR_CITY: Building[] = [
  { x: 0, w: 70, top: 470 },
  { x: 64, w: 48, top: 430 },
  { x: 120, w: 60, top: 495 },
  { x: 176, w: 42, top: 450 },
  { x: 520, w: 56, top: 470 },
  { x: 1030, w: 46, top: 455 },
  { x: 1080, w: 40, top: 480 },
  { x: 1380, w: 54, top: 440 },
  { x: 1440, w: 70, top: 470 },
  { x: 1515, w: 85, top: 430 },
];

const CITY: Building[] = [
  { x: 20, w: 52, top: 505 },
  { x: 228, w: 44, top: 480 },
  { x: 270, w: 36, top: 515 },
  { x: 560, w: 40, top: 500 },
  { x: 1010, w: 36, top: 505 },
  { x: 1180, w: 34, top: 470 },
  { x: 1415, w: 40, top: 500 },
  { x: 1468, w: 46, top: 455 },
  { x: 1545, w: 55, top: 495 },
];

function City() {
  return (
    <g>
      <g className="f-city-far">
        {FAR_CITY.map((b, i) => (
          <rect key={i} x={b.x} y={b.top} width={b.w} height={WATER - b.top} />
        ))}
        {/* The Shard */}
        <path d="M402 600 L452 238 L458 238 L506 600 Z" />
        {/* The Cheesegrater */}
        <path d="M1318 600 L1318 372 L1372 412 L1372 600 Z" />
      </g>
      <Windows buildings={FAR_CITY} seed={11} />
      <g className="f-city">
        {CITY.map((b, i) => (
          <rect key={i} x={b.x} y={b.top} width={b.w} height={WATER - b.top} />
        ))}
        {/* The Walkie-Talkie */}
        <path d="M1104 600 L1100 440 Q1128 420 1160 414 L1156 600 Z" />
        {/* The Gherkin */}
        <path d="M1226 600 C1220 520 1222 448 1246 406 C1270 448 1272 520 1266 600 Z" />
      </g>
      <Windows buildings={CITY} seed={23} />
      {/* The Shard's tip catches the last light; a beacon at night */}
      <circle className="f-light night-only flicker" cx={455} cy={244} r={2.6} />
    </g>
  );
}

// ------------------------------------------------------------------ Tower Bridge

const LEFT = 640;
const RIGHT = 960;
const DECK = 545;

function Turret({ x, top }: { x: number; top: number }) {
  return (
    <g>
      <rect className="f-stone" x={x - 11} y={top} width={22} height={300 - top} />
      <rect className="f-stone-shade" x={x + 4} y={top} width={7} height={300 - top} />
      <path className="f-roof" d={`M${x - 13} ${top} L${x} ${top - 46} L${x + 13} ${top} Z`} />
      <rect className="f-roof" x={x - 3} y={top + 14} width={6} height={14} rx={3} />
      <rect className="f-light lit" x={x - 3} y={top + 14} width={6} height={14} rx={3} />
      <line className="s-iron" x1={x} y1={top - 46} x2={x} y2={top - 58} strokeWidth={2} />
    </g>
  );
}

function MainTower({ cx }: { cx: number }) {
  const windows: { x: number; y: number }[] = [];
  for (const y of [318, 372, 426]) for (const dx of [-30, 0, 30]) windows.push({ x: cx + dx, y });
  return (
    <g>
      {/* pier */}
      <path
        className="f-stone-shade"
        d={`M${cx - 86} ${WATER + 14} L${cx - 72} ${DECK + 22} L${cx + 72} ${DECK + 22} L${cx + 86} ${WATER + 14} Z`}
      />
      {/* body */}
      <rect className="f-stone" x={cx - 56} y={290} width={112} height={DECK + 24 - 290} />
      <rect className="f-stone-shade" x={cx + 30} y={290} width={26} height={DECK + 24 - 290} />
      {[300, 360, 414, 470].map((y) => (
        <rect key={y} className="f-stone-shade" x={cx - 58} y={y} width={116} height={5} />
      ))}
      {/* arched windows, lit after dark */}
      {windows.map((w, i) => (
        <g key={i}>
          <rect className="f-roof" x={w.x - 6} y={w.y} width={12} height={30} rx={6} />
          <rect className="f-light lit" x={w.x - 6} y={w.y} width={12} height={30} rx={6} />
        </g>
      ))}
      {/* the road arch through the tower */}
      <path
        className="f-roof"
        d={`M${cx - 30} ${DECK + 24} L${cx - 30} ${DECK - 20} Q${cx} ${DECK - 66} ${cx + 30} ${DECK - 20} L${cx + 30} ${DECK + 24} Z`}
      />
      {/* roof and lantern */}
      <path className="f-roof" d={`M${cx - 44} 292 L${cx} 196 L${cx + 44} 292 Z`} />
      <path
        className="f-stone-shade"
        d={`M${cx} 196 L${cx + 44} 292 L${cx + 22} 292 Z`}
        opacity={0.35}
      />
      <rect className="f-stone" x={cx - 9} y={176} width={18} height={30} />
      <path className="f-roof" d={`M${cx - 11} 178 L${cx} 142 L${cx + 11} 178 Z`} />
      <line className="s-iron" x1={cx} y1={142} x2={cx} y2={124} strokeWidth={2.2} />
      {/* small dormers */}
      {[-22, 22].map((dx) => (
        <path
          key={dx}
          className="f-stone"
          d={`M${cx + dx - 7} 268 L${cx + dx} 252 L${cx + dx + 7} 268 L${cx + dx + 7} 282 L${cx + dx - 7} 282 Z`}
        />
      ))}
      <Turret x={cx - 56} top={232} />
      <Turret x={cx + 56} top={232} />
    </g>
  );
}

function SideTower({ cx }: { cx: number }) {
  return (
    <g>
      <rect className="f-stone" x={cx - 26} y={470} width={52} height={WATER - 470} />
      <rect className="f-stone-shade" x={cx + 12} y={470} width={14} height={WATER - 470} />
      <path className="f-roof" d={`M${cx - 30} 472 L${cx} 428 L${cx + 30} 472 Z`} />
      <rect className="f-roof" x={cx - 6} y={490} width={12} height={22} rx={6} />
      <rect className="f-light lit" x={cx - 6} y={490} width={12} height={22} rx={6} />
    </g>
  );
}

/** Point on a cubic Bézier, for hanging the hangers off the chains. */
function cubic(p: number[][], t: number) {
  const u = 1 - t;
  const [a, b, c, d] = p as [number[], number[], number[], number[]];
  return [0, 1].map(
    (k) =>
      u * u * u * (a[k] ?? 0) +
      3 * u * u * t * (b[k] ?? 0) +
      3 * u * t * t * (c[k] ?? 0) +
      t * t * t * (d[k] ?? 0),
  ) as [number, number];
}

function Chain({ from, to }: { from: number; to: number }) {
  const dir = Math.sign(to - from);
  const p = [
    [from, 306],
    [from + dir * 120, DECK + 6],
    [to - dir * 70, DECK - 6],
    [to, 474],
  ];
  const d = `M${p[0]?.join(" ")} C${p[1]?.join(" ")} ${p[2]?.join(" ")} ${p[3]?.join(" ")}`;
  const hangers = Array.from({ length: 9 }, (_, i) => cubic(p, (i + 1) / 10));
  const bulbs = Array.from({ length: 16 }, (_, i) => cubic(p, i / 15));
  return (
    <g>
      {hangers.map(([x, y], i) => (
        <line
          key={i}
          className="s-steel-dark"
          x1={r1(x)}
          y1={r1(y)}
          x2={r1(x)}
          y2={DECK}
          strokeWidth={2}
        />
      ))}
      <path className="s-steel" d={d} fill="none" strokeWidth={11} strokeLinecap="round" />
      <path className="s-steel-dark" d={d} fill="none" strokeWidth={2.5} strokeDasharray="6 7" />
      <g className="night-only">
        {bulbs.map(([x, y], i) => (
          <circle key={i} className="f-light" cx={r1(x)} cy={r1(y)} r={2.4} />
        ))}
      </g>
    </g>
  );
}

function Walkway({ y }: { y: number }) {
  const x0 = LEFT + 56;
  const x1 = RIGHT - 56;
  const struts = [];
  for (let x = x0; x < x1; x += 16) {
    struts.push(<path key={x} d={`M${x} ${y} L${x + 8} ${y + 16} L${x + 16} ${y}`} />);
  }
  return (
    <g>
      <rect className="f-steel" x={x0} y={y} width={x1 - x0} height={16} />
      <g className="s-steel-dark" fill="none" strokeWidth={1.6}>
        {struts}
      </g>
      <rect className="f-steel-dark" x={x0} y={y + 14} width={x1 - x0} height={3} />
      <g className="night-only">
        {Array.from({ length: 14 }, (_, i) => (
          <circle key={i} className="f-light" cx={x0 + 8 + i * 15} cy={y + 2} r={1.8} />
        ))}
      </g>
    </g>
  );
}

function TowerBridge() {
  return (
    <g id="tower-bridge">
      <SideTower cx={300} />
      <SideTower cx={1300} />
      {/* road decks */}
      <rect className="f-steel-dark" x={300} y={DECK} width={1000} height={16} />
      <rect className="f-steel" x={300} y={DECK - 6} width={1000} height={7} />
      <rect className="f-light night-only" x={300} y={DECK + 7} width={1000} height={2} />
      <Chain from={LEFT - 56} to={326} />
      <Chain from={RIGHT + 56} to={1274} />
      <Walkway y={300} />
      <Walkway y={326} />
      <MainTower cx={LEFT} />
      <MainTower cx={RIGHT} />
    </g>
  );
}

// ------------------------------------------------------------------ river and embankment

function River() {
  const rand = random(5);
  const stripes = Array.from({ length: 14 }, () => ({
    x: r1(rand() * W),
    y: r1(WATER + 18 + rand() * 150),
    w: r1(40 + rand() * 140),
  }));
  return (
    <g>
      <rect x={0} y={WATER} width={W} height={300} fill="url(#water)" />
      <use
        href="#tower-bridge"
        transform={`matrix(1 0 0 -1 0 ${WATER * 2 - 8})`}
        className="reflection"
        clipPath="url(#below-water)"
      />
      <g className="f-shimmer">
        {stripes.map((s, i) => (
          <rect key={i} className="shimmer" x={s.x} y={s.y} width={s.w} height={2.2} rx={1.1} />
        ))}
      </g>
      {/* golden columns under the lit towers */}
      <g className="lit">
        {[LEFT, RIGHT, 300, 1300].map((x) =>
          Array.from({ length: 6 }, (_, i) => (
            <rect
              key={`${x}-${i}`}
              className="f-light shimmer"
              x={x - 18 + (i % 2) * 8}
              y={WATER + 22 + i * 22}
              width={28 - i * 3}
              height={2.4}
              rx={1.2}
            />
          )),
        )}
      </g>
    </g>
  );
}

function Tree({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} 780) scale(${s})`}>
      <rect className="f-iron" x={-6} y={-120} width={12} height={130} />
      <circle className="f-leaf-dark" cx={-46} cy={-150} r={58} />
      <circle className="f-leaf" cx={10} cy={-190} r={72} />
      <circle className="f-leaf-dark" cx={58} cy={-140} r={52} />
      <circle className="f-leaf" cx={-12} cy={-120} r={50} />
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g>
      <circle className="glow flicker" cx={x} cy={622} r={120} fill="url(#lamp-glow)" />
      <path
        className="f-iron"
        d={`M${x - 18} 900 L${x - 10} 860 L${x + 10} 860 L${x + 18} 900 Z`}
      />
      <rect className="f-iron" x={x - 5} y={640} width={10} height={222} />
      <rect className="f-iron" x={x - 22} y={662} width={44} height={5} rx={2} />
      <path
        className="f-iron"
        d={`M${x - 16} 640 L${x - 20} 608 L${x + 20} 608 L${x + 16} 640 Z`}
      />
      <path
        className="f-light lit"
        d={`M${x - 12} 636 L${x - 15} 612 L${x + 15} 612 L${x + 12} 636 Z`}
      />
      <path className="f-iron" d={`M${x - 24} 610 L${x} 588 L${x + 24} 610 Z`} />
      <line className="s-iron" x1={x} y1={588} x2={x} y2={574} strokeWidth={3} />
    </g>
  );
}

function StringLights({
  x0,
  y0,
  x1,
  y1,
  sag,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sag: number;
}) {
  const n = Math.round(Math.abs(x1 - x0) / 22);
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [r1(x0 + (x1 - x0) * t), r1(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t))] as const;
  });
  return (
    <g>
      <path
        className="s-iron"
        d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag * 2} ${x1} ${y1}`}
        fill="none"
        strokeWidth={1.4}
      />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle className="f-iron" cx={x} cy={y + 3} r={3} />
          <circle className="f-light lit flicker" cx={x} cy={y + 3} r={3.2} />
        </g>
      ))}
    </g>
  );
}

function Embankment() {
  const joints = [];
  for (let i = -8; i <= 8; i++) {
    joints.push(<line key={i} x1={800 + i * 70} y1={806} x2={800 + i * 150} y2={900} />);
  }
  return (
    <g>
      <Tree x={60} s={1.15} />
      <Tree x={1545} s={1.25} />
      {/* river wall and railing */}
      <rect className="f-wall" x={0} y={770} width={W} height={38} />
      <rect className="f-paving" x={0} y={806} width={W} height={94} />
      <g className="s-paving-line" strokeWidth={1.4}>
        {joints}
        <line x1={0} y1={840} x2={W} y2={840} />
        <line x1={0} y1={880} x2={W} y2={880} />
      </g>
      <g className="s-iron" strokeWidth={2.4}>
        <line x1={0} y1={742} x2={W} y2={742} />
        {Array.from({ length: 41 }, (_, i) => (
          <line key={i} x1={i * 40} y1={742} x2={i * 40} y2={772} />
        ))}
      </g>
      <StringLights x0={0} y0={600} x1={212} y1={612} sag={18} />
      <StringLights x0={1388} y0={612} x1={W} y1={596} sag={20} />
      <Lamp x={212} />
      <Lamp x={1388} />
    </g>
  );
}

// ------------------------------------------------------------------ scene

export function LondonScene({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`london-scene ${className}`}
      viewBox={`0 0 ${W} 900`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="f-sky-top" />
          <stop offset="0.55" className="f-sky-mid" />
          <stop offset="0.68" className="f-sky-low" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="f-water-top" />
          <stop offset="1" className="f-water-low" />
        </linearGradient>
        <radialGradient id="sun-glow">
          <stop offset="0" className="f-sun-glow" stopOpacity={0.9} />
          <stop offset="1" className="f-sun-glow" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="moon-glow">
          <stop offset="0" stopColor="#f3ecd2" stopOpacity={0.35} />
          <stop offset="1" stopColor="#f3ecd2" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lamp-glow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ffd27a" stopOpacity={0} />
        </radialGradient>
        <mask id="crescent">
          <circle cx={1225} cy={150} r={30} fill="#fff" />
          <circle cx={1239} cy={141} r={26} fill="#000" />
        </mask>
        <clipPath id="below-water">
          <rect x={0} y={WATER} width={W} height={300} />
        </clipPath>
      </defs>

      <rect width={W} height={900} fill="url(#sky)" />
      <Stars />
      <Moon />
      <Sun />
      <CloudLayer
        className="clouds-far"
        clouds={[
          { x: 120, y: 120, s: 0.7 },
          { x: 520, y: 210, s: 0.55 },
          { x: 860, y: 90, s: 0.8 },
          { x: 1180, y: 260, s: 0.6 },
          { x: 1450, y: 150, s: 0.75 },
        ]}
      />
      <City />
      <CloudLayer
        className="clouds-near"
        clouds={[
          { x: 260, y: 330, s: 1.15 },
          { x: 1000, y: 200, s: 1.3 },
          { x: 1420, y: 380, s: 1 },
        ]}
      />
      <TowerBridge />
      <River />
      <Embankment />
    </svg>
  );
}

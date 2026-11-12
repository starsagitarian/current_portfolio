/**
 * Viewport width -> --sky. 0 = daylight (phones), 1 = dusk (tablets), 2 = blue hour (desktops),
 * with eased blends in between:
 *
 *   <= 560 px  0        560-768  0 -> 1      768-1100  1        1100-1280  1 -> 2      >= 1280  2
 */
export const SKY_STOPS = { day: 560, dusk: 768, duskEnd: 1100, night: 1280 } as const;

const ease = (t: number) => t * t * (3 - 2 * t);

export function skyForWidth(width: number): number {
  const { day, dusk, duskEnd, night } = SKY_STOPS;
  if (width <= day) return 0;
  if (width < dusk) return ease((width - day) / (dusk - day));
  if (width <= duskEnd) return 1;
  if (width < night) return 1 + ease((width - duskEnd) / (night - duskEnd));
  return 2;
}

/**
 * The same mapping as a tiny inline script, run in <head>-order before first paint so the page
 * never flashes the wrong light. Kept in sync with skyForWidth by the unit test.
 */
export const SKY_INIT_SCRIPT = `(function(){var w=innerWidth,s,e=function(t){return t*t*(3-2*t)};s=w<=${SKY_STOPS.day}?0:w<${SKY_STOPS.dusk}?e((w-${SKY_STOPS.day})/${SKY_STOPS.dusk - SKY_STOPS.day}):w<=${SKY_STOPS.duskEnd}?1:w<${SKY_STOPS.night}?1+e((w-${SKY_STOPS.duskEnd})/${SKY_STOPS.night - SKY_STOPS.duskEnd}):2;document.documentElement.style.setProperty("--sky",String(s))})()`;

export function skyLabel(sky: number): string {
  if (sky < 0.15) return "Daylight";
  if (sky < 0.85) return "Sunset";
  if (sky < 1.15) return "Dusk";
  if (sky < 1.85) return "Lights on";
  return "Blue hour";
}

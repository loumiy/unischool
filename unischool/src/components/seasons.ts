import { createContext, type CSSProperties } from 'react';

// The year on the map (Plan 74I, review A1-10): the game's own calendar,
// weeks 1–26 the Fall Term, 27–52 the Spring Term and the summer beat at
// week 52. Leaves turn through the Fall Term and are down by week 21; snow
// lies from week 21 to week 32, deepest at the turn of the terms (week 26);
// the trees stay bare into the Spring Term, bud from week 34, and are green
// again by week 44. A tint by the week: nothing here animates, so reduced
// motion has nothing to stop. Written apart from the events' own winter
// model (review G7-3) so that fix can read the same calendar.

export interface Season {
  // 0..1 how far the deciduous leaves have turned.
  turn: number;
  // 0..1 how bare the deciduous trees are (leaves down, not yet budded).
  bare: number;
  // 0..1 how deep the snow lies on lawns and roofs.
  snow: number;
  // 0..1 fresh spring green on the budding trees.
  bud: number;
}

// A week with no season in it (no turn, no bare, no snow, no bud): the
// summer palette as styles.css has it, for the map with seasons off.
export const SUMMER_GREEN_WEEK = 50;

// A ramp from 0 at `a` to 1 at `b`.
const ramp = (w: number, a: number, b: number) => Math.max(0, Math.min(1, (w - a) / (b - a)));

export function seasonOf(week: number): Season {
  const w = ((Math.round(week) - 1) % 52 + 52) % 52 + 1;
  const turn = ramp(w, 6, 16) * (1 - ramp(w, 34, 36));
  const bare = w < 34 ? ramp(w, 16, 21) : 1 - ramp(w, 34, 42);
  const snow = ramp(w, 21, 24) * (1 - ramp(w, 29, 32));
  const bud = w >= 34 ? ramp(w, 34, 38) * (1 - ramp(w, 40, 44)) : 0;
  return { turn, bare, snow, bud };
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// Mix two #rrggbb colors, `t` of the way from a to b.
export function mixColor(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// The summer palette (styles.css's own defaults) and what each season
// turns it to.
const GRASS = '#82a561';
const GRASS_DEEP = '#729452';
const LAWN = '#8fae6b';
const CANOPY = '#4f7a3c';
const CANOPY_TOP = '#679a4c';
const ORNAMENTAL = '#7d9e4a';
const ORNAMENTAL_TOP = '#9ab85f';
const CONIFER_TOP = '#467c4f';
const STRAW = '#a9a36a';
const SNOW = '#eef2f4';
const TWIG = '#7d6c5a';
const GOLD = '#c8912e';
const GOLD_TOP = '#dcae45';
const RUST = '#c4582c';
const RUST_TOP = '#de7a3c';
const BUD = '#9cc466';
// The land around the campus (Plan 81B): its fields, woods, hedges and the
// haze it fades into, which follow the year as the campus's own ground does.
const CROP = '#bdb468';
const HAY = '#9bb86c';
const PLOUGH = '#9d8563';
const SHOOTS = '#8fa860';
const WOOD = '#4b7238';
const WOOD_TURNED = '#9a7a33';
const WOOD_BARE = '#6e6454';
const PINE_WOOD = '#3a603c';
const HEDGE = '#4a6e36';
const HEDGE_TURNED = '#8c6a2c';
const HEDGE_BARE = '#6b5d4a';
const HAZE = '#cad6d3';
const WINTER_HAZE = '#dce2e6';

// What the map's stylesheet reads, as CSS variables on the map.
export function seasonStyle(week: number): CSSProperties {
  const s = seasonOf(week);
  // Deciduous crowns: green, turned, then fading to bare twigs, then budding.
  const leaf = (green: string, turned: string) => {
    const autumn = mixColor(green, turned, s.turn);
    const bared = mixColor(autumn, TWIG, s.bare);
    return mixColor(bared, BUD, s.bud * 0.9);
  };
  const dry = Math.max(s.turn * 0.3, s.bare * 0.45);
  const ground = (c: string) => mixColor(mixColor(c, STRAW, dry), SNOW, s.snow * 0.85);
  return {
    '--grass': ground(GRASS),
    '--grass-deep': ground(GRASS_DEEP),
    '--lawn': ground(LAWN),
    '--leaf-canopy': leaf(CANOPY, GOLD),
    '--leaf-canopy-top': leaf(CANOPY_TOP, GOLD_TOP),
    '--leaf-ornamental': leaf(ORNAMENTAL, RUST),
    '--leaf-ornamental-top': leaf(ORNAMENTAL_TOP, RUST_TOP),
    // Bare crowns thin to a haze of twigs over the trunk.
    '--leaf-opacity': String(Number((1 - s.bare * 0.6).toFixed(3))),
    '--conifer-top': mixColor(CONIFER_TOP, SNOW, s.snow * 0.6),
    // The land around the campus: the crops ripen to stubble, then lie
    // under snow and come up green; woods and hedges turn and go bare.
    '--field-crop': ground(mixColor(CROP, BUD, s.bud * 0.7)),
    '--field-hay': ground(HAY),
    '--field-plough': ground(mixColor(PLOUGH, SHOOTS, s.bud * 0.5)),
    '--wood': mixColor(mixColor(mixColor(mixColor(WOOD, WOOD_TURNED, s.turn), WOOD_BARE, s.bare), BUD, s.bud * 0.5), SNOW, s.snow * 0.45),
    '--pine-wood': mixColor(PINE_WOOD, SNOW, s.snow * 0.3),
    '--hedge': mixColor(mixColor(mixColor(HEDGE, HEDGE_TURNED, s.turn), HEDGE_BARE, s.bare), SNOW, s.snow * 0.35),
    '--haze': mixColor(HAZE, WINTER_HAZE, s.snow),
  } as CSSProperties;
}

// How deep the snow lies, for the roofs (buildingMotifs.tsx's palettes).
export const SnowContext = createContext(0);
export const SNOW_COLOR = SNOW;

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
// The land around the campus (Plan 81B): its fields, far hills and the
// haze it fades into, which follow the year as the campus's own ground does.
const CROP = '#bdb468';
const HAY = '#9bb86c';
const PLOUGH = '#9d8563';
const ROUGH = '#8a9d5a';
const SHOOTS = '#8fa860';
const WOOD = '#4b7238';
const WOOD_TURNED = '#9a7a33';
const WOOD_BARE = '#6e6454';
const HAZE = '#cad6d3';
const HEDGE_TOP = '#55863f';
const BED = '#7a6248';
const WINTER_HAZE = '#dce2e6';
// The open ground (Plan 95B, the second review's B1-2): the pitches' turf,
// the courts' surround, the water, and the Japanese garden's planting.
const TURF = '#6d9150';
const TURF_DEEP = '#5d7f43';
const TURF_ROOF = '#5d8a4a';
const COURT = '#5e8a58';
const WATER = '#6ba3bd';
const POOL_COVER = '#7d8b88';
const ICE = '#c4d3da';
const GARDEN_GRASS = '#7fa652';
const MOSS = '#6d8a4a';
const BLOSSOM = '#e79bb8';
const BLOSSOM_TOP = '#f7c6d8';
const AZALEA_LEAF = '#3f6b34';
const AZALEA_LEAF_TOP = '#58884a';
const AZALEA = '#d9829f';
const AZALEA_TOP = '#f0a8c0';
const AZALEA_DEEP = '#b5487a';
const AZALEA_DEEP_TOP = '#d5679a';

// How much snow a kept pitch takes: about half the lawn's 0.85.
const PITCH_COVER = 0.42;

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
  const fieldUnderSnow = (c: string, cover: number) => mixColor(mixColor(c, STRAW, dry), SNOW, s.snow * cover);
  const pitch = (c: string) => mixColor(mixColor(c, STRAW, dry), SNOW, s.snow * PITCH_COVER);
  // An azalea: in flower but for the fall and the winter, its leaf green
  // then; `cover` of the snow on its top. The flowers go and come back
  // quickly, so the mix of pink and green (a brown) lasts a week or two.
  const flowering = 1 - Math.min(1, 3 * Math.max(s.turn, s.bare));
  const azalea = (bloom: string, green: string, cover: number) => mixColor(mixColor(green, bloom, flowering), SNOW, s.snow * cover);
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
    // under snow and come up green. The farm fields have no border (Plan
    // 81D), so under snow each keeps a little of its own color (the
    // stubble white, the grass paler, the plough's furrows darker) and
    // neighbours still read apart.
    '--field-crop': fieldUnderSnow(mixColor(CROP, BUD, s.bud * 0.7), 0.88),
    '--field-hay': fieldUnderSnow(HAY, 0.74),
    '--field-plough': fieldUnderSnow(mixColor(PLOUGH, SHOOTS, s.bud * 0.5), 0.6),
    '--field-rough': ground(ROUGH),
    '--wood': mixColor(mixColor(mixColor(mixColor(WOOD, WOOD_TURNED, s.turn), WOOD_BARE, s.bare), BUD, s.bud * 0.5), SNOW, s.snow * 0.45),
    '--haze': mixColor(HAZE, WINTER_HAZE, s.snow),
    // The gardens' planting (Plan 87K): clipped evergreen hedges that take
    // the snow on top, beds that lie under it, blooms gone from bare to bud.
    '--hedge-top': mixColor(HEDGE_TOP, SNOW, s.snow * 0.75),
    '--bed': mixColor(BED, SNOW, s.snow * 0.8),
    '--bloom-opacity': String(Number((1 - Math.max(s.bare, s.snow)).toFixed(3))),
    // The pitches (Plan 95B): the turf dulls toward straw with the lawn but
    // takes about half its snow, because pitches are kept clear; the pitch
    // lines stay white on it. The courts' surround is painted, so it does
    // not dry, but takes the same snow.
    '--turf': pitch(TURF),
    '--turf-deep': pitch(TURF_DEEP),
    // The roof track's infield is not swept: it takes the lawn's snow.
    '--turf-roof': ground(TURF_ROOF),
    '--court': mixColor(COURT, SNOW, s.snow * PITCH_COVER),
    // Open water: the pool is covered while snow lies, its lanes and deep
    // end under the cover; the garden's pond freezes, the koi under the ice.
    '--water': mixColor(WATER, POOL_COVER, s.snow),
    '--pond': mixColor(WATER, ICE, s.snow),
    '--under-ice-opacity': String(Number((1 - s.snow).toFixed(3))),
    // The Japanese garden: its grass and moss lie under the snow as the
    // lawn does; the cherries blossom only while the trees bud (weeks
    // 34–44), and otherwise wear the ornamental leaves (green, rust, bare);
    // their petals lie only under the blossom. The azaleas are evergreen
    // and flower but for the fall and the winter, their tops under snow.
    '--garden-grass': ground(GARDEN_GRASS),
    '--moss': ground(MOSS),
    '--sakura': mixColor(leaf(ORNAMENTAL, RUST), BLOSSOM, s.bud),
    '--sakura-top': mixColor(leaf(ORNAMENTAL_TOP, RUST_TOP), BLOSSOM_TOP, s.bud),
    '--petal-opacity': String(Number(s.bud.toFixed(3))),
    '--azalea': azalea(AZALEA, AZALEA_LEAF, 0),
    '--azalea-top': azalea(AZALEA_TOP, AZALEA_LEAF_TOP, 0.75),
    '--azalea-deep': azalea(AZALEA_DEEP, AZALEA_LEAF, 0),
    '--azalea-deep-top': azalea(AZALEA_DEEP_TOP, AZALEA_LEAF_TOP, 0.75),
  } as CSSProperties;
}

// How deep the snow lies, for the roofs (buildingMotifs.tsx's palettes).
export const SnowContext = createContext(0);
export const SNOW_COLOR = SNOW;

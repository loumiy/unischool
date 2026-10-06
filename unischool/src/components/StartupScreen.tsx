import { useEffect, useState } from 'react';
import { useHotkeys } from './hotkeys';
import { STARTING_INSTITUTION_SUFFIX } from '../state/actions';
import { BONUS_VERNACULAR_CHOICES, FOUNDERS_GEORGIAN_COLOURS, VERNACULARS, VERNACULAR_CHOICES } from './buildingSpec';
import { isUnlocked, readUnlocks, unlockOf } from '../state/unlocks';
import { FOUNDING_VERNACULAR, NAME_LIMIT_NOTE, UNIVERSITY_CAPTION, prefixedCaption } from '../data/foundingData';
import { FOUNDING_COLORS, SCHOOL_COLOR_PAIRS, schoolColorsOf, type SchoolColorChoice } from '../data/schoolColors';
import { applySchoolColors } from './theme';
import { LogoMark } from './Logo';
import type { SchoolColors, Vernacular } from '../state/types';
import { COLLEGE_NAME_MAX, bareSchoolName, typedPrefixed, typedUniversity } from '../state/types';

// Shown once, before play begins: name the school, and choose its
// architecture and colors. Every other founding condition comes from
// FOUNDING_PRESET (data/foundingData.ts).
//
// The player writes only half the name: every school opens as a College,
// and the suffix is fixed because the game later offers to change it (the
// University charter, see systems/events/charter.ts). A "College" or
// "University" typed after the name is dropped (types.ts's bareSchoolName),
// and the facade shows the whole name carved in stone. A typed "University"
// gets a caption saying when it comes (Plan 78G); the field starts empty.

// The facade: Founders Hall seen head-on, in the chosen vernacular. Every
// color and part is read from buildingSpec.ts's VERNACULARS, so this preview
// cannot drift from the map. It is a flat elevation rather than the isometric
// motif because an iso mass cannot carry the name at this size. Seven bays
// because Founders Hall is seven tiles across.
const FACADE_BAYS = 7;
const FACADE_VIEW_WIDTH = 440;
const FACADE_VIEW_HEIGHT = 214;
// The spire and campanile rise past the top of the frame on purpose; the
// viewBox crops them, as it crops the columns at the bottom.
const FACADE_BAND_LEFT = 18;
const FACADE_BAND_WIDTH = 404; // shared span for the cornice/frieze/architrave
// The engraved text's width before it must compress (see bannerFontSize and
// needsCompression), a little inside FACADE_BAND_WIDTH.
const FACADE_TEXT_WIDTH = 360;
// The colonnade sits tighter than the full width, centered on the apex (220).
const FACADE_COLUMN_SPAN = 320;

// Stepped sizes, so a short name gets a large banner font.
function bannerFontSize(len: number): number {
  if (len <= 16) return 25;
  if (len <= 24) return 20;
  if (len <= 34) return 16;
  if (len <= 46) return 13;
  return 11;
}

// Rough average glyph width in em for this uppercase serif, so `textLength`
// compression applies only to names that overflow the smallest size.
const AVG_GLYPH_WIDTH_EM = 0.62;

// Shades derived from one material, as buildingMotifs' paletteFrom does on the map.
function tint(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.max(0, Math.min(255, Math.round(v * factor))));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// The two banners hung from the band in the school's colors (primary cloth,
// secondary stripe), outside the colonnade. The one thing on the facade not
// read from the vernacular.
const BANNER_WIDTH = 18;
const BANNER_HEIGHT = 58;
const BANNER_INSET = 4; // from the band's edge

function HungBanner({ x, y, colors }: { x: number; y: number; colors: SchoolColors }) {
  const tail = 8;
  const w = BANNER_WIDTH;
  const h = BANNER_HEIGHT;
  return (
    <g>
      <polygon
        fill={colors.primary}
        points={`${x},${y} ${x + w},${y} ${x + w},${y + h} ${x + w / 2},${y + h - tail} ${x},${y + h}`}
      />
      <rect fill={colors.secondary} x={x} y={y + 10} width={w} height="6" />
      <rect fill={tint(colors.primary, 0.75)} x={x} y={y} width={w} height="2" />
    </g>
  );
}

// --- Georgian: Founders Hall after the owner's reference picture --------
// (Plan 87M): the slate hip with its dormers and an end stack at each end,
// the white pediment with its oculus over the name band (the portico's
// entablature, run the width of the front), and on the ridge the clock
// tower: a brick stage, the white clock stage, the open lantern, the
// verdigris dome and a gilt finial. Below the band, two ranks of
// white-framed sashes and the portico's four columns before the door.
const GEORGIAN_BAND_Y = 108;
const GEORGIAN_PEDIMENT_HALF = 80;
const GEORGIAN_EAVES_Y = GEORGIAN_BAND_Y;
const GEORGIAN_RIDGE_Y = 84;
const { slate: SLATE, glass: SASH_GLASS, verdigris: VERDIGRIS } = FOUNDERS_GEORGIAN_COLOURS;

function GeorgianCrown({ wall, trim, gilt, tower }: { wall: string; trim: string; gilt: string | null; tower: string }) {
  const cx = FACADE_VIEW_WIDTH / 2;
  const L = FACADE_BAND_LEFT - 4; const R = FACADE_BAND_LEFT + FACADE_BAND_WIDTH + 4;
  const eaves = GEORGIAN_EAVES_Y; const ridge = GEORGIAN_RIDGE_Y;
  const hip = (eaves - ridge) * 2.2;     // how far in the hip ends reach
  const ped = GEORGIAN_PEDIMENT_HALF;
  const tw = 22;                         // the tower's brick stage
  const finial = gilt ?? trim;
  return (
    <>
      {/* The clock tower, behind the roof, top down. */}
      <line stroke={finial} strokeWidth="1.6" x1={cx} y1="-2" x2={cx} y2="9" />
      <circle fill={finial} cx={cx} cy="5" r="1.8" />
      <path fill={tint(VERDIGRIS, 0.9)} stroke={tint(VERDIGRIS, 0.65)} strokeWidth="0.6" d={`M ${cx - 10} 22 A 10 13 0 0 1 ${cx + 10} 22 Z`} />
      <path fill={tint(VERDIGRIS, 1.12)} d={`M ${cx - 6} 21 A 5 10 0 0 1 ${cx} 11 A 6 11 0 0 0 ${cx - 2} 21 Z`} />
      <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.5" x={cx - 13} y="22" width="26" height="3" />
      <rect fill={trim} x={cx - 11} y="25" width="22" height="15" />
      <path fill={SASH_GLASS} d={`M ${cx - 7} 40 L ${cx - 7} 31 A 7 6 0 0 1 ${cx + 7} 31 L ${cx + 7} 40 Z`} />
      <path fill="#8a6a32" d={`M ${cx - 2} 30 L ${cx + 2} 30 L ${cx + 3} 34 L ${cx + 4.5} 36 L ${cx - 4.5} 36 L ${cx - 3} 34 Z`} />
      {[cx - 11, cx + 8].map((x) => <rect key={x} fill={tint(trim, 1.02)} stroke={tint(trim, 0.78)} strokeWidth="0.4" x={x} y="25" width="3" height="15" />)}
      <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.5" x={cx - 14} y="40" width="28" height="3" />
      <rect fill={tower} stroke={tint(tower, 0.82)} strokeWidth="0.5" x={cx - 12} y="43" width="24" height="17" />
      <circle fill="#f2ede0" stroke="#2d3034" strokeWidth="0.8" cx={cx} cy="51.5" r="6" />
      <line stroke="#2d3034" strokeWidth="0.9" x1={cx} y1="51.5" x2={cx} y2="47.5" />
      <line stroke="#2d3034" strokeWidth="0.9" x1={cx} y1="51.5" x2={cx + 3} y2="52.5" />
      <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.5" x={cx - 14} y="60" width="28" height="3" />
      <rect fill={wall} x={cx - tw / 2} y="63" width={tw} height={eaves - 63} />

      {/* The end stacks, out at the ridge's ends. */}
      {[L + hip + 6, R - hip - 18].map((x) => (
        <g key={x}>
          <rect fill={wall} x={x} y={ridge - 20} width="12" height="22" />
          <rect fill={tint(wall, 0.8)} x={x + 8} y={ridge - 20} width="4" height="22" />
          <rect fill={trim} x={x - 2} y={ridge - 23} width="16" height="3" />
        </g>
      ))}

      {/* The slate hip: its front slope, and the two hip ends. */}
      <polygon fill={SLATE} points={`${L},${eaves} ${L + hip},${ridge} ${R - hip},${ridge} ${R},${eaves}`} />
      <polygon fill={tint(SLATE, 1.14)} points={`${L},${eaves} ${L + hip},${ridge} ${L + hip * 1.25},${eaves}`} />
      <polygon fill={tint(SLATE, 0.84)} points={`${R},${eaves} ${R - hip},${ridge} ${R - hip * 1.25},${eaves}`} />
      <rect fill={tint(SLATE, 0.8)} x={L + hip} y={ridge - 1} width={R - L - hip * 2} height="1.5" />
      {/* Pedimented dormers, two each side of the portico. */}
      {[cx - ped - 54, cx - ped - 24, cx + ped + 24, cx + ped + 54].map((x) => (
        <g key={x}>
          <rect fill={trim} x={x - 7} y={eaves - 13} width="14" height="12" />
          <rect fill={SASH_GLASS} x={x - 4} y={eaves - 10} width="8" height="9" />
          <polygon fill={trim} stroke={tint(trim, 0.72)} strokeWidth="0.6" points={`${x - 9},${eaves - 13} ${x},${eaves - 19} ${x + 9},${eaves - 13}`} />
        </g>
      ))}

      {/* The pediment, its raking moulding and the oculus. */}
      <polygon fill={trim} stroke={tint(trim, 0.72)} strokeWidth="1" strokeLinejoin="round" points={`${cx - ped},${eaves} ${cx},${ridge - 2} ${cx + ped},${eaves}`} />
      <polygon fill={tint(trim, 0.94)} points={`${cx - ped + 12},${eaves - 2} ${cx},${ridge + 2.5} ${cx + ped - 12},${eaves - 2}`} />
      <circle fill={SASH_GLASS} stroke={trim} strokeWidth="1.6" cx={cx} cy={eaves - 9} r="5" />
    </>
  );
}

// One white-framed six-over-six sash, its lintel over it.
function Sash({ x, y, h, trim }: { x: number; y: number; h: number; trim: string }) {
  return (
    <g>
      <rect fill={trim} x={x - 7.5} y={y - 1.5} width="15" height={h + 3} />
      <rect fill={tint(trim, 0.92)} x={x - 9} y={y - 5} width="18" height="3.5" />
      <rect fill={SASH_GLASS} x={x - 5.5} y={y} width="11" height={h} />
      <path stroke={trim} strokeWidth="0.7" fill="none" d={`M ${x} ${y} V ${y + h} M ${x - 5.5} ${y + h / 3} H ${x + 5.5} M ${x - 5.5} ${y + (h * 2) / 3} H ${x + 5.5}`} />
    </g>
  );
}

function GeorgianFront({ wall, trim, wallTop }: { wall: string; trim: string; wallTop: number }) {
  const cx = FACADE_VIEW_WIDTH / 2;
  const ped = GEORGIAN_PEDIMENT_HALF;
  const ranks = [wallTop + 10, wallTop + 42];
  const sh = 20;
  const steps = FACADE_VIEW_HEIGHT - 12;
  const sides = [54, 82, 110, FACADE_VIEW_WIDTH - 110, FACADE_VIEW_WIDTH - 82, FACADE_VIEW_WIDTH - 54];
  const columns = [-66, -22, 22, 66].map((d) => cx + d);
  return (
    <>
      {sides.flatMap((x) => ranks.map((y) => <Sash key={`${x}-${y}`} x={x} y={y} h={sh} trim={trim} />))}
      {/* The portico: the shade behind its columns, sashes and the door. */}
      <rect fill={tint(wall, 0.72)} x={cx - ped} y={wallTop} width={ped * 2} height={steps - wallTop} />
      {[cx - 44, cx + 44].flatMap((x) => ranks.map((y) => <Sash key={`p${x}-${y}`} x={x} y={y} h={sh} trim={tint(trim, 0.86)} />))}
      <Sash x={cx} y={ranks[0]} h={sh} trim={tint(trim, 0.86)} />
      <rect fill={tint(trim, 0.86)} x={cx - 11} y={ranks[1] - 2} width="22" height={steps - ranks[1] + 2} />
      <rect fill="#2f3b45" x={cx - 8} y={ranks[1] + 6} width="16" height={steps - ranks[1] - 6} />
      <path fill={SASH_GLASS} stroke={tint(trim, 0.86)} strokeWidth="1" d={`M ${cx - 8} ${ranks[1] + 6} A 8 6 0 0 1 ${cx + 8} ${ranks[1] + 6} Z`} />
      {columns.map((x) => (
        <g key={x}>
          <rect fill={trim} x={x - 7} y={wallTop} width="14" height="3" />
          <rect fill={trim} x={x - 5} y={wallTop + 3} width="10" height={steps - wallTop - 3} />
          <rect fill={tint(trim, 0.82)} x={x + 2} y={wallTop + 3} width="3" height={steps - wallTop - 3} />
          <rect fill={trim} x={x - 7} y={steps - 3} width="14" height="3" />
        </g>
      ))}
      {/* The steps up to it. */}
      {[0, 1, 2].map((i) => (
        <rect key={i} fill={tint(trim, 0.96 - i * 0.04)} x={cx - ped + 4 - i * 6} y={steps + i * 4} width={(ped - 4 + i * 6) * 2} height="4" />
      ))}
    </>
  );
}

// `suffix`: what the school became (the hall of fame's portraits); a new
// school is a college.
export function SchoolFacade({ name, vernacular, colors, suffix = STARTING_INSTITUTION_SUFFIX }: { name: string; vernacular: Vernacular; colors: SchoolColors; suffix?: string }) {
  const bare = bareSchoolName(name);
  const bannerText = bare ? `${bare.toUpperCase()} ${suffix.toUpperCase()}` : suffix.toUpperCase();
  const fontSize = bannerFontSize(bannerText.length);
  const compress = bannerText.length * fontSize * AVG_GLYPH_WIDTH_EM > FACADE_TEXT_WIDTH;

  // Straight off the map's tables: a hall's wall is `brickRed` in every set.
  const spec = VERNACULARS[vernacular];
  const wall = spec.materials.brickRed.wall;
  const roof = spec.materials.brickRed.roof;
  // A vernacular with no trim (Modern) gets a band a shade lighter than the wall.
  const trim = spec.stone.trim === 'none' ? tint(wall, 1.1) : spec.stone.trim;
  const glass = spec.stone.glass;
  const gilt = spec.stone.gilt === 'none' ? null : spec.stone.gilt;
  const entrance = spec.parts.entrance.hall ?? 'none';
  const apex = spec.parts.apex;
  const tower = spec.stone.towerStone;
  const lead = '#6f7479';
  const iron = '#2d3034';

  const cx = FACADE_VIEW_WIDTH / 2;
  // Georgian draws the whole of the new Founders Hall (Plan 87M), its band
  // lower to leave room for the roof and the clock tower over it.
  const georgian = vernacular === 'georgian';
  const bandY = georgian ? GEORGIAN_BAND_Y : 92;          // head of the engraved band
  // Every crown is drawn down to bandY so no sky shows between roof and wall.
  const bandH = 32;
  const wallTop = bandY + bandH;
  const baseY = 152;         // where the ground-story order begins

  const bayXs = Array.from(
    { length: FACADE_BAYS },
    (_, i) => (FACADE_VIEW_WIDTH - FACADE_COLUMN_SPAN) / 2 + (i * FACADE_COLUMN_SPAN) / (FACADE_BAYS - 1),
  );

  // --- THE CROWN: what the building does above its own name band. --------
  const crown = () => {
    if (apex === 'core') {
      // Modern: a slab edge, stepped back once.
      return (
        <>
          <rect fill={tint(roof, 1.0)} x={FACADE_BAND_LEFT} y="78" width={FACADE_BAND_WIDTH} height={bandY - 78} />
          <rect fill={tint(wall, 1.04)} x={FACADE_BAND_LEFT + 46} y="64" width={FACADE_BAND_WIDTH - 92} height="14" />
        </>
      );
    }
    if (apex === 'spire') {
      // Gothic: a steep gable, rising well past the band.
      return (
        <>
          <polygon fill={roof} points={`${cx},22 ${FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 4},${bandY} ${FACADE_BAND_LEFT + 4},${bandY}`} />
          <polygon fill={tint(roof, 1.12)} points={`${cx},22 ${cx},${bandY} ${FACADE_BAND_LEFT + 4},${bandY}`} />
        </>
      );
    }
    if (apex === 'gatehouse') {
      // Tudor: a steep roof, and tall stacks at either end.
      return (
        <>
          <polygon fill={roof} points={`${cx},50 ${FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 4},${bandY} ${FACADE_BAND_LEFT + 4},${bandY}`} />
          <polygon fill={tint(roof, 1.12)} points={`${cx},50 ${cx},${bandY} ${FACADE_BAND_LEFT + 4},${bandY}`} />
          {[70, FACADE_VIEW_WIDTH - 82].map((x) => (
            <g key={x}>
              <rect fill={wall} x={x} y="46" width="12" height="40" />
              <rect fill={trim} x={x - 2} y="44" width="16" height="4" />
            </g>
          ))}
        </>
      );
    }
    if (apex === 'belvedere') {
      // Italianate: a low hip on deep eaves, with a row of brackets.
      return (
        <>
          <polygon fill={roof} points={`${cx},62 ${FACADE_BAND_LEFT + FACADE_BAND_WIDTH + 14},84 ${FACADE_BAND_LEFT - 14},84`} />
          <rect fill={tint(roof, 0.72)} x={FACADE_BAND_LEFT - 14} y="84" width={FACADE_BAND_WIDTH + 28} height="3" />
          <rect fill={tint(wall, 0.9)} x={FACADE_BAND_LEFT} y="87" width={FACADE_BAND_WIDTH} height={bandY - 87} />
          {Array.from({ length: 17 }, (_, i) => FACADE_BAND_LEFT + 6 + i * ((FACADE_BAND_WIDTH - 12) / 16)).map((x) => (
            <rect key={x} fill={tint(trim, 0.78)} x={x - 2} y="87" width="4" height={bandY - 87} />
          ))}
        </>
      );
    }
    if (apex === 'pavilionTower') {
      // Second Empire: a steep mansard with dormers, and cresting on top.
      return (
        <>
          <polygon fill={roof} points={`${FACADE_BAND_LEFT - 4},${bandY} ${FACADE_BAND_LEFT + 14},50 ${FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 14},50 ${FACADE_BAND_LEFT + FACADE_BAND_WIDTH + 4},${bandY}`} />
          <line stroke={iron} strokeWidth="1.5" x1={FACADE_BAND_LEFT + 14} y1="50" x2={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 14} y2="50" />
          {Array.from({ length: 36 }, (_, i) => FACADE_BAND_LEFT + 16 + i * ((FACADE_BAND_WIDTH - 32) / 35)).map((x) => (
            <line key={x} stroke={iron} strokeWidth="0.8" x1={x} y1="50" x2={x} y2="45" />
          ))}
          {[0, 1, 2, 4, 5, 6].map((i) => {
            const x = FACADE_BAND_LEFT + 44 + i * ((FACADE_BAND_WIDTH - 88) / 6);
            return (
              <g key={i}>
                <path fill={trim} d={`M ${x - 9} 86 L ${x - 9} 66 A 9 9 0 0 1 ${x + 9} 66 L ${x + 9} 86 Z`} />
                <path fill={glass} d={`M ${x - 5} 84 L ${x - 5} 67 A 5 5 0 0 1 ${x + 5} 67 L ${x + 5} 84 Z`} />
              </g>
            );
          })}
        </>
      );
    }
    if (apex === 'ziggurat') {
      // Art Deco: a tall parapet banded in gilt.
      return (
        <>
          <rect fill={tint(wall, 1.02)} x={FACADE_BAND_LEFT} y="70" width={FACADE_BAND_WIDTH} height={bandY - 70} />
          <rect fill={gilt ?? trim} x={FACADE_BAND_LEFT} y="80" width={FACADE_BAND_WIDTH} height="4" />
          <rect fill={tint(wall, 1.05)} x={FACADE_BAND_LEFT + 60} y="58" width={FACADE_BAND_WIDTH - 120} height="12" />
        </>
      );
    }
    if (apex === 'campanile') {
      // Mission: a shallow tile roof with a deep overhang and its eaves shadow.
      return (
        <>
          <polygon fill={roof} points={`${cx},54 ${FACADE_BAND_LEFT + FACADE_BAND_WIDTH + 8},86 ${FACADE_BAND_LEFT - 8},86`} />
          <rect fill={tint(roof, 0.72)} x={FACADE_BAND_LEFT - 8} y="86" width={FACADE_BAND_WIDTH + 16} height={bandY - 86} />
        </>
      );
    }
    // Georgian: the pediment, with an inset raking moulding.
    return (
      <>
        <polygon fill={trim} stroke={tint(trim, 0.72)} strokeWidth="1.2" strokeLinejoin="round" points={`24,${bandY} ${cx},36 416,${bandY}`} />
        <polyline fill="none" stroke={tint(trim, 0.78)} strokeWidth="0.8" points={`37,84 ${cx},52 403,84`} />
      </>
    );
  };

  // --- THE APEX: the one thing that stands above everything else. --------
  const landmark = () => {
    const w = 34;
    const x = cx - w / 2;
    if (apex === 'cupola') {
      return (
        <>
          <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.8" x={x} y="34" width={w} height="28" />
          <path fill={gilt ?? trim} d={`M ${x - 3} 34 A ${w / 2 + 3} 15 0 0 1 ${x + w + 3} 34 Z`} />
          <line stroke={gilt ?? trim} strokeWidth="2" x1={cx} y1="8" x2={cx} y2="19" />
        </>
      );
    }
    if (apex === 'spire') {
      return (
        <>
          <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.8" x={x} y="30" width={w} height="34" />
          <polygon fill={tint(trim, 0.9)} points={`${cx},-30 ${x + w},36 ${x},36`} />
        </>
      );
    }
    if (apex === 'campanile') {
      return (
        <>
          <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.8" x={x} y="24" width={w} height="38" />
          <rect fill={glass} x={x + 7} y="34" width={w - 14} height="16" rx="8" />
          <polygon fill={roof} points={`${cx},6 ${x + w + 4},24 ${x - 4},24`} />
        </>
      );
    }
    if (apex === 'dome') {
      // Classical: a broad stone dome on a low drum, with a small lantern.
      return (
        <>
          <rect fill={trim} stroke={tint(trim, 0.8)} strokeWidth="0.8" x={cx - 58} y="50" width="116" height="16" />
          <path fill={tint(trim, 0.94)} stroke={tint(trim, 0.78)} strokeWidth="0.8" d={`M ${cx - 58} 50 A 58 34 0 0 1 ${cx + 58} 50 Z`} />
          <rect fill={trim} x={cx - 5} y="8" width="10" height="10" />
          <line stroke={gilt ?? trim} strokeWidth="2" x1={cx} y1="0" x2={cx} y2="8" />
        </>
      );
    }
    if (apex === 'gatehouse') {
      // Tudor: a brick gate tower, battlemented, between two capped turrets.
      return (
        <>
          <rect fill={tower} x={x - 8} y="10" width={w + 16} height="70" />
          {[0, 1, 2, 3].map((i) => <rect key={i} fill={tower} x={x - 6 + i * 13} y="4" width="7" height="7" />)}
          <rect fill={glass} stroke={trim} strokeWidth="1.2" x={cx - 8} y="30" width="16" height="16" />
          <circle fill="#f2ede0" cx={cx} cy="20" r="5" />
          {[x - 16, x + w + 6].map((tx) => (
            <g key={tx}>
              <rect fill={tint(tower, 0.9)} x={tx} y="2" width="10" height="78" />
              <polygon fill={lead} points={`${tx - 1},2 ${tx + 11},2 ${tx + 5},-12`} />
            </g>
          ))}
        </>
      );
    }
    if (apex === 'belvedere') {
      // Italianate: a square lookout, arched, under a low bracketed cap.
      return (
        <>
          <rect fill={tower} x={x - 4} y="24" width={w + 8} height="44" />
          {[0, 1, 2].map((i) => (
            <path key={i} fill={glass} d={`M ${x + 2 + i * 12} 44 L ${x + 2 + i * 12} 33 A 4 4 0 0 1 ${x + 10 + i * 12} 33 L ${x + 10 + i * 12} 44 Z`} />
          ))}
          <circle fill="#f2ede0" cx={cx} cy="56" r="5" />
          <polygon fill={roof} points={`${cx},12 ${x + w + 14},24 ${x - 14},24`} />
        </>
      );
    }
    if (apex === 'pavilionTower') {
      // Second Empire: a clock stage under its own tall mansard.
      return (
        <>
          <rect fill={tower} x={x - 4} y="30" width={w + 8} height="40" />
          <circle fill="#f2ede0" stroke={tint(tower, 0.8)} cx={cx} cy="46" r="7" />
          <polygon fill={roof} points={`${x - 6},30 ${x + 2},2 ${x + w - 2},2 ${x + w + 6},30`} />
          <ellipse fill={trim} cx={cx} cy="16" rx="5" ry="6" />
          <line stroke={iron} strokeWidth="1.5" x1={x + 2} y1="2" x2={x + w - 2} y2="2" />
        </>
      );
    }
    if (apex === 'ziggurat') {
      // Art Deco: stepped setbacks to a gilt mast.
      return (
        <>
          <rect fill={tower} stroke={tint(tower, 0.78)} strokeWidth="0.8" x={x - 8} y="36" width={w + 16} height="36" />
          <rect fill={tower} stroke={tint(tower, 0.78)} strokeWidth="0.8" x={x - 2} y="20" width={w + 4} height="16" />
          <rect fill={tower} stroke={tint(tower, 0.78)} strokeWidth="0.8" x={x + 5} y="8" width={w - 10} height="12" />
          {([[36, 8], [20, 2], [8, -5]] as const).map(([y, d]) => <rect key={y} fill={gilt ?? trim} x={x - d} y={y} width={w + d * 2} height="2" />)}
          <circle fill="#f2ede0" cx={cx} cy="50" r="6" />
          <line stroke={gilt ?? trim} strokeWidth="2" x1={cx} y1="-6" x2={cx} y2="8" />
        </>
      );
    }
    // Modern: the carillon (Plan 87L), an open concrete frame with a clock
    // stage, its bells in the open belfry, a thin slab and a steel spire.
    const frame = tint(tower, 0.72);
    return (
      <>
        <rect fill={frame} x={x - 2} y="8" width="7" height="72" />
        <rect fill={frame} x={x + w - 5} y="8" width="7" height="72" />
        {[50, 64].map((y) => <rect key={y} fill={frame} x={x + 5} y={y} width={w - 10} height="3" />)}
        <rect fill={tint(tower, 0.8)} x={x + 5} y="27" width={w - 10} height="18" />
        <circle fill="#f2ede0" stroke={tint(tower, 0.6)} strokeWidth="0.8" cx={cx} cy="36" r="6" />
        <line stroke={iron} strokeWidth="1" x1={cx} y1="36" x2={cx} y2="31.5" />
        <line stroke={iron} strokeWidth="1" x1={cx} y1="36" x2={cx + 3.5} y2="37" />
        <path fill="#8a6a3a" d={`M ${cx - 3} 13 L ${cx + 3} 13 L ${cx + 4} 20 L ${cx + 6} 24 L ${cx - 6} 24 L ${cx - 4} 20 Z`} />
        <rect fill={tint(tower, 0.8)} x={x - 6} y="4" width={w + 12} height="4" />
        <line stroke={iron} strokeWidth="1.2" x1={cx} y1="4" x2={cx} y2="-10" />
      </>
    );
  };

  // --- THE ORDER: what stands along the ground story. -------------------
  const order = () => {
    if (entrance === 'arcade') {
      // Mission: a run of round arches.
      return bayXs.slice(0, FACADE_BAYS - 1).map((x, i) => {
        const w = bayXs[1] - bayXs[0];
        return (
          <g key={i}>
            <path
              fill={tint(wall, 0.55)}
              d={`M ${x + 5} ${FACADE_VIEW_HEIGHT} L ${x + 5} ${baseY + 22}
                  A ${(w - 10) / 2} ${(w - 10) / 2} 0 0 1 ${x + w - 5} ${baseY + 22}
                  L ${x + w - 5} ${FACADE_VIEW_HEIGHT} Z`}
            />
          </g>
        );
      });
    }
    if (entrance === 'canopy') {
      // Modern: a glazed ground story between slim posts, and the thin
      // slab of the canopy over the middle bays.
      return (
        <>
          <rect fill={glass} x={FACADE_BAND_LEFT} y={baseY + 10} width={FACADE_BAND_WIDTH} height={FACADE_VIEW_HEIGHT - baseY - 10} />
          {bayXs.map((x, i) => (
            <rect key={i} fill={trim} x={x - 3} y={baseY + 10} width="6" height={FACADE_VIEW_HEIGHT - baseY - 10} />
          ))}
          <rect fill={trim} x={cx - 70} y={baseY} width="140" height="5" />
          <rect fill={tint(wall, 0.6)} x={cx - 70} y={baseY + 5} width="140" height="3" />
        </>
      );
    }
    if (entrance === 'recess') {
      // A recessed entrance: piers, a ribbon of glazing above them, and the
      // undercut between.
      return (
        <>
          <rect fill={glass} x={FACADE_BAND_LEFT} y={baseY} width={FACADE_BAND_WIDTH} height="13" />
          <rect fill={tint(wall, 0.5)} x={FACADE_BAND_LEFT} y={baseY + 22} width={FACADE_BAND_WIDTH} height={FACADE_VIEW_HEIGHT - baseY - 22} />
          {bayXs.map((x, i) => (
            <rect key={i} fill={wall} x={x - 9} y={baseY + 22} width="18" height={FACADE_VIEW_HEIGHT - baseY - 22} />
          ))}
        </>
      );
    }
    if (entrance === 'porch') {
      // Gothic: buttresses between lancets, and the pointed arch in the
      // middle bay.
      return (
        <>
          {bayXs.map((x, i) => (
            <rect key={`b${i}`} fill={tint(wall, 0.92)} x={x - 10} y={baseY} width="20" height={FACADE_VIEW_HEIGHT - baseY} />
          ))}
          {bayXs.slice(0, FACADE_BAYS - 1).map((x, i) => {
            const w = bayXs[1] - bayXs[0];
            const lx = x + w / 2;
            return (
              <path
                key={`l${i}`}
                fill={glass}
                d={`M ${lx - 6} ${FACADE_VIEW_HEIGHT} L ${lx - 6} ${baseY + 20} L ${lx} ${baseY + 8} L ${lx + 6} ${baseY + 20} L ${lx + 6} ${FACADE_VIEW_HEIGHT} Z`}
              />
            );
          })}
          <path
            fill={tint(wall, 0.45)}
            d={`M ${cx - 22} ${FACADE_VIEW_HEIGHT} L ${cx - 22} ${baseY + 26} L ${cx} ${baseY + 2} L ${cx + 22} ${baseY + 26} L ${cx + 22} ${FACADE_VIEW_HEIGHT} Z`}
          />
        </>
      );
    }
    // Georgian: the colonnade, cropped at the bottom of the frame.
    return bayXs.map((x, i) => (
      <g key={i}>
        <rect fill={trim} x={x - 16} y={baseY} width="32" height="6" />
        <polygon fill={trim} points={`${x - 16},${baseY + 6} ${x + 16},${baseY + 6} ${x + 10},${baseY + 14} ${x - 10},${baseY + 14}`} />
        <rect fill={trim} x={x - 10} y={baseY + 14} width="20" height={FACADE_VIEW_HEIGHT - baseY - 14} />
        {[-6, -3, 0, 3, 6].map((dx) => (
          <line key={dx} stroke={tint(trim, 0.86)} strokeWidth="0.6" x1={x + dx} y1={baseY + 14} x2={x + dx} y2={FACADE_VIEW_HEIGHT} />
        ))}
      </g>
    ));
  };

  return (
    <svg
      className="startup-facade-svg"
      viewBox={`0 0 ${FACADE_VIEW_WIDTH} ${FACADE_VIEW_HEIGHT}`}
      role="img"
      aria-label={`${bannerText}, carved across the front of its founding hall`}
    >
      {/* A sky, so pale trim and the roofline read against the parchment card. */}
      <rect className="facade-sky" x="0" y="0" width={FACADE_VIEW_WIDTH} height={FACADE_VIEW_HEIGHT} />
      {georgian ? <GeorgianCrown wall={wall} trim={trim} gilt={gilt} tower={tower} /> : (
        <>
          {landmark()}
          {crown()}
        </>
      )}

      {/* The wall the name is cut into, and the band itself. */}
      <rect fill={wall} x={FACADE_BAND_LEFT} y={bandY} width={FACADE_BAND_WIDTH} height={FACADE_VIEW_HEIGHT - bandY} />
      <rect fill={trim} stroke={tint(trim, 0.78)} strokeWidth="0.9" x={FACADE_BAND_LEFT} y={bandY} width={FACADE_BAND_WIDTH} height={bandH} />
      <text
        className="facade-banner-text"
        x={cx}
        y={bandY + bandH / 2 + 1}
        fontSize={fontSize}
        textLength={compress ? FACADE_TEXT_WIDTH : undefined}
        lengthAdjust={compress ? 'spacingAndGlyphs' : undefined}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {bannerText}
      </text>

      {/* Tudor: oak studs over limewash between the band and the ground story. */}
      {spec.parts.timbering && (
        <>
          <rect fill="#ece3cc" x={FACADE_BAND_LEFT} y={wallTop} width={FACADE_BAND_WIDTH} height={baseY - wallTop} />
          {Array.from({ length: 34 }, (_, i) => FACADE_BAND_LEFT + 2 + i * ((FACADE_BAND_WIDTH - 6) / 33)).map((x) => (
            <rect key={x} fill="#3b2e27" x={x} y={wallTop} width="3" height={baseY - wallTop} />
          ))}
          <rect fill="#3b2e27" x={FACADE_BAND_LEFT} y={baseY - 4} width={FACADE_BAND_WIDTH} height="4" />
        </>
      )}
      {/* Art Deco: piers the full height of the wall. */}
      {spec.parts.piers && bayXs.slice(0, -1).map((x0, i) => (x0 + bayXs[i + 1]) / 2).map((x, i) => (
        <rect key={`p${i}`} fill={tint(wall, 1.06)} stroke={tint(wall, 0.85)} strokeWidth="0.6" x={x - 4} y={wallTop} width="8" height={FACADE_VIEW_HEIGHT - wallTop} />
      ))}

      {/* One rank of the vernacular's own windows, previewing the opening shape. */}
      {georgian ? <GeorgianFront wall={wall} trim={trim} wallTop={wallTop} /> : entrance !== 'recess' && bayXs.map((x, i) => (
        <rect key={i} fill={glass} x={x - 9} y={wallTop + 8} width="18" height="18" />
      ))}

      {/* The school's colours, hung from the band at either end. */}
      <HungBanner x={FACADE_BAND_LEFT + BANNER_INSET} y={wallTop} colors={colors} />
      <HungBanner x={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - BANNER_INSET - BANNER_WIDTH} y={wallTop} colors={colors} />

      {!georgian && order()}
    </svg>
  );
}

export default function StartupScreen({ onStart, onBack, sandbox = false }: {
  onStart: (name: string, vernacular: Vernacular, colors: SchoolColors) => void;
  // Back to the title screen, founding nothing (Escape too, outside the
  // name field).
  onBack: () => void;
  // A sandbox founding (systems/sandbox): says so, and every architecture is open.
  sandbox?: boolean;
}) {
  const [name, setName] = useState('');
  const [vernacular, setVernacular] = useState<Vernacular>(FOUNDING_VERNACULAR);
  // Held as the table's choice so the picker can show its name; the save
  // takes only the two colors (see schoolColorsOf).
  const [choice, setChoice] = useState<SchoolColorChoice>(FOUNDING_COLORS);
  const colors = schoolColorsOf(choice);
  // The bonus sets earlier runs have unlocked (state/unlocks.ts). A locked
  // one can still be previewed on the facade, but not founded.
  const [unlocked] = useState(readUnlocks);
  const open = (id: Vernacular) => sandbox || isUnlocked(id, unlocked);
  const locked = !open(vernacular);

  // Preview the theme live: the pick is written to the root properties as
  // it changes (App.tsx writes it again once the run exists).
  useEffect(() => { applySchoolColors(colors); }, [colors.primary, colors.secondary]);

  useHotkeys((e) => { if (e.key === 'Escape') onBack(); });

  return (
    // Over the title art, as the title screen is: the mark in the sky, the
    // founding on a frosted card.
    <div className="startup">
      <div className="startup-brand" aria-hidden="true">
        <LogoMark className="startup-brand-mark" />
        <span>UniSchool</span>
      </div>
      <div className="startup-card">
        <button type="button" className="startup-back" onClick={onBack}>← Title screen</button>
        {/* What the game is, in one line. */}
        <div className="dateline">{sandbox ? 'Sandbox: unlimited funds, and nothing to wait for.' : 'Fifty years to build a university.'}</div>
        <h1>Name your college</h1>
        <input
          className="startup-name"
          aria-label="The college's name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blackmoor"
          maxLength={COLLEGE_NAME_MAX}
        />
        {name.length >= COLLEGE_NAME_MAX && <p className="startup-name-note" role="status">{NAME_LIMIT_NOTE}</p>}
        <div className="startup-facade">
          <SchoolFacade name={name} vernacular={vernacular} colors={colors} />
          {typedPrefixed(name) ? (
            <p className="startup-facade-caption" role="note">{prefixedCaption(bareSchoolName(name))}</p>
          ) : typedUniversity(name) && (
            <p className="startup-facade-caption" role="note">{UNIVERSITY_CAPTION}</p>
          )}
        </div>
        {/* The architecture: one row of five names (blurbs are tooltips);
            the facade redraws as the player moves between them. Permanent. */}
        <div className="startup-vernaculars" role="radiogroup" aria-label="Architecture">
          {[...VERNACULAR_CHOICES, ...BONUS_VERNACULAR_CHOICES].map((choice) => {
            const isOpen = open(choice.id);
            return (
              <button
                key={choice.id}
                type="button"
                role="radio"
                className={`startup-vern-btn ${vernacular === choice.id ? 'active' : ''} ${unlockOf(choice.id) ? 'bonus' : ''} ${isOpen ? '' : 'locked'}`}
                onClick={() => setVernacular(choice.id)}
                aria-checked={vernacular === choice.id}
                title={isOpen ? choice.blurb : `Locked. ${unlockOf(choice.id)?.condition ?? ''}`}
              >
                {choice.label}
                {!isOpen && <span className="startup-vern-lock">Locked</span>}
              </button>
            );
          })}
        </div>
        {locked && (
          <div className="startup-vern-locked-note" role="status">
            {BONUS_VERNACULAR_CHOICES.find((c) => c.id === vernacular)?.label} is locked. Unlock it in any run: {unlockOf(vernacular)?.condition}
          </div>
        )}
        {/* The colours: one row of two-tone chips (see schoolColors.ts),
            previewed on the facade's banners and the card's chrome. */}
        <div className="startup-colors" role="radiogroup" aria-label="School colors">
          {SCHOOL_COLOR_PAIRS.map((pair) => (
            <button
              key={pair.id}
              type="button"
              role="radio"
              className={`startup-color-btn ${choice.id === pair.id ? 'active' : ''}`}
              aria-checked={choice.id === pair.id}
              aria-label={pair.name}
              title={pair.name}
              onClick={() => setChoice(pair)}
            >
              <span className="startup-color-swatch" aria-hidden="true">
                <span style={{ background: pair.primary }} />
                <span style={{ background: pair.secondary }} />
              </span>
            </button>
          ))}
        </div>
        <div className="startup-color-name">{choice.name}</div>
        <button
          className="startup-begin-btn"
          disabled={bareSchoolName(name).length === 0 || locked}
          onClick={() => onStart(bareSchoolName(name), vernacular, colors)}
        >
          Open the doors
        </button>
      </div>
    </div>
  );
}

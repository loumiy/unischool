import { useEffect, useState } from 'react';
import { useHotkeys } from './hotkeys';
import { STARTING_INSTITUTION_SUFFIX } from '../state/actions';
import { BONUS_VERNACULAR_CHOICES, FOUNDERS_GEORGIAN_COLOURS, VERNACULARS, VERNACULAR_CHOICES } from './buildingSpec';
import { isUnlocked, readUnlocks, unlockOf } from '../state/unlocks';
import { FOUNDING_VERNACULAR, NAME_LIMIT_NOTE, UNIVERSITY_CAPTION, prefixedCaption } from '../data/foundingData';
import { FOUNDING_COLORS, SCHOOL_COLOR_PAIRS, schoolColorsOf, type SchoolColorChoice } from '../data/schoolColors';
import { applySchoolColors } from './theme';
import { LogoMark } from './Logo';
import { FACADE_BAND_Y, FacadeCrown, FacadeFront, paneOver, type FacadePalette } from './facades';
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
// motif because an iso mass cannot carry the name at this size. The sets
// other than Georgian are drawn in facades.tsx.
const FACADE_VIEW_WIDTH = 440;
const FACADE_VIEW_HEIGHT = 214;
const FACADE_BAND_LEFT = 18;
const FACADE_BAND_WIDTH = 404; // shared span for the cornice/frieze/architrave
// The engraved text's width before it must compress (see bannerFontSize and
// needsCompression), a little inside FACADE_BAND_WIDTH.
const FACADE_TEXT_WIDTH = 360;

// Stepped sizes, so a short name gets larger letters. Kept well inside the
// band's height, as an inscription is, rather than filling it.
function bannerFontSize(len: number): number {
  if (len <= 16) return 18;
  if (len <= 24) return 15.5;
  if (len <= 34) return 13;
  if (len <= 46) return 11;
  return 9.5;
}

// Rough average advance in em for these spaced serif capitals (the glyph
// and the letter-spacing in styles.css), so `textLength` compression
// applies only to names that overflow the smallest size.
const AVG_GLYPH_WIDTH_EM = 0.84;

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
const GEORGIAN_PEDIMENT_HALF = 80;
const GEORGIAN_EAVES_Y = FACADE_BAND_Y;
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
  // A vernacular with no trim (Modern) gets a band a shade lighter than the wall.
  const trim = spec.stone.trim === 'none' ? tint(wall, 1.1) : spec.stone.trim;
  const gilt = spec.stone.gilt === 'none' ? null : spec.stone.gilt;
  const palette: FacadePalette = {
    wall, trim, gilt,
    roof: spec.materials.brickRed.roof,
    pane: paneOver(wall, spec.stone.glass),
    tower: spec.stone.towerStone,
  };

  const cx = FACADE_VIEW_WIDTH / 2;
  // Georgian draws the whole of the new Founders Hall (Plan 87M); every
  // other set its own Founders Hall from facades.tsx. Both put the band at
  // the eaves, leaving room above for the roof and what rises over it.
  const georgian = vernacular === 'georgian';
  const bandY = FACADE_BAND_Y;          // head of the engraved band
  const bandH = 32;
  const wallTop = bandY + bandH;

  return (
    <svg
      className="startup-facade-svg"
      viewBox={`0 0 ${FACADE_VIEW_WIDTH} ${FACADE_VIEW_HEIGHT}`}
      role="img"
      aria-label={`${bannerText}, carved across the front of its founding hall`}
    >
      {/* A sky, so pale trim and the roofline read against the card. */}
      <rect className="facade-sky" x="0" y="0" width={FACADE_VIEW_WIDTH} height={FACADE_VIEW_HEIGHT} />
      {georgian ? <GeorgianCrown wall={wall} trim={trim} gilt={gilt} tower={palette.tower} /> : <FacadeCrown vernacular={vernacular} palette={palette} />}

      {/* The wall the name is cut into, and the band itself. */}
      <rect fill={wall} x={FACADE_BAND_LEFT} y={bandY} width={FACADE_BAND_WIDTH} height={FACADE_VIEW_HEIGHT - bandY} />
      <rect fill={trim} stroke={tint(trim, 0.78)} strokeWidth="0.9" x={FACADE_BAND_LEFT} y={bandY} width={FACADE_BAND_WIDTH} height={bandH} />
      {/* The name cut into the band: the letters a shade of the stone
          itself, lit from above, so each cut throws a shadow along its top
          edge and catches the light along its bottom. */}
      {([[0.7, tint(trim, 1.07)], [-0.6, tint(trim, 0.6)], [0, tint(trim, 0.74)]] as const).map(([dy, fill]) => (
        <text
          key={dy}
          className="facade-banner-text"
          x={cx}
          y={bandY + bandH / 2 + 1 + dy}
          fill={fill}
          fontSize={fontSize}
          textLength={compress ? FACADE_TEXT_WIDTH : undefined}
          lengthAdjust={compress ? 'spacingAndGlyphs' : undefined}
          textAnchor="middle"
          dominantBaseline="central"
          aria-hidden={dy !== 0 || undefined}
        >
          {bannerText}
        </text>
      ))}

      {georgian ? <GeorgianFront wall={wall} trim={trim} wallTop={wallTop} /> : <FacadeFront vernacular={vernacular} palette={palette} />}

      {/* The school's colours, hung from the band at either end. */}
      <HungBanner x={FACADE_BAND_LEFT + BANNER_INSET} y={wallTop} colors={colors} />
      <HungBanner x={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - BANNER_INSET - BANNER_WIDTH} y={wallTop} colors={colors} />
    </svg>
  );
}

export default function StartupScreen({ onStart, onBack, replacing, sandbox = false }: {
  onStart: (name: string, vernacular: Vernacular, colors: SchoolColors) => void;
  // Back to the title screen, founding nothing (Escape too, outside the
  // name field).
  onBack: () => void;
  // The college in progress, which founding this one erases (and backing
  // out keeps).
  replacing?: string;
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
        {replacing && <p className="startup-replacing" role="note">Opening the doors erases {replacing}. Go back to the title screen to keep it.</p>}
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

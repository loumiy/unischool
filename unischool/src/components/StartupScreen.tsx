import { useEffect, useState } from 'react';
import { STARTING_INSTITUTION_SUFFIX } from '../state/actions';
import { VERNACULARS, VERNACULAR_CHOICES } from './buildingSpec';
import { FOUNDING_VERNACULAR } from '../data/foundingData';
import { FOUNDING_COLORS, SCHOOL_COLOR_PAIRS, schoolColorsOf, type SchoolColorChoice } from '../data/schoolColors';
import { applySchoolColors } from './theme';
import type { SchoolColors, Vernacular } from '../state/types';
import { bareSchoolName } from '../state/types';

// Shown once, before play begins: name the school, and choose its
// architecture and colours. Every other founding condition comes from
// FOUNDING_PRESET (data/foundingData.ts).
//
// The player writes only half the name: every school opens as a College,
// and the suffix is fixed because the game later offers to change it (the
// University charter, see eventSystem.ts). The facade shows the whole name
// carved in stone, so no caption is needed; the field starts empty.

// The facade: Founders Hall seen head-on, in the chosen vernacular. Every
// colour and part is read from buildingSpec.ts's VERNACULARS, so this preview
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
// The colonnade sits tighter than the full width, centred on the apex (220).
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

// The two banners hung from the band in the school's colours (primary cloth,
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

  const cx = FACADE_VIEW_WIDTH / 2;
  const bandY = 92;          // head of the engraved band
  // Every crown is drawn down to bandY so no sky shows between roof and wall.
  const bandH = 32;
  const wallTop = bandY + bandH;
  const baseY = 152;         // where the ground-storey order begins

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
    // Modern: a blind stair core.
    return <rect fill={tint(wall, 1.02)} x={x - 2} y="16" width={w + 4} height="56" />;
  };

  // --- THE ORDER: what stands along the ground storey. -------------------
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
      // Modern: a glazed ground storey between slim posts, and the thin
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
      {landmark()}
      {crown()}

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

      {/* One rank of the vernacular's own windows, previewing the opening shape. */}
      {entrance !== 'recess' && bayXs.map((x, i) => (
        <rect key={i} fill={glass} x={x - 9} y={wallTop + 8} width="18" height="18" />
      ))}

      {/* The school's colours, hung from the band at either end. */}
      <HungBanner x={FACADE_BAND_LEFT + BANNER_INSET} y={wallTop} colors={colors} />
      <HungBanner x={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - BANNER_INSET - BANNER_WIDTH} y={wallTop} colors={colors} />

      {order()}
    </svg>
  );
}

export default function StartupScreen({ onStart }: { onStart: (name: string, vernacular: Vernacular, colors: SchoolColors) => void }) {
  const [name, setName] = useState('');
  const [vernacular, setVernacular] = useState<Vernacular>(FOUNDING_VERNACULAR);
  // Held as the table's choice so the picker can show its name; the save
  // takes only the two colours (see schoolColorsOf).
  const [choice, setChoice] = useState<SchoolColorChoice>(FOUNDING_COLORS);
  const colors = schoolColorsOf(choice);

  // Preview the theme live: the pick is written to the root properties as
  // it changes (App.tsx writes it again once the run exists).
  useEffect(() => { applySchoolColors(colors); }, [colors.primary, colors.secondary]);

  return (
    <div className="startup">
      <div className="startup-card">
        {/* What the game is, in one line. */}
        <div className="eyebrow">Fifty years to build a university.</div>
        <h1>Name your school</h1>
        <input
          className="startup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blackmoor"
          maxLength={60}
        />
        <div className="startup-facade">
          <SchoolFacade name={name} vernacular={vernacular} colors={colors} />
        </div>
        {/* The architecture: one row of five names (blurbs are tooltips);
            the facade redraws as the player moves between them. Permanent. */}
        <div className="startup-vernaculars" role="radiogroup" aria-label="Architecture">
          {VERNACULAR_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              role="radio"
              className={`startup-vern-btn ${vernacular === choice.id ? 'active' : ''}`}
              onClick={() => setVernacular(choice.id)}
              aria-checked={vernacular === choice.id}
              title={choice.blurb}
            >
              {choice.label}
            </button>
          ))}
        </div>
        {/* The colours: one row of two-tone chips (see schoolColors.ts),
            previewed on the facade's banners and the card's chrome. */}
        <div className="startup-colors" role="radiogroup" aria-label="School colours">
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
          disabled={bareSchoolName(name).length === 0}
          onClick={() => onStart(name.trim(), vernacular, colors)}
        >
          Open the Doors
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { SCHOOL_TYPE_PRESETS } from '../data/schoolTypeData';
import { STARTING_INSTITUTION_SUFFIX } from '../state/actions';
import type { SchoolType } from '../state/types';

// Shown once, before play begins: name the school and pick private vs.
// public. That single choice sets starting conditions via
// SCHOOL_TYPE_PRESETS (see data/schoolTypeData.ts) — no other customization
// here, per docs/design/progression.md("archetypes emerge, they are not
// chosen").
//
// The player writes only HALF the name. Every school opens as a College,
// and the word after the name is fixed rather than typed, because it is
// the thing the game later offers to change: completing the first lab
// offers a one-time promotion to University (see systems/events/
// eventSystem.ts). That used to be spelled out as a fixed chip beside the
// input plus a paragraph of prose underneath; it is now the SchoolFacade
// below, which engraves the whole name — typed half and fixed half
// together — across a building's entablature. Carved stone reads as
// permanent without a caption saying so, and a facade with no "University"
// anywhere on it makes the absence of that option legible the same way.
//
// The field starts EMPTY with a placeholder rather than prefilled: the
// facade already has a graceful empty-state ("COLLEGE" alone, see
// SchoolFacade below), so leaving the input blank no longer means an
// unfinished-looking screen, and an empty field reads unambiguously as
// "type here" the moment the building beside it is doing the explaining.

// ---------------------------------------------------------------------
// THE FACADE. A flat, iconographic classical building front — pediment,
// an engraved entablature carrying the live "<Name> College" banner, and a
// row of column capitals cropped at the bottom of the frame (the columns
// keep going; the picture just doesn't, the same crop a photo of a real
// campus building's portico would have). Built from plain SVG shapes
// rather than an image so the banner text can be the player's own name,
// live, in the game's own serif rather than a raster asset.
// ---------------------------------------------------------------------
const FACADE_COLUMN_COUNT = 7;
const FACADE_VIEW_WIDTH = 440;
const FACADE_VIEW_HEIGHT = 190;
const FACADE_BAND_LEFT = 18;
const FACADE_BAND_WIDTH = 404; // shared span for the cornice/frieze/architrave
// The engraved text's available width before it must compress rather than
// overflow the frieze — see bannerFontSize/needsCompression below. Kept a
// little narrower than FACADE_BAND_WIDTH for a visible margin on each side.
const FACADE_TEXT_WIDTH = 360;
// Columns sit closer together than the frieze's own span — real porticoes
// read as a tight colonnade, not columns spread out to the building's full
// width — anchored on the same center (220) as the pediment's apex.
const FACADE_COLUMN_SPAN = 320;

// Stepped rather than continuously computed: a handful of readable sizes,
// chosen so a short name (the common case) gets a genuinely large,
// banner-scale font instead of always rendering at whatever size fits the
// longest name the input allows.
function bannerFontSize(len: number): number {
  if (len <= 16) return 25;
  if (len <= 24) return 20;
  if (len <= 34) return 16;
  if (len <= 46) return 13;
  return 11;
}

// A rough average glyph width for this uppercase serif banner, in units of
// its own font-size — enough to catch names long enough to overflow even
// the smallest stepped size above, so `textLength` below is only ever
// applied as a last-resort compression, never on ordinary names.
const AVG_GLYPH_WIDTH_EM = 0.62;

function SchoolFacade({ name }: { name: string }) {
  const bannerText = name.trim()
    ? `${name.trim().toUpperCase()} ${STARTING_INSTITUTION_SUFFIX.toUpperCase()}`
    : STARTING_INSTITUTION_SUFFIX.toUpperCase();
  const fontSize = bannerFontSize(bannerText.length);
  const compress = bannerText.length * fontSize * AVG_GLYPH_WIDTH_EM > FACADE_TEXT_WIDTH;

  const columnXs = Array.from(
    { length: FACADE_COLUMN_COUNT },
    (_, i) => (FACADE_VIEW_WIDTH - FACADE_COLUMN_SPAN) / 2 + (i * FACADE_COLUMN_SPAN) / (FACADE_COLUMN_COUNT - 1),
  );

  return (
    <svg
      className="startup-facade-svg"
      viewBox={`0 0 ${FACADE_VIEW_WIDTH} ${FACADE_VIEW_HEIGHT}`}
      role="img"
      aria-label={`${bannerText}, over a row of columns`}
    >
      {/* Roof: the outer raking cornice, plus a second, inset line tracing
          the same slope just inside it — the thin "double line" a real
          pediment's moulding reads as from a distance. */}
      <polygon className="facade-stone" points="24,64 220,10 416,64" />
      <polyline className="facade-line" points="37,58 220,24 403,58" />

      {/* Entablature, stacked the way a real one is: a cornice ledge under
          the roof, the frieze the name is cut into, and a three-line
          architrave beneath it — same stone throughout, differentiated by
          the same kind of thin line as the roof's, not by a change of
          color. */}
      <rect className="facade-stone" x={FACADE_BAND_LEFT} y="61" width={FACADE_BAND_WIDTH} height="8" />
      <line className="facade-line" x1={FACADE_BAND_LEFT + 4} y1="64" x2={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 4} y2="64" />
      <line className="facade-line" x1={FACADE_BAND_LEFT + 4} y1="67" x2={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 4} y2="67" />

      <rect className="facade-stone" x={FACADE_BAND_LEFT} y="69" width={FACADE_BAND_WIDTH} height="32" />
      <text
        className="facade-banner-text"
        x={FACADE_VIEW_WIDTH / 2}
        y={69 + 32 / 2 + 1}
        fontSize={fontSize}
        textLength={compress ? FACADE_TEXT_WIDTH : undefined}
        lengthAdjust={compress ? 'spacingAndGlyphs' : undefined}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {bannerText}
      </text>

      <rect className="facade-stone" x={FACADE_BAND_LEFT} y="101" width={FACADE_BAND_WIDTH} height="16" />
      <line className="facade-line" x1={FACADE_BAND_LEFT + 4} y1="106" x2={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 4} y2="106" />
      <line className="facade-line" x1={FACADE_BAND_LEFT + 4} y1="112" x2={FACADE_BAND_LEFT + FACADE_BAND_WIDTH - 4} y2="112" />

      {/* Columns, cropped at the bottom of the frame — the shafts keep
          going, the picture just doesn't. Each gets an abacus, an echinus
          and several close-set flutes, all the same stone as the roof and
          entablature above. */}
      {columnXs.map((cx, i) => (
        <g key={i}>
          <rect className="facade-stone" x={cx - 16} y="120" width="32" height="6" />
          <polygon
            className="facade-stone"
            points={`${cx - 16},126 ${cx + 16},126 ${cx + 10},134 ${cx - 10},134`}
          />
          <rect className="facade-stone" x={cx - 10} y="134" width="20" height={FACADE_VIEW_HEIGHT - 134} />
          {[-6, -3, 0, 3, 6].map((dx) => (
            <line
              key={dx}
              className="facade-line"
              x1={cx + dx}
              y1="134"
              x2={cx + dx}
              y2={FACADE_VIEW_HEIGHT}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function StartupScreen({ onStart }: { onStart: (name: string, schoolType: SchoolType) => void }) {
  const [name, setName] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('private');

  return (
    <div className="startup">
      <div className="startup-card">
        <div className="eyebrow">Found a University</div>
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
          <SchoolFacade name={name} />
        </div>
        <div className="startup-types">
          {(Object.keys(SCHOOL_TYPE_PRESETS) as SchoolType[]).map((type) => (
            <button
              key={type}
              className={`startup-type-btn ${schoolType === type ? 'active' : ''}`}
              onClick={() => setSchoolType(type)}
            >
              <strong>{SCHOOL_TYPE_PRESETS[type].label}</strong>
              <span>{SCHOOL_TYPE_PRESETS[type].description}</span>
            </button>
          ))}
        </div>
        <button
          className="startup-begin-btn"
          disabled={name.trim().length === 0}
          onClick={() => onStart(name.trim(), schoolType)}
        >
          Open the Doors
        </button>
      </div>
    </div>
  );
}

// Hand-rolled inline SVG icons (no icon library, like CampusMap.tsx's plain
// SVG). Convention: a 24x24 viewBox, stroke=currentColor so each icon takes
// its button's text colour (including the `.active` state), and simple
// primitives rather than hand-fit curves. Sizing lives in styles.css
// (.toolbar-icon-btn svg), so callers pass no width/height.
const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

// Home: back to the campus map. A house, not an arrow: the map is a place.
export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.8 9.6V19h12.4V9.6" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function FacultyIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 19.5c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
      <path d="M15 8.2a2.7 2.7 0 1 1 0 5.4" />
      <path d="M17.2 13.8c2.1.6 3.6 2.6 3.8 5.7" />
    </svg>
  );
}

// Curriculum: a mortarboard and tassel, the degree itself.
export function CurriculumIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 4 3 8.5 12 13l9-4.5L12 4Z" />
      <path d="M7 10.5V15c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5" />
      <path d="M21 8.5V14" />
    </svg>
  );
}

// Research: a microscope, the glyph everyone reads as research. Drawn as an
// instrument: eyepiece and canted tube, the limb curving to the base, and
// the stage the tube looks down at.
export function ResearchIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M13.3 3.5 15.7 4.9" />
      <path d="M14.5 4.2 10.5 10.5" />
      <path d="M9.6 9.9 11.4 11.1" />
      <path d="M13.2 6.2c4 2.4 4.4 9.8 0.8 13.4" />
      <path d="M7.2 12.4h9.2" />
      <path d="M6 19.6h12" />
    </svg>
  );
}

// A heart mirrored exactly around x=12, from two matched cubic curves, so
// it stays symmetric at small sizes.
export function StudentLifeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 20 C12 20 3 14.3 3 8.3 C3 5.3 5.4 3.7 8 3.7 C9.8 3.7 11.3 4.8 12 6.4 C12.7 4.8 14.2 3.7 16 3.7 C18.6 3.7 21 5.3 21 8.3 C21 14.3 12 20 12 20 Z" />
    </svg>
  );
}

export function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 15 15" />
      <polyline points="4 4 4 8 8 8" />
    </svg>
  );
}

// A basketball: a circle with a cross and two bowed seams reads as a ball
// even at 20px, where a panelled soccer ball collapses.
export function AthleticsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="M5.3 5.3c3.2 3 3.2 10.4 0 13.4" />
      <path d="M18.7 5.3c-3.2 3-3.2 10.4 0 13.4" />
    </svg>
  );
}

// A bulldozer in side profile: its boxy silhouette holds up at small sizes
// where a crane reads as a flag on a pole.
export function BuildIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="2" y="15.5" width="15" height="3.5" rx="1.5" />
      <rect x="6" y="10" width="12" height="6" rx="1" />
      <rect x="9.5" y="5.5" width="6" height="5" rx="1" />
      <path d="M2 15.5V11h2.5v3.5" />
      <line x1="4.5" y1="12.2" x2="6" y2="12.2" />
    </svg>
  );
}

export function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  );
}

export function DrawPathIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M3 21l3.5-1 10.5-10.5-2.5-2.5-10.5 10.5-1 3.5Z" />
      <path d="M16.5 4l3.5 3.5" />
    </svg>
  );
}

export function EraseIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="5" y="10" width="14" height="8" rx="1.5" transform="rotate(-20 12 14)" />
      <line x1="7" y1="19.5" x2="20" y2="19.5" />
    </svg>
  );
}

// ---------- build-mode category / facility glyphs ----------
// Same convention as the toolbar icons. One per build-popup category
// (BuildPopup.tsx's SECTION_ICON), so a category is recognisable by glyph.

export function HousingIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
      <rect x="10.5" y="13.5" width="3" height="5.5" />
    </svg>
  );
}

export function DiningIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M4 12a8 8 0 0 0 16 0Z" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M9 4c0 1.6-1 1.6-1 3.2" />
      <path d="M13 4c0 1.6-1 1.6-1 3.2" />
    </svg>
  );
}

export function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 6c-2-1.3-4.5-1.5-7-1v12c2.5-.5 5-.3 7 1 2-1.3 4.5-1.5 7-1V5c-2.5-.5-5-.3-7 1Z" />
      <line x1="12" y1="6" x2="12" y2="19" />
    </svg>
  );
}

export function LabIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M9 3h6" />
      <path d="M10 3v6l-4.6 7.4A2 2 0 0 0 7.1 20h9.8a2 2 0 0 0 1.7-3.6L14 9V3" />
      <line x1="7.5" y1="14" x2="16.5" y2="14" />
    </svg>
  );
}

export function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function QuadIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="9" r="6" />
      <line x1="12" y1="15" x2="12" y2="21" />
    </svg>
  );
}

export function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 3 L6 12 H9 L5 18 H19 L15 12 H18 Z" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}

export function FitnessIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <rect x="3" y="8" width="3" height="8" rx="1" />
      <rect x="18" y="8" width="3" height="8" rx="1" />
    </svg>
  );
}

export function ArtsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 3a9 8 0 1 0 0 16c1 0 1.5-.7 1.5-1.5S13 16.3 13 15.6c0-.8.6-1.3 1.4-1.3H16a4 4 0 0 0 4-4C20 6 16.4 3 12 3Z" />
      <circle cx="8" cy="9" r="1" stroke="none" fill="currentColor" />
      <circle cx="12" cy="7" r="1" stroke="none" fill="currentColor" />
      <circle cx="16" cy="9" r="1" stroke="none" fill="currentColor" />
    </svg>
  );
}

export function AcademicIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M3 9 12 4l9 5" />
      <line x1="5" y1="9.5" x2="5" y2="18" />
      <line x1="9" y1="9.5" x2="9" y2="18" />
      <line x1="15" y1="9.5" x2="15" y2="18" />
      <line x1="19" y1="9.5" x2="19" y2="18" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function ToolsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// The dock's figures and gears. The four headline stats wear a glyph (the
// word survives as title and visually-hidden text, see StatusHeader.tsx),
// and the speed control is four glyphs. Stat glyphs render at 16px, so
// nothing is finer than a 1.6 stroke can carry.
// ---------------------------------------------------------------------

// Rank: a rosette — a medal's disc with two ribbon tails.
export function RankIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.8 13.6 7 21l5-2.6L17 21l-1.8-7.4" />
    </svg>
  );
}

// Enrolled: two heads and shoulders, the student body.
export function StudentsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M16.5 14.5c2.6 0 4.5 1.9 4.5 4.5" />
    </svg>
  );
}

// Prestige: a star.
export function PrestigeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8Z" />
    </svg>
  );
}

// Satisfaction: a smiling face. It deliberately does not change with the
// figure; the number beside it is the reading.
export function SatisfactionIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
      <path d="M9.2 9.6h.01M14.8 9.6h.01" strokeWidth="2.2" />
    </svg>
  );
}

// The gears. Filled rather than stroked: a play triangle drawn as an
// outline at 14px reads as a warning sign.
const FILLED = { fill: 'currentColor', stroke: 'none' };

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" {...FILLED}>
      <rect x="6" y="5" width="4.2" height="14" rx="1" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" {...FILLED}>
      <path d="M7 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L8.2 4.5A.8.8 0 0 0 7 5.2Z" />
    </svg>
  );
}

// 2x: two triangles. 4x: two triangles with a bar, the way a tape deck
// marked "fast" — three or four triangles at 14px are a smudge.
export function DoubleSpeedIcon() {
  return (
    <svg viewBox="0 0 24 24" {...FILLED}>
      <path d="M3 5.6v12.8a.7.7 0 0 0 1.1.6L12 12.6a.7.7 0 0 0 0-1.2L4.1 5a.7.7 0 0 0-1.1.6Z" />
      <path d="M12.5 5.6v12.8a.7.7 0 0 0 1.1.6l7.9-6.4a.7.7 0 0 0 0-1.2L13.6 5a.7.7 0 0 0-1.1.6Z" />
    </svg>
  );
}

// Eight times: three chevrons and the bar, narrower.
export function OctoSpeedIcon() {
  return (
    <svg viewBox="0 0 24 24" {...FILLED}>
      <path d="M1 6.2v11.6a.6.6 0 0 0 1 .5L8 12.5a.6.6 0 0 0 0-1L2 5.7a.6.6 0 0 0-1 .5Z" />
      <path d="M7.4 6.2v11.6a.6.6 0 0 0 1 .5l6-5.8a.6.6 0 0 0 0-1l-6-5.8a.6.6 0 0 0-1 .5Z" />
      <path d="M13.8 6.2v11.6a.6.6 0 0 0 1 .5l6-5.8a.6.6 0 0 0 0-1l-6-5.8a.6.6 0 0 0-1 .5Z" />
      <rect x="21" y="5" width="2.2" height="14" rx="0.8" />
    </svg>
  );
}

export function QuadSpeedIcon() {
  return (
    <svg viewBox="0 0 24 24" {...FILLED}>
      <path d="M2 5.6v12.8a.7.7 0 0 0 1.1.6L11 12.6a.7.7 0 0 0 0-1.2L3.1 5A.7.7 0 0 0 2 5.6Z" />
      <path d="M10.5 5.6v12.8a.7.7 0 0 0 1.1.6l7.9-6.4a.7.7 0 0 0 0-1.2L11.6 5a.7.7 0 0 0-1.1.6Z" />
      <rect x="20" y="5" width="2.4" height="14" rx="0.8" />
    </svg>
  );
}

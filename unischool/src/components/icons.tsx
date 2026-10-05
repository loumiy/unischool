// Inline SVG icons, no icon library at runtime. Some are drawn here; the
// owner picked others, icon by icon, from Lucide (Plan 93), copied in as
// their shapes so callers are unchanged (Lucide's licence beside this file,
// LUCIDE_LICENSE.txt). Convention for both: a 24x24 viewBox,
// stroke=currentColor so each icon takes its button's text color (including
// the `.active` state), round caps, and the 1.6 line (Lucide's own is 2).
// Sizing lives in styles.css (.toolbar-icon-btn svg), so callers pass no
// width/height.
const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

// Lucide's "school" (Plan 93; see LUCIDE_LICENSE.txt).
export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
      <path d="M18 4.933V21" />
      <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" />
      <path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11" />
      <path d="M6 4.933V21" />
      <circle cx="12" cy="9" r="2" />
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

// Lucide's "book-open" (Plan 93; see LUCIDE_LICENSE.txt).
export function CurriculumIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 5v16" />
      <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
    </svg>
  );
}

// Lucide's "atom" (Plan 93; see LUCIDE_LICENSE.txt).
export function ResearchIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="12" r="1" />
      <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" />
      <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
    </svg>
  );
}

// Lucide's "heart" (Plan 93; see LUCIDE_LICENSE.txt).
export function StudentLifeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </svg>
  );
}

// Lucide's "history" (Plan 93; see LUCIDE_LICENSE.txt).
export function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

// Lucide's "inbox" (Plan 93; see LUCIDE_LICENSE.txt).
export function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

// Lucide's "volleyball" (Plan 93; see LUCIDE_LICENSE.txt).
export function AthleticsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M11 7a16 16 20 0 1 10.98 4.362" />
      <path d="M12 12a13 13 0 0 1-8.66 5" />
      <path d="M16.83 13.634a16 16 0 0 1-9.267 7.328" />
      <path d="M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10" />
      <path d="M8.17 15.366a16 16 0 0 1-1.713-11.69" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

// Lucide's "wrench" (Plan 93; see LUCIDE_LICENSE.txt).
export function BuildIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />
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

// Lucide's "eraser" (Plan 93; see LUCIDE_LICENSE.txt).
export function EraseIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
      <path d="m5.082 11.09 8.828 8.828" />
    </svg>
  );
}

// ---------- build-mode category / facility glyphs ----------
// Same convention as the toolbar icons. One per build-popup category
// (BuildPopup.tsx's SECTION_ICON), so a category is recognisable by glyph.

// Lucide's "bed-double" (Plan 93; see LUCIDE_LICENSE.txt).
export function HousingIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M12 4v6" />
      <path d="M2 18h20" />
    </svg>
  );
}

// Lucide's "utensils-crossed" (Plan 93; see LUCIDE_LICENSE.txt).
export function DiningIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    </svg>
  );
}

// Lucide's "library-big" (Plan 93; see LUCIDE_LICENSE.txt).
export function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect width="8" height="18" x="3" y="3" rx="1" />
      <path d="M7 3v18" />
      <path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" />
    </svg>
  );
}

// Lucide's "flask-conical" (Plan 93; see LUCIDE_LICENSE.txt).
export function LabIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
      <path d="M6.453 15h11.094" />
      <path d="M8.5 2h7" />
    </svg>
  );
}

// Lucide's "heart-pulse" (Plan 93; see LUCIDE_LICENSE.txt).
export function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
      <path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}

// Lucide's "land-plot" (Plan 93; see LUCIDE_LICENSE.txt).
export function QuadIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="m12 8 6-3-6-3v10" />
      <path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12" />
      <path d="m6.49 12.85 11.02 6.3" />
      <path d="M17.51 12.85 6.5 19.15" />
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

// Lucide's "palette" (Plan 93; see LUCIDE_LICENSE.txt).
export function ArtsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
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

// Lucide's "settings" (Plan 93; see LUCIDE_LICENSE.txt).
export function ToolsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// The dock's figures and gears. The four headline stats wear a glyph (the
// word survives as title and visually-hidden text, see StatusHeader.tsx),
// and the speed control is four glyphs. Stat glyphs render at 16px, so
// nothing is finer than a 1.6 stroke can carry.
// ---------------------------------------------------------------------

// Lucide's "award" (Plan 93; see LUCIDE_LICENSE.txt).
export function RankIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
      <circle cx="12" cy="8" r="6" />
    </svg>
  );
}

// Students (the tab and the dock's enrolled figure): three heads, a crowd,
// so it never reads as the Faculty tab's pair.
export function StudentsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="8" r="2.8" />
      <path d="M7 19.5c0-3 2.2-5 5-5s5 2 5 5" />
      <circle cx="5.2" cy="10" r="2.1" />
      <path d="M1.8 18.5c0-2.3 1.5-3.9 3.6-3.9" />
      <circle cx="18.8" cy="10" r="2.1" />
      <path d="M22.2 18.5c0-2.3-1.5-3.9-3.6-3.9" />
    </svg>
  );
}

// Lucide's "star" (Plan 93; see LUCIDE_LICENSE.txt).
export function PrestigeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

// Lucide's "smile" (Plan 93; see LUCIDE_LICENSE.txt).
export function SatisfactionIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M15 10V9" />
      <path d="M16.472 15a6 6 0 01-8.943 0" />
      <path d="M9 10V9" />
      <circle cx="12" cy="12" r="10" />
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

// ---------------------------------------------------------------------
// The recurring controls (Plan 76H): the glyphs that used to be Unicode
// characters, drawn once here so each means one thing. ✕ is close and
// nothing else; releasing and removing have their own.
// ---------------------------------------------------------------------

// Close: the one close glyph, on the round close and the tab's "Close" pill.
export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE} strokeWidth={2.6} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// Disclosure: a chevron, pointing right when shut and down when open.
export function DisclosureIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...STROKE} strokeWidth={2.6} aria-hidden="true">
      <path d={open ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

// Lucide's "layers" (Plan 93; see LUCIDE_LICENSE.txt).
export function MapToolsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
}


// Lucide's "log-out" (Plan 93; see LUCIDE_LICENSE.txt).
export function ReleaseIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE} strokeWidth={2} aria-hidden="true">
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

// Lucide's "trash-2" (Plan 93; see LUCIDE_LICENSE.txt).
export function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE} strokeWidth={2} aria-hidden="true">
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// The camera's quarter turn, mirrored for the left. The owner's pick, though
// it is close to the ⟳ that turns a building (R, the ghost's handle).
// Lucide's "rotate-cw" (Plan 93; see LUCIDE_LICENSE.txt).
export function TurnViewIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" {...STROKE} strokeWidth={2} aria-hidden="true"
      style={direction === 'left' ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

// One set of status marks: done, pending, failed.
export type Status = 'done' | 'pending' | 'failed';
export function StatusIcon({ status }: { status: Status }) {
  return (
    <svg viewBox="0 0 24 24" {...STROKE} strokeWidth={2.4} aria-hidden="true">
      {status === 'done' && <path d="M20 6 9 17l-5-5" />}
      {status === 'pending' && <circle cx="12" cy="12" r="7" />}
      {status === 'failed' && <><circle cx="12" cy="12" r="8" /><path d="M9 9l6 6M15 9l-6 6" /></>}
    </svg>
  );
}

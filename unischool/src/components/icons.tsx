// Hand-rolled inline SVG icons for the bottom toolbar (see Toolbar.tsx).
//
// No vector icon library (Lucide, game-icons.net, ...) is installed in this
// project, and CampusMap.tsx already draws everything in plain SVG on
// purpose ("no canvas, no game library, no new deps" — see its own module
// comment). Adding a dependency for a dozen small glyphs would cut against
// that precedent, so these follow the same convention instead: a 24x24
// viewBox, stroke=currentColor so every icon inherits the toolbar button's
// own text colour (including its `.active` gold state) for free, and simple
// primitives (lines, rects, circles, short polylines) rather than hand-fit
// bezier curves, which are easy to get subtly wrong without a design tool.
//
// One icon per TabId (see TabNav.tsx) plus the toolbar's own build/log/path
// tools. Each is a fixed-size glyph — sizing lives in styles.css
// (.toolbar-icon-btn svg), not here — so a caller never has to pass width/
// height props.
const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function FacultyIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 4 3 8.5 12 13l9-4.5L12 4Z" />
      <path d="M7 10.5V15c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5" />
      <path d="M21 8.5V14" />
    </svg>
  );
}

export function CurriculumIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="3" y="5" width="8" height="14" rx="1" />
      <rect x="13" y="5" width="8" height="14" rx="1" />
      <line x1="12" y1="5" x2="12" y2="19" />
    </svg>
  );
}

export function TreasuryIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontFamily="Georgia, serif" stroke="none" fill="currentColor">$</text>
    </svg>
  );
}

export function AdmissionsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2" width="6" height="3" rx="1" />
      <polyline points="8.5 13 10.5 15 15.5 10" />
    </svg>
  );
}

export function StudentLifeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M12 20.5s-7.5-4.6-9.9-9C.5 7.8 2 4 5.8 4c2 0 3.7 1.1 4.5 2.7C11.1 5.1 12.8 4 14.8 4c3.8 0 5.3 3.8 3.7 7.5-2.4 4.4-9.9 9-9.9 9Z" />
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

export function AthleticsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <polygon points="12 3 14.6 9.1 21.3 9.6 16.2 13.9 17.8 20.4 12 16.8 6.2 20.4 7.8 13.9 2.7 9.6 9.4 9.1" />
    </svg>
  );
}

export function BuildIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="9.5" y="1.8" width="6" height="8.6" rx="1.3" transform="rotate(45 12.5 6.1)" />
      <line x1="9.8" y1="9.8" x2="3.2" y2="16.4" />
      <line x1="2" y1="21" x2="6.6" y2="16.4" />
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
// Same 24x24, stroke=currentColor convention as the toolbar icons above.
// One per build-popup category (see BuildPopup.tsx's SECTION_ICON) so the
// horizontal build menu reads as a row of distinct "menu icons" — a type
// is recognisable by its glyph before its label, the way the reference's
// build bar tabs its categories by picture.

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

export function ToolsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" />
    </svg>
  );
}

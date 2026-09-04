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

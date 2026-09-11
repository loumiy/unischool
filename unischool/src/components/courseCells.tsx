import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { instructorOf } from '../systems/faculty/facultyAssignment';

// ---------------------------------------------------------------------
// The shared vocabulary of a single course, in one place: what state it is
// in, what the hover card says about it, and where that card is allowed to
// sit on screen. Two views draw courses now and both read from here, so a
// course can never mean one thing on the Curriculum tab's constellation
// (CurriculumConstellation.tsx) and another in a school's own card list
// (SchoolCurriculumPanel.tsx, opened from the campus map):
//   - cellState is the five-state read every course's colour comes from;
//   - CourseTooltipBody is the hover card's contents, identical wherever
//     it is raised;
//   - tooltipPosition places that card in viewport coordinates, so it
//     escapes whatever scroll box or SVG it was raised from;
//   - CourseCell/CellGrid are the rectangular card the list view uses. The
//     constellation draws its own arcs and discs instead, but raises the
//     same tooltip over them.
// ---------------------------------------------------------------------

export type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

export function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

// ---------------------------------------------------------------------
// Tooltip placement. The tooltip hangs below its cell, which clips as soon
// as the cell nears the bottom of the overlay's scroll box
// (.tab-overlay-body) — and flipping it above the cell isn't enough on its
// own, because early on that box is only a couple of hundred pixels tall
// and neither side of the cell has room inside it.
//
// So the tooltip escapes the box: it is positioned FIXED, in viewport
// coordinates, measured at the moment it is shown. It prefers to sit below
// its cell, flips above when the window has no room there, and is clamped
// into the viewport as a last resort, so it is always fully readable. Its
// content is untouched by any of this.
// ---------------------------------------------------------------------

// The gap between the cell and its tooltip, both directions. Mirrors the
// fallback offset in styles.css's .course-tooltip.
const TOOLTIP_GAP = 4;

// How close to the window edge the tooltip may sit once clamped.
const TOOLTIP_VIEWPORT_MARGIN = 8;

export interface TooltipPos { top: number; left: number }

// Where to put a tooltip of this size for a cell at this rect, in viewport
// coordinates. Below by default; above when below would run off the bottom
// and above actually fits; clamped into the window if neither does (a
// window shorter than the tooltip itself), because a tooltip overlapping
// its own cell still reads, and one running off the screen doesn't.
export function tooltipPosition(cell: DOMRect, width: number, height: number): TooltipPos {
  const below = cell.bottom + TOOLTIP_GAP;
  const above = cell.top - TOOLTIP_GAP - height;
  const maxTop = window.innerHeight - height - TOOLTIP_VIEWPORT_MARGIN;

  let top = below;
  if (below > maxTop && above >= TOOLTIP_VIEWPORT_MARGIN) top = above;
  top = Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(top, maxTop));

  const maxLeft = window.innerWidth - width - TOOLTIP_VIEWPORT_MARGIN;
  const left = Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(cell.left, maxLeft));

  return { top, left };
}

// The gate dot is a neutral marker, NOT the field's initial: which field a
// course needs is already in its tooltip, but same-field cells lighting up
// together with a letter on them would draw the eye to clusters of
// same-department courses that say nothing useful at a glance.

// A course's stored name is "CODE · Title" (see techData). Split once,
// here, because both views lead with the TITLE and keep the code as an
// eyebrow: the code still identifies the course, it just stops being the
// only thing on offer at a glance.
export function courseCodeAndTitle(t: Buildable): { code: string; title: string } {
  const [code, titleFromName] = t.name.split(' · ');
  return { code, title: titleFromName ?? code };
}

// Everything the hover card says about a course, in the order it says it:
// full name, description, prereqs (met/unmet), the faculty gate, who
// teaches it once it's done, cost/duration, and — when the course is
// revealed but refusing to start — which of cash or faculty is in the way.
//
// One component, two raisers. The card list hangs one of these under every
// cell and lets CSS show the hovered one; the constellation keeps a single
// one and moves it to whichever arc the pointer is over. Identical
// contents either way, which is the point of it living here.
export function CourseTooltipBody({ s, t, lookup }: { s: GameState; t: Buildable; lookup: Map<string, Buildable> }) {
  const state = cellState(s, t);
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));
  // Only a DONE course has an instructor to name — an available or
  // developing course hasn't been assigned a slot in the round-robin's
  // eyes yet (see facultyAssignment.ts), so implying a teacher for it
  // would be a claim the projection can't back up.
  const instructor = t.status === 'done' ? instructorOf(s, t) : undefined;
  const weeksLeft = s.developing[t.id] ?? 0;

  // Same order the build rail uses: price first, then the faculty gate.
  // `state` is derived from canStartDevelopment (see cellState above), so
  // the reason always explains the actual refusal. Kept to a fragment:
  // the cost is on the meta line right above it and the faculty line
  // above that already names the field, so the reason only has to say
  // which of the two is in the way, and by how much.
  const shortfall = t.cost - s.finance.cash;
  const blockedReason = state === 'blocked'
    ? shortfall > 0
      ? `$${Math.ceil(shortfall).toLocaleString()} short.`
      : missingFaculty
        ? `No free ${t.requiresFaculty} slot.`
        : undefined
    : undefined;

  return (
    <>
      <div className="course-tooltip-name">{t.name}</div>
      <p className="course-tooltip-desc">{t.description}</p>
      {t.prereqs.length > 0 && (
        <ul className="course-tooltip-prereqs">
          {t.prereqs.map((id) => {
            const p = lookup.get(id);
            const met = p?.status === 'done';
            return (
              <li key={id} className={met ? 'met' : 'unmet'}>
                {met ? '✓' : '✗'} {p?.name ?? id}
              </li>
            );
          })}
        </ul>
      )}
      {t.requiresFaculty && (
        <div className={`course-tooltip-faculty ${missingFaculty ? 'unmet' : 'met'}`}>
          {missingFaculty ? '✗' : '✓'} Faculty: {t.requiresFaculty}
        </div>
      )}
      {instructor && <div className="course-tooltip-instructor">Taught by: {instructor.name}</div>}
      <div className="course-tooltip-meta">
        ${t.cost.toLocaleString()} · {t.duration}w
        {state === 'developing' && ` · ${weeksLeft}w left`}
      </div>
      {blockedReason && <p className="course-tooltip-reason">{blockedReason}</p>}
    </>
  );
}

// One rectangular course card — the shape the per-school list view
// (SchoolCurriculumPanel.tsx) is built from. Fills brass when done, pulses
// while developing, and is directly clickable to start development when
// eligible.
//
// Two things are drawn ON the card rather than left to hover: the fill bar
// tracking how far a developing course has run, and a dot marking a course
// whose faculty field currently has no free slot (see CellLegend). The
// tooltip carries everything else.
export function CourseCell({ s, act, t, lookup }: { s: GameState; act: (a: Action) => void; t: Buildable; lookup: Map<string, Buildable> }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  // Measured at the moment the tooltip is about to be shown, so it uses
  // where the cell actually is right now. The tooltip is only
  // visibility:hidden until then, never display:none, so it already has
  // its real laid-out size to measure.
  const placeTooltip = useCallback(() => {
    const wrap = wrapRef.current;
    const tip = tooltipRef.current;
    if (!wrap || !tip) return;
    setPos(tooltipPosition(wrap.getBoundingClientRect(), tip.offsetWidth, tip.offsetHeight));
  }, []);

  // A fixed tooltip doesn't travel with its cell, so while one is up the
  // cell re-measures on any scroll (capture: the overlay body scrolls, not
  // the window) or resize. Only the one open tooltip listens — every other
  // cell has pos === null and registers nothing.
  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', placeTooltip, true);
    window.addEventListener('resize', placeTooltip);
    return () => {
      window.removeEventListener('scroll', placeTooltip, true);
      window.removeEventListener('resize', placeTooltip);
    };
  }, [pos, placeTooltip]);

  const state = cellState(s, t);
  const { code, title } = courseCodeAndTitle(t);
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));
  // The gate is only news while the course is still ahead of the player:
  // a developing or finished course already holds its slot.
  const showGateDot = missingFaculty && state !== 'developing' && state !== 'done';

  const weeksLeft = s.developing[t.id] ?? 0;
  const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;

  return (
    <div
      className="course-cell-wrap"
      ref={wrapRef}
      onPointerEnter={placeTooltip}
      onPointerLeave={() => setPos(null)}
      onFocus={placeTooltip}
      onBlur={() => setPos(null)}
    >
      <button
        type="button"
        className={`course-cell ${state}${t.graduateProgram ? ' graduate' : ''}`}
        disabled={state !== 'available'}
        onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
      >
        <span className="cell-code">{code}</span>
        <span className="cell-title">{title}</span>
        {state === 'done' && <span className="cell-stamp" aria-hidden="true">✓</span>}
        {showGateDot && <span className="cell-gate-dot" aria-hidden="true" />}
        {state === 'developing' && (
          <span className="cell-progress" aria-hidden="true">
            <span className="cell-progress-fill" style={{ width: `${Math.round(elapsed * 100)}%` }} />
          </span>
        )}
      </button>
      <div
        className="course-tooltip"
        role="tooltip"
        ref={tooltipRef}
        style={pos ? { position: 'fixed', top: pos.top, left: pos.left } : undefined}
      >
        <CourseTooltipBody s={s} t={t} lookup={lookup} />
      </div>
    </div>
  );
}

export function CellGrid({ s, act, ids, lookup }: { s: GameState; act: (a: Action) => void; ids: string[]; lookup: Map<string, Buildable> }) {
  return (
    <div className="cell-grid">
      {ids.map((id) => {
        const t = lookup.get(id);
        return t ? <CourseCell key={id} s={s} act={act} t={t} lookup={lookup} /> : null;
      })}
    </div>
  );
}

// The one-line key under a curriculum view's head. It explains the four
// cell states and the faculty-gate dot in the same breath, so the two
// things the player would otherwise have to hover for — what a shade
// means, and why a course won't start — are both answered on sight. Shared
// because the constellation colours its arcs with the same four shades the
// card list fills its cells with.
export function CellLegend() {
  return (
    <p className="cell-legend">
      <span className="cell-legend-item"><span className="cell-legend-swatch done" />done</span>
      <span className="cell-legend-item"><span className="cell-legend-swatch developing" />developing</span>
      <span className="cell-legend-item"><span className="cell-legend-swatch available" />ready to start</span>
      <span className="cell-legend-item"><span className="cell-legend-swatch blocked" />blocked</span>
      <span className="cell-legend-item"><span className="cell-legend-dot" />no free faculty slot in its field — hire to start it</span>
    </p>
  );
}

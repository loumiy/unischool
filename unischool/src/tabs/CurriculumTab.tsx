import { useEffect } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { revealedGraduatePrograms, visibleCourseIds } from './curriculumData';
import CurriculumConstellation from '../components/CurriculumConstellation';
import { CellLegend } from '../components/courseCells';
import { useHotkeys } from '../components/hotkeys';
import { ProgressRing } from '../components/Progress';
import { isTestUniversity } from '../components/StatusHeader';

// THE CURRICULUM, FULL SCREEN. Alone among the tabs, this one is not a
// sheet over the campus map — it is a place you go, laid out exactly like
// the map itself: a full-viewport canvas you drag and zoom, the bottom
// toolbar still over it, and its chrome floating in the same two corners
// the map's does (a card top-left where the building inspector sits, a
// zoom pill top-right under the hamburger). A pan-and-zoom view of four
// hundred courses inside a 1180px sheet was a map read through a letterbox.
//
// What it draws is CurriculumConstellation.tsx: the SHAPE of the whole
// catalogue, which is what a view covering all of it should show. The card
// list this tab used to be still exists, unchanged, but it answers a
// narrower question ("what does the School of Business teach?") and so it
// moved to where that question is asked — clicking that school's building
// on the campus map (see SchoolCurriculumPanel.tsx).
const CATALOG_RING_SIZE = 44;

export default function CurriculumTab({ s, act, onClose }: {
  s: GameState;
  act: (a: Action) => void;
  onClose: () => void;
}) {
  // Escape leaves, the same as it dismisses any other view over the map.
  // App.tsx keeps the map's own hotkeys switched off for as long as this is
  // open (see mapHotkeysEnabled), so only one of the two is ever listening.
  useHotkeys((e) => {
    if (e.key === 'Escape') onClose();
  });

  const revealedGrad = revealedGraduatePrograms(s);
  // The headline ring counts the undergraduate catalogue plus whatever
  // graduate work has been revealed — never the whole seed. A "0 / 421"
  // in year one would announce that thirty-seven courses exist somewhere
  // the player has no way to see, which is precisely what progressive
  // discovery is for.
  const courses = s.tech.filter(
    (t) => t.kind === 'course' && (!t.graduateProgram || revealedGrad.has(t.graduateProgram)),
  );
  const doneCourses = courses.filter((t) => t.status === 'done').length;
  const catalogFraction = courses.length > 0 ? doneCourses / courses.length : 0;
  const catalogPct = Math.round(catalogFraction * 100);

  // The curriculum alert badge (see types.ts's SeenState): every currently
  // visible course id this view hasn't reported seeing yet. Marked the
  // moment it is open, and again whenever a fresh reveal (a school built,
  // gen-ed cleared) adds to the visible set while it stays open — the
  // dependency is the exact unseen id set, so this fires again on any
  // change to it, not just a change in count. That's what makes "already
  // had curriculum open when new courses unlocked" show no badge: the
  // toolbar and this view agree the instant this runs.
  const unseenIds = visibleCourseIds(s).filter((id) => !s.seen.courseIds[id]);
  const unseenKey = unseenIds.join('|');
  useEffect(() => {
    if (unseenIds.length > 0) act({ type: 'MARK_SEEN', kind: 'course', ids: unseenIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey]);

  return (
    <div className="curriculum-screen">
      <CurriculumConstellation s={s} act={act} />

      {/* The one card, in the corner the map keeps its building inspector
          in — what this view is, how far the catalogue has got, and what
          the colours on it mean. */}
      <div className="curriculum-screen-head">
        <div className="curriculum-screen-title">
          <h2>The Curriculum</h2>
          {isTestUniversity(s.self.name) && (
            <button
              type="button"
              className="grant-funds-btn"
              onClick={() => act({ type: 'DEVELOP_ALL_AVAILABLE_COURSES' })}
              title="Playtest only — starts development on every course currently available, cash and faculty slots permitting. Same effect as clicking each one's own Develop button."
            >
              Develop All
            </button>
          )}
          <button type="button" className="curriculum-screen-close" onClick={onClose} aria-label="Close the curriculum">
            close ✕
          </button>
        </div>
        <span className="progress-figure">
          <ProgressRing
            fraction={catalogFraction}
            size={CATALOG_RING_SIZE}
            center={`${catalogPct}%`}
            title={`${doneCourses} of ${courses.length} courses developed`}
          />
          <span className="stat">{doneCourses} / {courses.length}<br />developed</span>
        </span>
        <CellLegend />
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the school is running an operating deficit, so nothing can be started until the balance recovers.</p>
        )}
      </div>
    </div>
  );
}

# Plan 93 — Icons picked from Lucide

*Planning document only. Its job is to record the owner's pick, icon by
icon, between the game's drawn icons and Lucide's (October 2026).*

**Status: Landed.** One PR.

The owner asked whether to use an icon library instead of drawing every
glyph. A side-by-side study, then a picker with every icon's drawn version
and two to four Lucide candidates, let the owner choose each one.

**As implemented:**
- 24 icons are now Lucide's, at the game's 1.6 line: Campus (school),
  Curriculum (book-open), Research (atom), Athletics (volleyball), History
  (history), Inbox (inbox), Build (wrench), Rank (award), Prestige (star),
  Satisfaction (smile), Student life (heart), Housing (bed-double),
  Dining (utensils-crossed), Library (library-big), Lab (flask-conical),
  Health (heart-pulse), Arts (palette), Quad (land-plot), Erase path
  (eraser), Map tools (layers),
  Turn view (rotate-cw), Remove (trash-2), Release (log-out), and the done
  mark (check).
- 15 stay drawn: Faculty, Students, Academic, the five speed gears (Lucide
  has no 4× or 8×), Fitness, Trees, Draw path, Close, Disclosure, Menu and
  the activity log. The build menu's Grounds tab now wears the drawn
  tree of the Plant trees tool; its own icon (a wrench, then Lucide's
  settings gear, picked from a mislabelled row) is gone.
- The shapes are copied into `icons.tsx` under the same component names, so
  no caller changed and no package was added. Lucide's licence (ISC, with
  MIT for its Feather-derived icons) sits beside the file.
- Release, Remove and Turn view keep the heavier line their small buttons
  had; the done mark keeps its own, and its pending and failed marks stay
  drawn.

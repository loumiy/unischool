# Plan 122 — The Ginger playtest

*The owner's notes from Ginger's playtest (2 November 2026): the welcome
letter's name, an objectives drawer that gets in the way, stray text
selection, a completion line, off-centre doors, three chapters that close
or open at the wrong moment, the Curriculum's batch button, and "+80
places".*

**Status: Proposed.**

---

## 0. What stands today

- **The welcome.** Both welcomes say `Welcome to ${s.self.name}`, the bare
  name ("Halifax"): the coach card (`data/openingData.ts`, `welcome`) and
  the first letter (`data/eventData.ts`, `doors-open`).
  `institutionName(s.self)` (`state/types.ts`) already gives "Halifax
  College", and later "Halifax University".
- **The objectives drawer** is a `ToolbarPopup` at `left: 16px`, above the
  ticker (`styles.css`, `.objectives-popup`). Its chip sits in the middle of
  the ticker, after the log line (`LogTicker.tsx`). The bottom right already
  holds the toasts (`.toasts`) and the summer's note (`.summer-call`).
- **Text selection.** Nothing sets `user-select` on the shell, so a drag or
  a double-click highlights text. The downloadable build is the same page
  (`npm run build:itch`), and a desktop wrapper's webview (Electron, Tauri)
  behaves the same way. So this has to be fixed in the page itself.
- **"The builders are out of {name}."** is the third of three completion
  lines (`data/logWords.ts`, `COMPLETION_LINES.building`).
- **Doors.** `tools/review/doorsAndDepth.ts` checks a door against its
  neighbours, and checks for `door-on-seam` (a wall an even number of tiles
  long). It does not check where a motif actually draws its door. The
  Original Commons has a 3×3 footprint, so its walls are odd, and its door
  is still off centre. `diningHallArt` and the pavilion put the door at
  `hallLen / 2` (the middle of the hall's mass), not at the middle of the
  footprint, because the kitchen takes up part of the wall. The base
  Student Center (5×4) has the same problem. Other likely suspects: the
  even footprints with a door (5×4 grocery and rec centre, 7×6 and 9×6
  dining and library, 7×4 pool, 9×6 field house, 9×8, 11×8 and 13×8
  projects).
- **Chapter 6, Paying for it** (`state/chapters.ts`) is done the moment the
  Treasury opens, because its other objective is optional. The drawer moves
  straight to "next chapter coming" while the player is still reading the
  tab.
- **Chapter 7, The first summer** opens at week 46 and warns that the
  summer is coming. It is done when the first class is set.
- **Chapter 8, Standing** asks the player to open the Students tab and
  History. Opening the tab meets the objective, and then the player faces
  the whole tab (guidebooks, needs, effect on satisfaction, student body,
  funnel) with no guide.
- **The batch button.** `RowAction` (`tabs/CurriculumTab.tsx`) offers "All
  N with X → grades" when two or more courses in a band are ready.
- **"+80 places"** is `SEATS_PER_COURSE` (`instructionCapacity.ts`). It is
  a flat 80 for every course and does not change with how many courses
  there are. It shows on each program row's worth line while the program
  has a milestone to go.

## 1. The PRs

| PR | Change |
|---|---|
| A | **Words.** Both welcomes use `institutionName`. Grep `src/` for other places where the bare `s.self.name` is used as the institution's name in prose, and leave alone the ones used as a key (`Toasts.tsx`, `useAudio.ts`, `App.tsx`, the seeds). Replace "The builders are out of {name}." with "{name} is complete." |
| B | **The drawer opens from the bottom right.** Move the chip to the right end of the ticker. Anchor `.objectives-popup` at `right: 16px`, and have it grow from that corner and fold back into it, using the same short transition the popups already use. The toasts and the summer's note stack above the drawer while it is open (their `bottom` reads a CSS variable that the drawer sets), so nothing hides under it. On a phone the drawer stays full width, as now. The Milestones popup stays on the left. |
| C | **No stray selection.** Set `user-select: none` on `.app`, and turn it back on for `input`, `textarea`, `[contenteditable]` and anything meant to be copied (the save export and the crash screen's report). Check the map's drag, the admissions drag and the sliders. Add a line to the release checklist that the itch build was checked. |
| D | **Doors on a tile's centre.** (1) A new checker rule, `door-off-centre`: each door-drawing motif exports where its door is along the wall, and the checker compares that with the centre of the tile it lands on, in all four facings and every vernacular. The asset gallery (`npm run gallery:assets`) runs it over every buildable, not only the saved arrangements. (2) Fix what it finds by moving the door, not by changing footprints, so saves keep their placements. The Original Commons and the small pavilion put the door at the footprint's middle and shift the kitchen to one side. Where a wall is even, the door moves to the odd wall, or the entrance becomes two tiles wide and centred on the seam (see §2.4). The Student Center is fixed the same way. (3) Re-shoot the gallery, and check that walkers still reach the moved doors (`walkRoutes.ts`). |
| E | **A done chapter stays while its tab is open.** When the objective that completes a chapter is a tab being opened (`tabMark`), and that tab is still open, the drawer opens over the tab on that chapter, marked done (every objective ticked, and a "Chapter 6 done" line). It hands over to the next chapter when the tab closes or the player goes to another screen. This is shell state in `App.tsx` (the drawer's `objectivesView` already shows a chosen chapter over a tab, as the Guide button does), so no save change. It applies to any chapter finished this way, not just chapter 6. |
| F | **The first summer opens with the summer.** Chapter 7's `earliest` becomes week 52, and `opensWhen` becomes "the summer is waiting" (`pendingInterrupt?.type === 'summer'`), so it opens when the clock stops. The `about` text is rewritten for the moment: the clock has stopped, and the note above the clock opens the summer. A college still on chapter 6 at the summer opens chapter 7 met, after chapter 6, as now. Weeks 30 to 52 show the "next chapter" line, which already names it. The "Summer is coming" letter in an unguided run stays as it is. |
| G | **A guided walk through the Students tab.** Chapter 8's `open-students` becomes "Walk through the Students tab". When the tab opens while the objective is unmet, a small card steps through the tab one section at a time. Each step scrolls to its section, rings it, and gives one or two sentences, with Back, Next and Skip. The steps: satisfaction and the five needs (which need pulls it down), the effect on satisfaction, the student body, last summer's funnel, and the guidebooks. A section the tab doesn't show yet is skipped. Finishing (or skipping, §2.2) meets the objective, and the drawer then shows what is left (History). The card reuses `OpeningCoach`'s look. The walk's position is shell state, and the objective is a mark (`MARK_GUIDANCE`), like the tab marks. The words go in `data/chapterData.ts`. |
| H | **No batch button.** Remove the "All N with X" button and the batch calculation from `RowAction`. The comment above it, the Curriculum's help text and `docs/design/curriculum.md` lose it too. |
| I | **"+80 places", said plainly.** The worth line reads "· room for 80 more students" (the figure is still `SEATS_PER_COURSE`). The course drawer and the hall panel's "Teaching: N places" use the same words, so the game has one term for this. |

PRs A, C and H are small and independent. B goes before E and G, since
both put the drawer over a tab. D is the largest and stands alone.

## 2. Open questions

1. **The drawer and the toasts (B).** Proposed: the toasts and the
   summer's note move up above the open drawer. The alternative is a
   shorter drawer (`max-height` down from 60vh) with the toasts left
   where they are.
2. **Skipping the walk (G).** Proposed: Skip counts as done, since the
   walk exists to orient the player, not to test them. And should History
   (the same chapter) get its own short walk, or is the Students tab
   enough for now? Should the walk come back later for the Treasury or
   Faculty tabs?
3. **The wording for "+80 places" (I).** "Room for 80 more students", or
   drop it from the row and leave it in the course drawer only?
4. **An even wall (D).** Move the door to the odd wall (the front changes
   side), or draw a two-tile entrance centred on the seam (the front
   stays where it is)? Proposed: the two-tile entrance for the larger
   halls, and moving the door for the small ones.
5. **The completion line (A).** "{name} is complete." or "{name} is
   completed." as written in the note?

## 3. Not changing

- Developing more programs after English (the owner: she got there quickly
  enough).

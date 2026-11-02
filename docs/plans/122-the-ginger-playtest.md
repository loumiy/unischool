# Plan 122 — The Ginger playtest

*The owner's notes from Ginger's playtest (2 November 2026): the welcome
letter's name, an objectives drawer that gets in the way, stray text
selection, a completion line, off-centre doors, three chapters that close
or open at the wrong moment, the Curriculum's batch button, and "+80
places". The owner's answers to §2 the same day are folded in.*

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
| B | **The drawer opens from the bottom right.** Move the chip to the right end of the ticker. Anchor `.objectives-popup` at `right: 16px`, and have it grow from that corner and fold back into it, using the same short transition the popups already use. The toasts and the summer's note move to the bottom left for good (§2.1), so nothing hides under the drawer. On a phone the drawer stays full width, as now. The Milestones popup stays on the left. |
| C | **No stray selection.** Set `user-select: none` on `.app`, and turn it back on for `input`, `textarea`, `[contenteditable]` and anything meant to be copied (the save export and the crash screen's report). Check the map's drag, the admissions drag and the sliders. Add a line to the release checklist that the itch build was checked. |
| D | **Every door on a tile's centre**, so a one-tile path drawn straight out meets it (the owner: no two-tile entrances). The rule: a door is one tile wide, on a wall an odd number of tiles long, centred on that wall's middle tile. (1) A new checker rule, `door-off-centre`: each door-drawing motif exports where its door is along the wall, and the checker compares that with the centre of the tile it lands on, in all four facings and every vernacular. `door-on-seam` becomes an error, not a note. The asset gallery (`npm run gallery:assets`) runs both over every buildable, not only the saved arrangements. (2) Fix what they find. The Original Commons and the small pavilion put the door in the middle of the footprint and move the kitchen to one side. The Student Center is fixed the same way. A door on an even wall moves to the odd wall of the same footprint (every even footprint with a door has one: 5×4, 7×4, 7×6, 9×6, 9×8, 11×8, 13×8). Only where that would put the front somewhere wrong does the footprint change to odd dimensions. Each such change is listed in the PR, and an old save keeps the building's old footprint where it stands (§2.4). (3) Re-shoot the gallery, and check that walkers still reach the moved doors (`walkRoutes.ts`). |
| E | **A done chapter stays while its tab is open.** When the objective that completes a chapter is met inside a tab (a tab opened, or since G a tab's walk finished), and that tab is still open, the drawer opens over the tab on that chapter, marked done (every objective ticked, and a "Chapter 6 done" line). It hands over to the next chapter when the tab closes or the player goes to another screen. This is shell state in `App.tsx` (the drawer's `objectivesView` already shows a chosen chapter over a tab, as the Guide button does), so no save change. It applies to any chapter finished this way, not just chapter 6. |
| F | **The first summer opens with the summer.** Chapter 7's `earliest` becomes week 52, and `opensWhen` becomes "the summer is waiting" (`pendingInterrupt?.type === 'summer'`), so it opens when the clock stops. The `about` text is rewritten for the moment: the clock has stopped, and the note above the clock opens the summer. A college still on chapter 6 at the summer opens chapter 7 met, after chapter 6, as now. Weeks 30 to 52 show the "next chapter" line, which already names it. The "Summer is coming" letter in an unguided run stays as it is. |
| G | **Short guided walks through four tabs.** Each "Open the X tab" objective becomes "Walk through the X tab": the Treasury (chapter 6), Students and History (chapter 8) and Faculty (chapter 9). When the tab opens while its objective is unmet, a small card steps through the tab one section at a time. Each step scrolls to its section, rings it, and gives one or two sentences, with Back, Next and Skip. Finishing or skipping meets the objective (the owner). A section the tab doesn't show yet is left out. The walks: **Treasury**: the cash and the week's net, income, costs, and the board's rating. **Students**: satisfaction and the five needs (which need pulls it down), the effect on satisfaction, the student body, last summer's funnel, and the guidebooks. **History**: prestige and where it is heading, the four pillars, and the rankings. **Faculty**: a professor's teaching and research grades, the market, and a search. Each walk is three to five steps. One component (`TabWalk.tsx`) in `OpeningCoach`'s look, with the steps as data in `data/chapterData.ts`. The walk's position is shell state, and the objective is a mark (`MARK_GUIDANCE`), like the tab marks today. A save that already met an "open the tab" objective keeps it met. A tab's Guide button can replay its walk. |
| H | **No batch button.** Remove the "All N with X" button and the batch calculation from `RowAction`. The comment above it, the Curriculum's help text and `docs/design/curriculum.md` lose it too. |
| I | **No "+80 places" on the program row** (the owner). The worth line keeps the milestone and drops the places. A course's places stay in the course drawer and the hall panel's "Teaching: N places". |

| J | **A path to the road, drawn by the player** (the owner, 2 November, added during the work). The game no longer lays Founders Hall's drive in a guided founding. Every founding opens with a walk along the road: the last row of land, paved across the parcel, with its trees cleared. The walkthrough gets a new step two after the hall is sited, "A path to the road". It holds the clock until a path joins the hall to the walk, and rings Paths in the build menu's Grounds tab. The founding chapter gets the same objective, so a run that skipped the walkthrough is asked for it in the drawer. |

**J, as implemented:** `state/drive.ts` gains `laySidewalk` and `SIDEWALK_ROW`, and `pathsFromFounders` and `besideTiles` move there from `chapters.ts`, which re-exports them. That way `opening.ts` can read them without an import cycle. A headless founding (the harness, the tests) keeps its drive. Path actions now settle the walkthrough. When Paths is picked on the path step, the build menu folds away and the tool stays in hand, so the ground down to the road can be seen. A path that touches the walk diagonally counts as joined, the same rule Somewhere to sleep uses.

PRs A, C and H are small and independent. B goes before E and G, since
both put the drawer over a tab. D is the largest and stands alone.

## 2. Open questions

1. **The drawer and the toasts (B).** *Decided (the owner, from two
   mockups): they move to the bottom left for good,* where the drawer
   used to be. The other mockup had them stacking above the open drawer
   in the bottom right. The drawer's height drops from 60vh to 52vh
   either way. (A shorter drawer with the toasts left where they are was
   proposed first and dropped, since the two would overlap.)
2. **Skipping the walk (G).** *Decided:* Skip counts as done. History,
   the Treasury and Faculty get short walks too.
3. **"+80 places" (I).** *Decided:* off the program row.
4. **An even wall (D).** *Decided:* no two-tile entrances. Every door is
   one tile, centred on a tile. Still to settle, PR by PR: whether an old
   save's building whose footprint changes keeps the old footprint where
   it stands (proposed) or is re-sited.
5. **The completion line (A).** *Decided:* "{name} is complete." 

## 3. Not changing

- Developing more programs after English (the owner: she got there quickly
  enough).

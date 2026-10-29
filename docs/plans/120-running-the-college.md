# Plan 120 — Running the college

*The owner's decisions (28 October 2026) on F13, F11 and F10: Deans who
pick the best professor for each course, paths and paving painted by
line or area, and a second specialization building for seven
distinguished schools. Part of 0.2.0 (see
[Plan 118](118-0-2-0-fixes-and-words.md)).*

**Status: Landed (29 October 2026), on `claude/stoic-ride-wge7g3`.**

- **A, as implemented:** the policy is gone (`seatData.ts`'s
  `RETIRED_STAFFING_POLICY`; a save on it loads on the default, and keeps
  its seat). `seats.ts`'s `staffSchool` runs each week for every Dean and
  for the Provost, over the schools with no Dean. In order: an empty course
  gets the best free professor in its field; a course under the top band
  gets a free professor a band better, weakest first; then two courses
  swap professors when the pair gains a band and their scores rise. Scores
  are linear in teaching, so a swap pays only where one course wasted a
  prize-winner's surplus above 100. A band's gain is the line, so nothing
  is undone the week after. A course moved or swapped by hand is left
  alone for 52 weeks (`staffedByHand`, kept on load), and its drawer says
  so. The Administration panel says what a held Dean or Provost staffs.
  The harness's players leave a covered course to the seat. Sim, seeds
  1–3: the academics standing at Year 50 is about the same as before
  (Guided 103–108 before, 102–103 after; Completionist 106–108 before, 107–108 after), since
  the harness already tended its teaching by hand.
- **B, as implemented:** Shift and drag already laid a straight line
  (Plan 104), so the drag stays freehand. Ctrl (⌘ on a Mac) and drag
  fills a rectangle, and the right button's stroke lifts paths by line or
  rectangle the same way. The shape moves with the pointer and puts back
  what it leaves, and it skips water and the tiles under a building
  (`components/pathStroke.ts`). Paths are free, so there is no cost to
  preview. The laid tiles are the preview.
- **C, as implemented:** *Every school distinguished* opens no office
  (five offices now, and an older save keeps a sixth it held). The week
  after, the board asks which building, once (`eventSystem.ts`'s
  `fireSecondBuilding`), offering the three the specialization doesn't
  have (all four for an unspecialized college). The answer is
  `s.secondBuilding`. It opens that pillar's capital project, and its works
  run: training, the park's boost, the complex's flagships, recruiting
  and edge, or the downtown's growth and festivals. The specialization's
  term and its speed-ups stay the specialization's alone. The complex's
  edge comes off the unspecialized stage edge: 1, 1 and 6.
- **D, as implemented:** the milestone's letter and the ladder say what it
  opens. The Dean's and Provost's blurbs say what they staff.

---

## 0. What stands today

- **Staffing.** A Dean or the Provost reassigns teachers only on the policy
  "Staff the weakest courses first", which is not the default
  (`seatData.ts`). With a Provost, the Deans stop staffing, and if the
  Provost isn't on that policy nobody staffs. Only a professor with a free
  slot is moved, never swapped, and only for a full band's gain
  (`seats.ts`'s `staffForTheA`). An empty course is filled only by the
  Deans' yearly recommendation (`restaffing.ts`). F13: "very tedious to
  change them, and hurts my grade."
- **Painting the ground.** Paths and paving are laid one tile per click or
  drag. F11: "Having to paint ground tiles by hand is excruciating and it
  leads to many errors."
- **Seven distinguished schools** earns one more office in Founders Hall.
  F10: "by time you reach that those offices aren't really worth much. I
  think the better reward would be unlocking a second specialization
  building."

## 1. The PRs

| PR | Change |
|---|---|
| A | **Deans run their school's teaching.** Staffing is what a Dean does, not a policy: the policy is retired, and old saves on it load to the default. Each week each Dean puts the best available professor on each of the school's courses. That includes swapping two professors when the pair does better, and filling an empty course from staff already hired. The Provost staffs only schools with no Dean. A Dean never hires or dismisses, and never moves a program between halls. A course the player staffs by hand is left alone for a year. The week's moves are one log line, as now. |
| B | **Paint by line or area.** With the path or paving tool, a drag lays a straight line, and with a modifier (Shift) a filled rectangle. A preview shows the tiles and the cost before release. Tiles that can't take paving are skipped, and the preview shows which. |
| C | **A second specialization building.** Seven distinguished schools open a second specialization's building: the Faculty Training Institute, the Research Park, the Athletic Performance Complex, or student life's downtown district. The player picks one at the milestone. **Effects only** (the owner): the building does what it does (training, Landmark work, recruiting and the stage edge), but the second pillar's specialization share does not fill. The specialization stays one choice. The office the milestone gave today is kept or moved, per §2. |
| D | **Words.** The milestone's letter and the ladder say what it opens. The Administration panel loses the staffing policy and says what a Dean does. |

## 2. Open questions

*Decided (the owner, 28 October 2026): all three as proposed.*

1. **The milestone's office.** Proposed: drop it, since the building is the
   reward and the office was the complaint.
2. **The Athletic Performance Complex as a second building** lifts the stage
   edge only for a specialized college today (`playoffs.ts`'s
   `stageEdge`). With effects only, does its edge apply to an
   unspecialized-in-athletics college? Proposed: yes, its own edge
   (+3 and +4) without the specialist's share. Plan 121's targets are set
   with and without it.
3. **The sim** checks that Deans who staff lift late-game teaching without
   making the Faculty tab pointless. Proposed: the harness's players stop
   reassigning by hand once a Dean is seated.

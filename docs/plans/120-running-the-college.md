# Plan 120 — Running the college

*The owner's decisions (28 October 2026) on F13, F11 and F10: Deans who
pick the best professor for each course, paths and paving painted by
line or area, and a second specialization building for seven
distinguished schools. Part of 0.2.0 (see
[Plan 118](118-0-2-0-fixes-and-words.md)).*

**Status: Proposed (28 October 2026).**

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

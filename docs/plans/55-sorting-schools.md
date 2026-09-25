# Plan 55 — Sorting schools

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

Plan 51 housed graduate programs in capital projects, so the chain's second
hall for each school became room to spare. The owner asked for two things:

- **Shrink the chain (option A).** Seven purchased halls, one a school.
- **Rethink the letters.** The old second letter said a school is a hall of
  your own, which was true but no help: it never said that programs can be
  moved, and should be. The intended line of play is to **start with mixed
  programs, then move them into halls of their own until every program is
  housed in its own school and no hall is mixed.** The letters should teach
  that in steps a new player can actually take.

The owner then answered the proposal's three questions:

1. A move out of Founders Hall is **four weeks** dark, not twelve.
2. The finished campus has Founders Hall **empty**.
3. "Science · 3 of 6" on the hall's map label and panel: **yes, go ahead**.

## 1. The PR

- **Seven purchased halls** (`techData.ts`): Elm, Oak, Linden, Maple,
  Chestnut, Sycamore, Cedar, at the same costs as before ($750k × 1.3ⁿ, so
  Cedar is $3.62M). Founders Hall plus seven makes eight; seven schools of
  six majors fill the seven, and Founders Hall ends empty.
- **Four-week moves out of Founders Hall** (`techSystem.ts`):
  `FOUNDERS_MOVE_WEEKS = 4` beside `RELOCATION_WEEKS = 12`, and
  `relocationWeeks(s, programId)` says which applies. The move panel, the
  log line and the suggested move all read it.
- **The sorting readings** (`systems/techtree/schools.ts`), read and never
  stored:

  | Reading | What it says |
  |---|---|
  | `claimedSchool` | the school a purchased hall is on its way to: every program in it, settled or arriving, is that school's |
  | `schoolHall` | a school's own hall, if it has one |
  | `programsAwayFromHome` | majors in Founders Hall or a mixed hall |
  | `nextSchoolToMove` | of the schools with no hall, the one with the most programs away from home |
  | `suggestedMove` | a free slot in the program's school's hall, or, for the next school to move, an empty hall |

- **Letters that wait on the college** (`eventData.ts`, `eventSystem.ts`).
  A letter may carry `arrives(s)` in place of its week: it comes on the first
  quiet week that holds, in any year, and one whose ask was already done is
  recorded read and never sent. Asks are now `ask(s) → { text, go, hallId }`,
  so a letter can name the program and the hall. The set:

  | Letter | Due | Ask |
  |---|---|---|
  | The doors open | week 1 | Found a fourth program in Founders Hall |
  | **A hall of its own** | Elm Hall opens (eight courses) | Site Elm Hall |
  | Somewhere to sleep, somewhere to eat | week 9 | Site a residence hall and a dining hall |
  | Summer is coming | week 48 | Summer at week 52: the price locks for four years |
  | **Moving in** | Elm Hall stands | Move *Mathematics* into Elm Hall (the next school's first program; four weeks dark) |
  | **A school takes shape** | a hall is claimed | Grow *Science* to three programs in Elm Hall |
  | **A second school** | a school has three and Oak Hall opens | Site Oak Hall, then move the next school's program into it |

  After the last, the school-founded milestone celebrates each school.
- **The next-step line** (`nextStep.ts`): past year one a waiting letter's
  ask comes first, then a possible move ("Psychology could move to Elm Hall,
  which teaches Science"; "Elm Hall stands empty: move Mathematics into it
  and Science has a hall of its own"), then a free slot, where an offer
  whose school has a hall goes to that hall ("Elm Hall has room for Physics,
  on offer — it teaches Science") and anything else to Founders Hall; when
  only a school's hall has room: "Founders Hall is full; Elm Hall has room
  for Science when one is on offer".
- **The hall** (`BuildingInfoPanel.tsx`, `campusLayout.ts`): a claimed
  hall's map label reads "Elm Hall · Science · 3 of 6" and its panel "Science
  · 3 of 6 — six found the School of Science"; Founders Hall's panel says it
  is where programs begin; a picked offer whose school has a hall elsewhere
  says so. A program tile with a suggested move shows an arrow, and its
  summary a one-click "Move to Elm Hall (Science) · 4 weeks".
- **Save 77**, carried from 76: the unbuilt rungs past Cedar Hall leave the
  save; a sited one stays, with its slots and programs.
- **Tests**: `test/sorting.test.ts` (new) pins the chain, the move lengths,
  the readings, the next-step lines and the four letters in order;
  `test/opening.test.ts` splits calendar letters from waiting ones;
  `test/save-load.test.ts` carries a 76 save.

**As implemented:**

- The old second letter (*One school, or a building of your own*, week 5)
  is gone; *A hall of its own* takes its place and arrives with the hall
  rather than before it. A guided game that develops the fourth program's
  course and one more reaches eight courses in year one, so the letter
  normally comes in the first year.
- A letter that waits on the college keeps the toolbar's line after year
  one until its ask is done. That is deliberate: it is the line of play.
- The harness (`sim/`) still sites halls by its own rules and never
  relocates; the owner means to rebuild it from scratch, so it was not
  taught to sort.

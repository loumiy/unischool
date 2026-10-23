# Plan 112 — The owner's notes for 0.1.4

*The owner's notes for 0.1.4 (23 October 2026), from their own play and
from Stephen at Indie Game Booster (S3): the objectives drawer cut to a
list with help behind it, the summer that waits for the player instead of
taking the screen, a guided first summer, the calendar in the year's
weeks, a more guided athletics, course milestones in the chapters, the
chair's letters folded into the walkthrough, three chapters trimmed, and
five things on the map.*

**Status: In progress.** PRs A–G are being written on
`claude/adoring-curie-jd0o05`. §3 records where the PRs landed
differently.

---

## 0. The notes

1. **Chapter 6** — it isn't clear where the Treasury opens from. Ring the
   Treasury button while the objective is open.
2. **"Why it matters"** adds text rather than helping. The objectives box
   should be the chapter number and title, the description (now under an
   unnecessary "What it is"), and the objectives, each with a circled (?)
   button. The button pops up that task's "How", with Show me in the
   popup. A simple list of tasks, help if confused, and the game takes
   them to the place and rings what to click if still confused.
3. **The summer interrupts** (S3). Being in the middle of something and
   being thrown into admissions is frustrating. Stop the clock and treat
   the summer as a "to decide" item that can't be ignored: the clock
   won't run until it is done, but the player can finish what they were
   reading first.
4. **The calendar** shows the week of the term, 1–26 twice, while the
   chapters count the year's ("summer comes at week 52"). Show 1–52.
5. **The first summer** should be guided like Founders Hall: small
   pop-ups, the sliders and buttons ringed in turn. S3 never moved the
   GPA/SAT bar; its yellow circle doesn't read as something to drag.
6. **The tuition label's** "in line with your prestige" band reads in the
   school's primary colour. Yellow showed the bargain-to-pricey gradient.
7. **"The hall"** on the admissions page could be cleaner. Mock up ideas.
8. **The Grand Quad's flowers** don't match the flower beds.
9. **The Student Center's awning** overlaps its clock (Georgian; check the
   others).
10. **The chair's letters** repeat the objectives. Fold them into the
    walkthrough; the opening letter is the walkthrough's start.
11. **Moving a program to Elm Hall** is offered in one click only on the
    Social Sciences programs; the others hide it behind "Move to another
    hall". Treat every program the same.
12. **Chapter 10**: Show me on "the first academic hall appears in the
    build menu once eight courses are taught" should open the build menu
    on Academic and ring Elm Hall.
13. **Courses get neglected.** A player busy building and hiring can go
    years without developing a course, which slows everything. Add
    milestones of N courses to the chapters.
14. **Chapter 12** (Promises) falls flat. Remove it.
15. **Chapter 13** should say plainly that the Athletic Director waits for
    a varsity team, which may take a while.
16. **Adding a story** must add one on the map, for every building that
    can.
17. **The course dots** over academic halls: the red ring (a professor
    free to teach) is common and not urgent. Ring silver for established
    and gold for distinguished.
18. **The Athletics tab** appears with the first sport club, when there
    is nothing to do in it. Open it at the varsity petition, and walk the
    player through hiring the Athletic Director, the new team's three
    staff and its venue.
19. **Chapter 15** (The long game) feels unnecessary. Remove it.
20. **Chapter 16**: "Be offered a university charter" happens by itself
    once a lab stands. Delete it.
21. **An unlocked architecture's letter** should show what its buildings
    look like.
22. **A team missing staff** should badge the Athletics tab.

## 1. The PRs

| PR | Notes | What |
|---|---|---|
| A | 1, 2, 10, 12, 13, 14, 19, 20 | The drawer: about, objectives, (?) help with Show me; chapter copy as `about` + per-objective `help`; Treasury ringed; Elm Hall ringed on Academic; "Teach N courses" objectives; Promises and The long game removed; the charter objective gone; no chair's letters in a run with chapters, their content in the chapters. |
| B | 15, 18, 22 | Athletics: the tab and the chapter open at the varsity petition; the chapter walks the petition, the Athletic Director, the team's staff and its venue, ringing each; a badge on the tab for a team short of staff. |
| C | 3, 5, 6, 7 | The summer: the clock stops and the summer waits in the inbox and on the clock; the first summer coached control by control; a draggable handle on the GPA/SAT bar; yellow for "in line"; mock-ups of the hall section (not built). |
| D | 8, 9, 16, 17, 21 | The map: the quad's flowers drawn as the beds'; the awning clear of the clock; a storey drawn per storey; course dots ringed silver and gold; the unlock letter's buildings. |
| E | 4 | The calendar page counts 1–52. |
| F | 11 | Every program's tile lists its moves in the open, one button per hall with room. |

## 2. Decisions taken without asking

- **Course milestones** are required objectives in three chapters, each a
  little under what a guided run teaches at that point, so a player who
  keeps the committee busy meets them on the way and one who doesn't is
  held there.
- **The letters** stay for a run with chapters Off: with no chapters they
  are the only guidance left.
- **The hall section** is mocked up, not built: the owner picks.

## 3. As implemented

*(Filled in as the PRs land.)*

- **E:** the code had drifted from `docs/architecture/ui-shell.md`, which
  already said the page shows the week of the year.
- **F:** `suggestedMove` stays in `schools.ts` for the tests and the
  scenario tools; the tile no longer reads it.

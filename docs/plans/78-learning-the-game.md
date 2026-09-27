# Plan 78 — The game teaches itself, from the review's area 3

*Planning document only. Its job is to turn the owner's ask on area 3 of
the October review into PRs, now that the inbox (Plan 77) has landed.*

**Status: Proposed.** A is this plan (#232).

---

## 0. The owner's ask

Area 3 ([`3-intuitive-gameplay.md`](../reviews/2026-10-game-review/3-intuitive-gameplay.md))
asks whether the game teaches itself. It has seven findings (A3-1 to A3-7),
nine problem traces and a note on the charter. The review was written
before the inbox. The owner asked for three things:
- merge the inbox with Plan 76's fixes (done:
  [#227](https://github.com/loumiy/unischool/pull/227));
- then weigh every area-3 critique against it: what still needs fixing,
  what the change already addressed, and what new concerns it raises
  within area 3's scope;
- then make a plan from that.

The evaluation rests on:
- the merged code (`main` at 53f4e21), read item by item;
- a replay of the review's first-year session on the merged game, from the
  title screen through the week-9 letter, with `tools/review/drive.mjs`
  at 1440×900.

## 1. The evaluation

### 1a. Already addressed

| Item | By | Now |
|---|---|---|
| A3-3, "0 weeks to answer" (and G7-19) | Plan 77 | A matter's row reads "Final week" in its last week. |
| A3-7, stacked notes fall behind the dock | Plan 77 | The note stack is gone; notes are inbox letters, announced by an arrival with Open. |
| A3-6, "4 weeks dark, and the last school sorted keeps this one" | Plan 76F | "closed for 4 weeks on the way, and the last school without a hall of its own keeps this one". |
| A3-6, "Committee 0 of 4 seats" | Plan 76F (partly) | "writing 0 of 4"; the empty boxes still say "Open". |
| Session: "A hall of its own" states a stale price | Plan 76C | The letter reads the hall's own cost and weeks. |
| A3-3, the panel steps aside while a tab is open | Plan 77 | Matters wait in the inbox; the toolbar's Inbox button counts them and turns red in the last week, and NEXT says when one lapses this week. |

### 1b. Changed by the inbox, still to fix

- **A3-3: events still pass unseen**, now less often.
  - The countdown still runs while any tab is open, and while the inbox
    itself is open. The clock stops only for a stop (an interrupt) or the
    walkthrough.
  - A matter still gets 10 to 15 seconds at 1× when it arrives while the
    player reads a tab. The arrival notice with Open lasts 8 seconds and
    doesn't show while the inbox is open.
  - Plan 77 B's "Pause when a matter arrives" setting was proposed, not
    built.
- **A3-4: year one is quiet, and quieter than before.**
  - There is still no NEXT line between letters in year one.
  - Satisfaction fell from 70 to 53 by week 9 in the replay, and the
    Students tab (the breakdown) still opens at the first commencement.
  - The founding notes and milestones that used to sit on the map in year
    one are now a gold dot on the Inbox button and an 8-second notice. The
    first year's guidance moved into a tab.

### 1c. Still open, as the review found them

- **A3-1: the second hall can deadlock a new player.**
  - A claimed hall's "+" offers the global three.
  - There is no decline.
  - Nothing warns when another school's program would take a claimed
    hall's program slot.
  - The offers change only when a program is founded: the weekly refill
    returns at once while three stand.
- **A3-2: the NEXT line opens the wrong panel.** The "school takes shape"
  ask names the claimed hall and opens it even when the step is a move. A
  wait says nothing about what it waits for.
- **A3-5: the chips don't lead to their explanations.**
  - The prestige, rank and satisfaction chips have no click.
  - The summer Review lists each prestige term without the line that says
    what moves it.
  - History, which holds those lines, opens at the first commencement.
  - The chips' words are hidden labels, shown only on hover (the session's
    "unlabeled chips").
- **A3-6: jargon in the first minutes**, the rest of it:
  - the committee's empty boxes say "Open";
  - the grade chips beside counts ("8 / 378 developed B") have no label;
  - a red "!" sits on every Build category with no key.
  
  Two first-year letters also still say "rooms", and "Moving in" says
  "weeks dark", against Plan 47's glossary.
- **A3-7: smaller doubts**, the rest of them:
  - the coach card is pinned top-center, over the hall wherever the
    player places it there;
  - a greyed course cell gives no reason on hover;
  - the first professor's salary isn't shown at founding (still true in
    the replay: "Dr. Elena Novak, Associate · Psychology");
  - the admissions default opens at last year's rate without saying why;
  - "overcrowding +312%" has no direction;
  - "The class of 1" reads as a count.
- **The session's other doubts:**
  - the summer Review's "Curriculum breadth +0.0 of 50" says nothing about
    what moves it (A3-5);
  - the admissions beat is the first place that sets students against beds
    ("688 students next year, for 350 beds"); the week-9 letter says beds
    are "not a cap" but gives no figure.
- **The charter:** still granted silently, with a rename and a log line.
  The founding form still drops "University" without a caption. Under the
  inbox the rename is not even a bulletin, since its log line has no
  subject.

The traces: 1 (raise prestige) and 9 (rank stalling) are **with effort**
until A3-5; 3 (basic needs in year one) is **no** until A3-4; 7 (the
split-school trap) is **no** until A3-1 and A3-2. The rest were **yes** and
still are.

### 1d. New concerns the inbox raises, within area 3's scope

1. **A letter asks for something the stop won't let the player do.** The
   week-9 letter's to-do is "Site a residence hall and a dining hall", but
   while it waits Build is locked, and its card has only Continue. The
   milestone letters in the same inbox have "Open Build". After Continue,
   NEXT carries the ask, which is good, but the letter should hand the
   player straight to what it asks.
2. **The first year's guidance moved into a tab.** See A3-4 above. The
   founding notes explained the first programs as they happened; now they
   wait unread behind a dot unless the 8-second notice is caught.
3. **Two countdown labels disagree.** In a matter's last week the list
   says "Final week" and the reading pane says "1 week".
4. **The "To decide" filter counts the stop.** During a stop the filter
   reads "To decide 1", while the row sits under "The clock waits".
5. **Reading the inbox doesn't stop the clock.** The player reads the most
   in the inbox, and the countdowns keep running there. This is part of
   A3-3.

**Out of scope here:** the stops taking the full screen (research reports,
milestone celebrations) belong to area 4's A4-3, and the summer trailer
shot to area 6. The inbox makes both easier and neither is taken here.

## 2. Defaults taken where the review or the inbox leaves a choice

Each is written back into the register, Plan 47 or the design docs in the
PR that takes it. **The owner can overturn any of them before its PR
starts.**

1. **Events passing unseen (A3-3).** The review offered two fixes: hold the
   countdown while a tab is open, or pause the clock while a matter waits
   and a tab is open.
   - **Default:** build Plan 77 B's setting, "Pause when a matter
     arrives", **on by default**, and pause the clock when a matter enters
     its final week unopened.
   - Both are clock actions in the UI; neither touches the simulation. A
     player who turns the setting off keeps today's behavior, plus the
     final-week pause.
   - Holding the countdown itself would change the simulation and every
     replay, so it is not the default.
2. **The Students tab in year one (A3-4).**
   - **Default:** open the tab from the first week with the satisfaction
     breakdown and the services.
   - The guidebook, the identity tags and the clubs stay gated to the
     first commencement.
3. **History in year one (A3-5).**
   - **Default:** the prestige and rank chips open History › Standing, and
     History opens from the first week.
   - Standing shows the grade's ten terms with a line saying they are
     first graded at the first summer.
4. **The offer queue (A3-1, with A4-5's "decline an offer").**
   - **Default:** a claimed hall's "+" offers its own school's revealed
     programs, and the player may decline one offer a year, which draws a
     replacement.
   - This changes what the offer queue serves. It moves the balance and
     adds a field to the save.
5. **The charter.**
   - **Default:** the review's recommendation.
     - A caption under the founding facade when the typed name ends in
       "University".
     - The charter becomes a matter to decide in the inbox: "Become X
       University" (the default after four weeks) or "Keep the name X
       College".
     - The log line stays.

## Rules for every PR in this plan

- One branch per PR (`plan-78x-subject`), merged once `check` and `slow`
  pass.
- **Balance moves only in D.** Everywhere else `npm run sim` reads the same
  as `sim/baseline.json`. D measures its move, re-records the baseline and
  writes the move down.
- Presentation never touches the run's random stream.
- Any state-shape change ships a save migration and a version bump.
- Every PR that changes player-facing text reruns `npm run review:strings`
  and keeps its counts at or below Plan 76F's.
- Visual PRs carry screenshots at desktop and phone size, and pass
  `npm run phone` (which visits the Inbox).
- Each PR is checked by replaying the first-year session with
  `tools/review/drive.mjs`, and writes an **As implemented** note here.

## The map

| PR | Subject | Findings | Moves balance |
|---|---|---|---|
| A | This plan; the backlog notes | — | no |
| B | The first year explains itself | A3-4; new concerns 1 and 2; the beds figure | no |
| C | The chips lead to their explanations | A3-5; traces 1 and 9; the unlabeled chips | no |
| D | The move to school halls | A3-1, A3-2; A4-5's decline | yes |
| E | No decision passes unseen | A3-3; new concerns 3, 4 and 5 | no |
| F | Plain words at first use | A3-6, A3-7 | no |
| G | The charter | the charter; A3-7's "University" | no |

B, C, E, F and G can land in any order. D re-records the baseline, so it
lands on its own. B and C both touch the year-one gating in
`ladderData.ts`, so the second rebases on the first.

---

## PR 78A — The plan

This document, a row in the plans README, and the backlog note that area 3
is this plan.

## PR 78B — The first year explains itself

*A3-4, new concerns 1 and 2.*

- **The Students tab** opens from the first week with the satisfaction
  breakdown and the services (default 2).
- **NEXT in year one:** between letters, the line falls back to the
  shortfall rule ("Housing is at 38 — build for it"), as it does from year
  two (`nextStep.ts`).
- **The satisfaction chip's tooltip** names the lowest need and its figure,
  instead of the generic line.
- **A letter's ask can be acted on.** A stop whose letter asks for a
  building gets "Continue and open Build" beside Continue. A letter in the
  inbox with an ask gets the same door as the milestone letters.
- **The founding notes are not missed in year one.** The first year's
  notes open with the inbox's arrival notice held until the player opens
  or dismisses it. Later years keep the 8-second notice.
- **The week-9 letter** says the figure: how many students there are, and
  the beds and seats that serve them.
- **Checks:**
  - a test that year one's NEXT line is never empty after the walkthrough
    while a need is under 50;
  - the Students tab is available in week 1;
  - a stop with an ask carries the door.

**As implemented (#234):**

- **The Students tab** opens from the first week.
  - The ladder gates one way for every tab. A milestone opens whole tabs
    (`tabs`) or sections of a tab already open (`sections`, named
    `<tab>.<section>`). `TabNav.tsx`'s `sectionAvailable` answers for a
    section.
  - The first commencement now opens History, and in Students the
    guidebook, the clubs and chapters, and the admissions funnel. Its
    letter and "What this opens" say so.
  - The funnel is held back too, beyond the default. In year one "Last
    summer's funnel" showed the founding figures (150 applicants at 36%
    for 350 enrolled), and there was no last summer. It is one entry in
    `sections`, if the owner wants it back.
  - In year one a note stands in for the organizations: they are listed
    from the first commencement.
  - The milestone is unchanged, and only what the UI shows moved. PR C can
    move History to a section the same way.
- **NEXT in year one** falls back to the shortfall reading between
  letters. A letter's ask still wins. From year two nothing changed.
  - The guided player reads the same line. `npm run sim` did not move,
    since its year-one letter asks cover those weeks.
- **The satisfaction chip's tooltip** names the lowest of the five needs
  and its figure, from the week's breakdown that NEXT reads
  (`figureHints.ts`'s `satisfactionHint`). It drops the attrition clause
  to stay one sentence.
- **A letter's ask can be acted on.**
  - `letterOpensBuild` (inbox.ts) reads the ask's `go`: a chair's letter
    whose ask goes to the build menu, and is not done, carries the door.
    Today those are the week-9 letter and the letters that ask to site a
    hall or the Research Park.
  - Its card in the inbox's reading pane shows "Continue and open Build"
    as the primary and Continue as `btn-quiet`. The door resolves the
    letter as Continue does. `App.tsx` then opens the build menu once the
    stop is answered, in place of the view before it.
  - The chair's letters live in the inbox only while they stop the clock,
    so this card is the inbox's letter with an ask. No kept letter has an
    ask: the milestones already had "Open Build", and the founding notes
    ask for nothing.
- **Arrivals in year one:** a founding note's or a milestone's notice stays
  until it is opened or dismissed, and the news does not push it out of
  the stack. From year two it keeps the 8 seconds. Nothing arrives while
  the inbox is open, and opening the inbox now puts away the notices
  already up.
- **The week-9 letter** says "The college has 350 students, 0 beds and 0
  dining seats", read from the state as it is written.
- **Checks:**
  - `test/first-year.test.ts` plays year one on the defaults. NEXT is
    never empty while a need is under 50. It also checks the fallback, the
    letter's figures, the door on a building ask and none on a hall ask,
    the chip's hint, and the held arrivals.
  - `test/tab-gates.test.ts`: Students is available in week 1 and its
    sections are not; they open at the first commencement.
  - `opening.test.ts` and `figures.test.ts` follow the new line and hint.
- **Results:** `check` passes, `npm run sim` matches the baseline, and
  `npm run phone` passes. `review:strings` is unchanged on second person
  (40), British spellings (0) and engine words (0).
- **Screenshots:** `docs/reviews/2026-10-ui-fixes/first-year-letter-door.jpg`
  and `first-year-students-phone.jpg`.
- **Left:**
  - The door opens the build menu on its default category, not on housing
    or dining. The milestone doors do the same.
  - NEXT names academic as "Study space" while the tab and the chip say
    "Academic". That is PR F's plain-words pass.

## PR 78C — The chips lead to their explanations

*A3-5, traces 1 and 9, the session's unlabeled chips.*

- **Clickable chips:**
  - the prestige and rank chips open History › Standing;
  - the satisfaction chip opens Students › breakdown.
  
  History opens from the first week (default 3), and before the first
  summer Standing says when the grade first counts.
- **The rank chip's tooltip** says that rank follows prestige, and that
  prestige moves at the summer by at most its step.
- **The summer Review** shows each prestige term's "what moves it" line
  under the term, from the same source as History › Standing.
- **The chips carry their word:** a visible one-word label on desktop
  (rank, enrolled, prestige, satisfaction), still hidden on a phone where
  the band is folded.
- **Checks:**
  - a test that every Review term has a detail line;
  - `npm run phone`.

## PR 78D — The move to school halls

*A3-1, A3-2, A4-5's "decline an offer" (default 4). Moves the balance.*

- **A claimed hall's "+"** offers its own school's revealed programs, not
  the global three. Founders Hall and unclaimed halls keep the global
  offers.
- **Decline one offer a year:** a button on each offer, "Not this year",
  draws a replacement and marks the year used.
  - This adds an optional field to the save: a version bump and a
    migration.
- **A confirmation** before a program takes a program slot in another
  school's claimed hall: "Confirm — this takes one of the six program
  slots Social Sciences needs". This is Plan 47's ConfirmButton.
- **The NEXT line:**
  - when the step is a move, it names the program and opens the hall the
    program is in, with its move button showing ("Move Sociology into Elm
    Hall");
  - when it waits, it says for what ("…when a Social Sciences program is
    offered; founding anything draws the next offer").
- **Checks:**
  - the split-school trace (7) replayed from a scenario save reaches a
    second school without a stall;
  - the harness players take the new offers;
  - `npm run sim`, re-recorded, with the move described here.

## PR 78E — No decision passes unseen

*A3-3, new concerns 3, 4 and 5 (default 1).*

- **"Pause when a matter arrives"** in Settings, on by default. When a
  matter arrives the clock pauses and the arrival notice stays until it is
  opened or dismissed.
- **The final week:** whatever the setting, a matter that enters its final
  week without being opened pauses the clock once and pulses the Inbox
  button. A decision can take its default only after the player has had
  the chance to see it.
- **One countdown label:** the list and the reading pane both say "Final
  week" in a matter's last week.
- **The "To decide" filter** stops counting the stop, which has its own
  tier.
- The ease to 1× on arrival (Plan 35) stays for a player who turns the
  setting off.
- **Checks:**
  - a UI test that a matter arriving pauses the clock with the setting on;
  - a matter's final week pauses once with it off;
  - the harness is untouched: the pause is a UI action and the simulation
    does not change.

## PR 78F — Plain words at first use

*A3-6, A3-7, with Plan 47's glossary.*

- **The committee's empty boxes** say "Free", not "Open".
- **Grade chips beside counts** get their word ("grade B"), or a label once
  per row.
- **The Build menu's "!"** has one meaning, "something new to build here",
  explained in the menu's help. It clears when the category is opened.
- **The first-year letters** follow the glossary: "rooms" becomes program
  slots, and "weeks dark" becomes "closed for N weeks".
- **A greyed course cell's tooltip** gives the drawer's reason ("needs
  MATH 120, cross-listed").
- **The first professor's salary** shows at founding, as later hires show
  it ("Appoint · $84,317/yr").
- **The admissions default** says why it opens where it does. If the
  reason is beds: "admitting more crowds 350 beds".
- **"overcrowding +312%"** says its direction: "crowding eased".
- **"The class of 1"** becomes "the first graduating class", and later
  classes "the class of Year 3".
- **The coach card** is pinned away from the building it has just asked
  for: to the side, clear of the placed footprint.
- **Checks:**
  - `review:strings`;
  - a first-year replay with screenshots.

## PR 78G — The charter

*The charter section; A3-7's founding name (default 5).*

- **At founding:** a typed name ending in "University" keeps its first
  half, and a caption under the facade says why ("Every college opens as a
  College; the trustees grant 'University' with its first research lab").
- **At the charter:** a matter to decide in the inbox, "The charter",
  instead of a silent rename. "Become X University" is the default after
  four weeks; "Keep the name X College" is the alternative. The log line
  stays, and the Answered list keeps the choice.
- The timing (the first lab at work) is unchanged.
- **Checks:**
  - a test that keeping the name leaves it and the pennant alone;
  - the default renames as today;
  - the save gains no field unless the choice needs remembering, in which
    case it gets a version bump and a migration.

## What this plan does not do

- **The stops that take the full screen** (research reports and milestone
  celebrations as a digest) are area 4's A4-3, for its own triage.
- **A memory of event answers** and the other event systems stay in
  `BACKLOG.md`'s *Events that do what they say*.
- **The Selective archetype's restaffing** (Plan 76D) stays in the backlog.

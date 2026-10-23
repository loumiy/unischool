# Plan 116 — The late years and the happiest college

*The owner's choices on the third review's findings (23 October 2026), for
two of area 4's: C4-4 (the late game is still idle at 1×, and each new
matter takes the fast speeds away) and C4-6 (the happiest college is still
graded F and never offered its specialization). The owner took the
recommended fix for both. The findings are in
[the review's area 4](../reviews/2026-10-game-review-iii/4-strategy.md),
its tables in [4a](../reviews/2026-10-game-review-iii/4a-goal-players.md).*

**Status: Proposed.**

---

## 0. What stands today (`f7b2091`)

**C4-4, the late years.** Plans 110–112 left it as the review found it.
- *A matter pauses the clock on arrival, whatever its weeks.* With
  *Pause when a matter arrives* on (the default, `settings.ts:46`), any new
  matter to decide pauses it (`unseen.ts:71`). With the setting off, a new
  catalogue event drops 2×, 4× and 8× to 1× (`useGame.ts:153–164`, Plan 35's
  ease, from before Plan 78E's final-week pause existed). Plan 112C made the
  summer wait, but changed no matter's pause.
- *Most matters are not short of time.* An event's weeks to answer are its
  `timeoutWeeks` (`inbox.ts:269–274`). Of the catalogue's 160 events, 27
  give two weeks or less, 133 give three to six. Gifts and board asks
  (`inbox.ts:295`, `:309`) have no deadline at all. Whatever the setting, a
  matter that reaches its last week unopened already pauses the clock once
  (`unseen.ts:52–54`, `:72–77`).
- *Late arrivals are four pauses a year.* The review's probe (Guided, seed
  12345, `data/c4-pauses.md`): years 30–50, 2.1 stops and 4.0 new matters a
  year, all catalogue events. Real players stop the clock 8.3 times a year
  then and play 20 weeks of 52 at 1×, none at 4× (`play-statistics.md`).
- *The goal report counts interrupts, not pauses* (`goalPlayers.ts:259–265`,
  `:1518`). The play statistics count a stop when the speed goes to paused
  (`useGame.ts:73`), which an interrupt never does.
- *No late decision of its own.* The 95X purchases are once each. The one
  yearly ask is the festival, for a student-life college
  (`catalogueEngine.ts:146–161`).

**C4-6, the happiest college.** Untouched by Plans 110–112.
- *Never offered.* The routes are the guide's top 30, or from Year 20 a
  pillar's top 10 (`prestigeSystem.ts:156–167`; `milestone.ts:43–61`). The
  satisfaction goal holds 86–92 all run but stands #15–29 in student life:
  welfare is full at 80 (`prestigeSystem.ts:685–692`), so every big college
  earns it too, and the rest of the pillar is venues, clubs and beauty.
- *Misnamed.* With no specialization, the title takes the guidebooks' tag
  before anything else (`finalReport.ts:166–172`, `:179–190`). This college
  holds *teaching college* without earning it, so it is "a teaching college
  that never fielded a team anyone feared" in 3 runs of 3.
- *Graded F*, about 31 against a D at 34 (`reportData.ts:8–14`,
  `finalReport.ts:222`). 95U's `satisfactionLeads` (`finalReport.ts:106–109`,
  85 or more in over half the years) lifts its experience axis; nothing
  else reads it.

## 1. The PRs

| PR | Findings | What |
|---|---|---|
| A | C4-4 | The goal report counts pauses as the play statistics do, beside the interrupts. Tooling only. |
| B | C4-4 | A new matter pauses the clock, or eases it to 1×, only when it has two weeks or less to answer. The words of the rule rewritten. |
| C | C4-6 | A third route to the specialization: from Year 20, satisfaction that led the field. The title names that before a guidebook tag. |
| D | C4-4 | The board's question: one late matter a year, from Year 25, that trades one pillar for another. |

A measures B. B lands before D, so D's yearly matter is born under the new
pause rule. C and D move balance, so each one reruns the guardrails (*The guardrails*, below).

### A. Pauses in the goal report

- `sim/harness/pauses.ts` (new, pure): each week, the inbox through
  `unseenPause` on the default settings, `held` from `pendingInterrupt`;
  pauses counted by reason, and the eases to 1× the setting's Off would
  make. Two players bound it: one opens a matter only when the clock
  pauses for it, one opens every slip. Under today's rule they agree.
- `tools/review/goalPlayers.ts`: pauses beside interrupts, per year; each
  goal gains "Pauses a year, years 30–50".
- Test: `test/pause-count.test.ts` (a two-week arrival is one pause; an
  unopened matter one final-week pause; an arrival under a stop none).
- Run `npm run review:goals -- --seeds 12345,4242,777 --names Blackmoor`
  on `main` and record it: the baseline B, C and D are read against.

### B. Pause only for a matter short of time

- `src/systems/inbox/unseen.ts`: `SHORT_OF_TIME_WEEKS = 2`. The arrival
  rule (`:71`) pauses only for a new matter with `weeksLeft` at most 2.
  The final-week rule is unchanged and now catches the rest left unread.
  A matter with no deadline never pauses; its slip says it arrived.
- The ease (`useGame.ts:153–164`) moves into `unseen.ts` as a pure
  `easesOnArrival`: with the setting off, only a matter short of time
  eases the clock to 1×. `Toasts.tsx:159–161` keeps its behaviour (a
  matter's slip stays until opened while the setting is on).
- The words (Plan 95E's rule). `SettingsPanel.tsx:69–75`: the legend
  becomes "Pause for an urgent matter". The note becomes "Time pauses
  when a matter arrives with two weeks or less to answer. A matter you
  haven't opened pauses it in its last week." Build "two" from the
  constant. The settings key `pauseOnArrival` stays, so saved settings
  keep their choice. Comments rewritten in `settings.ts:20–22`,
  `useGame.ts:153–157`, `App.tsx:477–483` and the head of `unseen.ts`.
  Docs: `docs/architecture/interrupts.md:280–292`,
  `docs/architecture/ui-shell.md:63–67`, and the caption at
  `docs/design/inbox.html:415`, which still says the setting is off by
  default.
- Tests: `test/unseen.test.ts`. A three-week arrival does not pause, a
  two-week one does; the three-week one pauses in its last week unopened,
  never once opened. `easesOnArrival` eases for the two-week one only,
  never under a hold. `npm run check`, `npm run review:plain`.
- Measure with A. By the catalogue's share, late arrival pauses fall from
  about 4.0 a year to under 1 for the player who opens slips; for one who
  doesn't they become final-week pauses, after weeks at speed. The sim
  never reads the setting, so no guardrail moves.

### C. The satisfaction route, and the title

- *The rule in one place.* `satisfactionLeads` and `SATISFACTION_LEADS_AT`
  move from `state/finalReport.ts` and `reportData.ts:94` to
  `systems/prestige/` beside the routes (`prestigeSystem.ts:156–167`). The
  report imports them, so the milestone and the report read one rule.
- *The route.* `milestone.ts:49–51`'s `within` gains a third arm: from
  `SPECIALIZATION_PILLAR_YEAR`, `satisfactionLeads(s)`, its notice
  `SPECIALIZATION_NOTICE_YEARS` ahead. All four choices stay open.
- *The words.* The routes are said once, in `prestigeWords.ts:58–68`
  (`specializationOfferWhen`/`Rule`; `test/pillar-rule.test.ts` holds
  every other file to that). They become three short sentences, one route
  each, so no sentence carries the rule and its exceptions together
  (Plan 111's rules 2 and 6): "The board offers you a specialization the
  first summer your college is in the guide's top 30. From Year 20, two
  more things bring the offer. One is a top-10 place in any one pillar.
  The other is student satisfaction of 85 or more in over half your
  years." (Both later routes start at Year 20, so they share one
  sentence that says so.)
  ("Over half" is the rule as `satisfactionLeads` counts it; "most
  years" would be vague.) Then the three places that name a route:
  `specializationOfferLine` (`specializationData.ts:165–168`, the log),
  `CHOICE_WORDS.offer` (`:330–335`, the page) and `specializationNotice`
  (`:386–394`, the board's letter). Docs: `README.md:94–96`, and
  `docs/design/progression.md:270–290`. That section still says the top
  20 and never gives Plan 95R's pillar route, so it is rewritten to the
  three routes as they stand.
- *The title.* `titleTag`/`composeTitle` (`finalReport.ts:161–190`) name
  the college in this order. Its specialization first. Then a tag the
  guidebooks hold and the record earns. Then, when `satisfactionLeads`
  holds, the experience axis ("a college with a campus life to envy").
  Then an earned tag they have not caught up with, then their first tag,
  then the strongest standing. So an earned *research powerhouse* keeps
  its name, and an unearned *teaching college* gives way. Words:
  `progression.md:762–764`, and the two comments above the functions.
- Tests. `test/specialization-choice.test.ts`: at Year 20 a college whose
  satisfaction leads, outside the top 30 and every pillar's top 10, is
  offered; at Year 19 not; the notice from Year 18; at 84, never. The
  checks at `:140`, `:246` and `:427–430` name three routes.
  `test/final-report.test.ts`: a satisfaction-led college with an
  unearned *teaching college* and no specialization is "a college with a
  campus life to envy"; one with an earned tag keeps it.
- Targets (goal report): the satisfaction goal offered at Year 20 in 3 of
  3, choosing student life, its title naming its campus life. Expected
  and recorded: good-then-big (89–92 all run) is offered at 20, not 36.
  The pacing players are offered at 20 by the pillar route already;
  check they do not move.

### D. The board's question

- *What.* From Year `BOARD_QUESTION_FROM_YEAR` (25), at week
  `BOARD_QUESTION_WEEK` (20), the board puts one question a year. It is
  an inbox matter with six weeks to answer, so under B it does not pause
  on arrival. Each question trades one pillar for another, and no answer
  is "pay to make it go away", since late money no longer decides
  anything (C4-5, left as it is). Default on timeout: the answer that
  changes nothing. The three questions are §2's first decision.
- *Where.* `src/data/boardQuestionData.ts` (new): inline `CatalogueEvent`s
  in the board's domain, on existing levers where they can (`enrollment`,
  `mood`, `quality`, `closeProgram`, `endowment` with a `fund`), at most
  one new one. Raised like the festival, not drawn: `raiseBoardQuestion`
  beside `raiseFestival` (`catalogueEngine.ts:146–161`), called from
  `eventSystem.ts:303`, with a fixed instance id and the questions in turn
  by year (one it cannot name is skipped). No random draws, no place in
  the draw's queue (`drawnWaiting`, `:133–135`), never in a sandbox or
  before the matters chapter; `eventById` knows it (`catalogue.ts:611–613`).
  No seat answers it.
- *Size.* An answer is worth one to two points of prestige over five
  years, either way, scaled by `priceScale` and tuned on the harness.
- *The harness answers it* (`sim/harness/boardQuestion.ts`, new): the
  pacing players by their lead pillar, each goal player by its goal with
  a logged reason, Idle never. Otherwise the guardrails never see it.
- Words: plain words, `npm run review:plain`. Docs: the late era in
  `docs/design/economy.md:229–232` ("Defend") gains the yearly question,
  and `docs/architecture/interrupts.md:218–235` lists it beside the
  charter and the festival as the third raised event.
- Tests: `test/board-question.test.ts` (once a year from Year 25 at week
  20; never in a sandbox or before the matters chapter; in turn, skipping
  one it cannot name; a timeout changes nothing; no pause on arrival, one
  in its last week; a save round trip). `test/event-truth.test.ts` and
  `test/event-catalogue.test.ts` take the three: each does what it says.

### The guardrails (C and D, each)

Both change who is offered what and what a late college gains, so each
PR reruns them and records the figures in its **As implemented** note:
- `npm run test:all`, with `test/pillar-rule.test.ts` and
  `test/balance.test.ts` against `sim/baseline.json`. `npm run sim`
  re-writes the baseline if it moved, and the commit says why.
- `npm run natural -- --pacing`. Read its guardrail rows (teaching-blind,
  money) and the timing rows against the last card. The card is not
  refitted (C4-11, left as it is).
- `npm run review:goals -- --seeds 12345,4242,777 --names Blackmoor`.
  Compare against A's baseline: offers, choices, marks, titles, the late
  load and the pauses.
- `npm run review:sweep -- --players Natural,Completionist --seeds 1-10
  --years 50`, and `npm run review:sweep -- --fixtures --players
  Natural,Idle --years 5`.
- The design docs above, then a grep of `src/` and `docs/` for the old
  rules' words, per [README](README.md)'s second rule ("Pause when a
  matter arrives", "top 20", "of any one pillar"), listed in the note.

## 2. Decisions to take

1. **The board's three questions.** Recommended, each a pillar for a
   pillar:
   - *The expansion.* The town offers a site for more students: a larger
     body (size, breadth) at a cost in satisfaction (student life).
   - *The conditional gift.* A donor endows a named chair if you close a
     small program: endowment and the chair (academics) for breadth.
   - *The honors college.* A smaller, stronger class next summer: student
     quality for size.

   The review's third example, a rival bidding for a star professor,
   stays out. Its natural counter is a payment or a raise, which is
   C4-5's payroll lever, and the owner left that alone. Also: from Year
   25? Recommended, since the specialization comes at about 20 and the
   idle years start at 30.
2. **A route, not a heavier welfare.** The review gave two fixes: weight
   satisfaction more in the student-life pillar, or add a route.
   Recommended: the route. It changes no college's standing, so the
   rivals' pillars, the pillar rule and every other run's prestige stay
   as they are. The cost is that good-then-big is offered at Year 20.
3. **The mark is measured, not targeted.** With a specialization, the
   satisfaction goal should climb some way toward D. Recommended: record
   it and leave the grade bands alone. A college that stays small and
   happy can still earn an F, as the owner's "small stays hard" says
   (C4-10).

## 3. What this plan does not do

- **Area 4's other findings, all set to nothing:** C4-1 (one body), C4-2
  (teaching does not decide the top), C4-3 (early mistakes cost little),
  C4-5 (late money; no rival bids on payroll, no reinvestment rule), C4-7
  (the specialization is a date; C's route comes at Year 20 too), C4-8
  (the Provost's staffing policy), C4-9 (athletics chores; titles still
  stop the clock), C4-10 (small is a detour), C4-11 (the scorecard is not
  refitted), C4-12 (the complex's invariant).
- **C3-4** (a pause shown only by its toast): no new pause indicator. B
  changes when the clock pauses, not how a pause is shown.
- No other matter's weeks change, and no stop (summer, decision event,
  letter) becomes a matter or the other way round.

# Interrupts

Several features share one mechanic: **pause the clock, surface something the
player must resolve, then resume.** Rather than special-case each, there is a
single interrupt system. A system enqueues an interrupt onto `GameState`; the
game loop halts ticking while an interrupt is pending; the UI renders it as a
modal; the player resolves it by dispatching an action, which clears it and lets
the clock resume.

Everything that needs to stop time rides on this one mechanism:

- **The summer** (see [admissions.md](../design/admissions.md)'s "The
  summer") — the year's one fixed stop: **one** `summer` interrupt with a
  `beat` index in its payload (Review · Standing · Admissions · Students),
  advanced one beat per `RESOLVE_SUMMER_BEAT` with the clock still halted and
  the admissions decision carried along in the payload, and closed by the last
  beat's `RESOLVE_ADMISSIONS`, the only action that turns the page. A save
  written between beats resumes on the same beat. The annual U.S. News report
  is its Standing beat and the student-life digest its fourth; neither is an
  interrupt of its own any more. On the **fiftieth summer** the first beat is
  the **final report** in place of the year in review (the payload carries a
  `final` flag, and the beat is a page): the legacy, the ambitions, the
  founder's numbers and the fifty-year curves, read exactly as the last beat's
  `RESOLVE_ADMISSIONS` then seals them onto `self.legacy`. Play continues.
- **The rankings entry** — the one-time "you've entered the top 50" reveal,
  which keeps its own moment because entering is the event.
- **The first year's letters** — four letters from the board's chair, data in
  `src/data/eventData.ts` (`OPENING_LETTERS`), fired on the first quiet week at
  or after each one's week of year one, once each, and skippable from the
  first ("I know the way"). They yield to everything the player earned and
  outrank only the decision roll. The toolbar carries a letter's ask as its
  next-step line until it is done (`src/systems/guidance/nextStep.ts`).
- **The opening walkthrough** — not an interrupt, but the same hold on the
  clock, so it is listed here. A founding from the startup screen
  (`START_GAME` with `guided`) opens on `s.events.opening.stage = 'welcome'`
  with Founders Hall unsited, and the reducer's `TICK` is a no-op until the
  stage is `'play'` (`src/state/opening.ts`, `openingHoldsClock`).
  Five stages: the board's welcome (Next, or "I know the way", which places
  the hall where a headless founding would and stands the letters down);
  site Founders Hall (the shell opens the build menu and rings the hall's
  tile; siting it is free — `campusMap.ts`'s `sitingFeeOf`; done when the
  hall stands); "the college already teaches" (Next opens the Curriculum,
  where the three founding programs' rows are the first thing to see);
  found a fourth program (the card's door is Founders Hall's panel on the
  map, which rings its first free room; done when a fourth program is
  housed — which is also where hiring is taught, since the panel lists the
  market when nobody on the payroll teaches the field); then `'play'`,
  where `App.tsx` starts the clock. The two "done" steps are settled by
  `settleOpening` from the action that did them (`PLACE_BUILDABLE`,
  `FOUND_PROGRAM`), never by the UI. The welcome IS the first letter's
  content and the walk does its ask, so a guided founding counts that
  letter read and the letters carry on from the second on their weeks. A
  headless founding (tests, the sim, a scenario file) opens at `'play'`
  with the hall pre-placed, unchanged.
  The copy is `src/data/openingData.ts` and the card is
  `src/components/OpeningCoach.tsx`.
- **Milestone celebrations** — a stop-the-clock moment for the handful of
  genuinely special accomplishments (a program established, a program
  distinguished, a school distinguished), showing what was unlocked and what it
  did to the prestige target. Deliberately *not* fired by routine course completions: which
  milestone kinds qualify, and how close together two celebrations may land,
  are named constants in `src/data/eventData.ts`, so the frequency is a
  one-line dial. Milestones are queued (`s.events.pendingMilestones`) rather
  than fired on the spot, so a milestone landing on the admissions or report
  week is delayed to the next quiet week instead of being dropped, and a burst
  of simultaneous completions folds into a single modal.
- **Decision-interrupt events** — since Plan 32, only the questions that
  belong to a system: naming rights, Greek life, the athletic director's
  asks and the rival's passing (below). Authored as data
  (`src/data/eventData.ts`) and fired by `src/systems/events/eventSystem.ts`
  on a weighted draw across whatever the state makes eligible. Their effects
  route through hooks that already exist and never write prestige directly.
  Every event offers at least one zero-cost choice. The texture they used
  to carry (donors, departures, failures) is the catalogue's, next.
- **The board's letters** (`catalogue-letter`, Plan 32) — the catalogue's
  rare seismic events (`src/data/eventCatalogue.ts`), drawn by
  `src/systems/events/catalogueEngine.ts` on a week nothing else claimed,
  keeping the decision events' global quiet stretch and a year apart from
  each other. The catalogue's inline events never stop the clock: they
  wait in the event panel over the map (`EventPanel.tsx`) and take their
  default when their weeks run out, or a seat answers them by policy.
- **A research prize** — the one research output momentous enough to stop the
  clock, awarded when an initiative concludes (see
  [research.md](../design/research.md)).
  Publications, grants and breakthroughs never do.
- **A championship** — the one athletics output momentous enough to stop the
  clock (see [student-life.md](../design/student-life.md)'s "The postseason").
  The bracket itself resolves silently inside the weekly tick; only a title
  raises anything, and it **queues** (`orgs.pendingTitles`) rather than firing
  on the spot, for the same reason a milestone does — the playoff week may
  already belong to something else. Drained one at a time: two titles in one
  year are two different teams and do not read as one modal.
- **Greek-life decisions** — the Hellenic Council opt-in, chapter scandals
  and chapter-housing petitions (see
  [student-life.md](../design/student-life.md)). These are
  entries in the decision-event table above rather than a stream of their
  own, so they change the MIX of what stops the clock, never how often it
  stops.
- **The board's response** — the year a rival passes the school, and only in
  the defend era (above the prestige gate the elite band's closing term uses),
  a trustee proposes a response at a real cost: an endowed chair, a campaign
  into the endowment, or hold the course. An entry in the decision-event table
  fired directly, once per rival, on the first quiet week the shared cooldown
  allows — it spends the ordinary budget rather than adding to it. See
  [progression.md](../design/progression.md)'s "The top has to be held".
- **The athletic director's shortage ask** — the director naming a program
  that has been running without a coach, and offering to go and get somebody.
  An entry in the same table, for the same reason: athletics already has a
  beat with a guaranteed cadence (the varsity petition), and measured over
  forty years that one can take **61 of 96** of a run's decision events on a
  school with many sport clubs. A second guaranteed athletics beat would
  compound that; a weight competes for the budget instead. Clubs and new chapters never stop it at all: they queue as
  petitions and are answered in a digest folded into the summer admissions
  interrupt.
- **A student demand** — the one stop-the-clock beat student life gets of its
  own (see [student-life.md](../design/student-life.md)'s "Student demands"),
  and only at a school whose satisfaction
  has fallen below the trigger threshold, so a well-run run never sees one. It
  queues like a milestone rather than firing on the spot, and it shares the
  decision events' cooldown, so it redistributes the existing texture budget
  instead of adding a stream on top of it.
- **The university charter** — a single question, asked once, the first quiet
  week after any lab finishes: keep the "College" the school opened as, or
  become a "University". Cosmetic in full.
- **The athletic director's offer** — the one interrupt athletics raises of its
  own, the first quiet week after the school fields a varsity team: three
  candidates rolled into the payload, and the mascot named in the same modal
  (see [student-life.md](../design/student-life.md)). Unlike the charter it is
  **not** a one-shot — declining returns it after a cooldown — so it records the
  week it was **put** rather than the week it was answered. That is what keeps a
  cleared-but-unanswered modal from re-firing on the next quiet week and
  starving every other event that shares the slot.
Build this once, generically. Do not bolt the report, admissions, or the
letters on as one-off pauses.

## What does not stop the clock

The other half of the same design decision. A course or building finishing, a
program founded, a petition filed, a paper published, a candidate listed in a
field the school is short in, and a research project that concluded with
nothing worth a modal are **toasts** (`src/components/Toasts.tsx`): three
seconds each above the log ticker, five at most, a click opening the tab they
are about. They are driven by the log's own `topic` tags — a system tags the
line it writes (`types.ts`'s `LogTopic`), the toast stack and the summer's
review beat both read the tag — so what toasts is what a system said it did,
never a parse of the sentence. Everything an interrupt announces stays out of
the stack.

## Widths

An interrupt is one of three widths, chosen by what it is
(`src/components/modalLayout.ts`): **narrow** for a question with a short
answer (a decision event, the charter, a demand, a research report, a single
milestone), **wide** for a decision with a panel beside it (the summer's review,
admissions and students beats, the athletic director's cards, a championship, a
burst of milestones as cards), **page** for a table to read (the summer's
Standing beat and the rankings entry). The summer changes width between beats
without the component knowing why.

## A new interrupt needs a default answer

Two things fast-forward through a run with no player: the balance harness
(`sim/balanceSim.ts`) and the debug panel's Jump. Both answer whatever stops
the clock by asking `src/engine/defaultAnswers.ts` for an action, so that both
answer the same modal the same way.

**Adding an interrupt type means adding its case there.** An unrecognised type
falls into the `default` branch and is dismissed unread — which is not
hypothetical: the athletic director's offer spent a release being dismissed
that way by a harness that did not know it existed, so the feature never ran
in a single measured trajectory while the balance figures were being fitted
against those runs. See
[playtesting.md](playtesting.md).

The summer is the one interrupt the defaults answer in **four calls**, one
beat each, so a fast-forward takes the same steps a player does — including the
payload carrying the decision from the third beat to the fourth. The harness
counts a summer once, on its opening beat, and reads its row on the last.

**A quiet week is a die roll.** The decision-event roll draws the seeded
random stream on every quiet week from year three on, so an interrupt that
stops firing on some week (the week-26 report, when it became the Standing
beat) re-phases every trajectory after the first week it would have claimed.
That is a harness property, not a balance change — measured week by week the
runs are identical up to that week and divergent from it — and the answer is
the reference envelope re-recorded (`npm run sim -- --write-reference`), never
a constant moved to chase the dice.

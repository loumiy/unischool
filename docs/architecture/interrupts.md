# Interrupts

Several features share one mechanic: **pause the clock, surface something the
player must resolve, then resume.** Rather than special-case each, there is a
single interrupt system. A system enqueues an interrupt onto `GameState`; the
game loop halts ticking while an interrupt is pending; the UI renders it as a
modal; the player resolves it by dispatching an action, which clears it and lets
the clock resume.

Everything that needs to stop time rides on this one mechanism:

- **Annual admissions** (see [admissions.md](../design/admissions.md)) — a
  summer interrupt.
- **The U.S. News report** — the "you've entered the rankings" alert and the
  annual standings update.
- **The tutorial** — a scripted sequence of interrupts (see below).
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
- **Decision-interrupt events** — the donor offers, faculty departures and
  facility failures that give the quiet weeks between milestones their texture.
  Authored as data (`src/data/eventData.ts`: trigger conditions, prompts,
  choices, effects) and fired by one ordinary tick function
  (`src/systems/events/eventSystem.ts`) on a weighted random draw across
  whatever the current game state makes eligible. Their effects route through
  hooks that already exist — cash and endowment, the satisfaction stock, the
  faculty roster and hiring pool — and never write prestige directly, because
  prestige is a stock (see [progression.md](../design/progression.md)). Every
  event is guaranteed to offer at least
  one zero-cost choice, so no event can strand a school that has no money.
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
- **Later:** the tutorial sequence.

Build this once, generically. Do not bolt the report, admissions, or tutorial on
as one-off pauses.

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

# Plan 76 — The inbox

*Planning document. Its job is to turn the owner's pick from the inbox
proposal (`docs/design/inbox.html`) into PRs.*

**Status: A and C landed; B proposed.**

---

## 0. The owner's ask

The owner kept the current look and asked for the inbox from the style
studies: one place for everything addressed to the president, opened full
screen like the other tabs, laid out like a mail client (the collapsed list on
the left, a bigger reading pane on the right), keeping the proposal's tags and
colour cues.

Before it, the game spoke through seven channels: the event panel over the
map's right edge, the note stack over its left (board letters, a student
demand, a milestone, the founding notes), the toasts, NEXT, the interrupt
modals, the activity log and the tab badges. Both stacks stepped aside
whenever a tab was open, so NEXT was borrowed to point back at them; a note
"Noted" was gone for good.

| PR | Subject |
|---|---|
| A | The inbox tab, in place of the event panel and the note stack |
| B | A pause-on-arrival setting, and the year's defaults in the review |
| C | The stops, answered in the inbox |

## Rules for every PR in this plan

- No change to the simulation: the inbox is read off state the game already
  keeps, and every action it dispatches existed before it. `npm run sim`
  reads the same as `sim/baseline.json`.
- The save format does not change.

## A — The inbox tab

- `systems/inbox/inbox.ts` derives the items in three tiers. **To decide**:
  the catalog's inline events, the student demand, a board letter with an ask
  (the idle-cash sweep). **Letters**: every milestone reached (read or not,
  so it can be read again), the board's distress letters, the founding notes.
  **Bulletins**: the toasts' news from the log, kept for a term. **Answered**
  is the log's `event` lines, which the catalog already writes for every
  answer.
- `InboxTab.tsx`: `'inbox'` is a `TabId`, so it opens in `TabOverlay` with
  the title bar, Close and the Escape ladder. A list pane (search, filters,
  rows grouped by tier) and a reading pane per kind. Opening a letter reads
  it; only the board keeps its buttons, since putting a board letter away
  takes it out of the queue. One pane at a time below 760px.
- The toolbar's Inbox button, between History and Build, and `I`: a number
  for what wants an answer, red and pulsing while any is in its last week,
  and a dot for unread letters.
- Arrivals: a matter or a letter arriving is a toast with an **Open** button,
  held eight seconds, and not while the inbox is open.
- NEXT's `waitingOnMap` becomes `inboxPointer`: only the board's letter or an
  event in its last week, pointing at the inbox.
- Gone: `EventPanel.tsx` (its choice list moves to `EventChoices.tsx`, which
  the board's modal letters share), `MilestoneNote`, `BoardLetter`,
  `DemandNote`, `FoundingNotes` and the note stack.

### As implemented

As above. Two limits, both from reading rather than storing: a board letter
put away is not kept (the queue is the only record), and a founding note's
read state lasts the session, as its "Noted" did. The Answered list reads the
log, so it reaches back as far as the log's 200 lines, and a long event's
subject is the log's own cut at 90 characters.

## B — Proposed

- A setting, "Pause when a matter arrives", off by default.
- The summer's review lists the year's matters that took their default.

(The first draft of B also moved the research, championship and Deans'
interrupts into the inbox *without* stopping the clock. The owner's answer,
PR C, keeps every stop a stop.)

## C — The stops, answered in the inbox

The owner's answer after A: what paused the game and forced a decision still
does, but from the inbox, which comes up by itself and stays up until the
player decides.

- `inbox.ts`'s `interruptItem`: the pending interrupt is a row in a new tier,
  **hold** ("The clock waits"), pinned first, counted on the button and red,
  named by its type (the summer by its beat, a letter by its title).
- `InterruptModal.tsx` splits in two: `InterruptContent`, the view for each
  interrupt type in its modal card, which the reading pane shows; and the
  component itself, which keeps the Enter key and the Final Report's page.
- `App.tsx` opens the inbox on a stop (again on each summer beat), refuses
  every other view and the build menu while it waits, drops the Close button
  for "Answer to go on", and puts the player back where they were once it is
  answered. The shell is no longer made inert for a stop, only for the Final
  Report and the walkthrough's welcome.
- The toolbar disables its other buttons while a stop waits; arrivals skip
  the stop, since the inbox opens on it.

### As implemented

As above. The Final Report stays a page: it ends the run and is built as
one. The walkthrough's welcome card is the tutorial, not a stop, and is
unchanged.

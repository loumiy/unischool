# Plan 123 — A review by subtraction

*Planning document only. No gameplay code changes in this file. It proposes a
new **format** for reviewing the whole game, in place of the seven-area format
of Plans 73, 86 and 109. The next full review would be the first to use it.*

**Status: In progress.** The owner answered §8 on 3 November 2026 (below); the review is being run.

---

## 0. The brief

The owner asked for a new format for Claude Code to review the full game and
recommend improvements. It should pay particular attention to **polish, juice
and cohesion**. Their stance for this stage of development:

> Less is more: reduce text, clutter and stray features in favour of intuitive
> gameplay, interconnected systems, and the player learning by doing rather
> than by reading.

## 1. Why the old format doesn't fit this brief

The three full reviews worked. Review III's README shows 32 of review II's 52
findings fixed. But their shape now works against the brief:

- **They add more than they cut.** Every area produces findings, and a finding
  is usually a fix: a line of text, a ring, a chapter, a guard. Review III
  produced 54 findings and 7 bugs. Its first two improvements were *more*
  guidance (an optional objective, a side chapter, a "More" button). Plans
  106–112 answered the walkthrough with chapters, the chapters with a drawer,
  and the drawer with a list, (?) help and Show me. Each step was right on its
  own. Together they show that the format never asks what could be removed.
- **The areas are the wrong unit.** Text, aesthetics and intuitive gameplay are
  three lenses on the same player moment. Split across three reviewers, that
  moment gets three findings and three fixes, and nobody owns how it *feels*.
- **Juice has no home.** None of the seven areas asks what happens on screen,
  in sound or on the map when the player acts. "Feel" findings show up only as
  side remarks in areas 1 and 3.
- **Cohesion is read as consistency.** The consistency appendices (2c, 2d)
  check that words, fonts and buttons match. They don't check whether the
  *systems* connect: whether a win in athletics shows up in admissions, or a
  quad in students' happiness, in a way the player can see.
- **The volume is the cost.** Triaging 61 items is a day of the owner's time,
  and review III still reads "awaiting the owner's triage".

Marketability, bugs and balance can run as their own passes (§7). This format
is about one thing only: **how the game feels to learn and play, and what it
should stop doing.**

## 2. The principles every recommendation is held to

These are the review's rules. A recommendation that breaks one has to say why.

1. **Cut before you add.** Every recommendation states its **net change**:
   words on screen, surfaces (screens, panels, buttons, letters, toasts,
   chapters) and features, before and after. The default is a negative number.
   Adding something is allowed only if it lets something larger go.
2. **Show it, don't say it.** Prefer a visible consequence on the map, a
   number that moves, a sound or a motion over a sentence that explains a
   rule. A rule the player can see happen doesn't need words.
3. **Connect, don't append.** Prefer making an existing system feed another,
   visibly, over adding a new system. A feature that touches only itself is a
   candidate to cut.
4. **One signal, one meaning.** A colour, icon, sound, motion or word means
   the same thing everywhere. Two signals for one thing, or one signal for two
   things, is a cohesion finding.
5. **The player learns by doing.** The first hour should be mostly actions,
   not reading. Teaching happens through constraint and consequence (only the
   right move is lit, and a wrong move shows its cost) rather than through
   briefings.
6. **Protect what works.** The review names what is already good and must
   not be cut: the admissions reveal, the campus growing, the summer's ritual.
   Subtraction that hurts the core is not polish.

## 3. The shape of the review: five passes, one synthesis

The seven areas become five **passes**. Each pass is a way of looking, not a
topic. All five run over the same build and saves, so they can quote each
other's evidence. One synthesis turns them into a short list.

| Pass | Question | Output |
|---|---|---|
| **A. The census** | What is there, how often is it seen, and what decision does it serve? | `census.md`: every surface, scored |
| **B. The silent run** | Can a new player get through the first five years with all the explanatory text removed? | `silent-run.md`: every stall, timestamped |
| **C. The juice pass** | When the player does each core thing, what does the game do back? | `juice.md`: a scorecard and clips per verb |
| **D. The web** | Which systems visibly feed which? Which are islands? | `web.md`: one diagram, with each edge marked seen or hidden |
| **E. The cohesion pass** | Does every signal mean one thing, and does the map agree with the tabs? | `cohesion.md`: a signal dictionary and its clashes |
| **Synthesis** | What are the dozen changes that make the game simpler *and* better? | `README.md`: the verdict, ≤ 12 cards, the cut list, the keep list |

### Pass A — The census

**Method.** List every player-facing surface in the production build:

- each tab, panel, popup, modal, letter, toast, chapter and objective;
- each button, figure and chart on them;
- each feature (a mechanic the player can act on).

`review:strings` already pulls every string with its screen and word count.
A new tool, `review:census`, does the same for components and features. For
each surface it records:

| Field | Source |
|---|---|
| Words on it (median, max) | `review:strings` |
| Times seen per run, and the share of runs that ever see it | PostHog, plus the harness's `natural` and goal players |
| The decision it serves, in one line, or "none" | the reviewer |
| The systems it reads from and writes to | the code (`systems/`, `state/`) |
| Whether the map already shows the same thing | the reviewer, from captures |

**Verdict per surface:** *keep*, *merge* (it says what another surface says),
*fold onto the map* (the map could show it), or *cut* (no decision, few
players, no connections).

**Totals that become the baseline:** surface count, feature count, words a
newcomer reads before year 2, and words per screen at the median and the
95th percentile. Every card in the synthesis is measured against these.

### Pass B — The silent run

**Method.** Play the first five years in the production build with the
explanation hidden. A flag (`?silent`, harness-only, never shipped) uses a
stylesheet and a filter on the string table to blank:

- chapter briefings, *How* and *Why*;
- the body text of letters (the title and the choices stay);
- (?) help and tooltips;
- the coach cards and the guided walks.

Labels, numbers, names and button text stay. This is the game "played by
doing".

Each pass plays three times:

- once carefully;
- once as a skimmer (clicking the first lit thing);
- once with a goal (grow fast).

The reviewer logs every **stall**: a minute with no useful action, a wrong
move the game didn't show, or a click that did nothing. For each stall it
records:

- the timestamp and the screen;
- what the player was trying to do;
- **which hidden text would have solved it**;
- **what the game could show instead**: a glow on the one valid target, a
  disabled control that shows its reason in a picture, a consequence on the
  map, a number that moves.

**What it finds.** Text that carries real weight (bring it back, but shorter)
against text that only repeats what the screen already shows (cut it). And
it finds the places where the interface itself fails to teach.

The same run, with the text back on, gives the **read-to-act ratio**: words
read per meaningful action, minute by minute, over the first twenty minutes.
That ratio is the headline number of the review.

### Pass C — The juice pass

**Method.** Pick the game's core verbs, about a dozen:

- found the college;
- place a building, and paint a path;
- open a program, and develop a course;
- hire a professor;
- set tuition and admit a class;
- the summer reveal;
- a building finishes;
- a team wins, and a title;
- a chapter or milestone done;
- a bad event;
- the specialization;
- the Final Report.

Record each one with `npm run clip` at 60 fps, with sound captured
separately, from a scenario save. Score each verb on four beats and five
channels, from 0 (nothing) to 3 (strong and clear):

| Beat | Asks |
|---|---|
| **Anticipation** | Does the game show what is about to happen (a ghost, a preview, a cost going red)? |
| **Action** | Does the input answer within one frame (press state, cursor, sound)? |
| **Reaction** | Does something visibly respond: motion, a number counting, a pop, a camera move? |
| **Aftermath** | Is the change still visible a minute later, on the map or in a figure the player looks at? |

| Channel | Examples |
|---|---|
| Motion | ease, overshoot, a stagger, a crane, walkers |
| Number | `AnimatedNumber`, a delta that floats, a colour flash |
| Sound | `components/audio/engine.ts` |
| Map | a building rising, crowds, banners, lights, wear |
| Text | a toast, a log line (the weakest channel; it scores at most 1) |

The scorecard puts verbs in rows and beats × channels in the columns. Gaps
show as empty cells. The pass also flags **over-juice**: the same pop on
every small thing, motion that delays input, or celebration out of
proportion to the event. It checks that `prefers-reduced-motion` and the
motion setting keep the information when the motion is off.

**The principle the pass applies:** juice goes where the player's choices
land, in proportion to how much they matter. A title is louder than a
toast. And **aftermath on the map beats a message every time**.

### Pass D — The web

**Method.** Draw the game's systems as one diagram:

- prestige, money, students, faculty, curriculum, campus, athletics,
  research, alumni, events and the board.

An edge means "A changes B", read from `systems/` and `engine/`. Each edge
is marked in one of three ways:

- **seen**: the player can watch A move B, on the map or in a figure next
  to A;
- **told**: the only way to know is to read it;
- **hidden**: it happens, but nothing says so.

A system with one edge is an **island**. A *told* edge is a candidate to make
*seen*. A *hidden* edge that matters is a cohesion finding. An edge that
matters to nobody is a candidate to cut. Then the goal players
(`review:goals`) answer: **does any strategy ignore a whole system and lose
nothing?** A system that can be ignored without cost is a stray feature, or
its edges are too weak.

The output is one diagram (SVG, readable in both themes) and a short table.
It is the review's picture of the game as one machine, and the thing the
owner can hold the next plans against.

### Pass E — The cohesion pass

**Method.** Build a **signal dictionary**:

- every colour (beyond the school's palette), icon, sound, motion, badge,
  ring and recurring word that carries meaning;
- with each place it appears and what it means there.

A clash is one signal with two meanings (say, a ring that means both "new"
and "do this"), or two signals for one meaning (a red figure and a red-bordered
card both for "loss").

Then **map against tabs**: for every fact a tab states about the campus, the
students or the faculty, can the map show it? Examples:

- students' needs as people gathering or not;
- a library's crowding as walkers at its door;
- a winning team as banners;
- debt as unkept buildings.

A fact the map could carry is a candidate to take *off* the tab.

Last, **one voice, one hand**: does the game sound and look like one maker
from the title screen to the Final Report? `2d-voice` already reads the
words. This pass reads the visuals and the motion in the same way, from the
same captures.

### The synthesis

One reviewer, the synthesizer, reads all five passes and writes the
`README.md`. That is the only file the owner has to read.

1. **The verdict.** One paragraph: what the game is now, in a sentence a
   player would say, and the one thing most in the way of that.
2. **The headline numbers**, then and now: surfaces, features, words before
   year 2, the read-to-act ratio, juice coverage (the share of verb × beat
   cells at 2 or more), and the share of the web's edges that are *seen*.
3. **At most twelve cards**, ranked. Each card is one player moment, not one
   finding:

   ```
   ### 3. The first building — every player, minute 2, M
   The moment:  what the player does and sees today (clip / screenshot).
   What's wrong: the stall, the gap or the clash, with the passes that found it.
   Cut:      what goes (surfaces, words, a feature).
   Connect:  which system now visibly feeds which.
   Juice:    what the game does back, by beat and channel.
   Net:      −2 surfaces, −140 words, +1 seen edge, juice 4→9 of 12.
   Effort:   S / M / L.   Confidence: high / medium / low, and why.
   ```

   Not every card needs all three verbs, but every card needs a **Net**.
4. **The cut list.** Every *cut* and *merge* from the census, ranked by
   words and surfaces saved against players affected, one line each, with
   a checkbox for the owner. Like the over-explaining text log, one decision
   per row; pattern rows settle many at once.
5. **The keep list.** What works and must survive the cuts, with the
   evidence: what players praised, what scores 3 on juice, which edges are
   seen.
6. **Everything else** goes in the pass files, not in the README. A finding
   that didn't make a card isn't lost. It just isn't the owner's job to
   triage it.

The cap is the point. Twelve cards forces the synthesizer to merge findings
into moments and drop the rest. If the review finds more than twelve things
worth doing, the twelve that make the game simplest go first.

## 4. Ground rules carried over, and changed

Kept from Plans 73, 86 and 109:

- the production build (`vite preview`) at 1440×900, and 1280×720 where
  layout matters;
- findings only: nothing in the game changes;
- evidence before opinion: every judgment names its clip, capture, save or
  file and line;
- reviewers are models, not players: feel judgments are labelled as theirs;
- real players are evidence: PostHog and the playtest reports are read once
  for the whole review, and every pass quotes the same numbers;
- a blocker is raised the day it is found.

Changed:

- **Severity gives way to net change.** Blocker, major, minor and polish
  stay for bugs. Cards are ranked by players affected × how early × net
  simplicity gained ÷ effort.
- **Ids by pass:** `A-1` … `E-1` in the pass files, and `#1`–`#12` for cards.
- **No "add a sentence" fixes.** A fix that only adds text is not accepted
  unless it comes with a larger cut in the same card.
- **The status of the last review** is one table in an appendix, not a part
  of every area.

## 5. The tools

Most of what this needs exists. New tools go under `tools/review/` and are
never imported by the game.

| Tool | Exists | Used by |
|---|---|---|
| `review:strings`, `review:plain` | yes | A, B (words per screen, read-to-act) |
| `review:goals`, `review:sweep`, `natural` | yes | A (times seen), D (ignorable systems) |
| `scenario`, `shot`, `clip`, `review:views` | yes | B, C, E |
| `tools/review/drive.mjs` | yes | B (hands-on runs) |
| **`review:census`** | new | A: every component and feature, with what it reads and writes, and the PostHog view counts joined in |
| **`?silent` flag** | new, harness-only | B: blanks explanatory text by string tag; refuses to load in a production build without the debug flag |
| **`review:juice`** | new | C: plays each verb from a save, records a clip and the audio cues fired, and logs frames from input to first visual response |
| **`review:web`** | new | D: a first draft of the system graph from imports and state writes in `systems/`, for the reviewer to correct |

The tools are worth more than one review. `review:census` totals and the
read-to-act ratio can become **budgets in the tests**, in the same way that
`test/text-check.test.ts` fails when a plain-words count rises past
`tools/review/plain-baseline.json`. CI would then fail if a screen grew past
its word or surface budget.

## 6. The PRs

| PR | Change |
|---|---|
| A | This plan, and the owner's answers to §8 |
| B | The four tools in §5, with a line each in `tools/README.md` |
| C | Passes A and D (they feed the others) |
| D | Passes B, C and E, in parallel |
| E | The synthesis, the status table of review III, and a row in `docs/reviews/README.md` |

The review lands in `docs/reviews/2026-11-review-by-subtraction/`:

- `README.md`;
- one file per pass;
- `img/` and `clips/` (clips compressed, or as GIF stills where a clip is
  too big for git);
- `data/` for the census and scorecard tables.

## 7. What this format leaves to other passes

- **Bugs.** CI, `test:slow` and the sweep already catch crashes and failed
  loads. A bug the five passes hit still goes into a short `bugs.md`, but
  hunting bugs is not this review's job.
- **Balance and strategy depth.** The harness owns targets. Pass D uses the
  goal players only to find systems that can be ignored.
- **Marketability.** It doesn't change between builds the way feel does. It
  can be revisited on its own before Next Fest.
- **Asset-by-asset aesthetics.** Contact sheets, vernaculars and doors stay
  with their checkers. This review judges the art only where it carries a
  signal (cohesion) or a consequence (juice).

## 8. The owner's answers (3 November 2026)

1. **The cap:** twelve cards.
2. **Cutting mechanics:** allowed. The review may recommend removing a whole
   mechanic, not only text and surfaces.
3. **Sound:** in scope for the juice pass.
4. **Budgets in CI:** no. The census totals stay review numbers.
5. **A review page:** yes. The cut list goes out as an interactive page with
   a keep / trim / cut choice per row.

## 9. What this plan does not do

- Run the review. It only defines the format.
- Change the game, its balance or its text.
- Retire the old format for good. A seven-area review can still be asked
  for. This is the format for the stage the game is at now.

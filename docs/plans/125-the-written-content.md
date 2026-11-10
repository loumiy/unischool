# Plan 125 — The written content

*The owner's go-ahead (10 November 2026) on the written content review
([`docs/reviews/2026-11-written-content-review.md`](../reviews/2026-11-written-content-review.md)),
with three rulings: real names in course descriptions stay; titles and empty
states may carry one dry line; an event ends on a deadpan line about one time
in three. The review proposed seven steps, A–G; this plan is their record.*

**Status: Landed (10 November 2026), on `claude/happy-lamport-v5wa2p`.** The
event and course rewrites (C, D) were done by three editing agents working
to the voice note, then read and checked here. `npm test` passed on every
commit, 215 suites at the end. What was left undone is under **Not done**.

---

## The measurements

`npm run review:plain`, before and after. Every count is now the baseline in
`tools/review/plain-baseline.json` and `voice-baseline.json`, so it can only
fall (`test/text-check.test.ts`).

| Count | Before | After |
|---|---|---|
| Em dashes, everywhere | 62 | 3 |
| British usage, everywhere | 11 | 0 |
| Events: "would like" | 68 | 12 |
| Events: a trailing ", which" | 54 | 9 |
| Events: letters opening "The … has" | 85 | 35 |
| Courses: built on a list | 385 | 227 |
| Courses: "real" as an intensifier | 24 | 2 (both the term: real numbers, real estate) |
| Courses: lines on the most used opening verb | 37 | 12 |
| Instructions: mid-sentence colons | 53 | 50 |
| Instructions: semicolons | 8 | 5 |

## G. The voice note

[`docs/design/voice.md`](../design/voice.md): the narrator (your chief of
staff), where jokes may go, who they are on, and a ceiling for each device.
It was written first, since C, D and E were edited to it.

## F. The check

`tools/review/plainChecks.ts` gained `VOICE_RULES`: an em dash and British
usage on every screen, three counts for the events, and three for the
courses, each held to `voice-baseline.json`. A course description may now be
one sentence or two (`test/course-descriptions.test.ts`).

**As implemented**, the leftovers too: 34 em dashes became periods, commas or
middle dots. Three stay. The share card's title is one, and the answered-
matter log line (`catalogueEngine.ts`, "— Nobody answered in time:") is
another, since `yearInReview.ts` parses that line in the logs of saves
already made. The alumni, rankings, standings and endowment help were
rewritten in short paragraphs, and a plain help popup now breaks on a blank
line.

## A. Effect chips

`data/effectTypes.ts` and `components/EffectChip.tsx`: an icon for the kind,
the signed figure, a word or two, green or red, and a clock on a change that
wears off. The sign is always in the figure, so colour is never the only cue.

- Event choices (`systems/events/choiceEffects.ts`, which took the phrase
  logic out of `EventChoices.tsx` so a test can read it) and the authored
  decisions (`DecisionChoice.effects` in `eventData.ts`). Their sentences
  no longer say "Costs nothing." or "and recovers over the following
  weeks".
- Reputations (`tagEffects`): the pool and the class's quality, which were
  never shown, and the one lever. The `line` keeps only its flavor.
- Quirks (`quirkEffects`), offices (their cost to open and a year), and a
  facility's panel (`data/buildableEffects.ts`).
- A milestone's letter: each building it opens as the map draws it, with
  its chips.
- The chronicle: an era's rank, cash, endowment, classes, titles and prizes
  as chips over its prose (`Era.stats`, `Era.prose`). `Era.lines` is
  unchanged, since the hall of fame keeps it and the share card reads it.

## B. Legends, keycaps, pips and tables

- `HelpHint` takes a `legend`: each mark as the panel draws it, a few words,
  then the rules as short lines. Curriculum, Faculty, the Build menu and the
  coach market use it.
- `components/Keyed.tsx`: "[Q]" is a keycap and "[icon:turn]" the map tool's
  own icon, in help text and the settings note.
- A hall's programs from one school are six pips with a gap at three
  (`HallPips`), and the letters point at them.
- The athletics subsidy is a table under its switch, the board's scale a
  six-step ladder, the Faculty tab's slot sums one bar with a key, a coach's
  quality and scouted ceiling a meter, the five needs one bar of their
  shares, and the routes to a specialization a checklist (`OfferRoutes`).

## C. The events

116 of 160 base letters, 101 of 116 variants and 20 labels. Every letter is
written to "you" (the charter too, with its test). Base letters use
contractions where a person would. British usage is gone. The vague labels
say what happens. Facts, ids, effects and placeholders are unchanged, and
each variant was checked against its base letter.

## D. The courses

342 of 473 descriptions. A third are two short sentences, and the student
does the verb throughout. Health, MD, Law, MBA and MFA, which had no dry
line, have some. The protected lines are untouched, and real names stay.

## E. The flat bodies

- Facility blurbs are flavor, and their numbers are the panel's chips.
- The faculty bio has five tellings, chosen from what was already rolled,
  so the random stream and every seeded run are unchanged.
- The offices each have a dry line (`OfficeDef.quip`) over a blurb that
  now gives their numbers, read from the constants.
- Empty states and a few chronicle lines have a light touch.

## Not done

- **Research depth** ("Two scholars, eighteen months.") as person pips and a
  duration chip.
- **The Final Report's axes** as a small table or sparklines. Its text is
  unchanged.
- **The build header's stat run** ("850 beds · 3,590 enrolled · …") and the
  club rows.
- **The campaigns' requirement text** (`whenText`) is not shown anywhere,
  so there was nothing to convert.
- **The phone layout** of the new legends, tables and bars was not checked
  in a browser at 390 px.

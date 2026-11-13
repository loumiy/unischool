# Plan 127 — College, Institute, University

*Planning document only. No gameplay code is changed by this file. Its job is
to turn the owner's answer to I10 (13 November 2026, `docs/reviews/playtest-1/
findings.md`) into PRs. A college gets a third title, **Institute**. Within a
run, Institute is granted with the first research lab and University with the
first graduate program. A title earned in any run can be chosen at founding
in every run after it, from a dropdown beside the name.*

**Status: Proposed (13 November 2026).** Nothing has landed. The owner's
decisions are in §2. The defaults this plan takes where the owner hasn't
ruled are in §3, each marked so it can be overruled before its PR starts.

---

## 0. What this plan is, and is not

- It changes what the college can be called, when, and how the player
  chooses. No system reads the name today ("Cosmetic: no system reads the
  name", `charter.ts`), and none will after this plan.
- It keeps the one rename (Plan 80D) and the Second Empire unlock (Plan 78G),
  moved onto the new letters as §2 says.
- It adds no title beyond the three, and no long form such as "Institute of
  Technology" (§3, D7).
- It retires the founding screen's caption about University (Plan 78G's
  `UNIVERSITY_CAPTION`). The dropdown says the same thing where players
  look.

## 1. What stands today

- **The name.** `University.name` is the player's half, `University.suffix`
  is `'College'` or `'University'` (a plain `string`, `types.ts:1170`), and
  `institutionName()` joins them. The founding screen takes the first half
  only. `bareSchoolName()` drops a typed "College" or "University", and
  `STARTING_INSTITUTION_SUFFIX = 'College'` (`actions.ts:45`) is written by
  `createInitialState` (`actions.ts:436`).
- **The founding screen** (`components/StartupScreen.tsx`). One name field.
  Founders Hall's facade reads "<NAME> COLLEGE" (`SchoolFacade`'s `suffix`
  prop). Two captions: `UNIVERSITY_CAPTION` when a typed name ends in
  "University", and `prefixedCaption` when it opens with "University of" or
  "College of" (`data/foundingData.ts`). `onStart(name, vernacular, colors)`
  dispatches `START_GAME`, and nothing carries a suffix.
- **The charter.** `eventSystem.ts`'s `fireCharter` (`:85`) raises it on the
  first quiet week a lab is at work (`labEquippedFields`, the gate research
  hangs off). It sets `universityCharterOffered`, which never recurs. It is
  the catalogue's inline `CHARTER_EVENT` (`eventCatalogue.ts:2731`, instance
  `university-charter`), titled "The charter", with "Become {name}
  University" (the default after four weeks) and "Keep the name {name}
  College". `grantCharter` (`charter.ts`) writes the suffix and the log
  line. The letter carries the college's one rename: `InboxTab.tsx`'s
  `CharterAnswer` and `RENAME_COLLEGE` (`reducer.ts:725`), refused unless
  the charter is pending.
- **Graduate programs.** A graduate program goes only to its host (the
  Graduate College from Year 15, the Law School, the Graduate Business
  School), once its school teaches every course (`techData.ts`'s
  `graduateGateMet`, checked in `techSystem.ts`'s `canFoundProgram`). Every
  school has a course that needs a lab, so a college always has a lab before
  it can found a graduate program. The titles therefore come in a fixed
  order: Institute, then University.
- **Unlocks across runs** (`state/unlocks.ts`). Four bonus architectures,
  each with a condition read off the state, kept in their own storage key
  (`unischool.unlocks`). They are recorded on every save and when a run is
  hung in the hall, never in a sandbox (`:141`), with a letter the week one
  is earned (`UNLOCK_EARNED`) and a New mark on the founding screen until
  used. Second Empire's condition is "Win a university charter"
  (`universityCharterOffered || suffix === 'University'`).
- **Elsewhere.** `hall.ts:21` stores a finished run's `suffix` as `'College'
  | 'University'`. `persistence.ts`'s 78 → 79 step (`grantHeldCharter`)
  answers a held charter modal. `tools/scenarios.ts` has a `charter`
  scenario. `docs/design/progression.md`'s "College, and University" is the
  rule's write-up. Tests: `charter.test.ts`, `unlocks.test.ts`,
  `inbox.test.ts`, `event-catalogue.test.ts`, and the research tests that
  open a lab.
- **Not the same charter.** The ladder's founding milestone is also called
  "The charter" (`ladderData.ts:117`, `CHARTER_ID`), and clubs and Greek
  chapters are "chartered". None of these change.

## 2. The owner's decisions (13 November 2026)

1. **Three titles: College, Institute, University.** They are equals in the
   name, not a ladder. An Institute is a research or technical identity, not
   a step below University.
2. **Institute is gated on research:** the first research lab at work.
   **University is gated on a graduate program:** the first one founded.
3. **The title is chosen at founding, from a dropdown** beside the name.
4. **A first-time player has only College.** Institute and University show
   in the dropdown, locked, with what earns them. **A title unlocks for every
   later college once it is earned in any run.**
5. **Within a run the grants still come as letters.** Each letter offers the
   new title or keeping the current one. Either answer is final until the
   next letter, as today.

## 3. Defaults this plan takes (overrule before the PR)

- **D1 · When University is "earned".** The week the first graduate program
  is founded, meaning housed in its host with its entry course begun. Not
  its first graduate or its first course finished.
- **D2 · The rename stays with the first-lab letter.** That letter is raised
  in every run, so the one rename (Plan 80D) keeps its single home. The
  University letter has no name field.
- **D3 · Second Empire stays with the first lab.** Its unlock moves to the
  Institute grant, whichever name is kept, so its timing in a run doesn't
  change. The condition reads "Open a research lab."
- **D4 · A run founded under an unlocked title.**
  - **Founded as Institute:** the first-lab letter still comes, for the
    rename and Second Empire. It offers "Keep the name X Institute" only, so
    it's a notice with the name field. The University letter comes as usual.
  - **Founded as University:** the first-lab letter offers "Keep the name X
    University" or "Become X Institute". No University letter comes.
- **D5 · Old saves and old browsers.**
  - **A save that already holds the charter** (`universityCharterOffered`)
    is treated as having had the first-lab letter. If it was named
    University it keeps the name and gets no University letter. If it kept
    College, it may still get the University letter at its first graduate
    program.
  - **A charter letter waiting in an old save** is answered with its default
    (University), as `grantHeldCharter` did for the old modal.
  - **Across runs:** a browser that has Second Empire unlocked (it won the
    old charter) starts with Institute unlocked. University unlocks only
    under the new rule, though a run underway that already has a graduate
    program unlocks it on its next save.
- **D6 · Sandbox runs unlock nothing**, as for the architectures.
- **D7 · Out of scope:** "Institute of Technology" and other long forms.
  Typing "Institute" after a name is dropped like "College" and "University"
  are, and the dropdown is selected to match if that title is open.

## 4. The PRs

### PR A — The title in the state

- **The title type.** `types.ts`: `type InstitutionTitle = 'College' |
  'Institute' | 'University'`, and `suffix: InstitutionTitle` (an empty
  suffix from a v6 save still maps to College on load).
- **The flags.** Replace `universityCharterOffered` with `charters: {
  institute: boolean; university: boolean }`. Each records that its letter
  was raised, whatever the answer, so neither recurs.
- **Names.** `bareSchoolName()` also drops a trailing "Institute".
  `typedPrefixed()` also matches "Institute of".
- **Founding.** `START_GAME` and `createInitialState` take a `suffix`.
  `STARTING_INSTITUTION_SUFFIX` stays as the default for tools, tests and
  scenarios.
- **The hall.** `hall.ts`'s entry `suffix` widens to the type. Old entries
  read as they are.
- **Save migration** (next `SAVE_VERSION`): `universityCharterOffered` maps to
  `charters.institute`, plus `charters.university` when the suffix is
  University (D5). A held `university-charter` instance is answered with its
  default (D5).
- **Tests:** a migration test (old save, held letter, kept College, took
  University), plus the name helpers.

### PR B — Two letters in a run

- **The Institute letter.** `fireCharter` becomes `fireInstituteCharter`,
  with the same gate (`labEquippedFields`). The event is renamed
  `charter-institute`, titled "The charter". Its choices are built from the
  run's state (D4): "Become {name} Institute" (the default when the college
  is a College) and "Keep the name {name} {suffix}". Its text drops "may now
  call itself {name} University". It adds that colleges founded from now on
  may open as Institutes.
- **The University letter.** A new `fireUniversityCharter`, placed after the
  first in the priority list. It is raised on the first quiet week with a
  graduate program founded (D1), unless the college is already University
  or the letter was raised. The event `charter-university`, titled "The
  university charter", offers "Become {name} University" (the default) and
  "Keep the name {name} {suffix}". It has no name field (D2).
- **Answers and log lines.** `charter.ts`'s `grantCharter` becomes
  `grantTitle(s, title | null)`, one log line for each letter: "Your first
  laboratory is open …" or "Your first graduate program has begun …".
- **The one rename.** `RENAME_COLLEGE` stays refused unless the Institute
  letter is pending. Its `suffix` may be any title open to the run. That
  means the founding unlocks plus Institute, so `CharterAnswer` keeps the
  current suffix as today.
- **Second Empire** reads `charters.institute` (D3).
- **Tests:** rewrite `charter.test.ts` to cover both letters, the defaults
  after four weeks, D4's two cases, the rename window, and no repeats. Also
  `event-catalogue.test.ts` (the event count and titles), and `inbox.test.ts`
  and the research tests where they read the old flag.

### PR C — Titles across runs

- **Storage.** `unlocks.ts` gains `TITLE_UNLOCKS` in its own key,
  `unischool.unlocks.titles`, and its own seen key. The entries are Institute
  ("Open a research lab in any run") and University ("Found a graduate
  program in any run"). Each one's `earned` reads the run's `charters`
  flags, or the suffix when the run founded under it.
- **Recording.** `recordUnlocks` records titles at the same points as the
  architectures, never in a sandbox (D6). It seeds Institute once from an
  unlocked Second Empire (D5). A title earned mid-run gets no letter of its
  own, because the grant letter already says it.
- **Tests** (`unlocks.test.ts`): a first browser has College only; a title is
  earned in one run and open in the next; the Second Empire seed; a sandbox
  earns nothing.

### PR D — The dropdown at founding

- **The control.** `StartupScreen.tsx` puts a `<select>` beside the name
  field, College / Institute / University, reading as "Halifax [College ▾]".
  A locked title is a disabled option whose text says what earns it
  ("University — found a graduate program in any run"). A title not yet
  used shows "(new)", cleared when a college is founded with it, the same
  `markSeen` pattern as the architectures.
- **The facade and founding.** The facade's lintel reads the chosen title.
  `onStart` and `START_GAME` carry it.
- **Typed titles.** A name typed with a title at the end is cut back to the
  bare name, as today. If that title is open, the dropdown switches to it.
  If it's locked, a caption says what earns it. This replaces
  `UNIVERSITY_CAPTION`. `prefixedCaption` says "This will read 'X College'"
  (or the chosen title), without the promise of University.
- **Layout.** The name and the dropdown share a row from 480 px wide and
  stack below that. Founding still fits 1280×720 without scrolling, as Plan
  115G requires.
- **Screenshots:** a first browser with two locked options, one with
  Institute new, and a phone.

### PR E — The words and the record

- **The design doc.** `docs/design/progression.md`'s "College, and
  University" is rewritten as "College, Institute and University", with the
  three titles, the two letters, the dropdown and the unlocks.
- **The text.** The letters' text goes through `npm run review:plain`, and
  `test/briefing-numbers` passes if any number appears.
- **Comments.** Update the comments in `techData.ts:410`, `chapters.ts:338`
  and `Pennant.tsx:11` that describe the old charter.
- **The changelog.** Add the next version's line: "A college can open as a
  College, an Institute or a University, once you've earned it."
- **Records.** Mark I10's naming finding in `findings.md` as planned (Plan
  127), then as fixed when it lands. Add this plan's row to
  `docs/plans/README.md`.

## 5. Risks

- **University arrives later.** It moves from the first lab (years 9 to 10
  in a natural run) to the first graduate program (Year 15 at the earliest).
  A run that never founds a school never earns it. That is the point, and
  the Institute letter keeps the mid-game moment the charter gave.
- **Players may read Institute as "almost University".** The letters and the
  dropdown present the titles as choices ("Keep the name"), never as a
  rung. The text review (PR E) should check this.
- **The save migration** is the one part a player could feel (D5). It needs a
  real held-letter save among the fixtures.
- **An inbox matter whose choices depend on the run** (PR B, D4) is new for
  the catalogue. A `CatalogueChoice` is static today, and only its label is
  filled from `vars`. The plainer build is fixed variants: one event for each
  case D4 names, picked when the letter is raised, each with static choices.
  Either way the choices are fixed once raised, so the four-week default
  can't change under the player.

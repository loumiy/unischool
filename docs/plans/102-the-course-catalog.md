# Plan 102 — The course catalog

*Planning document only — no gameplay code is changed by this file. The
owner picked "the course catalog's shape" for 0.1.1 (12 October 2026),
with a note: "I think the catalog size is good, so I don't want to expand
too much, but if reorganizing seems prudent, let's explore it." This plan
explores it, and proposes the two changes still worth making.*

**Status: Approved (13 October 2026): every decision as proposed, so the
ids stay as they are and PR C is not built. B in progress.**

---

## 0. Most of this was already done

The backlog entry (the October review's A2-5, left by Plan 76G) was
written before **Plans 95L and 95M** (PR #330, 6 October). The 12 October
re-read missed that, so the entry was still listed as open. 95L–M already:

- **Swapped the moves 76G declined:** FINA130↔210, ACCT140↔240,
  MED550↔600 (MED600 is now "Transition to Clerkships"), and the JD's
  540/570 (LAWS540 is Professional Responsibility, the clinic last at 570).
- **Added the bridges before ACCT110 and MATH130:** FINA210→ACCT110 and
  COMP120→MATH130 (`CROSS_MAJOR_BRIDGES`, `techData.ts:310–375`).
- **Gave the Social Sciences their core courses:** SOCY130 Social
  Statistics, POLS140 Research Methods, ANTH240 History of Anthropological
  Theory, PHIL230 Early Modern Philosophy, HIST220 Modern East Asia.
- **Ended every major in a 310 capstone or senior seminar.** The owner
  chose "a fourth tier".

So the catalog today has **473 courses**: 420 undergraduate (42 majors ×
10) and 53 graduate. The README's "427 courses" is out of date, and Plan
98H corrects it.

Every major has the same shape (`techData.ts:32–33`):

| Number | 101 | 110 120 130 140 | 210 220 230 240 | 310 |
|---|---|---|---|---|
| Tier | 1 | 2 | 3 | 4 |
| Count | 1 | 4 | 4 | 1 |

The graduate side:
- **Professional:** MED 501–610 (12), LAWS 501–570 (8), MBAX 501–540 (5).
- **Doctoral and the MFA:** PHDE, PHDS, PHDH, PHDC, PHDL, PHDB and MFAX, at 701–730 (4 each).

**Two things are still open:**

1. **No undergraduate course is numbered above 310.** A real catalog runs
   100–400. The game's numbers are display only:
   - cost, upkeep, development time and the quality penalty all come from the course's **position**, not its number (`TIERS`, `tierOf` in `courseQuality.ts:121–145`, `tierBands`);
   - but the ids carry the numbers, and saves hold the ids.
2. **The MD has no internal medicine, pediatrics or obstetrics course.**
   MED610's sentence names those rotations (`courseDescriptions.ts:553`),
   and Plan 95's catalog note left it so on purpose.

## 1. The two changes, explored

### Renumbering to 100–400

**What it would be:** the same ten courses per major, numbered so the
tiers read as years:

| Tier | Today | Proposed |
|---|---|---|
| 1 | 101 | 101 |
| 2 | 110 120 130 140 | 110 120 130 140 |
| 3 | 210 220 230 240 | 310 320 330 340 |
| 4 | 310 | 410 |

The 200s would be left empty, which reads oddly. **Alternatively**, a
true four-year spread:

| Tier | Today | Proposed |
|---|---|---|
| 1 | 101 | 101 |
| 2 | 110 120 130 140 | 201 210 220 230 |
| 3 | 210 220 230 240 | 301 310 320 330 |
| 4 | 310 | 410 |

**What it costs:**
- every one of 420 undergraduate ids changes;
- a migration with a 420-entry map, the 95M way (`COURSE_ID_MAP_95M`, `catalogShape()`, `persistence.ts:396–504`);
- the keys of `CROSS_MAJOR_BRIDGES`, `CLINICAL_PRACTICUM_GATE` and `COURSE_DESCRIPTIONS`;
- about 36 test files that hard-code ids.

**And small balance drifts:**
- `courseWeeks` hashes the id for a ±25% spread, so every course's development time changes;
- tie-breaks sort by id;
- the run's random stream reshuffles.

95M had to re-baseline for the same reasons.

**What it buys:** numbers that look like a university's. It changes
nothing a player does.

**Proposed: don't renumber.** The cost is a large migration and a
re-baseline for a cosmetic change, in a build that real players' saves
now depend on (0.1.0). If the owner wants the look, the cheaper way is to
change only the **displayed** number, from the tier, and keep the ids:
`courseCode(id)` maps 210→310 and 310→410 for display, in one place. No
migration, no drift. Its one catch: a player who exports a save sees the
old codes in the file.

### The MD's clinical courses, without growing the catalog

The MD has twelve courses. MED550 *Global & Public Health Systems* sits
beside MED540 *Evidence-Based Practice & Population Medicine*: both are
public health, both are middle courses, and both need MED501 alone.

**Proposed:**
- **MED550 becomes *Internal Medicine*,** at the same id and the same
  prereqs. A retitle at the same id needs no migration, since
  `refreshAuthoredText` rewrites titles and descriptions on load.
- **MED610's sentence** names pediatrics and obstetrics as its clerkship
  rotations, as it does now.

The catalog stays at 473. One catch: a professor whose career record
lists MED550 is then credited with "Internal Medicine". The PR checks
whether that matters, and if it does, gives the career record its own copy
of the title at the time it was taught.

## 2. Decisions for the owner

| # | Question | Proposed |
|---|---|---|
| 1 | Renumber the undergraduate courses? | **No.** If the look matters, renumber the **display** only (tier 3 as 3xx, tier 4 as 410), ids unchanged. |
| 2 | The MD's internal medicine | **Retitle MED550** as *Internal Medicine*; pediatrics and obstetrics stay as MED610's rotations. |
| 3 | Anything else to reorganize? | Nothing found that's worth a migration. The shape (1/4/4/1 per major, seven schools of six) is even and reads well in the Curriculum. |

## Rules for every PR in this plan

- **No course id changes** unless decision 1 is "renumber the ids". Then
  the PR follows 95M's migration exactly, with a fixture from 0.1.0.
- **The catalog's size stays at 473.**
- **Each PR runs `npm run check` and `npm run test:slow`.**

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | This plan | — |
| B | MED550 as Internal Medicine | decision 2 |
| C | Display numbers by tier (only if decision 1 asks for it) | decision 1 |

### PR 102B — MED550 as Internal Medicine

- Rewrite the title in `techData.ts` and the sentence in
  `courseDescriptions.ts`, and keep MED610's sentence naming the
  rotations.
- Check the career record's title (§1), and the Curriculum's MD row.
- `docs/design/curriculum.md`'s MD list.

**As implemented.**

- **MED550 is *Internal Medicine*,** taught from **Clinical Health** (it was
  Public Health), at the same id and prereqs. Its sentence: "Reasons
  through the adult patient's complaint to a diagnosis, across the heart,
  lungs, kidneys, and gut, and writes the plan a ward team rounds on each
  morning." MED610's sentence still names pediatrics and obstetrics as
  its rotations.
- **A saved run:** `refreshAuthoredText` already gives every course the
  catalog's title on load. It now gives a course not yet started
  (locked or available) the catalog's field too, by the rule it already
  keeps for weeks. A MED550 under way or taught keeps Public Health, so
  its instructor isn't orphaned.
- **The career record** keeps course ids, not titles, so a professor who
  taught MED550 before now reads as having taught Internal Medicine. The
  record is read only by the Faculty tab, and the MD opens late, so the
  record keeps no copy of the old title.
- `docs/design/curriculum.md` has no MD list, so nothing changes there.
- **Tests:** `internal-medicine.test.ts` covers a new run and a saved
  MED550, both available and under way. The catalog stays at 473.
- **Balance** (`npm run sim`, on 101C's baseline): ranks within 5 places
  and prestige within 2.2 points. The job market weighs each field by the
  courses that ask for it (`candidateListingWeights`), so moving one
  course from Public Health to Clinical Health reshuffles the stream from
  the first week. The scorecard reads 82 of 115, as under 101C. The
  baseline is re-recorded.

### PR 102C — Display numbers by tier

*Not built: decision 1 kept the numbers as they are.*

- `courseCode(id)` shows a course's code from its tier: 101, 1x0, 3x0 and
  410.
- Every place that prints a code goes through it: the Curriculum, the
  course drawer, letters, the person page and the log.
- Ids, saves and the sim are untouched. A test checks that no printed
  code bypasses `courseCode`.

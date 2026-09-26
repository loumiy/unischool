# Plan 68 — Pacing the catalogue for every player

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answer

After Plan 67 the owner asked whether players who price at "fair" (the
guided player, the Completionist) also finish everything else around year
25, or only enrollment. The answer was everything. Every player, the natural
line included, founded all 42 majors by year 5–6 and taught all 378
undergraduate courses by year 7–9. Only prestige and rank were paced.

The owner accepted new targets and asked for the tuning:

- **The four measures, for every player,** each at its own price. A player
  at "fair" may fill a little sooner than the high-price natural line.
- **The catalogue, the same for every player:**

  | Measure | Target year |
  |---|---|
  | Programs: half founded | 12–18 |
  | Programs: 90% founded | 30–36 |
  | Courses: half taught | 15–20 |
  | Courses: 90% taught | 34–40 |
  | Schools founded: 1st / 4th / 7th | 3–6 / 12–18 / 26–34 |
  | Schools distinguished: 1st / all | 8–14 / 32–38 |
  | Graduate courses: first / all | 15–20 / 36–42 |
  | Something still being added | at least until year 35 |

- **Guardrails:**
  - *Buffer:* the guided player reaches at least 85% of the natural line.
  - *Price matters:* charging less buys at least 10% more students, and
    charging more buys at least 25% more net.
  - *Welfare:* no satisfaction attribute under 50 after year 5.
  - *Money:* the cash pile, watched.

## 1. The PR

**The scorecard** (`sim/pacing.ts`):
- It plays three players on three seeds, about four minutes. Any harness
  player is read through one tracker, `trackYears`.
- It holds 111 targets. `npm run natural -- --pacing` writes it; this
  commit's is `docs/reviews/2026-09-pacing-catalogue.md`.
- The baseline on `main` met **59 of 111**. This PR meets **86**.

**The levers:**

| Lever | Was | Now |
|---|---|---|
| **New majors come at a pace** (`programOffers.ts`, new) | 3 offers, refilled the moment one was founded | The founding programs + 9 more at once, then **one more every 54 weeks**. The offer never holds more than the college may yet found. |
| **One school at a time** (the offer draw) | At least one offer always from an unstarted school | While a started school has majors left, the draw is confined to the schools under way. Discovery (an unstarted school on the table) comes once every started school is complete. |
| **The curriculum committee** (`techSystem.ts`, new) | Unlimited courses in development | **4 undergraduate courses at once**. Graduate courses are not counted. |
| **The health chain** (`facilitiesData.ts`) | Gym behind the Recreation Center, a social building | **Gym behind the Health & Counseling Center** |
| **Applicant line** (`admissionsSystem.ts`) | 490 applicants a point above prestige 30 | 490 a point above **24** |
| **Prestige climb cap** | 2.0 points a summer | **2.1** |

The two paces need no save change: the allowance is read off the clock and
the committee off the courses in development.

**Why each lever:**
- *One school at a time.* Without it, a trickle of new majors scattered
  across all seven schools, and no school was founded until year 17–24.
  That meant no labs, no concentration and slow prestige.
- *The health chain.* Plan 65 found it: health sat under 50 for years
  because the way to a gym ran through a social building.
- *The applicant line.* With fewer programs early, the natural line's early
  enrollment was demand-limited. This keeps its early years on target.
- *The climb cap.* It offsets the later schools' drag on the prestige
  target.

**What the player sees:**
- The Curriculum tab's "What next" panel says how many majors are approved
  and when the next can be founded.
- The same panel says when the committee's seats are full.
- A hall's panel says when the next new major is due.
- The ladder's Recreation Center line no longer promises the fitness chain.

**The harness:** the natural and guided players hired an instructor
whenever a course would not start. A full committee is not a hiring
problem, so they now hire only when faculty is what blocks the course.

**Tests:** `test/program-offers.test.ts` now checks the new rules:
- one school at a time, on each new draw;
- discovery once none is under way;
- the allowance, and one more major after `WEEKS_PER_NEW_MAJOR`.

`sim/baseline.json` is re-saved.

## 2. What the runs look like now

Medians of three seeds, before → after.

**The natural line** (high price):

| Year | Students | Programs | Courses | Schools | Prestige | Rank | Net/wk |
|---|---|---|---|---|---|---|---|
| 5 | 2.2k → 2.9k | 40 → 16 | 136 → 83 | 5 → 0 | 62 → 62 | 53 → 51 | $0.7M → $1.0M |
| 10 | 6.8k → 6.2k | 42 → 21 | 373 → 142 | 7 → 0 | 76 → 74 | 37 → 33 | $1.9M → $2.4M |
| 20 | 18.4k → 16.7k | 51 → 31 | 378 → 241 | 7 → 2 | 104 → 101 | 12 → 14 | $7.0M → $7.4M |
| 30 | 26.2k → 25.5k | 52 → 49 | 378 → 348 | 7 → 6 | 128 → 127 | 4 → 7 | $12.4M → $11.4M |
| 40 | 32.9k → 33.6k | 52 → 52 | 378 → 378 | 7 → 7 | 147 → 146 | 1 → 1 | $15.4M → $15.8M |
| 50 | 33.6k → 34.5k | 52 | 378 | 7 | 150 | 1 | $17.3M → $17.4M |

**The Completionist** (fair price; the guided player's run is similar):

| Year | Students | Programs | Courses | Schools | Prestige | Rank | Net/wk |
|---|---|---|---|---|---|---|---|
| 5 | 6.9k → 5.2k | 34 → 16 | 144 → 65 | 2 → 1 | 60 → 62 | 54 → 52 | $0.9M → $0.8M |
| 10 | 21.6k → 10.6k | 42 → 21 | 378 → 132 | 7 → 3 | 74 → 76 | 36 → 36 | $3.1M → $1.3M |
| 20 | 34.5k → 21.4k | 52 → 35 | 378 → 250 | 7 → 5 | 103 → 105 | 13 → 12 | $2.1M → $1.5M |
| 30 | 34.5k → 29.0k | 52 → 45 | 378 → 339 | 7 → 6 | 127 → 130 | 6 → 3 | $0.7M → $1.2M |
| 40 | 34.5k → 31.4k | 52 → 51 | 378 → 378 | 7 → 7 | 146 → 147 | 1 → 1 | $1.0M → $1.1M |
| 50 | 34.5k → 34.5k | 52 | 378 | 7 | 150 | 1 | $1.8M → $1.9M |

- **The catalogue fills over about thirty years for every player, not
  five.**
  - About 21 programs at year 10, 31–35 at year 20, and 45–49 at year 30.
  - Courses 130–140 at year 10, 250 at year 20, and 340–350 at year 30.
- **The fair-price players' seat ceiling** comes at year 35–40, not 17–20.
  So their enrollment is now paced too: 10.6k at year 10, 21k at year 20,
  29k at year 30.
- **The natural line** is where Plan 67 left it on enrollment, prestige,
  rank and net, now with a catalogue it is still building until year 35.
- **Welfare holds:** no attribute under 50 after year 5, from about 8
  years of it before.

## 3. The 25 misses

- **The fair-price players' net shape** (7 rows, structural). At "fair",
  revenue barely covers costs that grow with size. Their net is $1–2M a week
  all game: it reaches half its growth by year 5–7 and dips year to year.
  Pacing cannot shape a flat line; it would take a price or cost redesign.
  The natural line's net passes.
- **The natural line's schools** (3 rows). Its first school is founded at
  year 13 (target 3–6), the fourth at 21 (12–18), and the first
  distinguished at 17 (8–14). This is the owner's rule 4: the natural line
  does not sort programs into schools' halls until seven halls stand, and
  Founders Hall is no school's home until then. The guided player and the
  Completionist found their first at year 2–7.
- **Courses and programs finish a few years early** (8 rows).
  - *Courses:* 90% taught at year 29–33, target 34–40.
  - *Programs:* 90% founded at 28–29, target 30–36.
  - Slowing either (a 3-seat committee, longer courses, or a slower
    allowance) delayed the natural line's schools, distinction and prestige
    more than it helped. 4 seats and 54 weeks was the best balance of about
    a dozen tried.
- **The guided player stops short.** Its catalogue rows (programs 90% at
  28, courses at 27, all seven distinguished never, graduate courses at 26)
  read its own year 50, which ends at 48 programs and 347 courses. It stalls
  because it spends its money on research initiatives, and its 8-week cash
  reserve then blocks hiring the instructors the last courses need. That is
  the harness player's rule, not the game's. Its buffer still passes, at
  30.1k students against the natural line's 34.5k (87%).
- **Price matters, enrollment** (1 row, structural). Every player ends at
  the same 34,480-seat ceiling, so a fair price cannot buy 10% more students
  at year 50. It buys them earlier: 10.6k against 6.2k at year 10. The net
  side passes (natural $17.4M against $1.9M a week).
- **At the edges** (4 rows):
  - *Natural rank at year 30:* 7 (target 2–5).
  - *Natural net growth in years 1–10:* 14% (target 15%).
  - *Natural net falls:* 1 two-year fall (target 0).
  - *Completionist prestige 90%:* year 35 (target 36).
  - *Completionist graduate courses all:* year 44 (target 36–42).

**For the owner:**
- *The natural line's late schools* are its own rule 4 meeting paced majors.
  Sorting at, say, four halls would found its schools a decade earlier.
- *The fair-price economy is flat.* Whether a college at "fair" should ever
  grow its net is a design question, not a pacing one.
- *Money still piles up* for the natural line: $33B at year 40 (watched).

**As implemented:** about fifteen tuning passes in a scratch loop, each
running the nine fifty-year runs four at a time (about 95 seconds). What was
tried and dropped, besides the tunings above:
- A three-seat committee: it held the natural line's schools until the late
  30s.
- Longer course development (5/14/29 weeks): same effect.
- A front-loaded allowance (12 opening majors, then one every 60 weeks): no
  better than 9 and 54.

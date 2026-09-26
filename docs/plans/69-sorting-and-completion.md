# Plan 69 — Earlier schools, and everything built by year 50

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answer

Plan 68 left two questions for the owner. The owner's answers:

- **The natural line's late schools.** "Yes, start sorting earlier." The
  natural line now sorts its programs into schools at four academic halls,
  Founders Hall included, not seven.
- **The fair-price economy is flat.** "Fine with flat net for fair pricing
  as long as they can still reach #1 and build everything by year 50."
  - The fair-price players' net-shape rows are now watched, not counted.
  - Two new rows for every player check the condition: rank #1 at year 50,
    and nothing left to build at year 50.

## 1. The PR

**The natural line** (`sim/harness/natural.ts`):
- `SORT_AT_HALLS` is 4, not 7.

**The scorecard** (`sim/pacing.ts`):
- For the guided player and the Completionist, the net rows are watched and
  shown in brackets. These are half its growth, 90% of its growth, and
  second straight falls.
- Two new rows for each player:
  - *Rank at Y50*: at most 1.
  - *Left to build at Y50*: at most 0. It counts every major and graduate
    program not yet housed, every course not yet taught, and every school
    not yet distinguished.
- The total stays 111 counted rows.
- This commit's scorecard is `docs/reviews/2026-09-pacing-sorting.md`. The
  natural line's year-by-year run is
  `docs/reviews/2026-09-natural-play-sorting.md`.

**The guided player** (`sim/harness/guided.ts`). With the new rows, the
guided player ended 47–96 items short on two seeds. The game was not the
cause; the Completionist, also at "fair", built everything. The cause was
the harness's money sense:
- It funded each research initiative the line asked for down to a
  two-week reserve.
- Its own spending (courses, hires, graduate programs) waited for an
  eight-week reserve, about $190M at year 40, that a college at "fair" never
  holds.
- A year-44 probe found 18 courses ready to start, a free committee, and
  eligible instructors, while it sat at $59M against a $97M reserve.

The changes:

| Rule | Was | Now |
|---|---|---|
| Reserve for its own spending (`RESERVE_WEEKS`) | 8 weeks' expenses | **3** |
| Research the line asks for | Funded down to the ask's 2 weeks | Funded only above **5 weeks** (`RESEARCH_RESERVE_WEEKS`) |
| Saving for an unaffordable ask | Freezes all spending | Never for a research ask |
| A course waiting on a field nobody is listed in | Waits on the market | **Posts a faculty search** |
| A building a waiting course needs | Only if the line asks | Built when it opens, like a lab |

The game is unchanged: no save change, and no tuning constant moved.
`sim/baseline.json` is re-saved.

## 2. What the runs look like now

Medians of three seeds. Schools are shown as founded / distinguished.

**The natural line** (high price), Plan 68 → Plan 69:

| Year | Students | Schools | Prestige | Rank | Net/wk |
|---|---|---|---|---|---|
| 10 | 6.2k → 6.9k | 0 → 3 | 74 → 76 | 33 → 34 | $2.4M → $2.5M |
| 20 | 16.7k → 18.4k | 2 → 5 | 101 → 104 | 14 → 12 | $7.4M → $8.1M |
| 30 | 25.5k → 28.4k | 6 → 6 | 127 → 129 | 7 → 4 | $11.4M → $12.6M |
| 40 | 33.6k → 33.5k | 7 | 146 → 147 | 1 | $15.8M → $16.0M |
| 50 | 34.5k | 7 | 150 | 1 | $17.4M → $17.0M |

- The first school is founded at year 3, not 13; the fourth at 13, not 21.
  The seventh is still at 32.
- With its schools, labs and concentration come earlier. The natural line
  is a little ahead at years 20 and 30, and its year-30 rank (4) is now in
  the 2–5 band. It is first #1 at year 34, one year sooner.

**Every player at year 50:**

| Player | Price | Rank | Left to build | Everything built by |
|---|---|---|---|---|
| Natural | high | 1 | 0 | Y35 |
| Guided | fair | 1 | 0 | Y36–37 (Plan 68: never; 48 programs and 347 courses at Y50) |
| Completionist | fair | 1 | 0 | Y38–43 |

The guided player now reaches 34.5k students by year 40, where it was 30.1k
at year 50. Its buffer is 100% of the natural line's.

**Scorecard: 96 of 111** (Plan 68's 86, before the net rows were watched
and the new rows added).

## 3. The 15 misses

- **The natural line's first distinguished school** (1 row): year 17,
  target 8–14, as in Plan 68. Its schools are founded a decade earlier
  now, but the first is not distinguished any sooner.
- **The catalogue's pace** (5 rows), as in Plan 68:
  - courses 90% taught at year 29–31 (target 34–40), for all three players;
  - the natural line's graduate courses all at year 35 (target 36–42);
  - the natural line's programs half founded at year 19 (target 12–18),
    a year late.
- **At the edges** (8 rows):
  - enrollment or prestige 90% at year 35 or 31, a year early (natural,
    guided, Completionist);
  - the guided player's top 10 at year 26 (target 20–25);
  - the natural line's year-30 enrollment share (81.x%, band 81%), net
    over year 40 (11%, band 10%), and first-decade net (14.x%, band 15%).
- **Price matters, enrollment** (1 row, structural, as in Plan 68): every
  player ends at the same 34,480-seat ceiling.

**Watched:**
- The fair-price players' net reaches half its growth by year 5–7 and falls
  two years running 11–19 times. The owner accepts this as long as they
  still reach #1 and build everything, and both hold on every seed.
- The natural line's cash is two decades of expenses at year 40.

**As implemented:**
- Sorting at four halls alone moved the scorecard from 86 to 87 of 111 under
  the new rows.
- The guided player's money sense took four passes:
  1. The faculty search and the waited-on buildings did not help.
  2. A four-week reserve left one seed stalled from year 34 to 40.
  3. Research paid from above the background reserve left one item unbuilt
     on one seed at year 50.
  4. A three-week reserve with research above five weeks finished every
     seed by year 37.

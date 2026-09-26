# Plan 71 — Money paces the first half; teaching earns the top

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The owner's asks

Raised from a playthrough, before continuing Plan 70:

- **Offers.** "2 courses from schools you've already started, and one from a
  new school, for as long as that setup is possible." Plan 68's offers stayed
  inside started schools until each was complete.
- **No artificial growth limits.** Plan 68's allowance of new majors (nine,
  then one every 54 weeks) goes. The curriculum committee stays, as
  bandwidth the college has, and is shown: four seats, one more at prestige
  70, 80, 90 and 100.
- **Money is the limit for the first half of the game.** Net $/wk at year 50
  is the wrong yardstick, since money grows exponentially. The levers:
  - applicants that scale with prestige and trickle in early;
  - dearer later-stage courses and buildings;
  - higher running costs;
  - longer construction.
- **Over-admitting backfires.** A campus that cannot house, feed or care for
  its students shrinks next year's pool until it can, then grows back.
- **Academic satisfaction is teaching.** Mostly course quality, which starts
  low and rises as teachers improve; the library a smaller part. It reaches
  100 only late, with nearly every course an A, and better students demand
  better teachers.
- **Prestige is teaching too.** "You don't become a highly prestigious
  school with mediocre teaching." Building everything with no regard to
  teaching reaches the top 25; climbing further takes hand-picked professors.
- **The price gap** (asked mid-plan). A college charging just short of the
  red tier made 5–10× the net of one at "fair", so no one price list paced
  both. The owner chose to make a high price cost more applicants.
- **The scorecard** (asked mid-plan). The owner chose to reset the rows the
  removed allowance had set (programs and schools founded).

## 1. The PR

**Curriculum** (`programOffers.ts`, `techSystem.ts`, `CurriculumTab.tsx`):

- **Offers:**
  - two from started schools and one from a new school, while both kinds
    remain;
  - among started schools, weight is majors housed squared, so schools fill
    one after another rather than all at once;
  - the allowance of new majors is removed.
- **Committee:** `committeeSeats` is 4, plus one at each of prestige 70, 80,
  90 and 100. The "What next" box shows every seat:
  - busy, with the course, its progress and weeks left;
  - open;
  - locked, with the prestige that opens it.

**Prices and build times** (`techData.ts`, `facilitiesData.ts`,
`campusData.ts`). Details are in
[economy.md](../design/economy.md#the-catalogues-price-plan-71).

- **Courses:**
  - list price per tier: $300k / $900k / $2.2M (was $80k / $180k / $400k);
  - upkeep a week: $300 / $800 / $1,800;
  - graduate courses: $9M / $6M.
- **Catalogue price scale:** every undergraduate course on offer raises the
  price of every one not yet started by 0.3% (`repriceCatalogue`). A started
  course keeps its price, and graduate courses keep their list price.
- **Academic halls:** $2.5M × 1.45 per rung, taking 26 / 36 weeks.
- **Labs:** $3M, 26 weeks.
- **Dorms and facilities:** construction takes 1.3× as long.

**Demand** (`admissionsSystem.ts`, `resolveAdmissions.ts`, `cohorts.ts`):

- **Prestige pool:** 1,000 + 55,000 × ((prestige − 24) / 116)^1.5. That is
  a third of Plan 67's line at founding and the same pool at prestige 140.
- **Overcrowding:**
  - the year's crowding shortfall multiplies the next pool by
    (1 − shortfall)^2.5, floored at a tenth;
  - it is a seventh funnel factor, named in the year-over-year line;
  - crowding reads beds, dining, health and class seats. The library and
    social space no longer count: an unbuilt library is a shortage, not
    crowding.
- **Overpricing:** past the price tolerance the price factor is
  exp(−ratio − 0.75 × (ratio − 1)). At or under the tolerance nothing
  changes.

**Teaching** (`satisfactionSystem.ts`, `prestigeSystem.ts`, `HistoryTab.tsx`):

- **Academic satisfaction:**
  - teaching is 80 points, the library 20;
  - each course is measured against a standard: an A for an ordinary
    intake, rising to A + 8 for the best students;
  - a course earns nothing at a C, and the mean is squared.
- **Prestige's teaching ceiling:**
  - grade points (A 1, B 0.65, C 0.35, D 0.1) set a cap of
    88 + 62 × mean^1.3 on the target;
  - the History tab names it and says when it binds.

**The harness** (`sim/harness/`):

- **Teaching:**
  - `tendTeaching`, every four weeks: move a course below an A to a
    better-placed instructor, hire a candidate who will teach it at an A,
    and let go anyone idle for eight years;
  - hires take the best teacher, not the cheapest.
  - `TEACHING.care` turns all of this off: the teaching-blind line.
- **Crowding:** `relieveCrowding` builds for the worst crowded need first,
  and the guided player and the Completionist save for it.
- **Completionist:**
  - holds two weeks' expenses, not four (at four it sat on $89M with 26
    courses ready and nothing in development);
  - builds capital projects before the cheapest facility.

**The scorecard** (`sim/pacing.ts`, `sim/natural.ts`):

- **Teaching-blind rows:** the guided player with `TEACHING.care` off, on
  the same three seeds:
  - rank at year 50 between 11 and 25;
  - nothing left to build.
- **Group 1 reset.** Programs half and 90% founded, and schools first,
  fourth and seventh founded, each get a band per price, since a fair-price
  college founds a decade earlier than a high-price one:

| Row | High price | Fair |
|---|---|---|
| Programs: half founded | Y15–23 | Y6–14 |
| Programs: 90% founded | Y25–33 | Y22–32 |
| Schools: the first founded | Y8–13 | Y3–10 |
| Schools: the fourth founded | Y14–23 | Y6–15 |
| Schools: the seventh founded | Y17–25 | Y8–18 |

`sim/baseline.json` is re-saved. The scorecard is
[`2026-09-pacing-economy.md`](../reviews/2026-09-pacing-economy.md). The
natural line's year-by-year run is
[`2026-09-natural-play-economy.md`](../reviews/2026-09-natural-play-economy.md).

**Saves:**
- `FunnelFactors.crowding` is optional.
- Course prices re-list on the first tick after loading.
- No version bump.

**Tests:**
- New:
  - `crowding-pool.test.ts`: the pool factor and overpricing;
  - `teaching-standard.test.ts`: committee seats, the academic standard,
    the ceiling and the catalogue price.
- Updated: offers, standing readings, consequences, the intake ceiling,
  class pricing and the year-over-year reveal.

## 2. What the runs look like now

Medians of three seeds.

| Player | Price | Half the courses | Last thing built | #1 first | Y50 rank | Blind Y50 rank |
|---|---|---|---|---|---|---|
| Natural | high | Y19 | Y47 | Y36 | 1 | — |
| Guided | fair | Y15 | Y47 | Y36 | 1 | 16 |
| Completionist | fair | Y16 | Y39 | Y35 | 1 | — |

- **Satisfaction:** academic satisfaction starts around 40–60, reaches the
  70s by year 10 and 90–95 late for a teaching-caring college. With strong
  students it holds in the high 70s even at 90%+ A's.
- **Teaching-blind colleges** sit in the 30s–40s.
- **Net per week at year 50:** the high-price line's is 3–5× a fair
  college's (it was 5–10×). It enrolls about 21k to their 34.5k.

**Scorecard: 76 of 114.** Plan 69's 96 of 111 was against targets set under
the allowance.

## 3. The misses, and why they stand

- **The high-price line's first two decades** (checkpoints at years 10–30,
  first-decade growth, half its growth). The trickle and the overpricing
  penalty stack: 1.3k students at year 10, 5k at year 20. It then grows
  fast, 43% of its enrollment in years 20–30. This is the owner's trickle
  at a price the market does not support. Moving these checkpoints is a
  question for the owner, not this plan.
- **The courses fill by year 24–26** (target 34–40) for every player. Once
  money stops binding (year 20–25), the committee's five to eight seats
  write the rest in a few years. The first half is paced as asked; the
  target assumed Plan 68's allowance paced the second too.
- **Schools distinguished and graduate courses:**
  - the first distinguished school comes at 18–26 (target 8–14);
  - all graduate courses at 44–49 for the natural line and the guided
    player (target 36–42): graduate programs wait on a school's whole
    curriculum.
- **Prestige at years 40 and 50** (144–146 against 145 and 149.5). The
  ceiling asks for A's everywhere to reach 150, and the harness holds
  80–90%.
- **Watched:** the fair-price players' flat net, and Financial strength.

## 4. As implemented

- **Early tuning passes** (40 → 76 of 112–114):
  - list prices alone either starved the fair-price players (at 4–5×) or
    left the high-price line flush from year 12;
  - the catalogue price scale at 0.6% a course left the fair players 60–110
    items short, so it went to 0.3%, with graduate courses exempt.
- **The teaching ceiling:**
  - with a floor of 95, no harness player reached #1 until they tended
    their teaching;
  - `tendTeaching` first looked only at the twelve weakest courses, which
    sat in thin fields with no candidates;
  - its hires were held back by the harness's own four-week reserve;
  - the floor went to 88 once the teaching-blind line was measured (at 95
    it touched #6).
- **Overcrowding** without `relieveCrowding` kept the fair players at a
  quarter of their pool for a decade.
- **Overpricing** at 2.0 left the high-price line at 600 students at year
  10 and unfinished at 50; 0.75 keeps it finishing and #1.

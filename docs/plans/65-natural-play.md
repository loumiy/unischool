# Plan 65 — The natural line of play

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner described the line of play they think a new player naturally
falls into, and asked for a player that plays it and a report on the run:

1. Any satisfaction level under 100 that something can be done about: do it.
2. Develop as many programs as possible without a candidate search. While
   waiting for program slots, develop existing programs deeper; once
   breadth is exhausted, keep going deeper. A course gated by a building
   gets the building.
3. At admissions, raise tuition to the highest level still below the red
   sticker-shock tier. Accept every club petition.
4. Once seven academic halls stand, Founders Hall included, sort programs
   to establish every school.
5. Accept every varsity petition, build its venue at once, hire its staff.
6. In every lab, fund the highest-level initiative that would leave no
   course without an instructor.

The report: every year's enrollment, applicants, net per week, programs,
prestige and satisfaction; the campus assets never built; research grants
received against what the initiatives cost; the final score.

Asked, the owner chose:

- **Money:** spend to zero. Anything a rule calls for is bought if the cash
  covers it.
- **Buildings no rule names:** build everything available: labs, capital
  projects, the landmark, graduate programs.
- **Halls:** the next academic hall as soon as it is affordable whenever
  an offer has no slot.
- **The report:** a markdown file in the repo, plus a summary in chat.

## 1. The PR

- **The natural player** (`sim/harness/natural.ts`): the six rules in that
  order each week, then everything else on the build menu. A satisfaction
  building counts as "something you can do" only if it would raise the
  attribute, measured on the game's own `computeSatisfactionBreakdown` with
  the building (or story) finished, and nothing more is bought for an
  attribute while one is going up. "Without a candidate search" means
  market hires only, never `POST_SEARCH`. Tuition is the highest $500 step
  in the `expensive` tier (at most 1.6× `priceTolerance`), or the board's
  floor. `--player natural` works in `npm run scenario`.
- **The report** (`sim/natural.ts`, `npm run natural`): one fifty-year run
  written as markdown (`-- --seed N`, `-- --name X`, `-- --out file.md`).
  `docs/reviews/2026-09-natural-play.md` is seed 12345.
- **A check:** `test/archetypes.test.ts` plays the natural player fifty
  years on one seed. The rules must hold every quarter, and every school
  must be founded. The slow job goes from 109 s to 154 s.

**As implemented:**

- *Rule 4 needed a move the game never suggests.* On two of three seeds
  the first version stopped at 21–23 programs from year 6 for good. Science
  held two halls (Founders Hall and Hall 6), Computer Science had none, and
  every offer left was Computer Science. `suggestedMove` only brings strays
  home, so it saw nothing to do, and offers change only when one is founded.
  The player now merges a school split over two halls when another school's
  offer has nowhere to go. With that, all three seeds reach 52 programs.
- *Dark courses are restaffed* (`RESTAFF`, payroll and market), though no
  rule names it. Since Plan 59 an unstaffed program seats nobody, and the
  next-step line asks for it first.
- *Things no rule names take the game's default:* the admit rate as the
  screen opens it, promises (all declined), decision events, the athletic
  director. Venue expansions are not bought. Restricted gift money pays for
  a building when it covers the whole cost.

## 2. What the run says

Seed 12345, Blackmoor University. Seeds 4242 and 777 tell the same story
within a point.

- **The final score: B · 68**, rank 1 of 100. The three seeds score 68,
  69 and 68.
  - *Academics, Research and Campus life are all A;* Athletics is C.
  - *Access and Financial strength are both F,* and they cost the grade.
    Access is F because the price sits at the top of the amber tier, so the
    affordability half of the axis is zero. Financial strength is F because
    it reads only endowment per student, and no rule moves cash into the
    endowment: the college ends with **$65.7B in cash** and a $69M
    endowment, about $2,000 per student against the $80,000 the axis
    wants.
- **The line runs away with the game.**
  - *Rank:* 55th at year 1, 3rd at year 10, 1st from year 11 to the end.
  - *Prestige:* reaches the 150 cap by year 40.
  - *Money:* never a week in the red. The operating net climbs to
    $17.5M/wk.
- **Research is a money machine.** $10.4B went into 254 initiatives, and
  1,439 grants paid back $45.7B, 4.4 times as much. The rule of always
  funding the deepest initiative pays better the deeper it goes. Grants
  were $46B of the $78B that came in, against $32B of operating net.
- **Enrollment hits a ceiling.** From year 20 there are 34,480 students
  against about 100,000 applicants. The catalog's seats cap the intake at
  52 programs, all of them founded by year 20.
- **Health is the one attribute the line cannot hold** (years 8–13, as low
  as 40). The only health building on offer is the Health & Counseling
  Center:
  - The gym, pool and tennis courts sit behind the Recreation Center, which
    counts as a social building. Social was at 100, so rule 1 never built
    it.
  - The clinic waits for 6,000 students and the Medical Center for 20,000.
  - Enrollment doubles each year from year 9, so each unlock arrives after
    the need.

  Housing and basic needs dip once each, while buildings are going up.
- **Never built.** Everything else on the build menu went up.

  | Building | Serves | On the menu? |
  |---|---|---|
  | Field House | social | yes |
  | Athletics Complex | social | yes |
  | Harborview Market | basic needs | yes |
  | Meridian Tower | housing | yes |
  | Central Dining Pavilion | basic needs | never offered |
  | Beacon, Horizon and Aurora Towers | housing | never offered |
  | The Great Dome and the Triumphal Gate | grand landmarks | closed when the Campanile was chosen |

  Social stayed at 100 without the Field House or the Athletics Complex,
  so the building that lifts every athletics program is never needed by a
  player reading satisfaction.

**For the owner:**

- *The split-school trap is the game's,* not the player's. A player who
  follows the sorting suggestions can lock a school out for good. Fixes:
  `suggestedMove` could merge a school that holds two halls when another
  school has an offer and no hall, or offers could refresh.
- *The Recreation Center gates the health chain but reads as social,* so a
  player fixing health cannot see the way to it.
- *Grants outrun the cost of research four to one,* and cash has nowhere to
  go. Together with Plan 63's hoarding finding, money is the axis that
  needs a sink or a cap.

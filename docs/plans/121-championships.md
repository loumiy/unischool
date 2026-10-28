# Plan 121 — Championships

*The owner's note (28 October 2026): "championships are really hard to
come by. In a non-athletics-specialized school, I was seeing about 1
title every 10 years when I had 20 teams, maximum upgrades on venues,
maximum AD budget, very good coaching, maximum scholarships. It felt too
difficult. I do think the venue upgrades can be made more expensive, as
maxing out the athletics investment doesn't feel like a big hurdle in the
late game." With F9 ("athletics") and F10 ("harder than one would expect
even after focusing on it", "you can only win 2 titles per year"). Part
of 0.2.0 (see [Plan 118](118-0-2-0-fixes-and-words.md)).*

**Status: Landed (28 October 2026), on `claude/stoic-ride-wge7g3`.** The
owner left the specialist as it is, and chose venue prices that scale with
the college.

- **A, as implemented:** the harness's department (`sim/harness/athletics.ts`)
  now also expands every venue its programs play in, once the money is
  there. Titles per run and in Years 30–50, the Guided player held to each
  path (`npm run sim -- --players "^Guided, (unspecialized|athletics)$"`):

  | Edge (QF, SF, F) | Seeds | Unspecialized, Y30–50 | Specialist, per run |
  |---|---|---|---|
  | 8, 20, 35 (before) | 1–10 | 0.6 (venues not expanded), 0.3 (expanded) | 56 |
  | 4, 10, 18 | 1–10 | 4.9: one every 4.1 years | not run |
  | 2, 6, 12 | 1–10 | 6.9: one every 2.9 years | not run |
  | **1, 4, 10** | 1–10 | **7.7: one every 2.6 years** | not run |
  | **1, 4, 10** | 11–20 | **7.2: one every 2.8 years** | 49.5 at 2, 5, 9; **57.0 at 1, 4, 9** |

- **B, as implemented:** `STAGE_EDGE` is 1, 4 and 10. The specialist's
  edge was a quarter of the old one (2, 5, 9), which the new unspecialized
  edge undercut in the first two rounds, so it is now capped by it: 1, 4
  and 9 (`SPECIALIZED_STAGE_EDGE`). The specialist wins 49–71 titles a run,
  above Plan 85G's 25–40, as it already did before this plan (39–75): the
  owner's call whether to bring it down.
- **C, as implemented:** an expansion costs its fixed price or one, two
  and four weeks of operating cost by rung, whichever is more
  (`facilitiesData.ts`'s `VENUE_EXPANSION_OPEX_WEEKS`). What was paid is
  stored (`expansionsPaid`) so upkeep reads it; an older save's
  expansions read the fixed price. The harness's median cash at Year 45
  falls from about $1.5B to $600M. With the dearer venues, the
  unspecialized department at 1, 4 and 10 wins 5.9 titles in Years 30–50
  on seeds 1–10 and 10.0 on seeds 11–20: 7.95 across the twenty, one about
  every 2.5 years. The specialist wins 56 a run (41–72).
- **D, as implemented:** nothing caps titles at two a year. Each fielded
  sport plays its own bracket. What a player meets is the odds, and the
  flagships: the high subsidy names six (and the complex two more), and the
  rest are funded at 60%, so about six of twenty programs can contend.
- **E, as implemented:** the specialization's help and its card no longer
  say titles are rare or that the specialist faces a quarter of the edge.

---

## 0. Why titles are so rare

In the postseason, an unspecialized college's opponent plays 8, 20 and 35
points stronger in the quarterfinal, semifinal and final
(`playoffs.ts`'s `STAGE_EDGE`). At 25 points of difference the stronger
side wins three times in four (`SPREAD`). So against an equal team the
college wins about 32%, 13% and 4% of its rounds: about one title in 600
seasons per sport. With 20 teams that is a title every 10 to 30 years,
which is what the owner saw.

The specialist keeps a quarter of the edge (`SPECIALIZED_STAGE_SHARE`),
and the Athletic Performance Complex takes a little more off. That path
was tuned to 25–40 titles a run (Plan 85G).

## 1. The targets (the owner)

| College | Late game, athletics maxed | Titles |
|---|---|---|
| Not specialized in athletics | 20 teams, top venues, top AD budget and scholarships, good coaches | **one every 2–3 years** |
| Specialized in athletics | as above, with the complex | 25–40 a run, as now |

## 2. The PRs

| PR | Change |
|---|---|
| A | **Measure first.** Sim scenarios for a maxed unspecialized program and a specialist, 20 seeds each, counting titles per decade. Recorded here before any number changes. |
| B | **The stage edge.** Lower `STAGE_EDGE` for the unspecialized college (a starting point: 4, 10 and 18) until scenario A's maxed program lands on one title every 2–3 years from year 30. The specialist's share and the complex are re-checked against 25–40. |
| C | **Dearer venues.** The top venue tiers cost more (`facilitiesData.ts`'s `VENUE_EXPANSION_COST_GROWTH` and the top tiers' base), so maxing athletics is a real late-game spend. Checked against the late game's typical cash in the sim. |
| D | **Two titles a year.** Find out whether anything caps a college at two titles a year, or whether it's only the odds. If it's a rule, show it where titles are listed. If it's the odds, B answers it. The words in the Athletics tab and the ladder say how titles are won. |
| E | **Words.** The Athletics tab's help and the chapter on the teams say what lifts a team in the postseason, in Plan 111's plain words. Every sentence that states the old odds is rewritten. |

## 3. Open questions

*Decided (the owner, 28 October 2026): both as proposed.*

1. **The second specialization building** (Plan 120 C): if a college can
   build the complex without specializing in athletics, B's targets are set
   both with it and without it.
2. **Balance across pillars.** F10 ranks the specializations Academics,
   Research, Athletics, Student life. After B, the specialist path is
   re-checked so athletics isn't the weakest specialization.

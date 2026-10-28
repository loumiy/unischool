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

**Status: Proposed (28 October 2026).**

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

1. **The second specialization building** (Plan 120 C): if a college can
   build the complex without specializing in athletics, B's targets are set
   both with it and without it.
2. **Balance across pillars.** F10 ranks the specializations Academics,
   Research, Athletics, Student life. After B, the specialist path is
   re-checked so athletics isn't the weakest specialization.

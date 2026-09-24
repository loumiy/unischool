# Plan 31 — The world

*Planning document only. Its job is to turn Phase J of the v2 merge (the
world, `loumiy/unischool-v2`'s `docs/MIGRATION_PLAN.md`) into a sequence of
PRs.*

**Status: In progress.**

---

## 0. The finding

The college already stands in a world: a 100-school field ranked every
year, a graded prestige stock, per-sport rivalries and an elite band that
closes on a leader. What the merge adds is how that world *reads*: what
the college is known for, where it stands on more than one axis, and one
rival that is a story rather than a table row. The owner's decisions
(v2's `docs/V1_ADOPTION_LIST.md`):

| # | Decision |
| --- | --- |
| V1-21 | Prestige stays this game's graded stock, with building condition as a weighted input beside beauty (Plan 26). |
| V1-22 | Six standings in the league: academics, research, student experience, athletics, access, financial strength. |
| V1-23, V1-33 | The field and the top-50 reveal stay; the league table and its charts live in History. |
| V2 #30 | Identity tags: earned and shed over years, shaping the pool, each with small teeth. |
| V2 #31, V1-20 | One rival, who is also the rival in the college's main sport. |
| V1-19 | Athletics: this game's department, with v2's schedule that climbs as the college rises. |
| V1-24 | The defend era, paired with a late tier of capital projects. |

## Rules for this plan

- **Readings first.** Standings and tags are read from the state, with
  their effects small and capped.
- **The one rival is chosen, not added:** the existing field's school
  closest above the college, fixed once the rivalries have a main sport.
- **Capital projects are Phase L's.** The defend era's pairing waits for
  them there.

## PR 31A — The plan

This document.

## PR 31B — Condition in prestige

- **A new prestige input, "Estate condition":** the finished buildings'
  mean condition. It costs up to 4 points below full, and adds nothing at
  full, so a college that maintains its buildings, like the harness,
  is unmoved.

## PR 31C — Six standings

- **Each school in the field is ranked on six axes:** academics,
  research, student experience, athletics, access and financial strength.
  The axes are read from the systems the player's college has; the field's
  schools from their profiles.
- **The History tab gets the league table:** the six ranks, this year and
  charted over the run.

## PR 31D — Identity tags

- **v2's ten tags,** each with an indicator from 0 to 1 read at the turn of
  the year. A tag is earned after two years over its line and shed after
  two under it, at most three at once.
- **Each shapes the pool** (size and quality) **and has small teeth:**
  giving, attrition, beauty, satisfaction or athletics.
- **The cohorts, clubs and Greek life feed them** (V1-14, V1-17, V1-18).
- **Shown** on the Students tab and in the summer's admissions.

## PR 31E — One rival

- **The rival:** the school just above the college in the field when its
  main sport is decided, named in its rivalry and in the rankings.
- **Passing it, or being passed by it,** is announced as the elite-band
  passing already is.

## PR 31F — The schedule climbs

- **The athletics schedule's strength rises with the college's prestige,**
  so a winning record is harder to keep as the college rises.

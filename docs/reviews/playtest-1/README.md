# Playtest 1 — itch.io, November to December 2026

*The first time anyone but the owner plays UniSchool (Plan 97). A quiet
run: the full game, free, on the web, for **about 100 players**, to hear
what they do and say before the text edit, the art and the demo launch.*

**Status:** being set up. The build, the statistics and the feedback form
are in the game (Plan 97 B–F). The page draft is
[`docs/store/itch-page.md`](../../store/itch-page.md); uploading is
[`docs/store/itch-release.md`](../../store/itch-release.md). The owner's
pass ([`checklist.md`](checklist.md)) comes before the page is published.

## What it is for

Three questions only outside players can answer (Plan 97 §0):

1. **How long is a real first run, and where do people stop?** The clock
   gives 3.6 hours at 1× and 1.8 at 2×, plus reading and stops. Steam's
   refund line is two hours.
2. **Do players reach the specialization?** It comes around year 30: the
   first summer in the guide's top 30 or, from year 20, a pillar's top 10.
3. **What do they say about the opening, the summer and the Final
   Report?** The game's best moments on paper.

And everything else they find: what confuses, what bores, what breaks.

## The dates

| When | What |
|---|---|
| Early November | The owner's pass ([`checklist.md`](checklist.md)); `0.1.0` published on itch.io; the first recruiting posts ([`recruiting.md`](recruiting.md)). |
| November – mid December | The playtest. Replies read weekly. `0.1.x` builds only for bugs that lose a save or block a run. |
| Mid December | The form closes. Triage (below), and the next plan written from it. |

## Where feedback arrives

| Source | Where to read it | What it holds |
|---|---|---|
| **The feedback form** | Tally → the form → **Submissions** | The nine questions, an optional email, any bug report attached, and the hidden fields: version, build, edition, platform, year, week, rank, and the install id when the player allowed statistics. |
| **The itch.io page's comments** | The page, and the itch.io dashboard's notifications | Free text. Ask a commenter to use the form for anything long. |
| **The play statistics** | PostHog (eu.posthog.com) → the **Playtest 1** dashboard | The funnel from opening the game to year 50, minutes played by year, returning players, specializations, crashes. Every event is listed in [`analytics.md`](../../architecture/analytics.md). |

A form reply with an `install_id` can be read beside the same player's
statistics: in PostHog, **Activity** → filter by that `distinct_id`.

A bug report file replays the session exactly: it is the run log the
crash screen has always offered (Plan 70C). Load it in a development
build's debug panel to watch what happened.

## The weekly read

Once a week, about an hour:

1. **The dashboard:** how many new players, how far they got, the median
   minutes at each year, anything in *Crashes*.
2. **The form's new replies,** each filed under the areas below.
3. **The page's comments:** answer them; file what they say.
4. **Anything that loses a save or blocks a run** goes to a `0.1.x` build
   this week (below). Everything else waits.

## The triage rule

Every reply, comment and statistic that says something is filed in
[`findings.md`](findings.md) under one of the reviews' areas:

| Area | What goes there |
|---|---|
| **1 · Aesthetics** | The look: the map, the buildings, the screens. |
| **2 · UI and text** | What was hard to find, hard to read, unclear, too long, skipped. |
| **3 · Intuitive gameplay** | Where players didn't know what to do next, or why something happened. |
| **4 · Strategy** | Balance, pacing, money, the specialization, choices that felt empty or forced. |
| **7 · Bugs** | What broke. |

- **A bug that loses a save or blocks a run** is fixed in a `0.1.x` build
  within days: a fix, a version bump (`0.1.1`), the Release workflow, a
  new upload. The migration tests keep every tester's save opening.
- **Everything else waits for the playtest's end,** and becomes the next
  plan. Count how many players said each thing; one loud reply is one
  reply.

## Known issues

*Found in the owner's pass and not fixed before publishing. Copy each onto
the itch.io page too.*

- None yet.

# Play statistics

*What UniSchool sends while you play, and what it never sends (Plan 97E).
This page is linked from the game's itch.io page.*

## In short

- **Only if you allow it.** The first time the game opens, the title screen
  asks: *UniSchool sends anonymous play statistics to help the playtest.*
  Nothing is sent before you answer. **Turn off** sends nothing, ever; you
  can change your answer in **Settings → Share anonymous play statistics**.
- **No names and nothing you type.** Not your college's name, not its
  mascot, not anything else you write. Every value sent is a number, a yes
  or no, or one item from a fixed list in the game's code.
- **No cookies, no recordings, no tracking across sites.** The game keeps a
  random install id on this device, so a second session can be counted as
  the same player. Turning statistics off deletes it.
- **Where it goes.** To [PostHog](https://posthog.com), in its EU region,
  through its capture API. The game asks PostHog not to build a profile of
  you and not to look up your location. Ad blockers often stop it; the game
  plays the same either way.
- **What it is for.** How long a first run really takes, where players stop,
  and whether they reach the specialization: the questions the playtest
  exists to answer.

Development builds, and builds made without the project's key, send nothing
and never ask.

## What every event carries

| Field | What it is |
|---|---|
| `version`, `build` | The game's version (`0.1.0`) and the commit it was built from |
| `edition` | `full` or `demo` |
| `platform` | `web`, `itch` or `desktop` |
| `run_id` | A random id for this run, new for each college founded or save loaded from a file |
| `played_minutes` | Minutes this run has been played with the clock running and the game on screen |
| install id | The random id kept on this device (PostHog's `distinct_id`) |

## The events

| Event | When | Its own fields |
|---|---|---|
| `app_opened` | The game opens | screen size (`phone`, `tablet`, `laptop` or `desktop`), touch screen or not, first launch or not |
| `run_started` | A college is founded | campus architecture, normal or sandbox |
| `run_resumed` | A saved run is continued | year |
| `year_reached` | Each summer in years 1–10, then every fifth | year, rank, prestige band (tens), enrollment band, cash band, schools founded, times the clock was stopped this year, weeks played at each speed this year, times each tab was opened this year |
| `ambition_reached` | An ambition is met | the ambition's id |
| `specialization_offered` | The board offers a specialization | year |
| `specialization_chosen` | One is chosen | year, pillar |
| `specialization_declined` | The choice is put off | year |
| `run_finished` | Leaving the Final Report | its mark, rank, the ids of the college's guidebook tags, whether the run went on into the Epilogue |
| `heartbeat` | Every 10 minutes of play | none |
| `report_shared` | The report card downloaded or copied | which |
| `save_exported` | A save downloaded | from where: the menu, the summer's backup line, the crash screen, or a set-aside save |
| `save_imported` | A save loaded from a file | none |
| `crashed` | The game stops on an error | the error's message (with your college's names removed) and the year; never the run itself |

Bands, not figures: enrollment is sent as the lower edge of 0, 500, 1,000,
2,500, 5,000, 10,000, 20,000 or 40,000; cash as below zero, 0, $1M, $5M,
$20M, $100M, $500M or $1B.

## For developers

- The list lives in `unischool/src/analytics/events.ts`. An event whose
  fields do not match its entry there is dropped before it is queued.
  `test/analytics.test.ts` plays a run through the module and checks every
  field of every event, and that this page names every event.
- The sender is `unischool/src/analytics/analytics.ts`: no library, a
  `fetch` to `https://eu.i.posthog.com/batch/` every ten seconds while
  there is something to send, and when the tab is hidden. Any failure is
  dropped silently.
- The key is `VITE_POSTHOG_KEY` in the build's environment (Vercel's
  production environment; the release workflow's repository secret;
  `unischool/.env.production.local` for a build on one's own machine).
  `VITE_POSTHOG_HOST` overrides the EU host.
- The run's events are read by comparing the state before and after each
  action (`stateEvents`), in `useGame.ts`, never in the reducer, so the
  harness, replays and saves are untouched. Ids come from
  `crypto.randomUUID()`, never the run's seeded stream.

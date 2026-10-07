# Plan 97 — The itch.io playtest

*Planning document only — no gameplay code is changed by this file. Its job
is to get the game in front of outside players on itch.io as it stands
today, and to collect what they do and say: a versioned public build, the
web and desktop builds, anonymous play statistics, a way to send feedback
from inside the game, and the ten-year demo built for later. It takes over
Plan 70's held PRs K (analytics) and L (launch).*

**Status: In progress.** PRs B and C are done.

---

## 0. Why this plan exists

No one but the owner has played UniSchool. Two full reviews (Plans 73 and
86) found the game robust, but both were written by a model, and both said
the same thing: the owner's playtest (70L) and real players are the only
test of feel. Three questions decide what comes next, and only outside
players can answer them:

- **How long is a real first run, and where do people stop?** The clock
  gives 3.6 hours at 1× and 1.8 at 2×, plus reading and stops (second
  review, B6-5). Steam's refund line is two hours.
- **Do players reach the specialization?** It comes around year 30, the
  first summer in the guide's top 30 or, from year 20, a pillar's top 10
  (Plan 95).
- **What do they say about the opening, the summer and the Final Report?**
  These are the game's best moments on paper (the marketability memos, §4).

The owner wants this feedback **on the game as it is now**. The open
decisions and gameplay fixes in `BACKLOG.md` (late money, small colleges,
the digest, targets against actuals) wait for what the playtest finds. The
human text edit, the capsule art and logo and the devlog come after it
(§5).

What stands in the way today, read against `main` at `41de2bc`:

- **No version anywhere a player sees.** `package.json` is `0.0.0`.
  Nothing on the title screen, in the Credits, on the crash screen or in an
  exported save says which build made it. Feedback from a playtest that
  ships fixes is useless without one.
- **The build can't be uploaded to itch.io as it is.** `vite.config.ts` has
  no `base`, so the bundle and `index.html`'s icons load from absolute
  paths (`/assets/…`, `/favicon.ico`). itch.io serves a game from a
  sub-path, where those paths break.
- **The game has never run inside itch.io's frame.** It's cross-origin, so
  downloads (save export, the report card, the bug report), the clipboard
  (*Copy summary*, `ReportCardActions.tsx`), keyboard focus, audio unlock
  and storage may all behave differently there.
- **No analytics.** 70K's spec is written and was held by the owner in
  September 2026.
- **No way to send feedback.** A crash offers *Download a bug report*
  (Plan 70C), but there's nowhere to send it, and nowhere to say "I got
  lost in year 3".
- **No demo edition.** Nothing stops a run at year 10.
- **No desktop build.** There is no Electron or Tauri wrapper. Steam needs
  one later, and itch.io players often prefer a download.

## 1. The owner's decisions

| Question | Answer |
|---|---|
| What testers play | **The full game**, all fifty years. The ten-year demo is built and tested in this plan, and published later as the public demo (February–March 2027). |
| Who can see the page | **Public and free** on itch.io. |
| Credits | **"Halifax Games"**, a pseudonym for now. The direct credit to Claude Code comes out of the Credits. In its place, a **footnoted, general AI disclosure** in the Credits. |
| What waits for the playtest | The human text edit, the capsule art and logo, the devlog, and every open gameplay decision in the backlog. |

**Two consequences of these answers**, recorded so they are chosen
knowingly:

- **The page is public, so the unedited text is public.** The itch page
  says plainly that this is an early playtest build. Its long description
  is written for players, not for a store (PR I).
- **itch.io's own AI form is separate from the Credits.** It asks which
  parts used generative AI. Its answers are drafted in
  [`docs/store/ai-disclosure.md`](../store/ai-disclosure.md), *For
  itch.io*, and PR I fills them in as drafted. The second review's §7
  warns that a vague disclosure is read as the worst case. A footnote in
  the Credits is the owner's choice. The form should still be specific.
  The README's *How UniSchool is made* paragraph (line 235) is not changed
  by this plan.

## Rules for every PR in this plan

- **No balance change.** The pacing scorecard and `sim/baseline.json` read
  the same after every PR. This plan ships the game as it is.
- **No new randomness in the run.** Install ids, run ids and sampling use
  `crypto.randomUUID()`, never the run's seeded stream (`engine/random.ts`),
  so replays and the harness don't move.
- **Nothing a player typed ever leaves the device.** No college name, no
  president's name, no free text, in analytics or in a feedback link's
  prefill. Every analytics field is a number, a boolean or a value from a
  fixed list, and a test enforces it (PR E).
- **Development builds send nothing.** Analytics reads the build flags the
  way `engine/devBuild.ts` does.
- **A state-shape change ships a migration** (Plan 70B's rule). The
  testers' saves are the first saves real people own, and every later
  build must open them. Stamps that describe the build (version, edition)
  live in the save file's wrapper, not in `GameState`, so they need no
  `SAVE_VERSION` bump.
- **Each PR runs `npm run check` and `npm run test:slow`.**

## The map

| PR | Subject | Depends on |
|---|---|---|
| A | This plan | — |
| B | Versions and editions | — |
| C | Credits: Halifax Games and the footnote | — |
| D | The itch.io web build | B |
| E | Analytics (70K, revised for a playtest) | B |
| F | Feedback from inside the game | B, E |
| G | The ten-year demo | B, F |
| H | The desktop build | B, D |
| I | The itch page and the playtest kit | D, H (docs only) |
| J | The owner's pass, and 0.1.0 on itch.io | all |

Each PR has its own branch (`plan-97x-subject`) and merges once `check`
and `slow` pass.

---

## PR 97B — Versions and editions

- **A version scheme.**
  - `package.json` becomes **`0.1.0`**. Playtest fixes are `0.1.1`,
    `0.1.2`…. Each later build that changes what players see (the
    post-playtest build, the public demo) takes the next minor number,
    `0.2.0` and on, and **`1.0.0` is reserved for launch**.
  - `vite.config.ts` defines `__APP_VERSION__` (from `package.json`) and
    `__BUILD_ID__` (the short git commit, or `local`).
  - A small `src/build.ts` exports `VERSION`, `BUILD_ID`, `EDITION` and
    `PLATFORM`, and stands in for the defines in the Node configs, as
    `devBuild.ts` does.
- **Editions and platforms are build flags, not settings.**
  - `VITE_EDITION`: `full` (the default) or `demo` (PR G).
  - `VITE_PLATFORM`: `web` (the default, the Vercel site), `itch` (PR D) or
    `desktop` (PR H).
- **Where the version shows:**
  - a quiet line on the title screen ("v0.1.0 · playtest");
  - the Credits;
  - the crash screen (`CrashScreen.tsx`);
  - the bug report (`engine/crashContext.ts`);
  - the save file's wrapper on export (`exportSave`): `version`, `build`,
    `edition` and `platform` beside the payload, under one key, `game`
    (the wrapper's own `version` is already the save's shape,
    `SAVE_VERSION`). Import ignores them except to name the build in a
    refusal.
- **`LAUNCH_SAVE_VERSION` stays 78.** The migration chain already runs from
  there to `SAVE_VERSION` 100. Add `test/fixtures/save-playtest.json`, a
  year-25 save written by this build, to the migration suite. It's the
  save every later build must open.
- **Checks:** the version line renders. The exported wrapper carries the
  three stamps. A wrapper without them (an older export) still imports.

## PR 97C — Credits: Halifax Games and the footnote

- **`Credits.tsx`:**
  - "Design and direction" reads **Halifax Games**;
  - the *Built with — Claude Code, plan by plan* row goes;
  - a footnote mark on *Halifax Games*, and a footnote at the foot of the
    card: **"\* Made with the help of AI tools."** The wording is the
    owner's to change; this is the shortest form that matches the
    decision.
  - The privacy line ("Your runs … live in this browser and nowhere
    else") is rewritten in PR E, since it will stop being true.
- **`docs/store/ai-disclosure.md`** gets a dated note:
  - the owner's decision, and the in-game wording;
  - the facts section no longer quotes the Credits line;
  - *the game makes no network calls* becomes true only with statistics
    off, once PR E lands. PR E updates that sentence.
- **A search** for "Louis Miyani" and "Claude Code" across `src/` and
  `index.html` (the plan's rule on rewriting a rule's words) confirms
  nothing else in the game credits either.

## PR 97D — The itch.io web build

- **Relative paths.**
  - `npm run build:itch` builds with `base: './'` and
    `VITE_PLATFORM=itch` into `dist-itch/`, then zips it as
    `release/unischool-<version>-itch-web.zip` with `index.html` at the
    root.
  - `index.html`'s icon and preview links become relative.
  - The Vercel build keeps `base: '/'`.
  - The script fails if the zip holds over 1,000 files or exceeds
    itch.io's size limit (500 MB; the game is far below both).
- **A local itch frame for testing.**
  - `tools/itchFrame.mjs` serves `dist-itch/` on one port and a host page
    on another, which embeds the game in an iframe.
  - The iframe copies the `allow` and `sandbox` attributes from a live
    itch.io embed. Read them off a real itch page at implementation time,
    since they change.
  - A Playwright pass, like `tools/shoot.mjs`, checks each of these inside
    the frame:
    - **saves:** a run is saved, the frame reloaded, and the run
      continues;
    - **downloads:** *Download save*, the report card PNG and the bug
      report each produce a file. Where the frame blocks them, the
      fallback is a dialog with the file as a link or a text box to copy
      from;
    - **the clipboard:** if `navigator.clipboard.writeText` rejects in the
      frame, *Copy summary* falls back to showing the line, selected,
      with "Press Ctrl+C";
    - **keys:** the hotkeys work after one click in the frame;
    - **the wheel:** the map's wheel and pinch zoom don't scroll the host
      page (H7-2's listener);
    - **audio:** sound starts on the first click;
    - **two tabs:** the claim (`CLAIM_KEY`) still hands over between two
      frames.
- **Storage on itch.io.**
  - Every itch.io HTML game is served from the same origin, so keys must
    not collide with other games. Every key already starts `unischool.`
    (`persistence.ts`, `settings.ts`, `hall.ts`, `unlocks.ts`,
    `unseen.ts`, `audio/settings.ts`). A test fixes that rule.
  - Browsers may clear an iframe's storage: Safari after seven days
    without a visit, and private windows on close. On `itch` and `web`
    builds, the summer review gets one line every fifth summer: *Back up
    this run* (the existing *Download save*). The itch page says the same
    (PR I).
- **CI builds the zips.** The owner works from the browser, with nothing
  on a computer of their own, so the release workflow (PR H's
  `desktop.yml`, renamed `release.yml`) also runs `build:itch` (and
  `build:itch:demo` once PR G lands) and attaches the zips to the run.
  `VITE_POSTHOG_KEY` comes from the repository secret of that name.
  Building on a machine of one's own still works, with the key in
  `unischool/.env.production.local`.
- **Uploading.** `docs/store/itch-release.md` gives the steps by hand
  (upload the zip, tick *This file will be played in the browser*, set
  1440 × 900 with the fullscreen button and *mobile friendly*). It also
  gives the same through itch.io's `butler` CLI. The owner holds the
  `butler` key, and CI never does.

## PR 97E — Analytics (70K, revised for a playtest)

70K's spec stands: PostHog through `posthog-js`, production builds only,
only when `VITE_POSTHOG_KEY` is set, autocapture off, no cookies, a
setting to turn it off, two sentences in the Credits. A playtest needs
three changes to it.

- **The key is set where the build runs.** It goes in the environment of
  `build:itch`, `build:desktop` and Vercel's production build, not in
  Vercel's alone.
- **An anonymous install id, so returning players can be counted.**
  - Whether testers come back for a second session is the playtest's most
    important number. 70K's memory-only persistence makes every page load
    a stranger.
  - A random id is stored under `unischool.stats.id`. It's not a cookie,
    and it's never linked to anything typed.
  - Because this stores an identifier, the first launch shows a one-line
    notice on the title screen: *"UniSchool sends anonymous play
    statistics to help the playtest. [Fine] [Turn off]"*. Nothing is sent
    before an answer. The answer is the Settings toggle's starting value.
- **Events that answer the playtest's three questions.** The common
  fields on every event: `version`, `build`, `edition`, `platform`, the
  install id, a random `run_id` per run, and `played_minutes` (time
  unpaused and visible, this run).

  | Event | When | Fields (no free text) |
  |---|---|---|
  | `app_opened` | each load | screen size band, touch or not, first launch or not |
  | `run_started` | a new run | vernacular, mode (normal or sandbox) |
  | `run_resumed` | a save continued | year |
  | `year_reached` | each summer in years 1–10, then every fifth | year, rank, prestige band, enrollment band, cash band, schools founded, stops this year, weeks at each speed, tab opens this year by tab |
  | `ambition_reached` | an ambition is met | the ambition's id |
  | `specialization_offered` / `_chosen` / `_declined` | the board's offer | year, pillar |
  | `run_finished` | the fiftieth summer | mark, rank, the report's title tags (ids, not the sentence), continued into the Epilogue |
  | `demo_finished` | the demo's end (PR G) | rank, prestige band |
  | `heartbeat` | every 10 minutes of unpaused, visible play | none beyond the common fields |
  | `report_shared`, `save_exported`, `save_imported` | as 70K | the kind |
  | `feedback_opened` | PR F's links | where it was opened from |
  | `crashed` | the error boundary | the error's message, the year, no state |

- **Checks:**
  - a test plays a scripted run through the analytics module with a fake
    transport, and asserts every field of every event is a number, a
    boolean or a listed value;
  - nothing is sent in a dev build, without a key, before the notice is
    answered, or with the setting off;
  - the module fails silently. If PostHog can't load (ad blockers block it
    often), the game never notices.
- **Words that change with it:**
  - the Credits' privacy line: *"Your runs and settings live on this
    device. If you allow it, the game sends anonymous play statistics: no
    names and nothing you type. Turn it off in Settings."*;
  - `docs/store/ai-disclosure.md`'s "makes no network calls";
  - a new `docs/architecture/analytics.md` lists every event and field,
    and is the page the itch page links to.
- **What the owner sets up:**
  - a PostHog project (the free tier covers a playtest many times over;
    the EU region is the simpler answer to European privacy rules);
  - its project key in each build's environment;
  - one dashboard, with:
    - the funnel `app_opened → run_started → year 1 → 5 → 10 → 20 → 30 →
      50`;
    - median `played_minutes` at each step;
    - the share of install ids seen on two or more days.
- **Expect an undercount.** Blockers stop PostHog for many players, maybe
  a fifth to a third. A proxy on a domain the owner holds would recover
  most of them, but it is not in this plan. The feedback form (PR F) is
  the second source.

## PR 97F — Feedback from inside the game

- **One feedback form, outside the game.**
  - The owner makes it in a form tool that takes prefilled hidden fields
    from the URL and accepts file uploads without an account. Tally does
    both. Google Forms prefills but needs a sign-in for uploads.
  - Its URL is a build constant (`VITE_FEEDBACK_URL`). Without one, the
    links don't show.
  - The questions, short on purpose (owner to edit):
    1. How far did you get? (a year, prefilled)
    2. Roughly how long have you played in total?
    3. Was there a moment you didn't know what to do next? Where?
    4. What was the best moment?
    5. What was the most frustrating?
    6. Would you start another run? Why or why not?
    7. Would you pay for this game? (no / under $10 / $10–15 / $15–20 / $20+)
    8. Anything broken? (attach the bug report file if you have one)
    9. Anything else? And an email, optional, if you'd like to hear about
       updates.
- **Prefill only what the build knows:** `version`, `build`, `edition`,
  `platform`, year, week, rank and the install id. These let a form reply
  be read beside that tester's statistics. The college's name never goes
  in.
- **Where the link appears:**
  - the main menu: *Send feedback* and *Report a bug*. The second
    downloads the bug report (`crashContext.ts`'s run log), then opens the
    form with a line saying to attach it;
  - the crash screen, beside its *Download a bug report*;
  - **twice, unprompted:**
    - after the fifth summer's review: *"Five years in. Two minutes of
      feedback?"* [Give feedback] [Later];
    - and on the Final Report.

    Each asks once per install and is never repeated. A setting turns
    both off.
  - the demo's end (PR G).
- **Links leave the game safely.** They open in a new tab on the web and
  on itch.io, and in the system browser on the desktop (PR H). The run is
  saved before any link opens.
- **Checks:** the links are absent without a URL. The prefill never holds
  the college's or the president's name. Each prompt appears once.

## PR 97G — The ten-year demo

Built and tested now. Published later (§5).

- **`VITE_EDITION=demo` ends the run at the tenth summer.**
  - After the year-10 Review's last beat (`resolveAdmissions`, before the
    calendar turns), the clock stops and the demo's end screen opens. It
    has:
    - **what the college became in ten years:** rank, prestige, students
      and schools, reusing the summer Review's numbers;
    - **what's ahead:** the four pillars and the one specialization the
      college may choose, with the four cards drawn small. This is the
      marketability memo's advice: end the demo on what it can't reach;
    - buttons: *Follow the game* (a build constant, the itch page for
      now), *Send feedback* (PR F), *Download save* ("carries into the
      full game"), *Start again*.
  - **Sandbox mode is hidden in the demo,** since it shows every building
    at once. The owner can reverse this.
  - **The demo awards no unlocks and writes no Hall of Fame entry,** since
    neither has a run to finish.
- **Saves cross one way.** A demo save imports into the full game and
  plays on from year 10. The full game refuses nothing from the demo.
  The demo refuses a save past year 10, saying why.
- **Builds:** `npm run build:itch:demo` (zip
  `unischool-<version>-itch-demo.zip`) and `npm run build:desktop:demo`.
- **Checks:**
  - a headless test plays the demo edition to year 10 and asserts the
    clock stops after that summer, never before;
  - a demo save at year 10 continues in the full edition for a year
    without error, and passes the rules check;
  - `npm run check` builds both editions.

## PR 97H — The desktop build

- **Electron, not Tauri.** Tauri runs on each system's own web view
  (WebKit on macOS and Linux), so the canvas map, audio and storage would
  behave differently per platform. Electron ships one Chromium, the
  engine the game is profiled on (Plans 83, 96G). Steam's own libraries
  (`steamworks.js`) also work with it, which matters later.
- **A separate package,** `desktop/` beside `unischool/`, with its own
  `package.json`, so the game's dependencies stay React and fonts.
  - It loads the built game (`dist-desktop/`, built with `base: './'` and
    `VITE_PLATFORM=desktop`) through a custom `app://` protocol, not
    `file://`, so storage has a stable origin and ES modules load.
  - **Hardened:** `contextIsolation` on, `nodeIntegration` off,
    `sandbox` on, a content security policy, no navigation away from the
    game, and DevTools off in release builds.
  - **The window:**
    - opens at 1440 × 900, remembers its size and position, and has a
      minimum the game's layout supports (to be measured);
    - fullscreen on F11 (and the macOS green button);
    - no menu bar on Windows and Linux. macOS keeps the app menu, so
      Quit, Copy and Paste work.
  - **One instance at a time,** with a single-instance lock. A second
    launch focuses the first window, which is the desktop form of the
    two-tab claim.
  - **Files:** downloads (save, report card, bug report) open a save
    dialog. *Load a save file*'s picker works as it does in a browser.
  - **Links** open in the system browser.
  - **Saves** live in the app's own storage (Electron's `userData`). A
    test installs build *n*, saves, installs *n + 1*, and the run
    continues.
- **Packages,** by `electron-builder`:
  - **Windows:** an installer and a portable zip, x64. They are unsigned
    for the playtest, so Windows SmartScreen will warn on first launch,
    and the itch page says how to proceed.
  - **macOS:** a universal `.dmg`. It is unsigned for the playtest, so the
    itch page explains *right-click → Open*. Signing and notarizing need
    an Apple Developer account ($99 a year) and are required before
    Steam, not before this playtest.
  - **Linux:** an AppImage, which also runs on a Steam Deck's desktop
    mode.
- **CI.** A workflow `release.yml` runs on a `v*` tag, or by hand from the
  Actions tab, on Ubuntu, Windows and macOS runners. It builds the
  packages and the itch.io zips (PR D), with `VITE_POSTHOG_KEY` from the
  repository secret, and attaches them to the workflow run, where the
  owner downloads them in the browser. Uploading to itch.io stays the owner's step (`butler`, PR
  D's notes).
- **What can't be checked from the repository's container:** a launch on
  a real Windows PC and a real Mac. That is the owner's, in PR J.
- **Not in this plan:** Steamworks (achievements, cloud saves, the
  overlay), code signing, auto-update. itch.io's app updates downloads
  itself, and a direct download is replaced by hand. These belong to the
  plan before the Steam page.

## PR 97I — The itch page and the playtest kit

Docs only. Everything here is a draft for the owner to edit.

- **`docs/store/itch-page.md`**, built from
  [`steam-page.md`](../store/steam-page.md):
  - the short and long descriptions, opening with **"An early playtest
    build. Free while it's being tested: your feedback decides what
    changes."**;
  - **what to expect:** a run is fifty years and two to four hours, saves
    stay in this browser, back up with *Download save*, and statistics are
    anonymous (linked to `analytics.md`);
  - the downloads, with the SmartScreen and *right-click → Open* notes;
  - five screenshots in the second review's order (§4), shot from this
    build with the existing tools (`npm run shot`, `review:gallery`), at
    16:9;
  - the cover image (630 × 500), a crop of the autumn campus shot until the
    commissioned art exists;
  - tags: management, simulation, strategy, singleplayer, building, and
    never "AI" beside "school simulator" (the second review's §2);
  - the itch.io AI form's answers, as `ai-disclosure.md` drafted them, with
    the owner's decision noted;
  - the credit: Halifax Games.
- **`docs/reviews/playtest-1/`**, the playtest's home:
  - `README.md`:
    - the questions this playtest answers (§0);
    - the dates;
    - where feedback arrives: the form, the itch page's comments, the
      statistics;
    - how each finding will be filed (below);
  - `checklist.md`: 70L's list, extended for the owner's pass (PR J):
    the first hour, the first school, the first summer, a save exported
    and re-imported, a rank change, the specialization, the Final Report,
    the Epilogue, play again, and the same on itch.io's frame, a phone, a
    tablet, Windows and macOS;
  - `recruiting.md`: where to post and what to say. The places:
    r/tycoon, r/CityBuilders and r/playmygame; the r/IndieGaming feedback
    thread; itch.io's community boards; management-game Discords; friends
    who play Two Point, Football Manager or Civilization. A goal of
    **20–40 testers and 50 started runs**: enough to see the funnel's
    shape, and small enough to read every reply.
- **The triage rule,** written in the README: every reply is filed by the
  reviews' areas (1 aesthetics, 2 UI and text, 3 intuitive gameplay, 4
  strategy, 7 bugs).
  - A bug that loses a save or blocks a run is fixed in a `0.1.x` build
    within days.
  - Everything else waits for the playtest's end, and becomes the next
    plan.

## PR 97J — The owner's pass, and 0.1.0 on itch.io

- **The owner plays before anyone else does** (the rest of 70L), against
  `checklist.md`:
  - a full run in the itch.io frame on a fresh browser;
  - a session on a phone or tablet;
  - an install and a launch of the Windows and macOS packages;
  - a demo build to year 10, and its save carried into the full game.

  Small findings are fixed in this PR. Larger ones go to the playtest's
  README as known issues, and onto the itch page.
- **Release:**
  - tag `v0.1.0`; the desktop workflow builds the packages;
  - upload the web zip and the three desktop packages to itch.io (not the
    demo);
  - publish the page;
  - post the first recruiting messages.
- **`BACKLOG.md`** is updated: 70K and 70L leave *On hold*, pointing here.
  What the owner's pass left goes in its place.

---

## 5. After the playtest

These are not PRs of this plan. They are recorded so the dates hold
together. Today is 7 October 2026.

| When | What |
|---|---|
| **7 Oct – early Nov** | PRs B–J. B, C and E first, then D and F, then G and H, then I and J. |
| **Early Nov** | `0.1.0` public on itch.io; recruiting starts. |
| **Nov – mid Dec** | The playtest. `0.1.x` patches for save-losing and blocking bugs only. The owner reads replies weekly. |
| **Mid Dec** | Triage into `docs/reviews/playtest-1/`, and the next plan, from what testers said. |
| **Dec – Jan** | The owner's human text edit, informed by what testers read and skipped. The capsule art and logo commissioned (artists take weeks; ask in November). The devlog's first post: *what the playtest taught us*. |
| **By end of Jan 2027** | The Steam page, with the plan before it covering Steamworks, signing and notarizing. Still on the June 2027 Next Fest track (register by 25 April). |
| **Feb – Mar 2027** | The ten-year demo (PR G) goes public on itch.io and Steam. |

The Steam page's January date is now tight, since the playtest runs into
December. If triage shows larger changes are needed, the page slips to
February. That still leaves the demo three months before June's fest,
which the memo's evidence favours.

## What this plan does not do

- **No gameplay or balance change.** That includes late money, small
  colleges, the price set blind, the digest, targets against actuals, and
  everything in `BACKLOG.md`'s *Named, not sequenced*.
- **No text pass.** The owner's human edit comes after the playtest (§5).
- **No commissioned art, no logo, no devlog.** These also come after.
- **No Steam work:** no Steamworks, no store page, no code signing, no
  notarizing, no auto-update.
- **No analytics proxy,** and no session recording or heatmaps.
- **No `1.0.0`.** That number is launch's.

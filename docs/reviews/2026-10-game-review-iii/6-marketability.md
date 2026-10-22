# 6. Marketability

Plan 86's area 6, third review. Commit read: `b1f2114` (0.1.3). Like [October's](../2026-10-game-review/6-marketability.md) and [review II's](../2026-10-game-review-ii/6-marketability.md), this is a memo to a small studio's greenlight meeting. It re-reads review II's memo three weeks on, against three things that are new:
- **the game:** 0.1.1–0.1.3, Plans 96–108;
- **the evidence:** real players, from the playtest's findings, the itch.io dashboard, the form and the [play statistics](data/play-statistics.md);
- **the market:** the Steamworks pages and sources since review II's research on 2 October.

**What was read.**
- `docs/store/` in full: the Steam draft, the itch page and release notes, the disclosure, the quotes, the three devlogs and the changelog.
- The README, `BACKLOG.md` *Launch*, Plan 97, Plan 95 Y–Z, and `docs/reviews/playtest-1/` (README, findings, recruiting).
- Every picture a buyer meets: `docs/images/`, `docs/store/itch/`, `public/og-image.jpg`, and the title art (`src/assets/campus-quad.webp`, 1779×884).
- The title screen and the founding tabs on the production build, from areas 3 and 2's captures at 1440×900 (no server of my own).
- The live itch.io page and its devlog, and the Vimeo page of the trailer.

**About the sources.** Unlike review II, the web fetch worked this time: the Steamworks pages, the Steam store pages of the competitors, and the live itch.io page were read directly. The fetch tool returns a model's reading of each page, so treat the figures as a careful paraphrase; text in quotation marks is verbatim. Direct downloads were refused by the proxy (itch.io's image server, Vimeo), so **I did not see the live cover or the trailer itself**. Every outside figure, its date and how it was read are in [`data/c6-market-sources.md`](data/c6-market-sources.md).

**Limits.** I am a model doing a desk study, not market testing. Judgments are labelled **the reviewer's judgment**. The play statistics are a sample: PostHog sees about one itch.io play in six (findings, 12 October), and 0.1.3 has no outside players yet.

## The recommendation, first

The route still holds: Steam page first, demo next, Next Fest in June 2027, launch late summer 2027 at **$14.99**. What three weeks changed:

1. **The disclosure is now wrong about the art.** By the owner's account the cover art is AI-generated, and he is commissioning a title-screen background to replace the present one, which reads as generated too. The disclosure drafts and the README still say no image in the game comes from a generator. Fix the words now, and don't put that art on Steam (C6-1).
2. **The plan's dates hold, but three unbuilt pieces sit on its critical path:** the commissioned capsule art (needed by about 1 December for a page before the holidays), the desktop build (97H) and the ten-year demo (97G). The owner's hobby time shrinks in 2027, so the build work belongs in November–February (C6-2).
3. **The full game is free on itch.io with no end date.** Before the Steam page asks for money, decide when the itch.io build becomes the demo (C6-3).
4. **Players named a different hook from the memo's.** Not the blind price, and not the specialization. They named watching a college grow, building the campus, and depth: "the football manager of universities". They also called it calm. The store copy should lead with that (C6-5).
5. **What holds people back is the first ten minutes.** On 0.1.2, a third of founded runs ended before the first summer. A Steam demo is judged in those minutes. 0.1.3's chapters may fix it, but no outside player has tried them yet (C6-6).
6. **There is a new direct rival.** *College Architect* (Skyranis Studios) is a 2D college-campus builder, announced for Q3 2027, the same window as UniSchool's launch (C6-10).

## The findings

| Id | Finding | Severity | Effort | Was |
|---|---|---|---|---|
| C6-1 | The disclosure and the README say no image comes from a generator, but the cover is AI-generated and the title art reads as generated | major | S | B6-3 |
| C6-2 | The timeline holds, but capsule art, the desktop build and the demo are all unbuilt and all on the critical path | major | L | B6-4 |
| C6-3 | The full game is free on itch.io with no end date | major | S | new |
| C6-4 | No path yet from today's players to a wishlist | major | S–M | new |
| C6-5 | The store copy leads with the memo's hooks, not the players' | minor | S | review II §4 |
| C6-6 | The first ten minutes decide a demo, and a third of runs end in them | major | M | B6-5 |
| C6-7 | The shop window shows the 0.1.1 game again | minor | S | B6-1 |
| C6-8 | The trailer can't be reviewed from the repository, and its copy was "too cryptic" | minor | M | review II §4 |
| C6-9 | Price: players say less than $14.99, but hold it and don't raise it | minor | S | review II §6 |
| C6-10 | A direct rival, *College Architect*, is announced for Q3 2027 | minor | S | new |
| C6-11 | The itch.io page's fields and its doc lag the game | polish | S | new |
| C6-12 | "UniSchool" also names an education software product | polish | S | new |

## What became of review II's findings

| Finding | Status on `b1f2114` | Evidence |
|---|---|---|
| B6-1: the shop window shows the September game | **Partly fixed**, then stale again | Plan 95Y retook the share image (`public/og-image.jpg`, year 32, autumn) and three README tabs, and rewrote the README's words. The itch.io shots were retaken on 12 October (`docs/store/itch/`). The title screen gained a campus picture in 0.1.2, but it reads as AI-generated, and the owner is commissioning its replacement (C6-1). Since then, Plans 104 and 106–108 changed what two of the five itch.io shots and four of the seven README tab shots show ([`img/c6-stale-store-shots.jpg`](img/c6-stale-store-shots.jpg)). Carried as C6-7. |
| B6-2: two of four specialists don't top their pillar, and the choice comes late | **Fixed** | The ranking was fixed in 85I (`c9ce59e`); the offer moved to the top 30, or a pillar's top 10 from year 20 (95R; `prestigeSystem.ts:156–167`). Real players: every run that reached year 21 was offered the choice, and all 15 chose, in years 21–33 ([play statistics](data/play-statistics.md), *The specialization*). |
| B6-3: the AI disclosure is nowhere a buyer looks | **Partly fixed** | Drafted in `docs/store/ai-disclosure.md` (95Z). The README has *How UniSchool is made*. The Credits carry a footnote (`Credits.tsx`). The live itch.io page discloses "AI Assisted, Code, Graphics, Text". Still open: the drafts' "no image generator" line is now false (C6-1); the human edit of the most-read text is not done; the devlogs are update notes, not the "human direction" series; the capsule commission is requested but not delivered. Carried as C6-1. |
| B6-4: February's Next Fest is not realistic | **Fixed** (a decision) | June 2027 is recorded in `BACKLOG.md` *Launch*. Steamworks confirms the June dates (C6-2). |
| B6-5: a first run ends near the refund line; the sandbox and Epilogue go unsaid | **Fixed**, and the refund worry is answered by the playtest | The Steam draft, the itch page and the README name *Sandbox mode* and *Play on after the Final Report*. On the refund line: the only one-sitting full run took 5 h 51 min of real time for 71 minutes of running clock. Three form replies from two players report 4+ hours (F1, F3, F5), and R3 played 4+ hours in one sitting (findings, *PostHog, 11 October*). Steam's two hours count time with the game open. So a player who keeps playing passes the line long before the run ends. The refund risk is the player who leaves in the first hour (C6-6). |
| B6-6: three of October's facts need correcting | **Fixed** | No document outside the reviews repeats the old figures (grep for "19.50", "15.64" and "806"). |

**Counts:** 4 fixed, 2 partly fixed, none still holds, none superseded, none deferred.

### The playtest's findings in this area

| Player finding | On 0.1.3 | Where it goes |
|---|---|---|
| R8: "the football manager of universities"; R12: "a classic tycoon game right out the gate"; S1: "one of a kind"; S2: "soothing … almost like a form of meditation"; D1 and S2: *The Sims* | Collected in `docs/store/quotes.md`. None is used in the Steam draft. | C6-5 |
| R1, R5, I1: "Would love a steam demo", "Steam hope?" | **Still holds.** Steamworks was applied for in October; there is no page yet. | C6-2, C6-4 |
| "What would you pay?": F1/F3 (one player) $10–15; F2 and F4 $5–10; F5 and F6 under $5 | Evidence, not a finding | C6-9 |
| The itch.io numbers: 865 views, 501 plays, 11 collections, 2 five-star ratings, CTR 3.94%; 7-day impressions fell from 4,721 to 1,852 once *new and popular* lapsed (20 October) | Holds; the page needs its own traffic now | C6-4 |
| A third of 0.1.2's runs end before the first summer; seven runs finished | Holds on 0.1.2; untested on 0.1.3 | C6-6 |
| R4 and the 6 phone players: phones are not supported | The live page still lists *Touchscreen* among its inputs | C6-11 |

## What changed since review II

**In the game (for a buyer).** 0.1.1 (Plans 98–103): halls claimed by three of a school, events that do what they say and a college that remembers its answers, save slots. 0.1.2 (Plan 104): a gentler opening, teaching shown as numbers, a reason for every refused building, free grounds to garden, and a title theme by a human composer, Alejandro Tóth, over a new title picture. 0.1.3 (Plans 106–108): the first five years as chapters of objectives with a Guide; the founding faculty on the payroll; prestige that opens at 32 and moves from the first weeks; crowding retired; **admissions day**, the summer's decision drawn as a cloud of applicants with the admit rate as a line across it; the Treasury as one board; the Faculty as cards, a table or a plot.

**The reviewer's judgment on what that does to the pitch:**
- **Admissions day finally pictures the "blind price".** It is the best new screenshot: anyone can read it in a second.
- **The chapters answer the playtest's commonest complaint**, that the game looks harder than it is. They deserve a line on the store page ("learn it as you go, or turn the help off").
- **A composed theme gives the disclosure a human-made asset to name.** The title picture works against it (C6-1).

**In the market (sources in [`data/c6-market-sources.md`](data/c6-market-sources.md)):**
- **Steam's AI rules are unchanged since January 2026.** Disclose "any kind of content that ships with your game and is consumed by players"; efficiency tools are "not the focus"; the game must be "consistent with your marketing materials". Secondary reports (VGC, Gigazine) say the rewrite covers marketing material too.
- **AI disclosure is common, and it underperforms.**
  - 30.8% of 2026's releases so far carry a disclosure, up from 19.9% in 2025.
  - Management and shopkeeper sims lead the trend.
  - Disclosed games reach 100+ reviews at about 55% of the rate of the rest.
  - Among those that succeed, the disclosures run longer (a median of 22 words against 13) and more often reassure about human oversight. That supports the long, specific draft in `ai-disclosure.md`.
- **AI capsule art in particular reads as a warning.** PC Gamer: "You can usually tell straight away because the capsule art is obviously AI-generated. … They immediately signpost waste." Players who found undisclosed AI art drew apologies and replacements from *Crimson Desert* (March) and *1666: Amsterdam* (August).
- **Next Fest is crowded.** June 2026 had 4,382 demos, 66% more than June 2025. Games under 1,000 wishlists were "drowned out", with a median gain of 322; for games with 1,000–9,999 it was 1,006.
- **The comparables are cheap on sale.** Two Point Campus was seen at $4.49 (85% off, June), Academia at $4.99 (75% off, a September deal) and Let's School at $6.99 (Steambase, 12 October). University Tycoon still has no reviews.
- **New in the school tag:** *College Architect* (Q3 2027; C6-10), *Wizdom Academy* (a magic-school management sim, 1.0 on 16 November 2026), and *Abracademia* (a witch-school life sim, not a rival).

## The findings in full

### C6-1. The disclosure and the README say no image comes from a generator, but the cover is AI-generated and the title art reads as generated — major, S

*Was B6-3.*

**What.** The title screen and the founding screen draw `src/assets/campus-quad.webp` behind the menu (`styles.css:382–383`; [`img/c6-title-art.jpg`](img/c6-title-art.jpg)). It arrived with 0.1.2, described as "a new painting of the quad" (`changelog.md:171`; `devlog-0.1.2.md:103`, posted on itch.io).

By the owner's account the current cover art is AI-generated, and he has asked an artist for a title-screen background to replace this one. Nothing in the repository names a painter. **The reviewer's judgment:** its details read as generated. The banner on the left lamp post carries a temple-front mark with four columns, where the game's mark has three (I-U-I, `Logo.tsx`), above a line of unreadable lettering.

Four places still say no picture is generated:
- `ai-disclosure.md:44–45`: "No picture in the game comes from an image generator";
- the Steam text drafted at `ai-disclosure.md:90`, the same claim;
- the short form at `:131–132`, "No image, sound or voice comes from a generator", which is repeated in `README.md:273`;
- `README.md:115–116`: "everything on screen is drawn from data".

The itch.io form note (`itch-page.md:212`) says "No image generator", although the live page does tick *Graphics*. The live itch.io cover is a PNG I couldn't load, so I can't say whether it is the repository's `cover.jpg` (a campus render, not generated) or the AI cover the owner describes.

**Why.**
- Steam's survey asks about artwork that "ships with your game", and the title art ships. If it was generated, as it appears, the Steam text as drafted is false, and so is the README.
- Players who found undisclosed AI art forced apologies from two studios this year.
- About 44% of committed Steam players read the disclosure in detail (review II §7).
- "A new painting of the quad. Thank you, Alejandro" can be read as crediting the art to the composer.
- PC Gamer's line on AI capsule art ("signpost waste") is about exactly the picture a stranger meets first.

**Fix.**
1. **Today (S):** list which pictures were generated (the cover by the owner's account; the title background if, as it appears, it was too), then correct the four places above to say so. For example: "The title-screen background and the itch.io cover are AI-generated stand-ins, to be replaced by commissioned art." Add a line for marketing text: "the store text and the trailer's captions were written with the same assistant." Put a one-line correction in the next devlog.
2. **Better (S–M):** until the commission arrives, draw the title screen over the game's own campus. `tools/itchCover.mjs` already composes one (the autumn campus under a band of sky). Review II's B6-1 asked for this too. The build then holds no generated image, the "no image generator" line is true again, and the demo needs no art disclosure.
3. **Never put the AI cover on Steam,** not even as a placeholder (see C6-2's fallback).

### C6-2. The timeline holds, but capsule art, the desktop build and the demo are unbuilt and on the critical path — major, L

*Was B6-4.*

**What.** The owner's plan: the Steam page live by the end of 2026, 1.0.0 "finished, not released", Next Fest in June 2027, launch after it. Valve's dates and rules, read from Steamworks today:

| Date | What | Rule or source |
|---|---|---|
| ~Nov 2026 | Steamworks approved (owner: 10–15 business days); paperwork and tax checks take 15–30 days | Steam Direct, Onboarding |
| Any time | Store page review: 3–5 business days; submit 7 business days ahead | Review process |
| 17 Dec–4 Jan | Winter Sale (a busy, slow time to get a page reviewed) | Upcoming events |
| 25 Apr 2027 | Registration closes; have marketing material "up to date" | June 2027 page |
| 3 May | Steam pulls trailers for the event's trailer | same |
| 17 May | Demo build and store page submitted, for the press preview | same |
| 31 May | Everything submitted | same |
| 14–21 Jun | Next Fest. "Store page must be published and public"; "A game may only appear once" | same |
| 24 Jun–8 Jul | Summer Sale | Upcoming events |

What has to exist, and what exists on `b1f2114`:

| Piece | Needed for | State |
|---|---|---|
| Capsule set (920×430, 462×174, 1232×706, 748×896; library 600×900) | The page | Requested from an artist; nothing delivered |
| Five or more 16:9 shots of 1920×1080 or larger | The page | Three of the five itch.io shots are current (C6-7) |
| Description, features, AI survey | The page | Drafted for 0.1.1 (C6-5); the disclosure is wrong about the art (C6-1) |
| A trailer | The page (strongly advised); the fest's trailer by 3 May | A cut on Vimeo; not in the repository (C6-8) |
| Desktop build (97H, Electron) | Any Steam build, the demo included | Spec only: no `desktop/`, nothing in `release.yml` |
| Ten-year demo (97G) | The fest | Spec only: `VITE_EDITION=demo` exists (`build.ts:30`), but nothing ends a run at year 10 |
| The human edit of the most-read text | The demo; "edited by the developer" in the disclosure | Not started (BACKLOG *Launch*) |
| Wishlists | The fest's result | None: no page (C6-4) |

**Why.**
- Every row above feeds the fest. The page can't go up without capsules, and Steam can't ship a browser game without a desktop wrapper.
- A demo live for months before the fest earns more, and the two weeks before the fest count most (How To Market A Game, July 2026).
- The owner expects less time for the game in 2027. Plan 97 §5 already called the January page "tight".
- The playtest runs to mid-December, and its triage, the text edit and "1.0 finished" all land in the same weeks.

**Fix (the reviewer's judgment).**
- **The page:** send the artist the sizes and a 1 December delivery date. Submit the page by about 10 December, or in the first week of January. Either is fine for June.
- **If the art is late,** launch the page with a capsule cut from the game's own campus render and the code-drawn mark (the `itchCover.mjs` recipe at the capsule sizes). It is honest and needs no AI disclosure. Swap the commission in when it lands; Steam lets a capsule change.
- **Build 97H in November–December and 97G in January–February,** on the edited text. Then 2027 holds only the uploads, the registration, fest week and launch.
- **Read "1.0 finished" as feature-complete;** the text edit and fixes run into Q1.
- **Write the Steam plan that Plan 97 §5 foresaw** ("the plan before the Steam page"): Steamworks, the depots, the demo app, signing.

### C6-3. The full game is free on itch.io with no end date — major, S

**What.** itch.io serves all fifty years free ("No payments", `itch-page.md:31`). The playtest README says the form closes "mid December", but nothing says when the free full game ends. Plan 97 §5 planned "the full demo launch … on itch.io and Steam" for February–March.

**Why.**
- A buyer who searches the name at launch finds the whole game free.
- Next Fest bars a demo that is "a prologue, chapter 1, or otherwise 'demo' version of existing content available to customers". Valve probably means content sold on Steam. With the full game free elsewhere, though, the question is better settled than argued.
- R1 and I1 asked for Steam, so the itch.io players are the warmest wishlists (C6-4). They should be pointed there before the free build goes.

**Fix.**
- Decide now, and say it on the page: the full playtest build stays up to a date (say the Steam page's launch, or the demo's), then becomes the ten-year demo.
- Saves carry over one way (97G).
- Thank the playtesters in a devlog that links the Steam page.

### C6-4. No path yet from today's players to a wishlist — major, S–M

**What.** The game's audience today:
- 865 itch.io views and 501 plays (20 October);
- 11 collections and 2 ratings;
- six form replies from five players, one with an email;
- Reddit threads.

The 7-day impressions fell from 4,721 to 1,852 once itch.io's *new and popular* lift ran out (findings, *The numbers*). Nothing in the game or on the page points to a next step: the Final Report, the title screen and the feedback flow have no "follow" link. 97G's spec has *Follow the game*, pointing at the itch.io page.

**Why.**
- Games under 1,000 wishlists were "drowned out" at June 2026's fest (a median gain of 322).
- How To Market A Game's coming-soon "gold" band is 134–1,575 wishlists. Its launch bands start at 5,000.

**Fix.**
- When the page is live, put a "Wishlist on Steam" link at the top of the itch.io page and in every devlog.
- Add a link on the title screen, the Final Report and the form's thank-you. Make 97G's *Follow the game* the Steam page.
- Post the page on the Reddit threads that asked for it.
- Targets (**the reviewer's judgment**): 1,000 wishlists by registration (25 April), 3,000 by the fest, 5,000 at launch as the stretch.

### C6-5. The store copy leads with the memo's hooks, not the players' — minor, S

*Was review II §4.*

**What.** The Steam draft's short description (`steam-page.md:20–23`) sells "price each summer's class blind" and "the very best at one". What players praised:
- **Growth and building:** "Unlocking and expanding the campus" (F1), "I like watching my school grow" (F6), "seeing the money amount increasing and being able to buy everything" (F2), "opening of a medical school" (F4).
- **Depth:** "the football manager of universities" (R8), "this level of micromanaging" (S1), "the most fun and detailed simulation/city building game I played in a long long time" (R8).
- **Calm:** "soothing", "almost like a form of meditation" (S2), and *The Sims* twice (D1, S2).

No one named the blind price or the specialization as a best moment. The specialization is reached by few: 11 of the 80 runs founded since 0.1.0 got to year 21 (the statistics count 15 offers, saves loaded from files included). Every one offered it took it.

The draft also predates 0.1.3. It doesn't mention the chapters or the Guide. It says "five architectures", though nine exist, four of them earned. It says prestige "is graded once a year", though some of it now moves week by week (Plan 107F).

**Why.**
- The short description is the first copy a stranger reads.
- R12 said "a classic tycoon game right out the gate" from a screenshot and the page alone.
- **The reviewer's judgment:** "calm" fits the cosy audience, which is the least accepting of AI (October §7), and management sims already lead the disclosure trend. So depth and growth are the safer lead for the tycoon and Football Manager players, with calm as a supporting word.

**Fix.** A short description in the players' terms, for example: "Found a college and watch it grow for fifty years: build the campus, hire the faculty, fill each summer's class. Deep enough to be called the football manager of universities, calm enough to play with a coffee." Then:
- move the specialization to the replay line ("one specialization, for good; the next college can be different");
- add "learn it as you go: the first five years as chapters, or turn them off";
- say "nine architectures, four of them earned";
- put quotes in the long description, attributed "a playtester", as `quotes.md` advises (never on a capsule: Steam allows no text "beyond the title").

### C6-6. The first ten minutes decide a demo, and a third of runs end in them — major, M

*Was B6-5.*

**What.** Founded runs that never reached a summer: 53% on 0.1.0, 36% on 0.1.1 and 33% on 0.1.2. They stopped with at most three minutes of running clock, during or just after the walkthrough ([play statistics](data/play-statistics.md)). On 0.1.2, of the 8: 1 skipped at the welcome and left, 2 left at the first step, 2 at Plan 103's steps, 2 just after the walkthrough ended, and 1 sent no step.

The commonest finding of the playtest is the words. S2: "more words were being used than necessary". D1, S1 and F6 said the same, and T1 skimmed. 0.1.3 replaces the walkthrough's tail with chapters (Plan 106). Its 6 runs are almost certainly the owner's.

**Why.**
- At Next Fest a player tries many demos and leaves fast. A demo that loses a third before its first summer gets played and not wishlisted.
- The owner read the early stops as browsing (findings, 13 October), which is fair on itch.io. On Steam, though, a browser who leaves is a wishlist lost.

**Fix.**
- Read 0.1.3's funnel once outside players arrive. The `opening_step` and `chapter_opened` / `chapter_done` events exist (`analytics/events.ts:97–99`). The question is the share that reaches the first summer, against 0.1.2's 67%.
- Make the human text edit (C6-2) start with the welcome and the first three chapters.
- Area 3 owns the fix. The market side asks only that the demo isn't cut until the number improves.

### C6-7. The shop window shows the 0.1.1 game again — minor, S

*Was B6-1.*

**What.** The pictures on the live itch.io page were taken on 12 October. Since then:
- **Shot 2** (`itch/2-admissions.jpg`) shows the inbox's admissions card, replaced by Plan 108's page. It still prints "crowding eased: +17%", a rule Plan 107E retired. Its own retake recipe no longer works: `--click="Set tuition for the year"` (`itch-page.md:263`) names a button that is gone (now "Lock the price").
- **Shot 4** (`itch/4-faculty.jpg`) shows teaching as letters, replaced by numbers in 104G ([`img/c6-stale-store-shots.jpg`](img/c6-stale-store-shots.jpg)).
- **The README's tab shots** show the pre-0.1.3 game:
  - `tab-treasury.png` shows the old income statement, where 0.1.3 has one board;
  - `tab-history.png` shows the old Prestige view, with a "Crowding … of 25" row;
  - `tab-faculty.png` and `tab-curriculum.png` show letters, and the *Below A* filter that is now *Below top band*.

  The Faculty alt text (`README.md:164`) still says "a grade for teaching and research".
- **The time-lapse** is still the 25-second, 720p cut with the seasons off.

Shots 1, 3 and 5 and the share image are still true, except that the bottom bar's *Milestone* chip now reads *Objectives* (Plan 106B, `LogTicker.tsx:104`), a detail.

**Why.** R12's "classic tycoon" came from a picture of the Faculty tab. A store shot that prints a retired rule shows a game that no longer exists.

**Fix.**
- Retake itch.io shots 2 and 4 with `docs/images`' recipe ("Lock the price"), and the four README tabs with the tools README's commands.
- Fix the itch.io recipe.
- For Steam, add a sixth shot: the chapters' drawer open, the NEXT bar with a briefing. It answers "how do I learn this" at a glance.

### C6-8. The trailer can't be reviewed from the repository, and its copy was "too cryptic" — minor, M

*Was review II §4.*

**What.** The live itch.io page embeds a Vimeo video, "UniSchool - Free Playtest on Itch.io", last modified 21 October. The repository has no script, cut list or source for it: no `docs/store/trailer.md`, and `tools/README.md` documents only the time-lapse and the clips. The owner's own note on the first cut: its copy was "too cryptic" for first-time viewers. I could not watch it.

**Why.**
- Steam pulls trailers for the fest's event trailer on 3 May.
- Most visitors watch the first seconds of the page's trailer before they read a word. **The reviewer's judgment:** cryptic copy costs most there.

**Fix.**
- Keep the cut list and its captions in `docs/store/trailer.md`, so the next cut is an edit and not a redo.
- Open on the plain promise ("Found a college. Run it for fifty years."), then:
  - the time-lapse, re-cut with one seasonal year;
  - admissions day, the cloud and the line;
  - the faculty;
  - "Choose once" over the four cards;
  - the Final Report.
- Captions should state, not allude. The music is Tóth's theme or the game's own.

### C6-9. Price: players say less than $14.99, but hold it and don't raise it — minor, S

*Was review II §6.*

**What.** Six "would pay" answers from five players: $10–15 from one player who finished a run and came back for a second (F1, F3); $5–10 from F2 and F4; under $5 from F5, who had hit two bugs, and F6, who wrote "if some more was built out … I would prefer that it stay free".

The comparables list at $19.99–29.99, but in 2026 each was seen on sale at $4.49–6.99. Review II's condition for $19.99 was players starting a second run with a different specialization. One player came back for a second college and built it around athletics (F3, after F1's finished run). One is too few.

**Why.** These are players of a free playtest, so stated prices understate (**the reviewer's judgment**). The direction is still down, not up.

**Fix.** Keep $14.99 as the list price, with a 10–15% launch discount. Drop the $19.99 option. Revisit after the demo's wishlist-to-play ratio. Don't go under $9.99 ("too cheap to advertise", October §6).

### C6-10. A direct rival, *College Architect*, is announced for Q3 2027 — minor, S

**What.** *College Architect* (Skyranis Studios; Steam app 5006550) is "Design, build, and manage a college campus": an elite university or a community college, 2D top-down, with staff from a president down. It is coming Q3 2027, with one screenshot, no demo and no AI disclosure. It is the first university-level management game found announced since review II. *Wizdom Academy* (magic school) reaches 1.0 on 16 November 2026. The school tag is getting busier.

**Why.**
- It aims at the same buyer and the same window as UniSchool's late-summer launch.
- Its page has no AI disclosure, and UniSchool's will have one. Side by side, players compare the two.

**Fix.**
- Follow its page.
- Launch in August if 1.0 is ready, ahead of it. If it enters June's fest, be the deeper of the two: fifty years, a real catalogue, rivals, the specialization.
- Never name it in copy.

### C6-11. The itch.io page's fields and its doc lag the game — polish, S

**What.**
- The live page lists *Touchscreen* among its inputs, though phones are unsupported by decision (R4; 6 phone players, none reached a summer).
- Its genres include *Sports*, and its tags *Casual*.
- `itch-page.md:5–8` says 0.1.3 is "not yet built or uploaded", but the page shows *Update 0.1.3* posted at 21:04 UTC today.
- The doc's tagline ("Found a college and run it for fifty years. An early playtest …", `:26`) is not the live one ("University Management Sim").

**Why.** *Touchscreen* invites the players the page then fails. A doc that disagrees with the live page sends the next retake wrong.

**Fix.** Drop *Touchscreen* and *Sports*, and swap *Casual* for *Simulation* or *Strategy*. Update the doc's status and tagline.

### C6-12. "UniSchool" also names an education software product — polish, S

**What.** A search extract shows *UniSchool*, "an all-in-one charter school platform" by Unico Connect (August 2025); the page itself failed to load. No game of the name was found.

**Why.** The commissioned capsule art will carry the name, so a conflict found later costs the commission.

**Fix.** Search the trademark registers (USPTO classes 9 and 41) before the capsule brief is final.

## A checklist to the fest

| By | What | Finding |
|---|---|---|
| 31 Oct 2026 | Correct the "no image generator" lines; decide the itch.io build's end date; retake itch.io shots 2 and 4 | C6-1, C6-3, C6-7 |
| 1 Dec | Capsule set and title background from the artist (sizes in C6-2); trademark checked | C6-2, C6-12 |
| Nov–Dec | Desktop build (97H); store copy rewritten for 0.1.3; trailer cut list and a plainer cut | C6-2, C6-5, C6-8 |
| ~10 Dec, or the first week of Jan | Submit the Steam page (own-render capsule if the art is late) | C6-2 |
| On page launch | Wishlist links on itch.io, in game, in a devlog, on Reddit | C6-4 |
| Dec–Jan | Playtest triage; the human text edit, opening first; 0.1.3's first-hour numbers read | C6-6 |
| Feb–mid Mar 2027 | The ten-year demo (97G) on Steam and itch.io; the itch.io full build retired | C6-2, C6-3 |
| 25 Apr | Register for Next Fest (aim for 1,000+ wishlists) | C6-4 |
| 3 May | The final trailer on the page | C6-8 |
| 17 May / 31 May | Demo and page submitted for the press preview / everything submitted | C6-2 |
| 14–21 Jun | Next Fest | — |
| Aug–Sep | Launch at $14.99 with a launch discount, outside the Summer Sale and ahead of *College Architect* | C6-9, C6-10 |

## Tools

- **No game tools were run, and no server was started.** This area needed none, and the machine was left to the others. I made no repairs.
- **Captures reused, not retaken:** area 3's title screen (`scratchpad/c3/shots/g01-title.png`) and area 2's founding-week tabs (`scratchpad/c2/g0/founding-desktop-*.png`), both from the production build of `b1f2114` at 1440×900.
- **Two comparison images** were composed with Pillow from those captures and the committed pictures: [`img/c6-stale-store-shots.jpg`](img/c6-stale-store-shots.jpg) and [`img/c6-title-art.jpg`](img/c6-title-art.jpg).
- **The title art's metadata** was read with Pillow: none survives in the WebP, and there is no C2PA or XMP mark.
- **The web research** was a web search and page fetch, listed in [`data/c6-market-sources.md`](data/c6-market-sources.md). Direct `curl` to itch.io's image server and to Vimeo was refused by the proxy (403), so the live cover and the trailer were not seen.

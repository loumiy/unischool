# Plan 117 — The road to Next Fest

*The owner's choices on the third review's marketability findings
(23 October 2026; [area 6](../reviews/2026-10-game-review-iii/6-marketability.md),
Plan 109): C6-1, C6-2, C6-3, C6-4, C6-5, C6-7, C6-8, C6-9, C6-11 and
C6-12, each "do the recommended fix": the road from today's itch.io
playtest to Next Fest (14–21 June 2027, registration closing 25 April)
and a launch in late summer.*

**Status: Proposed.**

Most of this is the owner's work outside the repository: forms, uploads,
a commission, a search. So §1 lists the repository's PRs and the owner's
actions, and its calendar puts both in one sequence, each line marked
**PR** or **Owner**.

---

## 0. What stands today

At `f7b2091` (0.1.3 on itch.io since 21 October; Plan 112 on `main`,
not yet released):

- **C6-1, the disclosure.** Six places still say no image is generated:
  `docs/store/ai-disclosure.md:44–45`, `:89–90` (the Steam text), `:116`
  (the itch.io form) and `:131–132` (the short form);
  `README.md:115–116` and `:272–273`; and `docs/store/itch-page.md:212`.
  By the owner's account the itch.io cover is AI-generated, and the title
  background (`unischool/src/assets/campus-quad.webp`, drawn at
  `styles.css:402` behind the title, the startup screen and the front
  screens) reads as generated. The code-drawn quad of 15 October
  (`4f384089`) was taken out the same day (`e96e8c1e`) and lives in git.
- **C6-2, the critical path.** No `desktop/`; `.github/workflows/release.yml`
  builds only the itch.io web folder. `VITE_EDITION=demo` exists
  (`unischool/src/build.ts:30`), but nothing ends a run at year 10. The
  capsule set is requested, not delivered (`BACKLOG.md:121`). No Steam
  plan exists; Plan 97 §5 named one ("the plan before the Steam page").
- **C6-3, the free full build.** `itch-page.md:30` reads "No payments (free
  while it's being tested)". No doc gives an end date.
- **C6-4, the wishlist.** No Steam page. Nothing in `unischool/src` links
  to a store; the title screen's menu ends at *Send feedback*
  (`TitleScreen.tsx:105`). The feedback link is a build setting
  (`VITE_FEEDBACK_URL`, `feedback.ts:17–34`); there is no such setting
  for a store page. 97G's *Follow the game* is specced as the itch.io page.
- **C6-5, the store copy.** `steam-page.md:20–23` leads with the blind
  price and "the very best at one"; `:44` and `:77` say five
  architectures (nine exist, four earned); `:57` says prestige "is graded
  once a year". No chapters, no Guide, no player quote.
- **C6-7, the shots.** `docs/store/itch/2-admissions.jpg` shows the
  retired inbox card and "crowding eased"; `4-faculty.jpg` shows teaching
  as letters; the retake recipe clicks "Set tuition for the year"
  (`itch-page.md:263`), now "Lock the price". The README's
  `tab-treasury`, `tab-history`, `tab-faculty` and `tab-curriculum`
  predate 0.1.3, and the Faculty alt text says "a grade for teaching and
  research" (`README.md:164`). Plan 112 moved the UI further (the
  objectives drawer, the admissions hall).
- **C6-8, the trailer.** A Vimeo cut is on the itch.io page; there is no
  `docs/store/trailer.md`.
- **C6-9, the price.** `BACKLOG.md:115–116`: "The price is undecided".
- **C6-11, the itch.io doc.** `itch-page.md:5–8` says 0.1.3 is "not yet
  built or uploaded"; `:26` has a tagline the live page doesn't;
  `docs/reviews/playtest-1/README.md:45` says "Not yet uploaded". The
  live page lists *Touchscreen*, *Sports* and *Casual*.
- **C6-12, the name.** Nothing records a trademark search.

## 1. The work

### The PRs

| PR | Findings | What |
|---|---|---|
| A | C6-1, C6-3, C6-9, C6-11, C6-2 | The words: the disclosure says what was generated; the itch.io doc's status, tagline, fields and end date; the price and the dated road in `BACKLOG.md`. Docs only. |
| B | C6-7 | The shop window: itch.io shots 2 and 4, the four README tabs and their alt text, the recipe fixed, and a sixth shot for Steam. |
| C | C6-1 | The title painted by the game's own code again, in place of `campus-quad.webp`; the disclosure's "no picture in the game" made true. |
| D | C6-5 | The Steam copy in the players' terms, for 0.1.3–0.1.4. |
| E | C6-8 | `docs/store/trailer.md`: the cut list and its captions. |
| F | C6-2 | The fallback capsule set from the game's own campus and mark. |
| G | C6-4 | A store link, set by the build, on the title screen and the Final Report. |
| H | C6-2 | The Steam plan: Steamworks, depots, the demo app, signing. A plan, no code. |
| I | C6-2 | 97H, the desktop build, to Plan 97's spec and H's signing. |
| J | C6-2, C6-3, C6-4 | 97G, the ten-year demo, its *Follow the game* on G's link. |

**A — The words.** Waits on the owner's list of generated pictures (O1)
and the end date (O2, §2 Decision 1).
- `ai-disclosure.md:44–45`, `:89–90`, `:116`, `:131–132`, `README.md:115–116`
  and `:272–273`, and `itch-page.md:212` say which pictures are generated,
  in the review's words: "The title-screen background and the itch.io
  cover are AI-generated stand-ins, to be replaced by commissioned art."
  Add, under *What that produced* (`:36`): "The store text and the
  trailer's captions were written with the same assistant." The Steam
  text (`:79–94`) gets a note above it: never paste it while the build
  ships a generated picture, and the AI cover never goes on Steam.
- The next devlog's first line, in the 0.1.4 devlog draft
  (`docs/store/devlog-0.1.4.md`, started here if no one has yet): the
  correction, and that 0.1.2's "new painting of the quad. Thank you,
  Alejandro" credited him for the music, not the picture.
- `itch-page.md`: the status (0.1.3 up on 21 October), the live tagline,
  an *Inputs* row (keyboard and mouse), the genre and tags as O3 sets
  them, and the pricing row and one line of the description with O2's
  date. `playtest-1/README.md:45`: 21 October.
- `BACKLOG.md` *Launch*: the price ($14.99 list, a 10–15% launch
  discount, no $19.99, never under $9.99, revisited on the demo's
  wishlist-to-play ratio, launch August–September outside the Summer
  Sale); "1.0 finished" read as feature-complete, the text edit running
  into Q1 2027; the itch.io end date; and §1's calendar in short, in
  place of the January-page dates Plan 97 §5 set.
- **Tested:** `npm run check` (docs only). `grep -rn "generator" README.md
  docs/store` finds only the corrected lines.

**B — The shop window.** On `main` after Plan 112, so the shots show the
drawer and the hall that 0.1.4 ships.
- `itch/2-admissions.jpg` and `itch/4-faculty.jpg` retaken; the recipe at
  `itch-page.md:263` clicks "Lock the price" and presses the admissions
  page's beats as `tools/README.md:159–163` does.
- `docs/images/tab-treasury`, `tab-history`, `tab-faculty`,
  `tab-curriculum` retaken with `tools/README.md:154–158`; the alt text
  at `README.md:164` says teaching and research as numbers.
- A sixth shot, `itch/6-chapters.jpg`: a founding-years scenario with the
  objectives drawer open (`LogTicker.tsx`'s Objectives chip) and the NEXT
  bar's briefing. Its row joins `steam-page.md`'s table (*The five
  screenshots* becomes six) and `itch-page.md`'s.
- **Tested:** each shot looked at; every recipe line in `itch-page.md`
  and `tools/README.md` run once from a clean `node_modules/.tmp`.

**C — The title from code.** §2 Decision 2.
- Bring back `campus-quad.svg` and `tools/titleArt.py` from `4f384089`;
  `styles.css:402` and the comment at `TitleScreen.tsx:23` point at the
  SVG; `campus-quad.webp` goes. Check the SVG's 212 KB gzipped against the
  build's budget, and that Plan 115's C1-6 change to the founding card
  (the same screens) is merged first or rebased on.
- The disclosure lines A changed lose the title clause: the build holds no
  generated picture, the Steam text is true again, and only the itch.io
  cover is named until O6 replaces it.
- **Tested:** `npm run check`; `npm run shot` of the title and the
  founding screen at 1440×900 and 1280×720, looked at.

**D — The store copy.** `steam-page.md`, from the review's C6-5:
- the short description in the players' terms (growth, building, depth,
  "calm enough to play with a coffee"), under Steam's 300 characters;
- the specialization moved to the replay line ("one specialization, for
  good; the next college can be different");
- "learn it as you go: the first five years as chapters, or turn them
  off";
- "nine architectures, four of them earned" at `:44` and `:77`; prestige
  that moves through the year at `:57`;
- two or three quotes from `quotes.md`'s shortlist in the long
  description, "a playtester", never one player twice, none on a capsule;
- *What waits on others*: the page may go up on F's capsules.
- Plain words (Plan 111) for every line. **Tested:** read against `main`;
  `npm run check`.

**E — The trailer's cut list.** `docs/store/trailer.md`: the shots in
order, each with its source command, its seconds and its caption.
Open on "Found a college. Run it for fifty years."; then the time-lapse
re-cut over one year with `--seasons` (`tools/README.md`, *Fifty years in
thirty seconds*), admissions day (the cloud and the line), the faculty,
"Choose once" over the four cards, the Final Report. Captions state; the
music is Tóth's theme or the game's own. Linked from `tools/README.md`.
**Tested:** every command run once; the owner cuts from it (O9).

**F — The fallback capsules.** `tools/itchCover.mjs` learns the Steam
sizes (920×430, 462×174, 1232×706, 748×896, library 600×900) at exactly
that size, not doubled, with the name kept legible at 462×174. Outputs go
to `docs/store/steam/`, with the commands in `steam-page.md`. The code-drawn
mark and the campus render need no AI disclosure. **Tested:** each size
checked by dimension in the script, and looked at.

**G — The store link.** `VITE_STORE_URL`, read like `VITE_FEEDBACK_URL`
(`feedback.ts:17–34`): unset or not https, no link anywhere. When set:
*Wishlist on Steam* on the title menu after *Send feedback*
(`TitleScreen.tsx:105`) and beside the Final Report's card actions
(`ReportCardActions.tsx`). `release.yml` passes a repository variable
`STORE_PAGE_URL`, as it does `ITCH_PAGE_URL`. Lands before the page and
shows nothing until O12 sets the variable. **Tested:** a unit test beside
`test/feedback.test.ts` for the URL rule; `npm run check`.

**H — The Steam plan.** A plan of its own (the next free number), written
in November so I and J build to it: the Steamworks app and the demo as
its own app, the depots per platform, `steamworks.js` or not at 1.0,
Windows signing, macOS notarizing ($99 a year) or Windows and Linux first,
the upload (SteamPipe) as the owner's step, and the review's dates.

**I — 97H, the desktop build.** Plan 97's PR H as specced (`desktop/`,
Electron, `app://`, hardened, `electron-builder` packages from
`release.yml`), signed as H decides. November–December.

**J — 97G, the ten-year demo.** Plan 97's PR G as specced: the run ends
after the tenth summer on an end screen of what is ahead, sandbox hidden,
saves one way into the full game. *Follow the game* opens G's store link,
with the itch.io page as its fallback. Built on the edited text (O11).
January–February 2027.

### The owner's actions

| | Finding | What |
|---|---|---|
| O1 | C6-1 | List which pictures were generated: the live itch.io cover, the title background, anything else. A and C wait on it. |
| O2 | C6-3 | Decide the free full build's end date (§2 Decision 1) and say it on the live page. |
| O3 | C6-11 | On the live page: untick *Touchscreen*, drop *Sports*, swap *Casual* for *Simulation* or *Strategy*. |
| O4 | C6-12 | Search USPTO (classes 9 and 41) and the EU register for "UniSchool", and record the result in A or the next PR. Before the capsule brief is final. |
| O5 | C6-2 | Send the artist [`docs/store/art-brief.md`](../store/art-brief.md) (the title art, the Steam capsules and the logo) with a 1 December delivery date. |
| O6 | C6-1 | Replace the live AI cover with `itch/cover.jpg` (§2 Decision 3); correct the itch.io AI form's Graphics note to A's words. |
| O7 | C6-7 | Upload B's shots 2 and 4 to itch.io. |
| O8 | C6-2 | Finish Steamworks onboarding (tax, bank, the app fee for the game and the demo app). |
| O9 | C6-8 | Cut the plainer trailer from E; then the final one. |
| O10 | C6-2 | Submit the Steam page on D's copy and the commission, or F's capsules if the art is late. |
| O11 | C6-2 | The human text edit (BACKLOG *Launch*), before J. |
| O12 | C6-4 | On page launch: *Wishlist on Steam* at the top of the itch.io page and in every devlog; the Tally form's thank-you; the Reddit threads that asked; set `STORE_PAGE_URL` and release a build. |
| O13 | C6-3 | Retire the itch.io full build for J's demo; a devlog that thanks the playtesters and links the Steam page. |

### The calendar

The review's 31 October holds for the disclosure, the end date and the
two shots: eight days, all small.

| By | Who | What |
|---|---|---|
| 27 Oct | Owner | O1 (the list), O2 (the date), O3 (the fields) |
| 30 Oct | Owner | O4, the name searched |
| 31 Oct | PR | A (the words), B (the shots) |
| 31 Oct | Owner | O5 (the brief), O6 (the cover and the form), O7 (the shots up) |
| 7 Nov | PR | C (the title from code); with 0.1.4's upload, the devlog's correction |
| 14 Nov | PR | H (the Steam plan) |
| 21 Nov | PR | D (the copy), E (the cut list) |
| 30 Nov | PR | F (the fallback capsules), G (the store link, dormant) |
| Nov | Owner | O8 (Steamworks onboarding) |
| Nov–Dec | PR | I (97H) |
| Nov–Dec | Owner | O9, a plainer trailer cut |
| 1 Dec | Owner | The commission due; if it isn't in by 3 Dec, F's capsules |
| ~10 Dec, or the first week of Jan | Owner | O10, the page submitted (review takes 3–5 business days; the Winter Sale runs 17 Dec–4 Jan) |
| On page launch | Owner | O12, the wishlist links |
| Mid Dec | Owner | The playtest form closes; the thank-you devlog links the page |
| Dec–Jan | Owner | O11, the text edit, the opening first |
| Jan–Feb 2027 | PR | J (97G) |
| Feb–mid Mar | Owner | The demo on Steam and itch.io; O13, the full build retired |
| Apr | Owner | The price revisited on the demo's wishlist-to-play ratio |
| 25 Apr | Owner | Register for Next Fest; aim for 1,000 wishlists |
| 3 May | Owner | The final trailer on the page |
| 17 May / 31 May | Owner | Demo and page in for the press preview / everything in |
| 14–21 Jun | Owner | Next Fest; aim for 3,000 wishlists |
| Aug–Sep | Owner | Launch at $14.99 with a 10–15% discount; 5,000 wishlists the stretch |

## 2. Decisions to take

1. **When does the free full build end?** Recommended: the day the
   ten-year demo replaces it on itch.io, by mid-March 2027, said now on the
   page as "free in full until the demo, about March 2027". Ending it at
   the Steam page's launch (December) loses the playtest's longest runs
   before the form closes.
2. **The title from code, again?** `e96e8c1e` put the painting back on
   15 October. Recommended: bring back the code-drawn quad (C) until the
   commission lands. The build then holds no generated picture, and the
   demo needs no art disclosure. If not, C is dropped and A's sentence
   stands.
   **The owner's answer (23 October): no.** The code-drawn title doesn't
   look right to the owner. The generated painting stays as a placeholder
   until a commissioned replacement arrives, so C is dropped. A's
   disclosure names the title painting as generated, in the README, the
   itch.io page and the Steam form. The commission's brief (O-actions)
   covers the title art as well as the capsules.
3. **The live itch.io cover.** Recommended: replace it now with the
   repository's `itch/cover.jpg`, the game's own render under the code
   mark, so the itch.io disclosure names nothing generated either.

## 3. What this plan does not do

- **C6-6** (the first ten minutes): the owner chose to do nothing. The
  text edit (O11) is a dependency here, not sequenced.
- **C6-10** (*College Architect*): no tracking of it, no copy against it.
- **C1-6** (the founding screen at 1280×720) is Plan 115's; C only
  rebases on it.
- No Steamworks features (achievements, cloud saves, the overlay), no
  auto-update, no `1.0.0`: H decides what 1.0 needs.
- No gameplay or balance change, and no analytics on the store link.

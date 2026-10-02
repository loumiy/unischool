# 6. Marketability

Plan 86, area 6. Commit read: `4062bfb`. Written, like October's ([`../2026-10-game-review/6-marketability.md`](../2026-10-game-review/6-marketability.md)), as a memo to a small studio's greenlight meeting. It re-reads that memo a week on: what changed in the game (Plans 74–85), what changed in the market and the sources since 27 September 2026, and what that does to the recommendations.

**About the sources.** The research ran on 2 October 2026 from this review's container. The network policy blocked every page fetch that was tried, more than in September: the Steam store and Steamworks, SteamDB, Steambase, GameDiscoverCo, How To Market A Game, Game Developer, PC Gamer, itch.io, Wikipedia, and also smaller sites (steampageanalyzer.com, tech-insider.org, aroged.com, presskit.gg). So **every figure below comes from a search engine's extract of the cited page, not from the page itself.** Treat each number as a lead to check before it goes into a pitch deck. Where two extracts disagree, both are given.

The game-side claims were checked in the code at `4062bfb` and on the production build (`localhost:4173`, 1440×900). Where the memo gives a judgment rather than a fact, it is labelled **the reviewer's judgment**. The reviewer is a model; this is a desk study, not market testing.

## The recommendation, first

The October verdict holds: a niche premium indie game at **$14.99**, found through a free web demo and a Steam page, with honest AI disclosure. What moved in a week:

1. **The game gained its best hook.** Plan 85's four pillars and a single permanent specialization give the pitch a line October could not write: *excellent at all four, the very best at one.* That is the start of the answer to replay value (A4-1). It is not the whole answer yet: two of the four specializations don't yet put the college first in their own pillar (B6-2).
2. **The picture improved, and the shop window did not.** Seasons, the ring of land with its hills and haze, the canvas map, the redrawn landmarks and a grid of faculty faces are all in the game. None of them is in the README, the share image or the time-lapse, and the title screen still shows no campus (B6-1).
3. **The market got harsher on AI, not softer.** About a third of new Steam releases now carry an AI disclosure, and they take a far smaller share of sales than of releases. Even Sega's *Crazy Taxi* drew a backlash for using AI for reference sketches only. Disclose, show the human direction, and buy the art players look at (B6-3).
4. **The February 2027 Next Fest is now out of reach.** Its registration closes on 10 January 2027, fourteen weeks away, with this review's fix list still to triage. **Aim at June 2027** (registration closes 25 April 2027), with the Steam page live by January so wishlists build before the fest (B6-4).

## The findings

| Id | Finding | Severity | Effort | Was |
|---|---|---|---|---|
| B6-1 | The shop window shows the September game: README, share image, time-lapse, title screen | major | M | October §3.2, area 3's title screen |
| B6-2 | The specialization hook is real, but only two of four specializations top their own pillar, and the choice comes at year 31–35 | major | S–M | A4-1 (area 4), October §3.3 |
| B6-3 | AI disclosure is ready in the credits but nowhere a buyer looks, and the text players read has grown | major | S | October §7 |
| B6-4 | The release timeline: February's Next Fest is no longer realistic | major | S | October §5 |
| B6-5 | A first run still ends near the refund line. The sandbox and Epilogue help, and the store page should say so | minor | S | October §3.4, §3.6 |
| B6-6 | Three of the October memo's own facts need correcting | polish | S | October §2, §5, §6 |

## The October findings

The October memo listed three conditions for shipping and a set of recommendations; it gave them no ids. Their status on `4062bfb`:

| October item | Status | Evidence |
|---|---|---|
| Condition 1: a picture a stranger wants to click (seasons, landmarks, a title screen with a campus) | **Partly fixed** | Seasons (Plan 74I, on by default: `src/settings.ts`, `seasons: true`), the redrawn landmarks (74C), the ring of land (Plan 81), the canvas map (Plan 83). The title screen still has no campus ([`img/b6-title.jpg`](img/b6-title.jpg)). Carried as B6-1. |
| Condition 2: choices that exclude each other (A4-1) | **Partly fixed** | Plan 85: one permanent specialization of four (`src/data/specializationData.ts`; every "still to come" mechanic now `ready: true`). Two of four don't lead their own pillar in 85I's runs. Area 4 owns the verdict on A4-1. Carried as B6-2. |
| Condition 3: AI writing disclosed, human direction visible | **Partly fixed** | The in-game Credits say "Built with Claude Code, plan by plan" (`src/components/Credits.tsx`). There is no store-ready disclosure text and no devlog. Carried as B6-3. |
| A sandbox after the report | **Fixed** (and partly a mistake in October) | The Epilogue already ran the game on after the Final Report: "Continue into the Epilogue →" (`src/components/InterruptModal.tsx`), and the README says so. A **Sandbox** on the title screen (unlimited funds, instant building, every building open) landed on 29 September (`src/systems/sandbox/sandbox.ts`). See B6-5 and B6-6. |
| Share card for the Final Report | **Still in place** | `src/state/reportCard.ts`. |
| Hand-made capsule art, logo, human-composed trailer music | **Open** | Nothing in the repository. Expected: these are commissions, not code. Part of B6-3. |
| Trailer opening on a campus through the seasons | **Partly done** | A time-lapse first cut exists (`docs/images/timelapse.webm`, 28 Sep), but with the seasons off, because one frame a quarter strobes the winter white (`tools/README.md`). Part of B6-1. |
| Free web demo, Steam page, Next Fest February 2027 or June 2027 | **Open; February now unrealistic** | B6-4. |

## What changed in the game since 27 September

Twelve plans landed between `58fa3fd` and `4062bfb`. For a buyer, five matter:

- **Seasons and a place around the campus.** Trees turn in the autumn, the ground goes white at the turn of the terms, and spring greens it again ([`seasons.png`](../2026-10-campus-fixes/seasons.png)). Plan 81 put farmland, a road, hills and haze around the parcel, so the campus no longer floats on a green board ([`81e-3-year30-wide.jpg`](../2026-10-campus-fixes/81e-3-year30-wide.jpg)). Plan 83's canvas renderer makes a turn of the view smooth ([`../2026-10-canvas/`](../2026-10-canvas/)).
- **Landmarks, venues and the estate redrawn** (Plans 74, 75). The October memo's three screenshot problems were A1-6 (derelict), A1-1 (converging vernaculars) and A1-4 (unfinished landmarks). Area 1 re-checks them in this review.
- **Faculty as people** (Plan 84): a grid of faces, each with a career, quirks and a bio ([`84d-grid-late.jpg`](../2026-10-faculty/84d-grid-late.jpg)). The portraits are drawn by code from a hash of the professor's id (`src/components/FacultyPortrait.tsx`), not generated images.
- **Four pillars and a specialization** (Plan 85). Prestige is now a blend of academics, research, student life and athletics. Around year 30, at the overall top 20, the board offers one permanent specialization: the faculty training program, the research park, the downtown and its festival, or the athletic performance complex ([`85d-choice-confirm.jpg`](../2026-10-pillars/85d-choice-confirm.jpg)).
- **An inbox and a game that teaches itself** (Plans 77, 78). Good for retention. They don't make a picture.

**What that does to the October verdicts (the reviewer's judgment):**

- **Production values: up a step, from "tidy" to "a place".** The year-30 view with the ring of land and the autumn trees reads as a picture in its own right. It is still a flat-shaded procedural campus, not Two Point's hand-animated 3D, and nothing changed about humour or animation. So the art remains a reason a buyer chooses a competitor, but no longer a reason to scroll past.
- **Replay value: the structure is now there.** A run ends in one of four identities, chosen once and kept, with rivals that specialize too. 85I's harness shows each specialist reaching first by year 50 on most seeds, and the unspecialized player never first on the three main seeds (on five more seeds it took first once, by 0.6 points, in its last two years) ([Plan 85, 85I](../../plans/85-specializations.md)). That makes "play again as a research university" a real pitch. B6-2 has the two gaps.
- **The store-page screenshot: better material, no new shots.** Every image a stranger would see today predates the changes above (B6-1).

## 1. The niche: what it is and who plays it

**Unchanged in substance.** Simulation is a durable Steam genre, and the school sub-niche is real but small. Updated counts (search extracts):
- **Let's School:** 7,465 reviews, 93% positive "as of mid-2026" ([Steambase extract](https://steambase.io/games/lets-school/info)), against October's 6,963.
- **Two Point Campus:** Steambase still shows 88 from 8,080 ([Steambase](https://steambase.io/games/two-point-campus/steam-charts)). It was 85% off in the 2025–26 winter sale ([Steam news extract](https://steamcommunity.com/app/1649080/allnews/)).
- **Academia: School Simulator:** 86 from 3,062 ([Steambase](https://steambase.io/games/academia-school-simulator/steam-charts)), unchanged. About 18 concurrent players in the extract.

The crowding figure re-verifies: about 19,200 games released on Steam in 2025, with 48.8% under ten reviews and 6.2% over 500 ([SteamDB via Mein-MMO](https://mein-mmo.de/en/in-2025-more-than-19000-games-were-released-on-steam-but-almost-half-of-them-did-not-even-receive-10-reviews,1542361/), [GamingOnLinux, Dec 2025](https://www.gamingonlinux.com/2025/12/over-19000-games-have-released-on-steam-in-2025-with-nearly-half-seeing-fewer-than-10-reviews/)).

**Who plays it (the reviewer's judgment), one addition.** The specialization gives the game a second audience: players of *Football Manager* and grand strategy who want a long arc with a late, permanent fork. The README already names Football Manager and Civilization as inspirations.

## 2. The competitors

**What changed:** no new university-level management game was found announced or released since September. The university slot is still Two Point Campus (comic, 2022) and University Tycoon (solo, 2024). Every new entry found is a secondary school or a life sim:

| Game | What's new since 27 Sept | Against UniSchool |
|---|---|---|
| **Two Point Campus** (SEGA) | Nothing new for Campus. The studio's attention is on *Two Point Museum*: DLC *Arty-Facts* (May 2026), and *Rides & Relics*, announced September and out 8 October ([Gematsu, Sep 2026](https://www.gematsu.com/2026/09/two-point-museum-dlc-rides-relics-announced)). The 10th anniversary of Two Point County was celebrated in July ([Steam news extract](https://steamcommunity.com/app/1649080/allnews/)). | No sequel is pressing on the university niche. Campus at deep discount is the price anchor a buyer sees beside UniSchool. |
| **Let's School** (Pathea) | No 2026 content update found. Pathea's next game is *My Time at Evershine*, 2027 ([Wikipedia extract](https://en.wikipedia.org/wiki/My_Time_at_Evershine)). | Unchanged. |
| **Academia: School Simulator** (Paradox) | No 2026 update found ([Steam news extract](https://steamcommunity.com/app/672630/allnews/)). | Unchanged. Still the business precedent. |
| **University Tycoon** (Robert Gould) | No reviews visible on the store page in the extract; last updates listed are v1.1–1.2, August 2024 ([Steam extract](https://store.steampowered.com/app/3083800/University_Tycoon__The_College_Management_Simulator/)). | The closest concept appears dormant. |
| **Mind Over Magic** (Klei Publishing) | Steambase 87 from 4,276. The community reads the game as finished, with updates stopped in 2025 ([Steambase](https://steambase.io/games/mind-over-magic/reviews), [Steam discussion](https://steamcommunity.com/app/1270580/discussions/0/686364301854911070/)). | One player complaint in the extract is "little reason to play" late on. That is the same replay problem UniSchool is solving with B6-2. |
| **School Owner Simulator** (Bewolba Studios) *new* | Secondary-school builder; demo in the June 2026 Next Fest; release "coming soon" ([Steam extract](https://store.steampowered.com/app/4655290/School_Owner_Simulator/)). | A smaller, younger rival in the school tag, not higher education. |
| **AI School Simulator** (StarForge Software) *new* | An Early Access life sim whose students are driven by OpenAI and Gemini ([Steam extract](https://store.steampowered.com/app/4539070/AI_School_Simulator/)). | Not a competitor in play, but a **naming hazard**: "AI" plus "school simulator" in one store search. UniSchool's copy should never pair those words (B6-3). |

The October table's other rows (Game Dev Tycoon, Mini Metro, ISLANDERS, Dorfromantik, shapez) were not re-checked; nothing suggests they moved.

**What UniSchool now has that none of them does**, adding to October's list: a permanent four-way specialization with rivals that specialize; a faculty of named people with careers; a campus through four seasons. **What the others still have that it lacks** is unchanged: hand-made art and animation, humour, console reach.

## 3. What would stop it earning

1. **Discovery.** Unchanged and re-verified (above). How To Market A Game updated its two-week wishlist benchmarks on 14 September 2026. Per the extract, a "gold" page earns about 134–1,575 wishlists in its first two weeks, and 0–20 is a warning sign ([How To Market A Game, Benchmarks](https://howtomarketagame.com/benchmarks/)).
2. **The first screenshot.** Better material, not yet used (B6-1).
3. **Replay value.** Structurally answered by Plan 85, with two gaps (B6-2).
4. **Session length against the refund window.** Re-verified: Steam refunds within 14 days and under 2 hours ([Steam](https://store.steampowered.com/steam_refunds/)), and *Paddle Paddle Paddle*'s 55,000 refunds on 270,000 copies are re-reported ([Kotaku](https://kotaku.com/steam-indie-short-pc-refund-paddle-paddle-paddle-zoroarts-2000712822), [Windows Central](https://www.windowscentral.com/gaming/pc-gaming/this-should-not-be-possible-how-one-indie-game-was-refunded-over-55-000-times-on-steam-and-the-mystery-behind-it)). One secondary source puts typical refund rates at 4–8% for "deep engagement" genres and 20–30%+ for short experiences ([XDA extract](https://www.xda-developers.com/steams-two-hour-refund-window-killing-niche-indie-games/)). The clock is unchanged: 5 s a week at 1× (`src/engine/useGame.ts`, `SPEEDS`), so 3.6 h at 1×, 1.8 h at 2×, 54 min at 4× and 27 min at 8×, plus stops. See B6-5.
5. **Web-only form.** Re-verified: the typical web session is 11–20 minutes (29% of respondents), and 58% play web games because they're free ([Poki, 2026](https://poki.com/blog/state-of-web-gaming-report-2026), [GameDev Reports extract](https://gamedevreports.substack.com/p/poki-web-gaming-perceptions-in-2026)). Still a demo channel, not a product channel.
6. **The AI label itself** is now a measurable drag on discovery, not only on sentiment (§7). October listed it under §7 only. **The reviewer's judgment:** it belongs on this list.

## 4. Marketing

- **The one-line pitch, revised:** "Found a college and run it for fifty years. Be excellent at academics, research, student life and athletics — but you can only be the very best at one."
  October's line ("Found a college in 1 week and run it for 50 years …") sells the length. The new one sells the decision, and it is the owner's own framing of Plan 85 ("you can build a school that's excellent at all 4, but you can only be the very best at one").
- **The hooks, re-ranked (the reviewer's judgment):**
  1. **The specialization:** four doors, one key, no undo. It is new, and it is the replay hook.
  2. **The summer:** price the year blind, then see who applies.
  3. **A campus through fifty years and four seasons**, now with land around it.
  4. **A faculty of people:** faces, careers, quirks, the professor who "Brings the dog".
  5. **The Final Report** and its shareable title.

  The real catalogue (431 courses) and the five architectures drop to supporting lines. They are depth, not a hook.
- **Channels:** unchanged. Steam; a free web demo on the game's own site and itch.io; management YouTubers; r/tycoon, r/CityBuilders, r/HigherEducation.
- **The store page.** Five screenshots, in this order (the reviewer's judgment):
  1. a year-30-plus campus in autumn, with the ring of land;
  2. the summer's admissions card;
  3. the specialization choice, its four cards side by side;
  4. the Faculty grid;
  5. the Final Report.

  Leave out the inbox and the Curriculum. They are the game's working screens, not its pictures.
- **The trailer.** Open on the time-lapse, re-cut with seasons for one year in the middle: one frame a week for a year, so the white winter reads as a season rather than a flicker. Then the summer, then the four cards with the line "choose once", then the Final Report.
- **The demo and the hook.** The specialization arrives around year 30 (85I: the top 20 in years 31–35 for the Guided player). A ten-year demo can't show it. **The reviewer's judgment:** end the demo with the board's letter that names the four pillars and the choice to come, and put the four cards on the store page, so the demo sells what it can't reach.

## 5. Release timeline

Dates re-verified from search extracts of the Steamworks pages (fetch blocked): February 2027 Next Fest, 22 Feb–1 Mar, registration closes 10 Jan, press-preview build 25 Jan ([Steamworks extract](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/feb_2027)). June 2027, 14–21 Jun, registration closes 25 Apr, press-preview build 17 May, final submission 31 May ([Steamworks extract](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/june_2027)). The October 2026 edition runs 19–26 Oct ([Steamworks extract](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/2026october)). It is too soon for UniSchool and is listed only because it is happening now.

| Stage | When | What gets it ready | Changed? |
|---|---|---|---|
| Private playtest (70L) | Oct–Dec 2026 | This review's fix list, then outside players. Measure session length, where people quit, and **whether they reach the specialization** (year 30 is late; see B6-5). | One month later. |
| Steam "coming soon" page | **January 2027** | B6-1's new screenshots and trailer cut, the disclosure (B6-3), commissioned capsule art. | **Moved earlier**, ahead of the demo, so wishlists build before the fest. |
| Web demo, first ten years | Feb–Mar 2027 | The first decade polished, and the letter that names the four pillars as its last beat (§4). | Two to three months later. |
| Next Fest | **June 2027** (register by 25 Apr 2027) | A demo live for three months before the fest. | **February dropped** (B6-4). |
| Launch | Aug–Sep 2027 | B6-2's two gaps closed, so the second run is the draw. | Later by the fest's move. |
| Post-launch | quarterly | New vernaculars, athletics levers (A4-5), more specialization content. | Seasons and a sandbox are done, so they leave this row. |

## 6. Price

**$14.99 still, revisit $19.99 after the playtest.**
- **The market, corrected (B6-6).** Per the extracts, GameDiscoverCo's median price for the top 50 new Steam games fell from $19.50 (Feb 2023) to $15.64 (Oct 2025) **ranked by copies sold**. Ranked by revenue it fell from $23.70 to $20.35 (−14%). The mean barely moved (−2%) ([GameDiscoverCo](https://newsletter.gamediscover.co/p/are-steam-game-prices-dropping-and), [GamesRadar](https://www.gamesradar.com/games/the-median-price-of-best-selling-new-games-on-steam-has-dropped-in-the-past-2-years-research-finds-charging-usd25-is-getting-trickier-as-players-compare-value-to-the-usd10-usd15-indie-titles/)). One extract says the dollar figures aren't in the public summary, so check them in the newsletter itself.
- **What argues up:** a replay structure (Plan 85), a sandbox and an Epilogue. Together they answer the "one evening" worry that held October at $14.99.
- **What argues down:** the AI label's measured drag on reviews (§7), and Two Point Campus deeply discounted beside it.
- **The reviewer's judgment:** the two roughly cancel. $14.99 stays the launch price, with $19.99 justified only if the playtest shows players starting a second run with a different specialization.

## 7. The anti-AI question

**The facts about UniSchool, re-checked on `4062bfb`.**
- The code and writing were built with an AI assistant. The commit history shows it (143 of 196 commits in this clone authored "Claude"), and so does the in-game Credits screen: "Built with Claude Code, plan by plan" (`src/components/Credits.tsx`).
- Still no AI-generated images, audio or voice:
  - the new faculty portraits are drawn by code (`FacultyPortrait.tsx`);
  - the music is synthesized (`src/components/audio/engine.ts`);
  - the only image files are the favicon, the touch icon and the share image, a screenshot of the game (`public/`).
- **The player-facing text has grown.** Plan 84 adds bios, quirks and careers for every professor; Plan 85 adds the pillars, the specialization cards and the festival and downtown events. Area 2 has the new word count. This is the part Steam's disclosure covers.
- **The game generates no AI content at runtime.** Steam's second category ("AI content generated during gameplay") doesn't apply, and the disclosure should say so in words.

**What changed in the storefront rules and in sentiment since 27 September.**
- **Steam's rules: unchanged since January 2026.** Code assistants are exempt. Player-facing generated content, including text, must be disclosed, and the disclosure shows on the store page ([Game Developer](https://www.gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam), [TweakTown](https://www.tweaktown.com/news/109743/valve-changes-ai-disclosure-guidelines-ai-powered-tools-are-now-exempt/index.html)). Valve still offers players no filter.
- **Third parties now filter the label out.** SteamDB has an "AI Content Disclosed" tag over 4,900+ games that users can hide ([80.lv](https://80.lv/articles/while-players-wish-to-filter-out-ai-generated-games-steamdb-makes-it-possible)). A browser plugin added hiding of disclosed games from Steam search in June 2026 ([GamingOnLinux, Jun 2026](https://www.gamingonlinux.com/2026/06/the-ai-warning-for-steam-browser-plugin-adds-steam-search-filtering/)). A disclosed game is invisible to those players by design.
- **Disclosure is now common, and it underperforms.**
  - Sulka Haro's census of 53,597 Steam releases (mid-2023 to mid-2026) finds about one new release in three disclosing AI, up from about 7% in early 2024. Those games take an estimated 10–27% of sales.
  - Among disclosed games that failed, 72% used AI for visuals. Those that succeeded used it where players don't look at it: voice, localisation, text, music.
  - Sources: [Cinevva, 20 Jul 2026](https://app.cinevva.com/news/2026-07-20-steam-ai-disclosure-study), [Sulka Haro](https://fragwyz.substack.com/p/three-years-of-ai-on-steam).
  - A second extract puts the share at about 1 in 5 for 2026 ([Tech Insider](https://tech-insider.org/steam-ai-disclosure-2026/)). The two measure different windows.
  - In Next Fest, about 19.5% of June 2026's demos disclosed AI ([Dataconomy, 17 Jun 2026](https://dataconomy.com/2026/06/17/steam-next-fest-19-5-percent-demos-generative-ai/)). So did ten of the top 100 demos in PCGamesN's count, under the headline quote "I don't want to play them" ([PCGamesN](https://www.pcgamesn.com/steam/next-fest-2026-generative-ai)).
- **Players, re-verified with more detail.**
  - GameDiscoverCo's survey (25 Jun–2 Jul 2026, about 4,000 committed Steam players): about 43% have no big issue buying a game with any AI disclosure, 26% are neutral, 31% negative.
  - **44% say they read the disclosure in detail**, and 45% glance at it ([GameDiscoverCo](https://newsletter.gamediscover.co/p/what-do-steam-fans-really-think-about)).
  - So the wording of UniSchool's disclosure will be read.
- **Re-verified as in October:**
  - Game Oracle's 53% fewer reviews and 84.6% against 88.3% scores ([Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/epic-boss-tim-sweeney-blasts-steam-for-putting-ai-tags-on-games-says-move-is-irresponsible-of-valve), [Digital Citizen](https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/)). Epic's Tim Sweeney cited it in June 2026 to call Steam's label "irresponsible".
  - Bazzaz & Cooper's 508,192 reviews: players read AI use as "low developer investment" ([arXiv 2608.11539](https://arxiv.org/abs/2608.11539)).
  - The Indie Game Awards' ban on any generative AI in development, and the Clair Obscur withdrawal ([PC Gamer](https://www.pcgamer.com/games/rpg/indie-game-awards-pulls-two-awards-from-clair-obscur-over-generative-ai-use-we-have-a-hard-stance-against-gen-ai-in-videogames/)).
- **New cases since the October research:**
  - **Crazy Taxi: World Tour** (Sega). Its Steam disclosure drew a backlash at its June reveal, although AI was used only for reference images that artists then drew over. Sega reworded the disclosure to guarantee "no AI-generated content in the final game" ([Game Informer, 8 Jun 2026](https://gameinformer.com/sgf-2026/2026/06/08/crazy-taxi-world-tour-producer-clarifies-ai-use), [Automaton](https://automaton-media.com/en/news/crazy-taxi-world-tours-ai-disclosure-guarantees-no-ai-generated-content-in-the-final-game-following-update-to-wording/), [iXBT, 26 Aug 2026](https://ixbt.games/en/news/2026/08/26/430456-ii-vyzval-skandal-vokrug-crazy-taxi-world-tour-sega-vnesla-vaznoe-utocnenie.html)). The lesson for UniSchool: **the wording of the disclosure is itself marketing**, and a vague one is read as the worst case.
  - **To Insanity and Beyond** (Kickstarter). Backers demanded refunds over AI art on 21 September 2026. The studio conceded refunds on 24 September: "Looks like we did misread the room" ([Rascal](https://www.rascal.news/years-late-rpg-adventure-project-embraces-ai-is-forced-to-refund-angry-backers/)).
  - **UK Games Expo** (tabletop) now bars products made "completely or in significant part" by AI, art and text alike ([Rascal](https://www.rascal.news/uk-games-expo-bans-ai-generated-work-via-a-new-policy/), [Kotaku](https://kotaku.com/uks-largest-tabletop-convention-bans-ai-with-few-exceptions-2000737334)). It isn't UniSchool's venue. It shows events moving the same way as the Indie Game Awards.
  - Still no case found of a backlash over AI-assisted **code** alone.

**How to navigate it honestly (the reviewer's judgment).** October's six points stand. Four refinements:
1. **Write the disclosure now, and make it specific.** The Crazy Taxi case shows a vague line costs more than a plain one. Suggested Steam text: "The game's text — letters, course descriptions, faculty biographies and events — was written with an AI writing assistant under the developer's direction and edited by the developer. The game generates no AI content while you play. No images, audio or voices are AI-generated: the campus, the faculty portraits and the music are all drawn or synthesized by the game's own code." Put the same text on itch.io (Text & Dialog).
2. **The Credits line is a start, not a disclosure.** "Built with Claude Code, plan by plan" is honest, but it names a tool rather than saying what was made with it, and it sits behind a menu. Keep it, and add the plain text above to the README and the store page.
3. **Show the human direction, now with better evidence.** Plans 84 and 85 open with the owner's own words ("I want the faculty system to feel more personal …"; "A critical piece missing from this game is meaningful tradeoffs …"). A devlog series built from these quotes — the owner's design, the decisions and their reasons — is the best answer to the "low developer investment" reading. "Why the choice is permanent" and "why athletics counts less" would make good first posts.
4. **Never pair "AI" with "school simulator"** in titles, tags or copy. Another game on Steam already is that pairing (§2).

## The findings in full

### B6-1. The shop window shows the September game — major, M

**What.** Every image a stranger meets predates the changes that most improve the picture:
- **The README's eleven screenshots:** last changed 27 September (`git log -- docs/images`). They show the campus without the ring of land, and the Faculty tab as "payroll, the market, and each department's roster", which Plan 84 replaced with a grid of people. They show nothing of the pillars, the specialization, seasons or the inbox. The README's text doesn't mention the pillars or the specialization either.
- **The share image** (`public/og-image.jpg`, 27 September): a good campus, but on the old flat green board.
- **The trailer time-lapse** (`docs/images/timelapse.webm`, 28 September): shot with the seasons off, by necessity (`tools/README.md`).
- **The title screen:** still a white card on beige ([`img/b6-title.jpg`](img/b6-title.jpg)). The game's tagline sits there with no campus behind it. Area 3 raised this in October.

**Why.** A store page lives on its first screenshot, a shared link on its preview image, and the first thing a demo player sees is the title. The best new material (an autumn campus in its landscape, the four cards, the faces) is in the game and in plan folders, but not in front of a buyer.

**Fix.**
- Reshoot the README set, the share image and the five store screenshots in §4, from the production build with the canvas map.
- Re-cut the time-lapse with one seasonal year (§4).
- Put a live or still campus behind the title card. The time-lapse's last frame or the player's own campus would do.

**Effort.** M: one PR of shots and a title-screen backdrop.

### B6-2. The specialization hook is real, but only two of four top their own pillar, and the choice comes late — major, S–M

**What.** Plan 85's balance pass (85I, three seeds) set itself the target that each specialist ends "#1 in its pillar by a clear margin". Against it:
- **Met for academics** (+3.7 to +8.6) and **athletics** (+11.0 to +11.9).
- **Not met for research** (5th–6th, 1.5 to 8.5 behind) and **student life** (3rd, 8.1 to 9.7 behind), because their rankings read slow-drifting stocks rather than the pillar values.

85I proposes, but did not build, the smallest fix: rank research and student life on their pillar values, as academics and athletics already are (`rivalsSystem.ts`'s `selfValue` and `pillarColumns`). Read that way, research leads by 9.9 and 9.8 on two seeds and student life on all three ([Plan 85, 85I](../../plans/85-specializations.md)).

The choice also arrives late: the Guided player reaches the top-20 milestone in years 31–35.

**Why.**
- The pitch is "the very best at one". A player who picks research and finishes fifth in research has been told something false by the game's own headline. That reads in a review as "the specialization doesn't work".
- A choice at year 30 lands after a 2× player's first 1.5–2 hours. That is past Steam's refund line, so the hook can't be what keeps a first-session buyer from refunding. It is what brings a finished player back.

**Fix.**
- Build 85I's proposed ranking change (S).
- Area 4 judges whether A4-1 is closed. From the market side: tell the player at the founding that the choice is coming (the board's notice exists, two years ahead, per Plan 85D), and name the four pillars in the first decade, so the demo and the first session sell it.

**Severity.** Major, because it is the replay hook. **Effort.** S for the ranking, M for the early signposting.

### B6-3. AI disclosure is ready in the credits but nowhere a buyer looks, and the text has grown — major, S

**What.** The Credits screen says "Built with Claude Code, plan by plan". There is no disclosure text in the README, and no draft of the Steam or itch.io disclosure. Plans 84–85 added a large body of player-facing generated text (faculty bios and quirks, the specialization cards, the downtown's and festival's events). There is no human-edit pass on it, and no devlog.

**Why.** About 44% of committed Steam players read the disclosure in detail, and third-party tools now hide disclosed games (§7). The disclosure's wording is the first marketing copy many players will read, and Crazy Taxi showed that vague wording is punished.

**Fix.**
- Draft the disclosure now (§7, point 1) and put it in the README.
- Start the devlog from the plans' quotes.
- Commission the capsule art and logo.
- Give the most-read text a human edit: the founding letters, the summer, the specialization letter and the Final Report.

**Effort.** S for the text. The commissions cost money, not time in the code.

### B6-4. The release timeline: February's Next Fest is no longer realistic — major, S

**What.** October allowed February 2027 if the playtest and fixes landed by early January, and judged June the safer target. A week on:
- the registration deadline (10 Jan 2027) is fourteen weeks away;
- this review's fix list is untriaged;
- no Steam page exists, so the game would arrive at February's fest with almost no wishlists.

**Why.**
- Pre-fest wishlists are the strongest predictor of a fest's result: a Spearman correlation of 0.825 in one independent analysis of survey data. A game entering with under 1,000 wishlists gains a median of about 322 more ([Cinevva guide extract](https://app.cinevva.com/guides/steam-next-fest-strategy)).
- Demos live months before the fest earned about 2.5× the median ([How To Market A Game](https://howtomarketagame.com/2025/03/26/benchmarks-how-many-wishlists-can-i-get-from-steam-next-fest/)).
- A title gets one Next Fest.

**Fix.** Adopt §5's timeline: Steam page in January, demo in February–March, Next Fest June 2027, launch late summer.

**Effort.** S, a decision.

### B6-5. A first run still ends near the refund line; the sandbox and Epilogue help, and the store page should say so — minor, S

**What.**
- The clock is unchanged, so a 2× run is 1.8 h of clock plus reading. The inbox's pause-on-arrival is on by default (`src/settings.ts`), which adds stops and so time.
- The game now has two answers to "what after the report?":
  - the Epilogue, which continues the run after year 50 (it predates October);
  - the Sandbox on the title screen, with unlimited funds and instant building, since 29 September.

  Neither is mentioned on any page a buyer sees, except one clause of the README ("the game goes on as a sandbox after it").

**Why.**
- The refund risk is a short first session followed by nothing to return to. Two return paths now exist; buyers should know.
- Builder players in particular look for a sandbox in a store page's feature list.

**Fix.**
- List "Sandbox mode" and "Play on after the Final Report" in the store page's features.
- In the playtest, measure real first-run length, and whether players reach year 30.

**Effort.** S.

### B6-6. Three of the October memo's own facts need correcting — polish, S

**What.**
1. **§6, price.** The memo gave "$19.50 → $15.64" as the median of the top 50 by first-month revenue. Per the extracts, those figures are the median **by copies sold**; by revenue it is $23.70 → $20.35 (§6).
2. **§2 and §3.6, the sandbox.** The memo's "no sandbox or endless modes" and its §3.6 "no sandbox" overlooked the Epilogue, which already let a run go on after year 50. The Sandbox mode landed two days after the research.
3. **§5, Next Fest's median.** The "about 806 wishlists" median came from a developer survey. Across all of February 2026's 3,500+ demos the median was nearer 200 ([Cinevva guide extract](https://app.cinevva.com/guides/steam-next-fest-strategy)). The survey median flatters.

**Why.** These numbers are the ones most likely to be lifted into a pitch deck.

**Fix.** Use the corrected figures, here and in any deck. Leave the October file as the record of what was said.

**Effort.** S.

## What was not found

- **No university-level management game** announced or released since September, beyond the two already in the table. The search was not exhaustive, and Steam itself was unreachable.
- **University Tycoon's sales or review count:** still not found.
- **Any backlash over AI-assisted code alone:** still none found.
- **Session-length data for the comparables:** still not found.
- **Re-verification of the refund-by-price figures and the How To Market A Game 7,000–10,000 launch wishlist rule:** not re-checked this time. The October citations stand unverified a second time.
- **The Steamworks pages, GameDiscoverCo's newsletters and Steambase** could not be opened. Every figure from them above is a search extract.

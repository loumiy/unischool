# The itch.io page — a draft

**Status:** a draft for the owner to edit (Plan 97I). Nothing here is
published. It is built from [`steam-page.md`](steam-page.md), cut to what
an early playtest page needs. Every line says only what the game does on
`main` today. "AI" never sits beside "school simulator" (the second
review's §2).

Uploading the build and the embed settings are in
[`itch-release.md`](itch-release.md). The screenshots and the cover are in
[`itch/`](itch/).

## The page's fields

| Field | Value |
|---|---|
| Title | UniSchool |
| Project URL | `halifaxgames.itch.io/unischool` |
| Short description or tagline | Found a college and run it for fifty years. An early playtest: your feedback decides what changes. |
| Classification | Games |
| Kind of project | HTML |
| Release status | In development |
| Pricing | No payments (free while it's being tested) |
| Genre | Simulation |
| Tags | management, simulation, strategy, singleplayer, building, city-builder, isometric, tycoon |
| App store links | none |
| Custom noun | none |
| Community | Comments, enabled |
| Visibility | Public |
| Credits (the page's "More information" → Authors) | Halifax Games |

Tags, said once more: never "AI", and never "school simulator" beside
anything about how the game was made.

## The description

Paste below the line into the page's **Description**. The bold lines are
its headings.

---

**An early playtest build. Free while it's being tested: your feedback decides what changes.**

**UniSchool** is a university management game. You found a small college
with three programs and build it, over fifty years, into a university.

**Choose once.** Prestige is a blend of four pillars: academics, research,
student life and athletics. A college can be excellent at all four. But
the first summer it stands in the guide's top 30, or from Year 20 in the
top 10 of any one pillar, the board offers a single specialization, and
that choice is kept for good. Your rivals specialize too.

**Price the year blind.** Every summer you set tuition before you see who
applies, then decide how much of the pool to admit, and live with the
class those two decisions draw.

**A campus through fifty years.** Raise halls, labs, residences, venues and
landmarks on an isometric map, in one of five architectures and your own
school colours, through the seasons.

**A faculty of people.** Every professor has a face, a career, a few quirks
and a record. Hire them, assign them to courses, and watch the good ones
get poached.

**A legacy, not a score.** In the fiftieth summer the Final Report grades
the run on six axes and names what the college became. Then play on into
the Epilogue.

**What to expect**

- **A full run is fifty years:** roughly two to four hours, depending on
  the speed you play at, over as many sittings as you like. Growth is slow
  on purpose, and money paces the first decades.
- **It plays in the browser,** on a computer or a tablet. A phone works,
  but the map is small.
- **Your run is saved in this browser.** Browsers can clear a site's
  storage, Safari after seven days without a visit, and a private window
  when it closes, so keep a copy: **Menu → Download save**, and **Load a
  save file** on the title screen to carry on. Every fifth summer the game
  offers a backup too.
- **The text hasn't had its human edit yet.** It will, after this
  playtest, with what you tell me.
- **Sandbox**, on the title screen: unlimited funds and instant building,
  to lay out a campus without waiting.

**Tell me what you think**

- **Menu → Send feedback** opens a two-minute form. **Report a bug** saves
  a record of your session to attach to it.
- Or leave a comment below.

What I most want to know: where you stopped, and why; whether you reached
the specialization; and what you thought of the opening, the summers and
the Final Report.

**Play statistics**

The first time it opens, the game asks whether it may send anonymous play
statistics: how far runs get and how long they take. Nothing is sent
unless you say yes, and you can turn it off in Settings. It sends no
names and nothing you type: every value is a number, a yes or no, or an
item from a fixed list. No cookies, and no recordings.

**How UniSchool is made**

UniSchool is designed and directed by one developer and built with an AI
coding assistant, plan by plan. The developer wrote the brief for every
feature, chose between the designs it produced, and played the game
between each step to decide the next.

The game's text — letters, events, course descriptions, faculty careers
and the Final Report — was written with that assistant under the
developer's direction. The campus, the buildings and the faculty portraits
are drawn by the game's own code, which was also written with it: no
picture in the game comes from an image generator. The music and sound are
synthesized by the game's code. There are no voices.

*Made by Halifax Games.*

---

The *How UniSchool is made* section is
[`ai-disclosure.md`](ai-disclosure.md)'s pre-generated text, unchanged, so
the stores never say different things. It stays on the page even though
the in-game Credits carry only the short footnote (the owner's decision,
Plan 97C): the second review's §7 warns that a vague disclosure is read as
the worst case.

## itch.io's AI form

itch.io asks, in the project's edit page, whether generative AI was used
and where. The answers [`ai-disclosure.md`](ai-disclosure.md) drafted,
with the owner's decision noted:

| Part | Answer | Note |
|---|---|---|
| Text and dialogue | **Yes** | Every player-facing word was written with the assistant. |
| Code | **Yes** | All of it. |
| Graphics | **Yes, with the note** | No image generator; the code that draws every picture was written with the assistant. *The owner decides between this and "no".* |
| Sound and music | **No** | Synthesized live by code; the description's paragraph covers it. |

The in-game credit is "Halifax Games", with the footnote "Made with the
help of AI tools" (Plan 97C). The form and the description above say more,
part by part, as the disclosure doc advises.

## The screenshots

Taken from this build (`main` after Plan 97F) with the repository's own
tools (`npm run scenario`, `npm run layout`, `npm run shot`), on the
production build, at 1920 × 1080 (16:9). In the second review's order
(§4). Upload them in this order, under **Screenshots**.

| # | File | Caption (for the alt text) |
|---|---|---|
| 1 | [`itch/1-campus.jpg`](itch/1-campus.jpg) | Thirty-two years of a campus, in its fall colours. |
| 2 | [`itch/2-admissions.jpg`](itch/2-admissions.jpg) | Set the price before you see who applies. |
| 3 | [`itch/3-specialization.jpg`](itch/3-specialization.jpg) | Excellent at all four. The very best at one. |
| 4 | [`itch/4-faculty.jpg`](itch/4-faculty.jpg) | Every professor, a person. |
| 5 | [`itch/5-final-report.jpg`](itch/5-final-report.jpg) | Fifty years, graded, and a name for what you built. |

## The cover image

[`itch/cover.jpg`](itch/cover.jpg), 630 × 500: the fall campus of
screenshot 1, alone, without the game's controls. It stands in until the
commissioned capsule art exists (the backlog's owner tasks); upload it
under **Cover image**.

## Retaking them

From `unischool/`, with the production build served
(`npm run build && npx vite preview --port 4173 --strictPort`) and
`CAMPUS_URL=http://localhost:4173/`:

```sh
npm run scenario -- --player Completionist --year 32 --week 14 --clear-modal --name Blackmoor --colors navy-gold campus.json
npm run layout -- campus.json campus-laid.json
npm run shot -- campus-laid.json ../docs/store/itch/1-campus.jpg --size=1920,1080 --tilt=-2 --zoom=-1
npm run shot -- campus-laid.json ../docs/store/itch/cover.jpg --bare --size=1260,1000 --scale=0.5 --tilt=-2 --zoom=-1
npm run scenario -- summer summer.json
npm run shot -- summer.json ../docs/store/itch/2-admissions.jpg --size=1920,1080 --click=Continue --click="Set tuition for the year"
npm run scenario -- specialization spec.json
npm run shot -- spec.json ../docs/store/itch/3-specialization.jpg --size=1920,1080
npm run scenario -- --player Completionist --year 45 --clear-modal --name Blackmoor --colors navy-gold late.json
npm run shot -- late.json ../docs/store/itch/4-faculty.jpg --size=1920,1080 --tab=faculty
npm run scenario -- final-report --name Blackmoor --colors navy-gold final.json
npm run shot -- final.json ../docs/store/itch/5-final-report.jpg --size=1920,1080
```

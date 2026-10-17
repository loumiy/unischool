# The trailer — a script

**Status:** a draft for the owner to edit, 17 October 2026. This is the
one-minute script, written after watching the 30-second first cut
([What the first cut taught](#what-the-first-cut-taught)). It replaces the
plan in [`steam-page.md`](steam-page.md)'s *What waits on others*. The
research behind it is [`trailer-research.md`](trailer-research.md).

**Length:** 1:00 · **Music:** Alejandro Tóth's title theme, cut twice ·
**Slot:** the store's first trailer, tagged *Gameplay*.

## The idea

The first thing on screen is the dream: one finished university, in the
fall, the camera drifting slowly across it as it changes architecture on
the beat. It goes from Georgian to Collegiate Gothic, Classical, Mission,
Modern and Art Deco, and each style is named in the corner. Over it, what
players said, set like review headlines.

Then the music drops away, and the trailer goes back to where every one of
those campuses began: an empty lawn and one building. Founders Hall is set
down. Flower beds are planted round it, one tile at a time, with a gap left
at each door. A walk is drawn out from every door, and the first residence
hall rises beside it as summer turns to autumn.

From there the game opens out: the faculty's faces, a summer's class, the
one choice that can't be taken back. As the theme returns, fifty years pass:
the time-lapse, the charter that makes the college a university, a year of
seasons, a full stadium. The Final Report names what the school became.

On the music's peak the pan comes back, still drifting, and settles on
Founders Hall in year 50, its flower beds still round it. Then the title.

The pan says *this place could be yours, in any style*. The flower beds say
*and every corner of it is yours to make*. The headlines say *people who
played it loved it*. The minute in between proves it's a game you play,
across fifty years.

## How it's built

- **The pan opens and closes it.** It holds each architecture three to four
  seconds and switches on the music's swells. The architecture's name sits
  small in the corner, like the time-lapse's year caption.
- **The first words say the genre.** "The football manager of universities"
  is on screen from the first second.
- **One continuous beginning.** The founding, the flower beds, the walks
  and the first residence hall are one new game, in its first summer, in
  order.
- **The interface in the gameplay shots, in many colours.** The screens
  (faculty, summer, the choice, the charter, the Final Report) each wear a
  different pair of school colours, so the colour choice shows without a
  word about it. The map shots stay in Halifax's navy and gold, so the
  campus reads as one place throughout. See [The colours](#the-colours).
- **It works muted:** five headlines, four cards, the architecture captions
  and the end card, all burned in, inside the inner 90% of the frame.
- **Cut to the music,** measured, not guessed (below).
- **Only what the game does,** in-engine. The map has no night (Plan 95C).
  No shot asks for one.

## The music

Three pieces of the theme (`unischool/src/assets/title-theme.mp3`, 1:44.8)
make one minute, joined at two points where the harmony either side
matches. Both joins were found by measuring the recording's harmony; confirm
them by ear and nudge each to the nearest bar line.

| Piece | Music time | Trailer time | What it carries |
|---|---|---|---|
| A | 0:07.36 → 0:30.9 | 0:00 → 0:23.54 | The last three seconds of the quiet intro, the first entry and its full statement, the hard drop, the start of the quiet middle |
| B | 0:39.6 → 0:47.1 | 0:23.54 → 0:31.04 | More of the quiet middle. The join at 0:30.9 → 0:39.6 skips one 8.7 s phrase (harmony 0.97 before, 0.92 after). |
| C | 1:04.5 → 1:33.9 | 0:31.04 → 1:00.44 | The pulse building to the return, the second entry, the peak, the breath, the finale. The join at 0:47.1 → 1:04.5 skips two phrases (0.95, 0.90) and lands on a swell. |

**The cues, in trailer time:**

| T | M | The music | The picture |
|---|---|---|---|
| 0:00 | 0:07.36 | The quiet intro (about −39 dBFS; lift it about 6 dB in the mix). | The pan opens, Georgian. |
| **0:03.09** | 0:10.45 | **First entry,** +13 dB. | Collegiate Gothic. |
| 0:06.25 | 0:13.61 | An onset. | Classical. |
| 0:10.39 | 0:17.75 | A swell. | Mission. |
| 0:14.74 | 0:22.10 | A swell. | Modern. |
| 0:17.74 | 0:25.10 | A swell, the statement's peak. | Art Deco. |
| **0:18.99** | 0:26.35 | **Hard drop,** −13 dB in 0.4 s. | An empty lawn: Founders Hall. |
| 0:20.89 | 0:28.25 | A rise. | |
| 0:23.54 | 0:30.9 → 0:39.6 | First join. | |
| 0:25.39 | 0:41.45 | An onset. | The walks. |
| 0:28.64 | 0:44.70 | A rise. | The residence hall rises. |
| **0:31.04** | 0:47.1 → 1:04.5 | Second join, on a swell. The pulse begins. | The faculty. |
| 0:33.10 | 1:06.56 | A pulse group. | The summer. |
| 0:35.56 | 1:09.02 | A pulse group. | The choice. |
| **0:38.01** | 1:11.47 | **Second entry,** +9 dB. | Fifty years. |
| 0:40.39 | 1:13.85 | A drop. | |
| 0:47.14 | 1:20.60 | A swell. | The Final Report. |
| 0:49.04 | 1:22.50 | A drop. | |
| **0:51.64** | 1:25.10 | **The big swell,** to the peak at 0:53.04. | The pan returns. |
| **0:54.09** | 1:27.55 | **The breath,** −8.5 dB for a second. | The title. |
| **0:55.19** | 1:28.65 | **The finale** enters. | *Wishlist on Steam*. |
| 0:58.04 → 1:00.44 | 1:31.5 → 1:33.9 | Fade to silence, done before the swell at 1:33.95. | The end card holds to 1:00.5. |

**Ask Alejandro for** written permission to use the theme in marketing
(and whether it's in YouTube's Content ID); the lossless master (the
repository's MP3 is 160 kb/s); a one-minute edit with a written ending in
place of the fade, using these three pieces as the guide; stems, so the
music can thin under the headlines; and how he'd like his credit to read.

## The shot list

**Status** says whether a shot can be used as it is:
- **Have** means it was recorded for the 30-second cut and is usable as it
  is. `unischool/tools/trailer/build.sh` rebuilds every *Have* shot.
- **Re-shoot** means it was recorded, but must be taken again, for the
  reason given.
- **New** means it has never been recorded.

*UI* means the interface is on screen. *Bare* means the chrome is hidden,
and the map's labels and marks too (`--clean`).

### Act 1 — The dream (0:00 – 0:18.99)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 1 | 0:00 – 0:03.09 | **Bare.** The pan: year 50 in the fall, a low angle, the Grand Quad and its fountain, walkers crossing. The camera drifts slowly left to right. **Georgian.** | **"The football manager of universities"** — Playtester · Reddit (0:00.3 – 0:02.9). Caption: *Georgian* | **Re-shoot.** The first cut's plates are 3.5 s long; this act holds a style up to 4.4 s. Record 5 s plates, with the flower beds of shot 9 added round Founders Hall (for shot 22). |
| 2 | 0:03.09 – 0:06.25 | The same pan, same place: **Collegiate Gothic**. A hard cut on the entry, so only the buildings change. | Caption: *Collegiate Gothic* | **Re-shoot,** as 1. |
| 3 | 0:06.25 – 0:10.39 | **Classical**. | **"An alarmingly believable university simulator"** — Playtester · Reddit (0:06.5 – 0:09.1). Caption: *Classical* | **Re-shoot,** as 1. |
| 4 | 0:10.39 – 0:14.74 | **Mission**. | **"It feels one of a kind"** — Playtester · We Playtest Games (0:11.0 – 0:13.6). Caption: *Mission* | **Re-shoot,** as 1. |
| 5 | 0:14.74 – 0:17.74 | **Modern**. | Caption: *Modern* | **Re-shoot,** as 1. |
| 6 | 0:17.74 – 0:18.99 | **Art Deco**, one of the four styles a run unlocks. | Caption: *Art Deco* | **New.** One more plate, same save and framing. |

### Act 2 — One building (0:18.99 – 0:31.04)

One new game, Halifax in navy and gold, in its first summer. The map is
three steps closer than the opening view.

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 7 | 0:18.99 – 0:22.30 | **UI.** An empty lawn by the woodland. Founders Hall is picked up from the build menu, its ghost glides in, and it's set down. | **Card:** EVERY UNIVERSITY BEGINS WITH ONE BUILDING. (0:19.2 – 0:22.0) | **Have.** The founding take (`founding.mjs`), used longer: about 100 of its 114 frames. |
| 8 | 0:22.30 – 0:25.39 | **UI**, close. The build menu on its Grounds tab, *Flower bed* picked. The cursor drags along the hall's south wall, and beds appear tile by tile. It lifts at the door, starts again past it, and turns the corner along the east wall. Of the 24 tiles round the hall, 4 are left open, one at the middle of each wall, where the doors open. | None. Let it breathe. | **New.** See [The flower beds](#the-flower-beds). |
| 9 | 0:25.39 – 0:28.64 | **UI**, same framing. The path tool draws a straight walk out from each door, through its gap in the beds, across the lawn. The first walkers step onto them. | None. | **New.** The same take as 8. |
| 10 | 0:28.64 – 0:31.04 | Close. Meadow House, the first residence hall, rises beside it, from footings to finished. Its 16 weeks take summer into early autumn: no snow, and no summer stop. | **"Deeply impressed by this game"** — Player · itch.io (0:28.8 – 0:31.0) | **New.** It replaces the first cut's hall, whose 35 weeks crossed a winter and the summer's stop (the white flashes). It's the same game, the walkthrough's own residence hall, recorded with `clip.mjs --until-built`. |

### Act 3 — The people and the choices (0:31.04 – 0:38.01)

Three screens, each in its own school colours.

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 11 | 0:31.04 – 0:33.10 | **UI, forest & gold.** Faculty: a push-in across the grid of faces, toward one card's portrait and quirk. | None. | **Re-shoot.** It exists in navy and gold. Re-shoot in forest and gold (the same year-50 save, its colours changed). |
| 12 | 0:33.10 – 0:35.56 | **UI, maroon & gold.** The summer: a push-in to the applicant pool and the kinds of student it drew. | **Card**, on a dark band across the lower third: EVERY SUMMER, A NEW CLASS. (0:33.3 – 0:35.4) | **Re-shoot.** It exists in navy and gold. Re-shoot with `npm run scenario -- summer --colors maroon-gold`. |
| 13 | 0:35.56 – 0:38.01 | **UI, crimson & silver.** The board's letter with the four specialization cards. The cursor passes over them and chooses one on the last pulse. | **Card**, lower band: CHOOSE WHAT IT'S KNOWN FOR. (0:35.8 – 0:37.9) | **Re-shoot.** It exists in navy and gold, as a still. Re-shoot with `--colors crimson-silver`, recorded with a drawn cursor and the click, as `founding.mjs` records one. |

### Act 4 — Fifty years (0:38.01 – 0:51.64)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 14 | 0:38.01 – 0:41.50 | **Bare.** The time-lapse, wide: fifty autumns, one frame a year dissolving into the next, the game's *Year N* caption in the corner. | **Card:** ONE COLLEGE. FIFTY YEARS. (0:38.2 – 0:41.2) | **Have.** The first cut's clean fall frames, given 3.5 s instead of 2.45. |
| 15 | 0:41.50 – 0:43.60 | **UI, royal blue & gold.** The charter: the board's letter cropped to its last line ("the stone is cut once") and its button **Become Halifax University**, clicked. Then a cut to the pennant over the campus, now reading *Halifax University*. | The letter's own words. | **New.** Use `npm run scenario -- charter --colors royal-gold`, with a drawn cursor and the click. The pennant is chrome, so this shot is not bare. |
| 16 | 0:43.60 – 0:45.40 | **Bare.** A grown campus through one year: autumn gold, bare, snow, spring green. | **"I've been looking for exactly this type of game"** — Playtester (0:43.8 – 0:46.9) | **Re-shoot.** The first cut's year crossed the summer, whose stop opened the inbox for a frame. Re-shoot from a save set to week 3, at a little under a week a frame (`clip.mjs --step=4000`), so the 54 frames end near week 47, before the summer. |
| 17 | 0:45.40 – 0:47.14 | Close. Game day: Hamilton Stadium full for the season's opener. | (the headline carries over) | **Have.** The first cut's 4K take, pushed in on the far stand. |
| 18 | 0:47.14 – 0:51.64 | **UI, purple & gold.** The Final Report: *Year 50 · the fiftieth year closes*, then a push-in to its sentence: "Halifax University: a college known first for what its laboratories find, with no glaring weakness." | The report's own words. | **New.** Use `npm run scenario -- final-report --colors purple-gold`, and the sentence the run writes, unedited. Choose the run for its sentence. |

### Act 5 — The pan returns (0:51.64 – 0:54.09)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 19 | 0:51.64 – 0:52.45 | **Bare.** The pan again, further along, as if it never stopped: **Mission**. | Caption: *Mission* | **Re-shoot,** with 1–6. |
| 20 | 0:52.45 – 0:53.26 | **Modern**. | Caption: *Modern* | **Re-shoot,** with 1–6. |
| 21 | 0:53.26 – 0:54.09 | **Georgian** again, Halifax's own. The drift slows and settles on Founders Hall at the head of the Grand Quad, with its ring of flower beds, fifty years on. | None. | **Re-shoot,** with 1–6. The year-50 save gets the same beds round Founders Hall (row 51, col 60, 7×5), wherever the year-50 paving leaves open ground. |

### End card (0:54.09 – 1:00.5)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 22 | 0:54.09 – 1:00.5 | **Bare.** Year 50, wide, in the fall, the hills and haze behind, barely drifting. A dark gradient under the words. | From 0:54.09: the logo and **FIFTY YEARS TO BUILD A UNIVERSITY.** From 0:55.19: **WISHLIST ON STEAM**, the platform and the release window, with *Music by Alejandro Tóth · Halifax Games* small at the foot. Fade to black from 1:00.1. | **Have,** the 4K plate. The logo is the game's mark as a stand-in until the commissioned one exists. |

## The words on screen

The muted test: read only this column.

| T | Text | Words | Seconds |
|---|---|---|---|
| 0:00.3 | "The football manager of universities" — Playtester · Reddit | 5 | 2.6 |
| 0:06.5 | "An alarmingly believable university simulator" — Playtester · Reddit | 5 | 2.6 |
| 0:11.0 | "It feels one of a kind" — Playtester · We Playtest Games | 6 | 2.6 |
| 0:00 – 0:18.99 | Captions, small: *Georgian · Collegiate Gothic · Classical · Mission · Modern · Art Deco* | 1–2 each | 1.25 – 4.35 |
| 0:19.2 | EVERY UNIVERSITY BEGINS WITH ONE BUILDING. | 6 | 2.8 |
| 0:28.8 | "Deeply impressed by this game" — Player · itch.io | 5 | 2.2 |
| 0:33.3 | EVERY SUMMER, A NEW CLASS. | 5 | 2.1 |
| 0:35.8 | CHOOSE WHAT IT'S KNOWN FOR. | 5 | 2.1 |
| 0:38.2 | ONE COLLEGE. FIFTY YEARS. | 4 | 3.0 |
| 0:41.5 | *Become Halifax University* (the letter's button) | 3 | 1.0 |
| 0:43.8 | "I've been looking for exactly this type of game" — Playtester | 9 | 3.1 |
| 0:47.14 | The Final Report's sentence (the report itself) | 17 | 4.5 |
| 0:54.09 | Logo · FIFTY YEARS TO BUILD A UNIVERSITY. | 6 | to the end |
| 0:55.19 | WISHLIST ON STEAM · platform · window | — | 5.3 |

Headlines and the time-lapse card are set as in the first cut, at the top or
centre over the map. The two Act 3 cards sit on a dark band across the
lower third, since they play over the screens' cream.

## The colours

The map is one college, so it keeps one pair of colours. Each screen is a
different college's, so between them they show the choice.

| Shots | Colours |
|---|---|
| The pan (1–6, 19–21), the founding and flower beds (7–10), the time-lapse (14), the seasons (16), the stadium (17), the end card (22) | **Navy & gold**, Halifax's own |
| Faculty (11) | **Forest & gold** |
| The summer (12) | **Maroon & gold** |
| The specialization (13) | **Crimson & silver** |
| The charter (15) | **Royal blue & gold** |
| The Final Report (18) | **Purple & gold** |

Every screen keeps the name Halifax: only the colours change. A save's
colours are one field, like its architecture, so a screen can be re-shot in
another pair from the same save, or from the same seeded scenario with
`--colors`.

## The flower beds

Shots 8 and 9, the new close-up, recorded like the founding (a script on
Playwright's stepped clock, with a drawn cursor), straight after it in the
same new game:

- **The hall:** Founders Hall is 7×5, so each wall has an odd length and one
  door tile at its middle (`walkRoutes.ts`'s `entrancesOf`). The students
  come and go through those four tiles. Decor doesn't block walking (the
  walk grid ignores it), so a bed on a door tile would have the students
  walking straight through the flowers. The gaps keep them on the walks.
- **The beds:** the build menu's Grounds tab, *Flower bed*. It is a drag
  tool ("drag to plant a border"), so each run between two doors is one
  smooth drag along the wall, lifting at the door. 24 beds on the 28 tiles
  round the hall. The camera sees the south and east walls best; drag those
  in shot, and plant the far two between takes.
- **The walks:** the path tool, Shift held, one straight run out from each
  door through its gap.
- **The camera:** two to three steps closer than shot 7, the hall a little
  above the middle, the build menu showing.
- **The season:** the first summer, so the beds are in flower and the lawn
  matches shot 7.

## The headlines

Five players, one headline each, every one in the player's own words
([`findings.md`](../reviews/playtest-1/findings.md) logs them "trimmed, not
edited"). They're trimmed to the phrase a reviewer would put in a headline,
with no words changed or stitched together. There are no star ratings or
outlet-style logos: these are players, and they're labelled as players.

| | Headline | Their full words | Who, where | Before it goes out |
|---|---|---|---|---|
| 1 | "The football manager of universities" | "I'm a huge football manager fan and this feels like the football manager of universities basically." | R8, Careless-Flower6059 | **A private Reddit chat message.** Ask for permission, and how they'd like to be credited. |
| 2 | "An alarmingly believable university simulator" | "350 students and zero professors is an alarmingly believable university simulator lol." | R10, No-Giraffe-3838, a public comment on r/WebGames | A joke about the opening that reads as praise. The owner should judge whether the trim is fair; ask them anyway. |
| 3 | "It feels one of a kind" | "I'd give it a nine out of ten. It feels one of a kind." | S1, the tester "Misthios" for We Playtest Games | From an **AI-generated transcript**. Check against [the video](https://www.youtube.com/watch?v=zv1kn2uAHVs), and ask the service. |
| 4 | "Deeply impressed by this game" | "Wow, deeply impressed by this game, tried it and it's wow!" | I2, AlexanderGGA08, a public itch.io rating | Public. The same player as R1, R5 and I1. Ask anyway. |
| 5 | "I've been looking for exactly this type of game" | "I've been looking for exactly this type of game for a long time." | F2, the feedback form | Anonymous, but F2 left an email: ask there. |

**Spares:** T1, on Twitch, "This reminds me of games I used to play"
(check against the recording). D1, on Discord, "giving proper throwback to
the original Sims vibes" (it's spelled "throughback", so ask before
correcting it). **Not used:** F3's line, at the owner's call. R9's message,
from the composer the owner was talking to about the music. And any second
line from a player already quoted.

## What the first cut taught

The 30-second cut (`claude/trailer-script`, rebuilt by
`unischool/tools/trailer/build.sh`) proved the pan and the headlines, and
showed three things this script fixes:

- **Too short.** Every beat was over before it could be read. The minute
  gives the pan three to four seconds a style, and gives the beginning,
  the founding to the first residence hall, its own act.
- **White flashes at 0:08.7–0:09.1.** The hall-rising clip squeezed 35
  weeks into a second. Its winter flashed white for four frames, and the
  summer's stop opened the inbox for two. Shot 10 uses a 16-week building
  started in week 1, which finishes before the snow and long before the
  summer.
- **The screens all wore navy and gold.** Now each screen has its own
  colours.

Smaller findings for the tools:
- **The inbox can leak into a clip.** When `clip.mjs` answers a stop, the
  inbox a stop opens can show for a frame. Hiding `.tab-overlay` in its
  stylesheet would end that for every clip that crosses a summer.
- **The ground repaints in patches.** At a week a frame, the canvas map
  repaints the ground in rectangular patches while the snow melts. It may
  show at 8× in play too. It is a rendering bug, not a capture one.

## How to capture

- **Size:** at least 3840×2160 (`--size=1920,1080 --scale=2`), 30 fps.
  Steam takes 1920×1080 at most; the extra is for crops and pushes.
- **The pan:** one year-50 save copied once per architecture. Only
  `self.vernacular` changes, so the campus is identical, and so is the
  framing (`clip.mjs --focus=QUAD-T2 --zoom=4 --tilt=-2 --size=2880,1620
  --clean`). The move is made in the edit, across the 2880×1620 plate.
  Record 5 s a plate. Add the flower beds to the save's `dressing` round
  Founders Hall before copying it.
- **The screens:** text at its largest. Where a shot clicks, use a drawn
  cursor, slow and deliberate, as in `founding.mjs`.
- **Steam's format:** H.264 MP4, AAC stereo, 30 fps, at 5,000 Kbps or more.

## Decisions for the owner

1. **The headlines' permissions:** all five players asked, and S1's words
   checked against the video.
2. **The sixth style:** Art Deco is proposed for the end of the pan. Tudor,
   Italianate or Second Empire would do the same job.
3. **The end card:** the release window to promise, and the commissioned
   logo.
4. **The specialization shown,** which must be the one the Final Report's
   run chose (shots 13 and 18).

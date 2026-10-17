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
a Tudor campus built from nothing, the charter that makes the college a
university, and the stadium growing to its full double-decked size. The
Final Report names what the school became.

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
- **It works muted:** five headlines, five cards, the carved name, the
  architecture captions and the end card, all burned in, inside the inner
  90% of the frame.
- **Cut to the music,** measured, not guessed (below).
- **Always summer when time is squeezed.** Any shot that runs weeks into
  frames (the hall rising, the stadium growing, the time-lapse) is
  recorded with the game's Seasons setting on *Always summer*, so no winter
  can flash white. A held shot in one season, like the autumn pan, can't
  flash, and keeps its season.
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
| **0:18.99** | 0:26.35 | **Hard drop,** −13 dB in 0.4 s. | The name, carved. |
| 0:20.89 | 0:28.25 | A rise. | An empty lawn: Founders Hall. |
| 0:23.54 | 0:30.9 → 0:39.6 | First join. | |
| 0:25.39 | 0:41.45 | An onset. | The walks. |
| 0:28.64 | 0:44.70 | A rise. | The residence hall rises. |
| **0:31.04** | 0:47.1 → 1:04.5 | Second join, on a swell. The pulse begins. | The faculty. |
| 0:33.10 | 1:06.56 | A pulse group. | The summer. |
| 0:35.56 | 1:09.02 | A pulse group. | The choice. |
| **0:38.01** | 1:11.47 | **Second entry,** +9 dB. | Fifty years. |
| 0:40.39 | 1:13.85 | A drop. | |
| 0:47.14 | 1:20.60 | A swell. | The Final Report: *What will you build?* |
| 0:49.04 | 1:22.50 | A drop. | The report's answer. |
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
| 1 | 0:00 – 0:03.09 | **Bare.** The pan: year 50 in the fall, a low angle, the Grand Quad and its fountain, walkers crossing. The camera drifts slowly left to right. **Georgian.** | **"The football manager of universities"** (0:00.3 – 0:02.9). Caption: *Georgian* | **Re-shoot.** The first cut's plates are 3.5 s long; this act holds a style up to 4.4 s. Record 5 s plates, with the flower beds of shot 10 added round Founders Hall (for shot 22). |
| 2 | 0:03.09 – 0:06.25 | The same pan, same place: **Collegiate Gothic**. A hard cut on the entry, so only the buildings change. | Caption: *Collegiate Gothic* | **Re-shoot,** as 1. |
| 3 | 0:06.25 – 0:10.39 | **Classical**. | **"An alarmingly believable university simulator"** (0:06.5 – 0:09.1). Caption: *Classical* | **Re-shoot,** as 1. |
| 4 | 0:10.39 – 0:14.74 | **Mission**. | **"It feels one of a kind"** (0:11.0 – 0:13.6). Caption: *Mission* | **Re-shoot,** as 1. |
| 5 | 0:14.74 – 0:17.74 | **Modern**. | Caption: *Modern* | **Re-shoot,** as 1. |
| 6 | 0:17.74 – 0:18.99 | **Art Deco**, one of the four styles a run unlocks. | Caption: *Art Deco* | **New.** One more plate, same save and framing. |

### Act 2 — One building (0:18.99 – 0:31.04)

One new game, Halifax in navy and gold, in its first summer. It opens on
the name, carved, then goes to the map, three steps closer than the
opening view.

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 7 | 0:18.99 – 0:20.89 | **UI**, close, on the hard drop. The founding screen's facade: Founders Hall head-on in Georgian stone, *COLLEGE* carved across its front. *Halifax* is typed, and each letter is cut into the stone as it lands, until the front reads **HALIFAX COLLEGE**. Cropped to the facade. | The carved name itself. | **New.** The startup screen (`StartupScreen.tsx`'s `SchoolFacade`), Georgian, navy and gold, the name typed at a steady pace, recorded at four times the pixels so the crop is sharp. The facade draws its own sky, so none of the title art behind the card shows. |
| 8 | 0:20.89 – 0:23.30 | **UI.** An empty lawn by the woodland. Founders Hall's ghost glides in from the build menu, and it's set down. | **Card:** EVERY UNIVERSITY BEGINS WITH ONE BUILDING. (0:21.0 – 0:23.2) | **Have.** The founding take (`founding.mjs`), about 72 of its 114 frames: the glide and the set-down. |
| 9 | 0:23.30 – 0:25.39 | **UI**, close. The build menu on its Grounds tab, *Flower bed* picked. The cursor drags along the hall's south wall, and beds appear tile by tile. It lifts at the door, starts again past it, and turns the corner along the east wall. Of the 24 tiles round the hall, 4 are left open, one at the middle of each wall, where the doors open. | None. Let it breathe. | **New.** See [The flower beds](#the-flower-beds). Two seconds, so the drag is brisk. |
| 10 | 0:25.39 – 0:28.64 | **UI**, same framing. The path tool draws a straight walk out from each door, through its gap in the beds, across the lawn. The first walkers step onto them. | None. | **New.** The same take as 9. |
| 11 | 0:28.64 – 0:31.04 | Close. Meadow House, the first residence hall, rises beside it, from footings to finished, in summer green. | **"Deeply impressed by this game"** (0:28.8 – 0:31.0) | **New.** It replaces the first cut's hall, whose 35 weeks crossed a winter and the summer's stop (the white flashes). It's the same game, the walkthrough's own 16-week residence hall, recorded *Always summer* (`clip.mjs --until-built --no-seasons`). |

### Act 3 — The people and the choices (0:31.04 – 0:38.01)

Three screens, each in its own school colours.

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 12 | 0:31.04 – 0:33.10 | **UI, black & gold.** Faculty: a push-in across the grid of faces, toward one card's portrait and quirk. | None. | **Re-shoot.** It exists in navy and gold. Re-shoot in black and gold (the same year-50 save, its colours changed). |
| 13 | 0:33.10 – 0:35.56 | **UI, maroon & gold.** The summer: a push-in to the applicant pool and the kinds of student it drew. | **Card**, on a dark band across the lower third: EVERY SUMMER, A NEW CLASS. (0:33.3 – 0:35.4) | **Re-shoot.** It exists in navy and gold. Re-shoot with `npm run scenario -- summer --colors maroon-gold`. |
| 14 | 0:35.56 – 0:38.01 | **UI, crimson & silver.** The board's letter with the four specialization cards. The cursor passes over them and, on the last pulse, chooses academics: **The faculty training program**, "A college known first for its teaching." | **Card**, lower band: CHOOSE WHAT IT'S KNOWN FOR. (0:35.8 – 0:37.9) | **Re-shoot.** It exists in navy and gold, as a still. Re-shoot from `npm run scenario -- specialization --colors crimson-silver` (the choice unanswered), recorded with a drawn cursor and the click, as `founding.mjs` records one. |

### Act 4 — Fifty years (0:38.01 – 0:51.64)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 15 | 0:38.01 – 0:41.50 | **Bare.** The Tudor time-lapse: the hand-laid Tudor campus built over fifty years under one slow move, from the map's closest zoom on Founders Hall in year 1 out to the whole campus in year 50, what lies past the edge revealed as the view widens to it. It grows in the order the seeded run builds it: walks reach out from Founders Hall, sites rise and finish, and lamps, benches and flower beds arrive round each building. The athletic venues grow stage by stage to their last, the stadium to its second deck. The Triumphal Gate goes up last. The year caption sits in the corner. | **Card:** ONE COLLEGE. FIFTY YEARS. (0:38.2 – 0:41.2) | **Have** (made after the first cut): `tools/trailer/tudorTimelapse.ts`, 217 frames, each drawn by the game at its own view on the move (`tudor_camera.py`, `timelapseShoot.mjs --views`), *Always summer*. About 3.5 s of it plays here, a stretch at its own pace (sped up, the move rushes). A seventh architecture on screen. |
| 16 | 0:41.50 – 0:43.60 | **UI, royal blue & gold.** The charter: the board's letter cropped to its last line ("the stone is cut once") and its button **Become Halifax University**, clicked. Then a cut to the pennant over the campus, now reading *Halifax University*. | The letter's own words. | **New.** Use `npm run scenario -- charter --colors royal-gold`, with a drawn cursor and the click. The pennant is chrome, so this shot is not bare. |
| 17 | 0:43.60 – 0:47.14 | Close. The stadium grows to full size: it goes up, then gains stands, full seating all round and a second deck, each expansion a construction site for a beat before it finishes. Then the double-decked bowl, full for a home game. | **"I've been looking for exactly this type of game"** (0:43.8 – 0:46.9) | **New,** for the growth, from frames that exist: the Tudor time-lapse's frames 104–150 (the stadium raised in years 26–27, expanded in years 30, 34 and 37), shot close on the stadium with one view for them all (`timelapseShoot.mjs --from=104 --to=150 --views=…`), *Always summer*. **New,** for the last beat: the full bowl recorded live in a home-game week (week 8, 20 or 32) for the crowd. It replaces the year of seasons, whose fast snow would flash. |
| 18 | 0:47.14 – 0:51.64 | **UI, purple & gold.** The Final Report opens on the swell: *Year 50 · the fiftieth year closes*, and at the head of the report its sentence, the answer: "Halifax University: a college known first for its teaching, with no glaring weakness." Its final grade, an A, below. The question sits on the lower band over the rest. On the drop at 0:49.04 the band goes and a push-in closes on the sentence. | **Card**, lower band: WHAT WILL YOU BUILD? (0:47.3 – 0:48.9). Then the report's own words. | **New.** `npm run scenario -- final-report --player Natural --specialization academics --colors purple-gold --name Halifax` writes that report: academics chosen in year 20, the sentence unedited. The Completionist's and Guided player's academic runs write a longer one ("…its teaching that never built an endowment to match its size"). |

### Act 5 — The pan returns (0:51.64 – 0:54.09)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 19 | 0:51.64 – 0:52.45 | **Bare.** The pan again, further along, as if it never stopped: **Mission**. | Caption: *Mission* | **Re-shoot,** with 1–6. |
| 20 | 0:52.45 – 0:53.26 | **Modern**. | Caption: *Modern* | **Re-shoot,** with 1–6. |
| 21 | 0:53.26 – 0:54.09 | **Georgian** again, Halifax's own. The drift slows and settles on Founders Hall at the head of the Grand Quad, with its ring of flower beds, fifty years on. | None. | **Re-shoot,** with 1–6. The year-50 save gets the same beds round Founders Hall (row 51, col 60, 7×5), wherever the year-50 paving leaves open ground. |

### End card (0:54.09 – 1:00.5)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 22 | 0:54.09 – 1:00.5 | **Bare.** Year 50, wide, in the fall, the hills and haze behind, barely drifting. A dark gradient under the words. | From 0:54.09: the logo and **FIFTY YEARS TO BUILD A UNIVERSITY.** From 0:55.19: **WISHLIST ON STEAM**, and no release date, with *Music by Alejandro Tóth · Halifax Games* small at the foot. Fade to black from 1:00.1. | **Have,** the 4K plate and the card (`cards.mjs`). The logo is the game's own, as the title screen shows it: the mark over the name. |

## The words on screen

The muted test: read only this column.

| T | Text | Words | Seconds |
|---|---|---|---|
| 0:00.3 | "The football manager of universities" | 5 | 2.6 |
| 0:06.5 | "An alarmingly believable university simulator" | 5 | 2.6 |
| 0:11.0 | "It feels one of a kind" | 6 | 2.6 |
| 0:00 – 0:18.99 | Captions, small: *Georgian · Collegiate Gothic · Classical · Mission · Modern · Art Deco* | 1–2 each | 1.25 – 4.35 |
| 0:19.1 | HALIFAX COLLEGE, carved as it is typed (the founding screen's own stone) | 2 | 1.8 |
| 0:21.0 | EVERY UNIVERSITY BEGINS WITH ONE BUILDING. | 6 | 2.2 |
| 0:28.8 | "Deeply impressed by this game" | 5 | 2.2 |
| 0:33.3 | EVERY SUMMER, A NEW CLASS. | 5 | 2.1 |
| 0:35.8 | CHOOSE WHAT IT'S KNOWN FOR. | 5 | 2.1 |
| 0:38.2 | ONE COLLEGE. FIFTY YEARS. | 4 | 3.0 |
| 0:41.5 | *Become Halifax University* (the letter's button) | 3 | 1.0 |
| 0:43.8 | "I've been looking for exactly this type of game" | 9 | 3.1 |
| 0:47.14 | The Final Report's sentence (the report itself) | 13 | 4.5 |
| 0:47.3 | WHAT WILL YOU BUILD?, below it | 4 | 1.6 |
| 0:54.09 | Logo · FIFTY YEARS TO BUILD A UNIVERSITY. | 6 | to the end |
| 0:55.19 | WISHLIST ON STEAM | 3 | 5.3 |

Headlines and the time-lapse card are set as in the first cut, at the top or
centre over the map. The two Act 3 cards and the question on the Final
Report sit on a dark band across the lower third, since they play over the
screens' cream.

## The colours

The map is one college, so it keeps one pair of colours. Each screen is a
different college's, so between them they show the choice.

| Shots | Colours |
|---|---|
| The pan (1–6, 19–21), the name, the founding and the flower beds (7–11), the end card (22) | **Navy & gold**, Halifax's own |
| The Tudor time-lapse (15) and its stadium (17), another college | **Forest & gold**, the Tudor plan's own |
| Faculty (12) | **Black & gold** |
| The summer (13) | **Maroon & gold** |
| The specialization (14) | **Crimson & silver** |
| The charter (16) | **Royal blue & gold** |
| The Final Report (18) | **Purple & gold** |

Every screen keeps the name Halifax: only the colours change. A save's
colours are one field, like its architecture, so a screen can be re-shot in
another pair from the same save, or from the same seeded scenario with
`--colors`.

## The flower beds

Shots 9 and 10, the new close-up, recorded like the founding (a script on
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
- **The camera:** two to three steps closer than shot 8, the hall a little
  above the middle, the build menu showing.
- **The season:** the first summer, so the beds are in flower and the lawn
  matches shot 8.

## The headlines

Five players, one headline each, every one in the player's own words
([`findings.md`](../reviews/playtest-1/findings.md) logs them "trimmed, not
edited"). They're trimmed to the phrase a reviewer would put in a headline,
with no words changed or stitched together. On screen they're the quotes
alone: no names, no sources, no star ratings (the owner's call).

| | Headline | Their full words | Who, where | Check |
|---|---|---|---|---|
| 1 | "The football manager of universities" | "I'm a huge football manager fan and this feels like the football manager of universities basically." | R8, Careless-Flower6059 | A private Reddit chat message, so nothing on screen says whose. |
| 2 | "An alarmingly believable university simulator" | "350 students and zero professors is an alarmingly believable university simulator lol." | R10, No-Giraffe-3838, a public comment on r/WebGames | A joke about the opening that reads as praise: judge whether the trim is fair. |
| 3 | "It feels one of a kind" | "I'd give it a nine out of ten. It feels one of a kind." | S1, the tester "Misthios" for We Playtest Games | From an **AI-generated transcript**: check the words against [the video](https://www.youtube.com/watch?v=zv1kn2uAHVs) before the cut. |
| 4 | "Deeply impressed by this game" | "Wow, deeply impressed by this game, tried it and it's wow!" | I2, AlexanderGGA08, a public itch.io rating | Public. The same player as R1, R5 and I1. |
| 5 | "I've been looking for exactly this type of game" | "I've been looking for exactly this type of game for a long time." | F2, the feedback form | Anonymous. |

**Spares:** T1, on Twitch, "This reminds me of games I used to play"
(check against the recording). D1, on Discord, "giving proper throwback to
the original Sims vibes" (it's spelled "throughback", so ask before
correcting it). **Not used:** F3's line, at the owner's call. R9's message,
from the composer the owner was talking to about the music. And any second
line from a player already quoted.

## Ideas for more school theming

Each is something the game already has. Two are in the shot list, at the
owner's pick: **4**, the name carved (shot 7), and **8**, asked as "What
will you build?" (the card on shot 18). The rest are proposals; the three
marked ★ change no shot's footage, only its words or sound.

1. ★ **Move-in day.** The first residence hall's letter in the game is
   titled *Somebody lives here now*. Set that title as the card on shot 11,
   as Meadow House finishes and the first walkers head in. Move the itch.io
   headline to shot 10.
2. ★ **Homecoming.** The stadium's three home games each year are the
   opener, the rivalry and homecoming (weeks 8, 20 and 32,
   `athletics/season.ts`). Record shot 17's full bowl in week 32 and caption
   it *Homecoming* in the corner, as the architectures are captioned.
3. ★ **A bell.** The game has a Bell Tower and a Campanile. Ask Alejandro
   for a single bell or chime, struck under the title at 0:54.09 and left to
   ring into the finale. Lay the campus's own murmur under the pan, and the
   stadium's roar under shot 17.
4. **The name, carved.** *In: shot 7.* As you type a college's name at the
   founding, the screen carves it across the front of a hall
   (`StartupScreen.tsx`'s facade, drawn by code). Act 2 opens on *HALIFAX*
   appearing in stone, then cuts to the empty lawn. The facade draws its own
   sky, so a crop to it shows none of the title painting behind the card.
5. **The board's welcome.** Replace "Every university begins with one
   building" with the game's own first letter, set as a letter: the eyebrow
   *From the chair of the board*, the title *The doors open*, then "Three
   hundred and fifty students have enrolled, and the college is yours to
   build." It casts the viewer as the President. It is longer: give it the
   whole of shot 8.
6. **The eras as chapters.** Over the Tudor time-lapse, the chronicle's own
   era names in the corner as the decades pass: *The Charter Years · The
   Scaffolding Years · The Championship Years · The Laureate Years*. Use
   the names the recorded run's Final Report actually gives.
7. **Commencement.** In the year's last fortnight every lamp carries a banner
   in the college's colours. The Tudor layout has 78 lamps and benches. A
   close shot down a lamp-lined walk at commencement, captioned
   *Commencement*, could close Act 4 before the Final Report.
8. **What will you build?** *In: the card on shot 18, in the owner's
   words.* The game tags a college as the guidebooks see it: *a research
   powerhouse*, *a teaching college*, *an artists' college*, *an old-money
   college*, *a party school*. The card asks "What will you build?" as the
   Final Report opens, and the report's sentence answers it. It ties the
   minute to identity, which is what F3 said they come back for.
9. **Student life.** The Students tab's clubs and Greek chapters, in navy
   and orange (the last unused colour pair), as a one-second screen in
   Act 3, with Greek Row on the map behind.

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
  started in week 1, which finishes long before the summer. Every
  time-squeezed shot is recorded *Always summer*, so no winter can flash.
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
- **Always summer** for every time-squeezed shot. That's Settings → Seasons →
  *Always summer* in a hand capture, `--no-seasons` on `clip.mjs`, and
  `timelapseShoot.mjs`'s default (leave out `--seasons`).
- **Steam's format:** H.264 MP4, AAC stereo, 30 fps, at 5,000 Kbps or more.

## Decided

The owner's calls on what was open:

1. **The headlines** are the quotes alone, with no attribution.
2. **The sixth style** of the pan is Art Deco.
3. **The end card** carries the game's current logo and WISHLIST ON STEAM,
   with no release date.
4. **The specialization shown** is academics, the faculty training program
   (shot 14), and the Final Report comes from a run that chose it
   (shot 18).
5. **The school theming:** the name, carved (idea 4, shot 7), and the card
   "What will you build?" (idea 8, shot 18).

Still to settle before the cut: S1's words against the video
([The headlines](#the-headlines)), and the theme's permission and master
from Alejandro ([The music](#the-music)).

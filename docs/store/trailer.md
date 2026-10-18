# The trailer — a script

**Status:** a draft for the owner to edit, 18 October 2026. This is the
second one-minute script, written after the owner watched the first
minute's cut ([What the owner said of the first minute](#what-the-owner-said-of-the-first-minute)).
It replaces the plan in [`steam-page.md`](steam-page.md)'s *What waits on
others*. The research behind it is
[`trailer-research.md`](trailer-research.md).

**Length:** 1:00.5 · **Music:** Alejandro Tóth's title theme, cut twice (the
same edit as the first minute) · **Slot:** the store's first trailer, tagged
*Gameplay*.

## The idea

It starts with a name. On the founding screen, *Halifax* is typed, and the
stone over Founders Hall's door takes it letter by letter: **HALIFAX
COLLEGE**.

On the music's first entry the trailer jumps fifty years ahead: Halifax as
it will be, a whole university in the fall, the camera drifting over the
Grand Quad as it flicks through five architectures on the beat. Seven
seconds, then back to the beginning.

Year one: an empty lawn, and Founders Hall set down on it. Flower beds go in
round it with a gap at each door, a walk runs out from every door, and the
first residence hall rises beside it as the theme peaks.

The music drops, and the game opens out in the order you play it: the
courses and the professors to teach them, the summer's new class, the one
choice that decides what the college is known for, then game day, a stadium
raised and filled.

As the theme returns, fifty years pass in one shot. The camera starts close
on Founders Hall, alone on its lawn, and pulls out year by year as a campus
grows round it, to year 40, while the players' words arrive one after
another.

The Final Report asks what you will build, and answers for this run. On the
theme's peak the pan comes back and settles on Founders Hall at the head of
its quad. Then the title.

The name says *this is yours from the first keystroke*. The flash-forward
says *this is what it becomes*. The minute in between proves it's a game you
play, start to finish, and the headlines, all together, say *people are
playing it and love it*.

## How it's built

- **The name first, the dream second.** The first frame is the player doing
  something, typing the college's name (the research's rule one: gameplay
  and player interaction from the first frame). The finished campus lands
  on the music's first entry, three seconds in, so the genre is plain by the
  fifth second (rule two).
- **The pan is short.** Seven seconds, five architectures, cut on the beat
  (110.8 bpm, bar lines 2.17 s apart): the first held to the bar line,
  three switches on half-bars, the last held into the swell. It comes back
  for three more seconds on the theme's peak. The first minute gave it 19
  seconds; the research's impatient viewers named slow pans first.
- **The story follows play.** Name, Founders Hall, the grounds, the first
  residence, courses and professors, admissions, the specialization,
  athletics, then the fifty years: the calendar structure the genre's best
  trailer used (Two Point Campus's *Welcome to the Academic Year*), at
  UniSchool's own scale.
- **Time is the subject.** The longest shot (16 seconds) is the time-lapse,
  year 1 to year 40, one unbroken pull-back from Founders Hall (rule six:
  compressed time, a moving camera, cause and effect). It is the bookend
  inside one shot, Founders Hall alone on a lawn and then at the heart of a
  university (the research's Civilization VII note), and the last pan
  settles on the same hall.
- **The headlines arrive together.** All five play over the time-lapse, one
  after another, never in the first seconds (rule nine), so they read as a
  chorus: many players, one game.
- **Seven cards,** each six words or fewer, held two seconds or more (rule
  five), and the game's own words where it has them: the carved name, the
  Final Report's sentence.
- **The interface in the gameplay shots, in many colours.** The screens
  (the curriculum, faculty, the summer, the choice, the Final Report) each
  wear a different pair of school colours, so the colour choice shows
  without a word about it. The map shots stay in Halifax's navy and gold, so
  the campus reads as one place throughout. See [The colours](#the-colours).
- **It works muted:** seven cards, five headlines, the carved name, the
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
| 0:00 | 0:07.36 | The quiet intro (about −39 dBFS; lift it about 6 dB in the mix). | The name, typed and carved. |
| **0:03.09** | 0:10.45 | **First entry,** +13 dB. | Halifax, fifty years on: Georgian. |
| 0:05.21 · 0:06.29 · 0:07.37 · 0:08.46 | 0:12.57 … 0:15.82 | The statement's beat (110.8 bpm): a bar line, then half-bars. 0:06.29 is the onset at 0:06.25. | Collegiate Gothic, Classical, Mission, Art Deco. |
| 0:10.39 | 0:17.75 | A swell. | Year one: Founders Hall set down. |
| 0:14.74 | 0:22.10 | A swell. | The walks. |
| 0:17.74 | 0:25.10 | A swell, the statement's peak. | Meadow House finishes. |
| **0:18.99** | 0:26.35 | **Hard drop,** −13 dB in 0.4 s. | Courses and professors. |
| 0:20.89 | 0:28.25 | A rise. | The summer follows at 0:21.20. |
| 0:23.54 | 0:30.9 → 0:39.6 | First join. | The choice. |
| 0:25.39 | 0:41.45 | An onset. | The stadium follows at 0:26.00. |
| 0:28.64 | 0:44.70 | A rise. | The bowl, full. |
| **0:31.04** | 0:47.1 → 1:04.5 | Second join, on a swell. The pulse begins. | Fifty years: Founders Hall, alone. |
| 0:33.10 | 1:06.56 | A pulse group. | |
| 0:35.56 | 1:09.02 | A pulse group. | |
| **0:38.01** | 1:11.47 | **Second entry,** +9 dB. | Year 18, and the third headline. |
| 0:40.39 | 1:13.85 | A drop. | |
| 0:47.14 | 1:20.60 | A swell. | Year 40 gives way to the Final Report: *What will you build?* |
| 0:49.04 | 1:22.50 | A drop. | The report's answer. |
| **0:51.64** | 1:25.10 | **The big swell,** to the peak at 0:53.04. | The pan returns. |
| **0:54.09** | 1:27.55 | **The breath,** −8.5 dB for a second. | The title. |
| **0:55.19** | 1:28.65 | **The finale** enters. | *Wishlist on Steam*. |
| 0:58.04 → 1:00.44 | 1:31.5 → 1:33.9 | Fade to silence, done before the swell at 1:33.95. | The end card holds to 1:00.5. |

The time-lapse fits the edit exactly: from the second join (0:31.04) to the
swell (0:47.14) is 16.1 seconds, and year 1 to the end of year 40 at the
time-lapse's own pace (a frame of the run each tenth of a second) is 16.1
seconds. Nothing is cut from it.

**Ask Alejandro for** written permission to use the theme in marketing
(and whether it's in YouTube's Content ID); the lossless master (the
repository's MP3 is 160 kb/s); a one-minute edit with a written ending in
place of the fade, using these three pieces as the guide; stems, so the
music can thin under the headlines; and how he'd like his credit to read.

## The shot list

Every shot below was recorded for the first minute
(`unischool/tools/trailer/build.sh`), except the curriculum's half of shot
11. **Status** says what each needs:
- **Have**: recorded, used as it is (any retiming is the edit's).
- **New**: never recorded.

*UI* means the interface is on screen. *Bare* means the chrome is hidden,
and the map's labels and marks too (`--clean`).

### Act 1 — A name (0:00 – 0:03.09)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 1 | 0:00 – 0:03.09 | **UI**, close. The founding screen's facade: Founders Hall head-on in Georgian stone, *COLLEGE* carved across its front. *Halifax* is typed, and each letter is cut into the stone as it lands, until the front reads **HALIFAX COLLEGE**. Held, pushing in a touch. | Small, above the facade, the screen's own heading: *Name your college* (0:00.2 – 0:02.4). Then the carved name itself. | **Have.** The facade take (`act2.mjs`, shot 7 of the first minute), held longer at both ends: its 58 frames make 93. |

### Act 2 — What it becomes (0:03.09 – 0:10.39)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 2 | 0:03.09 – 0:05.21 | **Bare.** On the first entry, the dream: Halifax in year 50, in the fall, a low angle, the Grand Quad and its fountain, walkers crossing, the camera drifting slowly left to right. **Georgian.** | **Card:** HALIFAX, FIFTY YEARS ON. (0:03.3 – 0:05.9). Caption: *Georgian* | **Have.** The pan's plates. |
| 3 | 0:05.21 – 0:06.29 | The same pan, same place, cut on the bar: **Collegiate Gothic**. Only the buildings change. | Caption: *Collegiate Gothic* | **Have.** |
| 4 | 0:06.29 – 0:07.37 | **Classical**, on the onset. | Caption: *Classical* | **Have.** |
| 5 | 0:07.37 – 0:08.46 | **Mission.** | Caption: *Mission* | **Have.** |
| 6 | 0:08.46 – 0:10.39 | **Art Deco**, held into the swell. | Caption: *Art Deco* | **Have.** |

### Act 3 — One building (0:10.39 – 0:18.99)

One new game, Halifax in navy and gold, in its first summer, three steps
closer than the opening view.

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 7 | 0:10.39 – 0:12.70 | **UI.** Back to year one on the swell: an empty lawn by the woodland. Founders Hall's ghost glides in from the build menu, and it's set down. | **Card,** above the hall: IT BEGINS WITH ONE BUILDING. (0:10.6 – 0:12.6) | **Have.** The founding take (`act2.mjs`), its frames 45–113: the glide and the set-down. |
| 8 | 0:12.70 – 0:14.74 | **UI**, close. The build menu on its Grounds tab, *Flower bed* picked. The cursor drags beds along the hall's south and east walls, lifting at each door. | None. Let it breathe. | **Have,** played a little faster (its 74 frames in 61). See [The flower beds](#the-flower-beds). |
| 9 | 0:14.74 – 0:16.90 | **UI**, same framing, on the swell. A straight walk drawn out from each door, through its gap in the beds. | None. | **Have,** played faster (its drawing, 88 frames, in 65). |
| 10 | 0:16.90 – 0:18.99 | Close. Meadow House, the first residence hall, rises beside it to the statement's peak, and the first students walk out. | None. | **Have.** |

### Act 4 — Running it (0:18.99 – 0:31.04)

The screens, each in its own school colours, then game day.

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 11 | 0:18.99 – 0:21.20 | **UI.** On the hard drop, the curriculum in **navy & orange**: the course catalogue, a push across it (1.1 s). Then the faculty in **black & gold**: a push-in across the grid of faces, toward one card's portrait (1.1 s). | **Band:** ADD COURSES. HIRE PROFESSORS. (0:19.1 – 0:21.1) | **New** for the curriculum: one 4K still (`shoot.mjs <save> curriculum.png --tab=curriculum --scale=2`, the year-50 save in navy and orange). **Have** for the faculty. Without the new still, the faculty holds the whole shot and the band reads HIRE THE PROFESSORS. |
| 12 | 0:21.20 – 0:23.54 | **UI, maroon & gold.** The summer: a push-in to the applicant pool and the kinds of student it drew. | **Band:** EVERY SUMMER, A NEW CLASS. (0:21.3 – 0:23.4) | **Have.** |
| 13 | 0:23.54 – 0:26.00 | **UI, crimson & silver.** The board's letter with the four specialization cards. The cursor passes over them and chooses academics, **The faculty training program**: armed, then confirmed. | **Band:** CHOOSE WHAT IT'S KNOWN FOR. (0:23.7 – 0:25.9) | **Have** (`screens.mjs choice`), ending on the armed button under the cursor. |
| 14 | 0:26.00 – 0:28.64 | Close. The stadium raised and grown, stage by stage: the pad, the stands, full seating all round, the second deck, each a construction site for a beat. | None. | **Have.** The Tudor frames 104–150, shot close on the stadium. |
| 15 | 0:28.64 – 0:31.04 | Close. The double-decked bowl, full for the opener, pushed in on the crowd. | **Card:** FILL THE STANDS. (0:28.8 – 0:30.9) | **Have.** |

### Act 5 — Fifty years (0:31.04 – 0:47.14)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 16 | 0:31.04 – 0:47.14 | **Bare.** The Tudor time-lapse, year 1 to the end of year 40, in one unbroken shot. It opens at the map's closest zoom on Founders Hall, alone on its lawn, and pulls out at an even pace as walks, halls and sites spread round it: the quads, the residences, the athletic venues growing at the edge. The year sits in the corner. The second entry lands in year 18. | The five headlines, one after another, each a beat after the last: **"The football manager of universities"** (0:31.6 – 0:34.0), **"An alarmingly believable university simulator"** (0:34.3 – 0:37.0), **"It feels one of a kind"** (0:38.0 – 0:40.4, on the second entry), **"Deeply impressed by this game"** (0:40.7 – 0:43.1), **"I've been looking for exactly this type of game"** (0:43.4 – 0:46.6). Then year 40, clear. | **Have.** `tudor.mp4`'s frames 0–482, at their own pace (`tudorTimelapse.ts`, `tudor_camera.py`, `timelapseShoot.mjs --views`), *Always summer*. A seventh architecture on screen. |

### Act 6 — What it became (0:47.14 – 0:54.09)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 17 | 0:47.14 – 0:51.64 | **UI, purple & gold.** The Final Report opens on the swell: *Year 50 · the fiftieth year closes*, and at the head of the report its sentence. The question sits on the lower band over the rest. On the drop at 0:49.04 the band goes and a push-in closes on the sentence: "Halifax University: a college known first for its teaching, with no glaring weakness." Its final grade, an A, below. | **Band:** WHAT WILL YOU BUILD? (0:47.3 – 0:48.9). Then the report's own words. | **Have.** The Natural player's academic run (`npm run scenario -- final-report --player Natural --specialization academics --colors purple-gold --name Halifax`), the sentence unedited. |
| 18 | 0:51.64 – 0:52.45 | **Bare.** The pan again, on the big swell, further along as if it never stopped: **Mission**. | Caption: *Mission* | **Have.** |
| 19 | 0:52.45 – 0:53.26 | **Modern**, its only appearance. | Caption: *Modern* | **Have.** |
| 20 | 0:53.26 – 0:54.09 | **Georgian** again, Halifax's own. The drift slows and settles on Founders Hall at the head of the Grand Quad, with its ring of flower beds, fifty years on. | None. | **Have.** |

### End card (0:54.09 – 1:00.5)

| # | T | Scene | Words on screen | Status |
|---|---|---|---|---|
| 21 | 0:54.09 – 1:00.5 | **Bare.** Year 50, wide, in the fall, the hills and haze behind, barely drifting. A dark gradient under the words. | From 0:54.09: the logo and **FIFTY YEARS TO BUILD A UNIVERSITY.** From 0:55.19: **WISHLIST ON STEAM**, and no release date, with *Music by Alejandro Tóth · Halifax Games* small at the foot. Fade to black from 1:00.1. | **Have,** the 4K plate and the card (`cards.mjs`). The logo is the game's own, as the title screen shows it: the mark over the name. |

**Out of this cut:** the charter (*Become Halifax University*). The name's
arc now pays off in the Final Report, which calls the college Halifax
University. To bring the charter back, restore the 8.7-second quiet phrase
the music skips at 0:23.54: the trailer runs 1:09, and the charter's 2.1
seconds sit after the summer, with time to spare round the screens.

## The words on screen

The muted test: read only this column.

| T | Text | Words | Seconds |
|---|---|---|---|
| 0:00.2 | *Name your college* (the screen's own heading, small) | 3 | 2.2 |
| 0:00.6 | HALIFAX COLLEGE, carved as it is typed | 2 | to 0:03.09 |
| 0:03.3 | HALIFAX, FIFTY YEARS ON. | 4 | 2.6 |
| 0:03.09 – 0:10.39 | Captions, small: *Georgian · Collegiate Gothic · Classical · Mission · Art Deco* | 1–2 each | 1.1 – 2.1 |
| 0:10.6 | IT BEGINS WITH ONE BUILDING. | 5 | 2.0 |
| 0:19.1 | ADD COURSES. HIRE PROFESSORS. | 4 | 2.0 |
| 0:21.3 | EVERY SUMMER, A NEW CLASS. | 5 | 2.1 |
| 0:23.7 | CHOOSE WHAT IT'S KNOWN FOR. | 5 | 2.2 |
| 0:28.8 | FILL THE STANDS. | 3 | 2.1 |
| 0:31.6 | "The football manager of universities" | 5 | 2.4 |
| 0:34.3 | "An alarmingly believable university simulator" | 5 | 2.7 |
| 0:38.0 | "It feels one of a kind" | 6 | 2.4 |
| 0:40.7 | "Deeply impressed by this game" | 5 | 2.4 |
| 0:43.4 | "I've been looking for exactly this type of game" | 9 | 3.2 |
| 0:47.14 | The Final Report's sentence (the report itself) | 13 | 4.5 |
| 0:47.3 | WHAT WILL YOU BUILD?, below it | 4 | 1.6 |
| 0:51.64 – 0:53.26 | Captions: *Mission · Modern* | 1 each | 0.8 |
| 0:54.09 | Logo · FIFTY YEARS TO BUILD A UNIVERSITY. | 6 | to the end |
| 0:55.19 | WISHLIST ON STEAM | 3 | 5.3 |

Read down the column, the cards tell the story on their own: a name; what
it becomes; one building; courses and professors; a class each summer; a
choice; game day; fifty years in the players' words; what will you build;
the title.

The headlines and the cards over the map sit at the top of the frame, clear
of what the shot is about (Founders Hall in shots 7 and 16). The two
screens' cards and the question on the Final Report sit on a dark band
across the lower part, since they play over the screens' cream.

## The colours

The map is one college, so it keeps one pair of colours. Each screen is a
different college's, so between them they show the choice.

| Shots | Colours |
|---|---|
| The name (1), the pan (2–6, 18–20), the founding and the grounds (7–10), the end card (21) | **Navy & gold**, Halifax's own |
| The curriculum (11, its first half) | **Navy & orange**, the last pair the trailer hadn't used |
| Faculty (11, its second half) | **Black & gold** |
| The summer (12) | **Maroon & gold** |
| The specialization (13) | **Crimson & silver** |
| The stadium (14, 15) and the time-lapse (16), another college | **Forest & gold**, the Tudor plan's own |
| The Final Report (17) | **Purple & gold** |

Every screen keeps the name Halifax: only the colours change. A save's
colours are one field, like its architecture, so a screen can be re-shot in
another pair from the same save, or from the same seeded scenario with
`--colors`. Royal blue and gold left with the charter.

## The flower beds

Shots 8 and 9, the close-up, recorded in the founding's own take
(`act2.mjs`: Playwright's stepped clock, a drawn cursor), straight after it
in the same new game:

- **The hall:** Founders Hall is 7×5, so each wall has an odd length and one
  door tile at its middle (`walkRoutes.ts`'s `entrancesOf`). The students
  come and go through those four tiles. Decor doesn't block walking (the
  walk grid ignores it), so a bed on a door tile would have the students
  walking straight through the flowers. The gaps keep them on the walks.
- **The beds:** the build menu's Grounds tab, *Flower bed*. It is a drag
  tool ("drag to plant a border"), so each run between two doors is one
  smooth drag along the wall, lifting at the door. 24 beds on the 28 tiles
  round the hall. The camera sees the south and east walls best; those are
  dragged in shot, and the far two planted between takes.
- **The walks:** the path tool, Shift held, one straight run out from each
  door through its gap.
- **The camera:** two steps closer than shot 7, the hall a little above the
  middle, the build menu showing.
- **The season:** the first summer, so the beds are in flower and the lawn
  matches shot 7.

## The headlines

Five players, one headline each, every one in the player's own words
([`findings.md`](../reviews/playtest-1/findings.md) logs them "trimmed, not
edited"). They're trimmed to the phrase a reviewer would put in a headline,
with no words changed or stitched together. On screen they're the quotes
alone: no names, no sources, no star ratings (the owner's call).

All five play together, over the time-lapse (shot 16), one after another, so
they land as a chorus while the campus grows. The order opens on the line
that names the genre, puts the shortest on the second entry, and ends on the
one a wishlist answers.

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
owner's pick: **4**, the name carved (shot 1), and **8**, asked as "What
will you build?" (the band on shot 17). The rest are proposals; the three
marked ★ change no shot's footage, only its words or sound.

1. ★ **Move-in day.** The first residence hall's letter in the game is
   titled *Somebody lives here now*. Set that title as the card on shot 10,
   as Meadow House finishes and the first students walk out.
2. ★ **Homecoming.** The stadium's three home games each year are the
   opener, the rivalry and homecoming (weeks 8, 20 and 32,
   `athletics/season.ts`). Record shot 15's full bowl in week 32 and caption
   it *Homecoming* in the corner, as the architectures are captioned.
3. ★ **A bell.** The game has a Bell Tower and a Campanile. Ask Alejandro
   for a single bell or chime, struck under the title at 0:54.09 and left to
   ring into the finale. Lay the campus's own murmur under the pan, and the
   stadium's roar under shot 15.
4. **The name, carved.** *In: shot 1, the trailer's first.* As you type a
   college's name at the founding, the screen carves it across the front of
   a hall (`StartupScreen.tsx`'s facade, drawn by code). The facade draws
   its own sky, so a crop to it shows none of the title painting behind the
   card.
5. **The board's welcome.** Replace "It begins with one building" with the
   game's own first letter, set as a letter: the eyebrow *From the chair of
   the board*, the title *The doors open*, then "Three hundred and fifty
   students have enrolled, and the college is yours to build." It casts the
   viewer as the President. It is longer: give it the whole of shot 7.
6. **The eras as chapters.** Over the time-lapse, the chronicle's own era
   names in the corner as the decades pass: *The Founding · The Years of
   the New Schools · The Scaffolding Years…* Now the headlines play there,
   so this would crowd them; it suits a longer cut.
7. **Commencement.** In the year's last fortnight every lamp carries a banner
   in the college's colours. The Tudor layout has 78 lamps and benches. A
   close shot down a lamp-lined walk at commencement, captioned
   *Commencement*, could come between the time-lapse and the Final Report.
8. **What will you build?** *In: the band on shot 17, in the owner's
   words.* The game tags a college as the guidebooks see it: *a research
   powerhouse*, *a teaching college*, *an artists' college*, *an old-money
   college*, *a party school*. The card asks "What will you build?" as the
   Final Report opens, and the report's sentence answers it. It ties the
   minute to identity, which is what F3 said they come back for.
9. **Student life.** The Students tab's clubs and Greek chapters, in navy
   and orange, as a one-second screen in Act 4, with Greek Row on the map
   behind. (The curriculum takes navy and orange in this cut.)

## What the owner said of the first minute

The first minute (cut 17 October, rebuilt by `build.sh`) had good parts in
the wrong order. Its pan ran 19 seconds before anything was played; its
time-lapse showed only years 32 to 40; the name came after the pan, at
0:19; and the headlines were spread across the minute. The owner asked for:

- **A quicker pan.** Seven seconds now, and three more at the end.
- **The time-lapse from year 1,** to year 40, any cut taken from its end,
  not its beginning. It now runs year 1 to year 40 whole.
- **The order of play:** naming the school first, then Founders Hall,
  developing the campus, adding courses, hiring professors, the admissions
  cycle, athletics. The name now opens the trailer.
- **The headlines together,** so they say that several people are enjoying
  the game. They now play as one passage over the time-lapse.

## What the first cut taught

The 30-second cut (`claude/trailer-script`, rebuilt by
`unischool/tools/trailer/build.sh`) proved the pan and the headlines, and
showed three things the minute fixed:

- **Too short.** Every beat was over before it could be read.
- **White flashes at 0:08.7–0:09.1.** The hall-rising clip squeezed 35
  weeks into a second. Its winter flashed white for four frames, and the
  summer's stop opened the inbox for two. Meadow House is a 16-week
  building started in week 1, which finishes long before the summer. Every
  time-squeezed shot is recorded *Always summer*, so no winter can flash.
- **The screens all wore navy and gold.** Now each screen has its own
  colours.

Smaller findings for the tools:
- **The inbox can leak into a clip.** When `clip.mjs` answers a stop, the
  inbox a stop opens could show for a frame. It now hides `.tab-overlay`
  with the rest of the interface, so no clip that crosses a stop shows it.
- **The ground repaints in patches.** At a week a frame, the canvas map
  repaints the ground in rectangular patches while the snow melts. It may
  show at 8× in play too. It is a rendering bug, not a capture one.

## What recording the first minute taught

- **A new campus has no walkers.** With Founders Hall alone there is
  nowhere to walk to, so the walks shot (9) ends on its four walks; the
  first students appear once Meadow House stands (10).
- **The walkthrough holds the dock.** Once Founders Hall is down, the
  walkthrough points at the curriculum and keeps Build shut. `act2.mjs`
  skips it with the walkthrough's own skip, which keeps the chair's
  letters: one of them stops the clock in Meadow House's take, and
  `clip.mjs` answers it.
- **The specialization's confirm acts at once.** The frame after the
  second click is the map, so shot 13 ends on the armed button under the
  cursor.
- **The crowd needs pixels.** The bowl is full, every row, but at 1080p the
  crowd is a texture. The edit pushes in on the 4K take.

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
  cursor, slow and deliberate, as in `act2.mjs` and `screens.mjs`.
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
   (shot 13), and the Final Report comes from a run that chose it
   (shot 17).
5. **The school theming:** the name, carved (idea 4, shot 1), and the card
   "What will you build?" (idea 8, shot 17).
6. **The shape** (18 October): a short pan; the time-lapse from year 1;
   the order of play, the name first; the headlines together.

Still to settle before the cut: S1's words against the video
([The headlines](#the-headlines)), and the theme's permission and master
from Alejandro ([The music](#the-music)). For this script: the
flash-forward's line (HALIFAX, FIFTY YEARS ON.) and whether the curriculum
still is worth its one new capture.

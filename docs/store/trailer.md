# The trailer — a script

**Status:** a draft for the owner to edit, 17 October 2026. A first cut is
made ([The cut](#the-cut)). It replaces the plan in
[`steam-page.md`](steam-page.md)'s *What waits on others*. The research
behind it is [`trailer-research.md`](trailer-research.md).

**Length:** 0:30 · **Music:** Alejandro Tóth's title theme, 30 seconds of
it · **Slot:** the store's first trailer, tagged *Gameplay*.

## The idea

A slow pan across one finished campus, in the fall, from a low angle with
the hills and the haze behind. On the beat, the same campus changes its
architecture: Georgian, then Collegiate Gothic, then Classical. Over it,
what players said, set like review headlines. Then the music opens up and
the game itself plays in short clips: a hall set down on an empty lawn,
fifty years in two seconds, the people, the summer, the choice, a year of
seasons, a full stadium. At the peak the pan comes back, still moving, as
if the camera never stopped: Mission, then Modern. Then the title.

The pan says *this place could be yours, in any style*. The headlines say
*people who played it loved it*. The clips in between prove it's a game
you play, not a postcard.

## The cut

A first cut exists: 30 seconds, 1920×1080 at 30 fps, H.264 with the theme
in AAC, at about −14.5 LUFS with the peaks at −1.5 dBTP. At 50 MB it isn't
kept in the repository. `unischool/tools/trailer/build.sh` rebuilds it from
the game in about 25 minutes (see *The trailer* in
[`tools/README.md`](../../unischool/tools/README.md)).

**Still stand-ins:**
- **The headlines** may go out only with the five players' permission, and
  with S1's words checked against the video ([The headlines](#the-headlines)).
- **The logo** is the game's own temple mark, with the name set in
  Bricolage Grotesque, until the commissioned logo exists.
- **The end card** says *Wishlist on Steam* with no date or platform,
  because the page isn't up yet.
- **The sound** is the theme alone, from the repository's 160 kb/s MP3.
  There's no campus sound under the pan yet, and no lossless master.

**Where the cut differs from the script below:**
- G1 is a new game in its first week, so its lawn is summer green, not
  autumn.
- G5–G7 are slow push-ins on 4K stills of the screens rather than
  recordings: the faculty grid, the summer's admissions with the pool
  already counted, and the four cards with no cursor.
- Three frames of the hall going up (G2) and one of the year of seasons
  (G8) are dropped. At a week a frame, the canvas map repaints the ground
  in patches as the snow melts. The seasons clip also caught the inbox
  opening once.

## How it's built

- **The pan is the spine.** It opens the trailer and returns at the peak.
  It never sits still: it changes architecture every 2.45 s, walkers cross
  it, and the gameplay arrives at 0:07.4.
- **The first words say the genre.** The first headline, "The football
  manager of universities", tells a muted viewer what this is in its first
  second.
- **The interface shows in the gameplay clips** (placing, drawing a walk,
  the faculty, the summer, the choice) and nowhere else.
- **It works muted:** five headlines, one card, the end card, all burned
  in, large, inside the inner 90% of the frame. Check it at 360p in a
  phone-sized player.
- **Cut to the music,** which was measured, not guessed (below).
- **Only what the game does.** In-engine footage from the real build, with
  architectures the game offers at founding. The map has no night (Plan
  95C), so nothing here asks for one.

## The music

The trailer uses **music 1:04.1 to 1:34.1** of
`unischool/src/assets/title-theme.mp3` (1:44.8 in all), with no internal
cut. **Trailer time = music time − 1:04.1.** The cues below come from
measuring the recording's loudness and its onsets. Confirm each by ear.

| T | M | What the recording does | What the picture does |
|---|---|---|---|
| 0:00.0 | 1:04.1 | The quiet middle's pulse, about −32 dBFS. The window starts on a group onset. Onsets come every 0.27 s and group in threes, 2.45 s apart. | The pan opens in Georgian. |
| 0:02.46 | 1:06.56 | Group onset. | Switch to Collegiate Gothic. |
| 0:04.92 | 1:09.02 | Group onset. | Switch to Classical. |
| **0:07.37** | 1:11.47 | **The second entry:** +9 dB. | The gameplay begins. |
| 0:09.75 | 1:13.85 | A drop (−9 dB). | The time-lapse. |
| 0:16.5 | 1:20.6 | A swell. | The four cards. |
| 0:18.4 | 1:22.5 | A drop. | A year of seasons. |
| **0:21.0** | 1:25.1 | **The big swell,** to the peak at 0:22.4 (about −12 dBFS, the loudest moment in the theme). | The pan returns: Mission, then Modern. |
| **0:23.45** | 1:27.55 | **A breath:** −8.5 dB for one second. | The title. |
| 0:24.55 | 1:28.65 | The finale enters (+9 dB). | *Wishlist on Steam*. |
| 0:27.4 → 0:29.8 | 1:31.5 → 1:33.9 | Fade to silence, done before the swell at 1:33.95. | The end card holds to 0:30.0. |

**In the mix.** The first 7.4 seconds sit about 14 dB below the entry. Lift
them a few dB, and lay the campus's own sound under the pan (the crowd's
murmur and birds), so the opening isn't near-silent with the sound on.

**Ask Alejandro for:**
1. **Use in marketing,** in writing: the trailer, the store page, social
   video. And whether the track is registered with YouTube's Content ID,
   which would claim every upload.
2. **The lossless master** (WAV, 48 kHz, 24-bit). The repository's MP3 is
   160 kb/s, fine for the title screen but not for a trailer.
3. **A 30-second edit with a written ending,** in place of the fade. This
   window, from the quiet pulse through the entry and the peak, is a good
   starting point to send him.
4. **Stems,** or a mix without the lead line, so the music can thin under
   the headlines.
5. **His credit** on the end card: *Music by Alejandro Tóth*, as the game's
   Credits screen has it.

## The script

T is trailer time. `P` and `G` numbers point to [the footage](#the-footage).
*UI* means the interface is on screen; *bare* means the chrome is hidden.

### The pan
*T 0:00–0:07.37 · the quiet pulse*

**Bare.** The year-50 campus in the fall (week 12, the leaves turned), at a
low tilt with the hills and the haze in the top third. Close enough that
roofs, towers and walls read: five to eight buildings across the frame,
along the Grand Quad. The camera drifts slowly left to right. Walkers cross
the walks. On each switch, the campus stays exactly where it is and only
its architecture changes: a hard cut on the onset.

| T | Picture | On screen | |
|---|---|---|---|
| 0:00.0 | The pan, **Georgian** (red brick and white trim, a gilded cupola). | **"The football manager of universities"** — playtester, Reddit (0:00.2–0:02.3) | P1 |
| 0:02.46 | The same pan, same place, **Collegiate Gothic** (grey ashlar and steep slate). | **"An alarmingly believable university simulator"** — playtester, Reddit (0:02.6–0:04.8) | P2 |
| 0:04.92 | The same pan, **Classical** (limestone and columns under copper roofs). | **"It feels one of a kind"** — playtester, We Playtest Games (0:05.1–0:07.2) | P3 |

Sound: the campus's murmur and birds under the quiet pulse.

### The game
*T 0:07.37–0:21.0 · the second entry*

| T | Picture | On screen · sound | |
|---|---|---|---|
| **0:07.37** · entry | **UI.** An empty lawn by the woodland. Founders Hall is picked up from the build menu, its ghost glides in, and it's set down. | The game's *place* sound. | G1 |
| 0:08.6 | Close. A hall from footings to finished in one second. | The game's *complete* sound. | G2 |
| **0:09.75** · drop | **Bare.** The time-lapse, wide: year 1 to year 50 in two and a half seconds, every frame in the fall, the game's year caption in the corner. | **Card:** ONE COLLEGE. FIFTY YEARS. (0:09.9–0:12.1) | G3 |
| 0:12.2 | **Bare.** The path tool draws two straight walks out across the grass beside the Grand Quad, in the fall. | **"Deeply impressed by this game"** — itch.io player (0:12.35–0:14.5) | G4 |
| 0:14.6 | **UI.** Faculty: a push-in across the grid of faces, toward the cards and their quirks. | | G5 |
| 0:15.6 | **UI.** The summer: a push-in to the applicant pool and the kinds of student it drew. | | G6 |
| **0:16.5** · swell | **UI.** The specialization's four cards. The cursor passes over them and chooses one just before the drop. | | G7 |
| **0:18.4** · drop | **Bare.** A grown campus through one year: green, gold, snow, spring. | **"I've been looking for exactly this type of game"** — playtester (0:18.5–0:20.9) | G8 |
| 0:19.7 | Close. Game day: the stadium full. | The stadium's roar under the music. | G9 |

### The pan returns
*T 0:21.0–0:23.45 · the big swell, to the peak*

| T | Picture | On screen | |
|---|---|---|---|
| **0:21.0** · swell | **Bare.** The pan again, further along, as if the camera kept moving all the while: **Mission** (cream stucco and red tile). | No text. | P4 |
| 0:22.2 | The same pan, **Modern** (white panel, glass and burnt-orange brick), arriving at Founders Hall and the Grand Quad on the peak. | No text. | P5 |

### The end card
*T 0:23.45–0:30.0 · the breath, then the finale, faded*

| T | Picture | On screen | |
|---|---|---|---|
| **0:23.45** · breath | **Bare.** The year-50 campus, wide, in the fall, barely moving. | The logo (commissioned, not drawn by code). **FIFTY YEARS TO BUILD A UNIVERSITY.** (the game's own line, from the Credits) | E1 |
| **0:24.55** · finale | Same. | **WISHLIST ON STEAM**, the platform, the release window. Small, at the foot: *Music by Alejandro Tóth* · Halifax Games. | E1 |
| 0:27.4 → 0:30.0 | Same. | The music fades out by 0:29.8. Hold to 0:30.0. | E1 |

## The headlines

Five players, one headline each, every one in the player's own words
([`findings.md`](../reviews/playtest-1/findings.md) logs them "trimmed, not
edited"). They're trimmed to the phrase a reviewer would put in a headline.
No words are changed or stitched together, and no star ratings or
outlet-style logos appear: these are players, and they're labelled as
players.

**Set them like this:** the quote large, in the game's display face, one line
where it fits, in quotation marks. The attribution small beneath it. Placed
in the top third, over the haze, where the pan leaves clean space.

| | Headline | Their full words | Who, where | Before it goes out |
|---|---|---|---|---|
| 1 | "The football manager of universities" | "I'm a huge football manager fan and this feels like the football manager of universities basically." | R8, Careless-Flower6059 | **A private Reddit chat message.** Ask for permission, and how they'd like to be credited. It names another publisher's game, which is fine as a player's words, kept as they wrote them. |
| 2 | "An alarmingly believable university simulator" | "350 students and zero professors is an alarmingly believable university simulator lol." | R10, No-Giraffe-3838, a public comment on r/WebGames | A joke about the opening (350 students, no professors yet) that reads as praise for the simulation. The trim keeps that sense. The owner should judge whether it's fair; ask them anyway. |
| 3 | "It feels one of a kind" | "I'd give it a nine out of ten. It feels one of a kind." | S1, the tester "Misthios" for We Playtest Games | These words come from an **AI-generated transcript** of the session video. Check them against [the video](https://www.youtube.com/watch?v=zv1kn2uAHVs), and ask the service. "I'd give it a nine out of ten" is the alternative headline. |
| 4 | "Deeply impressed by this game" | "Wow, deeply impressed by this game, tried it and it's wow!" | I2, AlexanderGGA08, a public itch.io rating (★★★★★) | Public. The same player as R1, R5 and I1 (one voice, not four). Ask anyway. |
| 5 | "I've been looking for exactly this type of game" | "I've been looking for exactly this type of game for a long time." | F2, the feedback form | Anonymous, but F2 left an email, so ask there. |

**Spares,** one per player not already used:
- **T1**, on Twitch: "This reminds me of games I used to play". From the
  owner's notes; check against the recording.
- **D1**, on Discord: "giving proper throwback to the original Sims vibes".
  The original spells it "throughback", so ask before correcting it.

**Not used:**
- **F3's** "I like seeing the different ways the university can develop…",
  at the owner's call.
- **R9's** message, from the composer the owner was talking to about the
  music. Quoting a commissioned musician in a trailer scored with a
  commissioned theme is a conflict of interest.
- **A second line from someone already quoted,** such as R3's "extremely
  well thought of and so fun" (R8's player) or I1's "pretty damn awesome"
  (I2's). Two headlines from one person would read as two people.

## The words on screen

The muted test: read only this column.

| T | Text | Words | Seconds |
|---|---|---|---|
| 0:00.2 | "The football manager of universities" | 5 | 2.1 |
| 0:02.6 | "An alarmingly believable university simulator" | 5 | 2.2 |
| 0:05.1 | "It feels one of a kind" | 6 | 2.1 |
| 0:09.9 | ONE COLLEGE. FIFTY YEARS. | 4 | 2.2 |
| 0:12.35 | "Deeply impressed by this game" | 5 | 2.15 |
| 0:18.5 | "I've been looking for exactly this type of game" | 9 | 2.4 |
| 0:23.45 | Logo · FIFTY YEARS TO BUILD A UNIVERSITY. | 6 | 1.1, then held |
| 0:24.55 | WISHLIST ON STEAM · platform · window | — | 5.45 |

Each attribution sits under its headline for the same time.

## The footage

The first cut recorded every shot below with `tools/trailer/build.sh`. The
lists say what each shot is for, and what a better take would have.

### What exists

Before the first cut, an animatic could be cut from what was already in the
repository:
- **The pan:** the README's campus pictures are already the same year-50
  campus in all five architectures, one layout and one run.
  [`campus.png`](../images/campus.png) is the Georgian;
  [`campus-gothic.png`](../images/campus-gothic.png),
  [`campus-classical.png`](../images/campus-classical.png),
  [`campus-mission.png`](../images/campus-mission.png) and
  [`campus-modern.png`](../images/campus-modern.png) are the others. A
  slow move across them, cut on the beats above, is the pan in rough.
  They're stills, in summer green, each in a different colour pair, at a
  wide zoom, so they won't do for the final.
- **The clips:** [`clip-building.webm`](../images/clip-building.webm) (G2),
  [`clip-paths.webm`](../images/clip-paths.webm) (G4) and
  [`timelapse.webm`](../images/timelapse.webm) (G3). They're 720p to 1080p,
  summer, with the seasons off in the time-lapse.
- **The interface stills** in [`store/itch/`](itch/) stand in for G5–G7.

### How to capture

- **One college in every shot:** Halifax, navy and gold, seed 12345, the
  Completionist, as the README's campus is. For every pan plate,
  `--vernacular` is the only flag that changes.
- **The colours stay put** across the pan, so the eye sees the architecture
  change and nothing else. Switching colours with each style, as the
  README's pictures do, is the owner's option, but it's busier.
- **The fall by default:** week 12, the leaves turned and not yet down
  (`seasons.ts`).
- **Size:** at least 3840×2160 (`--size=1920,1080 --scale=2`), 30 fps.
  Steam takes 1920×1080 at most. The extra is for cropping and moving.
- **Interface shots:** text at its largest (the Settings panel, or
  `--settings='{"textScale":1.3}'` for stills), and a slow, deliberate
  cursor.
- **Steam's format:** H.264 MP4, AAC stereo, 30 fps, at 5,000 Kbps or more.
  The tools write WebM, so convert with a full ffmpeg.

### The pan: how to make it

`clip.mjs` records with a still camera, so the pan is made in the edit:
- record each architecture as a **large, identical, still-camera clip** with
  the walkers moving;
- move a 1920×1080 window slowly across it;
- use the same move on all five.

Because the framing is identical, a cut from one architecture to the next
on the same frame of the move is seamless: the campus stays put, the
walkers keep walking, and only the buildings change. The return at 0:21.0
picks the move up further along, where it would have reached by then.

The first cut took a shortcut that makes the five plates identical by
construction. An architecture is one field of a save (`self.vernacular`),
so `build.sh` copies the time-lapse's year-50 frame five times, changing
only that field. Each copy is recorded with the same framing:
`clip.mjs --focus=QUAD-T2 --zoom=4 --tilt=-2 --size=2880,1620 --clean`,
3.5 seconds each. The move is 960 px across each 2880×1620 plate over the
trailer's first 23.45 seconds, at about 41 px a second, with the
architecture changing on the beat.

If the hard cut feels abrupt, try a soft vertical wipe that travels with
the pan.

### What to record

| | Shot | Moment | Tool | Notes |
|---|---|---|---|---|
| P1–P5 | The pan plates: Georgian, Collegiate Gothic, Classical, Mission, Modern | Year 50, week 14 | One save, five architectures → `clip.mjs` (above) | Identical framing in all five. |
| G1 | Founders Hall picked up and set down, the build menu showing | A new game, week 1 | `tools/trailer/founding.mjs` | The cursor is drawn on the page, since a headless screenshot has none. |
| G2 | A hall from footings to finished | Any year | `clip.mjs --until-built` | As `clip-building`, in the fall. Only about 1 s of it is used. |
| G3 | The time-lapse, years 1–50, every frame in the fall | The whole run | `timelapse` and `timelapse:shoot --seasons` | With `--every 13`, one frame a year lands in the fall term. Keep those (the caption reads *Fall term*), 50 frames for 2.5 s. |
| G4 | A straight walk drawn across a quad, the walkers taking it | About year 15 | `clip.mjs --stroke` | With the path tool's interface showing. |
| G5 | Faculty: a push-in to one card, the face and the quirk | About year 30 | By hand | A quirk short enough to read in a second (`quirkData.ts`). |
| G6 | The summer: the pool counting up | Any summer | `npm run scenario -- summer`, then by hand | The count-up is the shot. |
| G7 | The four cards, and the choice | The specialization's summer | `npm run scenario -- specialization`, then by hand | |
| G8 | One year at a frame a week: green, gold, snow, spring | About year 30 | `clip.mjs --step=5000 --seconds=2` | Each frame is a week of game time. Wide. |
| G9 | The stadium full on a game day | Week 8, 20 or 32 | `clip.mjs` on a save stopped in that week | The stands fill only in the season's three home games (`OCCASIONS`, `athletics/season.ts`). |
| E1 | The end card's plate: year 50, wide, the fall, barely moving | Year 50, week 12 | `shoot.mjs --bare --tilt=-2`, or `clip.mjs` | 8 s. Leave sky at the top for the logo. |

**Sound,** recorded clean at 48 kHz from the listening bench in the debug
panel (`?debug=1`, `AudioBench.tsx`):
- the *Term* and *Summer* ambience presets for the pan, and *Game day* for
  G9;
- the *place*, *complete* and *cheer* effects, each fired alone.

### The tools

- **T1 · A moving camera in `clip.mjs`** (keys pressed at set page times:
  `Q`/`E`, `Z`/`X`, `+`/`−`). Not needed for this cut, since the pan is made
  in the edit. It would let the game's own camera make the move, at the
  cost of five separate takes having to match.
- **T2 · Placing a building in a clip.** `tools/trailer/founding.mjs`
  scripts G1's placement on a new game. A `--place` flag on `clip.mjs`
  would make any placement a clip.
- **T3 · A photo mode for hand capture:** the `--bare` stylesheet behind a
  URL flag or a hotkey.

## Cut-downs

- **A 6-second loop** for posts and the store page: the pan's three switches
  (P1–P3, T 0:00–0:07.37) loop as they stand. It may be the best thing to
  post first.
- **A longer cut** (1:27, with the charter, the people and the Final Report)
  was drafted before this one. It's in this file's history on the
  `claude/trailer-script` branch, if a second trailer is wanted later.

## Decisions for the owner

1. **The headlines' permissions:** all five players asked, and S1's words
   checked against the video. If one says no, a spare goes in.
2. **The college:** Halifax, navy and gold, as proposed, or another single
   choice for every shot.
3. **The end card:** the release window to promise, and the commissioned
   logo. The trailer doesn't go out without the logo.

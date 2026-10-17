# The trailer — a script

**Status:** a draft for the owner to edit, 17 October 2026. Nothing is
recorded yet. It replaces the plan in [`steam-page.md`](steam-page.md)'s
*What waits on others* (the time-lapse re-cut, then the summer, the four
cards and the Final Report). It keeps all four of those and builds on them.
The research behind it is [`trailer-research.md`](trailer-research.md).

**Working title:** *Fifty Years* · **Length:** 1:27 · **Music:** Alejandro
Tóth's title theme, cut once · **Slot:** the store's first trailer, tagged
*Gameplay*.

## The idea

The fantasy UniSchool sells is founding a place that outlives you: the
first building on an empty lawn, and fifty years later a university with a
character of its own, named in a sentence nobody else's college gets. The
trailer tells that one story in order. It opens on Founders Hall alone on
the grass, grows a college around it through the seasons, lingers with the
people, makes the one choice that can't be taken back, and ends on the
Final Report's sentence over the same hall, now at the heart of a
university. That last shot is a **bookend**: the first shot's place,
transformed.

The tone is the game's, quiet and earnest where the genre is loud: no
gags, no feature lists. The words on screen are short, and several are the
game's own: the board's letters, the eras' names, the report's sentence.

## The rules this cut keeps

From the research (§1 of [`trailer-research.md`](trailer-research.md)):

- **Gameplay in the first frame,** with the interface on: Founders Hall
  picked up from the build menu and set down. No logo until the end.
- **Genre by the fifth second, hook by the fifteenth.** "Every university
  begins with one building" at 0:00, "One college. Fifty years." at 0:10.
- **The interface stays in the gameplay shots** (placing, drawing walks, the
  letters, the summer, the choice, the report). It comes off only for the
  time-lapse and the wide views, where the campus is the subject.
- **It works muted:** five cards of six words or fewer, two player quotes,
  three era captions, the end card, all burned in, large, inside the inner
  90% of the frame.
- **Shots of 2–5 seconds,** none dead. The quiet middle holds longer than
  the montages.
- **Cut to the music,** which was measured (below), not guessed.
- **Only what the game does.** Every shot is in-engine footage from the real
  build. The map has no night (Plan 95C), so nothing here asks for lights
  coming on at dusk.

## The music

### What the theme does, measured

`unischool/src/assets/title-theme.mp3`, 1:44.8. The loudness and brightness
were measured every half second; the swells, drops and the phrase length
come from that analysis, not from listening. Confirm every cue by ear.

| Music time | What the recording does |
|---|---|
| 0:00–0:10.4 | **Intro.** Very quiet (about −39 dBFS), bright, steady. |
| 0:10.45 | **First entry:** +13 dB in a third of a second. The full statement follows, with swells at 0:17.75, 0:22.1 and 0:25.1 (about −12.5 dBFS). The pulse is about 74 beats a minute (onsets 0.81 s apart). |
| 0:26.35 | **Hard drop:** −13 dB in 0.4 s. The sharpest edge in the piece. |
| 0:26.5–1:11.4 | **The middle.** Lighter and quieter (−28 to −34 dBFS), repeating on a phrase of about 8.7 s. Sparse until 1:01.3, then a regular pulse builds toward the return. Swells at 0:28.25, 0:44.7 and 1:04.5. |
| 1:11.6 | **Second entry** (+9 dB). Drop at 1:13.85, swells at 1:20.6 and 1:25.25, then the **peak** at 1:26.5 (about −12 dBFS, the loudest moment). |
| 1:27.55 | **A breath:** −8.5 dB for one second. |
| 1:28.65 | **Finale:** sustained and loud (about −15 dBFS) to the end. Swell at 1:33.95, drop at 1:40.4. |
| 1:44.8 | **The file ends at full level.** It is the title screen's loop: the game crossfades it into itself (`TITLE_MUSIC.crossfade` in `audioData.ts`). The trailer needs an ending (below). |

### The edit

One internal cut takes the theme from 1:44.8 to **1:27.4**. Jump from
**0:47.1 to 1:04.5** in the middle section, which removes 17.4 s (two of its
8.7 s phrases). The harmony either side of the join matches closely (a
chroma similarity of 0.95 before the join and 0.90 after). The join also
lands on the swell at 1:04.5, so it sounds like an arrival rather than a
splice. Nudge it to the nearest bar line by ear.

After the cut, **trailer time = music time − 17.4 s.** Every cue in the
script below gives both.

*A longer option:* jump 0:46.8 → 0:55.5 instead (one phrase, 8.7 s). The
cut is just as clean (0.95 / 0.97) and keeps the build from 1:01.3 intact,
for a trailer of 1:36.

### The ending

The recording has no ending, so the fallback is a fade from **T 1:23.0**
(the natural drop at music 1:40.4) to silence by 1:27.4. Better: ask
Alejandro for an ending (below).

### What to ask Alejandro

1. **Use in marketing.** Confirm in writing that the commission covers the
   trailer, the store page and social video. Ask whether the track is
   registered with YouTube's Content ID, which would claim every upload of
   the trailer.
2. **The lossless master** (WAV, 48 kHz, 24-bit). The repository's MP3 is
   160 kb/s, fine for the title screen but not for a trailer.
3. **A trailer edit:** 1:27, with a written ending in place of the loop
   point (a final chord and its tail). A 0:30 edit too, if he will.
4. **Stems,** or at least a mix without the lead line, so the editor can
   thin the music under the quotes and the Final Report.
5. **A credit on the end card:** *Music by Alejandro Tóth*, as the game's
   Credits screen has it. Ask how he'd like it to read.

## The script

T is trailer time; M is music time. The `F` numbers point to
[the footage list](#the-footage). *UI* means the interface is on screen.
*Bare* means the chrome is hidden, as `shoot.mjs --bare` hides it.

### Cold open — one building
*T 0:00–0:10.45 · M 0:00–0:10.45 · the quiet intro*

| T | Picture | On screen · sound | |
|---|---|---|---|
| 0:00.0 | **UI.** The build menu at the foot of the screen. Founders Hall is picked up and its ghost glides across open lawn by the woodland. Click: the hall stands. | **Card 1** (0:00.3–0:02.9): EVERY UNIVERSITY BEGINS WITH ONE BUILDING. · Sound: the campus in summer (birds, light wind), and the game's *place* sound on the click. | F1 |
| 0:03.0 | **UI.** The path tool draws a walk from the hall's door across the grass (Shift held, one straight run). | Sound: ambience. | F2 |
| 0:05.6 | Close. The first residence hall goes up: footings, frame, shell, finished, in about two seconds. | Sound: the game's *complete* sound as it finishes. | F3 |
| 0:07.9 | **Bare.** A quick pull-back from the three buildings and their one walk to the ring of land around them: farmland, the road, the woodland, the hills in the haze. Walkers are already out. A fast move, not a slow pan. | **Card 2** (0:08.1–0:10.3, optional): THE COLLEGE IS YOURS TO BUILD. (The board's own words, from its first letter.) | F4 |

### I — It grows
*T 0:10.45–0:26.35 · M 0:10.45–0:26.35 · the first entry*

| T | Picture | On screen · sound | |
|---|---|---|---|
| **0:10.45** · the entry | **Bare.** The time-lapse, wide, every frame in the fall with the leaves turned. Years 1 to 10. The game's own caption in the corner (*Year 4 · Fall term*). | **Card 3** (0:10.6–0:12.6): ONE COLLEGE. FIFTY YEARS. | F5 |
| 0:12.7 · the dip | Low and close: walkers crossing a young quad among autumn trees. | Sound: the music breathes; ambience under it. | F6 |
| 0:15.2 | **Bare.** The time-lapse resumes, years 10 to 18. | | F5 |
| **0:17.75** · swell | Close. The Campanile rising in its stages, in under two seconds. | | F7 |
| 0:20.0 | **UI.** One long straight walk laid across a new quad with the path tool. | | F8 |
| **0:22.1** · swell | **Bare.** The time-lapse, years 18 to 25, with a slow push-in, landing on the grown college exactly at the drop. | | F5 |

### II — The people
*T 0:26.35–0:47.1 · M 0:26.35–0:47.1 · the hard drop, then the quiet middle*

| T | Picture | On screen · sound | |
|---|---|---|---|
| **0:26.35** · the drop | **UI.** The inbox: the board's letter *The charter*, cropped to its last lines ("…this is the one time to say so: the stone is cut once") and its two answers. The cursor rests on **Become Halifax University**, and clicks. | Sound: almost nothing; the music falls away. The game's *letter* sound on the click. | F9 |
| **0:28.25** · swell | The map: the pennant now reads **Halifax University**, with Founders Hall below it. A slow push-in. | | F10 |
| 0:30.6 | **UI.** Faculty: the grid of faces, then a push-in to one professor's card, the portrait and the quirk legible ("Lives in the lab. Students report a lamp under the door."). | Sound: the term's murmur of the crowd. | F11 |
| 0:35.1 | Close. A brown line worn corner to corner across a quad's lawn, and walkers crossing it. | | F12 |
| 0:37.1 | **UI.** Same framing. A straight walk drawn over the worn line, and the walkers take it. | | F13 |
| 0:39.6 | Close. The Grand Quad in the fall: the fountain, the flower beds, the walkers. | **Quote 1** (0:39.9–0:44.5): *"I like seeing the different ways the university can develop and get its own unique culture."* — playtester | F14 |
| **0:44.7** · swell | Close. Commencement week: a banner in the college's colours on every lamp along the walks. | | F15 |

### III — Every summer
*T 0:47.1–0:54.2 · M 1:04.5–1:11.6 · after the join, the pulse*

| T | Picture | On screen · sound | |
|---|---|---|---|
| **0:47.1** · the join | **UI.** The summer: tuition set before anyone applies, then the pool counting up, kind by kind, and the class admitted. | **Card 4** (0:47.4–0:50.4): EVERY SUMMER, A NEW CLASS. · Sound: the game's *year-turn* sound. | F16 |
| 0:50.6 | **UI.** The board's letter with the specialization's four cards side by side. The cursor passes over each and chooses one (*Choose the research park*) just before the hit. | **Card 5** (0:50.8–0:53.9): CHOOSE WHAT IT'S KNOWN FOR. | F17 |

### IV — The decades
*T 0:54.2–1:10.15 · M 1:11.6–1:27.55 · the second entry, to the peak*

The three era captions are the chronicle's own era names (`chronicleData.ts`),
set small in the corner like the time-lapse's year caption, so they read
as the game captioning itself. They are not cards.

| T | Picture | On screen · sound | |
|---|---|---|---|
| **0:54.2** · the entry | **Bare.** One year in two seconds: a grown campus, wide, a frame a week. Green to gold, bare, snow, spring green. | Sound: wind as the snow comes. | F18 |
| 0:56.45 · the drop | Close. Game day: the stadium full, the crowd in the stands. | Caption: *The Championship Years* · Sound: the stadium's roar and the game's *cheer*. | F19 |
| 0:59.3 | **Bare.** The camera tilts from straight down (the plan) to the horizon over a year-45 campus: roofs, then façades, then the hills. | **Quote 2** (0:59.5–1:03.0): *"this feels like the football manager of universities"* — playtester | F20 |
| **1:03.2** · swell | **Bare.** The festival weeks downtown: bunting in the college's colours and a crowd on the pavements. | Caption: *The Festival Years* | F21 |
| 1:05.1 · the drop | Close. Snow on the Grand Quad, walkers crossing it. | Caption: *Into the Top Ten* | F22 |
| **1:07.85** · the big swell | **Bare.** The bookend. Year 50 in the fall, from the lowest tilt, the hills and the haze behind. Founders Hall sits where it stood in the first shot, now at the centre of everything. The view turns a quarter, smoothly, through the peak. | No text. | F23 |

### V — What it became
*T 1:10.15–1:16.55 · M 1:27.55–1:33.95 · the breath, then the finale*

| T | Picture | On screen · sound | |
|---|---|---|---|
| **1:10.15** · the breath | **UI.** A hard cut to the Final Report: *Year 50 · the fiftieth year closes*, *The Final Report*, and its sentence, cropped large: **"Halifax University: a college known first for what its laboratories find, with no glaring weakness."** Hold it. | The finale rises under it at 1:11.25. Use the sentence the recorded run actually writes, unedited (see F24). | F24 |

### End card
*T 1:16.55–1:27.4 · M 1:33.95–1:44.8 · the finale, faded*

| T | Picture | On screen · sound | |
|---|---|---|---|
| **1:16.55** · swell | **Bare.** The year-50 campus, wide, in the fall, barely drifting. | The logo (commissioned, not drawn by code). **FIFTY YEARS TO BUILD A UNIVERSITY.** (the game's own line, from the Credits). | F25 |
| 1:19.5 | Same. | **WISHLIST ON STEAM**, the platform, and the release window. Hold to the end. | F25 |
| 1:22.5 | Same. | Small, at the foot: *Music by Alejandro Tóth* · Halifax Games. | F25 |
| 1:23.0 → 1:27.4 | Same. | The music fades from the natural drop to silence, unless Alejandro writes an ending. | |

## The words on screen

The muted test: read only this column. It should still say *a college you
found, a campus that grows, people, a choice, fifty years, a legacy*.

| T | Text | Words | Seconds |
|---|---|---|---|
| 0:00.3 | Every university begins with one building. | 6 | 2.6 |
| 0:08.1 | The college is yours to build. *(optional)* | 6 | 2.2 |
| 0:10.6 | One college. Fifty years. | 4 | 2.0 |
| 0:26.35 | *Become Halifax University* (the letter's own button, cropped large) | 3 | 1.9 |
| 0:39.9 | Quote 1 and its attribution | 16 | 4.6 |
| 0:47.4 | Every summer, a new class. | 5 | 3.0 |
| 0:50.8 | Choose what it's known for. | 5 | 3.1 |
| 0:56.45 / 1:03.2 / 1:05.1 | Era captions (small) | 3 each | 1.9–2.85 |
| 0:59.5 | Quote 2 and its attribution | 8 | 3.5 |
| 1:10.15 | The Final Report's sentence (the report itself, cropped) | 17 | 6.4 |
| 1:16.55 | Fifty years to build a university. | 6 | 3.0 |
| 1:19.5 | Wishlist on Steam · platform · window | — | 7.9 |

Type: the game's display face for the cards, in white with a soft shadow,
the same family as the logo. No more than two lines per card. Check every
card at 360p in a phone-sized player.

## The player quotes

Two are in the cut, both from the playtest
([`findings.md`](../reviews/playtest-1/findings.md), where quotes are "trimmed,
not edited"). The research advises quotes sparingly before launch, exact,
with permission, and never in the first seconds. Hence two, in the middle,
labelled *playtester*. A version without them is a ten-minute change (drop
both cards) if the owner wants one for the store's first slot and the
quotes for social.

**In the cut**

| | Quote | Who, where | Before it goes out |
|---|---|---|---|
| Quote 1 | "I like seeing the different ways the university can develop and get its own unique culture." | F3, the feedback form (17 Oct), after a finished run and a second college | The form is anonymous. Check whether its wording allowed quoting; if not, and no email was left, swap in a public quote from the bank. The original says "it's"; "its" fixes the typo and changes nothing else. |
| Quote 2 | "this feels like the football manager of universities" | R8, Careless-Flower6059 on Reddit (9 Oct), a Football Manager fan | **It was a private chat message.** Ask them for permission, and how they'd like to be credited (handle or "playtester"). It names another publisher's game: fine as a player's words, but keep it as they wrote it. |

**The bank,** if either falls through

| Quote | Who, where | Note |
|---|---|---|
| "I think it's extremely well thought of and so fun." | R3, the same player as R8, a public comment on r/itchio | Public. Also: "The university idea fits the city building theme so well, and I love all the details." |
| "the most fun and detailed simulation/city building game I played in a long long time" | R8, the private chat | Needs the same permission as quote 2. |
| "I've been looking for exactly this type of game for a long time." | F2, the feedback form | Anonymous; F2 left an email, so permission can be asked. |
| "Wow, deeply impressed by this game" | I2, an itch.io rating (★★★★★) | Public. The same person as R1, I1 and R5: one voice, not four. |
| "It feels one of a kind." · "I'm getting addicted." | S1, We Playtest Games' tester | These come from an **AI-generated transcript** of the session video. Check the words against the video, and ask the service, before using either. |
| "This reminds me of games I used to play" | T1, on Twitch | From the owner's notes of the stream. Check against the recording. |

**Left out:** R9's message. They are the composer the owner was talking to
about the game's music, which the findings themselves flag. Quoting a
commissioned musician in a trailer scored with a commissioned theme is a
conflict of interest, whoever it is.

## The footage

### What exists

A rough animatic can be cut from these today, to lock the timing before
anything is recorded. None of them is good enough for the final cut.

| File | What it is | Why it won't do as it is |
|---|---|---|
| [`timelapse.webm`](../images/timelapse.webm) | 50 years, a frame a quarter | 720p, the seasons off (always summer green), the Completionist strip layout re-sited. The spine of F5, to be re-shot. |
| [`clip-building.webm`](../images/clip-building.webm) | A hall from footings to finished | 1080p, 3 s, summer. Re-shoot as F3. |
| [`clip-paths.webm`](../images/clip-paths.webm) | Two straight runs with the path tool | 1080p, 3 s, summer, no interface. Re-shoot as F2 and F8. |
| [`clip-walkers.webm`](../images/clip-walkers.webm) | The walkers on the Grand Quad | 1080p, 3 s, summer. Re-shoot as F14 in the fall. |
| [`summer-admissions.png`](../images/summer-admissions.png), [`store/itch/`](itch/) | The summer card, the four cards, the faculty, the Final Report | Stills, for the animatic only. The trailer wants these moving. |

### How to capture

- **One college in every shot:** Halifax, navy and gold, in the default
  Georgian architecture (the README's campus): `--name Halifax --colors
  navy-gold --vernacular georgian` on every `scenario` and `timelapse`.
  Seed 12345 with the Completionist, as the time-lapse already uses, so
  the map shots are one campus. This is the owner's choice to change, but
  it should be one choice for the whole trailer.
- **Size:** 3840×2160 (`--size=1920,1080 --scale=2`), 30 fps. The editor
  crops and pushes in, and delivers 1920×1080, the most Steam takes.
- **The fall by default:** weeks 10–16, the leaves turned and not yet down
  (`seasons.ts`). Shots about another season say so.
- **Handles:** record 6–8 seconds for every 2–5 used.
- **Interface shots:** text at its largest (`--settings='{"textScale":1.3}'`
  for stills; the Settings panel for a hand capture). A slow, deliberate
  cursor. Record at 4K so a crop to a button is still sharp.
- **The campus laid out:** run every scenario's save through `npm run
  layout`, as the README's pictures are, or the campus is a strip along
  one edge.
- **Steam's format:** H.264 MP4, AAC stereo, 30 fps, at 5,000 Kbps or more.
  The tools write WebM (VP9 or VP8), so convert with a full ffmpeg.

### What to record

*Tool* is the repository's own (`unischool/tools/README.md`); *by hand* means
a real browser session recorded with OBS at 4K. The gaps it names are under
[The tools](#the-tools).

| | Shot | Moment | Tool | Notes |
|---|---|---|---|---|
| F1 | Founders Hall picked up and placed, the build menu showing | A new game, week 1 | By hand | The first frame of the trailer. A clean lawn by the woodland; the ghost glides, then sets down. `clip.mjs` can't place a building yet (gap T2). |
| F2 | The first walk drawn from the hall's door, UI on | Year 1 | `clip.mjs --stroke` | As `clip-paths`, but with the path tool's interface showing, in year 1. |
| F3 | The first residence hall from footings to finished | Year 1 | `clip.mjs --until-built` | As `clip-building`, on the first residence, in the fall. |
| F4 | A pull-back from three buildings to the ring of land | Year 1 | By hand, or gap T1 | Tilt −2 for the haze. The zoom out must take 2–3 s. If the game's zoom steps snap, take two 4K plates and move between them in the edit. |
| F5 | The time-lapse, years 1–25, every frame in the fall | The whole run | `timelapse` and `timelapse:shoot --seasons` | With `--every 13`, one frame a year lands in the fall term. Keep those (check the caption reads *Fall term*) and blend between them, for a campus that grows without strobing white. `--size=1920,1080 --scale=2`, the caption on. The shooter has no `--tilt` yet, so it stays at the opening tilt (gap T4). |
| F6 | Walkers crossing a young quad, low | About year 8 | `clip.mjs --tilt=-3 --zoom=4` | A low, near angle, the trees turned. |
| F7 | The Campanile going up in its stages | When the run builds it | `clip.mjs --until-built` | Only the landmark the run chose can be built. Use whichever it is, and change the shot description to match. |
| F8 | One long straight walk across a new quad, UI on | About year 15 | `clip.mjs --stroke` | Shift held, one run, the path tool showing. |
| F9 | The charter letter, cursor on *Become Halifax University*, the click | The week it arrives | `npm run scenario -- charter`, then by hand | Text at its largest. Crop to the letter's last lines and the two answers. |
| F10 | The pennant reading *Halifax University* over Founders Hall | Just after F9 | By hand | The pennant is chrome, so this shot is not bare. A slow push-in. |
| F11 | Faculty: the grid, then one card, its quirk legible | About year 30 | By hand (`shoot.mjs --tab=faculty` for a still) | Choose a professor whose quirk reads well in one breath (a list is in `quirkData.ts`). |
| F12 | A brown line worn across a quad's lawn, walkers on it | About year 12 | `clip.mjs` | Desire lines appear where the busiest routes cross grass (`walkRoutes.ts`). Find a quad without a diagonal walk. |
| F13 | The same framing: a walk drawn over the line, walkers take it | Straight after F12 | `clip.mjs --stroke` | Same save, same `--focus`, `--zoom` and `--pan` as F12. |
| F14 | The Grand Quad in the fall, the fountain, the walkers | Year 51 | `clip.mjs --focus=QUAD-T2 --zoom=4` | `clip-walkers` re-shot in week 12, 8 s. |
| F15 | Commencement: a banner on every lamp | Weeks 51–52 | `clip.mjs` | Every lamp carries the college's colours in commencement week (`mapOccasions.ts`). Lamps must be placed along the walks first. |
| F16 | The summer: tuition set, the pool counting up, the class admitted | Any summer | `npm run scenario -- summer`, then by hand | As `summer-admissions.png`, but recorded. Wait for the figures to finish counting before cutting away. |
| F17 | The four cards, the cursor over each, the choice | About year 21–30 | `npm run scenario -- specialization`, then by hand | Choose the specialization the hero run (F23, F24) chose, so the report's sentence agrees with the card. |
| F18 | One year at a frame a week: green, gold, bare, snow, spring | About year 30 | `clip.mjs --step=5000 --seconds=2` | At `--step=5000` each frame is a week of game time. Wide, tilt −2. Stops are answered automatically, so the summer won't stall it. |
| F19 | The stadium full on a game day | A home game: week 8, 20 or 32 | `clip.mjs` on a save stopped in that week | The stands fill only in the season's three dated home games (`OCCASIONS` in `athletics/season.ts`): the opener in week 8, the rivalry in week 20 and homecoming in week 32. The opener has the leaves starting to turn. |
| F20 | A tilt from the plan to the horizon | About year 45 | By hand, or gap T1 | `Z`/`X` step through the ten tilts. If they snap, cut between 4K plates at each step or add easing. |
| F21 | The festival downtown: bunting, crowds on the pavements | A festival week | `npm run scenario -- downtown`, then `clip.mjs` | Answer the festival letter so the festival runs. The downtown's windows are lit only in the snow weeks; the bunting is the shot. |
| F22 | Snow on the Grand Quad, walkers crossing | Week 26 | `clip.mjs --focus=QUAD-T2` | The deepest snow is at the turn of the terms. |
| F23 | The bookend: year 50, the lowest tilt, a quarter turn | Year 50, week 12 | By hand, or gap T1 | Frame Founders Hall where F1 left it. The canvas map turns smoothly (Plan 83), so press `Q` once mid-take. |
| F24 | The Final Report: the eyebrow, the title, the sentence | The fiftieth summer | `npm run scenario -- final-report`, then by hand | Use the sentence the run writes, unedited. If it names a weakness ("…that never fielded a team anyone feared"), that may be the better line. Choose the run for its sentence. |
| F25 | The end card's plate: year 50, wide, the fall, barely moving | Year 50 | `shoot.mjs --bare --tilt=-2`, or `clip.mjs` | 12 s. Leave sky at the top for the logo. |

**Sound.** The game's own sound bed, recorded clean at 48 kHz from the
listening bench in the debug panel (`?debug=1`, `AudioBench.tsx`):
- **Ambience:** the four presets, *Summer* (birds), *Term* (the crowd's
  murmur), *Winter* (wind) and *Game day* (the roar), 60 seconds each.
- **Effects:** *place*, *complete*, *letter*, *yearTurn* and *cheer*, each
  fired alone.

The music leads throughout. Ambience comes up only in the cold open and
after the drop at 0:26.35, where the music is quietest; the effects stay
sparse.

### The tools

Four small gaps, in the order they matter:

- **T1 · A moving camera in `clip.mjs`.** Today the camera stands still for
  a clip. A flag that presses the map's keys at set page times (`Q`/`E` to
  turn, `Z`/`X` to tilt, `+`/`−` to zoom; for example
  `--keys=1500:Q,4000:X`) would record F4, F20 and F23 with the same even
  frame rate as every other clip. Check first which of the moves the
  canvas map already eases.
- **T2 · Placing a building in a clip.** `--place=<id>@dx,dy` for F1, or F1
  stays a hand capture.
- **T3 · A photo mode for hand capture.** The `--bare` stylesheet behind a
  URL flag or a hotkey, so a hand-recorded session can hide the chrome.
- **T4 · Optional: a start week and a tilt for the time-lapse.** F5 works
  without them, by keeping the fall-term frames at the opening tilt. With
  them, `--every 52 --start-week 12` would write only the frames the
  trailer uses, and `--tilt=-2` on `timelapseShoot.mjs` would put the hills
  and the haze in every frame.

## Cut-downs

- **0:30, for social and the store's second slot.** T 0:00–0:26.35 as it
  stands, then on the drop a hard cut to the Final Report (F24) and the end
  card, over music 1:28.65–1:33.9 with a fade. The cold open, the growth,
  and what it became.
- **A 6-second loop** for posts and the page: F3 (a hall going up) or F18
  (a year turning). Both loop cleanly.

## Decisions for the owner

1. **The college's look:** Halifax, navy and gold, Georgian, as proposed, or
   another single choice for every shot.
2. **The quotes:** permission from R8's player for quote 2, and a check of
   the form's wording for quote 1, or swaps from the bank.
3. **The end card:** the release window to promise, and the commissioned
   logo. The store page doesn't go up without the logo, and neither does
   this trailer.
4. **The specialization shown:** whichever the recorded run takes. F17 and
   F24 must agree.

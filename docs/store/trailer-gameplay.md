# The gameplay trailer: the game, with no words added

**Status:** a script for the owner to shoot and cut from. It sits beside
[`trailer.md`](trailer.md), the captioned cut, and does not replace it.
This cut adds no words. It has no captions, no title cards, no quotes, and no
year-and-term stamp in the corner. Everything on screen comes from the game.
The game's own interface is part of the game, so a panel's words are fine
when the shot is about that panel. The cut never adds a word of its own.

The rules for the cut:
- **Show; don't tell.** Each shot shows one thing a player does or sees, long
  enough to read without a caption. When a shot needs words to make sense,
  swap it for a shot that doesn't.
- **Every shot is the game itself.** It is either a clip from the tools or a
  screen recording of real play from a scenario save. Nothing is mocked up.
  No shot shows the title screen's painting, an AI-generated stand-in
  ([`ai-disclosure.md`](ai-disclosure.md)).
- **No overlays at all.** Shoot the time-lapse with `--no-caption`. The shooter
  writes the year and term in the corner unless told not to.
- **The music** is Alejandro Tóth's title theme
  (`unischool/src/assets/title-theme.mp3`, 1:45). Cut the shots to its
  phrases, not to the seconds below. The seconds are a guide.
- **The game's own sounds stay in** under the music: the founding's `place`
  and `complete`, the Final Report's grade ticks and its fanfare. They tell
  the viewer it is a game being played, not a painting.
- **One college throughout:** Halifax, navy and gold, seed 12345, so the
  campus in the time-lapse is the campus in the close-ups.

Steam wants an MP4 (H.264) at 1920×1080 or more. Every shot below is taken at
1920×1080.

## The cut

About 75 seconds, in three movements: it starts, it runs, it grows.

| # | Seconds | Shot | Source |
|---|---|---|---|
| | | **I. It starts** | |
| 1 | 0:00–0:05 (5) | The empty parcel in the woods. The cursor picks a spot and Founders Hall goes up in its construction stages: footings, the hatched shell in scaffolding, the hall. Cut on the `complete` sound, before the letter opens. | Recorded: a new game |
| 2 | 0:05–0:09 (4) | Close on Founders Hall in week one. The first students walk out of its doors onto the grass. | Clip |
| 3 | 0:09–0:13 (4) | A path drawn with the path tool, two straight runs to the dining hall. | Clip |
| 4 | 0:13–0:16 (3) | A residence hall from footings to finished, its 34 weeks in two seconds, then one second standing. | Clip |
| | | **II. It runs** | |
| 5 | 0:16–0:23 (7) | Admissions day. The applicants rain into the cloud, the admit line is dragged across it, and the admitted pour into the halls. | Recorded: the summer scenario |
| 6 | 0:23–0:27 (4) | The Faculty tab: a slow scroll down the professors' cards, faces first. | Recorded: the year-50 save |
| 7 | 0:27–0:31 (4) | Something goes wrong, shown on the map: a line of students waiting outside the dining hall, and a program's dot gone dark with a dashed red ring. | Clip: the crisis scenario |
| 8 | 0:31–0:35 (4) | The board's offer: the four specialization cards side by side. The cursor moves across them and stops on one. | Recorded: the specialization scenario |
| 9 | 0:35–0:41 (6) | What the choice grows into, three quick cuts of two seconds each: the research park at work, the downtown's first shopfronts, the athletic complex. | Clips: three scenarios |
| 10 | 0:41–0:47 (6) | Game day. The football stadium's arches and tower, packed stands drawn as people, the crowd outside, title pennants all round the rim. | Recorded: the year-50 save |
| 11 | 0:47–0:52 (5) | The last year on the map with the seasons on. The leaves turn, the snow comes and goes. | Time-lapse, seasonal |
| | | **III. It grows** | |
| 12 | 0:52–1:04 (12) | Fifty years of one campus, from one hall in the woods to a university. The camera holds still. This is the music's peak. | Time-lapse |
| 13 | 1:04–1:11 (7) | The Final Report over the finished campus. The six grades stamp in one by one, and the final grade lands with its gold halo and the fanfare. | Recorded: the final-report scenario |
| 14 | 1:11–1:15 (4) | The report gone, the year-50 campus held wide with its walkers moving. Then cut to black on the music's last note. | Clip |

The trailer ends on the campus, not on a card. The store page puts the
game's name and its buttons beside the video. If the owner wants the name
in the video too, the only place for it is the game's own drawing: the
stadium's cornice carries "Halifax Stadium" in shot 10. Nothing is written
over the picture.

### Why this order

- **The first five seconds are an action**, not a view. A cursor places
  a building and the building goes up. That is the plain promise said without
  words: you build this.
- **Shots 2 to 4 are small and close.** Students, paths and a hall going up
  show a viewer the scale of one move before the trailer shows fifty years of
  them.
- **Shots 5 to 10 are the running,** one system each: who gets in, who
  teaches, what goes wrong, what the college becomes, what it wins. Each one
  shows a thing happening, not a panel at rest.
- **The time-lapse comes late** so it lands as a payoff. The viewer has seen
  one hall go up and now sees two hundred quarters of them. The captioned cut
  opens with it. This cut earns it.
- **The Final Report closes the loop.** It is the only shot with many words,
  and the grades and the halo read without them.

## Where each shot comes from

Run these from `unischool/`, with the dev server up in another shell
(`npm run dev`). The tools find Chromium as
[`tools/README.md`](../../unischool/tools/README.md) says, or at
`CHROME_PATH`. Saves go to `node_modules/.tmp/`. Every save is one seeded
run (seed 12345), so the same commands give the same pictures.

### The saves

Build these once. Shots 2 to 4 and 11 to 12 also use the time-lapse's
frames (below).

```sh
npm run scenario -- --player Completionist --year 50 --build-all --clear-modal \
  --name Halifax --colors navy-gold node_modules/.tmp/in.json
npm run layout -- node_modules/.tmp/in.json node_modules/.tmp/out.json
npm run scenario -- summer --name Halifax --colors navy-gold node_modules/.tmp/summer.json
npm run scenario -- crisis --name Halifax --colors navy-gold node_modules/.tmp/crisis.json
npm run scenario -- specialization --name Halifax --colors navy-gold node_modules/.tmp/spec.json
npm run scenario -- research-park --name Halifax --colors navy-gold node_modules/.tmp/park.json
npm run scenario -- downtown-early --name Halifax --colors navy-gold node_modules/.tmp/downtown.json
npm run scenario -- athletics-complex --name Halifax --colors navy-gold node_modules/.tmp/complex.json
npm run scenario -- final-report --name Halifax --colors navy-gold node_modules/.tmp/final.json
```

### Recorded shots (1, 5, 6, 8, 10, 13)

These shots are the interface moving: a placement, a drag, a scroll, a
staged reveal. The tools take stills of the interface, not video, so these
are screen recordings of real play.

- **The window:** a browser at 1920×1080, the game in full screen, recorded
  at 60 fps (OBS or any recorder). Record the game's sound on its own track.
- **Loading a save:** open the dev server with `?debug=1`, use the debug
  panel's **Load** with the save above, then reload with `?debug=0`. The save
  stays in the browser, and the panel is gone from the picture.
- **The cursor:** move it slowly and on purpose, as in a demo. Leave it
  still when it isn't doing anything. Hide it in the edit for shot 10.
- **Take several passes** and keep the cleanest.

| # | Save | What to play |
|---|---|---|
| 1 | none: a new game | Found Halifax in navy and gold. Hold on the empty parcel for a second, then place Founders Hall. The hall takes 900 ms to stand. Cut on `complete`, before the panels open. |
| 5 | `summer.json` | *Open the summer*, *Continue*, set the price, *Lock the price*. Let the rain fall without clicking: a click skips it (Plan 124 I). Drag the admit line across the cloud and let the pour play out. Use the rain, the line and the pour. Cut the price screen. |
| 6 | `out.json` | Open the Faculty tab and scroll slowly from the top. |
| 8 | `spec.json` | *Convene the board →*. Move across the four cards and rest on one. Cut before the choice is confirmed. |
| 10 | `out.json` | Close and low on the football stadium. Play at real speed until the stands pack (two to four weeks a year; a crowd builds over a few weeks before it does), then record the stands full, the crowd outside, and the pennants. If this campus has no title pennants, use `complex.json` played on to the year after a title. |
| 13 | `final.json` | *Open the Final Report*. Don't click until the final grade has landed and the fanfare has played. |

Check the report before cutting it in. This seed's report reads a B overall
with an F for financial strength. A bad grade on screen in the trailer's
closing shot is a choice. Another seed (`--seed N` on the scenario) gives
another report.

### Clips (2, 3, 4, 7, 9, 14)

`clip.mjs` records the live map with the interface hidden, at an even 30
fps. The three under `docs/images` are shots 2 to 4's models, at
1920×1080:

```sh
# 2. Founders Hall in week one (the time-lapse's first frame).
npm run clip -- node_modules/.tmp/timelapse/frame-0000.json node_modules/.tmp/trailer/2-founders.webm \
  --focus=BLDG-GENSTUDIES --zoom=4 --seconds=4 --no-seasons --scale=1.5
# 3. Two straight runs drawn with the path tool, year 3.
npm run clip -- node_modules/.tmp/timelapse/frame-0012.json node_modules/.tmp/trailer/3-paths.webm \
  --focus=DINING-01 --zoom=3 --no-seasons --stroke=130,100:430,-50 --stroke=430,-50:190,-170 --scale=1.5
# 4. A hall from footings to finished.
npm run clip -- node_modules/.tmp/timelapse/frame-0046.json node_modules/.tmp/trailer/4-building.webm \
  --focus=HALL-06 --zoom=4 --until-built --no-seasons --scale=1.5
# 7. The queue at the dining hall, and the dark dots, in the crisis.
npm run clip -- node_modules/.tmp/crisis.json node_modules/.tmp/trailer/7-crisis.webm \
  --focus="Original Commons" --zoom=4 --seconds=4 --scale=1.5
# 9. The three specializations at work, two seconds each.
npm run clip -- node_modules/.tmp/park.json node_modules/.tmp/trailer/9a-park.webm \
  --focus="Research Park" --zoom=3 --seconds=2 --scale=1.5
npm run clip -- node_modules/.tmp/downtown.json node_modules/.tmp/trailer/9b-downtown.webm \
  --zoom=3 --seconds=2 --scale=1.5
npm run clip -- node_modules/.tmp/complex.json node_modules/.tmp/trailer/9c-complex.webm \
  --focus="Performance Complex" --zoom=3 --seconds=2 --scale=1.5
# 14. The finished campus, wide, walkers moving.
npm run clip -- node_modules/.tmp/out.json node_modules/.tmp/trailer/14-wide.webm \
  --zoom=1 --seconds=5 --scale=1.5
```

Shot 2 waits on the time-lapse's frames (below). In shot 7, the dark dot is
on whichever hall's program lost its teacher. If it isn't in the frame, move
the camera with `--focus` to that hall, or cut the queue and the dot as two
shots of two seconds each. `--focus` takes a building's id or part of its
name (Founders Hall's id is `BLDG-GENSTUDIES`). A name that matches nothing
in the save stops the tool with an error. Check each clip's first frame. Shot 9b has no `--focus`:
the downtown sits off the campus. Use `--pan` to find it, as
`tools/README.md` describes.

### The time-lapse (11, 12)

The same runs as the captioned cut's shots 2 and 3, shot **without the year
caption**:

```sh
npm run timelapse -- --name Halifax --colors navy-gold --out node_modules/.tmp/timelapse
npm run timelapse:shoot -- node_modules/.tmp/timelapse --fps=8 --png --no-caption
NODE_OPTIONS=--max-old-space-size=9000 npm run timelapse -- --name Halifax \
  --colors navy-gold --every 2 --out node_modules/.tmp/timelapse-seasons
npm run timelapse:shoot -- node_modules/.tmp/timelapse-seasons --seasons \
  --from=1275 --to=1300 --fps=4 --png --jobs=2 --no-caption
```

Shot 12 is 200 frames at 8 fps, 25 seconds. Play it at double speed for 12.
Shot 11 is year 50's frames, 1275 to 1300, 6.5 seconds at 4 fps. Cut it
to 5. The shooter writes WebM (VP8). Convert for the editor and for Steam:

```sh
ffmpeg -i node_modules/.tmp/timelapse/timelapse.webm -c:v libx264 -pix_fmt yuv420p -crf 18 node_modules/.tmp/timelapse/timelapse.mp4
```

## What waits

- **The shoot and the cut** are the owner's, from this script, beside the
  captioned cut (Plan 117's O9).
- **Shot 1's opening** depends on Plan 124 H as revised on 3 November: the
  hall goes up in its stages. If the founding changes again, re-record it.
- **Steam takes the Next Fest trailers by 3 May 2027.** Steam lets a page
  carry more than one trailer, so this cut and the captioned one can run
  side by side. Put this one first if it tests better.

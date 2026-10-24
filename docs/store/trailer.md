# The trailer — the cut list

**Status:** a cut list for the owner to edit and cut from (Plan 117 PR E,
the third review's C6-8). The trailer on the itch.io page today is a cut
on Vimeo ("UniSchool - Free Playtest on Itch.io"). It has no source in
the repository, and the owner found its copy "too cryptic" for people
seeing the game for the first time. This file is the source for the next
cut, so that cut is an edit of this list, not a redo.

The rules for the cut:
- **The opening says the plain promise.** Most people watch the first
  seconds of a trailer before they read a word of the page.
- **Captions state what the game does.** No riddles and no clever turns.
  They follow the plain-words rules of the
  [text review](../reviews/2026-10-text-review.md), like the
  [Steam copy](steam-page.md).
- **Every shot is the game itself,** taken with the tools below. Nothing
  is mocked up, and no shot shows the title screen's painting, which is
  an AI-generated stand-in ([`ai-disclosure.md`](ai-disclosure.md)).
- **The music** is Alejandro Tóth's title theme
  (`unischool/src/assets/title-theme.mp3`, 1:45), or the game's own music.
- **No player quotes on screen** for now. If one goes in later, it comes
  from [`quotes.md`](quotes.md)'s shortlist and is credited "a
  playtester".

Steam wants an MP4 (H.264) at 1920×1080 or more. Every shot below is
taken at 1920×1080.

## The cut

About 50 seconds.

| # | Seconds | Shot | Caption |
|---|---|---|---|
| 1 | 0:00–0:03 (3) | A card over the time-lapse's first frame: Founders Hall alone in the woods, year 1. | **Found a college. Run it for fifty years.** |
| 2 | 0:03–0:15 (12) | The time-lapse: fifty years of one campus, from one hall to a university. The camera holds still. | Build the campus, one hall at a time. |
| 3 | 0:15–0:21 (6) | The last year again, with the seasons on: the leaves turn, the snow comes and goes. | The seasons turn on the map. |
| 4 | 0:21–0:28 (7) | Admissions day: the cloud of applicants, the admit line across it, and the hall they fill. | Each summer, set the price. Then choose who gets in. |
| 5 | 0:28–0:34 (6) | The Faculty tab in year 51: the professors' cards, with faces, numbers and quirks. | Hire the professors. Each one is a person. |
| 6 | 0:34–0:40 (6) | The four specialization cards side by side. | Choose once. Your college keeps its specialization for good. |
| 7 | 0:40–0:46 (6) | The Final Report: the grade, the six standings and the name for what the college became. | Fifty years, graded. |
| 8 | 0:46–0:50 (4) | An end card over the time-lapse's last frame: the name and the mark. | **UniSchool.** Wishlist on Steam. |

Until the Steam page is up, card 8 gives the itch.io address instead
(`halifaxgames.itch.io/unischool`).

A shot that pans or zooms inside a still (shots 4–7) is the editor's
move. The tools write stills for those, at 1920×1080.

## Where each shot comes from

Run these from `unischool/`, with the dev server up in another shell
(`npm run dev`). The tools find Chromium as
[`tools/README.md`](../../unischool/tools/README.md) says, or at
`CHROME_PATH`. Every save is one seeded run (seed 12345), so the same
commands give the same pictures. Every college is Halifax, in navy and
gold. Each command was run once for this file, on 24 October 2026.

### Shots 1–3: the time-lapse

Shot 2 is the time-lapse that [`tools/README.md`](../../unischool/tools/README.md)
describes under *Fifty years in thirty seconds*: one frame a quarter for
fifty years, with the seasons off. At 8 frames a second it runs 25
seconds. Cut it to 12, or play it at double speed.

```sh
npm run timelapse -- --name Halifax --colors navy-gold --out node_modules/.tmp/timelapse
npm run timelapse:shoot -- node_modules/.tmp/timelapse --fps=8 --png
```

This writes `node_modules/.tmp/timelapse/timelapse.webm` and a PNG of each
frame in `shots/`. Shot 1's card goes over `shots/frame-0000.png`, and
card 8 over the last frame, `shots/frame-0200.png`. The shooter writes the
year and the term in the bottom-left corner. Keep it, and put the
trailer's captions elsewhere.

Shot 3 is the same run's last year, a frame every two weeks, with the
seasons kept (`--seasons`). One frame a quarter can't show the seasons:
a frame lands in the snow once a year and the picture flickers. The run
is the same seeded run as shot 2, so it ends on the same campus. Its
frames 1275 to 1300 are year 50, weeks 3 to 52. At 4 frames a second
they run 6.5 seconds.

```sh
NODE_OPTIONS=--max-old-space-size=9000 npm run timelapse -- --name Halifax \
  --colors navy-gold --every 2 --out node_modules/.tmp/timelapse-seasons
npm run timelapse:shoot -- node_modules/.tmp/timelapse-seasons --seasons \
  --from=1275 --to=1300 --fps=4 --png --jobs=2
```

`--every 1`, a frame every week, would be smoother, but the run keeps
every frame in memory until the end, and 2,600 frames ran out of memory.
`--every 2` keeps 1,301 frames and needs the larger memory limit above.
It takes several minutes and some 630 MB of disk.

The shooter writes WebM (VP8). For the editor or for Steam, convert with
a full ffmpeg:

```sh
ffmpeg -i node_modules/.tmp/timelapse/timelapse.webm -c:v libx264 -pix_fmt yuv420p -crf 18 node_modules/.tmp/timelapse/timelapse.mp4
```

### Shot 4: admissions day

The summer scenario holds a college at the summer of year 6. The summer
waits for the player now (Plan 112C, for 0.1.4), so the first click opens
it from its notice. The three presses only wait, while the page counts its figures
up.

```sh
npm run scenario -- summer --name Halifax --colors navy-gold node_modules/.tmp/summer.json
npm run shot -- node_modules/.tmp/summer.json node_modules/.tmp/trailer/4-admissions.png \
  --size=1920,1080 --click="Open the summer" --click="Continue" --click="Lock the price" \
  --press=".admissions-page-eyebrow" --press=".admissions-page-eyebrow" \
  --press=".admissions-page-eyebrow"
```

### Shot 5: the faculty

The year-50 campus that `docs/images/campus.png` is taken from (*A campus
laid out like a campus* in `tools/README.md`), with the Faculty tab open:

```sh
npm run scenario -- --player Completionist --year 50 --build-all --clear-modal \
  --name Halifax --colors navy-gold node_modules/.tmp/in.json
npm run layout -- node_modules/.tmp/in.json node_modules/.tmp/out.json
npm run shot -- node_modules/.tmp/out.json node_modules/.tmp/trailer/5-faculty.png \
  --tab=faculty --size=1920,1080
```

### Shot 6: choose once

The specialization scenario holds the board's offer, unanswered, in year
21. **Convene the board** opens the four cards.

```sh
npm run scenario -- specialization --name Halifax --colors navy-gold node_modules/.tmp/spec.json
npm run shot -- node_modules/.tmp/spec.json node_modules/.tmp/trailer/6-choose.png \
  --size=1920,1080 --click="Convene the board →"
```

### Shot 7: the Final Report

The final-report scenario holds the fiftieth summer. The click opens the
report from its notice, and the presses wait for it to settle.

```sh
npm run scenario -- final-report --name Halifax --colors navy-gold node_modules/.tmp/final.json
npm run shot -- node_modules/.tmp/final.json node_modules/.tmp/trailer/7-final.png \
  --size=1920,1080 --click="Open the Final Report" \
  --press=".final-report" --press=".final-report" --press=".final-report"
```

This seed's report reads a B overall, with an F for financial strength.
Look at the report before you cut it in. Another seed (`--seed N` on the
scenario) gives another report.

## What waits

- **The plainer cut** (the owner, O9 in Plan 117), from this list, in
  November–December.
- **The final trailer** goes on the Steam page by 3 May 2027, when Steam
  takes the trailers for Next Fest.
- **Card 8's words** change when the Steam page is live.

#!/usr/bin/env bash
# ---------------------------------------------------------------------
# THE TRAILER, REBUILT (docs/store/trailer.md): records every shot from the
# game with the repository's own tools, renders the words, cuts the music
# and composes the 30-second cut.
#
#   npm run dev                          # in one shell
#   tools/trailer/build.sh [out.mp4]     # from unischool/; about 25 minutes on four cores
#
# Needs python3 with Pillow, and an ffmpeg with libx264. Everything it
# records lands in node_modules/.tmp/trailer; nothing it writes ships.
# ---------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/../.."
T=node_modules/.tmp/trailer
OUT=${1:-$T/unischool-trailer-30s.mp4}
COLLEGE=(--name Halifax --colors navy-gold --vernacular georgian)
mkdir -p "$T"

# 1 · Fifty years, one frame a year in week 14 (the leaves turned): the
# Completionist's seeded run, every fourth frame of a quarterly time-lapse.
npm run --silent timelapse -- --player Completionist --years 50 --every 13 "${COLLEGE[@]}" --out "$T/tl"
rm -rf "$T/fall" && mkdir -p "$T/fall"
i=0
for n in $(seq 1 4 197); do
  cp "$T/tl/frame-$(printf %04d "$n").json" "$T/fall/frame-$(printf %04d "$i").json"
  i=$((i + 1))
done
node tools/timelapseShoot.mjs "$T/fall" --seasons --png --clean --jobs=4 --fps=20

# 2 · The pan's plates: year 50 (frame 197) in five architectures. The
# architecture is one field of the save, so the campus is the same in all
# five, and so is the framing.
for v in georgian gothic classical mission modern; do
  node -e "const f=require('fs');const d=JSON.parse(f.readFileSync('$T/tl/frame-0197.json'));d.state.self.vernacular='$v';f.writeFileSync('$T/pan-$v.json',JSON.stringify(d))"
done
mkdir -p "$T/plates"
printf '%s\n' georgian gothic classical mission modern | xargs -P 3 -I{} \
  node tools/clip.mjs "$T/pan-{}.json" "$T/plates/pan-{}.webm" \
    --focus=QUAD-T2 --zoom=4 --tilt=-2 --size=2880,1620 --seconds=3.5 --png --clean

# 3 · The gameplay clips. The stadium's save is set back to week 7, so the
# recording falls in week 8, the season's opener, when the stands fill.
node -e "const f=require('fs');const d=JSON.parse(f.readFileSync('$T/tl/frame-0197.json'));d.state.clock.week=7;f.writeFileSync('$T/stadium-w7.json',JSON.stringify(d))"
mkdir -p "$T/clips"
node tools/clip.mjs "$T/tl/frame-0033.json" "$T/clips/g2.webm" --focus=HALL-03 --zoom=4 --until-built --clean --size=1920,1080 --seconds=2.5 --png
node tools/clip.mjs "$T/tl/frame-0013.json" "$T/clips/g4.webm" --focus=DINING-01 --zoom=3 \
  --stroke=130,100:430,-50 --stroke=430,-50:190,-170 --clean --scale=1.5 --png
node tools/clip.mjs "$T/tl/frame-0115.json" "$T/clips/g8.webm" --focus=QUAD-T2 --zoom=1 --step=5000 --seconds=2.4 --clean --size=1920,1080 --png
node tools/clip.mjs "$T/stadium-w7.json" "$T/clips/g9.webm" --focus=ATH-STADIUM --zoom=4 --warmup=2000 --seconds=3 --clean --size=1920,1080 --scale=2 --png
node tools/clip.mjs "$T/pan-georgian.json" "$T/clips/e1.webm" --focus=QUAD-T2 --zoom=-1 --tilt=-2 --clean --size=1920,1080 --scale=2 --seconds=0.04 --png
node tools/trailer/founding.mjs "$T/g1"

# 4 · The screens, at 4K for the push-ins.
npm run --silent scenario -- summer "${COLLEGE[@]}" "$T/sc-summer.json"
npm run --silent scenario -- specialization "${COLLEGE[@]}" "$T/sc-specialization.json"
mkdir -p "$T/ui"
node tools/shoot.mjs "$T/pan-georgian.json" "$T/ui/faculty.png" --tab=faculty --size=1920,1080 --scale=2
node tools/shoot.mjs "$T/sc-specialization.json" "$T/ui/spec.png" --size=1920,1080 --scale=2
node tools/shoot.mjs "$T/sc-summer.json" "$T/ui/summer.png" --size=1920,1080 --scale=2 \
  --click="Continue" --click="Set tuition for the year"

# 5 · The words.
node tools/trailer/cards.mjs "$T/cards"

# 6 · The music: 1:04.1 to 1:34.1 of the title theme (the file's first
# sample is 25 ms in), the quiet opening lifted 5 dB until the second entry,
# faded from 27.4 s, then 2.4 dB up to about -14.5 LUFS with the peaks held
# at -1.5 dBTP.
ffmpeg -hide_banner -loglevel error -y -ss 64.125 -t 30 -i src/assets/title-theme.mp3 \
  -af "volume='if(lt(t,7.0),1.78,if(lt(t,7.37),1.78-0.78*(t-7.0)/0.37,1))':eval=frame,afade=t=in:st=0:d=0.25,afade=t=out:st=27.4:d=2.4,volume=2.4dB,alimiter=limit=0.84:level=disabled" \
  -ar 48000 -ac 2 -c:a pcm_s24le "$T/music.wav"

# 7 · The cut.
python3 tools/trailer/compose.py "$T" "$T/video.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$T/video.mp4" -i "$T/music.wav" -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"

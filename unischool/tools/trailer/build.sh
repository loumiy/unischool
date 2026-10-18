#!/usr/bin/env bash
# ---------------------------------------------------------------------
# THE TRAILER, REBUILT (docs/store/trailer.md): records every shot of the
# one-minute cut from the game with the repository's own tools, renders the
# words, cuts the music and composes the minute.
#
#   npm run dev                          # in one shell
#   tools/trailer/build.sh [out.mp4]     # from unischool/; about an hour on four cores
#
# Needs python3 with Pillow, and an ffmpeg with libx264. Everything it
# records lands in node_modules/.tmp/tr60; nothing it writes ships. The
# Tudor time-lapse (shot 11) is node_modules/.tmp/tudor.mp4, built by its
# own recipe (tools/README.md) when it is not there yet.
# ---------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/../.."
T=node_modules/.tmp/tr60
OUT=${1:-$T/unischool-trailer.mp4}
COLLEGE=(--name Halifax --vernacular georgian)
mkdir -p "$T"

# 1 · The pan's plates (shots 12-21) and the end card's: year 50 of
# the Completionist's seeded run, in the fall (frame 197 of a quarterly
# time-lapse), with flower beds round Founders Hall wherever its paving
# leaves open ground, the doors left clear. The architecture is one field
# of the save, so the campus is the same in all six, and so is the framing.
npm run --silent timelapse -- --player Completionist --years 50 --every 13 "${COLLEGE[@]}" --colors navy-gold --out "$T/tl"
python3 - "$T" <<'PY'
import copy, json, sys
T = sys.argv[1]
d = json.load(open(f'{T}/tl/frame-0197.json'))
s = d['state']
p = s['placements']['BLDG-GENSTUDIES']
r0, c0, w, h = p['row'], p['col'], p['w'], p['h']
doors = {(r0 + h, c0 + w // 2), (r0 - 1, c0 + w // 2), (r0 + h // 2, c0 + w), (r0 + h // 2, c0 - 1)}
taken = {(r, c) for q in s['placements'].values() for r in range(q['row'], q['row'] + q['h']) for c in range(q['col'], q['col'] + q['w'])}
ring = [(r0 - 1, c) for c in range(c0 - 1, c0 + w + 1)] + [(r0 + h, c) for c in range(c0 - 1, c0 + w + 1)]
ring += [(r, c0 - 1) for r in range(r0, r0 + h)] + [(r, c0 + w) for r in range(r0, r0 + h)]
s['dressing'] = dict(s.get('dressing') or {})
for r, c in ring:
    k = f'{r},{c}'
    if (r, c) not in doors and (r, c) not in taken and k not in (s.get('pathways') or {}) and k not in s['dressing']:
        s['dressing'][k] = 'flowerbed'
        (s.get('trees') or {}).pop(k, None)
for v in ['georgian', 'gothic', 'classical', 'mission', 'modern', 'artDeco']:
    e = copy.deepcopy(d)
    e['state']['self']['vernacular'] = v
    json.dump(e, open(f'{T}/pan-{v}.json', 'w'))
PY
mkdir -p "$T/plates" "$T/clips"
printf '%s\n' georgian gothic classical mission modern artDeco | xargs -P 3 -I{} \
  node tools/clip.mjs "$T/pan-{}.json" "$T/plates/pan-{}.webm" \
    --focus=QUAD-T2 --zoom=4 --tilt=-2 --size=2880,1620 --seconds=5 --png --clean
node tools/clip.mjs "$T/pan-georgian.json" "$T/clips/e1.webm" --focus=QUAD-T2 --zoom=-1 --tilt=-2 --clean \
  --size=1920,1080 --scale=2 --seconds=0.04 --png

# 2 · The name and Act 2 (shots 1-5): one new game, named, founded and laid
# out on camera, then Meadow House rising beside the hall, Always summer.
node tools/trailer/act2.mjs "$T/act2"
node tools/clip.mjs "$T/act2/meadow.json" "$T/clips/meadow.webm" --focus=DORM-01 --zoom=4 --pan=0,150 --until-built --no-seasons \
  --clean --size=1920,1080 --scale=2 --seconds=2.4 --png

# 3 · The screens (shots 6-9), each in its own school colours, at 4K for
# the push-ins. The curriculum is year 11, its committee writing four
# courses; the summer is year 12's, the pool up 37% with every figure that
# moved up, the price dragged and set by hand (screens.mjs summer).
npm run --silent scenario -- --player Guided --year 10 --clear-modal "${COLLEGE[@]}" --colors navy-orange "$T/sc-curriculum.json"
npm run --silent scenario -- --player Guided --year 13 --from-year 12 --modal summer "${COLLEGE[@]}" --colors maroon-gold "$T/sc-summer.json"
npm run --silent scenario -- specialization "${COLLEGE[@]}" --colors crimson-silver "$T/sc-specialization.json"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); d['state']['self']['colors']={'primary':'#1f1b17','secondary':'#e6b84a'}; json.dump(d,open(sys.argv[2],'w'))" \
  "$T/pan-georgian.json" "$T/faculty-black.json"
mkdir -p "$T/ui"
node tools/shoot.mjs "$T/sc-curriculum.json" "$T/ui/curriculum.png" --tab=curriculum --size=1920,1080 --scale=2
node tools/shoot.mjs "$T/faculty-black.json" "$T/ui/faculty.png" --tab=faculty --size=1920,1080 --scale=2
node tools/trailer/screens.mjs summer "$T/sc-summer.json" "$T/summer"
node tools/trailer/screens.mjs choice "$T/sc-specialization.json" "$T/choice"

# 4 · Forty years (shot 11): the Tudor time-lapse, year 1 to the end of
# year 40 (its frames 0-482).
if [ ! -f node_modules/.tmp/tudor.mp4 ]; then
  npx rolldown tools/trailer/tudorTimelapse.ts -o node_modules/.tmp/tudor.mjs -f esm -p node
  node node_modules/.tmp/tudor.mjs --out node_modules/.tmp/tudor
  node tools/timelapseShoot.mjs node_modules/.tmp/tudor --from=216 --clean --positions --no-caption --zoom=-2 --pan=-230,140
  cp node_modules/.tmp/tudor/shots/frame-0216.positions.json node_modules/.tmp/tudor-full.json
  python3 tools/trailer/tudor_camera.py node_modules/.tmp/tudor node_modules/.tmp/tudor-full.json node_modules/.tmp/tudor-camera
  node tools/timelapseShoot.mjs node_modules/.tmp/tudor --clean --png --positions --no-caption --scale=2 \
    --views=node_modules/.tmp/tudor-camera/views.json --fps=10
  node tools/trailer/captions.mjs node_modules/.tmp/tudor node_modules/.tmp/tudor-captions
  python3 tools/trailer/tudor_compose.py node_modules/.tmp/tudor node_modules/.tmp/tudor/shots \
    node_modules/.tmp/tudor-camera/camera.json node_modules/.tmp/tudor-captions src/assets/title-theme.mp3 node_modules/.tmp/tudor.mp4
fi
rm -rf "$T/tl" && mkdir -p "$T/tl"
ffmpeg -hide_banner -loglevel error -i node_modules/.tmp/tudor.mp4 -vf "select='between(n\,0\,482)'" -vsync 0 -start_number 0 "$T/tl/%04d.png"

# 5 · The stadium (shot 10): the Tudor frames it is raised and grown in
# (104-150), shot close on it with one view, Always summer.
python3 - "$T" <<'PY'
import json, sys
T = sys.argv[1]
p = json.load(open('node_modules/.tmp/tudor/frame-0150.json'))['state']['placements']['ATH-STADIUM']
cm, rm = p['col'] + p['w'] / 2, p['row'] + p['h'] / 2
zoom = 0.62 * 1920 / ((p['w'] + p['h']) * 32)
cx, cy = 32 * (cm - rm), 16 * (cm + rm) - 40                 # the stands rise above the footprint
json.dump([{'zoom': zoom, 'x': 960 - cx * zoom, 'y': 540 - cy * zoom}] * 217, open(f'{T}/stadium-views.json', 'w'))
PY
rm -rf "$T/stadium" && mkdir -p "$T/stadium"
for k in $(seq 104 150); do ln -s "$(realpath "node_modules/.tmp/tudor/frame-$(printf %04d "$k").json")" "$T/stadium/"; done
node tools/timelapseShoot.mjs "$T/stadium" --clean --png --positions --no-caption --jobs=2 \
  --views="$T/stadium-views.json" --size=1920,1080 --scale=2 --fps=10

# 6 · The words.
node tools/trailer/cards.mjs "$T/cards"

# 7 · The music: three pieces of the title theme (music time 0:07.36-0:30.9,
# 0:39.6-0:47.1 and 1:04.5-1:33.9; the file's first sample is 25 ms in),
# joined on 60 ms crossfades where their harmony matches, the quiet opening
# lifted 6 dB until the first entry, faded from 0:58.04, then 1.9 dB up to
# about -14.5 LUFS with the peaks held at -1.5 dBFS.
ffmpeg -hide_banner -loglevel error -y -i src/assets/title-theme.mp3 -filter_complex \
  "[0:a]atrim=7.385:30.955,asetpts=N/SR/TB[a];[0:a]atrim=39.595:47.155,asetpts=N/SR/TB[b];[0:a]atrim=64.495:93.925,asetpts=N/SR/TB[c];[a][b]acrossfade=d=0.06:c1=qsin:c2=qsin[ab];[ab][c]acrossfade=d=0.06:c1=qsin:c2=qsin[abc];[abc]volume='if(lt(t,2.9),2.0,if(lt(t,3.09),2.0-(t-2.9)/0.19,1))':eval=frame,afade=t=in:st=0:d=0.25,afade=t=out:st=58.04:d=2.4,volume=1.9dB,alimiter=limit=0.84:level=disabled" \
  -ar 48000 -ac 2 -c:a pcm_s24le "$T/music.wav"

# 8 · The cut.
python3 tools/trailer/compose.py "$T" "$T/video.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$T/video.mp4" -i "$T/music.wav" -map 0:v -map 1:a \
  -c:v copy -af apad -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$OUT"   # the music ends 0.06 s early: silence
echo "wrote $OUT"

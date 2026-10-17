# THE TUDOR TIME-LAPSE, CUT (docs/store/trailer.md, shot 14): the frames
# tools/timelapseShoot.mjs shot from tools/trailer/tudorTimelapse.ts, each
# at its own view (--views, planned by tools/trailer/tudor_camera.py), each
# dissolving into the next at 30 fps under the camera that camera.json
# holds: from the map's closest zoom on Founders Hall out to the whole
# campus by year 50. Then the finished plan, held. The year captions
# (tools/trailer/captions.mjs) are laid on after the move, so they never
# scale or crop. Cut to the title theme from 0:04.65, so the coda (the
# Triumphal Gate rising) plays over the first statement's peak and the
# finished plan lands on the hard drop at 0:26.35.
#
#   python3 tools/trailer/tudor_compose.py <frames dir> <shots dir> <camera.json> <captions dir> <music.mp3> <out.mp4>
#
# Needs Pillow. Each shot's positions.json holds the view it was shot at,
# as the map set it (a world point p at p * zoom + (x, y), in CSS px); a
# frame of the cut takes from each shot the part of the world its own view
# shows. The game drew each shot at about the zoom it is shown at, so its
# lines are the weight the game gives them there.
import json, subprocess, sys
from pathlib import Path
from PIL import Image

frames_dir, shots, camera = Path(sys.argv[1]), Path(sys.argv[2]), json.loads(Path(sys.argv[3]).read_text())
captions, music, out = Path(sys.argv[4]), sys.argv[5], sys.argv[6]
(W, H), FPS, PER, HOLD = camera['size'], camera['fps'], camera['per'], camera['hold']
frames = camera['frames']

fs = sorted(shots.glob('frame-*.png'))
N = len(fs)
pos = [json.loads(p.with_suffix('.positions.json').read_text()) for p in fs]
clocks = [json.loads((frames_dir / f'{p.stem}.json').read_text())['state']['clock'] for p in fs]
n = len(frames)
assert n == N * PER + HOLD, f'camera.json is for {(n - HOLD) // PER} shots, not {N}'
seconds = n / FPS
MUSIC_FROM = 26.35 - N * PER / FPS          # the finished plan on the hard drop

# This stretch of the theme is at the trailer's loudness (-14.5 LUFS) as it
# stands, so no gain: the limiter only guards the peaks.
enc = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-ss', f'{MUSIC_FROM + 0.025:.3f}', '-t', f'{seconds:.3f}', '-i', music,
    '-af', f'afade=t=in:st=0:d=0.3,afade=t=out:st={seconds - 1.6:.3f}:d=1.6,alimiter=limit=0.84:level=disabled',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)

cache = {}
def shot(k):
    if k not in cache:
        if len(cache) > 2:
            cache.pop(next(iter(cache)))
        cache[k] = Image.open(fs[k]).convert('RGB')
    return cache[k]

def seen(k, v):
    # Shot k, showing what the view v shows. The map sets a view's offset on
    # a device pixel, so a shot may fall short of the edge by a fraction of
    # one; short by more, it is a retake.
    s, d, im = pos[k]['view'], pos[k]['scale'], shot(k)
    corners = [((0 - v['x']) / v['zoom'], (0 - v['y']) / v['zoom']), ((W - v['x']) / v['zoom'], (H - v['y']) / v['zoom'])]
    (x0, y0), (x1, y1) = [((wx * s['zoom'] + s['x']) * d, (wy * s['zoom'] + s['y']) * d) for wx, wy in corners]
    if x0 < -2 or y0 < -2 or x1 > im.width + 2 or y1 > im.height + 2:
        sys.exit(f'{fs[k].name} does not hold the view the cut needs of it: shoot it again from views.json')
    dx = max(0 - x0, 0) - max(x1 - im.width, 0)
    dy = max(0 - y0, 0) - max(y1 - im.height, 0)
    return im.resize((W, H), Image.BICUBIC, box=(x0 + dx, y0 + dy, x1 + dx, y1 + dy))

overlays = {}
def caption(k):
    c = clocks[min(k, N - 1)]
    key = f"year-{c['year']}-{'fall' if c['week'] <= 26 else 'spring'}"
    if key not in overlays:
        overlays[key] = Image.open(captions / f'{key}.png').convert('RGBA')
    return overlays[key]

for i, v in enumerate(frames):
    p = min(i / PER, N - 1)
    a = int(p)
    k = p - a
    fr = seen(a, v)
    if k > 0.001 and a + 1 < N:
        fr = Image.blend(fr, seen(a + 1, v), k)
    fr = Image.alpha_composite(fr.convert('RGBA'), caption(round(p))).convert('RGB')
    if i >= n - 12:                                          # the last moment to black
        fr = Image.blend(fr, Image.new('RGB', (W, H)), (i - (n - 12)) / 11)
    enc.stdin.write(fr.tobytes())
    if i % 90 == 0:
        print(f'frame {i}/{n}, zoom {v["zoom"]:.3f}', flush=True)
enc.stdin.close()
enc.wait()
print(f'wrote {out}: {N} shots, {seconds:.1f} s, music from {MUSIC_FROM:.2f} s')

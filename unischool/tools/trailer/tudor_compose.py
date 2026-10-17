# THE TUDOR TIME-LAPSE, CUT (docs/store/trailer.md, shot 14): the frames
# tools/timelapseShoot.mjs shot from tools/trailer/tudorTimelapse.ts (with
# --no-caption --positions, at --scale=3), each dissolving into the next at
# 30 fps, under a camera that starts close on Founders Hall and pulls out
# as the campus spreads, until the whole campus is in view by year 50. Then
# the finished plan, held. The year captions (tools/trailer/captions.mjs)
# are laid on after the move, so they never scale or crop. Cut to the title
# theme from 0:04.65, so the coda (the Triumphal Gate rising) plays over the
# first statement's peak and the finished plan lands on the hard drop at
# 0:26.35.
#
#   python3 tools/trailer/tudor_compose.py <frames dir> <shots dir> <captions dir> <music.mp3> <out.mp4>
#
# Needs Pillow. Where each building stands on screen: the shots'
# --positions give their middles; the map's projection, fitted to those
# middles and the plan's tiles, gives each footprint's corners, so a large
# building (the stadium is 24 by 20 tiles) is framed whole.
#
# The camera, per shot, in the page's CSS px:
#   - close on Founders Hall, a third of the view wide (one source pixel to
#     one output pixel at --scale=3), through year 2;
#   - then pulling out: geometrically to MID of the view by year 20, and on
#     to the whole view by the run's last snapshot;
#   - never narrower than the campus's core (the nearest 60% of the
#     buildings standing, by distance from their median) and every building
#     going up, with a margin; only ever out (a running maximum), and
#     smoothed over the second before (trailing, so a building that breaks
#     ground at the edge is revealed as the camera catches up);
#   - and holding each athletic venue whole in view from just before its
#     first expansion to the end, so every upgrade is seen as it is built;
#   - kept inside the shot.
import json, math, subprocess, sys
from pathlib import Path
from statistics import median
from PIL import Image

frames_dir, shots, captions = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
music, out = sys.argv[4], sys.argv[5]
W, H, FPS, PER, HOLD = 1920, 1080, 30, 3, 60
MARGIN_X, MARGIN_Y, RISE, KEEP, TRAIL, SETTLE, PRE, MID = 50, 40, 60, 0.6, 10, 8, 8, 0.86

fs = sorted(shots.glob('frame-*.png'))
N = len(fs)
pos = [json.loads(p.with_suffix('.positions.json').read_text()) for p in fs]
view_w, view_h, scale = pos[-1]['width'], pos[-1]['height'], pos[-1]['scale']
states = [json.loads((frames_dir / f'{p.stem}.json').read_text())['state'] for p in fs]
clocks = [s['clock'] for s in states]
placed = [s['placements'] for s in states]
going_up = [{t['id'] for t in s['tech'] if t.get('status') == 'developing' and t['id'] in s['placements']} for s in states]
# A venue going up again once it stands: an expansion (EXPAND_VENUE).
expanding = [{t['id'] for t in s['tech'] if t.get('status') == 'developing' and (t.get('expansions') or 0) >= 1
              and t['id'] in s['placements']} for s in states]
del states
# The run's last snapshot (the coda after it carries its clock), the end
# of the hold, and the end of the first pull.
run_end = next(k for k, c in enumerate(clocks) if c == clocks[-1])
hold_end = max((k for k, c in enumerate(clocks) if c['year'] <= 2), default=0)
mid_at = next((k for k, c in enumerate(clocks) if c['year'] >= 20), max(run_end, hold_end + 1))

# The projection, x and y each a + b·col + c·row, fitted by least squares
# to the last shot's middles (the camera is the same in every shot).
def fit(rows, values):
    m = [[0.0] * 3 for _ in range(3)]
    v = [0.0] * 3
    for r, y in zip(rows, values):
        for i in range(3):
            v[i] += r[i] * y
            for j in range(3):
                m[i][j] += r[i] * r[j]
    def det(a):
        return (a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
                + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]))
    d = det(m)
    return [det([[v[r] if c == i else m[r][c] for c in range(3)] for r in range(3)]) / d for i in range(3)]
middles = {b['id']: b for b in pos[-1]['buildings']}
tiles = [(1.0, p['col'] + p['w'] / 2, p['row'] + p['h'] / 2) for i, p in placed[-1].items() if i in middles]
ids = [i for i in placed[-1] if i in middles]
px = fit(tiles, [middles[i]['x'] for i in ids])
py = fit(tiles, [middles[i]['y'] for i in ids])
def screen(col, row):
    return px[0] + px[1] * col + px[2] * row, py[0] + py[1] * col + py[2] * row

def footprint(p):
    corners = [screen(p['col'] + dc, p['row'] + dr) for dc in (0, p['w']) for dr in (0, p['h'])]
    xs, ys = [x for x, _ in corners], [y for _, y in corners]
    return min(xs), min(ys) - RISE, max(xs), max(ys)

def campus_box(k):
    plan = placed[k]
    middle = {i: screen(p['col'] + p['w'] / 2, p['row'] + p['h'] / 2) for i, p in plan.items()}
    mx, my = median(x for x, _ in middle.values()), median(y for _, y in middle.values())
    near = sorted(middle, key=lambda i: (middle[i][0] - mx) ** 2 + (middle[i][1] - my) ** 2)
    keep = set(near[:max(1, math.ceil(len(near) * KEEP))]) | going_up[k]
    boxes = [footprint(plan[i]) for i in keep]
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)

def smoothstep(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)

min_w, mid_w = view_w / scale, view_w * MID
fh = placed[0]['BLDG-GENSTUDIES']
founders = screen(fh['col'] + fh['w'] / 2, fh['row'] + fh['h'] / 2)
width, cx, cy = [], [], []
for k in range(N):
    if k <= hold_end:
        width.append(min_w)
        cx.append(founders[0])
        cy.append(founders[1])
        continue
    x0, y0, x1, y1 = campus_box(k)
    need = max(x1 - x0 + 2 * MARGIN_X, (y1 - y0 + 2 * MARGIN_Y) * view_w / view_h)
    if k <= mid_at:
        planned = min_w * (mid_w / min_w) ** smoothstep((k - hold_end) / (mid_at - hold_end))
    else:
        planned = mid_w + (view_w - mid_w) * smoothstep((k - mid_at) / (run_end - mid_at))
    width.append(min(max(need, planned, min_w), view_w))
    cx.append((x0 + x1) / 2)
    cy.append((y0 + y1) / 2)

def only_out():
    for k in range(1, N):
        width[k] = max(width[k], width[k - 1])

def trailing(v):
    return [sum(v[max(j, 0)] for j in range(k - TRAIL, k + 1)) / (TRAIL + 1) for k in range(N)]

def centred(v):
    return [sum(v[min(max(j, 0), N - 1)] for j in range(k - SETTLE, k + SETTLE + 1)) / (2 * SETTLE + 1) for k in range(N)]

only_out()
width, cx, cy = trailing(width), trailing(cx), trailing(cy)

# The venues held in view: from PRE shots before a venue's first expansion
# to the end, whole and with a margin.
first = {}
for k in range(N):
    for i in expanding[k]:
        first.setdefault(i, k)
held = [[] for _ in range(N)]
for i, f in first.items():
    for k in range(max(0, f - PRE), N):
        if i in placed[k]:
            x0, y0, x1, y1 = footprint(placed[k][i])
            held[k].append((x0 - MARGIN_X, y0 - MARGIN_Y, x1 + MARGIN_X, y1 + MARGIN_Y))

def window(w, x, y):
    h = w * view_h / view_w
    x0 = min(max(x - w / 2, 0), view_w - w)
    y0 = min(max(y - h / 2, 0), view_h - h)
    return x0, y0, x0 + w, y0 + h

def hold_venues():
    for k in range(N):
        x0, y0, x1, y1 = window(width[k], cx[k], cy[k])
        for b in held[k]:
            x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
        width[k] = min(max(x1 - x0, (y1 - y0) * view_w / view_h), view_w)
        cx[k], cy[k] = (x0 + x1) / 2, (y0 + y1) / 2

hold_venues()
only_out()
width, cx, cy = centred(width), centred(cx), centred(cy)
hold_venues()
only_out()

def at(v, p):
    a = min(int(p), N - 1)
    b = min(a + 1, N - 1)
    return v[a] + (v[b] - v[a]) * (p - a)

n = N * PER + HOLD
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
    k = min(k, N - 1)
    if k not in cache:
        if len(cache) > 2:
            cache.pop(next(iter(cache)))
        cache[k] = Image.open(fs[k]).convert('RGB')
    return cache[k]

overlays = {}
def caption(k):
    c = clocks[min(k, N - 1)]
    key = f"year-{c['year']}-{'fall' if c['week'] <= 26 else 'spring'}"
    if key not in overlays:
        overlays[key] = Image.open(captions / f'{key}.png').convert('RGBA')
    return overlays[key]

for i in range(n):
    p = min(i / PER, N - 1)
    x0, y0, x1, y1 = window(at(width, p), at(cx, p), at(cy, p))
    box = (x0 * scale, y0 * scale, x1 * scale, y1 * scale)
    a = int(p)
    k = p - a
    fr = shot(a).resize((W, H), Image.BICUBIC, box=box)
    if k > 0.001 and a + 1 < N:
        fr = Image.blend(fr, shot(a + 1).resize((W, H), Image.BICUBIC, box=box), k)
    fr = Image.alpha_composite(fr.convert('RGBA'), caption(round(p))).convert('RGB')
    if i >= n - 12:                                          # the last moment to black
        fr = Image.blend(fr, Image.new('RGB', (W, H)), (i - (n - 12)) / 11)
    enc.stdin.write(fr.tobytes())
    if i % 90 == 0:
        print(f'frame {i}/{n}, camera {x1 - x0:.0f} of {view_w} px wide', flush=True)
enc.stdin.close()
enc.wait()
print(f'wrote {out}: {N} shots, {seconds:.1f} s, music from {MUSIC_FROM:.2f} s')

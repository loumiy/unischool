# THE TUDOR TIME-LAPSE'S CAMERA (docs/store/trailer.md, shot 14): one move,
# from the map's closest zoom on Founders Hall in year 1 out to the whole
# campus in year 50, at an even pace in the zoom (each second widens the
# view by about the same factor), coming to rest on year 50. What is off
# the edge of the view is revealed as the view widens to it.
#
#   python3 tools/trailer/tudor_camera.py <frames dir> <full view positions.json> <out dir>
#
# The full view is where the move ends: a shot of a frame at the framing the
# whole campus fits (timelapseShoot.mjs --zoom=-2 --pan=-230,140
# --positions), whose map view and Founders Hall the move is built from.
# Writes <out>/views.json, the view each frame is shot at (for
# timelapseShoot.mjs --views: a little wider than the frames of the cut
# that show it), and <out>/camera.json, the view of every frame of the cut
# (for tools/trailer/tudor_compose.py). A view is the map's own: a world
# point p sits on the page at p * zoom + (x, y).
import json, sys
from pathlib import Path

frames_dir, full, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
W, H, FPS, PER, HOLD = 1920, 1080, 30, 3, 60
ZOOM_IN = 2.5            # CampusMap.tsx's MAX_ZOOM: all the way in
START = (0.5, 0.6)       # where Founders Hall's middle sits on the page at the start, its tower above it
EASE_IN = 0.5            # the move's pace at the start, against its average (it ends at rest)
MARGIN = 1.02            # a shot's view, wider than the frames of the cut that show it

clocks = [json.loads(p.read_text())['state']['clock'] for p in sorted(frames_dir.glob('frame-*.json'))]
N = len(clocks)
run_end = next(k for k, c in enumerate(clocks) if c == clocks[-1])   # year 50: the coda carries its clock

base = json.loads(full.read_text())
end = base['view']
fh = next(b for b in base['buildings'] if b['id'] == 'BLDG-GENSTUDIES')
founders = ((fh['x'] - end['x']) / end['zoom'], (fh['y'] - end['y']) / end['zoom'])
END = (fh['x'] / W, fh['y'] / H)

def ease(t):
    # A cubic from 0 to 1, leaving at EASE_IN and arriving at rest.
    return EASE_IN * (t ** 3 - 2 * t ** 2 + t) + 3 * t ** 2 - 2 * t ** 3

def view(p):
    # The zoom, geometric between the two ends; Founders Hall's place on
    # the page, carried from START to where the full view has it.
    u = ease(min(p / run_end, 1.0))
    zoom = ZOOM_IN * (end['zoom'] / ZOOM_IN) ** u
    at = [a + (b - a) * u for a, b in zip(START, END)]
    return {'zoom': zoom, 'x': at[0] * W - founders[0] * zoom, 'y': at[1] * H - founders[1] * zoom}

def world(v):
    return -v['x'] / v['zoom'], -v['y'] / v['zoom'], (W - v['x']) / v['zoom'], (H - v['y']) / v['zoom']

n = N * PER + HOLD
frames = [view(min(i / PER, N - 1)) for i in range(n)]

# Each shot's view: every frame of the cut it shows in (dissolving into the
# next shot, or out of the last), with a margin, kept inside the full view.
shows = [[] for _ in range(N)]
for i, v in enumerate(frames):
    p = min(i / PER, N - 1)
    a = int(p)
    shows[a].append(world(v))
    if p - a > 0.001 and a + 1 < N:
        shows[a + 1].append(world(v))
fx0, fy0, fx1, fy1 = world(end)
views = []
for boxes in shows:
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    zoom = min(ZOOM_IN, max(end['zoom'], W / (max(x1 - x0, (y1 - y0) * W / H) * MARGIN)))
    hw, hh = W / 2 / zoom, H / 2 / zoom
    cx = min(max((x0 + x1) / 2, fx0 + hw), fx1 - hw)
    cy = min(max((y0 + y1) / 2, fy0 + hh), fy1 - hh)
    views.append({'zoom': zoom, 'x': W / 2 - cx * zoom, 'y': H / 2 - cy * zoom})

out.mkdir(parents=True, exist_ok=True)
(out / 'views.json').write_text(json.dumps(views))
(out / 'camera.json').write_text(json.dumps({'size': [W, H], 'fps': FPS, 'per': PER, 'hold': HOLD, 'frames': frames}))
for k in range(0, N, 24):
    print(f"shot {k:3d}, year {clocks[k]['year']:2d}: zoom {views[k]['zoom']:.3f}, the view {W * end['zoom'] / views[k]['zoom']:.0f} of the full {W} px")
print(f'{out}: views for {N} shots, a camera for {n} frames of the cut ({n / FPS:.1f} s); at rest from shot {run_end}')

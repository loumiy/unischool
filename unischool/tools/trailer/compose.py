# THE TRAILER'S EDIT (docs/store/trailer.md): every frame of the one-minute
# cut composed here from the shots tools/trailer/build.sh records, and piped
# to ffmpeg as raw RGB. 30 fps, 1815 frames (1:00.5), each shot cut on the
# music's measured cues, as the script's shot list times them: the founding
# on the first entry (0:03.09), the screens from the swell (0:14.74), the
# summer on the hard drop (0:18.99), forty years from the rise (0:28.64),
# the pan on the pulse after it (0:44.73), the Final Report on the drop
# (0:49.04) and the title in the breath (0:54.09).
#
#   python3 tools/trailer/compose.py <shots dir> <out.mp4>    # needs Pillow
#
# The frame picks below are tied to build.sh's captures (seeded runs, a
# fake clock): re-check them by eye after changing a capture.
import subprocess, sys
from functools import lru_cache
from pathlib import Path
from PIL import Image

T = Path(sys.argv[1])            # node_modules/.tmp/tr60
OUT = sys.argv[2]                # the video, without audio
W, H, FPS = 1920, 1080, 30

@lru_cache(maxsize=6)
def img(path):
    return Image.open(path).convert('RGB')

def frames(dirpath):
    return sorted(p for p in Path(dirpath).glob('*.png') if p.stem[:1].isdigit() or p.stem.startswith('frame-'))

def window(src, cx, cy, w):
    """The w-wide 16:9 window of src centred on (cx, cy), scaled to 1080p,
    sub-pixel, clamped inside the source."""
    w = min(w, src.width, src.height * W / H)
    h = w * H / W
    x0 = min(max(cx - w / 2, 0), src.width - w)
    y0 = min(max(cy - h / 2, 0), src.height - h)
    return src.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + w, y0 + h))

def lerp(a, b, t):
    return a + (b - a) * t

def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)

def pick(n_out, n_src, first=0):
    """Source frame for each of n_out frames, spread evenly over n_src
    frames from `first`."""
    return lambda i: first + round(i * (n_src - 1) / max(1, n_out - 1))

# --- 1 · the name, carved: the facade, its own sky carried up to 16:9,
# pushed in a touch toward the name; the bare COLLEGE held half a second
# before the typing, and the whole name a second and a half after it.
def name(i, t):
    fs = frames(T / 'act2/name')
    src = img(fs[min(1 + max(0, i - 15), len(fs) - 1)])
    h = round(src.width * H / W)
    sky = src.getpixel((4, 4))
    canvas = Image.new('RGB', (src.width, h), sky)
    canvas.paste(src, (0, h - src.height))
    s = lerp(1.0, 1.045, ease(i / 92))
    band = h - src.height + src.height * 0.36                  # the frieze the name is cut in
    return window(canvas, src.width / 2, lerp(h / 2, band, 0.35), src.width / s)

def seq(dirpath, at, box=None):
    """A captured sequence: frame `at(i)`, the whole of it, or a window
    (cx, cy, w) of it, or a window moving between two."""
    fs = frames(dirpath)
    def f(i, t):
        src = img(fs[min(at(i), len(fs) - 1)])
        if box is None:
            return src
        (c0x, c0y, w0), (c1x, c1y, w1), n = box
        k = ease(i / max(1, n - 1))
        return window(src, lerp(c0x, c1x, k), lerp(c0y, c1y, k), lerp(w0, w1, k))
    return f

def still(path, c0, w0, c1, w1, n, hold=0, until=None):
    """A screen at 4K, pushed in from one window to another between `hold`
    and `until` (the last frame, unless given), held either side."""
    end = n - 1 if until is None else until
    def f(i, t):
        k = ease((i - hold) / max(1, end - hold))
        return window(img(path), lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(w0, w1, k))
    return f

# 5 · Meadow House: the 4K take, from footings to finished (its first
# 63 frames; the rest hold the finished hall).
def meadow(i, t):
    fs = frames(T / 'clips/meadow.webm.frames')
    k = round(i * 62 / 72)
    return window(img(fs[k]), lerp(1680, 1660, i / 72), lerp(900, 896, i / 72), lerp(2580, 2380, ease(i / 72)))   # the cupola below the headline

# 8 · The summer: the take from the cursor at the slider (frame 6): the
# price dragged up, down and back, set at frame 63, and the reveal counting
# up. Framed on the price, the empty cream below it for the band; from the
# click the camera tilts down to the figures as they count.
def summer(i, t):
    fs = frames(T / 'summer')
    u = ease((i - 57) / 30)
    return window(img(fs[min(6 + i, len(fs) - 1)]), 1750, lerp(640, 900, u), lerp(1800, 1760, u))   # the inbox's edge (x 839) just out

# 10 · The stadium: it goes up and grows, stage by stage (the Tudor frames
# 104-150, each dissolving into the next), about two frames a stage.
def stadium(i, t):
    fs = frames(T / 'stadium/shots')
    p = i * (len(fs) - 1) / 96
    a = int(p)
    k = p - a
    fr = img(fs[a])
    if k > 0.001 and a + 1 < len(fs):
        fr = Image.blend(fr, img(fs[a + 1]), k)
    return window(fr, lerp(1920, 1990, i / 96), lerp(1080, 1040, i / 96), lerp(3840, 3300, ease(i / 96)))

# --- 12-16 · the pan: one drift across the 2880x1620 plates, the same for
# every architecture, so a switch is a cut on the same frame of the move,
# and the plates' frames run on across the cuts, the walkers with them. It
# slows to rest on Founders Hall at the head of the Grand Quad as the
# Final Report cuts in.
PAN_T0, PAN_T1, PAN_SLOW = 1342 / FPS, 1471 / FPS, 1.5
PAN_XA, PAN_XB, PAN_X, PAN_Y0, PAN_Y1 = 600, 820, 820, 160, 90
PAN_V = (PAN_XB - PAN_XA) / (PAN_T1 - PAN_T0 - PAN_SLOW / 2)
def pan_at(t):
    edge = PAN_T1 - PAN_SLOW
    if t <= edge:
        x = PAN_XA + PAN_V * (t - PAN_T0)
    else:
        u = min((t - edge) / PAN_SLOW, 1.0)
        x = PAN_XA + PAN_V * (edge - PAN_T0) + PAN_V * PAN_SLOW * (u - u * u / 2)
    return x, lerp(PAN_Y0, PAN_Y1, x / PAN_X)

def pan(arch, first=0):
    fs = frames(T / f'plates/pan-{arch}.webm.frames')
    def f(i, t):
        x, y = pan_at(t)
        return window(img(fs[min(first + i, len(fs) - 1)]), x + W / 2, y + H / 2, W)
    return f

# 18 · The end card's plate: year 50 wide, in the fall, barely drifting.
def end(i, t):
    src = img(frames(T / 'clips/e1.webm.frames')[0])
    return window(src, 1920, lerp(1080, 1100, i / 191), lerp(3840, 3480, i / 191))

UI = T / 'ui'
SEGMENTS = [   # (frames, renderer): the script's shots, in order
    (93, name),                                                       # 1  0:00
    (95, seq(T / 'act2/founding', lambda i: 6 + i)),                  # 2  0:03.09, set down (its frame 70) on the bar line at 0:05.21
    (66, seq(T / 'act2/beds', pick(66, 72, 2))),                      # 3  0:06.25
    (115, seq(T / 'act2/walks', lambda i: 2 + i)),                    # 4  0:08.46
    (73, meadow),                                                     # 5  0:12.30
    (65, still(UI / 'curriculum.png', (1600, 900), 3200, (1150, 800), 2200, 65)),          # 6  0:14.74
    (63, still(UI / 'faculty.png', (2400, 1100), 3840, (2880, 1030), 2400, 63)),           # 7  0:16.91
    (118, summer),                                                    # 8  0:18.99
    (74, seq(T / 'choice', lambda i: max(0, i - 5), ((2240, 1000, 3400), (2380, 980, 2920), 74))),   # 9  0:22.93, the inbox pushed out of frame
    (97, stadium),                                                    # 10 0:25.39
    (483, seq(T / 'tl', lambda i: min(i, 479))),                      # 11 0:28.64, years 1-40 (its last frames, where the caption turns to year 41, hold year 40)
    (36, pan('gothic')),                                              # 12 0:44.73
    (16, pan('classical', 36)),                                       # 13 0:45.93
    (16, pan('mission', 52)),                                         # 14 0:46.47
    (16, pan('artDeco', 68)),                                         # 15 0:47.00
    (45, pan('georgian', 84)),                                        # 16 0:47.54
    (152, still(UI / 'final.png', (1920, 1080), 3840, (1920, 520), 2100, 152, hold=30, until=108)),   # 17 0:49.04
    (192, end),                                                       # 18 0:54.09
]
assert sum(n for n, _ in SEGMENTS) == 1815

# --- the words: (overlay, in, out, fade) in seconds --------------------------
C = T / 'cards'
WORDS = [
    ('heading', 0.20, 2.40, 0.18),
    ('begins', 3.30, 5.90, 0.20),
    ('band-courses', 14.85, 16.85, 0.15), ('band-professors', 16.95, 18.95, 0.15),
    ('band-summer', 19.05, 21.10, 0.18), ('band-choose', 23.05, 25.30, 0.18),
    ('h1', 29.00, 31.60, 0.18), ('h2', 32.00, 34.70, 0.18), ('h3', 35.10, 37.60, 0.18),
    ('h4', 38.00, 40.60, 0.18), ('h5', 41.00, 44.20, 0.18),
    ('build', 45.00, 48.80, 0.20),
    ('cap-gothic', 44.80, 45.90, 0.10), ('cap-classical', 45.96, 46.44, 0.06), ('cap-mission', 46.50, 46.97, 0.06),
    ('cap-artDeco', 47.03, 47.50, 0.06), ('cap-georgian', 47.57, 48.80, 0.10),
    ('end1', 54.09, 99, 0.40), ('end2', 55.19, 99, 0.40),
]
over = {k: Image.open(C / f'{k}.png').convert('RGBA') for k, *_ in WORDS}

def words(frame, t):
    base = frame.convert('RGBA')
    for k, a, b, fade in WORDS:
        if a <= t < b:
            o = over[k]
            alpha = min(1, (t - a) / fade, (b - t) / fade)
            if alpha < 1:
                o = o.copy()
                o.putalpha(o.getchannel('A').point(lambda v: int(v * alpha)))
            base = Image.alpha_composite(base, o)
    return base.convert('RGB')

enc = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                        '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
                        '-pix_fmt', 'yuv420p', OUT], stdin=subprocess.PIPE)
F = 0
for shot, (n, render) in enumerate(SEGMENTS, start=1):
    for i in range(n):
        t = F / FPS
        fr = render(i, t)
        if fr.size != (W, H):
            fr = fr.resize((W, H), Image.BICUBIC)
        fr = words(fr, t)
        if t > 60.1:                                          # the last breath to black
            fr = Image.blend(fr, Image.new('RGB', (W, H)), min(1, (t - 60.1) / 0.4))
        enc.stdin.write(fr.tobytes())
        F += 1
    print(f'shot {shot}: frame {F}/1815', flush=True)
enc.stdin.close()
enc.wait()
print('wrote', OUT)

# THE TRAILER'S EDIT (docs/store/trailer.md): every frame of the one-minute
# cut composed here from the shots tools/trailer/build.sh records, and piped
# to ffmpeg as raw RGB. 30 fps, 1815 frames (1:00.5), each shot cut on the
# music's measured cues, as the script's shot list times them: the pan's
# switches on the statement's swells, Act 2 on the hard drop (0:18.99), the
# screens from the second join (0:31.04), fifty years from the second
# entry (0:38.01), the pan back on the big swell (0:51.64) and the title in
# the breath (0:54.09).
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

# --- the pan (shots 1-6, 19-21): one slow drift across the 2880x1620
# plates, the same for every architecture, so a switch is a cut on the
# same frame of the move. It runs on as if it never stopped while the
# minute is elsewhere, and slows to rest on Founders Hall at 0:54.09.
PAN_X, PAN_Y0, PAN_Y1, PAN_END, PAN_SLOW = 820, 160, 90, 54.09, 1.6
PAN_V = PAN_X / (PAN_END - PAN_SLOW / 2)
def pan_at(t):
    edge = PAN_END - PAN_SLOW
    if t <= edge:
        x = PAN_V * t
    else:
        u = min((t - edge) / PAN_SLOW, 1.0)
        x = PAN_V * edge + PAN_V * PAN_SLOW * (u - u * u / 2)
    return x, lerp(PAN_Y0, PAN_Y1, x / PAN_X)

def pan(arch, first=0):
    fs = frames(T / f'plates/pan-{arch}.webm.frames')
    def f(i, t):
        x, y = pan_at(t)
        return window(img(fs[min(first + i, len(fs) - 1)]), x + W / 2, y + H / 2, W)
    return f

# --- 7 · the name, carved: the facade, its own sky carried up to 16:9,
# pushed in a touch toward the name.
def name(i, t):
    fs = frames(T / 'act2/name')
    src = img(fs[min(1 + i, len(fs) - 1)])
    h = round(src.width * H / W)
    sky = src.getpixel((4, 4))
    canvas = Image.new('RGB', (src.width, h), sky)
    canvas.paste(src, (0, h - src.height))
    s = lerp(1.0, 1.045, ease(i / 56))
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

def still(path, c0, w0, c1, w1, n, hold=0):
    """A screen at 4K, pushed in from one window to another after `hold`."""
    def f(i, t):
        k = ease((i - hold) / max(1, n - 1 - hold))
        return window(img(path), lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(w0, w1, k))
    return f

# 11 · Meadow House: the 4K take, from footings to finished (its first
# 63 frames; the rest hold the finished hall).
def meadow(i, t):
    fs = frames(T / 'clips/meadow.webm.frames')
    k = round(i * 62 / 71)
    return window(img(fs[k]), lerp(1680, 1660, i / 71), lerp(900, 896, i / 71), lerp(2580, 2380, ease(i / 71)))   # the cupola below the headline

# 16 · The charter: the letter's last lines and its button, clicked (frame
# 38); then the pennant over the campus, reading Halifax University.
def charter(i, t):
    if i < 40:
        fs = frames(T / 'charter')
        return window(img(fs[i]), lerp(1600, 1560, i / 39), lerp(880, 900, i / 39), lerp(1900, 1760, ease(i / 39)))
    fs = frames(T / 'charter/pennant')
    k = i - 40
    return window(img(fs[min(k, len(fs) - 1)]), lerp(1100, 1000, ease(k / 22)), lerp(620, 560, ease(k / 22)), lerp(2200, 2000, ease(k / 22)))

# 17 · The stadium: it goes up and grows, stage by stage (the Tudor frames
# 104-150, each dissolving into the next), then the double-decked bowl,
# full for the opener.
GROW = 72
def stadium(i, t):
    if i < GROW:
        fs = frames(T / 'stadium/shots')
        p = i * (len(fs) - 1) / (GROW - 1)
        a = int(p)
        k = p - a
        fr = img(fs[a])
        if k > 0.001 and a + 1 < len(fs):
            fr = Image.blend(fr, img(fs[a + 1]), k)
        return window(fr, lerp(1920, 1990, i / GROW), lerp(1080, 1040, i / GROW), lerp(3840, 3300, ease(i / GROW)))
    fs = frames(T / 'clips/bowl.webm.frames')
    k = i - GROW
    return window(img(fs[30 + k]), lerp(1900, 1960, k / 33), lerp(900, 860, k / 33), lerp(2700, 2450, ease(k / 33)))

# 22 · The end card's plate: year 50 wide, in the fall, barely drifting.
def end(i, t):
    src = img(frames(T / 'clips/e1.webm.frames')[0])
    return window(src, 1920, lerp(1080, 1100, i / 191), lerp(3840, 3480, i / 191))

UI = T / 'ui'
SEGMENTS = [   # (frames, renderer): the script's shots, in order
    (93, pan('georgian')),                                            # 1  0:00
    (95, pan('gothic')),                                              # 2  0:03.09
    (124, pan('classical')),                                          # 3  0:06.25
    (130, pan('mission')),                                            # 4  0:10.39
    (90, pan('modern')),                                              # 5  0:14.74
    (38, pan('artDeco')),                                             # 6  0:17.74
    (57, name),                                                       # 7  0:18.99
    (72, seq(T / 'act2/founding', lambda i: 42 + i)),                 # 8  0:20.89
    (63, seq(T / 'act2/beds', pick(63, 72, 2))),                      # 9  0:23.30
    (97, seq(T / 'act2/walks', lambda i: 2 + i)),                     # 10 0:25.39
    (72, meadow),                                                     # 11 0:28.64
    (62, still(UI / 'faculty.png', (2400, 1100), 3840, (2880, 1030), 2400, 62)),            # 12 0:31.04
    (74, still(UI / 'summer.png', (1800, 1150), 3200, (1700, 1200), 2400, 74)),             # 13 0:33.10
    (73, seq(T / 'choice', pick(73, 69), ((2240, 1000, 3400), (2300, 980, 3000), 73))),                 # 14 0:35.56
    (105, seq(T / 'tl40', lambda i: i)),                              # 15 0:38.01
    (63, charter),                                                    # 16 0:41.50
    (106, stadium),                                                   # 17 0:43.60
    (135, still(UI / 'final.png', (1920, 1080), 3840, (1920, 520), 2100, 135, hold=57)),     # 18 0:47.14
    (25, pan('mission', 125)),                                        # 19 0:51.64
    (24, pan('modern', 126)),                                         # 20 0:52.45
    (25, pan('georgian', 125)),                                       # 21 0:53.26
    (192, end),                                                       # 22 0:54.09
]
assert sum(n for n, _ in SEGMENTS) == 1815

# --- the words: (overlay, in, out, fade) in seconds --------------------------
C = T / 'cards'
WORDS = [
    ('h1', 0.30, 2.90, 0.18), ('h2', 6.50, 9.10, 0.18), ('h3', 11.00, 13.60, 0.18),
    ('cap-georgian', 0.25, 3.02, 0.15), ('cap-gothic', 3.16, 6.18, 0.12), ('cap-classical', 6.32, 10.32, 0.12),
    ('cap-mission', 10.46, 14.67, 0.12), ('cap-modern', 14.81, 17.67, 0.12), ('cap-artDeco', 17.81, 18.92, 0.10),
    ('begins', 21.00, 23.20, 0.20),
    ('h4', 28.80, 31.00, 0.18),
    ('band-summer', 33.30, 35.40, 0.18), ('band-choose', 35.80, 37.90, 0.18),
    ('card', 38.20, 41.20, 0.20),
    ('h5', 43.80, 46.90, 0.18),
    ('band-build', 47.30, 48.90, 0.18),
    ('cap-mission', 51.70, 52.40, 0.10), ('cap-modern', 52.51, 53.21, 0.10),
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

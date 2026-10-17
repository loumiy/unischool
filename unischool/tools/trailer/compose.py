# THE TRAILER'S EDIT (docs/store/trailer.md): every frame of the 30-second
# cut composed here from the shots tools/trailer/build.sh records, and piped
# to ffmpeg as raw RGB. 30 fps, 900 frames, cut on the music window
# M 1:04.1-1:34.1 of the title theme (trailer time = music time - 64.1 s):
# the pan's switches on the quiet pulse's group onsets (frames 74 and 148),
# the gameplay from the second entry (221), the pan back on the big swell
# (630) and the title in the breath after the peak (704).
#
#   python3 tools/trailer/compose.py <shots dir> <out.mp4>    # needs Pillow
#
# The frame picks below are tied to build.sh's captures (a seeded run, a
# fake clock): re-check them by eye after changing a capture.
import subprocess, sys
from functools import lru_cache
from pathlib import Path
from PIL import Image

T = Path(sys.argv[1])            # node_modules/.tmp/tr
OUT = sys.argv[2]                # the video, without audio
W, H, FPS = 1920, 1080, 30

@lru_cache(maxsize=8)
def img(path):
    return Image.open(path).convert('RGB')

def frames(dirpath):
    return sorted(p for p in Path(dirpath).glob('*.png') if p.stem[:1].isdigit() or p.stem.startswith('frame-'))

def window(src, cx, cy, w):
    """The w-wide 16:9 window of src centred on (cx, cy), scaled to 1080p,
    sub-pixel, clamped inside the source."""
    h = w * H / W
    x0 = min(max(cx - w / 2, 0), src.width - w)
    y0 = min(max(cy - h / 2, 0), src.height - h)
    s = w / W
    return src.transform((W, H), Image.AFFINE, (s, 0, x0, 0, s, y0), Image.BICUBIC)

def lerp(a, b, t):
    return a + (b - a) * t

def ease(t):
    return t * t * (3 - 2 * t)

# --- the segments, in frames (boundaries on the measured music cues) -------
PAN_END = 704                      # the pan's move runs from frame 0 to here
def pan(arch):
    fs = frames(T / f'plates/pan-{arch}.webm.frames')
    def f(i, F):
        src = img(fs[min(i, len(fs) - 1)])
        # One slow move across the 2880x1620 plate, the same for every
        # architecture, so a switch is a cut on the same frame of the move.
        x = 960 * F / PAN_END
        y = lerp(150, 110, F / PAN_END)
        return window(src, x + W / 2, y + H / 2, W)
    return f

def seq(dirpath, pick):
    fs = frames(dirpath)
    def f(i, F):
        return img(fs[pick(i)])
    return f

def g2(i, F):
    good = [k for k in range(75) if k not in (17, 18, 19)]   # the snow-melt redraw
    fs = frames(T / 'clips/g2.webm.frames')
    return img(fs[good[round(i * (len(good) - 1) / 34)]])

def g3(i, F):
    # Fifty fall frames over 73: each year dissolves into the next.
    fs = frames(T / 'fall/shots')
    pos = i * 49 / 72
    a, b = int(pos), min(int(pos) + 1, 49)
    fa, fb = img(fs[a]), img(fs[b])
    k = pos - a
    out = Image.blend(fa, fb, k) if k > 0.001 else fa
    s = lerp(1.0, 1.035, i / 72)
    return window(out, W / 2, H / 2 + 20, W / s)

def push(path, c0, w0, c1, w1, n):
    def f(i, F):
        t = ease(i / max(1, n - 1))
        src = img(path)
        return window(src, lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(w0, w1, t))
    return f

def g8(i, F):
    fs = frames(T / 'clips/g8.webm.frames')
    k = 20 + i
    if k == 25: k = 24                                        # the inbox stop
    s = lerp(1.12, 1.18, i / 38)
    return window(img(fs[k]), W / 2, 610, W / s)

def g9(i, F):
    fs = frames(T / 'clips/g9.webm.frames')                  # 3840x2160
    t = ease(i / 38)
    return window(img(fs[20 + i]), lerp(2150, 2280, t), lerp(900, 840, t), lerp(2500, 1960, t))

def e1(i, F):
    src = img(frames(T / 'clips/e1.webm.frames')[0])         # 3840x2160
    t = i / 195
    return window(src, 1920, lerp(1080, 1100, t), lerp(3840, 3480, t))

UI = T / 'ui'
SEGMENTS = [   # (frames, renderer)
    (74, pan('georgian')),
    (74, pan('gothic')),
    (73, pan('classical')),
    (37, seq(T / 'g1', lambda i: 50 + i)),
    (35, g2),
    (73, g3),
    (72, seq(T / 'clips/g4.webm.frames', lambda i: 10 + i)),
    (30, push(UI / 'faculty.png', (2400, 1100), 3840, (2880, 1030), 2400, 30)),
    (27, push(UI / 'summer.png', (1800, 1100), 3200, (1720, 1180), 2050, 27)),
    (57, push(UI / 'spec.png', (1920, 1080), 3840, (2340, 1000), 2880, 57)),
    (39, g8),
    (39, g9),
    (36, pan('mission')),
    (38, pan('modern')),
    (196, e1),
]
assert sum(n for n, _ in SEGMENTS) == 900

# --- the words: (overlay, in, out, fade) in seconds ------------------------
C = T / 'cards'
WORDS = [
    ('h1', 0.20, 2.30, 0.18), ('h2', 2.60, 4.80, 0.18), ('h3', 5.05, 7.20, 0.18),
    ('card', 9.90, 12.10, 0.20), ('h4', 12.35, 14.50, 0.18), ('h5', 18.55, 20.90, 0.18),
    ('end1', 23.45, 99, 0.40), ('end2', 24.55, 99, 0.40),
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
for n, render in SEGMENTS:
    for i in range(n):
        t = F / FPS
        fr = render(i, F)
        if fr.size != (W, H):
            fr = fr.resize((W, H), Image.BICUBIC)
        fr = words(fr, t)
        if t > 29.6:                                          # the last breath to black
            fr = Image.blend(fr, Image.new('RGB', (W, H)), min(1, (t - 29.6) / 0.4))
        enc.stdin.write(fr.tobytes())
        F += 1
    print(f'frame {F}/900', flush=True)
enc.stdin.close()
enc.wait()
print('wrote', OUT)

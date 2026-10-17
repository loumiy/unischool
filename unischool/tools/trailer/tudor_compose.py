# THE TUDOR TIME-LAPSE, CUT (docs/store/trailer.md, shot 14): the frames
# tools/timelapseShoot.mjs shot from tools/trailer/tudorTimelapse.ts, each
# dissolving into the next at 30 fps, then the finished plan held. The
# frame stays still: a push-in would crop the shooter's Year caption. Cut
# to the title theme from 0:04.65, so the coda (the Triumphal Gate rising)
# plays over the first statement's peak and the finished plan lands on the
# hard drop at 0:26.35.
#
#   python3 tools/trailer/tudor_compose.py <shots dir> <music.mp3> <out.mp4>    # needs Pillow
import subprocess, sys
from pathlib import Path
from PIL import Image

shots, music, out = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
W, H, FPS, PER, HOLD = 1920, 1080, 30, 3, 60
fs = sorted(p for p in shots.glob('frame-*.png'))
n = len(fs) * PER + HOLD
seconds = n / FPS
MUSIC_FROM = 26.35 - len(fs) * PER / FPS    # the finished plan on the hard drop

def window(src, w):
    h = w * H / W
    x0, y0 = (src.width - w) / 2, (src.height - h) / 2
    s = w / W
    return src.transform((W, H), Image.AFFINE, (s, 0, x0, 0, s, y0), Image.BICUBIC)

enc = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-ss', f'{MUSIC_FROM + 0.025:.3f}', '-t', f'{seconds:.3f}', '-i', music,
    '-af', f'afade=t=in:st=0:d=0.3,afade=t=out:st={seconds - 1.6:.3f}:d=1.6,volume=2.4dB,alimiter=limit=0.84:level=disabled',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)
cache = {}
def frame(k):
    k = min(k, len(fs) - 1)
    if k not in cache:
        if len(cache) > 4: cache.pop(next(iter(cache)))
        cache[k] = Image.open(fs[k]).convert('RGB')
    return cache[k]
for i in range(n):
    pos = min(i / PER, len(fs) - 1)
    a = int(pos)
    k = pos - a
    img = Image.blend(frame(a), frame(a + 1), k) if k > 0.001 and a + 1 < len(fs) else frame(a)
    fr = window(img, img.width)
    if i >= n - 12:                                         # the last moment to black
        fr = Image.blend(fr, Image.new('RGB', (W, H)), (i - (n - 12)) / 11)
    enc.stdin.write(fr.tobytes())
enc.stdin.close()
enc.wait()
print(f'wrote {out}: {len(fs)} frames, {seconds:.1f} s, music from {MUSIC_FROM:.2f} s')

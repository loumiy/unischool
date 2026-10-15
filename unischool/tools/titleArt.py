"""The title art: the quad between two Georgian halls, as an SVG.

Run: python3 tools/titleArt.py src/assets/campus-quad.svg

Drawn in the map's own vocabulary, at a closer look:
- the halls are the Georgian set's academic halls (buildingSpec.ts's GEORGIAN,
  buildingMotifs.tsx's Founders Hall): brickRed walls, the limestone trim,
  the blue-grey slate hip with pedimented dormers and end stacks, the name
  band at the eaves, white-framed six-over-six sashes under flat lintels,
  the four-column portico with its oculus, and the school's colours hung
  from the band (StartupScreen.tsx's HungBanner). Each long hall is drawn
  flat, as an elevation, and every point of it is then projected onto its
  front in perspective; its near end is drawn square on;
- the hall at the end of the avenue is the founding screen's Founders Hall
  elevation (StartupScreen.tsx's GeorgianCrown and GeorgianFront), clock
  tower and all;
- the trees are the map's canopy trees (trees.tsx: three lobes and a sunlit
  cap), the lamps its globe lamps with commencement banners (dressing.tsx),
  the benches its slatted benches with cast-iron ends, the walks its paving
  with kerbs and joints (pathways.tsx), the hedges and flower borders the
  Grand Quad's (groundMarkings.tsx), the walkers its walkers (Walkers.tsx).
The default school colours are maroon and gold.

The foliage and the flower beds are placed at random from a fixed seed, so
the same file comes out every run.
"""
import math
import random
import sys

W, H = 1779, 884
HORIZON = 628
VP = (884, 612)  # the vanishing point, just above the far lawn

rnd = random.Random(7)
out = []
defs = []
uid = [0]


def nid(p):
    uid[0] += 1
    return f"{p}{uid[0]}"


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def attrs(extra):
    return "".join(f' {k.replace("_", "-")}="{v}"' for k, v in extra.items())


def poly(pts, fill, to=None, **kw):
    d = " ".join(f"{f(x)},{f(y)}" for x, y in pts)
    (to if to is not None else out).append(f'<polygon points="{d}" fill="{fill}"{attrs(kw)}/>')


def rect(x, y, w, h, fill, to=None, **kw):
    (to if to is not None else out).append(f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" fill="{fill}"{attrs(kw)}/>')


def circ(x, y, r, fill, to=None, **kw):
    (to if to is not None else out).append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}"{attrs(kw)}/>')


def ell(x, y, rx, ry, fill, to=None, **kw):
    (to if to is not None else out).append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{attrs(kw)}/>')


def path(d, fill, to=None, **kw):
    (to if to is not None else out).append(f'<path d="{d}" fill="{fill}"{attrs(kw)}/>')


def line(x1, y1, x2, y2, stroke, width, to=None, **kw):
    (to if to is not None else out).append(
        f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="{stroke}" stroke-width="{f(width)}"{attrs(kw)}/>')


def lerp(a, b, t):
    return a + (b - a) * t


def tint(hexc, k):
    """tint.ts's shade: each channel times k."""
    n = int(hexc[1:], 16)
    ch = [min(255, max(0, round(((n >> s) & 255) * k))) for s in (16, 8, 0)]
    return "#" + "".join(f"{c:02x}" for c in ch)


# ---------------------------------------------------------------- the map's palette
BRICK = "#bd6b48"           # brickRed, the academic halls' wall
TRIM = "#efe9da"            # GEORGIAN_TRIM, the limestone
SLATE = "#5d6a7c"           # Founders Hall's blue-grey slate
SASH_GLASS = "#2c3843"
VERDIGRIS = "#6fa59b"
GILT = "#c9a227"
TOWER_STONE = "#e4dcc8"
DOOR = "#2f3b45"
BELL = "#8a6a32"
LANTERN = "#262c31"
PRIMARY, SECONDARY = "#7b1e2b", "#f2c14e"   # maroon and gold, the default colours

TRUNK = "#6b5236"
CROWN, CROWN_HI = "#4f7a3c", "#679a4c"      # canopy trees, summer
ORN, ORN_HI = "#7d9e4a", "#9ab85f"          # ornamental trees
LEAF = ["#2c4a24", "#3a6030", CROWN, "#5c8a45", CROWN_HI, "#86b65e", "#a9cf72"]
LEAF_FAR = ["#5d7f55", "#6a8c5f", "#789a69", "#86a875", "#97b885", "#adc99a", "#c3d9ae"]

PAVING, KERB, JOINT = "#cbbd8e", "#a89566", "rgba(120,106,66,0.28)"
HEDGE_SIDE, HEDGE_TOP = "#3f6b34", "#55863f"
SOIL = "#7a6248"
BLOOMS = ["#d9566a", "#e8b33f", "#e9e3ee", "#b070c4"]
LAMP_IRON, LAMP_GLOBE = "#3a3a38", "#f5e3a3"
SEAT, APRON, BACK, BENCH_EDGE, CAST_IRON = "#a8733f", "#6e4a2a", "#8a5b32", "#5e4027", "#33312e"
SKIN = "#e9c9a6"
SHIRTS = ["#c94b4b", "#3d6a9c", "#e0b64a", "#5b8a5b", "#8c5a9c", "#e88a4a", "#f2ede2"]
TROUSERS = ["#34363f", "#4a4f5c", "#5b4a3a", "#2f3b4f", "#6b6a64"]
HAIR = ["#2a1d16", "#3a2618", "#5b3a22", "#8a5a2b", "#1d1a18", "#c8a064"]


# ---------------------------------------------------------------- canvases
class Flat:
    """Draws an elevation as it is, in its own coordinates (placed later by a
    transform)."""

    def __init__(self):
        self.o = []

    def rect(self, x, y, w, h, fill, **kw):
        rect(x, y, w, h, fill, self.o, **kw)

    def poly(self, pts, fill, **kw):
        poly(pts, fill, self.o, **kw)

    def circ(self, x, y, r, fill, **kw):
        circ(x, y, r, fill, self.o, **kw)

    def line(self, x1, y1, x2, y2, stroke, width, **kw):
        line(x1, y1, x2, y2, stroke, width, self.o, **kw)

    def path(self, d, fill, **kw):
        path(d, fill, self.o, **kw)

    def text(self, s):
        self.o.append(s)


class Projected:
    """Draws an elevation onto a facade in perspective: every point goes
    through `to_screen`, so lines stay true and nothing is drawn twice."""

    def __init__(self, to_screen, scale_at):
        self.o = []
        self.P = to_screen
        self.S = scale_at

    def _kw(self, kw, x):
        if "stroke_width" in kw:
            kw = dict(kw, stroke_width=f(float(kw["stroke_width"]) * self.S(x)))
        kw.pop("rx", None)
        return kw

    def poly(self, pts, fill, **kw):
        mx = sum(p[0] for p in pts) / len(pts)
        poly([self.P(x, y) for x, y in pts], fill, self.o, **self._kw(kw, mx))

    def rect(self, x, y, w, h, fill, **kw):
        self.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], fill, **kw)

    def circ(self, x, y, r, fill, **kw):
        n = max(10, min(28, int(r * 3)))
        self.poly([(x + r * math.cos(k * math.tau / n), y + r * math.sin(k * math.tau / n)) for k in range(n)], fill, **kw)

    def line(self, x1, y1, x2, y2, stroke, width, **kw):
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy) or 1
        ox, oy = -dy / n * width / 2, dx / n * width / 2
        kw = {k: v for k, v in kw.items() if k not in ("stroke_linecap", "stroke_linejoin")}
        self.poly([(x1 + ox, y1 + oy), (x2 + ox, y2 + oy), (x2 - ox, y2 - oy), (x1 - ox, y1 - oy)], stroke, **kw)

    def path(self, d, fill, **kw):
        raise ValueError("a projected elevation draws polygons only")

    def text(self, s):
        raise ValueError("a projected elevation carries no text")


def arc_pts(cx, cy, rx, ry, a0, a1, n=12):
    return [(cx + rx * math.cos(lerp(a0, a1, k / n)), cy + ry * math.sin(lerp(a0, a1, k / n))) for k in range(n + 1)]


# ---------------------------------------------------------------- elevation parts
def sash(c, x, y, h, trim):
    """StartupScreen.tsx's Sash: a white-framed six-over-six sash under its
    lintel, with a sill, the glass catching the sky, and its bars."""
    c.rect(x - 9, y - 5, 18, 3.5, tint(trim, 0.92))
    c.rect(x - 9, y - 1.6, 18, 0.6, tint(trim, 0.7))
    c.rect(x - 7.5, y - 1.5, 15, h + 3, trim)
    c.rect(x - 9, y + h + 1.5, 18, 1.8, tint(trim, 0.86))
    c.rect(x - 5.5, y, 11, h, SASH_GLASS)
    c.rect(x - 5.5, y, 11, h * 0.18, "#44566a")
    c.poly([(x - 5.5, y + h * 0.15), (x - 1, y), (x + 2.5, y), (x - 5.5, y + h * 0.62)], "#b7c6cf", opacity="0.25")
    c.line(x, y, x, y + h, trim, 0.7)
    c.line(x - 5.5, y + h / 3, x + 5.5, y + h / 3, trim, 0.7)
    c.line(x - 5.5, y + h * 2 / 3, x + 5.5, y + h * 2 / 3, trim, 0.7)
    c.line(x - 5.5, y + h / 2, x + 5.5, y + h / 2, trim, 1.1)  # the meeting rail


def hung_banner(c, x, y, w=18, h=58):
    """StartupScreen.tsx's HungBanner: primary cloth, secondary stripe, a
    V-notched tail; here with a fold down its middle and the mark on it."""
    tail = 8 * w / 18
    c.rect(x - 1.5, y - 1.5, w + 3, 2, "#2d3034")
    c.poly([(x, y), (x + w, y), (x + w, y + h), (x + w / 2, y + h - tail), (x, y + h)], PRIMARY)
    c.poly([(x + w * 0.55, y), (x + w, y), (x + w, y + h), (x + w * 0.55, y + h - tail * 0.9)], tint(PRIMARY, 0.82), opacity="0.55")
    c.rect(x, y + 10 * h / 58, w, 6 * h / 58, SECONDARY)
    c.rect(x, y, w, 2, tint(PRIMARY, 0.75))
    mx, my, mw = x + w / 2, y + h * 0.45, w * 0.56
    c.poly([(mx - mw / 2, my), (mx, my - mw * 0.32), (mx + mw / 2, my)], SECONDARY)
    for k in (-0.3, 0, 0.3):
        c.rect(mx + k * mw - mw * 0.07, my + 0.8, mw * 0.14, mw * 0.5, SECONDARY)
    c.rect(mx - mw / 2, my + mw * 0.56, mw, mw * 0.1, SECONDARY)


def name_band(c, x0, x1, y, h, text=None):
    """The band at the eaves the name is cut into: trim with an outline, a
    moulding and a row of dentils under its head; the letters cut as on the
    founding screen."""
    c.rect(x0, y, x1 - x0, h, TRIM, stroke=tint(TRIM, 0.78), stroke_width="0.9")
    c.rect(x0, y + 3, x1 - x0, 1.2, tint(TRIM, 0.8))
    x = x0 + 3
    while x < x1 - 3:
        c.rect(x, y + 5, 2.6, 2.4, tint(TRIM, 0.86))
        x += 5
    c.rect(x0, y + h - 3, x1 - x0, 1, tint(TRIM, 0.84))
    c.rect(x0, y + h, x1 - x0, 1.6, "rgba(0,0,0,0.12)")
    if text:
        cx = (x0 + x1) / 2
        for dy, fill in ((0.7, tint(TRIM, 1.07)), (-0.6, tint(TRIM, 0.6)), (0, tint(TRIM, 0.74))):
            c.text(f'<text x="{f(cx)}" y="{f(y + h / 2 + 7 + dy)}" fill="{fill}" font-size="18" text-anchor="middle" '
                   f'font-family="Georgia, \'Times New Roman\', serif" letter-spacing="2.5">{text}</text>')


def hip_roof(c, L, R, eaves, ridge, reach=2.2):
    """The slate hip: front slope with its courses, the two hip ends, the
    ridge, the shadow under the eaves."""
    hip = (eaves - ridge) * reach
    c.poly([(L, eaves), (L + hip, ridge), (R - hip, ridge), (R, eaves)], SLATE)
    y = ridge + 2.5
    while y < eaves - 0.5:
        t = (y - ridge) / (eaves - ridge)
        c.line(lerp(L + hip, L, t) + 2, y, lerp(R - hip, R, t) - 2, y, tint(SLATE, 0.86), 0.45)
        y += 2.6
    c.poly([(L, eaves), (L + hip, ridge), (L + hip * 1.25, eaves)], tint(SLATE, 1.14))
    c.poly([(R, eaves), (R - hip, ridge), (R - hip * 1.25, eaves)], tint(SLATE, 0.84))
    c.rect(L + hip, ridge - 1, R - L - hip * 2, 1.5, tint(SLATE, 0.8))
    c.rect(L - 1, eaves - 1.6, R - L + 2, 1.6, tint(SLATE, 0.7))


def stack(c, x, ridge, wall):
    c.rect(x, ridge - 20, 12, 22, wall)
    c.rect(x + 8, ridge - 20, 4, 22, tint(wall, 0.8))
    for yy in range(int(ridge - 17), int(ridge + 2), 3):
        c.line(x, yy, x + 12, yy, tint(wall, 0.84), 0.35)
    c.rect(x - 2, ridge - 23, 16, 3, TRIM)
    c.rect(x + 2, ridge - 27, 3.4, 4, "#8e5a44")
    c.rect(x + 6.6, ridge - 26, 3.4, 3, "#8e5a44")


def dormer(c, x, eaves, trim=TRIM):
    c.rect(x - 7, eaves - 13, 14, 12, trim)
    c.rect(x - 4, eaves - 10, 8, 9, SASH_GLASS)
    c.line(x, eaves - 10, x, eaves - 1, trim, 0.6)
    c.line(x - 4, eaves - 5.5, x + 4, eaves - 5.5, trim, 0.6)
    c.poly([(x - 9, eaves - 13), (x, eaves - 19), (x + 9, eaves - 13)], trim, stroke=tint(trim, 0.72), stroke_width="0.6")


def pediment(c, cx, ped, eaves, ridge):
    c.poly([(cx - ped, eaves), (cx, ridge - 2), (cx + ped, eaves)], TRIM, stroke=tint(TRIM, 0.72), stroke_width="1",
           stroke_linejoin="round")
    c.poly([(cx - ped + 12, eaves - 2), (cx, ridge + 2.5), (cx + ped - 12, eaves - 2)], tint(TRIM, 0.94))
    for k in range(-6, 7):  # dentils under the raking cornice
        c.rect(cx + k * 10 - 1.3, eaves - 3.4, 2.6, 1.6, tint(TRIM, 0.84))
    c.circ(cx, eaves - 9, 5.8, TRIM)
    c.circ(cx, eaves - 9, 4.2, SASH_GLASS)
    c.circ(cx, eaves - 9, 3.4, "#f4f0e4")
    c.line(cx, eaves - 9, cx, eaves - 11.5, "#2d3034", 0.5)
    c.line(cx, eaves - 9, cx + 1.8, eaves - 8.4, "#2d3034", 0.5)


def portico(c, cx, ped, wall_top, ranks, steps, wall, sh):
    """The portico (GeorgianFront): the shade behind the columns, the sashes
    and the door under its fanlight, four columns rounded by a gradient, the
    steps up to it."""
    c.rect(cx - ped, wall_top, ped * 2, steps - wall_top, tint(wall, 0.72))
    c.rect(cx - ped, wall_top, ped * 2, 5, "rgba(0,0,0,0.18)")
    for x in (cx - 44, cx + 44):
        for y in ranks:
            sash(c, x, y, sh, tint(TRIM, 0.86))
    for y in ranks[:-1]:
        sash(c, cx, y, sh, tint(TRIM, 0.86))
    door_top = ranks[-1]
    c.rect(cx - 11, door_top - 2, 22, steps - door_top + 2, tint(TRIM, 0.86))
    c.rect(cx - 8, door_top + 6, 16, steps - door_top - 6, DOOR)
    c.line(cx, door_top + 8, cx, steps, "#26303a", 0.8)
    for dx in (-6, 2):
        c.rect(cx + dx, door_top + 10, 4, (steps - door_top) * 0.28, "#3a4855")
        c.rect(cx + dx, door_top + 12 + (steps - door_top) * 0.3, 4, (steps - door_top) * 0.28, "#3a4855")
    c.circ(cx - 1.5, (door_top + steps) / 2 + 3, 0.7, GILT)
    c.circ(cx + 1.5, (door_top + steps) / 2 + 3, 0.7, GILT)
    c.poly(arc_pts(cx, door_top + 6, 8, 6, math.pi, math.tau), SASH_GLASS, stroke=tint(TRIM, 0.86), stroke_width="1")
    for i in range(1, 4):
        a = math.pi * i / 4
        c.line(cx, door_top + 6, cx - 7 * math.cos(a), door_top + 6 - 5 * math.sin(a), tint(TRIM, 0.86), 0.5)
    for d in (-66, -22, 22, 66):
        x = cx + d
        c.rect(x - 7, wall_top, 14, 3, TRIM)
        c.rect(x - 6, wall_top + 3, 12, 1.4, tint(TRIM, 0.8))
        c.rect(x - 5, wall_top + 4.4, 10, steps - wall_top - 7.4, "url(#column)")
        for fx in (-2.6, 0, 2.6):  # fluting
            c.line(x + fx, wall_top + 6, x + fx, steps - 5, "rgba(0,0,0,0.06)", 0.5)
        c.rect(x - 7, steps - 3, 14, 3, TRIM)
        c.rect(x - 6, steps - 4.2, 12, 1.2, tint(TRIM, 0.86))
    for i in range(3):
        c.rect(cx - ped + 4 - i * 6, steps + i * 4, (ped - 4 + i * 6) * 2, 4, tint(TRIM, 0.96 - i * 0.04))
        c.rect(cx - ped + 4 - i * 6, steps + i * 4 + 3.2, (ped - 4 + i * 6) * 2, 0.8, tint(TRIM, 0.78))


def brick_wall(c, x0, y0, w, h, wall, flat=False):
    """A brick wall: its colour, then the courses and a scatter of darker and
    lighter bricks."""
    c.rect(x0, y0, w, h, wall)
    if flat:
        c.rect(x0, y0, w, h, "url(#brick)")
        return
    y = y0 + 3.2
    while y < y0 + h:
        c.line(x0, y, x0 + w, y, "rgba(90,36,22,0.13)", 0.32)
        y += 3.2
    for _ in range(int(w * h / 140)):
        bx = rnd.uniform(x0, x0 + w - 4)
        by = y0 + 3.2 * rnd.randrange(int(h / 3.2)) + 0.25
        c.rect(bx, by, 3.7, 2.7, rnd.choice(("rgba(120,40,24,0.16)", "rgba(255,230,200,0.12)", "rgba(70,30,20,0.12)")))


def quoins(c, x, y0, y1, side):
    """Long-and-short stone at a corner, in trim."""
    y = y0
    k = 0
    while y < y1 - 4:
        w = 9 if k % 2 == 0 else 5.5
        c.rect(x if side > 0 else x - w, y, w, 4.2, tint(TRIM, 0.95))
        c.rect(x if side > 0 else x - w, y + 4.2, w, 0.5, tint(TRIM, 0.7))
        y += 4.7
        k += 1


def long_hall(c, width, pc, wall=BRICK):
    """A Georgian academic hall of three storeys with its portico at pc: the
    Founders Hall vocabulary along a longer front. Elevation units: the eaves
    (the band's head) at y=0, the ground at y=140."""
    eaves, ridge, band_h = 0, -24, 30
    wall_top = band_h
    G = 140
    steps = G - 12
    ranks = [wall_top + 9, wall_top + 45, wall_top + 81]
    sh = 21
    ped = 80
    L, R = -4, width + 4
    hip = (eaves - ridge) * 2.2
    for x in (L + hip + 6, R - hip - 18, pc - ped - 120, pc + ped + 108):
        if L + hip < x < R - hip - 12:
            stack(c, x, ridge, wall)
    hip_roof(c, L, R, eaves, ridge)
    x = L + hip + 30
    while x < R - hip - 20:
        if abs(x - pc) > ped + 12:
            dormer(c, x, eaves)
        x += 42
    brick_wall(c, 0, wall_top, width, G - wall_top, wall)
    c.rect(0, G - 7, width, 7, tint(TRIM, 0.9))                       # the plinth
    c.rect(0, G - 7, width, 0.8, tint(TRIM, 0.7))
    for y in (wall_top + 36, wall_top + 72):                          # string courses
        c.rect(0, y - 1.5, width, 3, tint(TRIM, 0.92))
        c.rect(0, y + 1.5, width, 0.8, "rgba(0,0,0,0.12)")
    quoins(c, 0, wall_top, G - 7, 1)
    quoins(c, width, wall_top, G - 7, -1)
    x = 24
    while x < width - 12:
        if abs(x - pc) > ped + 10:
            for y in ranks:
                sash(c, x, y, sh, TRIM)
            c.rect(x - 6, G - 6, 12, 4, "#3b3a36")  # basement light
        x += 28
    portico(c, pc, ped, wall_top, ranks, steps, wall, sh)
    name_band(c, -2, width + 2, eaves, band_h)
    pediment(c, pc, ped, eaves, ridge)
    for bx in (4, pc - ped - 22, pc + ped + 4, width - 22):
        if 0 <= bx <= width - 18:
            hung_banner(c, bx, wall_top)
    return dict(width=width, wall=G)


def end_wall(c, depth, wall=BRICK):
    """A hall's end, seen square on: the wall, three bays of sashes, the band,
    and the hip end of the roof above."""
    eaves, ridge, G = 0, -24, 140
    c.poly([(-4, eaves), (depth / 2, ridge - 30), (depth + 4, eaves)], tint(SLATE, 1.14))
    y = ridge
    while y < eaves:
        t = (y - (ridge - 30)) / (eaves - (ridge - 30))
        c.line(depth / 2 - t * (depth / 2 + 4) + 2, y, depth / 2 + t * (depth / 2 + 4) - 2, y, tint(SLATE, 0.98), 0.45)
        y += 2.6
    brick_wall(c, 0, 30, depth, G - 30, wall)
    c.rect(0, G - 7, depth, 7, tint(TRIM, 0.9))
    for y in (66, 102):
        c.rect(0, y - 1.5, depth, 3, tint(TRIM, 0.92))
    for x in (depth * 0.25, depth * 0.5, depth * 0.75):
        for y in (39, 75, 111):
            sash(c, x, y, 21, TRIM)
    quoins(c, 0, 30, G - 7, 1)
    quoins(c, depth, 30, G - 7, -1)
    name_band(c, -2, depth + 2, eaves, 30)


def founders_hall():
    """StartupScreen.tsx's Founders Hall elevation (440 x 214), clock tower
    and all, in its own coordinates."""
    c = Flat()
    cx, L, R = 220, 14, 426
    eaves, ridge = 108, 84
    hip = (eaves - ridge) * 2.2
    trim, tower, wall = TRIM, TOWER_STONE, BRICK
    c.line(cx, -2, cx, 9, GILT, 1.6)
    c.circ(cx, 5, 1.8, GILT)
    c.path(f"M {cx - 10} 22 A 10 13 0 0 1 {cx + 10} 22 Z", tint(VERDIGRIS, 0.9), stroke=tint(VERDIGRIS, 0.65), stroke_width="0.6")
    c.path(f"M {cx - 6} 21 A 5 10 0 0 1 {cx} 11 A 6 11 0 0 0 {cx - 2} 21 Z", tint(VERDIGRIS, 1.12))
    c.rect(cx - 13, 22, 26, 3, trim, stroke=tint(trim, 0.8), stroke_width="0.5")
    c.rect(cx - 11, 25, 22, 15, trim)
    c.path(f"M {cx - 7} 40 L {cx - 7} 31 A 7 6 0 0 1 {cx + 7} 31 L {cx + 7} 40 Z", LANTERN)
    c.path(f"M {cx - 2} 30 L {cx + 2} 30 L {cx + 3} 34 L {cx + 4.5} 36 L {cx - 4.5} 36 L {cx - 3} 34 Z", BELL)
    for x in (cx - 11, cx + 8):
        c.rect(x, 25, 3, 15, tint(trim, 1.02), stroke=tint(trim, 0.78), stroke_width="0.4")
    c.rect(cx - 14, 40, 28, 3, trim, stroke=tint(trim, 0.8), stroke_width="0.5")
    c.rect(cx - 12, 43, 24, 17, tower, stroke=tint(tower, 0.82), stroke_width="0.5")
    c.circ(cx, 51.5, 6, "#f2ede0", stroke="#2d3034", stroke_width="0.8")
    for k in range(12):
        a = k * math.pi / 6
        c.line(cx + 4.6 * math.cos(a), 51.5 + 4.6 * math.sin(a), cx + 5.4 * math.cos(a), 51.5 + 5.4 * math.sin(a), "#2d3034", 0.4)
    c.line(cx, 51.5, cx, 47.5, "#2d3034", 0.9)
    c.line(cx, 51.5, cx + 3, 52.5, "#2d3034", 0.9)
    c.rect(cx - 14, 60, 28, 3, trim, stroke=tint(trim, 0.8), stroke_width="0.5")
    brick_wall(c, cx - 11, 63, 22, eaves - 63, wall, flat=True)
    for x in (L + hip + 6, R - hip - 18):
        stack(c, x, ridge, wall)
    hip_roof(c, L, R, eaves, ridge)
    ped = 80
    for x in (cx - ped - 54, cx - ped - 24, cx + ped + 24, cx + ped + 54):
        dormer(c, x, eaves)
    brick_wall(c, 18, 108, 404, 106, wall, flat=True)
    wall_top = 140
    ranks = [wall_top + 10, wall_top + 42]
    for x in (54, 82, 110, 330, 358, 386):
        for y in ranks:
            sash(c, x, y, 20, trim)
    portico(c, cx, ped, wall_top, ranks, 202, wall, 20)
    name_band(c, 18, 422, 108, 32, "COLLEGE")
    pediment(c, cx, ped, eaves, ridge)
    hung_banner(c, 22, wall_top)
    hung_banner(c, 400, wall_top)
    return c.o


# ---------------------------------------------------------------- perspective
def facade_point(b, u, v):
    """A point on a facade in perspective. u: 0 near end .. 1 far end along
    the front; v: 0 ground .. 1 eaves (beyond 1 for the roof)."""
    d0, d1 = 1.0, b["h0"] / b["h1"]
    w0, w1 = (1 - u) / d0, u / d1
    x = (b["x0"] * w0 + b["x1"] * w1) / (w0 + w1)
    t = (x - b["x0"]) / (b["x1"] - b["x0"])
    base = lerp(b["base0"], b["base1"], t)
    top = lerp(b["base0"] - b["h0"], b["base1"] - b["h1"], t)
    return x, lerp(base, top, v)


def draw_hall(b, width, pc, flip, wall):
    """A long hall laid onto facade b; `flip` when the near end is the
    elevation's right-hand end."""
    G = 140

    def u_of(x):
        u = x / width
        return 1 - u if flip else u

    def to_screen(x, y):
        return facade_point(b, u_of(x), (G - y) / G)

    def scale_at(x):
        p0 = facade_point(b, u_of(x), 0)
        p1 = facade_point(b, u_of(x), 1)
        return (p0[1] - p1[1]) / G

    c = Projected(to_screen, scale_at)
    long_hall(c, width, pc, wall)
    out.extend(c.o)


def draw_end(b, depth, wall):
    """The near end of a hall, square on, beside its front's near corner."""
    s = b["h0"] / 140
    side = 1 if b["x1"] > b["x0"] else -1
    c = Flat()
    end_wall(c, depth, wall)
    x = b["x0"] - depth * s if side > 0 else b["x0"]
    out.append(f'<g transform="translate({f(x)},{f(b["base0"] - 140 * s)}) scale({f(s)})">' + "".join(c.o) + "</g>")


# ---------------------------------------------------------------- foliage
def foliage(cx, cy, rx, ry, n, pal=LEAF, size=(0.16, 0.32), mass=0.9, inside=None):
    """Leaf clumps shaded by where they sit against the sun (upper left);
    `inside` limits them to a silhouette."""
    if mass:
        ell(cx, cy + ry * 0.05, rx * mass, ry * mass, pal[1])
    clumps = []
    tries = 0
    while len(clumps) < n and tries < n * 8:
        tries += 1
        a = rnd.uniform(0, math.tau)
        rr = math.sqrt(rnd.random())
        x = cx + math.cos(a) * rr * rx
        y = cy + math.sin(a) * rr * ry
        if inside and not inside(x, y):
            continue
        r = rnd.uniform(*size) * min(rx, ry) * (1.15 - 0.35 * rr)
        lit = 0.6 * (cx - x) / rx + 0.8 * (cy - y) / ry
        clumps.append((y, x, r, lit))
    clumps.sort()
    for y, x, r, lit in clumps:
        t = (lit + 1) / 2 + rnd.uniform(-0.2, 0.2)
        i = max(1, min(len(pal) - 2, int(1 + t * (len(pal) - 2))))
        circ(x, y, r, pal[i])
        if t > 0.66:
            circ(x - r * 0.25, y - r * 0.3, r * 0.5, pal[-1], opacity="0.8")
        elif t < 0.3:
            circ(x + r * 0.2, y + r * 0.25, r * 0.55, pal[0], opacity="0.6")


LOBES = [(-0.42, 0.16, 0.72), (0.44, 0.20, 0.68), (0.02, -0.24, 0.86)]


def canopy_tree(x, base, h, far=False, ornamental=False):
    """trees.tsx's canopy tree, closer up: a tapered trunk, three lobes, the
    sunlit cap, and the leaves inside that outline."""
    s = h / 54
    th, tw = 22 * s, 3.0 * s
    R = 19 * s
    cy = base - th - R * 0.32
    pal = LEAF_FAR if far else LEAF
    crown, cap = (ORN, ORN_HI) if ornamental else (CROWN, CROWN_HI)
    if far:
        crown, cap = tint(crown, 1.12), tint(cap, 1.1)
    ell(x + R * 0.5, base + 1, R * 1.1, R * 0.16, "rgba(42,56,28,0.2)")
    poly([(x - tw, base), (x + tw, base), (x + tw * 0.6, base - th), (x - tw * 0.6, base - th)], TRUNK)
    poly([(x + tw * 0.2, base), (x + tw, base), (x + tw * 0.6, base - th), (x + tw * 0.1, base - th)], tint(TRUNK, 0.75))
    line(x, base - th * 0.8, x - R * 0.35, base - th - R * 0.25, TRUNK, tw * 0.5, stroke_linecap="round")
    line(x, base - th * 0.85, x + R * 0.4, base - th - R * 0.2, TRUNK, tw * 0.45, stroke_linecap="round")
    lobes = [(x + dx * R, cy + dy * R, r * R) for dx, dy, r in LOBES]
    for lx, ly, lr in lobes:
        circ(lx, ly, lr, tint(crown, 0.82))
    for lx, ly, lr in lobes:
        circ(lx - lr * 0.06, ly - lr * 0.08, lr * 0.94, crown)
    circ(x - 0.36 * R * 0.6, cy - 0.36 * R * 0.8 - R * 0.1, 0.6 * R, cap, opacity="0.85")

    def inside(px, py):
        return any((px - lx) ** 2 + (py - ly) ** 2 < (lr * 0.97) ** 2 for lx, ly, lr in lobes)

    if h > 34:
        foliage(x, cy - R * 0.05, R * 1.15, R * 1.0, int(18 + h * 0.55), pal, size=(0.11, 0.2), mass=0, inside=inside)


# ---------------------------------------------------------------- sky
def sky():
    defs.append(
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#1667d9"/><stop offset="0.45" stop-color="#3b8ff0"/>'
        '<stop offset="0.72" stop-color="#8cc4f2"/><stop offset="1" stop-color="#d7ecf7"/></linearGradient>'
        '<linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#a9c784"/><stop offset="0.3" stop-color="#8fb86a"/>'
        '<stop offset="1" stop-color="#5f8f45"/></linearGradient>'
        '<radialGradient id="glow" cx="0.5" cy="0.62" r="0.5">'
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
        '<radialGradient id="puff" cx="0.38" cy="0.32" r="0.75">'
        '<stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f4f8fc"/>'
        '<stop offset="1" stop-color="#bcd2ea"/></radialGradient>'
        f'<linearGradient id="column" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{tint(TRIM, 0.9)}"/><stop offset="0.3" stop-color="#fbf8ef"/>'
        f'<stop offset="0.65" stop-color="{TRIM}"/><stop offset="1" stop-color="{tint(TRIM, 0.74)}"/></linearGradient>'
        '<pattern id="brick" width="8" height="3.2" patternUnits="userSpaceOnUse">'
        '<path d="M0 3.05H8M0 1.45H8M2 0V1.45M6 1.6V3.05" stroke="rgba(90,36,22,0.16)" stroke-width="0.3" fill="none"/>'
        '<rect x="4.2" y="0.1" width="3.6" height="1.25" fill="rgba(255,236,210,0.07)"/></pattern>'
        f'<radialGradient id="globe" cx="0.38" cy="0.35" r="0.7">'
        f'<stop offset="0" stop-color="#fffbe9"/><stop offset="0.6" stop-color="{LAMP_GLOBE}"/>'
        f'<stop offset="1" stop-color="{tint(LAMP_GLOBE, 0.82)}"/></radialGradient>'
    )
    rect(0, 0, W, HORIZON + 20, "url(#sky)")
    ell(VP[0], 560, 700, 260, "url(#glow)")


def cumulus(cx, cy, w, h, puffs):
    base = []
    for _ in range(puffs):
        x = cx + rnd.uniform(-0.5, 0.5) * w
        top = 1 - abs((x - cx) / (w / 2)) ** 1.5
        r = rnd.uniform(0.35, 0.6) * h * (0.45 + 0.55 * top)
        y = cy + h * 0.25 - r * rnd.uniform(0.3, 0.9) * top
        base.append((x, y, r))
    ell(cx, cy + h * 0.28, w * 0.55, h * 0.16, "#c3d7ec")
    for x, y, r in sorted(base, key=lambda p: -p[1]):
        circ(x, y, r, "url(#puff)")
    for x, y, r in base:
        if rnd.random() < 0.5:
            circ(x + rnd.uniform(-0.5, 0.5) * r, y - r * 0.75, r * rnd.uniform(0.25, 0.4), "url(#puff)")


def wisp(x, y, w, h, angle=-12, op=0.8):
    out.append(f'<g transform="rotate({angle} {f(x)} {f(y)})" opacity="{op}">')
    for _ in range(14):
        ell(x + rnd.uniform(-0.45, 0.45) * w, y + rnd.uniform(-h, h) * 0.5,
            w * rnd.uniform(0.06, 0.16), h * rnd.uniform(0.08, 0.2), "#f2f7fc", opacity="0.7")
    out.append("</g>")


# ---------------------------------------------------------------- ground
def lawn():
    rect(0, HORIZON, W, H - HORIZON, "url(#lawn)")
    for i in range(-11, 12):  # mowing stripes running down the quad
        if i % 2:
            continue
        x0, x1 = VP[0] + i * 22, VP[0] + (i + 1) * 22
        poly([(x0, HORIZON + 6), (x1, HORIZON + 6), (VP[0] + (i + 1) * 300, H), (VP[0] + i * 300, H)], "#ffffff", opacity="0.05")
    for _ in range(700):  # turf flecks, larger near the viewer
        y = rnd.uniform(650, H)
        k = (y - 640) / (H - 640)
        x = rnd.uniform(0, W)
        line(x, y, x + rnd.uniform(-1, 1) * k * 3, y - (1 + 5 * k), "rgba(42,56,28,0.16)" if rnd.random() < 0.7 else "rgba(255,255,255,0.12)",
             0.6 + k * 1.2, stroke_linecap="round")


def perspective_ts(n, a=0.32):
    """Fractions along a walk receding from the viewer (0) to the far end (1),
    spaced as paving joints are."""
    raw = [1 - 1 / (1 + a * k) for k in range(n + 1)]
    return [r / raw[-1] for r in raw]


def walk(nearL, nearR, farL, farR, longs=4, trans=34, a=0.32, kerb=True):
    """A paved walk (pathways.tsx): the fill, a kerb where it stops, and the
    joints between slabs, longways and across, in perspective."""
    pts = [nearL, nearR, farR, farL]
    cid = nid("w")
    defs.append(f'<clipPath id="{cid}"><polygon points="{" ".join(f"{f(x)},{f(y)}" for x, y in pts)}"/></clipPath>')
    if kerb:
        poly([(x + (2 if i in (1, 2) else -2), y + 1.5) for i, (x, y) in enumerate(pts)], KERB)
    poly(pts, PAVING)
    out.append(f'<g clip-path="url(#{cid})">')
    for j in range(1, longs):
        t = j / longs
        p, q = (lerp(nearL[0], nearR[0], t), lerp(nearL[1], nearR[1], t)), (lerp(farL[0], farR[0], t), lerp(farL[1], farR[1], t))
        line(*p, *q, JOINT, 1)
    for t in perspective_ts(trans, a)[1:-1]:
        l = (lerp(nearL[0], farL[0], t), lerp(nearL[1], farL[1], t))
        r = (lerp(nearR[0], farR[0], t), lerp(nearR[1], farR[1], t))
        line(*l, *r, JOINT, max(0.5, 1.4 * (1 - t)))
    # wear down the middle, and a little shade at the far edge
    poly([lerp_pt(nearL, nearR, 0.3), lerp_pt(nearL, nearR, 0.7), lerp_pt(farL, farR, 0.6), lerp_pt(farL, farR, 0.4)],
         "#ffffff", opacity="0.08")
    out.append("</g>")


def lerp_pt(p, q, t):
    return (lerp(p[0], q[0], t), lerp(p[1], q[1], t))


def walks():
    # the cross walks near the far end
    walk((330, 696), (1450, 696), (346, 688), (1434, 688), longs=1, trans=60, a=0.05, kerb=False)
    walk((560, 664), (1220, 664), (566, 660), (1214, 660), longs=1, trans=40, a=0.05, kerb=False)
    # the two diagonals to the far end, and the near walk across the bottom
    walk((225, 884), (430, 884), (VP[0] - 92, 650), (VP[0] - 70, 650), longs=4, trans=30)
    walk((1440, 806), (1720, 806), (VP[0] + 70, 650), (VP[0] + 92, 650), longs=4, trans=26)
    walk((0, 884), (760, 884), (0, 838), (680, 830), longs=2, trans=6, a=0.2)
    walk((1250, 884), (1779, 884), (1240, 862), (1779, 812), longs=2, trans=6, a=0.2)
    # the round plaza before the far hall, with the Grand Quad's fountain
    ell(VP[0], 656, 112, 13, KERB)
    ell(VP[0], 655, 110, 12, "#cfc5aa")
    fountain(VP[0], 655, 30)
    flag(VP[0] - 78, 652, 64)


def fountain(cx, cy, r):
    """groundMarkings.tsx's fountain, seen low: kerb, water, the raised
    basin, the spray ring and the jet."""
    ell(cx, cy + 1, r * 1.04, r * 0.2, tint("#d8cfb4", 0.8))
    ell(cx, cy, r, r * 0.19, "#d8cfb4")
    ell(cx, cy + 0.4, r * 0.84, r * 0.15, "#7fb2c9")
    ell(cx - r * 0.2, cy, r * 0.3, r * 0.04, "#ffffff", opacity="0.4")
    rect(cx - r * 0.12, cy - r * 0.3, r * 0.24, r * 0.3, "#d8cfb4")
    ell(cx, cy - r * 0.3, r * 0.3, r * 0.07, "#5f96b0", stroke="#d8cfb4", stroke_width="1")
    ell(cx, cy - r * 0.34, r * 0.36, r * 0.1, "rgba(246,252,255,0.34)")
    poly([(cx - 2.2, cy - r * 0.32), (cx + 2.2, cy - r * 0.32), (cx + 0.8, cy - r * 1.45), (cx - 0.8, cy - r * 1.45)],
         "rgba(246,252,255,0.86)")
    circ(cx, cy - r * 1.48, 2.2, "rgba(246,252,255,0.7)")


def along(b, t, out_by):
    """A point on the ground along a hall's front, `out_by` (in near-end
    pixels) out from the wall toward the quad, at fraction t of its length."""
    x, y = facade_point(b, t, 0)
    s = lerp(b["h0"], b["h1"], (x - b["x0"]) / (b["x1"] - b["x0"])) / b["h0"]
    side = 1 if b["x1"] > b["x0"] else -1
    return x + side * out_by * s * 0.55, y + out_by * s * 0.32, s


def hedge_and_border(b, gaps):
    """The clipped box hedge along a hall's front and the flower border before
    it (groundMarkings.tsx), broken for the portico steps."""
    n = 80
    ts = [i / n for i in range(n + 1)]
    for i in range(n):
        t0, t1 = ts[i], ts[i + 1]
        tm = (t0 + t1) / 2
        if any(g0 < tm < g1 for g0, g1 in gaps):
            continue
        a0 = along(b, t0, 26)
        a1 = along(b, t1, 26)
        hh0, hh1 = 26 * a0[2], 26 * a1[2]
        poly([(a0[0], a0[1]), (a1[0], a1[1]), (a1[0], a1[1] - hh1), (a0[0], a0[1] - hh0)], HEDGE_SIDE)
        c0, c1 = along(b, t0, 38), along(b, t1, 38)
        poly([(a0[0], a0[1] - hh0), (a1[0], a1[1] - hh1), (c1[0], c1[1] - hh1 * 0.92), (c0[0], c0[1] - hh0 * 0.92)], HEDGE_TOP)
    # the face catches a little light on its clipped top edge
    for i in range(n):
        tm = (ts[i] + ts[i + 1]) / 2
        if any(g0 < tm < g1 for g0, g1 in gaps):
            continue
        a0, a1 = along(b, ts[i], 26), along(b, ts[i + 1], 26)
        line(a0[0], a0[1] - 26 * a0[2], a1[0], a1[1] - 26 * a1[2], tint(HEDGE_TOP, 1.15), 1.2 * a0[2])
    # the border: soil, then blooms in two staggered rows
    for i in range(n):
        t0, t1 = ts[i], ts[i + 1]
        tm = (t0 + t1) / 2
        if any(g0 < tm < g1 for g0, g1 in gaps):
            continue
        p0, p1 = along(b, t0, 26), along(b, t1, 26)
        q0, q1 = along(b, t0, 60), along(b, t1, 60)
        poly([p0[:2], p1[:2], q1[:2], q0[:2]], SOIL)
        for row, off in ((0, 34), (1, 50)):
            for k in range(3):
                t = lerp(t0, t1, (k + 0.5 * row + rnd.uniform(0, 0.4)) / 3)
                px, py, s = along(b, t, off + rnd.uniform(-3, 3))
                r = rnd.uniform(3.2, 4.6) * s
                c = BLOOMS[(i * 3 + k + row) % 4] if rnd.random() < 0.8 else rnd.choice(BLOOMS)
                ell(px, py - r * 0.4, r, r * 0.8, tint(c, 0.8))
                ell(px - r * 0.15, py - r * 0.55, r * 0.7, r * 0.55, c)
                circ(px - r * 0.1, py - r * 0.55, r * 0.22, "#f6e27a" if c != BLOOMS[1] else "#a8661e")
        for k in range(4):  # leaves among the blooms
            t = lerp(t0, t1, rnd.random())
            px, py, s = along(b, t, rnd.uniform(30, 56))
            ell(px, py, 3.5 * s, 2.2 * s, "#4f7a3c", opacity="0.85")


# ---------------------------------------------------------------- props
def lamp(x, base, h, banner=False, flip=False):
    """dressing.tsx's lamp, closer up: a post, a collar, the globe; on a
    commencement week, a banner in the school's colours on a bracket."""
    s = h / 120
    ell(x + 6 * s, base + 1.5 * s, 9 * s, 2.2 * s, "rgba(0,0,0,0.2)")
    poly([(x - 6 * s, base), (x + 6 * s, base), (x + 4.5 * s, base - 8 * s), (x - 4.5 * s, base - 8 * s)], LAMP_IRON)
    rect(x - 3 * s, base - 14 * s, 6 * s, 6 * s, tint(LAMP_IRON, 1.15))
    poly([(x - 2.2 * s, base - 14 * s), (x + 2.2 * s, base - 14 * s), (x + 1.4 * s, base - h + 14 * s), (x - 1.4 * s, base - h + 14 * s)],
         LAMP_IRON)
    line(x - 0.6 * s, base - 14 * s, x - 0.4 * s, base - h + 14 * s, tint(LAMP_IRON, 1.6), 0.6 * s)
    rect(x - 3.5 * s, base - h + 10 * s, 7 * s, 4 * s, LAMP_IRON)
    poly([(x - 3 * s, base - h + 10 * s), (x + 3 * s, base - h + 10 * s), (x + 5 * s, base - h + 6 * s), (x - 5 * s, base - h + 6 * s)], LAMP_IRON)
    circ(x, base - h, 7 * s, "url(#globe)", stroke=LAMP_IRON, stroke_width=f(1 * s))
    ell(x - 2.4 * s, base - h - 2.5 * s, 2 * s, 1.4 * s, "#ffffff", opacity="0.7")
    poly([(x - 3 * s, base - h - 6.5 * s), (x + 3 * s, base - h - 6.5 * s), (x, base - h - 11 * s)], LAMP_IRON)
    if banner:
        d = -1 if flip else 1
        bt, bb = base - h * 0.82, base - h * 0.42
        line(x, bt, x + d * 16 * s, bt, LAMP_IRON, 1.2 * s)
        line(x, bb + 2 * s, x + d * 16 * s, bb + 2 * s, LAMP_IRON, 1 * s)
        bx0, bx1 = x + d * 2 * s, x + d * 15 * s
        lo, hi = min(bx0, bx1), max(bx0, bx1)
        poly([(lo, bt), (hi, bt), (hi, bb), (lo, bb)], PRIMARY)
        poly([(lo + (hi - lo) * 0.55, bt), (hi, bt), (hi, bb), (lo + (hi - lo) * 0.55, bb)], tint(PRIMARY, 0.84), opacity="0.6")
        ys = lerp(bt, bb, 0.62), lerp(bt, bb, 0.78)
        poly([(lo, ys[0]), (hi, ys[0]), (hi, ys[1]), (lo, ys[1])], SECONDARY)
        # the mark, small, on the cloth
        mx, my, mw = (lo + hi) / 2, lerp(bt, bb, 0.3), (hi - lo) * 0.6
        poly([(mx - mw / 2, my), (mx, my - mw * 0.32), (mx + mw / 2, my)], SECONDARY)
        for k in (-0.3, 0, 0.3):
            rect(mx + k * mw - mw * 0.07, my + 0.8 * s, mw * 0.14, mw * 0.55, SECONDARY)
        rect(mx - mw / 2, my + mw * 0.62, mw, mw * 0.1, SECONDARY)


def bench(x, y, s=1.0, flip=False):
    """dressing.tsx's bench, three-quarter on: three seat slats, two back
    slats, the apron, and the cast-iron ends drawn as lines."""
    d = -1 if flip else 1

    def X(v):
        return x + d * v * s

    ell(X(100), y + 150 * s, 120 * s, 10 * s, "rgba(0,0,0,0.18)")
    iron = dict(stroke=CAST_IRON, stroke_width=f(7 * s), stroke_linecap="round", stroke_linejoin="round")
    # back legs and uprights behind the slats
    for lx in (12, 172):
        path(f"M {f(X(lx + 16))} {f(y + 146 * s)} L {f(X(lx + 10))} {f(y + 70 * s)} L {f(X(lx + 2))} {f(y - 4 * s)}", "none", **iron)
    for i, (t0, t1) in enumerate(((0.0, 0.28), (0.4, 0.68))):
        poly([(X(0), y + t0 * 66 * s), (X(196), y + t0 * 66 * s), (X(196), y + t1 * 66 * s), (X(0), y + t1 * 66 * s)], BACK,
             stroke=BENCH_EDGE, stroke_width=f(1.2 * s))
        line(X(4), y + (t0 * 66 + 3) * s, X(192), y + (t0 * 66 + 3) * s, tint(BACK, 1.15), 1.6 * s)
    for i in range(3):
        y0 = y + (72 + i * 11) * s
        poly([(X(-8 + i * 6), y0), (X(204 + i * 6), y0), (X(206 + i * 6), y0 + 8 * s), (X(-6 + i * 6), y0 + 8 * s)], SEAT,
             stroke=BENCH_EDGE, stroke_width=f(1 * s))
        line(X(-4 + i * 6), y0 + 1.6 * s, X(200 + i * 6), y0 + 1.6 * s, tint(SEAT, 1.18), 1.2 * s)
    poly([(X(-6 + 12), y + 105 * s), (X(206 + 12), y + 105 * s), (X(206 + 12), y + 113 * s), (X(-6 + 12), y + 113 * s)], APRON)
    # front legs, arms with a scroll, the rail under the seat
    for lx in (2, 184):
        path(f"M {f(X(lx + 20))} {f(y + 150 * s)} L {f(X(lx + 14))} {f(y + 74 * s)} "
             f"C {f(X(lx + 10))} {f(y + 56 * s)} {f(X(lx - 6))} {f(y + 50 * s)} {f(X(lx - 2))} {f(y + 40 * s)} "
             f"C {f(X(lx + 2))} {f(y + 32 * s)} {f(X(lx + 12))} {f(y + 36 * s)} {f(X(lx + 8))} {f(y + 44 * s)}", "none", **iron)
        circ(X(lx + 20), y + 150 * s, 4.5 * s, CAST_IRON)
    line(X(10), y + 122 * s, X(212), y + 122 * s, CAST_IRON, 5 * s)


def person(x, base, h, shirt, trousers, hair, pack=None, stride=0.0, long_hair=False, facing=0, book=False):
    """Walkers.tsx's walker at title size: stroked legs in trouser colour,
    the shirt with its rounded shoulders, one skin tone, hair; a backpack or a
    book for the students walking to class."""
    s = h / 160
    ell(x + 10 * s, base + 2 * s, 30 * s, 6 * s, "rgba(0,0,0,0.2)")
    legw = 15 * s
    hip = base - 70 * s
    for side, ph in ((-1, stride), (1, -stride)):
        fx = x + side * 7 * s + ph * 18 * s
        line(x + side * 7 * s, hip, fx, base - 6 * s, trousers if side < 0 else tint(trousers, 0.88), legw, stroke_linecap="round")
        ell(fx + 3 * s * (1 if facing >= 0 else -1), base - 2 * s, 9.5 * s, 4.5 * s, "#efe9de")
        ell(fx + 3 * s * (1 if facing >= 0 else -1), base, 9.5 * s, 2 * s, "#9c958a")
    for side in (-1, 1):  # arms swinging
        line(x + side * 15 * s, base - 124 * s, x + side * 18 * s - stride * side * 8 * s, base - 76 * s, shirt, 10 * s,
             stroke_linecap="round")
        circ(x + side * 18 * s - stride * side * 8 * s, base - 72 * s, 5 * s, SKIN)
    path(f"M {f(x - 17 * s)} {f(hip + 4 * s)} L {f(x - 17 * s)} {f(base - 118 * s)} "
         f"Q {f(x - 17 * s)} {f(base - 132 * s)} {f(x)} {f(base - 133 * s)} "
         f"Q {f(x + 17 * s)} {f(base - 132 * s)} {f(x + 17 * s)} {f(base - 118 * s)} L {f(x + 17 * s)} {f(hip + 4 * s)} Z", shirt)
    rect(x - 17 * s, hip - 1 * s, 34 * s, 6 * s, tint(trousers, 0.8))
    line(x + 6 * s, base - 128 * s, x + 6 * s, hip, tint(shirt, 0.85), 3 * s)
    circ(x, base - 146 * s, 12 * s, SKIN)
    rect(x - 5 * s, base - 137 * s, 10 * s, 6 * s, tint(SKIN, 0.9))
    if facing == 0:  # seen from behind: the back of the head is hair
        circ(x, base - 147 * s, 12.4 * s, hair)
    else:
        path(f"M {f(x - 12 * s)} {f(base - 146 * s)} A {f(12.4 * s)} {f(12.4 * s)} 0 0 1 {f(x + 12 * s)} {f(base - 148 * s)} "
             f"L {f(x - facing * 2 * s)} {f(base - 150 * s)} Z", hair)
    if long_hair:
        rect(x - 12 * s, base - 148 * s, 24 * s, 30 * s, hair, rx=f(8 * s))
    if pack:
        rect(x - 14 * s, base - 126 * s, 28 * s, 42 * s, pack, rx=f(7 * s))
        rect(x - 11 * s, base - 104 * s, 22 * s, 13 * s, tint(pack, 1.2), rx=f(4 * s))
        line(x - 9 * s, base - 128 * s, x - 11 * s, base - 120 * s, tint(pack, 0.7), 3 * s)
        line(x + 9 * s, base - 128 * s, x + 11 * s, base - 120 * s, tint(pack, 0.7), 3 * s)
    if book:
        rect(x + 14 * s, base - 100 * s, 7 * s, 26 * s, "#3d6a9c")
        rect(x + 14 * s, base - 100 * s, 7 * s, 3 * s, "#f2ede2")


def sitter(x, base, h, shirt, trousers, hair, reading=False, facing=1):
    s = h / 100
    ell(x, base + 1 * s, 30 * s, 5 * s, "rgba(0,0,0,0.18)")
    line(x, base - 8 * s, x + facing * 26 * s, base - 6 * s, trousers, 12 * s, stroke_linecap="round")
    line(x + facing * 22 * s, base - 8 * s, x + facing * 34 * s, base - 3 * s, trousers, 11 * s, stroke_linecap="round")
    path(f"M {f(x - 13 * s)} {f(base - 4 * s)} L {f(x - 13 * s)} {f(base - 46 * s)} Q {f(x)} {f(base - 58 * s)} "
         f"{f(x + 13 * s)} {f(base - 46 * s)} L {f(x + 13 * s)} {f(base - 4 * s)} Z", shirt)
    circ(x + facing * 2 * s, base - 66 * s, 11 * s, SKIN)
    path(f"M {f(x - 11 * s)} {f(base - 64 * s)} A {f(11.5 * s)} {f(11.5 * s)} 0 0 1 {f(x + 13 * s)} {f(base - 68 * s)} Z", hair)
    if reading:
        poly([(x + facing * 10 * s, base - 40 * s), (x + facing * 26 * s, base - 46 * s), (x + facing * 26 * s, base - 30 * s),
              (x + facing * 10 * s, base - 26 * s)], "#f2ede2")
        line(x + facing * 18 * s, base - 43 * s, x + facing * 18 * s, base - 28 * s, "#c9bfa8", 0.8 * s)
    line(x + facing * 4 * s, base - 44 * s, x + facing * 16 * s, base - 30 * s, shirt, 8 * s, stroke_linecap="round")


def blanket(x, y, w, h):
    poly([(x, y), (x + w, y - h * 0.2), (x + w * 1.08, y + h * 0.8), (x + w * 0.06, y + h)], "#d9566a", opacity="0.9")
    for k in range(1, 4):
        t = k / 4
        line(lerp(x, x + w, t), lerp(y, y - h * 0.2, t), lerp(x + w * 0.06, x + w * 1.08, t), lerp(y + h, y + h * 0.8, t),
             "#f2ede2", 1.4, opacity="0.7")


def flag(x, base, h):
    """The flag before Founders Hall (dressing.tsx): a pale pole, a gilt
    finial, the primary cloth with a secondary inset."""
    line(x, base, x, base - h, "#d8d4c8", 1.4)
    circ(x, base - h - 1.2, 1.4, "#d9b44a")
    top = base - h + 2
    path(f"M {f(x)} {f(top)} C {f(x + 9)} {f(top - 3)} {f(x + 15)} {f(top + 3)} {f(x + 24)} {f(top)} "
         f"L {f(x + 24)} {f(top + 14)} C {f(x + 15)} {f(top + 17)} {f(x + 9)} {f(top + 11)} {f(x)} {f(top + 14)} Z", PRIMARY)
    path(f"M {f(x + 2)} {f(top + 2)} C {f(x + 6)} {f(top + 1)} {f(x + 8)} {f(top + 3)} {f(x + 11)} {f(top + 2)} "
         f"L {f(x + 11)} {f(top + 8)} C {f(x + 8)} {f(top + 9)} {f(x + 6)} {f(top + 7)} {f(x + 2)} {f(top + 8)} Z", SECONDARY)


# ---------------------------------------------------------------- the scene
def scene():
    sky()
    wisp(1420, 70, 300, 50, -10, 0.9)
    wisp(1520, 120, 220, 34, -12, 0.75)
    wisp(1210, 225, 260, 26, -14, 0.8)
    wisp(1080, 285, 120, 14, -10, 0.6)
    wisp(720, 395, 140, 12, -6, 0.55)
    cumulus(420, 360, 420, 230, 26)
    cumulus(620, 470, 340, 150, 18)
    cumulus(770, 520, 220, 70, 12)
    cumulus(1230, 430, 420, 190, 24)
    cumulus(1560, 300, 420, 260, 26)
    cumulus(1000, 520, 240, 70, 12)

    # far end: the Founders Hall at the head of the avenue, the trees closing on it
    for i in range(16):
        t = i / 15
        for side in (-1, 1):
            x = VP[0] + side * lerp(330, 92, t ** 0.8) + rnd.uniform(-6, 6)
            canopy_tree(x, lerp(652, 641, t), lerp(140, 56, t), far=True, ornamental=(i % 4 == 2))
    s = 0.45
    out.append(f'<g transform="translate({f(VP[0] - 220 * s)},{f(646 - 214 * s)}) scale({s})">' + "".join(founders_hall()) + "</g>")

    # the two halls facing across the quad
    left = dict(x0=150, x1=540, base0=642, base1=618, h0=290, h1=158)
    right = dict(x0=1740, x1=1300, base0=646, base1=618, h0=300, h1=160)
    # the left hall faces away from the sun, the right one into it (light.ts)
    draw_end(left, 150, BRICK)
    draw_hall(left, 560, 358, False, tint(BRICK, 0.92))
    draw_end(right, 150, tint(BRICK, 1.04))
    draw_hall(right, 560, 176, True, tint(BRICK, 1.04))

    lawn()
    # each hall's shadow on the turf before it
    poly([facade_point(left, 0, 0), facade_point(left, 1, 0), (facade_point(left, 1, 0)[0] + 70, 622), (310, 668)],
         "rgba(42,56,28,0.12)")
    walks()
    hedge_and_border(left, [(0.555, 0.725)])
    hedge_and_border(right, [(0.6, 0.77)])

    # the avenue trees, far to near
    for (x, base, h) in [(775, 643, 130), (995, 644, 130), (700, 645, 152), (1070, 647, 156),
                         (610, 648, 178), (1160, 650, 186), (520, 652, 200), (1250, 654, 210)]:
        canopy_tree(x, base, h)
    canopy_tree(255, 664, 222)
    canopy_tree(1470, 666, 222)

    # lamps along the walks, some with commencement banners
    lamp(500, 656, 74)
    lamp(1282, 652, 80, flip=True)
    lamp(679, 664, 102, banner=True)
    lamp(1108, 668, 108, banner=True, flip=True)
    lamp(276, 668, 96)
    lamp(1530, 688, 128, banner=True, flip=True)

    # small benches by the walks
    bench(735, 660, 0.12)
    bench(1010, 661, 0.12, flip=True)
    bench(1340, 702, 0.2, flip=True)

    # students
    rs = random.Random(3)

    def look():
        return rs.choice(SHIRTS), rs.choice(TROUSERS), rs.choice(HAIR)

    person(1052, 652, 24, *look())
    person(1196, 656, 30, *look(), pack="#2b2f36")
    person(812, 660, 26, *look(), facing=1)
    person(565, 684, 70, *look(), pack="#3d4a5c", stride=0.3)
    blanket(1238, 694, 70, 14)
    sitter(1262, 698, 44, "#3d6a9c", "#34363f", "#2a1d16", reading=True)
    sitter(1296, 700, 42, "#f2ede2", "#4a4f5c", "#8a5a2b", facing=-1)
    sitter(452, 720, 46, "#e0b64a", "#2f3b4f", "#3a2618", reading=True, facing=-1)
    person(330, 732, 150, "#3d6a9c", "#34363f", "#2a1d16", pack="#2b2f36", stride=0.35)
    person(392, 736, 146, "#f2ede2", "#2f3b4f", "#3a2618", pack="#5b8a5b", stride=-0.3, long_hair=True)
    person(1420, 750, 172, "#c94b4b", "#2f3b4f", "#1d1a18", pack="#2b2f36", stride=0.25, book=True)
    person(1580, 704, 96, "#8c5a9c", "#4a4f5c", "#5b3a22", stride=-0.3, facing=-1)

    # the near lamps
    lamp(110, 716, 400, banner=True)
    lamp(1702, 740, 300, banner=True, flip=True)

    # foreground planting: hedges with flowers, bottom left and right
    for (x, y, w, h) in [(60, 770, 220, 150), (170, 866, 270, 120), (1720, 826, 220, 160), (1640, 884, 270, 100)]:
        foliage(x, y, w / 2, h / 2, int(w * 0.9), LEAF, size=(0.12, 0.22), mass=0.85)
    for (cx, cy, rx, ry, n) in [(150, 820, 120, 50, 26), (1650, 840, 110, 50, 22)]:
        for _ in range(n):
            a = rnd.uniform(0, math.tau)
            px, py = cx + math.cos(a) * rx * rnd.random(), cy + math.sin(a) * ry * rnd.random()
            c = rnd.choice(BLOOMS)
            circ(px, py, rnd.uniform(4, 6.5), tint(c, 0.85))
            circ(px - 1, py - 1.2, rnd.uniform(2.6, 4), c)

    # the big trees framing the top corners
    poly([(0, 0), (64, 0), (60, 380), (0, 400)], TRUNK)
    poly([(36, 0), (64, 0), (60, 380), (40, 384)], tint(TRUNK, 0.75))
    for yy in range(20, 380, 26):
        path(f"M {f(8 + rnd.uniform(0, 30))} {f(yy)} q 6 {f(rnd.uniform(6, 14))} 0 {f(rnd.uniform(14, 22))}", "none",
             stroke=tint(TRUNK, 0.65), stroke_width="2", stroke_linecap="round")
    path("M0,40 C120,60 220,120 330,30 L360,60 C240,150 120,110 0,110Z", TRUNK)
    path("M0,72 C120,92 220,140 345,46 L360,60 C240,150 120,110 0,110Z", tint(TRUNK, 0.72))
    path("M20,300 C60,230 90,190 160,170 L170,190 C110,215 80,250 60,320Z", TRUNK)
    path("M180,96 C260,80 330,110 460,60 L466,72 C340,124 260,98 186,110Z", TRUNK)
    foliage(330, 40, 470, 120, 900, size=(0.05, 0.11), mass=0.55)
    foliage(60, 260, 110, 130, 320, size=(0.06, 0.12), mass=0.6)
    foliage(700, 70, 160, 80, 360, size=(0.06, 0.12), mass=0)
    foliage(330, 200, 120, 55, 200, size=(0.07, 0.14), mass=0)
    foliage(560, 150, 90, 45, 130, size=(0.08, 0.15), mass=0)
    rect(1745, 0, 40, 330, TRUNK)
    rect(1760, 0, 25, 330, tint(TRUNK, 0.75))
    path("M1779,90 C1700,110 1640,60 1580,0 L1620,0 C1660,40 1710,70 1779,60Z", TRUNK)
    foliage(1650, 70, 200, 140, 620, size=(0.05, 0.11), mass=0.6)
    foliage(1730, 330, 100, 150, 320, size=(0.06, 0.12), mass=0.6)
    foliage(1500, 30, 110, 55, 180, size=(0.07, 0.14), mass=0)

    bench(40, 712)


scene()
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice">'
    + "<defs>" + "".join(defs) + "</defs>"
    + "".join(out)
    + "</svg>"
)
open(sys.argv[1], "w").write(svg)
print(len(svg), "bytes,", len(out) + len(defs), "elements")

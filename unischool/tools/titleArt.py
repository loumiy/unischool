"""Generate a vector take on the UniSchool title art (the quad between two halls).

Run: python3 tools/titleArt.py src/assets/campus-quad.svg
Seeded, so the same SVG comes out every time.
"""
import math
import random
import sys

W, H = 1779, 884
HORIZON = 628
VP = (884, 612)  # vanishing point, just above the far lawn

rnd = random.Random(7)
out = []


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def poly(pts, fill, extra=""):
    d = " ".join(f"{f(x)},{f(y)}" for x, y in pts)
    out.append(f'<polygon points="{d}" fill="{fill}"{extra}/>')


def rect(x, y, w, h, fill, extra=""):
    out.append(f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" fill="{fill}"{extra}/>')


def circ(x, y, r, fill, extra=""):
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}"{extra}/>')


def ell(x, y, rx, ry, fill, extra=""):
    out.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{extra}/>')


def path(d, fill, extra=""):
    out.append(f'<path d="{d}" fill="{fill}"{extra}/>')


def lerp(a, b, t):
    return a + (b - a) * t


# ---------------------------------------------------------------- palette
LEAF = ["#1f5a2a", "#2e7a33", "#46963b", "#6fb443", "#a6d25a"]
LEAF_FAR = ["#3f7d45", "#4f9150", "#69a95c", "#8cc372", "#b5dc8f"]
BRICK, BRICK_SHADE, BRICK_LIGHT = "#b5553f", "#8e3f30", "#c9694f"
STONE, STONE_SHADE = "#efe6d2", "#c9bda4"
ROOF, ROOF_SHADE = "#5f6877", "#4a5260"
GLASS, GLASS_LIGHT = "#2c3f5c", "#c9dcef"


# ---------------------------------------------------------------- foliage
def foliage(cx, cy, rx, ry, n, pal=LEAF, size=(0.16, 0.32), light=(-0.6, -0.8), mass=0.9):
    """A canopy: a dark mass, then leaf clumps shaded by where they sit
    relative to the light (upper left). mass 0 leaves gaps for the sky."""
    if mass:
        ell(cx, cy + ry * 0.05, rx * mass, ry * mass, pal[0])
    clumps = []
    for _ in range(n):
        a = rnd.uniform(0, math.tau)
        rr = math.sqrt(rnd.random())
        x = cx + math.cos(a) * rr * rx
        y = cy + math.sin(a) * rr * ry
        r = rnd.uniform(*size) * min(rx, ry) * (1.15 - 0.35 * rr)
        lit = -((x - cx) / rx * light[0] + (y - cy) / ry * light[1])  # -1 shade .. 1 lit
        clumps.append((y, x, r, lit))
    clumps.sort()
    for y, x, r, lit in clumps:
        t = (lit + 1) / 2 + rnd.uniform(-0.18, 0.18)
        i = max(1, min(len(pal) - 2, int(1 + t * (len(pal) - 2))))
        circ(x, y, r, pal[i])
        if t > 0.62:  # sun-struck tips
            circ(x - r * 0.25, y - r * 0.3, r * 0.45, pal[-1], ' opacity="0.85"')


def tree(x, base, h, pal=LEAF, trunk="#5a3d26", n=None):
    """A free-standing tree: trunk, then a crown about 70% of its height."""
    tw = max(2.0, h * 0.045)
    rect(x - tw / 2, base - h * 0.45, tw, h * 0.45, trunk)
    ell(x, base, h * 0.2, h * 0.025, "#2d5a22", ' opacity="0.35"')
    foliage(x, base - h * 0.62, h * 0.34, h * 0.32, n or max(14, int(h / 2.2)), pal, size=(0.1, 0.2), mass=0.8)


def bush(x, y, w, h, pal=LEAF):
    foliage(x, y, w / 2, h / 2, max(10, int(w / 4)), pal, size=(0.16, 0.3), mass=0.85)


# ---------------------------------------------------------------- sky
def sky():
    out.append(
        '<defs>'
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#1667d9"/><stop offset="0.45" stop-color="#3b8ff0"/>'
        '<stop offset="0.72" stop-color="#8cc4f2"/><stop offset="1" stop-color="#d7ecf7"/></linearGradient>'
        '<linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#8fca52"/><stop offset="0.35" stop-color="#6db43f"/>'
        '<stop offset="1" stop-color="#3f8d2f"/></linearGradient>'
        '<linearGradient id="path" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#e9e2cf"/><stop offset="1" stop-color="#d8cdb3"/></linearGradient>'
        '<radialGradient id="glow" cx="0.5" cy="0.62" r="0.5">'
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
        '<radialGradient id="puff" cx="0.38" cy="0.32" r="0.75">'
        '<stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f4f8fc"/>'
        '<stop offset="1" stop-color="#bcd2ea"/></radialGradient>'
        '</defs>'
    )
    rect(0, 0, W, HORIZON + 20, "url(#sky)")
    ell(VP[0], 560, 700, 260, "url(#glow)")


def cumulus(cx, cy, w, h, puffs):
    """A cumulus bank: shaded underside, white puffs, a bright rim."""
    base = []
    for _ in range(puffs):
        x = cx + rnd.uniform(-0.5, 0.5) * w
        top = 1 - abs((x - cx) / (w / 2)) ** 1.5  # taller in the middle
        r = rnd.uniform(0.35, 0.6) * h * (0.45 + 0.55 * top)
        y = cy + h * 0.25 - r * rnd.uniform(0.3, 0.9) * top
        base.append((x, y, r))
    # the flat, shaded base the puffs sit on
    ell(cx, cy + h * 0.28, w * 0.55, h * 0.16, "#c3d7ec")
    for x, y, r in sorted(base, key=lambda p: -p[1]):
        circ(x, y, r, "url(#puff)")
    # small crisp puffs along the top edge
    for x, y, r in base:
        if rnd.random() < 0.5:
            circ(x + rnd.uniform(-0.5, 0.5) * r, y - r * 0.75, r * rnd.uniform(0.25, 0.4), "url(#puff)")


def wisp(x, y, w, h, angle=-12, op=0.8):
    out.append(f'<g transform="rotate({angle} {f(x)} {f(y)})" opacity="{op}">')
    for i in range(14):
        ell(x + rnd.uniform(-0.45, 0.45) * w, y + rnd.uniform(-h, h) * 0.5,
            w * rnd.uniform(0.06, 0.16), h * rnd.uniform(0.08, 0.2), "#f2f7fc", ' opacity="0.7"')
    out.append("</g>")


# ---------------------------------------------------------------- buildings
def facade_point(b, u, v):
    """Point on a facade in perspective. u: 0 near edge .. 1 far edge (foreshortened);
    v: 0 base .. 1 cornice."""
    d0, d1 = 1.0, b["h0"] / b["h1"]
    w0, w1 = (1 - u) / d0, u / d1
    x = (b["x0"] * w0 + b["x1"] * w1) / (w0 + w1)
    t = (x - b["x0"]) / (b["x1"] - b["x0"])
    base = lerp(b["base0"], b["base1"], t)
    top = lerp(b["base0"] - b["h0"], b["base1"] - b["h1"], t)
    return x, lerp(base, top, v)


def quad(b, u0, u1, v0, v1, fill, extra=""):
    poly([facade_point(b, u0, v0), facade_point(b, u1, v0), facade_point(b, u1, v1), facade_point(b, u0, v1)], fill, extra)


def building(x0, x1, base0, base1, h0, h1, roof0, portico):
    b = dict(x0=x0, x1=x1, base0=base0, base1=base1, h0=h0, h1=h1)
    side = 1 if x1 > x0 else -1
    # roof: a slate slope rising back from the cornice
    c0, c1 = facade_point(b, 0, 1), facade_point(b, 1, 1)
    r0 = (c0[0] + side * roof0 * 0.25, c0[1] - roof0)
    r1 = (c1[0] + side * roof0 * 0.12, c1[1] - roof0 * h1 / h0)
    poly([c0, c1, r1, r0], ROOF)
    poly([c0, c1, (c1[0], c1[1] - 4), (c0[0], c0[1] - 7)], ROOF_SHADE)
    # chimneys
    for u in (0.06, 0.38, 0.93):
        x, y = facade_point(b, u, 1)
        s = lerp(h0, h1, u) / h0
        top = lerp(r0[1], r1[1], u) - 26 * s
        rect(x + side * 10 * s - 11 * s, top, 22 * s, (y - top) - 8 * s, BRICK_SHADE)
        rect(x + side * 10 * s - 13 * s, top - 4 * s, 26 * s, 6 * s, "#7a3529")
    # dormers along the roof
    for i in range(9):
        u = 0.04 + i * 0.105
        if portico[0] - 0.04 < u < portico[1] + 0.02:
            continue
        x, y = facade_point(b, u, 1)
        s = lerp(h0, h1, u) / h0
        dw, dh = 22 * s, 26 * s
        y0 = y - roof0 * s * 0.35
        poly([(x - dw / 2, y0), (x + dw / 2, y0), (x + dw / 2, y0 - dh), (x, y0 - dh - 10 * s), (x - dw / 2, y0 - dh)], STONE)
        rect(x - dw * 0.3, y0 - dh * 0.8, dw * 0.6, dh * 0.7, GLASS)
    # walls
    quad(b, 0, 1, 0, 1, BRICK)
    quad(b, 0, 1, 0, 0.06, BRICK_SHADE)
    quad(b, 0, 1, 0.94, 1.0, STONE)  # cornice band
    quad(b, 0, 1, 0.9, 0.94, STONE_SHADE)
    quad(b, 0, 1, 0.42, 0.45, STONE_SHADE, ' opacity="0.8"')  # string course
    # windows: three storeys
    cols = 15
    for c in range(cols):
        u = (c + 0.3) / cols
        if portico[0] - 0.01 < u < portico[1]:
            continue
        for v0 in (0.1, 0.5, 0.72):
            du = 0.4 / cols
            quad(b, u - 0.08 / cols, u + du + 0.08 / cols, v0 - 0.015, v0 + 0.15, STONE)
            quad(b, u, u + du, v0, v0 + 0.135, GLASS)
            quad(b, u, u + du * 0.45, v0 + 0.02, v0 + 0.07, GLASS_LIGHT, ' opacity="0.55"')
    # portico: steps, columns, pediment, a little proud of the wall
    pu0, pu1 = portico
    quad(b, pu0 - 0.01, pu1 + 0.01, 0.0, 0.05, STONE_SHADE)
    quad(b, pu0, pu1, 0.05, 0.86, BRICK_LIGHT, ' opacity="0.6"')
    quad(b, pu0 + 0.03, pu1 - 0.03, 0.06, 0.3, "#3b2a24")  # door shadow
    n = 6
    for i in range(n):
        u = lerp(pu0 + 0.01, pu1 - 0.03, i / (n - 1))
        quad(b, u, u + 0.022, 0.05, 0.84, STONE)
        quad(b, u + 0.015, u + 0.022, 0.05, 0.84, STONE_SHADE)
        quad(b, u - 0.004, u + 0.026, 0.82, 0.86, STONE)
    quad(b, pu0 - 0.01, pu1 + 0.01, 0.86, 0.94, STONE)
    a, c = facade_point(b, pu0 - 0.015, 0.94), facade_point(b, pu1 + 0.015, 0.94)
    s = lerp(h0, h1, (pu0 + pu1) / 2) / h0
    peak = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 62 * s)
    poly([a, c, peak], STONE)
    poly([(lerp(a[0], peak[0], 0.12), lerp(a[1], peak[1], 0.12) - 1), (lerp(c[0], peak[0], 0.12), lerp(c[1], peak[1], 0.12) - 1),
          (peak[0], peak[1] + 12 * s)], "#e2d6bd")
    circ(peak[0], peak[1] + 30 * s, 9 * s, STONE_SHADE)
    circ(peak[0], peak[1] + 30 * s, 6 * s, GLASS)
    return b


def distant_hall():
    x, base = VP[0], 642
    rect(x - 62, base - 46, 124, 46, "#b9705c")
    poly([(x - 66, base - 46), (x + 66, base - 46), (x + 52, base - 60), (x - 52, base - 60)], "#7d8796")
    poly([(x - 18, base - 46), (x + 18, base - 46), (x, base - 60)], "#efe3cd")
    for i in range(4):
        rect(x - 12 + i * 7.5, base - 44, 3, 30, "#efe3cd")
    for side in (-1, 1):
        for j in range(4):
            rect(x + side * (26 + j * 9) - 2, base - 38, 4, 7, "#3f5272")
            rect(x + side * (26 + j * 9) - 2, base - 22, 4, 7, "#3f5272")
    # the tower: brick shaft, white belfry, green cap, a spire
    rect(x - 9, base - 104, 18, 46, "#b9705c")
    circ(x, base - 90, 5, "#f4ecdc")
    rect(x - 7, base - 122, 14, 18, "#f4ecdc")
    rect(x - 3, base - 119, 6, 11, "#5f7088")
    path(f"M{x - 8},{base - 122} Q{x},{base - 140} {x + 8},{base - 122}Z", "#5d8f86")
    rect(x - 0.8, base - 150, 1.6, 18, "#e0d7c2")


# ---------------------------------------------------------------- ground
def lawn():
    rect(0, HORIZON, W, H - HORIZON, "url(#lawn)")
    # mowing stripes radiating from the far end
    for i in range(-9, 10):
        if i % 2:
            continue
        x0, x1 = VP[0] + i * 26, VP[0] + (i + 1) * 26
        poly([(x0, HORIZON + 8), (x1, HORIZON + 8), (VP[0] + (i + 1) * 340, H), (VP[0] + i * 340, H)], "#ffffff", ' opacity="0.045"')


def dapple():
    """Sun through the big trees: soft bright and dark patches near the viewer."""
    for _ in range(46):
        y = rnd.uniform(700, 884)
        x = rnd.uniform(-50, W + 50)
        k = (y - 700) / 184
        ell(x, y, rnd.uniform(30, 120) * (0.5 + k), rnd.uniform(5, 16) * (0.5 + k),
            "#1f4d1c" if rnd.random() < 0.6 else "#d8f08a", f' opacity="{f(rnd.uniform(0.08, 0.2))}"')


def paths():
    P = "url(#path)"
    edge = "#cbbd9e"
    # cross walk near the far end
    poly([(330, 690), (1450, 690), (1440, 698), (340, 698)], P)
    poly([(560, 660), (1220, 660), (1214, 665), (566, 665)], P)
    # the left diagonal: from the near bench corner to the far end
    poly([(225, 884), (430, 884), (VP[0] - 70, 650), (VP[0] - 92, 650)], P)
    poly([(225, 884), (240, 884), (VP[0] - 91, 650), (VP[0] - 92, 650)], edge)
    # the right diagonal
    poly([(1440, 806), (1720, 806), (VP[0] + 92, 650), (VP[0] + 70, 650)], P)
    # the near sidewalk across the bottom left, and the right one
    poly([(0, 838), (680, 830), (760, 884), (0, 884)], P)
    poly([(1240, 862), (1779, 812), (1779, 884), (1250, 884)], P)
    # shade of the big trees falling on the lawn and the walk
    for (x, y, rx, ry) in [(230, 860, 260, 40), (610, 820, 300, 34), (1300, 870, 360, 30), (980, 760, 220, 18), (700, 760, 160, 14)]:
        ell(x, y, rx, ry, "#1f4d1c", ' opacity="0.16"')


# ---------------------------------------------------------------- props
def lamp(x, base, h, banner=False):
    s = h / 400
    rect(x - 4 * s, base - h, 8 * s, h, "#263446")
    rect(x - 12 * s, base - 14 * s, 24 * s, 14 * s, "#1c2735")
    rect(x - 8 * s, base - 40 * s, 16 * s, 26 * s, "#263446")
    top = base - h
    poly([(x - 22 * s, top - 6 * s), (x + 22 * s, top - 6 * s), (x + 16 * s, top - 62 * s), (x - 16 * s, top - 62 * s)], "#f6f0dc")
    poly([(x - 22 * s, top - 6 * s), (x + 22 * s, top - 6 * s), (x + 16 * s, top - 62 * s), (x - 16 * s, top - 62 * s)], "none",
         f' stroke="#1c2735" stroke-width="{f(4 * s)}"')
    poly([(x - 26 * s, top - 60 * s), (x + 26 * s, top - 60 * s), (x, top - 86 * s)], "#1c2735")
    circ(x, top - 90 * s, 4 * s, "#1c2735")
    rect(x - 12 * s, top, 24 * s, 8 * s, "#1c2735")
    if banner:
        bx, by = x + 8 * s, top + 70 * s
        rect(bx, by, 8 * s, 4 * s, "#1c2735")
        poly([(bx + 4 * s, by + 4 * s), (bx + 42 * s, by + 4 * s), (bx + 42 * s, by + 140 * s), (bx + 4 * s, by + 140 * s)], "#24315e")
        # the game's mark on the banner, in miniature
        mx, my, mw = bx + 23 * s, by + 48 * s, 26 * s
        poly([(mx - mw / 2, my), (mx, my - mw * 0.35), (mx + mw / 2, my)], "#d9e1f2")
        for k in (-0.3, 0, 0.3):
            rect(mx + k * mw - mw * 0.07, my + 2 * s, mw * 0.14, mw * 0.6, "#d9e1f2")
        rect(mx - mw / 2, my + mw * 0.66, mw, mw * 0.1, "#d9e1f2")


def person(x, base, h, shirt, pack="#2b2f36", hair="#2a1d16", sitting=False, long_hair=False):
    s = h / 160
    if sitting:
        ell(x, base, 24 * s, 5 * s, "#1f4d1c", ' opacity="0.25"')
        rect(x - 14 * s, base - 14 * s, 30 * s, 12 * s, "#3d5a85", f' rx="{f(5 * s)}"')
        rect(x - 10 * s, base - 52 * s, 22 * s, 40 * s, shirt, f' rx="{f(6 * s)}"')
        circ(x + 1 * s, base - 62 * s, 10 * s, "#e3b48f")
        circ(x + 1 * s, base - 66 * s, 10 * s, hair)
        return
    ell(x, base, 26 * s, 5 * s, "#1f4d1c", ' opacity="0.25"')
    rect(x - 11 * s, base - 72 * s, 9 * s, 70 * s, "#3d5a85")
    rect(x + 2 * s, base - 72 * s, 9 * s, 70 * s, "#34507a")
    rect(x - 12 * s, base - 4 * s, 11 * s, 5 * s, "#e8e2d8")
    rect(x + 2 * s, base - 4 * s, 11 * s, 5 * s, "#e8e2d8")
    rect(x - 15 * s, base - 128 * s, 30 * s, 60 * s, shirt, f' rx="{f(8 * s)}"')
    rect(x - 19 * s, base - 124 * s, 6 * s, 48 * s, shirt, f' rx="{f(3 * s)}"')
    rect(x + 13 * s, base - 124 * s, 6 * s, 48 * s, shirt, f' rx="{f(3 * s)}"')
    rect(x - 13 * s, base - 124 * s, 26 * s, 38 * s, pack, f' rx="{f(7 * s)}"')  # seen from behind
    circ(x, base - 140 * s, 11 * s, hair)
    if long_hair:
        rect(x - 11 * s, base - 140 * s, 22 * s, 24 * s, hair, f' rx="{f(6 * s)}"')


def bench(x, y, s=1.0):
    wood, iron = "#8a5a36", "#26303c"
    for i in range(3):
        rect(x, y + i * 16 * s, 180 * s, 10 * s, wood if i else "#9b6a43", f' rx="{f(2 * s)}"')
    poly([(x - 10 * s, y + 56 * s), (x + 190 * s, y + 56 * s), (x + 205 * s, y + 76 * s), (x + 5 * s, y + 76 * s)], "#a5734a")
    for lx in (x + 8 * s, x + 168 * s):
        rect(lx, y - 6 * s, 9 * s, 150 * s, iron)
        rect(lx - 10 * s, y + 140 * s, 30 * s, 6 * s, iron)
    rect(x - 4 * s, y + 70 * s, 214 * s, 7 * s, iron)


# ---------------------------------------------------------------- scene
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

    # far end: tree rows closing on the distant hall
    for i in range(14):
        t = i / 13
        for side in (-1, 1):
            x = VP[0] + side * lerp(330, 70, t ** 0.8) + rnd.uniform(-6, 6)
            h = lerp(150, 52, t)
            tree(x, lerp(652, 640, t), h, LEAF_FAR)
    distant_hall()

    building(150, 540, 642, 618, 290, 158, 70, (0.5, 0.78))
    building(1740, 1300, 646, 618, 300, 160, 74, (0.55, 0.82))

    lawn()
    paths()
    dapple()

    # hedges at the buildings' feet
    for x in range(-20, 560, 34):
        bush(x, 640 + (x < 200) * 8, 56, 34, LEAF_FAR)
    for x in range(1290, 1800, 34):
        bush(x, 642, 56, 34, LEAF_FAR)

    # the avenue's middle trees, near to far
    for (x, base, h) in [(520, 650, 200), (610, 646, 180), (700, 644, 155), (775, 642, 130),
                         (1250, 652, 210), (1160, 648, 190), (1070, 646, 160), (995, 643, 130),
                         (255, 660, 215), (1470, 662, 215)]:
        tree(x, base, h)

    lamp(276, 664, 98)
    lamp(500, 656, 80)
    lamp(679, 662, 108, banner=True)
    lamp(1108, 667, 115, banner=True)
    lamp(1282, 650, 86)
    lamp(1530, 682, 130)

    person(565, 682, 70, "#7d8792")
    person(1196, 656, 30, "#4a6fa1")
    person(1052, 652, 24, "#c7cbd2")
    person(1272, 686, 44, "#3e5a80", sitting=True)
    person(1302, 686, 42, "#e8e4dc", sitting=True)
    person(330, 728, 150, "#4a6380")
    person(392, 732, 146, "#d9d6cf", long_hair=True, hair="#3a2618")
    person(1420, 746, 170, "#2f4a74")

    # the near lamps with the college's banners
    lamp(110, 712, 380, banner=True)
    lamp(1702, 736, 290)

    # foreground: hedges bottom left and right
    bush(60, 760, 220, 150)
    bush(160, 860, 260, 120)
    bush(1720, 820, 220, 160)
    bush(1640, 880, 260, 100)

    # the big trees framing the top corners
    rect(0, 0, 70, 360, "#4a3322")
    path("M0,40 C120,60 220,120 330,30 L360,60 C240,150 120,110 0,110Z", "#4a3322")
    path("M20,300 C60,230 90,190 160,170 L170,190 C110,215 80,250 60,320Z", "#4a3322")
    foliage(330, 40, 470, 120, 520, size=(0.07, 0.15), mass=0.55)
    foliage(60, 260, 110, 130, 180, size=(0.08, 0.16), mass=0.6)
    foliage(700, 70, 160, 80, 200, size=(0.08, 0.17), mass=0)
    foliage(330, 200, 120, 55, 120, size=(0.09, 0.18), mass=0)
    foliage(560, 150, 90, 45, 70, size=(0.1, 0.2), mass=0)
    rect(1745, 0, 40, 330, "#4a3322")
    path("M1779,90 C1700,110 1640,60 1580,0 L1620,0 C1660,40 1710,70 1779,60Z", "#4a3322")
    foliage(1650, 70, 200, 140, 360, size=(0.07, 0.15), mass=0.6)
    foliage(1730, 330, 100, 150, 200, size=(0.08, 0.16), mass=0.6)
    foliage(1500, 30, 110, 55, 110, size=(0.09, 0.18), mass=0)

    bench(40, 712)


scene()
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice">'
    + "".join(out)
    + "</svg>"
)
open(sys.argv[1], "w").write(svg)
print(len(svg), "bytes,", len(out), "shapes")

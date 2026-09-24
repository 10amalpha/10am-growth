from core import *

CX, CY = W/2, 900

def pt(P, rx, ry, rz=0, cx=CX, cy=CY, cam=1600.0):
    q, z = project(rot(np.array(P, float)[None], rx, ry, rz), cx, cy, cam)
    return float(q[0, 0]), float(q[0, 1]), float(z[0])

def ping(c, x, y, lt, col=GOLDB, a=1.0):
    p = skia.Paint(Color4f=hx(col, a), AntiAlias=True); c.drawCircle(x, y, 7, p)
    for k in range(2):
        ph = (lt*0.9 + k*0.5) % 1.0
        s = skia.Paint(Color4f=hx(col, a*(1-ph)*0.9), Style=skia.Paint.kStroke_Style, StrokeWidth=2, AntiAlias=True)
        c.drawCircle(x, y, 8 + ph*46, s)

def chapter(c, lt, num, name, role):
    text_in(c, num, W/2, 300, 'cinzel', 40, GOLDD, lt, 0.15, track=0.3)
    text_in(c, name, W/2, 385, 'cinzelB', 70, CREAM, lt, 0.3, track=0.06)
    text_in(c, role, W/2, 440, 'mono', 24, MUTED, lt, 0.5, track=0.22)

def stamp(c, lt, s, y=1330, t0=0.9, size=78):
    text_in(c, s, W/2, y, 'cinzel', size, GOLD, lt, t0, dur=0.9, track=0.26, rise=0)

def lines(c, lt, L, y0=1445, t0=1.3, gap=74):
    y = y0
    for i, (s, style) in enumerate(L):
        fn, sz, col = {'r': ('corm', 58, CREAM), 'i': ('cormi', 58, GOLDB), 'b': ('cinzelB', 60, GOLDB)}[style]
        text_in(c, s, W/2, y, fn, sz, col, lt, t0 + i*0.45)
        y += gap


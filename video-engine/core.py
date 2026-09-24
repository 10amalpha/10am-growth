import skia, numpy as np, math
W, H, FPS = 1080, 1920, 30

def hx(h, a=1.0):
    return skia.Color4f(int(h[1:3],16)/255, int(h[3:5],16)/255, int(h[5:7],16)/255, a)

import os
BG='#08070a'; GOLD='#c4a464'; GOLDB='#d9b97a'; GOLDD='#a89060'
CREAM='#f5f3ee'; MUTED='#8a8478'; SMOKE='#403a30'; VIGC='#1a140b'
if os.environ.get('DD_THEME') == 'green':
    BG='#040c08'; GOLD='#f2b63c'; GOLDB='#ffd27a'; GOLDD='#b98a2e'
    CREAM='#f3efe4'; MUTED='#7f8b83'; SMOKE='#1d3a2b'; VIGC='#0e2a1c'

def _tag(s): return (ord(s[0])<<24)|(ord(s[1])<<16)|(ord(s[2])<<8)|ord(s[3])
def face(path, w):
    tf = skia.Typeface.MakeFromFile(path)
    Co = skia.FontArguments.VariationPosition.Coordinate
    vp = skia.FontArguments.VariationPosition(skia.FontArguments.VariationPosition.Coordinates([Co(_tag('wght'), w)]))
    fa = skia.FontArguments(); fa.setVariationDesignPosition(vp)
    return tf.makeClone(fa)

FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts') + '/'
TF = {
 'cinzel': face(FD+'Cinzel[wght].ttf', 500), 'cinzelB': face(FD+'Cinzel[wght].ttf', 700),
 'corm': face(FD+'CormorantGaramond[wght].ttf', 500), 'cormi': face(FD+'CormorantGaramond-Italic[wght].ttf', 500),
 'mono': face(FD+'JetBrainsMono[wght].ttf', 400), 'monoL': face(FD+'JetBrainsMono[wght].ttf', 300),
}
_fc = {}
def font(name, size):
    k = (name, size)
    if k not in _fc:
        f = skia.Font(TF[name], size); f.setSubpixel(True); f.setEdging(skia.Font.Edging.kAntiAlias)
        _fc[k] = f
    return _fc[k]

def clamp(x, a=0.0, b=1.0): return a if x < a else (b if x > b else x)
def eo(x): x = clamp(x); return 1-(1-x)**3
def eio(x): x = clamp(x); return 3*x*x-2*x*x*x
def ramp(t, a, b): return clamp((t-a)/(b-a)) if b > a else float(t >= a)

def text(c, s, x, y, fname, size, col, a=1.0, track=0.0, align='c'):
    if a <= 0.003 or not s: return 0
    f = font(fname, size)
    fs = [f if f.unicharToGlyph(ord(ch)) or ch == ' ' else font('mono', size) for ch in s]
    ws = [ff.measureText(ch) for ff, ch in zip(fs, s)]
    tw = sum(ws) + track*size*(len(s)-1)
    x0 = x - tw/2 if align == 'c' else (x - tw if align == 'r' else x)
    p = skia.Paint(Color4f=hx(col, a), AntiAlias=True)
    if track == 0 and all(ff is f for ff in fs):
        c.drawString(s, x0, y, f, p)
    else:
        cx = x0
        for ch, w, ff in zip(s, ws, fs):
            c.drawString(ch, cx, y, ff, p); cx += w + track*size
    return tw

def text_in(c, s, x, y, fname, size, col, lt, t0, dur=0.7, a=1.0, track=0.0, align='c', rise=26):
    k = eo(ramp(lt, t0, t0+dur))
    tr = track + (1-k)*0.12 if track or fname.startswith('cinzel') else track
    return text(c, s, x, y + (1-k)*rise, fname, size, col, a*k, tr, align)

# ---------- 3D ----------
def rot(P, rx=0.0, ry=0.0, rz=0.0):
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]); Ry = np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
    Rz = np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])
    return P @ (Rz @ Rx @ Ry).T

def project(P, cx, cy, cam=1600.0, f=1500.0):
    z = P[..., 2] + cam
    return np.stack([cx + f*P[..., 0]/z, cy + f*P[..., 1]/z], -1), z

def draw_segs(c, S, cx, cy, rx=0, ry=0, rz=0, prog=1.0, col=GOLD, a=1.0, width=2.2, glow=True, order=None, cam=1600.0, f=1500.0, spread=0.55):
    # S: (N,2,3)
    if a <= 0.003 or len(S) == 0: return
    N = len(S)
    R = rot(S.reshape(-1,3), rx, ry, rz).reshape(N,2,3)
    P2, z = project(R, cx, cy, cam, f)
    zm = z.mean(1)
    lo, hi = zm.min(), zm.max(); rng = max(hi-lo, 1e-6)
    depth = 1 - (zm-lo)/rng
    idx = np.arange(N) if order is None else order
    rank = np.empty(N); rank[idx] = np.arange(N)
    start = rank/N*spread
    loc = np.clip((prog - start)/(1-spread), 0, 1)
    paths = [skia.Path() for _ in range(4)]
    for i in range(N):
        l = loc[i]
        if l <= 0: continue
        p0 = P2[i,0]; p1 = P2[i,0] + (P2[i,1]-P2[i,0])*l
        b = min(3, int(depth[i]*4))
        paths[b].moveTo(float(p0[0]), float(p0[1])); paths[b].lineTo(float(p1[0]), float(p1[1]))
    for b in range(4):
        al = a*(0.28 + 0.72*(b+0.5)/4)
        if glow:
            g = skia.Paint(Color4f=hx(col, al*0.22), Style=skia.Paint.kStroke_Style, StrokeWidth=width*4.5, AntiAlias=True, StrokeCap=skia.Paint.kRound_Cap)
            c.drawPath(paths[b], g)
        p = skia.Paint(Color4f=hx(col, al), Style=skia.Paint.kStroke_Style, StrokeWidth=width, AntiAlias=True, StrokeCap=skia.Paint.kRound_Cap)
        c.drawPath(paths[b], p)
    return P2, z

def poly(pts, closed=False):
    pts = np.asarray(pts, float)
    segs = [(pts[i], pts[i+1]) for i in range(len(pts)-1)]
    if closed: segs.append((pts[-1], pts[0]))
    return segs

def circle3(r, n=64, y=0.0, axis='y'):
    t = np.linspace(0, 2*math.pi, n, endpoint=False)
    if axis == 'y': P = np.stack([r*np.cos(t), np.full(n, y), r*np.sin(t)], 1)
    elif axis == 'z': P = np.stack([r*np.cos(t), r*np.sin(t), np.full(n, y)], 1)
    else: P = np.stack([np.full(n, y), r*np.cos(t), r*np.sin(t)], 1)
    return poly(P, True)

def box(cx, cy, cz, w, h, d):
    x0, x1, y0, y1, z0, z1 = cx-w/2, cx+w/2, cy-h/2, cy+h/2, cz-d/2, cz+d/2
    v = np.array([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]])
    E = [(0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),(0,4),(1,5),(2,6),(3,7)]
    return [(v[a], v[b]) for a, b in E]

def arr(segs): return np.array(segs, float).reshape(-1,2,3)

from core import *

def globe(r=300):
    S = []
    for lat in range(-60, 61, 20):
        y = -r*math.sin(math.radians(lat)); rr = r*math.cos(math.radians(lat))
        S += circle3(rr, 72, y)
    t = np.linspace(-math.pi/2, math.pi/2, 40)
    for lon in range(0, 180, 20):
        L = math.radians(lon)
        P = np.stack([r*np.cos(t)*math.cos(L), -r*np.sin(t), r*np.cos(t)*math.sin(L)], 1)
        S += poly(P); S += poly(P*np.array([-1,1,-1]))
    return arr(S)

def latlon(r, lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return np.array([r*math.cos(la)*math.cos(lo), -r*math.sin(la), r*math.cos(la)*math.sin(lo)])

def terrain():
    xs = np.linspace(-620, 620, 31); zs = np.linspace(-700, 700, 29)
    def h(x, z):
        v = -260*(1-np.exp(-(x/250.0)**2)) - 40*np.sin(z/140.0+x/90.0)*(np.abs(x)/620)
        return v + 20*np.sin(x/60.0)*np.cos(z/110.0)*(np.abs(x) > 150)
    S = []
    for z in zs:
        S += poly(np.stack([xs, h(xs, z), np.full_like(xs, z)], 1))
    for x in xs:
        S += poly(np.stack([np.full_like(zs, x), h(x, zs), zs], 1))
    return arr(S)

def icosa(r=240):
    p = (1+5**0.5)/2
    V = []
    for a in (-1, 1):
        for b in (-p, p):
            V += [[0,a,b],[a,b,0],[b,0,a]]
    V = np.array(V, float)
    S = []
    for i in range(12):
        for j in range(i+1, 12):
            if abs(np.linalg.norm(V[i]-V[j]) - 2) < 1e-6: S.append((V[i], V[j]))
    return arr(S)*(r/np.linalg.norm(V[0]))

CANDLES = [(100,108),(108,103),(103,116),(116,124),(124,119),(119,133),(133,141),(141,138),(138,152),(152,161),(161,112),(112,96)]
def candles():
    S = []; n = len(CANDLES); sp = 74
    for i, (o, c) in enumerate(CANDLES):
        x = (i-(n-1)/2)*sp
        y0, y1 = -(o-128)*5.2, -(c-128)*5.2
        hi, lo = min(y0, y1)-26, max(y0, y1)+22
        S += box(x, (y0+y1)/2, 0, 40, max(abs(y1-y0), 6), 40)
        S += [(np.array([x, hi, 0]), np.array([x, min(y0, y1), 0])), (np.array([x, max(y0, y1), 0]), np.array([x, lo, 0]))]
    for k in range(-2, 3):
        S += [(np.array([-470, k*120, 60]), np.array([470, k*120, 60]))]
    return arr(S)

def chain():
    S = []; n = 6
    for i in range(n):
        x = (i-(n-1)/2)*185; y = 40*math.sin(i*1.1)
        S += box(x, y, 0, 110, 110, 110); S += box(x, y, 0, 52, 52, 52)
        if i < n-1:
            x2 = x+185; y2 = 40*math.sin((i+1)*1.1)
            for dz in (-22, 22):
                S += [(np.array([x+55, y, dz]), np.array([x2-55, y2, dz]))]
    return arr(S)

def expo():
    xs = np.linspace(-430, 430, 44)
    ys = 300 - 600*(np.exp((xs+430)/860*4.6)-1)/(math.exp(4.6)-1)
    S = poly(np.stack([xs, ys, np.zeros_like(xs)], 1))
    S += poly(np.stack([xs, ys, np.full_like(xs, 80)], 1))
    for i in range(0, 44, 3):
        S += [(np.array([xs[i], 300, 0]), np.array([xs[i], ys[i], 0])), (np.array([xs[i], ys[i], 0]), np.array([xs[i], ys[i], 80]))]
    S += [(np.array([-470, 300, 0]), np.array([470, 300, 0])), (np.array([-470, 300, 0]), np.array([-470, -330, 0]))]
    for r, z in ((110, -60), (82, -20), (54, 20)):
        S += circle3(r, 56, z, 'z')
    return arr(S), (xs, ys)

def charger():
    S = box(-90, 20, 0, 170, 440, 90)
    S += box(-90, -110, -46, 110, 120, 2)
    S += box(-90, 240, 0, 230, 20, 150)
    t = np.linspace(0, 1, 30)
    P = np.stack([-5+130*t, -20+230*t**1.6, -20+40*t], 1)
    S += poly(P)
    bolt = np.array([[60,-60],[-10,60],[40,60],[0,170],[110,20],[55,20],[95,-60]], float)*1.3 + np.array([150, -230])
    for z in (-30, 30):
        S += poly(np.c_[bolt, np.full(len(bolt), z)], True)
    for p in bolt:
        S += [(np.array([p[0], p[1], -30]), np.array([p[0], p[1], 30]))]
    return arr(S)

def tower(sc=1.0, off=(0, 0, 0)):
    S = []; lv = [(0, 110), (-200, 80), (-380, 55), (-520, 38), (-600, 30)]
    lv = [(y+250, w) for y, w in lv]
    def sq(y, w): return [np.array([sx*w, y, sz*w]) for sx, sz in ((-1,-1),(1,-1),(1,1),(-1,1))]
    L = [sq(y, w) for y, w in lv]
    for k in range(len(L)):
        S += poly(L[k], True)
        if k < len(L)-1:
            for j in range(4):
                a0, a1, b0, b1 = L[k][j], L[k][(j+1) % 4], L[k+1][j], L[k+1][(j+1) % 4]
                S += [(a0, b0), (a0, b1), (a1, b0)]
    for y, w in ((-230, 190), (-310, 140)):
        S += [(np.array([-w, y, 0]), np.array([w, y, 0]))]
        for sx in (-1, 1):
            S += [(np.array([sx*w, y, 0]), np.array([sx*w, y+45, 0]))]
    S = np.array(S, float)*sc + np.array(off)
    return S

def towers():
    A = tower(); wires = []
    for y, w in ((-230, 190), (-310, 140)):
        for sx in (-1, 1):
            p0 = np.array([sx*w, y+45, 0.0]); p1 = np.array([sx*760, y-10, -260.0*sx])
            t = np.linspace(0, 1, 28)[:, None]
            P = p0*(1-t)+p1*t; P[:, 1] += 95*np.sin(math.pi*t[:, 0])
            wires += poly(P)
    g = [(np.array([-420, 250, z]), np.array([420, 250, z])) for z in (-160, 0, 160)]
    g += [(np.array([x, 250, -160]), np.array([x, 250, 160])) for x in (-420, -210, 0, 210, 420)]
    return np.concatenate([A, arr(wires), arr(g)], 0)

def helix():
    n = 120; t = np.linspace(0, 3*2*math.pi, n); y = np.linspace(360, -360, n); r = 150
    A = np.stack([r*np.cos(t), y, r*np.sin(t)], 1); B = np.stack([r*np.cos(t+math.pi), y, r*np.sin(t+math.pi)], 1)
    S = poly(A) + poly(B)
    for i in range(0, n, 5): S.append((A[i], B[i]))
    return arr(S)

def network(r=280):
    k = np.arange(8)+0.5; ph = np.arccos(1-2*k/8); th = math.pi*(1+5**0.5)*k
    V = np.stack([r*np.cos(th)*np.sin(ph), r*np.cos(ph), r*np.sin(th)*np.sin(ph)], 1)
    S = [(V[i], V[j]) for i in range(8) for j in range(i+1, 8)]
    return arr(S), V

def rings():
    S = []
    for r in (330, 300): S += circle3(r, 120, 0, 'z')
    for i in range(72):
        a = i*math.pi/36; L = 22 if i % 6 == 0 else 10
        S += [(np.array([330*math.cos(a), 330*math.sin(a), 0]), np.array([(330+L)*math.cos(a), (330+L)*math.sin(a), 0]))]
    return arr(S)

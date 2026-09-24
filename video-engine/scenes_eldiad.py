from core import *
import geo
from kit import *

THEME = 'gold'
HUD_TL = '10AMPRO · EL DÍA D'; HUD_BL = 'ANNO · MMXXVI'; HUD_BR = '14.10.2026 · MEDELLÍN'
G_GLOBE = geo.globe(); G_TERR = geo.terrain(); G_ICO = geo.icosa(); G_CAN = geo.candles()
G_CHAIN = geo.chain(); G_EXPO, EXPO_XY = geo.expo(); G_CHG = geo.charger(); G_TOW = geo.towers()
G_HEL = geo.helix(); G_NET, NET_V = geo.network(); G_RING = geo.rings()
ORD_TERR = np.argsort(-G_TERR[:, :, 2].mean(1))
ORD_CAN = np.argsort(G_CAN[:, :, 0].mean(1))
ORD_EXPO = np.argsort(G_EXPO[:, :, 0].mean(1))
ORD_TOW = np.argsort(-G_TOW[:, :, 1].mean(1))
ORD_HEL = np.argsort(G_HEL[:, :, 1].mean(1))[::-1]
MED = geo.latlon(300, 6.24, -75.58)
_best = min(np.linspace(-math.pi, math.pi, 1441), key=lambda ry: rot(MED[None], -0.22, ry)[0, 2])
GLOBE_RY = float(_best)

# ---------------- scenes ----------------
def s_globe(c, lt, d):
    ry = GLOBE_RY - 1.6*(1 - eo(ramp(lt, 0, d*0.8)))
    draw_segs(c, G_GLOBE, CX, CY, -0.22, ry, prog=eo(ramp(lt, 0.05, 2.4)), width=1.7)
    x, y, z = pt(MED, -0.22, ry)
    k = ramp(lt, 2.3, 2.8)
    if k > 0:
        ping(c, x, y, lt, a=k)
        text(c, 'MEDELLÍN', x+34, y-18, 'mono', 24, GOLDB, k, 0.2, 'l')
    text_in(c, 'OPERACIÓN · MEDELLÍN', W/2, 330, 'mono', 28, GOLD, lt, 0.2, track=0.3)
    text_in(c, '6.24° N  ·  75.58° W', W/2, 1300, 'mono', 30, GOLDD, lt, 0.8, track=0.2, rise=0)
    text_in(c, 'EL DÍA D', W/2, 1450, 'cinzelB', 132, CREAM, lt, 1.3, dur=1.0, track=0.1)
    text_in(c, 'La invasión del conocimiento', W/2, 1545, 'cormi', 62, GOLDB, lt, 2.0)

def s_terrain(c, lt, d):
    ry = -0.3 + 0.35*eio(lt/d)
    draw_segs(c, G_TERR, CX, CY+40, 0.52, ry, prog=eo(ramp(lt, 0, 2.2)), width=1.4, order=ORD_TERR, cam=2700, spread=0.75)
    k = ramp(lt, 1.6, 2.2)
    if k > 0:
        x0, y0, _ = pt([0, 30, 0], 0.52, ry, cy=CY+40, cam=2700); x1, y1, _ = pt([0, -330, 0], 0.52, ry, cy=CY+40, cam=2700)
        yy = y0 + (y1-y0)*eo(k)
        for w, a in ((14, 0.15), (3, 0.9)):
            c.drawLine(x0, y0, x1, yy, skia.Paint(Color4f=hx(GOLDB, a*k), StrokeWidth=w, AntiAlias=True, StrokeCap=skia.Paint.kRound_Cap))
        ping(c, x0, y0, lt, a=k)
        text(c, 'MEDELLÍN', x1, yy-24, 'mono', 24, GOLDB, k, 0.25)
    text_in(c, 'LA TESIS', W/2, 330, 'mono', 28, GOLD, lt, 0.2, track=0.3)
    stamp(c, lt, 'VALLE DE ABURRÁ', size=64)
    lines(c, lt, [('Medellín no necesita otro evento.', 'r'), ('Necesita un desembarco.', 'i')])

def s_equation(c, lt, d):
    draw_segs(c, G_ICO, CX, CY-40, 0.4+lt*0.35, lt*0.5, prog=eo(ramp(lt, 0, 1.6)), width=2.4)
    draw_segs(c, G_ICO*0.55, CX, CY-40, -lt*0.5, -lt*0.4, prog=eo(ramp(lt, 0.4, 2.0)), width=1.4, col=GOLDD)
    text_in(c, 'LA ECUACIÓN', W/2, 330, 'mono', 28, GOLD, lt, 0.2, track=0.3)
    L = [('mejor información', 'corm', 60, CREAM), ('+ mejores modelos mentales', 'corm', 60, CREAM), ('+ mejor red', 'corm', 60, CREAM), ('= mejor destino', 'cinzelB', 66, GOLDB)]
    for i, (s, fn, sz, col) in enumerate(L):
        text_in(c, s, W/2, 1290 + i*86, fn, sz, col, lt, 0.7 + i*0.55)

def s_candles(c, lt, d):
    rx, ry = 0.16, -0.5 + 0.28*eio(lt/d)
    draw_segs(c, G_CAN, CX, CY, rx, ry, prog=eo(ramp(lt, 0.1, 2.8)), width=2.0, order=ORD_CAN, spread=0.8)
    k = ramp(lt, 2.1, 2.5)
    if k > 0:
        x0, y0, _ = pt([(9-5.5)*74, -330, 0], rx, ry); x1, y1, _ = pt([(9-5.5)*74, 300, 0], rx, ry)
        n = 22
        for i in range(n):
            if i % 2: continue
            a0, a1 = i/n, min((i+1)/n, k)
            if a0 > k: break
            c.drawLine(x0+(x1-x0)*a0, y0+(y1-y0)*a0, x0+(x1-x0)*a1, y0+(y1-y0)*a1, skia.Paint(Color4f=hx(GOLDB, 0.9), StrokeWidth=2.2, AntiAlias=True))
        text(c, 'EXIT 90%', x0, y0-22, 'mono', 26, GOLDB, k, 0.15)
    chapter(c, lt, 'I', 'JOE McCANN', 'TRADER · INVERSIONISTA · AI')
    stamp(c, lt, '10.10.2025')
    lines(c, lt, [('Salió del 90% de cripto.', 'r'), ('Un día antes de la liquidación.', 'i')])

def s_chain(c, lt, d):
    draw_segs(c, G_CHAIN, CX, CY, 0.32, -0.7+lt*0.28, prog=eo(ramp(lt, 0.05, 2.2)), width=2.0, order=np.argsort(G_CHAIN[:, :, 0].mean(1)), spread=0.7)
    chapter(c, lt, 'II', 'SANTIAGO SANTOS', 'ETHEREUM TEMPRANO · SOLANA')
    stamp(c, lt, 'GDP → ONCHAIN', size=70)
    lines(c, lt, [('De Ethereum temprano a Solana.', 'r'), ('¿Cómo traer el GDP onchain?', 'i')])

def s_expo(c, lt, d):
    rx, ry = 0.08, -0.38 + 0.22*eio(lt/d)
    draw_segs(c, G_EXPO, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.6)), width=2.0, order=ORD_EXPO, spread=0.8)
    xs, ys = EXPO_XY
    k1, k2 = ramp(lt, 0.8, 1.2), ramp(lt, 2.5, 2.9)
    x, y, _ = pt([xs[0], ys[0], 0], rx, ry); text(c, '1×', x, y-26, 'mono', 28, GOLDB, k1, 0.1)
    x, y, _ = pt([xs[-1], ys[-1], 0], rx, ry)
    if k2 > 0: ping(c, x, y, lt, a=k2); text(c, '100×', x-10, y-34, 'mono', 30, GOLDB, k2, 0.1, 'r')
    chapter(c, lt, 'III', 'ANTONIO LINARES', 'SESIÓN VIRTUAL EN VIVO')
    stamp(c, lt, '100×', size=96)
    lines(c, lt, [('Spotify. Palantir. AMD. Hims.', 'r'), ('Antes que el consenso.', 'i')])

def s_charger(c, lt, d):
    draw_segs(c, G_CHG, CX, CY+20, 0.12, -0.55+lt*0.22, prog=eo(ramp(lt, 0.05, 2.0)), width=2.2)
    chapter(c, lt, 'IV', 'ANDRÉ JOFFROY', 'FOUNDER & CIO · ZAPS')
    stamp(c, lt, 'ELECTROLINERAS', size=64)
    lines(c, lt, [('Si Medellín quiere más Teslas,', 'r'), ('necesita dónde cargarlos.', 'i')])

def s_towers(c, lt, d):
    draw_segs(c, G_TOW*1.3, CX-40, CY+40, 0.12, -0.45+0.3*eio(lt/d), prog=eo(ramp(lt, 0.05, 2.4)), width=1.8, order=ORD_TOW, cam=2000, spread=0.7)
    chapter(c, lt, 'V', 'RICARDO SIERRA', 'CEO · CELSIA')
    stamp(c, lt, 'ANTIOQUIA')
    lines(c, lt, [('¿Podemos ser un verdadero', 'r'), ('Energy Valley?', 'i')])

def s_helix(c, lt, d):
    draw_segs(c, G_HEL, CX, CY, 0.12, lt*0.9, 0.3, prog=eo(ramp(lt, 0.05, 2.2)), width=2.0, order=ORD_HEL, spread=0.6)
    chapter(c, lt, 'VI', 'OSPINA & PALACIO', 'MÉDICOS · LONGEVIDAD')
    stamp(c, lt, 'PÉPTIDOS')
    lines(c, lt, [('¿Qué necesitaría Medellín', 'r'), ('para tener una fábrica de péptidos?', 'i')])

NAMES = ['HERNÁN JARAMILLO · DARÍO PALACIO · NICOLÁS FERNÁNDEZ', 'GUILLERMO VALENCIA · ANDRÉS ARIAS · CAMILO BOTERO', 'EL GORDO · CAROLINA ROJAS']
def s_network(c, lt, d):
    rx, ry = 0.35, lt*0.45
    draw_segs(c, G_NET, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.0)), width=1.6)
    R = rot(NET_V, rx, ry); P, z = project(R, CX, CY)
    k = ramp(lt, 0.9, 1.5)
    for i in range(8):
        dd = (z[i]-z.min())/(np.ptp(z)+1e-6)
        c.drawCircle(float(P[i, 0]), float(P[i, 1]), 9, skia.Paint(Color4f=hx(GOLDB, k*(1-0.6*dd)), AntiAlias=True))
        c.drawCircle(float(P[i, 0]), float(P[i, 1]), 22, skia.Paint(Color4f=hx(GOLDB, k*(1-0.6*dd)*0.5), Style=skia.Paint.kStroke_Style, StrokeWidth=1.5, AntiAlias=True))
    chapter(c, lt, 'VII', 'LOS COHOSTS', 'EL EQUIPO DE 10AMPRO EN PERSONA')
    stamp(c, lt, 'EP. 210')
    lines(c, lt, [('Ocho cohosts. 210 episodios.', 'r'), ('Discutir sin anestesia.', 'i')])
    for i, s in enumerate(NAMES):
        text_in(c, s, W/2, 1620 + i*38, 'mono', 21, MUTED, lt, 2.3 + i*0.2, track=0.08, rise=10)

def s_close(c, lt, d):
    sc = 1.15
    draw_segs(c, G_RING*sc, CX, CY, 0, 0, lt*0.12, prog=eo(ramp(lt, 0, 1.6)), width=1.8, spread=0.3)
    draw_segs(c, geo.arr(geo.circle3(250, 90, 0, 'y'))*sc, CX, CY, 0.9+lt*0.2, lt*0.6, prog=eo(ramp(lt, 0.3, 1.6)), width=1.4, col=GOLDD)
    draw_segs(c, geo.arr(geo.circle3(250, 90, 0, 'x'))*sc, CX, CY, 0.4, -lt*0.5, prog=eo(ramp(lt, 0.5, 1.8)), width=1.4, col=GOLDD)
    text_in(c, 'D', W/2, CY+105, 'cinzelB', 300, CREAM, lt, 0.4, dur=1.2, rise=0)
    a = 1 - ramp(lt, 3.0, 3.4)
    text_in(c, 'La invasión no viene con tanques.', W/2, 1400, 'corm', 58, CREAM, lt, 0.8, a=a)
    text_in(c, 'Viene con mejores modelos mentales.', W/2, 1478, 'cormi', 58, GOLDB, lt, 1.6, a=a)
    b = ramp(lt, 3.2, 3.6)
    if b > 0:
        lb = lt - 3.2
        text_in(c, 'RESERVA TU PLAZA', W/2, 330, 'mono', 28, GOLD, lb, 0.0, track=0.3)
        text_in(c, '14 · 10 · 2026', W/2, 1330, 'cinzelB', 92, CREAM, lb, 0.0, track=0.08)
        text_in(c, 'AUDITORIO FUNDADORES · EAFIT · MEDELLÍN', W/2, 1405, 'mono', 26, MUTED, lb, 0.25, track=0.12)
        text_in(c, 'USD 300 · CUPO LIMITADO', W/2, 1460, 'mono', 28, GOLD, lb, 0.45, track=0.2)
        w = text_in(c, 'eldiad.10am.pro', W/2, 1570, 'cormi', 76, GOLDB, lb, 0.7)
        k = eo(ramp(lb, 1.0, 1.6))
        if k > 0: c.drawLine(W/2 - w/2*k, 1592, W/2 + w/2*k, 1592, skia.Paint(Color4f=hx(GOLDB, 0.8), StrokeWidth=2, AntiAlias=True))

SCENES = [(5.0, s_globe), (4.6, s_terrain), (5.2, s_equation), (4.8, s_candles), (4.4, s_chain), (4.4, s_expo),
          (4.4, s_charger), (4.4, s_towers), (4.4, s_helix), (4.8, s_network), (6.8, s_close)]

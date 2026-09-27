from core import *
import geo
from kit import *

THEME = 'green'
ASPECT = 'wide'        # 1920x1080 para embed en Substack
BD_SCALE = 0.82; BCX = CX

HUD_TL = '10AMPRO · TESIS'; HUD_BL = 'HERNÁN JARAMILLO × ANTONIO LINARES'; HUD_BR = 'NYSE: HIMS'
A = geo.arr
rng = np.random.default_rng(5)

# ---------- objetos ----------
def orb(r=270):
    S = list(geo.globe(r))
    for rr in (r*0.55, r*0.38, r*0.2): S += geo.circle3(rr, 64, 0, 'z')
    return A(S)

def conveyor():
    S = []
    for z in (-60, 60): S.append((np.array([-520, 120, z]), np.array([520, 120, z])))
    for x in range(-500, 501, 100): S.append((np.array([x, 120, -60]), np.array([x, 120, 60])))
    for k in range(5): S += geo.box(-380 + k*190, 65, 0, 95, 95, 95)
    S += geo.box(-470, -110, 0, 150, 200, 8)        # formulario
    for k in range(4): S.append((np.array([-525, -170 + k*36, 4]), np.array([-415, -170 + k*36, 4])))
    return A(S)

def decline():
    S = []
    for n in range(9):
        h = 320 * 0.78**n; x = (n-4)*105
        S += geo.box(x, 200 - h/2, 0, 60, h, 60)
    S.append((np.array([-470, 200, 0]), np.array([470, 200, 0])))
    return A(S)

def diverge():
    S = []
    for n in range(6):
        hL = 150 * 0.86**n; hR = 90 * 1.34**n
        S += geo.box(-360 + n*52, 200 - hL/2, 0, 38, hL, 38)
        S += geo.box(80 + n*52, 200 - hR/2, 0, 38, hR, 38)
    S.append((np.array([-420, 200, 0]), np.array([420, 200, 0])))
    return A(S)

def loop():
    S = geo.circle3(250, 96, 0, 'z'); N = []
    for k in range(4):
        a = -math.pi/2 + k*math.pi/2; p = np.array([250*math.cos(a), 250*math.sin(a), 0])
        N.append(p); S += list(geo.icosa(48) + p)
    for k in range(4):                                # flechas sobre el anillo
        a = -math.pi/4 + k*math.pi/2; p = np.array([250*math.cos(a), 250*math.sin(a), 0])
        t = np.array([-math.sin(a), math.cos(a), 0]); n = np.array([math.cos(a), math.sin(a), 0])
        S += [(p, p - t*26 + n*16), (p, p - t*26 - n*16)]
    return A(S), N

def cyl(cx, cz, r, h, y0=250, n=40, rings=3):
    S = []
    for k in range(rings):
        S += [(p[0]+np.array([cx, 0, cz]), p[1]+np.array([cx, 0, cz])) for p in geo.circle3(r, n, y0 - h*k/(rings-1))]
    for k in range(8):
        a = k*math.pi/4
        S.append((np.array([cx+r*math.cos(a), y0, cz+r*math.sin(a)]), np.array([cx+r*math.cos(a), y0-h, cz+r*math.sin(a)])))
    return S

def plant():
    S = cyl(-200, 0, 90, 360) + cyl(20, 60, 70, 250) + cyl(200, -20, 105, 190, rings=2)
    t = np.linspace(0, 1, 16)[:, None]
    for p0, p1 in (((-110, -60, 0), (-50, -60, 60)), ((90, 20, 60), (90, 20, -20)), ((-200, -110, 0), (-200, -240, 0))):
        P = np.array(p0)*(1-t)+np.array(p1)*t; S += geo.poly(P)
    S += geo.circle3(340, 90, 250)
    return A(S)

def signal():
    G, V = geo.network(240); S = list(G)
    for v in V:
        for k in range(5): S.append((v, v + rng.normal(0, 1, 3)*70))
    return A(S)

def register():
    S = geo.box(0, 60, 0, 360, 220, 220) + geo.box(0, -90, -40, 300, 80, 140)
    crack = np.array([[-180, -40], [-100, 10], [-130, 70], [-40, 110], [-70, 170]], float)
    S += geo.poly(np.c_[crack, np.full(len(crack), -111)])
    S += geo.box(160, -170, 0, 90, 130, 4)          # recibo
    for k in range(3): S.append((np.array([125, -205 + k*32, 2]), np.array([195, -205 + k*32, 2])))
    return A(S)

def giants():
    S = []
    for k, (y, sz) in enumerate(((-150, 90), (0, 110), (150, 80))): S += geo.box(-330, y, 0, sz, sz, sz)
    S += geo.box(-80, 0, 0, 30, 460, 300)          # muro
    S += geo.circle3(150, 72, 0, 'z') ; S = [(p0 + np.array([220, 0, 0]) if i >= len(S)-72 else p0, p1 + np.array([220, 0, 0]) if i >= len(S)-72 else p1) for i, (p0, p1) in enumerate(S)]
    return A(S)

def pillars():
    S = []
    for k in range(3): S += geo.box((k-1.5)*190, 40, 0, 110, 380, 110)
    S.append((np.array([-380, 230, 0]), np.array([380, 230, 0])))
    return A(S), A(geo.box(1.5*190, 40, 0, 110, 380, 110))

G_ORB = orb(); G_CV = conveyor(); G_DC = decline(); G_DV = diverge(); G_LP, LP_N = loop(); G_PL = plant()
G_SG = signal(); G_RG = register(); G_GI = giants(); G_P3, G_P4 = pillars(); G_EX, EX_XY = geo.expo(); G_RING = geo.rings()
ORD_CV = np.argsort(G_CV[:, :, 0].mean(1)); ORD_DC = np.argsort(G_DC[:, :, 0].mean(1)); ORD_DV = np.argsort(G_DV[:, :, 0].mean(1))
ORD_EX = np.argsort(G_EX[:, :, 0].mean(1)); ORD_P3 = np.argsort(G_P3[:, :, 0].mean(1)); ORD_GI = np.argsort(G_GI[:, :, 0].mean(1))

def label(c, s, x, y, k, col=GOLDB, size=22, align='c'):
    text(c, s, x, y, 'mono', size, col, k, 0.18, align)

# ---------- escenas ----------
def s_open(c, lt, d):
    draw_segs(c, G_ORB, CX, CY, -0.2, lt*0.35, prog=eo(ramp(lt, 0.05, 2.2)), width=1.6)
    k = ramp(lt, 1.8, 2.4)
    if k > 0: ping(c, CX, CY, lt, a=k)
    text_in(c, 'LA TESIS · 10AMPRO', TX, 330, 'mono', 26, GOLD, lt, 0.2, track=0.25)
    text_in(c, 'NYSE: HIMS', TX, 430, 'mono', 30, GOLDD, lt, 0.8, track=0.3, rise=0)
    text_in(c, 'HIMS', TX, 585, 'cinzelB', 150, CREAM, lt, 1.2, dur=1.0, track=0.08)
    text_in(c, 'no es telemedicina', TX, 680, 'cormi', 66, GOLDB, lt, 1.9)
    text_in(c, 'El mercado la valora como un call center con receta.', TX, 790, 'corm', 46, MUTED, lt, 2.4)

def s_bear(c, lt, d):
    draw_segs(c, G_CV, CX, CY, 0.3, -0.5 + lt*0.15, prog=eo(ramp(lt, 0.05, 2.4)), width=1.7, order=ORD_CV, spread=0.7)
    chapter(c, lt, 'I', 'EL ALEGATO', 'LO QUE DICE EL MERCADO')
    stamp(c, lt, '4 MINUTOS', size=84)
    lines(c, lt, [('Formulario, receta, farmacia de terceros.', 'r'), ('"Cualquiera puede montar eso."', 'i')])

def s_grave(c, lt, d):
    draw_segs(c, G_DC, CX, CY, 0.25, -0.45 + lt*0.18, prog=eo(ramp(lt, 0.05, 2.4)), width=1.9, order=ORD_DC, spread=0.8)
    chapter(c, lt, 'II', 'EL CEMENTERIO', 'LOS CANALES DE ACCESO MUEREN')
    stamp(c, lt, '$13.4B', size=110)
    lines(c, lt, [('Teladoc compró Livongo por $18.5B.', 'r'), ('En 2022 borró $13.4B en impairments.', 'i')])

def s_quarter(c, lt, d):
    rx, ry = 0.22, -0.4 + lt*0.16
    draw_segs(c, G_DV, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.4)), width=1.9, order=ORD_DV, spread=0.8)
    k = ramp(lt, 1.8, 2.3)
    x, y, _ = pt([-230, 250, 0], rx, ry); label(c, 'CANAL', x, y, k, MUTED)
    x, y, _ = pt([210, 250, 0], rx, ry); label(c, 'LOOP', x, y, k)
    chapter(c, lt, 'III', 'EL MISMO TRIMESTRE', 'MISMO EBITDA GUIADO · DOS DIRECCIONES')
    stamp(c, lt, '−4%  vs  +38%', size=88)
    lines(c, lt, [('Teladoc: $607M, cayendo 4%.', 'r'), ('HIMS: $753M, creciendo 38%.', 'i')])

def s_loop(c, lt, d):
    rx, ry = 0.15, -0.25 + 0.5*eio(lt/d)
    draw_segs(c, G_LP, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.4)), width=2.0, spread=0.8)
    k = ramp(lt, 1.6, 2.1)
    for p, n, dy in zip(LP_N, ('INTAKE', 'TRATAMIENTO', 'DESENLACE', 'SEGUIMIENTO'), (-78, 0, 84, 0)):
        x, y, _ = pt(p, rx, ry); label(c, n, x + (95 if n == 'TRATAMIENTO' else (-105 if n == 'SEGUIMIENTO' else 0)), y + dy + 8, k, align=('l' if n == 'TRATAMIENTO' else ('r' if n == 'SEGUIMIENTO' else 'c')))
    chapter(c, lt, 'IV', 'EL LOOP CERRADO', 'EL DATO NO ES EL ACTIVO · EL LOOP SÍ')
    stamp(c, lt, '4 ESLABONES', size=84)
    lines(c, lt, [('Intervención, resultado, atribución.', 'r'), ('La telemedicina tiene solo el primero.', 'i')])

def s_plant(c, lt, d):
    draw_segs(c, G_PL, CX, CY, 0.22, -0.5 + lt*0.25, prog=eo(ramp(lt, 0.05, 2.2)), width=1.8)
    chapter(c, lt, 'V', 'TRATAMIENTO', 'DONDE LA TELEMEDICINA SUBCONTRATA')
    stamp(c, lt, '+1M ft²', size=100)
    lines(c, lt, [('Farmacias y laboratorios propios.', 'r'), ('Sabe qué lote llegó a quién y cuándo.', 'i')])

def s_signal(c, lt, d):
    draw_segs(c, G_SG, CX, CY, 0.2, lt*0.3, prog=eo(ramp(lt, 0.05, 2.4)), width=1.5, spread=0.6)
    chapter(c, lt, 'VI', 'SEGUIMIENTO', 'HERS WEIGHT LOSS · AI DESDE JULIO')
    stamp(c, lt, '3× SEÑAL', size=100)
    lines(c, lt, [('3× más mensajes, 80% resueltos por AI.', 'r'), ('~50% menos tareas clínicas humanas.', 'i')])

def s_ftc(c, lt, d):
    draw_segs(c, G_RG, CX, CY, 0.28, -0.55 + lt*0.18, prog=eo(ramp(lt, 0.05, 2.2)), width=1.8)
    chapter(c, lt, 'VII', 'LA ANÉCDOTA', 'FTC · DEMANDA DEL 29 DE JULIO')
    stamp(c, lt, '$47.5M', size=110)
    lines(c, lt, [('Cobros dobles, cancelar enterrado.', 'r'), ('La queja vive en la puerta, no en el loop.', 'i')])

def s_giants(c, lt, d):
    rx, ry = 0.2, -0.45 + lt*0.14
    draw_segs(c, G_GI, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.4)), width=1.8, order=ORD_GI, spread=0.75)
    chapter(c, lt, 'VIII', 'LOS GRANDES', 'NOVO · AMAZON · FRONTIER MODELS')
    stamp(c, lt, '9 AÑOS', size=104)
    lines(c, lt, [('Inteligencia infinita, cero desenlaces.', 'r'), ('Lo que nadie puede comprar es tiempo.', 'i')])

def s_box4(c, lt, d):
    rx, ry = 0.24, -0.4 + lt*0.16
    draw_segs(c, G_P3, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.2)), width=1.9, order=ORD_P3, spread=0.7)
    draw_segs(c, G_P4, CX, CY, rx, ry, prog=eo(ramp(lt, 1.6, 2.6)), width=1.1, col=GOLDD, a=0.55)
    k = ramp(lt, 1.7, 2.2)
    for x, n in ((-285, 'ESCALA'), (-95, 'LOOP'), (95, 'ONTOLOGÍA'), (285, 'MARGEN')):
        px, py, _ = pt([x, 275, 0], rx, ry); label(c, n, px, py, k, GOLDB if n != 'MARGEN' else MUTED, 20)
    chapter(c, lt, 'IX', 'LA CUARTA CASILLA', 'FCF −$68M MIENTRAS LA ONTOLOGÍA SE DENSIFICA')
    stamp(c, lt, '3 DE 4', size=110)
    lines(c, lt, [('Escala, loop y ontología: llenas.', 'r'), ('Margen: la misma casilla que Spotify llenó tarde.', 'i')])

def s_price(c, lt, d):
    rx, ry = 0.08, -0.38 + 0.22*eio(lt/d)
    draw_segs(c, G_EX, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.6)), width=2.0, order=ORD_EX, spread=0.8)
    xs, ys = EX_XY
    x, y, _ = pt([xs[0], ys[0], 0], rx, ry); label(c, '2017', x, y-26, ramp(lt, 0.8, 1.2))
    k2 = ramp(lt, 2.5, 2.9); x, y, _ = pt([xs[-1], ys[-1], 0], rx, ry)
    if k2 > 0: ping(c, x, y, lt, a=k2)
    chapter(c, lt, 'X', 'EL PRECIO', 'EL MERCADO PAGA POR LO VENDIDO, NO POR LO APRENDIDO')
    stamp(c, lt, '~2× VENTAS', size=96)
    lines(c, lt, [('Un loop de nueve años, a dos veces ventas.', 'r'), ('La brecha se compone cada trimestre.', 'i')])

def s_close(c, lt, d):
    draw_segs(c, G_RING*1.05, CX, CY, 0, 0, lt*0.12, prog=eo(ramp(lt, 0, 1.6)), width=1.6, spread=0.3)
    draw_segs(c, G_ORB*0.78, CX, CY, -0.2, lt*0.4, prog=eo(ramp(lt, 0.2, 1.8)), width=1.3, col=GOLDD)
    a = 1 - ramp(lt, 3.0, 3.4)
    text_in(c, 'La telemedicina termina', TX, 520, 'corm', 62, CREAM, lt, 0.6, a=a)
    text_in(c, 'donde HIMS empieza.', TX, 600, 'cormi', 62, GOLDB, lt, 1.2, a=a)
    b = ramp(lt, 3.2, 3.6)
    if b > 0:
        lb = lt - 3.2
        text_in(c, 'LEE LA TESIS COMPLETA', TX, 380, 'mono', 28, GOLD, lb, 0.0, track=0.3)
        w = text_in(c, '10am.pro', TX, 520, 'cormi', 96, GOLDB, lb, 0.2)
        k = eo(ramp(lb, 0.6, 1.2))
        if k > 0: c.drawLine(TX - w/2*k, 546, TX + w/2*k, 546, skia.Paint(Color4f=hx(GOLDB, 0.8), StrokeWidth=2, AntiAlias=True))
        text_in(c, 'DÍA D · 14 OCT · MEDELLÍN · eldiad.10am.pro', TX, 640, 'mono', 26, CREAM, lb, 0.5, track=0.16)
        text_in(c, 'X: @HOLDMYBIRRA', TX, 700, 'mono', 24, MUTED, lb, 0.7, track=0.2)
        text_in(c, 'CONTENIDO EDUCATIVO · NO ES ASESORÍA DE INVERSIÓN', TX, 800, 'mono', 19, MUTED, lb, 0.9, a=0.8, track=0.08)

SCENES = [(5.0, s_open), (4.4, s_bear), (4.4, s_grave), (4.6, s_quarter), (4.8, s_loop), (4.4, s_plant),
          (4.4, s_signal), (4.4, s_ftc), (4.4, s_giants), (4.8, s_box4), (4.6, s_price), (6.8, s_close)]

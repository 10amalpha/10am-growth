from core import *
import geo
from kit import *

THEME = 'green'

HUD_TL = '10AMPRO · TESIS'; HUD_BL = 'EL CHAT DE 10AMPRO'; HUD_BR = 'NYSE: PLTR'
A = geo.arr

def orb(r=280):
    S = list(geo.globe(r))
    for rr, z in ((r*0.55, 0), (r*0.38, 0), (r*0.2, 0)):
        S += geo.circle3(rr, 64, z, 'z')
    return A(S)

rng = np.random.default_rng(11)
def fraud():
    P = rng.normal(0, 1, (70, 3)); P /= np.linalg.norm(P, axis=1)[:, None]; P *= (rng.random(70)**0.4*320)[:, None]
    S, HL = [], []
    hot = set(range(0, 70, 9))
    for i in range(70):
        d = np.linalg.norm(P-P[i], axis=1); nn = np.argsort(d)[1:4]
        for j in nn:
            if i < j or i not in [x for x in np.argsort(np.linalg.norm(P-P[j], axis=1))[1:4]]:
                (HL if (i in hot and j in hot) or (i in hot) else S).append((P[i], P[j]))
    return A(S), A(HL), P, sorted(hot)

def founders():
    S = []; V = []
    for k in range(3):
        a = k*2*math.pi/3 - math.pi/2
        x, z = 240*math.cos(a), 240*math.sin(a); V.append(np.array([x, -250, z]))
        S += geo.box(x, 0, z, 70, 500, 70)
    for i in range(3):
        S.append((V[i], V[(i+1) % 3])); S.append((V[i], np.array([0, -420, 0])))
    S += geo.circle3(240, 72, 250)
    return A(S), V

def cyl(cx, cz, r, h, y0=250, n=40, rings=3):
    S = []
    for k in range(rings):
        S += [(p[0]+np.array([cx, 0, cz]), p[1]+np.array([cx, 0, cz])) for p in geo.circle3(r, n, y0 - h*k/(rings-1))]
    for k in range(8):
        a = k*math.pi/4
        S.append((np.array([cx+r*math.cos(a), y0, cz+r*math.sin(a)]), np.array([cx+r*math.cos(a), y0-h, cz+r*math.sin(a)])))
    return S

def ontology():
    ent = geo.icosa(90) + np.array([-230, 60, 0])
    rel = A(geo.box(230, 60, 0, 150, 150, 150))
    oc = np.array([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])*100 + np.array([0, -260, 0])
    act = A([(oc[i], oc[j]) for i in range(6) for j in range(i+1, 6) if np.linalg.norm(oc[i]-oc[j]) < 150])
    C = [np.array([-230, 60, 0]), np.array([230, 60, 0]), np.array([0, -260, 0])]
    L = A([(C[0], C[1]), (C[1], C[2]), (C[2], C[0])])
    sat = []
    for c0 in C:
        for k in range(6):
            p = c0 + rng.normal(0, 1, 3)*95
            sat.append((c0, p))
    return np.concatenate([ent, rel, act, L]), A(sat), C

def twin():
    S = []; hs = rng.integers(60, 260, (4, 4))
    for side, dx in ((0, -230), (1, 230)):
        for i in range(4):
            for j in range(4):
                h = hs[i, j]; x = dx + (i-1.5)*95; z = (j-1.5)*95
                S += geo.box(x, 200-h/2, z, 70, h, 70)
    for i in range(4):
        S.append((np.array([-230+(i-1.5)*95, 230, 190]), np.array([230+(i-1.5)*95, 230, 190])))
    return A(S)

def stack():
    S = []; ys = (200, 60, -80)
    for y in ys: S += geo.box(0, y, 0, 520, 14, 360)
    for sx in (-1, 1):
        for sz in (-1, 1):
            S.append((np.array([sx*250, 200, sz*170]), np.array([sx*250, -80, sz*170])))
    for k in range(4):
        x = (k-1.5)*120; S += geo.box(x, -200, 0, 70, 70, 70); S.append((np.array([x, -165, 0]), np.array([x, -87, 0])))
    return A(S)

def nrr():
    S = []
    for n in range(10):
        h = 60*1.28**n; x = (n-4.5)*88
        S += geo.box(x, 260-h/2, 0, 50, h, 50)
    return A(S)

def cube27():
    S = []
    for i in range(3):
        for j in range(3):
            for k in range(3):
                S += geo.box((i-1)*120, (1-j)*120, (k-1)*120, 104, 104, 104)
    return A(S)

def refinery():
    S = cyl(-200, 0, 90, 380) + cyl(20, 60, 70, 260) + cyl(200, -20, 110, 200, rings=2)
    t = np.linspace(0, 1, 16)[:, None]
    for p0, p1 in (((-110, -60, 0), (-50, -60, 60)), ((90, 20, 60), (90, 20, -20)), ((-200, -130, 0), (-200, -260, 0))):
        P = np.array(p0)*(1-t)+np.array(p1)*t; S += geo.poly(P)
    S += geo.circle3(360, 90, 250)
    return A(S)

G_ORB = orb(); G_FR, G_FRH, FR_P, FR_HOT = fraud(); G_FO, FO_V = founders(); G_ON, G_ONS, ON_C = ontology()
G_TW = twin(); G_ST = stack(); G_NR = nrr(); G_CU = cube27(); G_RF = refinery(); G_EX, EX_XY = geo.expo(); G_RING = geo.rings()
ORD_NR = np.argsort(G_NR[:, :, 0].mean(1)); ORD_CU = np.argsort(-G_CU[:, :, 1].mean(1)); ORD_EX = np.argsort(G_EX[:, :, 0].mean(1))
ORD_ST = np.argsort(-G_ST[:, :, 1].mean(1))

def label(c, s, x, y, k, col=GOLDB, size=22):
    text(c, s, x, y, 'mono', size, col, k, 0.18)

def s_open(c, lt, d):
    draw_segs(c, G_ORB, CX, CY, -0.2, lt*0.35, prog=eo(ramp(lt, 0.05, 2.2)), width=1.6)
    k = ramp(lt, 1.8, 2.4)
    if k > 0: ping(c, CX, CY, lt, a=k)
    text_in(c, 'LA TESIS · HERNÁN JARAMILLO', W/2, 330, 'mono', 26, GOLD, lt, 0.2, track=0.25)
    text_in(c, 'EST. 2003', W/2, 1300, 'mono', 30, GOLDD, lt, 0.8, track=0.3, rise=0)
    text_in(c, 'PALANTIR', W/2, 1440, 'cinzelB', 124, CREAM, lt, 1.2, dur=1.0, track=0.08)
    text_in(c, 'La compañía más importante', W/2, 1530, 'cormi', 60, GOLDB, lt, 1.9)
    text_in(c, 'de Occidente', W/2, 1600, 'cormi', 60, GOLDB, lt, 2.2)

def s_fraud(c, lt, d):
    rx, ry = 0.2, lt*0.35
    draw_segs(c, G_FR, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 1.8)), width=1.2, col=GOLDD)
    draw_segs(c, G_FRH, CX, CY, rx, ry, prog=eo(ramp(lt, 1.2, 2.8)), width=2.4, col=GOLDB)
    k = ramp(lt, 2.2, 2.7)
    if k > 0:
        for i in FR_HOT:
            x, y, _ = pt(FR_P[i], rx, ry); c.drawCircle(x, y, 6, skia.Paint(Color4f=hx(GOLDB, k), AntiAlias=True))
    chapter(c, lt, 'I', 'LOS ORÍGENES', 'PAYPAL · PRINCIPIOS DE LOS 2000')
    stamp(c, lt, '−90%', size=96)
    lines(c, lt, [('PayPal redujo el fraude 90%.', 'r'), ('Humanos en el loop.', 'i')])

def s_found(c, lt, d):
    rx, ry = 0.28, -0.4 + lt*0.25
    draw_segs(c, G_FO, CX, CY+20, rx, ry, prog=eo(ramp(lt, 0.05, 2.0)), width=2.0, cam=2300)
    k = ramp(lt, 1.6, 2.1)
    for v, n in zip(FO_V, ('THIEL', 'KARP', 'LONSDALE')):
        x, y, _ = pt(v + np.array([0, 500, 0]), rx, ry, cy=CY+20, cam=2300); label(c, n, x, y+44, k)
    chapter(c, lt, 'II', 'LA FUNDACIÓN', 'IN-Q-TEL · PRIMER INVERSOR · 2005')
    stamp(c, lt, '2003')
    lines(c, lt, [('Thiel. Karp. Lonsdale.', 'r'), ('Silicon Valley conoce a Langley.', 'i')])

def s_onto(c, lt, d):
    rx, ry = 0.2, -0.3 + lt*0.3
    draw_segs(c, G_ONS, CX, CY, rx, ry, prog=eo(ramp(lt, 0.6, 2.4)), width=1.1, col=GOLDD)
    draw_segs(c, G_ON, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 1.8)), width=2.2)
    k = ramp(lt, 1.5, 2.0)
    for p, n in zip(ON_C, ('ENTIDAD', 'RELACIÓN', 'ACCIÓN')):
        x, y, _ = pt(p, rx, ry); label(c, n, x, y + (150 if n != 'ACCIÓN' else -135), k)
    chapter(c, lt, 'III', 'ONTOLOGÍA', 'EL LENGUAJE SECRETO DE LA REALIDAD')
    text_in(c, 'Valor = Información × Contexto²', W/2, 1330, 'cinzel', 50, GOLD, lt, 0.9, track=0.02, rise=0)
    lines(c, lt, [('Más datos, más complejidad.', 'r'), ('Con ontología: más claridad.', 'i')])

def s_twin(c, lt, d):
    draw_segs(c, G_TW, CX, CY, 0.42, -0.5 + lt*0.22, prog=eo(ramp(lt, 0.05, 2.4)), width=1.6)
    chapter(c, lt, 'IV', 'GEMELOS DIGITALES', 'NHS · U.S. ARMY · AIRBUS · BP')
    stamp(c, lt, 'REAL · DIGITAL', size=66)
    lines(c, lt, [('Un mundo paralelo operacional.', 'r'), ('Simular antes de decidir.', 'i')])

def s_aip(c, lt, d):
    rx, ry = 0.38, -0.55 + lt*0.25
    draw_segs(c, G_ST, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.2)), width=1.8, order=ORD_ST, spread=0.7)
    k = ramp(lt, 1.8, 2.3)
    for y, n in ((200, 'DATOS'), (60, 'ONTOLOGÍA'), (-80, 'AIP'), (-200, 'CUALQUIER LLM')):
        x, yy, _ = pt([-290, y, 0], rx, ry); text(c, n, x-24, yy+8, 'mono', 22, GOLDB, k, 0.18, 'r')
    chapter(c, lt, 'V', 'AIP · 2023', 'EL SISTEMA OPERATIVO DE LA ERA DE LA IA')
    text_in(c, 'Capacidad × Confianza × Control', W/2, 1330, 'cinzel', 48, GOLD, lt, 0.9, track=0.02, rise=0)
    lines(c, lt, [('Agnóstico al modelo.', 'r'), ('Obsesivo con el control.', 'i')])

def s_nrr(c, lt, d):
    draw_segs(c, G_NR, CX, CY, 0.22, -0.45 + lt*0.18, prog=eo(ramp(lt, 0.05, 2.4)), width=2.0, order=ORD_NR, spread=0.8)
    chapter(c, lt, 'VI', 'RETENCIÓN NETA', 'LOS CLIENTES GASTAN MÁS CADA AÑO')
    stamp(c, lt, '128%', size=110)
    lines(c, lt, [('Donde 90% es excelente,', 'r'), ('128% es casi un milagro.', 'i')])

def s_boot(c, lt, d):
    draw_segs(c, G_CU, CX, CY, 0.5, 0.6 + lt*0.35, prog=eo(ramp(lt, 0.05, 2.6)), width=1.4, order=ORD_CU, spread=0.85)
    chapter(c, lt, 'VII', 'BOOTCAMPS', 'DATOS REALES · SOLUCIONES EN VIVO')
    stamp(c, lt, '2–3 DÍAS', size=84)
    lines(c, lt, [('No venden demos.', 'r'), ('Venden capacidad probada.', 'i')])

def s_refin(c, lt, d):
    draw_segs(c, G_RF, CX, CY, 0.22, -0.5 + lt*0.25, prog=eo(ramp(lt, 0.05, 2.2)), width=1.8)
    chapter(c, lt, 'VIII', 'PLTR > NVDA', 'LA TESIS DE INVERSIÓN')
    stamp(c, lt, 'LA REFINERÍA', size=66)
    lines(c, lt, [('NVIDIA vende picos y palas.', 'r'), ('Palantir vende encontrar el oro.', 'i')])

def s_5t(c, lt, d):
    rx, ry = 0.08, -0.38 + 0.22*eio(lt/d)
    draw_segs(c, G_EX, CX, CY, rx, ry, prog=eo(ramp(lt, 0.05, 2.6)), width=2.0, order=ORD_EX, spread=0.8)
    xs, ys = EX_XY
    x, y, _ = pt([xs[0], ys[0], 0], rx, ry); text(c, '2003', x, y-26, 'mono', 26, GOLDB, ramp(lt, 0.8, 1.2), 0.1)
    k2 = ramp(lt, 2.5, 2.9); x, y, _ = pt([xs[-1], ys[-1], 0], rx, ry)
    if k2 > 0: ping(c, x, y, lt, a=k2); text(c, '$5T', x-10, y-34, 'mono', 30, GOLDB, k2, 0.1, 'r')
    chapter(c, lt, 'IX', 'EL CAMINO A $5T', 'EL MOMENTO MICROSOFT DE LOS 90')
    stamp(c, lt, '$5T', size=110)
    lines(c, lt, [('Microsoft tardó 44 años en llegar a $3T.', 'r'), ('¿Palantir, antes de cumplir 30?', 'i')])

def s_close(c, lt, d):
    draw_segs(c, G_RING*1.15, CX, CY, 0, 0, lt*0.12, prog=eo(ramp(lt, 0, 1.6)), width=1.6, spread=0.3)
    draw_segs(c, G_ORB*0.78, CX, CY, -0.2, lt*0.4, prog=eo(ramp(lt, 0.2, 1.8)), width=1.3, col=GOLDD)
    a = 1 - ramp(lt, 3.0, 3.4)
    text_in(c, 'El futuro pertenece a quienes', W/2, 1400, 'corm', 58, CREAM, lt, 0.8, a=a)
    text_in(c, 'pueden ver claramente.', W/2, 1476, 'cormi', 58, GOLDB, lt, 1.5, a=a)
    b = ramp(lt, 3.2, 3.6)
    if b > 0:
        lb = lt - 3.2
        text_in(c, 'LEE LA TESIS COMPLETA', W/2, 330, 'mono', 28, GOLD, lb, 0.0, track=0.3)
        text_in(c, 'EL CHAT DE 10AMPRO', W/2, 1330, 'cinzelB', 66, CREAM, lb, 0.0, track=0.06)
        w = text_in(c, '10am.pro', W/2, 1450, 'cormi', 84, GOLDB, lb, 0.3)
        k = eo(ramp(lb, 0.6, 1.2))
        if k > 0: c.drawLine(W/2 - w/2*k, 1474, W/2 + w/2*k, 1474, skia.Paint(Color4f=hx(GOLDB, 0.8), StrokeWidth=2, AntiAlias=True))
        text_in(c, 'X: @HOLDMYBIRRA', W/2, 1540, 'mono', 26, MUTED, lb, 0.5, track=0.2)
        text_in(c, 'CONTENIDO EDUCATIVO · NO ES ASESORÍA DE INVERSIÓN', W/2, 1640, 'mono', 19, MUTED, lb, 0.8, a=0.8, track=0.08)

SCENES = [(5.2, s_open), (4.6, s_fraud), (4.6, s_found), (5.0, s_onto), (4.4, s_twin), (4.8, s_aip),
          (4.4, s_nrr), (4.2, s_boot), (4.6, s_refin), (4.8, s_5t), (6.8, s_close)]

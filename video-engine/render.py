import sys, subprocess
from core import *
import os, importlib, geo
scenes = importlib.import_module(os.environ.get('DD_SCENES', 'scenes'))

TOTAL_SC = sum(d for d, _ in scenes.SCENES); OUTRO = 2.5; TOTAL = TOTAL_SC + OUTRO
STARTS = np.cumsum([0] + [d for d, _ in scenes.SCENES])

def mk_vignette():
    s = skia.Surface(W, H); c = s.getCanvas(); c.clear(hx(BG))
    sh = skia.GradientShader.MakeRadial((W/2, 880), 1150, [hx(VIGC).toColor(), hx(BG).toColor(), hx('#020202').toColor()], [0.0, 0.55, 1.0])
    c.drawRect(skia.Rect(0, 0, W, H), skia.Paint(Shader=sh)); return s.makeImageSnapshot()
VIG = mk_vignette()
rng = np.random.default_rng(7)
GRAIN = []
for i in range(4):
    n = rng.integers(0, 255, (H//2, W//2), dtype=np.uint8)
    a = np.zeros((H//2, W//2, 4), np.uint8); a[..., 0] = a[..., 1] = a[..., 2] = n; a[..., 3] = 14
    GRAIN.append(skia.Image.fromarray(a, colorType=skia.kRGBA_8888_ColorType))

LOGO = None
def logo():
    global LOGO
    if LOGO is None:
        from PIL import Image, ImageDraw
        im = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'logo.jpg')).convert('RGBA').resize((620, 620), Image.LANCZOS)
        m = Image.new('L', (620*4, 620*4), 0); ImageDraw.Draw(m).ellipse((40, 40, 620*4-40, 620*4-40), fill=255)
        im.putalpha(m.resize((620, 620), Image.LANCZOS))
        LOGO = skia.Image.fromarray(np.array(im), colorType=skia.kRGBA_8888_ColorType)
    return LOGO

def hud(c, t, idx):
    p = skia.Paint(Color4f=hx(GOLDD, 0.55), StrokeWidth=2, AntiAlias=True)
    m, L = 56, 46
    for (x, y, dx, dy) in ((m, m, 1, 1), (W-m, m, -1, 1), (m, H-m, 1, -1), (W-m, H-m, -1, -1)):
        c.drawLine(x, y, x+dx*L, y, p); c.drawLine(x, y, x, y+dy*L, p)
    text(c, getattr(scenes, 'HUD_TL', '10AMPRO · EL DÍA D'), 96, 118, 'mono', 22, MUTED, 0.9, 0.2, 'l')
    text(c, f'{idx+1:02d} / {len(scenes.SCENES):02d}', W-96, 118, 'mono', 22, GOLD, 0.95, 0.2, 'r')
    c.drawLine(96, 142, W-96, 142, skia.Paint(Color4f=hx(SMOKE, 0.7), StrokeWidth=1))
    text(c, getattr(scenes, 'HUD_BL', 'ANNO · MMXXVI'), 96, H-104, 'mono', 22, MUTED, 0.8, 0.2, 'l')
    text(c, getattr(scenes, 'HUD_BR', '14.10.2026 · MEDELLÍN'), W-96, H-104, 'mono', 22, MUTED, 0.8, 0.2, 'r')

def backdrop(c, t, a):
    c.save(); c.translate(W/2, scenes.CY); c.rotate(t*3.0)
    ring = skia.Paint(Color4f=hx(SMOKE, 0.55*a), Style=skia.Paint.kStroke_Style, StrokeWidth=1.2, AntiAlias=True)
    for r in (440, 470): c.drawCircle(0, 0, r, ring)
    tick = skia.Paint(Color4f=hx(SMOKE, 0.7*a), StrokeWidth=1.2, AntiAlias=True)
    for i in range(120):
        L = 14 if i % 10 == 0 else 6
        c.save(); c.rotate(i*3); c.drawLine(0, -470, 0, -470+L, tick); c.restore()
    glyphs = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'
    for i, g in enumerate(glyphs):
        c.save(); c.rotate(i*360/len(glyphs)); text(c, g, 0, -485, 'mono', 18, SMOKE, 0.9*a); c.restore()
    c.restore()

def frame(t):
    s = skia.Surface(W, H); c = s.getCanvas()
    if t >= TOTAL_SC:
        lt = t - TOTAL_SC
        c.clear(hx('#1F4133'))
        k = eo(ramp(lt, 0, 0.7)); sc = 0.9 + 0.1*k
        img = logo(); w = 620*sc
        c.drawImageRect(img, skia.Rect(W/2-w/2, H/2-w/2, W/2+w/2, H/2+w/2), skia.SamplingOptions(skia.FilterMode.kLinear), skia.Paint(Alphaf=k))
        f = 1 - ramp(lt, 0, 0.35)
        if f > 0: c.drawRect(skia.Rect(0, 0, W, H), skia.Paint(Color4f=hx(BG, f)))
        return s
    c.drawImage(VIG, 0, 0)
    idx = int(np.searchsorted(STARTS, t, side='right') - 1); idx = min(idx, len(scenes.SCENES)-1)
    d, fn = scenes.SCENES[idx]; lt = t - STARTS[idx]
    a = min(eo(ramp(lt, 0, 0.45)), 1 - eio(ramp(lt, d-0.4, d)))
    if idx == len(scenes.SCENES)-1: a = eo(ramp(lt, 0, 0.45))
    backdrop(c, t, 0.6 + 0.4*a)
    c.saveLayerAlpha(None, int(255*a)); fn(c, lt, d); c.restore()
    hud(c, t, idx)
    g = GRAIN[int(t*FPS) % 4]
    c.drawImageRect(g, skia.Rect(0, 0, W, H))
    fl = 1 - ramp(lt, 0, 0.18)
    if idx > 0 and fl > 0:
        c.drawRect(skia.Rect(0, 0, W, H), skia.Paint(Color4f=hx(GOLDB, 0.10*fl)))
    return s

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'stills':
        for t in [float(x) for x in sys.argv[2:]]:
            frame(t).makeImageSnapshot().save(f'stills/still_{t:05.1f}.png', skia.kPNG)
    else:
        out = sys.argv[2]; n = int(round(TOTAL*FPS)); a0 = int(sys.argv[3]); a1 = min(n, int(sys.argv[4]))
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                               '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
        for i in range(a0, a1):
            s = frame(i/FPS)
            ff.stdin.write(s.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType).tobytes())
            if i % 150 == 0: print(i, n, flush=True)
        ff.stdin.close(); ff.wait(); print('done', TOTAL)

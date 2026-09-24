# 10AMPRO Wireframe Video Engine — Playbook

Vertical 9:16 (1080×1920, 30 fps) motion-graphics videos: wireframe 3D line art + serif titles + HUD + generated score + 10AMPRO logo outro. Pure code (skia-python + numpy + ffmpeg). No generative video, no stock, no copyrighted audio.

## Pipeline
```bash
git clone --depth=1 https://x-access-token:$PAT@github.com/10amalpha/10am-growth.git /home/claude/g && cd /home/claude/g/video-engine
python3 make.py setup                                   # deps (fonts are in repo)
# write scenes_<slug>.py  (copy scenes_pltr.py as template)
python3 make.py stills scenes_<slug> 3 8 13 ...         # stills/sheet.jpg -> VIEW IT, fix, repeat
python3 make.py render scenes_<slug>                     # one chunk (~450 frames) per call; repeat until "ALL CHUNKS DONE"
python3 make.py final scenes_<slug> /mnt/user-data/outputs/<Name>_9x16_v1.mp4
```
Each bash call has a 300 s limit: never render everything in one call, never background with nohup (it gets killed). `make.py render` resumes where it stopped.
Commit the new `scenes_<slug>.py` back to `10am-growth/video-engine/` after delivery (folder is in .vercelignore, no deploy impact).

## Scene module contract
```python
from core import *; import geo; from kit import *
THEME = 'green'            # 'green' = 10AMPRO verde/amarillo · 'gold' = dorado/negro (El Día D)
HUD_TL = '10AMPRO · TESIS'; HUD_BL = 'EL CHAT DE 10AMPRO'; HUD_BR = 'NYSE: PLTR'
def s_x(c, lt, d): ...     # c = skia canvas, lt = local time (s), d = scene duration
SCENES = [(5.2, s_open), (4.6, s_x), ..., (6.8, s_close)]   # last scene = CTA, no fade-out
```
Outro (2.5 s, #1F4133, logo) and score are added automatically.

## Layout (safe zone for Reels: keep key text between y=260 and y=1620)
- y 300–440: `chapter(c, lt, 'III', 'TÍTULO', 'SUBTÍTULO MONO')`
- y ~900: object center (`CX, CY`)
- y 1330: `stamp(c, lt, '128%', size=...)` big number/date/keyword
- y 1445+: `lines(c, lt, [('frase normal', 'r'), ('frase itálica dorada', 'i')])`
- Max ~34 chars per line at 58 px. Split longer lines.

## Building objects
- `geo`: globe, terrain, icosa, candles, chain, expo (curve), charger, towers, helix, network, rings, box, circle3, poly, arr.
- scenes_pltr.py adds: orb, fraud network, founders, ontology, twin city, stack, nrr bars, cube27, refinery/cyl.
- New object = list of 3D segments `(p0, p1)` → `geo.arr(S)` → `draw_segs(c, S, cx, cy, rx, ry, rz, prog=eo(ramp(lt, 0.05, 2.2)), order=..., spread=...)`.
- `order` = reveal order (e.g. `np.argsort(S[:, :, 0].mean(1))` left→right). Labels on 3D points: `pt(P, rx, ry)` → screen x, y.
- Glyphs missing in fonts: ⇄ and similar arrows (→ works). Check stills.

## Editorial rules
- 45–60 s total, 9–12 scenes, ~4.4–5 s each; opener 5 s, close 6.8 s.
- One idea per scene: object + big stamp + max 2 lines. Muted-first: the text carries the story.
- Condense, never paste paragraphs from the source.
- Cut any claim that is factually shaky or easy to refute in an ad; tell Hernán what was cut and why.
- No third-party logos, no copyrighted characters. Represent brands with abstract objects.
- Financial topics: close with "CONTENIDO EDUCATIVO · NO ES ASESORÍA DE INVERSIÓN".
- CTA scene: what to do + where (10am.pro, eldiad.10am.pro, @holdmybirra).

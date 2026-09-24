"""Wireframe video engine CLI. Usage:
  python3 make.py setup
  python3 make.py stills <scenes_module> <t1> <t2> ...      -> stills/sheet.jpg
  python3 make.py render <scenes_module>                     -> renders next missing chunk; repeat until ALL CHUNKS DONE
  python3 make.py final <scenes_module> <out.mp4>            -> concat + score + compress
"""
import os, sys, re, subprocess, json, glob
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CHUNK = 450
FONTS = {'Cinzel[wght].ttf': 'ofl/cinzel/Cinzel%5Bwght%5D.ttf',
         'CormorantGaramond[wght].ttf': 'ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf',
         'CormorantGaramond-Italic[wght].ttf': 'ofl/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf',
         'JetBrainsMono[wght].ttf': 'ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf'}

def env_for(mod):
    src = open(mod + '.py').read(); m = re.search(r"THEME\s*=\s*'(\w+)'", src)
    e = dict(os.environ); e['DD_SCENES'] = mod; e['DD_THEME'] = m.group(1) if m else 'gold'; return e

def info(mod):
    code = "import render, json; print(json.dumps({'n': int(round(render.TOTAL*30)), 'durs': [d for d, _ in render.scenes.SCENES]}))"
    out = subprocess.run([sys.executable, '-c', code], env=env_for(mod), capture_output=True, text=True, check=True).stdout
    return json.loads(out.strip().splitlines()[-1])

cmd = sys.argv[1]
if cmd == 'setup':
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'skia-python', 'scipy', 'pillow', 'numpy', '--break-system-packages'], check=True)
    os.makedirs('fonts', exist_ok=True)
    for name, path in FONTS.items():
        if not os.path.exists('fonts/' + name):
            subprocess.run(['curl', '-sL', '-o', 'fonts/' + name, 'https://raw.githubusercontent.com/google/fonts/main/' + path], check=True)
    print('setup ok')
elif cmd == 'stills':
    mod = sys.argv[2]; ts = sys.argv[3:]; os.makedirs('stills', exist_ok=True)
    subprocess.run([sys.executable, 'render.py', 'stills'] + ts, env=env_for(mod), check=True)
    from PIL import Image
    ims = [Image.open(f'stills/still_{float(t):05.1f}.png').convert('RGB').resize((432, 768)) for t in ts]
    cols = min(5, len(ims)); rows = (len(ims)+cols-1)//cols
    sheet = Image.new('RGB', (432*cols, 768*rows))
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols)*432, (i//cols)*768))
    sheet.save('stills/sheet.jpg', quality=85); print('stills/sheet.jpg')
elif cmd == 'render':
    mod = sys.argv[2]; n = info(mod)['n']; os.makedirs(f'build/{mod}', exist_ok=True)
    for k, a0 in enumerate(range(0, n, CHUNK)):
        seg = f'build/{mod}/seg{k:02d}.mp4'
        if os.path.exists(seg) and os.path.getsize(seg) > 0: continue
        subprocess.run([sys.executable, 'render.py', 'video', seg + '.tmp.mp4', str(a0), str(min(n, a0+CHUNK))], env=env_for(mod), check=True)
        os.rename(seg + '.tmp.mp4', seg)
        left = len(range(0, n, CHUNK)) - k - 1
        print(f'chunk {k} done, {left} left' if left else 'ALL CHUNKS DONE'); sys.exit(0)
    print('ALL CHUNKS DONE')
elif cmd == 'final':
    mod, out = sys.argv[2], sys.argv[3]; d = info(mod)
    segs = sorted(glob.glob(f'build/{mod}/seg??.mp4'))
    with open(f'build/{mod}/list.txt', 'w') as f: f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'build/{mod}/list.txt', '-c', 'copy', f'build/{mod}/silent.mp4'], check=True)
    import audio; audio.score(d['durs'], f'build/{mod}/score.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'build/{mod}/silent.mp4', '-i', f'build/{mod}/score.wav', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
                    '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print('final', out)

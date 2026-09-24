import numpy as np, scipy.signal as ss, wave
SR = 48000
def score(durs, out):
    starts = np.cumsum([0]+durs); TSC = starts[-1]; T = TSC + 2.5
    n = int(T*SR); t = np.arange(n)/SR
    rng = np.random.default_rng(3)
    L = np.zeros(n); R = np.zeros(n)
    # drone
    for f, a in ((55, 0.20), (82.41, 0.12), (110, 0.08), (164.8, 0.035), (220, 0.02)):
        lfo = 0.6 + 0.4*np.sin(2*np.pi*t/7.3 + f)
        L += a*lfo*np.sin(2*np.pi*f*t); R += a*lfo*np.sin(2*np.pi*(f*1.003)*t + 0.7)
    b, a_ = ss.butter(2, 900/(SR/2), 'low')
    pad = ss.lfilter(b, a_, rng.standard_normal(n))*0.05*(0.5+0.5*np.sin(2*np.pi*t/11))
    L += pad; R += ss.lfilter(b, a_, rng.standard_normal(n))*0.05*(0.5+0.5*np.sin(2*np.pi*t/11+1))
    def add(sig, at, pan=0.0):
        i = int(at*SR); j = min(n, i+len(sig)); s = sig[:j-i]
        L[i:j] += s*(1-max(pan, 0)); R[i:j] += s*(1+min(pan, 0))
    def boom(amp=0.6, dur=1.6, f0=90, f1=38):
        tt = np.arange(int(dur*SR))/SR; f = f1 + (f0-f1)*np.exp(-tt*6)
        return amp*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*2.6)
    def whoosh(amp=0.25, dur=0.7):
        m = int(dur*SR); x = rng.standard_normal(m); tt = np.arange(m)/m
        bb, aa = ss.butter(2, [400/(SR/2), 5000/(SR/2)], 'band'); x = ss.lfilter(bb, aa, x)
        return amp*x*(tt**2.2)*(1-tt)**0.3*3
    def tick(amp=0.08):
        m = int(0.03*SR); tt = np.arange(m)/SR
        return amp*np.sin(2*np.pi*2400*tt)*np.exp(-tt*260)
    for k, s in enumerate(starts[:-1]):
        if k > 0: add(whoosh(), s-0.7)
        add(boom(0.55 if k else 0.7), s)
    for s in np.arange(0.5, TSC, 0.5):
        add(tick(0.05 if (s*2) % 2 else 0.08), s, pan=0.4 if (s*2) % 2 else -0.4)
    add(boom(0.75, 2.2, 110, 36), starts[-2]+3.2)
    add(whoosh(0.3, 0.9), TSC-0.9); add(boom(0.8, 2.4, 120, 40), TSC)
    env = np.minimum(1, t/1.2)*np.minimum(1, (T-t)/1.0)
    L *= env; R *= env
    mx = max(np.abs(L).max(), np.abs(R).max()); L, R = L/mx*0.7, R/mx*0.7
    st = (np.stack([L, R], 1)*32767).astype(np.int16)
    w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
    return T

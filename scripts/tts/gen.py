import json, os, sys, subprocess, wave, re, numpy as np, torch, hashlib
torch.set_num_threads(2)
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get('TTS_WORK', os.path.join(HERE, 'work'))  # lines.json, v5_5_ru.pt, clips/
OUT = os.path.join(WORK, 'clips')
os.makedirs(OUT, exist_ok=True)
data = json.load(open(os.path.join(WORK, 'lines.json')))
model = torch.package.PackageImporter(os.path.join(WORK, 'v5_5_ru.pt')).load_pickle("tts_models", "model")
model.to(torch.device('cpu'))
SPEAKER = os.environ.get('SPEAKER', 'xenia')

def fname(key):
    return hashlib.md5(key.encode('utf-8')).hexdigest()[:16]

HERO_SPEAKER = os.environ.get('HERO_SPEAKER', 'aidar')
HERO_PITCH = float(os.environ.get('HERO_PITCH', '1.3'))
PET_SPEAKER = os.environ.get('PET_SPEAKER', 'baya')
PET_PITCH = float(os.environ.get('PET_PITCH', '1.22'))

DE_SPEAKER = os.environ.get('DE_SPEAKER', 'eva_k')
_de = None
def de(ssml_inner=None, text=None):
    # Немецкий голос «Школы» (Silero v3_de) — загружается только когда нужен.
    global _de
    if _de is None:
        _de = torch.package.PackageImporter(os.path.join(WORK, 'v3_de.pt')).load_pickle("tts_models", "model")
        _de.to(torch.device('cpu'))
    if ssml_inner is not None:
        a = _de.apply_tts(ssml_text=f'<speak>{ssml_inner}</speak>', speaker=DE_SPEAKER, sample_rate=SR)
    else:
        a = _de.apply_tts(text=text, speaker=DE_SPEAKER, sample_rate=SR)
    return a.numpy().astype(np.float32)

def tts(text, rate=None, speaker=None):
    spk = speaker or SPEAKER
    if rate:
        ssml = f'<speak><prosody rate="{rate}">{text}</prosody></speak>'
        a = model.apply_tts(ssml_text=ssml, speaker=spk, sample_rate=SR)
    else:
        a = model.apply_tts(text=text, speaker=spk, sample_rate=SR)
    return a.numpy().astype(np.float32)

def ss(inner, speaker=None):
    a = model.apply_tts(ssml_text=f'<speak>{inner}</speak>', speaker=speaker or SPEAKER, sample_rate=SR)
    return a.numpy().astype(np.float32)

def cap(text):
    # Первая буква заглавная, ударения «+» сохраняем.
    i = 1 if text.startswith('+') else 0
    return text[:i] + text[i:i + 1].upper() + text[i + 1:]

def bandnoise(dur, lo, hi, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    mask = ((f >= lo) & (f <= hi)).astype(float)
    # мягкие края полосы
    mask = np.convolve(mask, np.ones(200) / 200, mode='same')
    y = np.fft.irfft(X * mask, n)
    return (y / (np.max(np.abs(y)) + 1e-9)).astype(np.float32)

def env(n, a=0.08, r=0.12):
    e = np.ones(n, dtype=np.float32)
    ai = int(SR * a); ri = int(SR * r)
    e[:ai] = np.linspace(0, 1, ai); e[-ri:] = np.linspace(1, 0, ri)
    return e

def buzz(dur, f0=150):
    t = np.arange(int(SR * dur)) / SR
    saw = 2 * ((t * f0) % 1) - 1
    # простой ФНЧ
    k = np.exp(-np.arange(200) / 25.0); k /= k.sum()
    return np.convolve(saw, k, mode='same').astype(np.float32)

def silence(sec): return np.zeros(int(SR * sec), dtype=np.float32)

def synth_sound(sound):
    if sound == 'с':
        y = bandnoise(1.5, 4200, 10000) * 0.6; return y * env(len(y))
    if sound == 'сь':
        parts = []
        for i in range(3):
            y = bandnoise(0.32, 3600, 8500, seed=i + 3) * 0.55; parts += [y * env(len(y), 0.03, 0.08), silence(0.18)]
        return np.concatenate(parts)
    if sound == 'з':
        y = bandnoise(1.5, 4200, 10000, 5) * 0.45 + buzz(1.5, 150) * 0.35; return y * env(len(y))
    if sound == 'зь':
        parts = []
        for i in range(3):
            y = bandnoise(0.32, 3600, 8500, seed=i + 7) * 0.4 + buzz(0.32, 160) * 0.3; parts += [y * env(len(y), 0.03, 0.08), silence(0.18)]
        return np.concatenate(parts)
    if sound == 'ц':
        parts = []
        for i in range(3):
            burst = bandnoise(0.02, 1500, 9000, 11 + i) * 0.9
            s = bandnoise(0.14, 4200, 10000, 21 + i) * 0.6
            parts += [burst, s * env(len(s), 0.005, 0.06), silence(0.28)]
        return np.concatenate(parts)
    if sound == 'ш':
        y = bandnoise(1.5, 1800, 6500, 31) * 0.6; return y * env(len(y))
    if sound == 'ж':
        y = bandnoise(1.5, 1800, 6500, 33) * 0.45 + buzz(1.5, 140) * 0.35; return y * env(len(y))
    if sound == 'ч':
        parts = []
        for i in range(3):
            burst = bandnoise(0.02, 1500, 8000, 41 + i) * 0.9
            s = bandnoise(0.15, 2300, 7500, 51 + i) * 0.6
            parts += [burst, s * env(len(s), 0.005, 0.06), silence(0.28)]
        return np.concatenate(parts)
    if sound == 'щ':
        y = bandnoise(1.5, 2600, 8000, 61) * 0.5; return y * env(len(y), 0.15, 0.2)
    if sound == 'р':
        t = np.arange(int(SR * 1.4)) / SR
        am = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 27 * t))
        y = buzz(1.4, 130) * am * 0.6; return (y * env(len(y))).astype(np.float32)
    text = {'л': 'Ла-ла-ла.', 'ль': 'Ля-ля-ля.', 'рь': 'Ри-ри-ри.'}[sound]
    return tts(text)

def process(y):
    y = y.astype(np.float32)
    thr = 0.012
    idx = np.where(np.abs(y) > thr)[0]
    if len(idx):
        a = max(0, idx[0] - int(0.03 * SR)); b = min(len(y), idx[-1] + int(0.06 * SR))
        y = y[a:b]
    rms = np.sqrt(np.mean(y ** 2)) + 1e-9
    y = y * (0.09 / rms)
    peak = np.max(np.abs(y))
    if peak > 0.95: y = y * (0.95 / peak)
    return np.concatenate([silence(0.04), y, silence(0.06)])

def save_mp3(y, path, pitch=None):
    wav = path + '.wav'
    a = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(a.tobytes())
    af = ['-af', f'apad=pad_dur=0.2,asetrate={int(SR * pitch)},aresample={SR},atempo={1 / pitch * 1.08:.3f}'] if pitch else []
    subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-i', wav, *af, '-ac', '1', '-ar', '24000', '-b:a', '48k', path], check=True)
    os.remove(wav)

only = set(sys.argv[1:])
FORCE = os.environ.get('FORCE') == '1'
manifest = {}
for i, item in enumerate(data['lines']):
    key, kind = item['key'], item['kind']
    text = item.get('stressed') or item['text']
    if only and kind not in only and key not in only: continue
    path = os.path.join(OUT, fname(key) + '.mp3')
    manifest[key] = os.path.basename(path)
    if os.path.exists(path) and not only and not FORCE: continue
    if only and kind not in only and key not in only: continue
    try:
        if kind == 'snd':
            y = synth_sound(key.split(':', 1)[1])
        elif kind == 'sc-de':
            y = de(text=text)
        elif kind == 'sc-de-num':
            y = de(text=cap(text) + '!')
        elif kind == 'sc-de-w':
            # Немецкий голос лучше звучит без SSML-замедления (проверено распознаванием).
            y = de(text=cap(text) + '.')
        elif kind == 'sc-ru':
            y = tts(text)
        elif kind == 'sc-ru-num':
            y = tts(cap(text) + '!')
        elif kind == 'sc-ru-w':
            y = ss(f'<break time="300ms"/><prosody rate="slow">{cap(text)}.</prosody>')
        elif kind == 'syll':
            y = ss(f'<break time="300ms"/><prosody rate="slow">{cap(text)}.</prosody>')
        elif kind == 'word':
            y = ss(f'<break time="300ms"/><prosody rate="slow">{cap(text)}.</prosody>')
        elif kind == 'heroword':
            y = ss(f'<break time="300ms"/><prosody rate="slow">{cap(text)}.</prosody>', HERO_SPEAKER)
        elif kind == 'hero':
            y = tts(text, speaker=HERO_SPEAKER)
        elif kind == 'petv':
            y = tts(text, speaker=PET_SPEAKER)
        elif kind == 'story':
            # Сказка: помедленнее и с паузами между предложениями.
            parts = [p.strip() for p in re.split(r'(?<=[.!?…»])\s+', text) if p.strip()]
            inner = '<break time="350ms"/>'.join(p.replace('&', 'и') for p in parts)
            y = ss(f'<prosody rate="slow">{inner}</prosody>')
        elif kind == 'num':
            y = tts(text.capitalize() + '!')
        else:
            y = tts(text)
        save_mp3(process(y), path, HERO_PITCH if kind in ('hero', 'heroword') else (PET_PITCH if kind == 'petv' else None))
    except Exception as e:
        print('FAIL', key, text, e, flush=True)
    if i % 50 == 0: print(i, key, flush=True)
json.dump(manifest, open(os.path.join(WORK, 'manifest.json'), 'w'), ensure_ascii=False)
print('done', len(manifest))

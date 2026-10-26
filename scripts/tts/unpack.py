"""Достаёт готовые клипы из js/audio-pack-*.js в work/clips (имя файла = md5 ключа, как в gen.py).
Нужно в новой облачной сессии: тогда gen.py озвучит только новые или изменённые фразы, а не все 2000 заново.
Запуск: TTS_WORK=/путь/к/work python3 scripts/tts/unpack.py
"""
import base64, glob, hashlib, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.environ.get('TTS_WORK', os.path.join(HERE, 'work'))
OUT = os.path.join(WORK, 'clips')
os.makedirs(OUT, exist_ok=True)
# Ключ записан через json.dumps(ensure_ascii=False), значение — data:audio/mpeg;base64,...
CLIP = re.compile(r'("(?:[^"\\]|\\.)*"):"data:audio/mpeg;base64,([A-Za-z0-9+/=]+)"')
total = 0
for pack in sorted(glob.glob(os.path.join(ROOT, 'js', 'audio-pack-*.js'))):
    text = open(pack, encoding='utf-8').read()
    n = 0
    for raw_key, b64 in CLIP.findall(text):
        key = json.loads(raw_key)
        path = os.path.join(OUT, hashlib.md5(key.encode('utf-8')).hexdigest()[:16] + '.mp3')
        if not os.path.exists(path):
            with open(path, 'wb') as f:
                f.write(base64.b64decode(b64))
        n += 1
    total += n
    print(os.path.basename(pack), n)
print('clips:', total, '->', OUT)

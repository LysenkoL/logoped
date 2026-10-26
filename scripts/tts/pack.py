# Собирает клипы из work/clips в js/audio-pack-*.js (base64 mp3, работает через file://).
import json, base64, os
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get('TTS_WORK', os.path.join(HERE, 'work'))
lines = json.load(open(os.path.join(WORK, 'lines.json')))
import hashlib
manifest = {}
for item in lines['lines']:
    fn = hashlib.md5(item['key'].encode('utf-8')).hexdigest()[:16] + '.mp3'
    if os.path.exists(os.path.join(WORK, 'clips', fn)): manifest[item['key']] = fn
name = lines['name']
kinds = {x['key']: x['kind'] for x in lines['lines']}
groups = {'common': ['line', 'num', 'snd'], 'words': ['word', 'syll'], 'phrases': ['phrase', 'prompt'], 'story': ['story'], 'hero': ['hero', 'heroword', 'petv'], 'school': ['sc-de', 'sc-de-num', 'sc-de-w', 'sc-de-sy', 'sc-ru', 'sc-ru-num', 'sc-ru-w', 'sc-ru-sy']}
out_dir = os.path.join(HERE, '..', '..', 'js')
for group, ks in groups.items():
    entries = []
    for key, fn in manifest.items():
        if kinds.get(key) not in ks: continue
        b64 = base64.b64encode(open(os.path.join(WORK, 'clips', fn), 'rb').read()).decode()
        entries.append(f'{json.dumps(key, ensure_ascii=False)}:"data:audio/mpeg;base64,{b64}"')
    body = ',\n'.join(entries)
    js = ("// Готовая озвучка (нейросетевой голос Silero, xenia). Создаётся скриптом scripts/audio-lines.cjs + генератор.\n"
          "(function(root){var a=root.YZ_AUDIO=root.YZ_AUDIO||{clips:{},name:''};a.name=" + json.dumps(name, ensure_ascii=False) + ";var c={\n" + body + "\n};for(var k in c)a.clips[k]=c[k];})(typeof window!=='undefined'?window:globalThis);\n")
    open(os.path.join(out_dir, f'audio-pack-{group}.js'), 'w', encoding='utf-8').write(js)
    print(group, len(entries), round(len(js) / 1e6, 2), 'MB')

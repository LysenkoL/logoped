# Сборка офлайн-распознавания слов для «Язычка» (для разработчика).
# Нужны: vosk-model-small-ru-0.22 (https://alphacephei.com/vosk/models) и vosk-browser 0.0.8 (npm), оба Apache-2.0.
# Запуск: python3 scripts/vosk/build.py <папка модели> <vosk-browser/dist/vosk.js>
# Результат: js/vosk/model-ru-N.js (модель без большой языковой модели — для распознавания по списку слов), js/vosk/vocab-ru.js
#            js/vosk/vosk.js (vosk-browser с загрузкой модели из памяти, без IndexedDB — работает с file://)
import base64, io, json, os, re, struct, sys, tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'js', 'vosk')
model_dir, vosk_js = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

# 1. Словарь из Gr.fst (таблица выходных символов) → words.txt; Gr.fst заменяем пустым FST.
f = open(os.path.join(model_dir, 'graph', 'Gr.fst'), 'rb')
i32 = lambda: struct.unpack('<i', f.read(4))[0]
i64 = lambda: struct.unpack('<q', f.read(8))[0]
def rs(): n = i32(); return f.read(n).decode('utf-8')
i32(); rs(); rs(); i32(); i32(); f.read(8); i64(); i64(); i64()
def symtab():
    i32(); rs(); i64(); size = i64()
    return [(rs(), i64()) for _ in range(size)]
symtab(); words = symtab()
words_txt = ''.join(f'{w} {k}\n' for w, k in words).encode('utf-8')
def s(x): b = x.encode(); return struct.pack('<i', len(b)) + b
dummy = struct.pack('<i', 2125659606) + s('vector') + s('standard') + struct.pack('<ii', 2, 0) + struct.pack('<Q', 0x3) + struct.pack('<qqq', 0, 1, 0) + struct.pack('<f', 0.0) + struct.pack('<q', 0)

buf = io.BytesIO()
def add_dir(tar, name):
    info = tarfile.TarInfo(name); info.type = tarfile.DIRTYPE; info.mode = 0o755
    tar.addfile(info)
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    add_dir(tar, 'model/')
    for root, dirs, files in os.walk(model_dir):
        dirs.sort()
        rel_dir = os.path.relpath(root, model_dir).replace(os.sep, '/')
        if rel_dir != '.': add_dir(tar, f'model/{rel_dir}/')
        for name in sorted(files):
            full = os.path.join(root, name)
            rel = 'model/' + os.path.relpath(full, model_dir).replace(os.sep, '/')
            if rel == 'model/graph/Gr.fst': data = dummy
            else: data = open(full, 'rb').read()
            info = tarfile.TarInfo(rel); info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    info = tarfile.TarInfo('model/graph/words.txt'); info.size = len(words_txt)
    tar.addfile(info, io.BytesIO(words_txt))
vocab = '\n'.join(w for w, _ in words if not w.startswith('#') and not w.startswith('<') and w not in ('!SIL', '[unk]'))
for name in os.listdir(OUT):
    if name.startswith('model-ru'): os.remove(os.path.join(OUT, name))
with open(os.path.join(OUT, 'vocab-ru.js'), 'w', encoding='utf-8') as out:
    out.write('// Словарь модели Vosk small-ru 0.22 — чтобы знать, какие слова можно проверять.\n')
    out.write('window.YZ_VOSK_VOCAB=' + json.dumps(vocab, ensure_ascii=False) + ';\n')
# Модель частями по ~15 МБ (перенос файлов на компьютер ограничен 20 МБ на файл).
b64 = base64.b64encode(buf.getvalue()).decode()
size = 15_000_000
parts = [b64[i:i + size] for i in range(0, len(b64), size)]
for index, part in enumerate(parts):
    with open(os.path.join(OUT, f'model-ru-{index + 1}.js'), 'w', encoding='utf-8') as out:
        out.write(f'// Модель распознавания речи Vosk small-ru 0.22 (Apache-2.0, alphacephei.com), часть {index + 1} из {len(parts)}.\n')
        out.write(f'(function(w){{var v=w.YZ_VOSK=w.YZ_VOSK||{{parts:[]}};v.count={len(parts)};v.parts[{index}]="{part}";}})(window);\n')
print('model', round(buf.tell() / 1e6, 1), 'MB tar.gz')

# 2. vosk-browser: модель передаётся в воркер как ArrayBuffer, IndexedDB не нужна.
src = open(vosk_js, encoding='utf-8').read()
m = re.search(r"createBase64WorkerFactory\('([A-Za-z0-9+/=]+)'", src)
w = base64.b64decode(m.group(1)).decode('utf-8').replace('\r\n', '\n')
def rep(text, a, b):
    assert a in text, a[:60]
    return text.replace(a, b, 1)
w = rep(w, """                const { modelUrl } = message;
                if (!modelUrl) {""", """                const { modelUrl, modelData } = message;
                this.modelData = modelData || null;
                this.memOnly = Boolean(modelData);
                if (!modelUrl) {""")
w = rep(w, """                    this.Vosk.FS.mkdir(storagePath);
                    this.Vosk.FS.mount(this.Vosk.IDBFS, {}, storagePath);
                    return this.Vosk.syncFilesystem(true);""", """                    this.Vosk.FS.mkdir(storagePath);
                    if (this.memOnly) return Promise.resolve();
                    this.Vosk.FS.mount(this.Vosk.IDBFS, {}, storagePath);
                    return this.Vosk.syncFilesystem(true);""")
w = rep(w, """                    const fullModelUrl = new URL(modelUrl, location.href.replace(/^blob:/, ""));""", """                    if (this.modelData) {
                        this.Vosk.FS.mkdir(modelPath);
                        this.Vosk.FS.writeFile(modelPath + "/downloaded.tar.gz", new Uint8Array(this.modelData));
                        this.Vosk.FS.writeFile(modelPath + "/downloaded.ok", "");
                        this.modelData = null;
                        return this.Vosk.downloadAndExtract("about:blank", modelPath);
                    }
                    const fullModelUrl = new URL(modelUrl, location.href.replace(/^blob:/, ""));""")
w = rep(w, """                    this.logger.verbose(`Syncing filesystem`);
                    return this.Vosk.syncFilesystem(false);""", """                    this.logger.verbose(`Syncing filesystem`);
                    if (this.memOnly) return Promise.resolve();
                    return this.Vosk.syncFilesystem(false);""")
src = src[:m.start(1)] + base64.b64encode(w.encode('utf-8')).decode() + src[m.end(1):]
src = rep(src, """        constructor(modelUrl, logLevel = 0) {
            super();
            this.modelUrl = modelUrl;""", """        constructor(modelUrl, logLevel = 0, modelData = null) {
            super();
            this.modelUrl = modelUrl;
            this.modelData = modelData;""")
src = rep(src, """            this.postMessage({
                action: "load",
                modelUrl: this.modelUrl,
            });""", """            const modelData = this.modelData;
            this.modelData = null;
            this.postMessage({
                action: "load",
                modelUrl: this.modelUrl,
                modelData,
            }, modelData ? { transfer: [modelData] } : undefined);""")
src = rep(src, """    function createModel(modelUrl, logLevel = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = new Model(modelUrl, logLevel);
            return new Promise((resolve, reject) => model.on("load", (message) => {
                if (message.result) {
                    resolve(model);
                }
                reject();
            }));""", """    function createModel(modelUrl, logLevel = 0, modelData = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = new Model(modelUrl, logLevel, modelData);
            return new Promise((resolve, reject) => {
                model.on("load", (message) => {
                    if (message.result) {
                        resolve(model);
                    }
                    reject(new Error("load failed"));
                });
                model.on("error", (message) => reject(new Error(message && message.error || "vosk error")));
            });""")
open(os.path.join(OUT, 'vosk.js'), 'w', encoding='utf-8').write('// vosk-browser 0.0.8 (Apache-2.0, github.com/ccoreilly/vosk-browser) с загрузкой модели из памяти.\n' + src)
print('vosk.js ok')

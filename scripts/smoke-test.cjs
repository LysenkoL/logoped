// Быстрая проверка: все файлы на месте, нет ES-модулей и внешних зависимостей, синтаксис JS корректен.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
const check = (file, html) => {
  if (/type\s*=\s*["']module["']/i.test(html)) errors.push(`${file}: ES-модуль не работает через file://`);
  if (/(?:src|href)\s*=\s*["']https?:\/\//i.test(html)) errors.push(`${file}: внешняя зависимость`);
};

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('index.html', html);
const assets = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
for (const asset of assets) if (!fs.existsSync(path.join(root, asset))) errors.push(`нет файла ${asset}`);

// Загрузчик js/app.js подключает остальные модули.
const loader = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const listed = (loader.match(/\[([\s\S]*?)\]/) || ['', ''])[1].match(/'([^']+\.js)'/g) || [];
for (const item of listed) {
  const file = item.replace(/'/g, '');
  if (!fs.existsSync(path.join(root, 'js', file))) errors.push(`загрузчик: нет js/${file}`);
}

// Распознавание слов подгружается само (js/asr.js): движок, словарь и модель частями.
for (const file of ['vosk/vosk.js', 'vosk/vocab-ru.js', 'vosk/model-ru-1.js']) {
  if (!fs.existsSync(path.join(root, 'js', file))) errors.push(`распознавание: нет js/${file}`);
}

const launcher = fs.readFileSync(path.join(root, 'desktop-launcher.html'), 'utf8');
const launcherScripts = [...launcher.matchAll(/src="yazychok-alexandra\/(js\/[^"]+)"/g)].map(m => m[1]);
const indexScripts = [...html.matchAll(/src="(js\/[^"]+)"/g)].map(m => m[1]);
if (launcherScripts.join() !== indexScripts.join()) errors.push('desktop-launcher.html и index.html подключают разные скрипты');

const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'));
for (const file of jsFiles) {
  try { execFileSync(process.execPath, ['--check', path.join(root, 'js', file)], { stdio: 'pipe' }); }
  catch (error) { errors.push(`синтаксис js/${file}: ${String(error.stderr || error.message).trim()}`); }
}

if (errors.length) { for (const e of errors) console.error(`FAIL: ${e}`); process.exit(1); }
console.log(`OK: ${assets.length} ресурсов, ${listed.length} модулей загрузчика, ${jsFiles.length} JS-файлов`);

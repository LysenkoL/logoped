const test = require('node:test');
const assert = require('node:assert/strict');
const audio = require('../js/audio.js');

function fakePlayer(log, durations) {
  return item => {
    let stop;
    const done = new Promise(resolve => {
      log.push(`start ${item}`);
      const timer = setTimeout(() => { log.push(`end ${item}`); resolve(); }, durations[item] || 20);
      stop = () => { clearTimeout(timer); log.push(`stop ${item}`); resolve(); };
    });
    return { done, stop };
  };
}

test('фразы звучат по очереди, следующая — только после конца предыдущей', async () => {
  const log = [];
  const q = audio.createQueue(fakePlayer(log, { a: 40, b: 10 }));
  await q.play(['a', 'b'], { interrupt: false, gap: 0 });
  assert.deepEqual(log, ['start a', 'end a', 'start b', 'end b']);
});

test('похвала (protect) не обрывается новой фразой — новая ждёт', async () => {
  const log = [];
  const q = audio.createQueue(fakePlayer(log, { praise: 60, next: 10 }));
  q.play('praise', { protect: true });
  await new Promise(r => setTimeout(r, 10));
  await q.play('next', { interrupt: true });
  assert.deepEqual(log, ['start praise', 'end praise', 'start next', 'end next']);
});

test('обычная фраза обрывается новой', async () => {
  const log = [];
  const q = audio.createQueue(fakePlayer(log, { long: 200, next: 10 }));
  q.play('long');
  await new Promise(r => setTimeout(r, 10));
  await q.play('next', { interrupt: true });
  assert.deepEqual(log, ['start long', 'stop long', 'start next', 'end next']);
});

test('старые ключи маминых записей переводятся в новые', () => {
  assert.equal(audio.normalizeMomKey('praise'), 'l:praiseName');
  assert.equal(audio.normalizeMomKey('sound:с'), 'snd:с');
  assert.equal(audio.normalizeMomKey('gym:mushroom'), 'ex:mushroom');
  assert.equal(audio.categoryOf('l:praiseShort:3'), 'l:praiseShort');
});

test('русские голоса браузера: естественные первыми', () => {
  const ranked = audio.rankRussianVoices([
    { name: 'Google русский', lang: 'ru-RU' }, { name: 'Microsoft Svetlana Online (Natural)', lang: 'ru-RU' }, { name: 'English', lang: 'en-US' }
  ]);
  assert.equal(ranked[0].name, 'Microsoft Svetlana Online (Natural)');
  assert.equal(ranked.length, 2);
});

test('у каждой фразы, слова, главы сказки и наклейки есть готовая озвучка', () => {
  const { execFileSync } = require('node:child_process');
  const path = require('node:path');
  for (const pack of ['common', 'words', 'phrases', 'story', 'hero', 'school']) require(path.join(__dirname, '..', 'js', `audio-pack-${pack}.js`));
  const clips = globalThis.YZ_AUDIO.clips;
  const lines = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'audio-lines.cjs')])).lines;
  const missing = lines.filter(line => !clips[line.key]).map(line => line.key);
  assert.deepEqual(missing, []);
});

test('ударение мамы: «бЕлка» и «б+елка» превращаются в знак ударения', () => {
  const audio = require('../js/audio.js');
  global.YazychokData = global.YazychokData || require('../js/data.js');
  const sp = audio.createSpeech({});
  assert.equal(sp.toAccent('бЕлка'), 'бе́лка');
  assert.equal(sp.toAccent('Жила-былА лягушка'), 'Жила-была́ лягушка');
  assert.equal(sp.toAccent('б+елка'), 'бе́лка');
  assert.equal(sp.toAccent('Ехали'), 'Ехали');
});

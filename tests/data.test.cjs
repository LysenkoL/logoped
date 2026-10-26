const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../js/data.js');

test('каждое слово имеет картинку и ручную фонетическую разметку', () => {
  const ids = new Set();
  for (const word of data.WORDS) {
    assert.ok(word.text && word.emoji, `нет текста или картинки: ${word.id}`);
    assert.ok(!ids.has(word.id), `повтор id: ${word.id}`);
    ids.add(word.id);
    for (const target of word.targets) {
      assert.ok(data.SOUND_ORDER.includes(target.sound), `неизвестный звук ${target.sound} в «${word.text}»`);
      assert.ok(['s', 'm', 'e'].includes(target.position), `позиция в «${word.text}»`);
    }
  }
});

test('на каждый звук есть слова, слоги, фразы и микрофонная игра', () => {
  for (const sound of data.SOUND_ORDER) {
    assert.ok(data.WORDS.filter(w => w.targets.some(t => t.sound === sound)).length >= 8, `мало слов: ${sound}`);
    assert.ok(data.SYLLABLES.filter(s => s.sound === sound).length >= 6, `мало слогов: ${sound}`);
    assert.ok(data.PHRASES.filter(p => p.sound === sound).length >= 3, `мало фраз: ${sound}`);
    assert.ok(data.SOUNDS[sound].micGame, `нет микрофонной игры: ${sound}`);
    assert.ok(data.ARTICULATION[data.SOUNDS[sound].articulation], `нет подсказки языка: ${sound}`);
  }
});

test('для звонких З, ЗЬ, Ж нет обратных слогов (в конце они оглушаются)', () => {
  for (const sound of ['з', 'зь', 'ж']) {
    assert.equal(data.SYLLABLES.filter(s => s.sound === sound && s.kind === 'reverse').length, 0);
  }
});

test('позиция звука считается по последнему звуку: яйцо и кольцо — Ц в середине', () => {
  const pos = (text, sound) => data.WORDS.find(w => w.text === text).targets.find(t => t.sound === sound).position;
  assert.equal(pos('яйцо', 'ц'), 'm');
  assert.equal(pos('кольцо', 'ц'), 'm');
  assert.equal(pos('огурец', 'ц'), 'e');
  assert.equal(pos('глаз', 'с'), 'e', 'глаз звучит [глас]');
  assert.equal(pos('арбуз', 'с'), 'e', 'арбуз звучит [арбус]');
});

test('чистоговорки для игры «Закончи» имеют начало и картинку ответа', () => {
  for (const phrase of data.PHRASES.filter(item => item.answer)) {
    assert.ok(phrase.prompt && phrase.prompt !== phrase.text, phrase.text);
    assert.ok(phrase.text.includes(phrase.answer.text), phrase.text);
    assert.ok(phrase.answer.emoji, phrase.text);
  }
});

test('предложения логопеда на Ц включены', () => {
  assert.ok(data.PHRASES.some(p => p.text === 'В цветнике цветут цветы.'));
  assert.ok(data.PHRASES.some(p => p.text === 'Курица снесла яйцо.'));
});

test('разбивка на слоги совпадает со словом', () => {
  for (const [word, parts] of Object.entries(data.SPLITS)) {
    assert.equal(parts.join(''), word);
    assert.ok(data.WORDS.some(w => w.text === word), `нет в банке: ${word}`);
  }
});

test('ответы загадок есть в банке слов', () => {
  for (const riddle of data.RIDDLES) assert.ok(data.WORDS.some(w => w.text === riddle.answer), riddle.answer);
});

test('стишки — по 4 строчки', () => {
  for (const poem of data.POEMS) assert.equal(poem.lines.length, 4, poem.title);
});

test('Грибочек первый и всегда включён; упражнения логопеда выключены', () => {
  assert.equal(data.DEFAULT_EXERCISES[0].id, 'mushroom');
  assert.equal(data.DEFAULT_EXERCISES[0].fixed, true);
  for (const id of ['posture', 'nose-blow', 'stick', 'chew', 'lip-trainer', 'needle', 'brush-massage']) {
    assert.equal(data.DEFAULT_EXERCISES.find(e => e.id === id).enabled, false, id);
  }
  for (const ex of data.DEFAULT_EXERCISES) assert.ok(ex.mom && ex.child && ex.face, ex.id);
});

test('сказка и наклейки: 20 глав с продолжением, 36 наклеек, на каждой странице 1 блестящая и 1 золотая', () => {
  assert.equal(data.STORY.length, 20);
  assert.equal(new Set(data.STORY.map(ch => ch.id)).size, data.STORY.length);
  for (const ch of data.STORY) assert.ok(ch.title && ch.text.length > 60 && ch.next && ch.scene && ch.item && ch.item.length === 2);
  assert.ok(data.STORY.filter(ch => JSON.stringify(ch.parts).includes('{name}')).length >= 8, 'ребёнок — герой сказки');
  assert.ok(!data.STORY.some(ch => /Саш/.test(JSON.stringify(ch))), 'только полное имя через {name}');
  // Сказка-игра: в каждой главе 2 задания, слова для «назови» есть в словаре, звуки — из тренируемых.
  const words = new Set(data.WORDS.map(w => w.text));
  for (const ch of data.STORY) {
    const tasks = ch.parts.filter(p => typeof p !== 'string');
    assert.equal(tasks.length, 2, ch.id);
    for (const t of tasks) {
      assert.ok(['say', 'sound', 'pick'].includes(t.task), ch.id);
      if (t.task === 'say') assert.ok(words.has(t.word), `${ch.id}: ${t.word}`);
      else assert.ok(['с', 'з', 'ц'].includes(t.sound), ch.id);
      assert.ok(!/(^|[\s«])([сзц])-\2-/i.test(t.text), `${ch.id}: в подсказке нет цепочек звуков — образец звучит отдельно`);
    }
  }
  assert.equal(data.STICKERS.length, 36);
  assert.equal(new Set(data.STICKERS.map(s => s.id)).size, 36);
  for (const page of data.STICKER_PAGES) {
    const items = data.STICKERS.filter(s => s.page === page.id);
    assert.equal(items.filter(s => s.rarity === 'rare').length, 1);
    assert.equal(items.filter(s => s.rarity === 'gold').length, 1);
  }
});

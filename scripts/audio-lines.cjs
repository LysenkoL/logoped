// Список всех фраз для заранее записанной озвучки: node scripts/audio-lines.cjs > lines.json
const data = require('../js/data.js');
const core = require('../js/core.js');
const NAME = process.env.CHILD_NAME || 'Александра';
const out = [];
const add = (key, text, kind) => { if (text && !out.some(item => item.key === key)) out.push({ key, text, kind }); };

for (const [category, variants] of Object.entries(data.LINES)) {
  variants.forEach((text, i) => add(`l:${category}:${i}`, text.replace(/\{name\}/g, NAME), 'line'));
}
for (const word of data.WORDS) add(`w:${word.text}`, word.tts || word.text, 'word');
const syll = new Set(data.SYLLABLES.map(s => s.text));
for (const parts of Object.values(data.SPLITS)) parts.forEach(p => syll.add(p));
// Слоги отгадок для трудных загадок («собери из слогов»).
for (const r of data.RIDDLES) core.splitSyllables(r.answer).forEach(p => syll.add(p.toLowerCase()));
for (const s of syll) add(`sy:${s}`, s, 'syll');
for (const p of data.PHRASES) {
  add(`ph:${p.id}`, p.text, 'phrase');
  if (p.prompt) add(`pp:${p.id}`, `${p.prompt} …`, 'prompt');
}
data.NUMBERS.forEach((n, i) => add(`n:${i + 1}`, n, 'num'));
for (const ex of data.DEFAULT_EXERCISES) {
  if (ex.variants) for (const [v, item] of Object.entries(ex.variants)) add(`ex:${ex.id}:${v}`, item.child, 'line');
  else add(`ex:${ex.id}`, ex.child, 'line');
}
for (const [group, info] of Object.entries(data.ARTICULATION)) add(`ar:${group}`, info.child, 'line');
for (const pet of core.PETS) add(`pet:${pet.id}`, `${pet.name}!`, 'word');
for (const r of data.RIDDLES) add(`rd:${r.id}`, r.text, 'phrase');
for (const poem of data.POEMS) poem.lines.forEach((line, i) => add(`po:${poem.id}:${i}`, line, 'phrase'));
for (const sound of data.SOUND_ORDER) add(`snd:${sound}`, data.SOUNDS[sound].demo, 'snd');
for (const ch of data.STORY) {
  const fill = t => String(t).replace(/\{name\}/g, NAME);
  add(`stt:${ch.id}`, `${ch.title}.`, 'story');
  ch.parts.forEach((part, i) => {
    if (typeof part === 'string') add(`stp:${ch.id}:${i}`, fill(part), 'story');
    else {
      add(`stq:${ch.id}:${i}`, fill(part.text), 'story');
      if (part.done) add(`std:${ch.id}:${i}`, fill(part.done), 'story');
    }
  });
  add(`sn:${ch.id}`, fill(ch.next), 'story');
}
for (const st of data.STICKERS) add(`stk:${st.id}`, st.name, 'word');
// Сказка-гимнастика: голосом сказки (медленнее, с паузами).
for (const [id, text] of Object.entries(data.GYM_TALE)) add(`gt:${id}`, text.replace(/\{name\}/g, NAME), 'story');
// Питомец: свой тоненький голос.
for (const [category, variants] of Object.entries(data.PET_LINES)) {
  variants.forEach((text, i) => add(`pv:${category}:${i}`, text, 'petv'));
}
// Любимый герой: свой голос (aidar, выше тоном).
for (const [category, variants] of Object.entries(data.HERO_LINES)) {
  variants.forEach((text, i) => add(`h:${category}:${i}`, text.replace(/\{name\}/g, NAME), 'hero'));
}
for (const word of data.WORDS.filter(w => w.targets.length)) {
  add(`hw:${word.text}`, word.tts || word.text, 'heroword');
  for (const target of word.targets) {
    const mistake = core.heroMistake(word, target.sound);
    if (mistake) add(`hx:${word.text}:${mistake.sound}`, mistake.text, 'heroword');
  }
}
// «Что сказал герой?»: похожие слова голосом героя.
for (const pair of data.HERO_PAIRS) for (const w of [pair.a, pair.b]) add(`hw:${w.text}`, w.text, 'heroword');
// «Школа»: немецкий (голос eva_k) и русский (xenia). Фразы, числа, слова, «остальные — …».
const SD = require('../js/school-data.js');
const SC = require('../js/school-core.js');
for (const lg of ['de', 'ru']) {
  for (const [cat, variants] of Object.entries(SD.LINES[lg])) variants.forEach((text, i) => add(`sc:${lg}:l:${cat}:${i}`, text, `sc-${lg}`));
  SD.NUMBERS[lg].forEach((text, n) => add(`sc:${lg}:n:${n}`, text, `sc-${lg}-num`));
  for (const [n, text] of Object.entries(SD.TENS[lg])) add(`sc:${lg}:n:${n}`, text, `sc-${lg}-num`);
  for (const item of SD.ITEMS) { const w = SC.word(item, lg); add(`sc:${lg}:w:${w.text}`, (lg === 'de' && item.deTts) || w.text, `sc-${lg}-w`); }
  for (const [cat, info] of Object.entries(SD.CATEGORIES)) add(`sc:${lg}:cat:${cat}`, info[lg], `sc-${lg}`);
}
process.stdout.write(JSON.stringify({ name: NAME, lines: out }, null, 1));

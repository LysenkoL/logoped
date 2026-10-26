const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../js/data.js');
const core = require('../js/core.js');

const seq = seed => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };

test('занятие: сначала гимнастика с Грибочком, потом язычок, микрофон, игры, замок и весёлая минутка', () => {
  const state = core.createDefaultState('Тест');
  const session = core.buildSession(state, new Date(2026, 8, 22), seq(1));
  const kinds = session.steps.map(s => s.kind);
  assert.equal(session.steps[0].exercise.id, 'mushroom');
  assert.equal(kinds.filter(k => k === 'gym').length, 4);
  assert.ok(kinds.indexOf('position') > kinds.lastIndexOf('gym'));
  assert.ok(kinds.filter(k => k === 'position').length <= 2);
  assert.equal(kinds[kinds.indexOf('position') + 1], 'mic');
  assert.equal(kinds.filter(k => k === 'game').length + kinds.filter(k => k === 'mic').length - 1, 4);
  assert.equal(kinds.filter(k => k === 'lock').length, 1);
  assert.notEqual(kinds[kinds.length - 3], 'lock', 'замок не после последней игры');
  assert.equal(kinds[kinds.length - 2], 'fun');
  assert.equal(kinds[kinds.length - 1], 'breath', 'в конце — дыхание носом');
});

test('длина занятия: короткое 3 упражнения и 2 игры, длинное 5 и 5', () => {
  const state = core.createDefaultState('Тест');
  state.settings.length = 'short';
  // Игры плюс микрофонные игры второго звука (первая микрофонная — разминка, её не считаем).
  const games = ses => ses.steps.filter(x => x.kind === 'game').length + ses.steps.filter(x => x.kind === 'mic').length - 1;
  let s = core.buildSession(state, new Date(2026, 8, 22), seq(2));
  assert.equal(s.steps.filter(x => x.kind === 'gym').length, 3);
  assert.equal(games(s), 2);
  state.settings.length = 'long';
  s = core.buildSession(state, new Date(2026, 8, 22), seq(2));
  assert.equal(s.steps.filter(x => x.kind === 'gym').length, 5);
  assert.equal(games(s), 5);
});

test('игры в одном занятии не повторяются и хотя бы в одной нужно говорить', () => {
  const state = core.createDefaultState('Тест');
  for (let i = 1; i < 30; i += 1) {
    const s = core.buildSession(state, new Date(2026, 8, i), seq(i));
    const games = s.steps.filter(x => x.kind === 'game');
    assert.equal(new Set(games.map(g => g.game)).size, games.length);
    assert.ok(games.some(g => core.GAMES[g.game].speak));
  }
});

test('основной звук — уровень «слова», второй — «слоги»', () => {
  const state = core.createDefaultState('Тест');
  const { primary, secondary } = core.chooseSounds(state);
  assert.ok(core.levelOf(state, primary) >= 2);
  assert.equal(core.levelOf(state, secondary), 1);
});

test('в «говорящих» играх нет слов с трудными звуками («пока не учим» и «слоги»)', () => {
  const state = core.createDefaultState('Тест');
  const words = core.targetWords(state, 'с', null, true);
  assert.ok(words.length >= 10);
  for (const word of words) {
    for (const t of word.targets) if (t.sound !== 'с') assert.ok(core.speakableSound(state, t.sound), `${word.text}: ${t.sound}`);
  }
  assert.ok(!words.some(w => w.text === 'сыр'), 'Р пока не учим');
  assert.ok(!words.some(w => w.text === 'лиса'), 'ЛЬ пока не учим');
  state.settings.levels['р'] = -1;
  assert.ok(core.targetWords(state, 'с', null, true).some(w => w.text === 'сыр'), 'Р «говорит хорошо» — можно');
});

test('на уровне «слоги» доступны только игры со слогами и слушанием', () => {
  const state = core.createDefaultState('Тест');
  for (const game of core.GAME_TYPES) {
    const ok = core.gameIsPlayable(state, game, 'ш');
    if (ok) assert.ok(core.GAMES[game].min <= 1, game);
  }
});

test('содержимое каждой игры непустое для С, З, Ц', () => {
  const state = core.createDefaultState('Тест');
  for (const sound of ['с', 'з', 'ц']) {
    state.settings.levels[sound] = 3;
    for (const game of core.GAME_TYPES) {
      if (!core.gameIsPlayable(state, game, sound)) continue;
      const p = core.gamePayload(state, game, sound, seq(3), []);
      const size = (p.items || p.cards || p.phrases || p.boxes || p.rounds || p.wagons || p.tiles || []).length;
      assert.ok(size >= 2, `${game}/${sound}`);
    }
  }
});

test('одна деталь пазла в день, бонус за 5 дней недели, сундук на 4-й клетке', () => {
  let state = core.createDefaultState('Тест');
  const days = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
  let chests = 0; let bonus = 0;
  for (const day of days) {
    const r = core.completeSession(state, { stars: 10, gymIds: ['mushroom'], gameIds: ['wheel'], soundsList: ['с'] }, day);
    state = r.state; chests += r.chests; if (r.bonusPiece) bonus += 1;
    const again = core.completeSession(state, { stars: 5, gymIds: ['mushroom'], gameIds: ['boxes'], soundsList: ['с'] }, day);
    assert.equal(again.unlockedPieces, 0, 'второе занятие в тот же день детали не даёт');
    state = again.state;
  }
  assert.equal(bonus, 1);
  assert.equal(state.progress.puzzle.pieces, 6, '5 дней + бонус');
  assert.equal(chests, 1);
  assert.equal(state.progress.pendingChests, 1);
});

test('старое состояние версии 2 переносится без потери прогресса', () => {
  const old = {
    version: 2, profile: { name: 'Александра' },
    settings: { length: 'short', enabledSounds: { 'с': true, 'з': true, 'ц': false }, enabledPairs: { 'с-з': true } },
    exercises: [{ id: 'mushroom', enabled: true, mode: 'timer', amount: 45, fixed: true }, { id: 'horse', enabled: false }, { id: 'custom-1', name: 'Моё', instruction: 'делай', mode: 'timer', amount: 5, enabled: true }],
    progress: { stars: 42, days: { '2026-09-20': true }, history: [{ date: '2026-09-20' }], recentGames: ['echo'], puzzle: { size: 12, pieces: 3, lastUnlockDate: '2026-09-20' }, letterCollection: { letters: { 'с': 2 }, total: 2 }, zoo: ['Сова'] }
  };
  const s = core.normalizeState(old);
  assert.equal(s.version, 3);
  assert.equal(s.progress.stars, 42);
  assert.equal(s.progress.puzzle.pieces, 3);
  assert.equal(s.progress.puzzle.size, 12);
  assert.equal(s.settings.length, 'short');
  assert.equal(s.exercises.find(e => e.id === 'horse').enabled, false);
  assert.equal(s.exercises.find(e => e.id === 'mushroom').mode, 'holdReps');
  assert.ok(s.exercises.some(e => e.id === 'custom-1' && e.mode === 'hold'));
  assert.deepEqual(s.progress.zoo, ['Сова']);
  assert.ok(s.progress.pets && s.progress.stats);
});

test('магазин: покупка тратит звёзды, дважды питомца не купить', () => {
  let state = core.adoptFirstPet(core.createDefaultState('Тест'));
  state.progress.stars = 100;
  let r = core.buy(state, 'kitten');
  assert.ok(r.ok);
  assert.equal(r.state.progress.stars, 60);
  r = core.buy(r.state, 'kitten');
  assert.equal(r.ok, false);
  r = core.buy(r.state, 'unicorn');
  assert.equal(r.reason, 'stars');
});

test('сундук даёт награду и сокровище', () => {
  const state = core.createDefaultState('Тест');
  state.progress.pendingChests = 1;
  const r = core.openChest(state, seq(5));
  assert.ok(r.reward);
  assert.equal(r.state.progress.pendingChests, 0);
  assert.equal(Object.values(r.state.progress.treasures).reduce((a, b) => a + b, 0), 1);
});

test('записи ребёнка: не старше 14 дней и не больше 30', () => {
  const now = Date.UTC(2026, 8, 22);
  const items = Array.from({ length: 40 }, (_, i) => ({ id: String(i), createdAt: now - i * 3600000 }));
  items.push({ id: 'old', createdAt: now - 20 * 86400000 });
  const kept = core.pruneRecordingMeta(items, now);
  assert.equal(kept.length, 30);
  assert.ok(!kept.some(x => x.id === 'old'));
});

test('подсказка поднять уровень при хороших маминых оценках', () => {
  const state = core.createDefaultState('Тест');
  state.progress.stats.sounds['с'] = { said: 200, good: 30, slip: 5, sessions: 8, last: '2026-09-22' };
  state.progress.history = Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-1${i}`, sounds: ['с'] }));
  const s = core.levelSuggestions(state, '2026-09-22');
  assert.ok(s.some(x => x.sound === 'с' && x.to === 3));
});

test('выбор игры: у игр основного звука есть вторая игра того же типа, все игры разные', () => {
  const state = core.createDefaultState('Тест');
  for (let i = 1; i < 25; i += 1) {
    const s = core.buildSession(state, new Date(2026, 8, i), seq(i + 100));
    const games = s.steps.filter(x => x.kind === 'game');
    const withAlt = games.filter(g => g.alt);
    assert.ok(withAlt.length >= 1, 'хотя бы один выбор');
    const all = [...games.map(g => g.game), ...withAlt.map(g => g.alt.game)];
    assert.equal(new Set(all).size, all.length, 'игры и варианты не повторяются');
    for (const g of withAlt) {
      assert.equal(g.sound, s.primary);
      assert.equal(core.GAMES[g.alt.game].speak, core.GAMES[g.game].speak, 'вариант того же типа');
      assert.ok(g.alt.payload);
    }
  }
  state.settings.choice = false;
  const off = core.buildSession(state, new Date(2026, 8, 3), seq(3));
  assert.ok(off.steps.every(x => !x.alt));
});

test('первое занятие дня: наклейка, новая глава, питомец растёт; второе — только звёзды', () => {
  let state = core.adoptFirstPet(core.createDefaultState('Тест'));
  let r = core.completeSession(state, { stars: 5, soundsList: ['с'] }, '2026-09-21', seq(5));
  assert.ok(r.firstToday && r.sticker && r.sticker.isNew);
  assert.equal(r.storyChapter.id, data.STORY[1].id, 'первая глава открыта сразу, занятие открывает вторую');
  assert.equal(r.state.progress.pets.growth.yazychok, 1);
  const again = core.completeSession(r.state, { stars: 5, soundsList: ['с'] }, '2026-09-21', seq(6));
  assert.equal(again.sticker, null);
  assert.equal(again.storyChapter, null);
  assert.equal(again.state.progress.pets.growth.yazychok, 1);
  assert.equal(again.state.progress.story.unlocked, 2);
});

test('альбом заполняется по страницам без повторов; целая страница даёт звёзды и медаль', () => {
  let state = core.createDefaultState('Тест');
  const seen = new Set();
  let pageDone = 0;
  for (let d = 1; d <= data.STICKERS.length; d += 1) {
    const date = `2026-${String(10 + Math.floor((d - 1) / 28)).padStart(2, '0')}-${String(((d - 1) % 28) + 1).padStart(2, '0')}`;
    const r = core.completeSession(state, { stars: 0, soundsList: ['с'] }, date, seq(d));
    state = r.state;
    assert.ok(r.sticker.isNew, 'пока альбом не собран — только новые');
    assert.ok(!seen.has(r.sticker.sticker.id));
    seen.add(r.sticker.sticker.id);
    if (d <= 6) assert.equal(r.sticker.sticker.page, data.STICKER_PAGES[0].id, 'сначала первая страница');
    if (r.sticker.pageDone) pageDone += 1;
  }
  assert.equal(pageDone, data.STICKER_PAGES.length);
  assert.equal(core.albumPagesDone(state), data.STICKER_PAGES.length);
  assert.ok(state.progress.medals.album1 && state.progress.medals.albumAll);
  const dup = core.drawSticker(state.progress, seq(9), '2026-12-01');
  assert.equal(dup.isNew, false);
  assert.ok(dup.stars > 0);
});

test('рост питомца по дням занятий и сундук с наклейкой', () => {
  let state = core.adoptFirstPet(core.createDefaultState('Тест'));
  const grew = [];
  for (let d = 1; d <= 20; d += 1) {
    const r = core.completeSession(state, { stars: 0, soundsList: ['с'] }, `2026-10-${String(d).padStart(2, '0')}`, seq(d));
    state = r.state;
    if (r.petGrew) grew.push(d);
  }
  assert.deepEqual(grew, core.PET_STAGES.slice(1).map(st => st.at));
  assert.equal(core.petStage(state).stage.name, core.PET_STAGES[4].name);
  state.progress.pendingChests = 1;
  const chest = core.openChest(state, seq(4));
  assert.ok(chest.reward.sticker && chest.reward.sticker.sticker);
});

test('старое состояние без альбома и сказки нормализуется, объединение копий берёт максимум', () => {
  const old = core.createDefaultState('Тест');
  delete old.progress.album; delete old.progress.story; delete old.progress.pets.growth;
  const n = core.normalizeState(old);
  assert.deepEqual(n.progress.album.stickers, {});
  assert.equal(n.progress.story.unlocked, 1);
  const a = core.normalizeState(old); a.progress.story.unlocked = 3; a.progress.album.stickers['forest-0'] = 1;
  const b = core.normalizeState(old); b.progress.story.unlocked = 5; b.progress.album.stickers['sea-1'] = 2; b.progress.pets.growth.kitten = 4;
  const m = core.mergeState(a, b);
  assert.equal(m.progress.story.unlocked, 5);
  assert.equal(m.progress.album.stickers['forest-0'], 1);
  assert.equal(m.progress.album.stickers['sea-1'], 2);
  assert.equal(m.progress.pets.growth.kitten, 4);
});

test('герой ошибается: для слов со звуком есть «ошибка» с заменой нужного звука', () => {
  const words = data.WORDS.filter(w => w.targets.some(t => t.sound === 'с'));
  const withMistake = words.filter(w => core.heroMistake(w, 'с'));
  assert.ok(withMistake.length >= words.length * 0.9);
  for (const w of withMistake) {
    const m = core.heroMistake(w, 'с');
    assert.notEqual(m.text, w.text);
    assert.equal(m.sound, 'с');
    assert.ok(!['водка'].includes(m.text));
  }
  assert.equal(core.heroMistake(data.WORDS.find(w => w.text === 'сова'), 'с').text.slice(1), 'ова');
});

test('игры с героем: только когда мама добавила картинку; тогда герой — первый вариант выбора', () => {
  const state = core.createDefaultState('Тест');
  assert.equal(core.gameIsPlayable(state, 'heroTeach', 'с'), false);
  state.hero.hasImage = true;
  assert.equal(core.gameIsPlayable(state, 'heroTeach', 'с'), true);
  assert.equal(core.gameIsPlayable(state, 'heroOops', 'с'), true);
  const p = core.gamePayload(state, 'heroOops', 'с', seq(3), []);
  assert.ok(p.rounds.length >= 4);
  assert.ok(p.rounds.some(r => r.wrong) && p.rounds.some(r => !r.wrong));
  let heroOffered = 0;
  for (let i = 1; i < 15; i += 1) {
    const s = core.buildSession(state, new Date(2026, 9, i), seq(i + 40));
    if (s.steps.some(x => x.kind === 'game' && (core.GAMES[x.game].hero || (x.alt && core.GAMES[x.alt.game].hero)))) heroOffered += 1;
  }
  assert.ok(heroOffered >= 12, `герой предлагается почти всегда (${heroOffered})`);
  state.hero.inSessions = false;
  assert.equal(core.gameIsPlayable(state, 'heroTeach', 'с'), false);
});

test('новые игры с героем: прятки, похожие слова, повторюшка, рюкзак', () => {
  const state = core.createDefaultState('Тест');
  state.hero.hasImage = true;
  for (const game of ['heroHide', 'heroPairs', 'heroEcho', 'heroBackpack']) assert.equal(core.gameIsPlayable(state, game, 'с'), true, game);
  // Прятки: 3 раунда, в каждом разные картинки, герой — за одной из них.
  const hide = core.gamePayload(state, 'heroHide', 'с', seq(5), []);
  assert.equal(hide.rounds.length, 3);
  for (const r of hide.rounds) {
    assert.equal(new Set(r.items.map(w => w.text)).size, r.items.length);
    assert.ok(r.hideAt >= 0 && r.hideAt < r.items.length);
    assert.ok(r.items.every(w => w.targets.some(t => t.sound === 'с')));
  }
  // Похожие слова: 6 раундов, сначала пары с нашим звуком, слова пары отличаются.
  const pairs = core.gamePayload(state, 'heroPairs', 'с', seq(7), []);
  assert.equal(pairs.rounds.length, 6);
  assert.ok(pairs.rounds[0].pair.sounds.includes('с'));
  for (const r of pairs.rounds) { assert.notEqual(r.pair.a.text, r.pair.b.text); assert.ok(['a', 'b'].includes(r.say)); }
  for (const pair of data.HERO_PAIRS) {
    assert.ok(pair.a.emoji && pair.b.emoji && pair.a.emoji !== pair.b.emoji, pair.id);
    assert.ok(data.SOUND_ORDER.includes(pair.sounds[0]) && data.SOUND_ORDER.includes(pair.sounds[1]), pair.id);
  }
  // Повторюшка и рюкзак.
  assert.ok(core.gamePayload(state, 'heroEcho', 'с', seq(9), []).items.length >= 4);
  const pack = core.gamePayload(state, 'heroBackpack', 'с', seq(11), []);
  assert.equal(pack.items.filter(x => x.answer).length, 4);
  assert.ok(pack.items.filter(x => !x.answer).length >= 3);
  assert.ok(pack.items.filter(x => !x.answer).every(x => !x.word.targets.some(t => t.sound === 'с')));
  assert.ok(['hike', 'sea', 'space'].includes(pack.theme));
  // Звук без пар (например, «ч») — «Что сказал герой?» не предлагается.
  assert.equal(core.gameIsPlayable(state, 'heroPairs', 'ч'), false);
});

test('питомец растёт заметно: малыш вдвое меньше, чемпион крупнее всех', () => {
  const scales = core.PET_STAGES.map(st => st.scale);
  assert.ok(scales.every((v, i) => i === 0 || v > scales[i - 1]), 'каждая стадия крупнее предыдущей');
  assert.ok(scales[0] <= 0.6 && scales[scales.length - 1] >= 1.1);
});

test('дружба с героем: сердечко за несколько игр, новый уровень сообщается один раз', () => {
  const state = core.createDefaultState('Тест');
  assert.equal(core.heroFriend(state).index, 0);
  const ups = [];
  for (let i = 0; i < 20; i += 1) { const up = core.addHeroFriendship(state); if (up) ups.push(up.index); }
  assert.deepEqual(ups, [1, 2, 3, 4]);
  assert.equal(core.heroFriend(state).level.name, core.HERO_FRIEND[4].name);
  const merged = core.mergeState(core.createDefaultState('Тест'), state);
  assert.equal(merged.hero.friendship, 20);
});

test('все купленные питомцы растут вместе за первое занятие дня', () => {
  let s = core.adoptFirstPet(core.createDefaultState());
  s.progress.pets.owned.push('kitten', 'bunny');
  s.progress.pets.growth = { yazychok: 2, kitten: 0, bunny: 6 };
  const r = core.completeSession(s, { stars: 5, soundsList: ['с'] }, '2026-10-08', () => 0.5);
  const g = r.state.progress.pets.growth;
  assert.deepEqual([g.yazychok, g.kitten, g.bunny], [3, 1, 7]);
  assert.ok(r.petsUp.some(x => x.pet === 'yazychok'));
  assert.ok(r.petsUp.some(x => x.pet === 'bunny'));
});

test('настроение питомца: еда +2, раз в день за действие, убывает без заботы, бонус за довольного', () => {
  let s = core.adoptFirstPet(core.createDefaultState());
  s.progress.pets.items['food-apple'] = 2;
  const day = '2026-10-08';
  assert.equal(core.petJoy(s, 'yazychok', day), 2);
  const fed = core.feedPet(s, 'food-apple', day);
  assert.equal(fed.joy.joy, 4);
  s = fed.state;
  assert.equal(core.addPetJoy(s, 'yazychok', 1, day, 'bath').added, 1);
  assert.equal(core.addPetJoy(s, 'yazychok', 1, day, 'bath').added, 0);
  assert.equal(core.petJoy(s, 'yazychok', '2026-10-10'), 3);
  const r = core.completeSession(s, { stars: 5, soundsList: ['с'] }, day, () => 0.5);
  assert.equal(r.petBonus, 3);
});

test('магазин: мебель встаёт в домик, краска красит питомца, мечта снимается после покупки', () => {
  let s = core.adoptFirstPet(core.createDefaultState());
  s.progress.stars = 500;
  s.progress.pets.wish = 'decor-bed';
  let r = core.buy(s, 'decor-bed');
  assert.ok(r.ok);
  assert.deepEqual(r.state.progress.pets.decor, ['decor-bed']);
  assert.equal(r.state.progress.pets.wish, '');
  r = core.buy(r.state, 'paint-blue');
  assert.equal(r.state.progress.pets.colors.yazychok, 'paint-blue');
  r = core.buy(r.state, 'neck-scarf');
  assert.equal(r.state.progress.pets.wearing.neck, 'neck-scarf');
  for (const id of ['decor-cactus', 'decor-tree', 'decor-tent', 'decor-castle']) r = core.buy(r.state, id);
  assert.equal(r.state.progress.pets.decor.length, core.DECOR_MAX);
  assert.ok(r.state.progress.pets.decor.includes('decor-castle'));
});

test('любимая еда питомца: +3 сердечка и запоминается', () => {
  let s = core.adoptFirstPet(core.createDefaultState());
  s.progress.pets.items['food-strawberry'] = 1;
  s.progress.pets.items['food-apple'] = 1;
  const a = core.feedPet(s, 'food-apple', '2026-10-13');
  assert.equal(a.fav, false);
  const b = core.feedPet(s, 'food-strawberry', '2026-10-13');
  assert.equal(b.fav, true);
  assert.equal(b.joy.joy, 5);
  assert.equal(b.state.progress.pets.favKnown.yazychok, true);
  assert.ok(core.PETS.every(p => core.ITEMS.some(i => i.id === p.fav)), 'у каждого питомца любимая еда из магазина');
});

test('темы дня: сказка по порядку, день игр — больше игр, вперемешку — разминка между играми', () => {
  const st = core.adoptFirstPet(core.createDefaultState('Т'));
  st.progress.history = [{}, {}];
  const count = (s, kind) => s.steps.filter(x => x.kind === kind).length;
  const normal = core.buildSession(st, new Date(2026, 9, 14), seq(3), { theme: 'normal' });
  const tale = core.buildSession(st, new Date(2026, 9, 14), seq(3), { theme: 'tale' });
  assert.ok(tale.steps.filter(x => x.kind === 'gym').every(x => x.tale));
  assert.equal(tale.steps.find(x => x.kind === 'gym').exercise.id, 'mushroom');
  assert.ok(tale.steps.filter(x => x.kind === 'gym').pop().taleLast);
  const games = core.buildSession(st, new Date(2026, 9, 14), seq(3), { theme: 'games' });
  assert.ok(count(games, 'gym') < count(normal, 'gym'));
  const mixed = core.buildSession(st, new Date(2026, 9, 14), seq(3), { theme: 'mixed' });
  const firstGame = mixed.steps.findIndex(x => x.kind === 'game' || x.kind === 'mic');
  assert.ok(mixed.steps.slice(firstGame).some(x => x.kind === 'gym'), 'есть упражнения после игр');
  const mic = core.buildSession(st, new Date(2026, 9, 14), seq(3), { theme: 'mic' });
  assert.ok(count(mic, 'mic') > count(normal, 'mic') || count(mic, 'mic') >= 2);
  // Новичку (меньше 2 занятий) — всегда обычный день; мама может выключить темы.
  assert.equal(core.dayTheme(core.createDefaultState('Т'), new Date(2026, 9, 14)), 'normal');
  st.settings.dayThemes = false;
  assert.equal(core.dayTheme(st, new Date(2026, 9, 18)), 'normal');
});

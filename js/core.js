(function (root, factory) {
  const data = typeof module === 'object' && module.exports ? require('./data.js') : root.YazychokData;
  const value = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.core = value;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (data) {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const STATE_VERSION = 3;

  // ─────────────────────────────────────────────────────────────
  // ИГРЫ: минимальный уровень звука и говорит ли ребёнок в игре
  // ─────────────────────────────────────────────────────────────
  const GAMES = {
    soundCheck:      { title: 'Есть звук?',            icon: '👂', min: 1, speak: false },
    memoryPairs:     { title: 'Найди пару',            icon: '🃏', min: 2, speak: true },
    groupSort:       { title: 'Разложи по домикам',    icon: '🏠', min: 2, speak: true },
    finishPhrase:    { title: 'Закончи чистоговорку',  icon: '🎤', min: 3, speak: true },
    repeatPhrase:    { title: 'Повторяй за мной',      icon: '🗣️', min: 3, speak: true },
    parrot:          { title: 'Попугай',               icon: '🦜', min: 1, speak: true },
    conveyor:        { title: 'Лента',                 icon: '🧺', min: 2, speak: false },
    balloons:        { title: 'Шарики',                icon: '🎈', min: 2, speak: false },
    soundPosition:   { title: 'Где звук?',             icon: '🚃', min: 2, speak: true },
    syllableBuilder: { title: 'Собери слово',          icon: '🧱', min: 2, speak: true },
    whackMole:       { title: 'Бей крота',             icon: '🔨', min: 1, speak: false },
    wheel:           { title: 'Колесо фортуны',        icon: '🎡', min: 2, speak: true },
    boxes:           { title: 'Открой коробку',        icon: '📦', min: 2, speak: true },
    whatsMissing:    { title: 'Что пропало?',          icon: '🙈', min: 2, speak: true },
    pictureReveal:   { title: 'Картинка-загадка',      icon: '🖼️', min: 1, speak: true },
    syllableTrain:   { title: 'Поезд слогов',          icon: '🚂', min: 1, speak: true },
    hideSeek:        { title: 'Звуковые прятки',       icon: '🔍', min: 2, speak: true },
    feedPet:         { title: 'Покорми питомца',       icon: '🍽️', min: 2, speak: true },
    beads:           { title: 'Бусы из слов',          icon: '📿', min: 2, speak: true },
    heroTeach:       { title: 'Научи героя',           icon: '🧑‍🏫', min: 2, speak: true, hero: true },
    heroOops:        { title: 'Герой ошибается',       icon: '🙊', min: 2, speak: true, hero: true },
    heroHide:        { title: 'Прятки с героем',       icon: '🫣', min: 2, speak: true, hero: true },
    heroPairs:       { title: 'Что сказал герой?',     icon: '👂', min: 1, speak: false, hero: true },
    heroEcho:        { title: 'Герой-повторюшка',      icon: '🔁', min: 2, speak: true, hero: true },
    heroBackpack:    { title: 'Рюкзак героя',          icon: '🎒', min: 2, speak: true, hero: true }
  };
  const GAME_TYPES = Object.keys(GAMES);

  const MIC_GAMES = {
    pump:     { title: 'Насос',     icon: '🎈' },
    mosquito: { title: 'Комарик',   icon: '🦟' },
    popper:   { title: 'Хлопушка',  icon: '💥' },
    snake:    { title: 'Змейка',    icon: '🐍' },
    beetle:   { title: 'Жук',       icon: '🐞' },
    train:    { title: 'Паровоз',   icon: '🚂' },
    brush:    { title: 'Щётка',     icon: '🦷' },
    plane:    { title: 'Самолёт',   icon: '✈️' },
    motor:    { title: 'Моторчик',  icon: '🏍️' },
    party:    { title: 'Праздник звуков', icon: '🎉' }
  };

  // ── «Праздник звуков»: одна игра, разные звуки по очереди ──
  // Надуть шарик (тянем звук) → лопнуть (короткий Ц или Ч) → прилетает гость со своим звуком (З — комарик, Ш — змейка…).
  // Чередование звуков учит их различать.
  const PARTY_GUESTS = {
    'з': { hero: '🦟', name: 'Комарик', goal: '🌸' }, 'зь': { hero: '🦟', name: 'Комарик', goal: '🌸' },
    'ж': { hero: '🐞', name: 'Жук', goal: '🌼' }, 'ш': { hero: '🐍', name: 'Змейка', goal: '🍎' },
    'щ': { hero: '🧽', name: 'Щётка', goal: '✨' }, 'с': { hero: '🍃', name: 'Ветерок', goal: '🌳' }, 'сь': { hero: '🍃', name: 'Ветерок', goal: '🌳' },
    'л': { hero: '✈️', name: 'Самолёт', goal: '🏝️' }, 'ль': { hero: '✈️', name: 'Самолёт', goal: '🏝️' },
    'р': { hero: '🏍️', name: 'Мотоцикл', goal: '🏁' }, 'рь': { hero: '🏍️', name: 'Мотоцикл', goal: '🏁' },
    'ч': { hero: '🚂', name: 'Паровоз', goal: '🏠', burst: true }
  };
  const CONTINUOUS = ['с', 'сь', 'з', 'зь', 'ш', 'ж', 'щ', 'л', 'ль', 'р', 'рь'];
  function partyPlan(state, primary, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const active = data.SOUND_ORDER.filter(sound => levelOf(state, sound) >= 1 && data.SOUNDS[sound]);
    const has = sound => active.includes(sound);
    // Чем надуваем: основной звук, если он тянется; иначе — С или Ш из включённых.
    const inflate = CONTINUOUS.includes(primary) ? primary : (['с', 'ш', 'з', 'ж'].find(has) || 'с');
    const pop = primary === 'ц' || primary === 'ч' ? primary : (has('ц') ? 'ц' : (has('ч') ? 'ч' : ''));
    // Гости: сначала звуки той же группы и с уровнем повыше (их уже умеем), чуть случайно.
    const fam = data.SOUNDS[primary] ? data.SOUNDS[primary].family : '';
    const score = sound => (data.SOUNDS[sound].family === fam ? 10 : 0) + levelOf(state, sound) * 2 + random();
    const guests = active.filter(sound => PARTY_GUESTS[sound] && sound !== inflate && sound !== pop).sort((a, b) => score(b) - score(a));
    if (!guests.length && PARTY_GUESTS[primary]) guests.push(primary);
    const tasks = [];
    for (let round = 0; round < 3; round += 1) {
      tasks.push({ type: 'inflate', sound: inflate, needMs: 1800 + round * 300 });
      tasks.push({ type: 'pop', sound: pop });
      if (round < 2 && guests.length) {
        const g = guests[round % guests.length];
        tasks.push(Object.assign({ type: 'guest', sound: g, needMs: 2600 }, PARTY_GUESTS[g]));
      }
    }
    return tasks;
  }
  function partyEligible(state) {
    return data.SOUND_ORDER.filter(sound => levelOf(state, sound) >= 1 && PARTY_GUESTS[sound] || (sound === 'ц' && levelOf(state, sound) >= 1)).length >= 2;
  }

  const LENGTHS = {
    short:  { gym: 3, games: 2, label: '≈ 8 минут' },
    normal: { gym: 4, games: 4, label: '≈ 14 минут' },
    long:   { gym: 5, games: 5, label: '≈ 18 минут' }
  };

  // ─────────────────────────────────────────────────────────────
  // НАГРАДЫ: питомцы, вещи, фоны, медали, сокровища
  // ─────────────────────────────────────────────────────────────
  const PETS = [
    { id: 'yazychok', name: 'Язычок', acc: 'Язычка', fav: 'food-strawberry', kind: 'svg', design: 'tongue', price: 0, sounds: ['з'] },
    { id: 'kitten', art: 'cat-face', name: 'Кекс', acc: 'Кекса', fav: 'food-fish', kind: 'emoji', emoji: '🐱', price: 40, sounds: ['с'] },
    { id: 'bunny', art: 'rabbit-face', name: 'Зайка Зуза', acc: 'Зайку Зузу', fav: 'food-carrot', kind: 'emoji', emoji: '🐰', price: 40, sounds: ['з'] },
    { id: 'chick', art: 'front-facing-baby-chick', name: 'Цыпа', acc: 'Цыпу', fav: 'food-cookie', kind: 'emoji', emoji: '🐥', price: 40, sounds: ['ц'] },
    { id: 'mouse', art: 'mouse-face', name: 'Шуша', acc: 'Шушу', fav: 'food-cheese', kind: 'emoji', emoji: '🐭', price: 40, sounds: ['ш'] },
    { id: 'hedgehog', art: 'hedgehog', name: 'Жужа', acc: 'Жужу', fav: 'food-apple', kind: 'emoji', emoji: '🦔', price: 45, sounds: ['ж'] },
    { id: 'panda', art: 'panda', name: 'Соня', acc: 'Соню', fav: 'food-honey', kind: 'emoji', emoji: '🐼', price: 50, sounds: ['с'] },
    { id: 'puppy', art: 'dog-face', name: 'Космос', acc: 'Космоса', fav: 'food-bone', kind: 'emoji', emoji: '🐶', price: 50, sounds: ['с'] },
    { id: 'penguin', art: 'penguin', name: 'Лоло', acc: 'Лоло', fav: 'food-fish', kind: 'emoji', emoji: '🐧', price: 55, sounds: ['л'] },
    { id: 'fox', art: 'fox', name: 'Лиса Алиса', acc: 'Лису Алису', fav: 'food-grapes', kind: 'emoji', emoji: '🦊', price: 60, sounds: ['ль', 'с'] },
    { id: 'fluffy', name: 'Пушистик', acc: 'Пушистика', fav: 'food-cupcake', kind: 'svg', design: 'fluffy', price: 80, sounds: ['ш', 'сь'] },
    { id: 'horny', name: 'Зубастик', acc: 'Зубастика', fav: 'food-pizza', kind: 'svg', design: 'horny', price: 80, sounds: ['з', 'с'] },
    { id: 'eyes3', name: 'Глазастик', acc: 'Глазастика', fav: 'food-lollipop', kind: 'svg', design: 'eyes3', price: 90, sounds: ['л', 'з', 'с'] },
    { id: 'cloudy', name: 'Облачко', acc: 'Облачко', fav: 'food-icecream', kind: 'svg', design: 'cloudy', price: 90, sounds: ['л', 'ч'] },
    { id: 'rainbow', name: 'Язычок-Радуга', acc: 'Язычка-Радугу', fav: 'food-lollipop', kind: 'svg', design: 'rainbowTongue', price: 120, sounds: ['з', 'ч'] },
    { id: 'octopus', art: 'octopus', name: 'Осьминожка', acc: 'Осьминожку', fav: 'food-fish', kind: 'emoji', emoji: '🐙', price: 110, sounds: ['сь', 'ж'] },
    { id: 'unicorn', art: 'unicorn', name: 'Искорка', acc: 'Искорку', fav: 'food-cupcake', kind: 'emoji', emoji: '🦄', price: 150, sounds: ['с', 'р'] },
    { id: 'dragon', art: 'dragon-face', name: 'Дракоша', acc: 'Дракошу', fav: 'food-pizza', kind: 'emoji', emoji: '🐲', price: 150, sounds: ['р', 'ш'] }
  ];

  const ITEMS = [
    { id: 'hat-crown', art: 'crown', slot: 'hat', emoji: '👑', name: 'Корона', price: 35 },
    { id: 'hat-bow', art: 'ribbon', slot: 'hat', emoji: '🎀', name: 'Бантик', price: 15 },
    { id: 'hat-cap', art: 'billed-cap', slot: 'hat', emoji: '🧢', name: 'Кепка', price: 15 },
    { id: 'hat-top', art: 'top-hat', slot: 'hat', emoji: '🎩', name: 'Цилиндр', price: 25 },
    { id: 'hat-grad', art: 'graduation-cap', slot: 'hat', emoji: '🎓', name: 'Шапочка учёного', price: 30 },
    { id: 'hat-sun', art: 'womans-hat', slot: 'hat', emoji: '👒', name: 'Шляпка', price: 20 },
    { id: 'glasses-sun', art: 'sunglasses', slot: 'glasses', emoji: '🕶️', name: 'Очки от солнца', price: 20 },
    { id: 'glasses-round', art: 'glasses', slot: 'glasses', emoji: '👓', name: 'Очки', price: 15 },
    { id: 'toy-balloon', art: 'balloon', slot: 'toy', emoji: '🎈', name: 'Шарик', price: 10 },
    { id: 'toy-bear', art: 'teddy-bear', slot: 'toy', emoji: '🧸', name: 'Мишка', price: 20 },
    { id: 'toy-ball', art: 'soccer-ball', slot: 'toy', emoji: '⚽', name: 'Мяч', price: 15 },
    { id: 'toy-kite', art: 'kite', slot: 'toy', emoji: '🪁', name: 'Воздушный змей', price: 25 },
    { id: 'toy-wand', art: 'crystal-ball', slot: 'toy', emoji: '🔮', name: 'Волшебный шар', price: 40 },
    { id: 'food-apple', slot: 'food', emoji: '🍎', name: 'Яблоко', price: 4 },
    { id: 'food-strawberry', slot: 'food', emoji: '🍓', name: 'Клубника', price: 5 },
    { id: 'food-cookie', slot: 'food', emoji: '🍪', name: 'Печенье', price: 5 },
    { id: 'food-cupcake', slot: 'food', emoji: '🧁', name: 'Пирожное', price: 8 },
    { id: 'food-lollipop', slot: 'food', emoji: '🍭', name: 'Леденец', price: 6 },
    { id: 'food-carrot', slot: 'food', emoji: '🥕', name: 'Морковка', price: 4 },
    // Новое (2026-10): у каждого питомца есть любимая еда — её надо угадать.
    { id: 'food-banana', slot: 'food', emoji: '🍌', name: 'Банан', price: 5 },
    { id: 'food-watermelon', slot: 'food', emoji: '🍉', name: 'Арбуз', price: 7 },
    { id: 'food-cheese', slot: 'food', emoji: '🧀', name: 'Сыр', price: 5 },
    { id: 'food-honey', slot: 'food', emoji: '🍯', name: 'Мёд', price: 6 },
    { id: 'food-milk', slot: 'food', emoji: '🥛', name: 'Молоко', price: 4 },
    { id: 'food-pizza', slot: 'food', emoji: '🍕', name: 'Пицца', price: 8 },
    { id: 'food-icecream', slot: 'food', emoji: '🍦', name: 'Мороженое', price: 7 },
    { id: 'food-grapes', slot: 'food', emoji: '🍇', name: 'Виноград', price: 5 },
    { id: 'food-fish', slot: 'food', emoji: '🐟', name: 'Рыбка', price: 6 },
    { id: 'food-bone', slot: 'food', emoji: '🦴', name: 'Косточка', price: 5 },
    { id: 'hat-helmet', art: 'rescue-workers-helmet', slot: 'hat', emoji: '⛑️', name: 'Каска спасателя', price: 20 },
    { id: 'hat-flower', art: 'cherry-blossom', slot: 'hat', emoji: '🌸', name: 'Цветочек', price: 12 },
    { id: 'hat-star', art: 'glowing-star', slot: 'hat', emoji: '🌟', name: 'Звёздочка', price: 18 },
    { id: 'hat-cherry', art: 'cherries', slot: 'hat', emoji: '🍒', name: 'Заколка-вишенки', price: 14 },
    { id: 'glasses-swim', art: 'goggles', slot: 'glasses', emoji: '🥽', name: 'Очки для плавания', price: 20 },
    { id: 'neck-scarf', slot: 'neck', emoji: '🧣', name: 'Шарфик', price: 15 },
    { id: 'neck-bell', art: 'bell', slot: 'neck', emoji: '🔔', name: 'Колокольчик', price: 15 },
    { id: 'neck-beads', slot: 'neck', emoji: '📿', name: 'Бусы', price: 18 },
    { id: 'neck-medal', art: 'sports-medal', slot: 'neck', emoji: '🏅', name: 'Медаль', price: 25 },
    { id: 'toy-piano', art: 'musical-keyboard', slot: 'toy', emoji: '🎹', name: 'Пианино', price: 35, music: 'piano' },
    { id: 'toy-drum', art: 'drum', slot: 'toy', emoji: '🥁', name: 'Барабан', price: 25, music: 'drum' },
    { id: 'toy-trumpet', art: 'trumpet', slot: 'toy', emoji: '🎺', name: 'Труба', price: 30, music: 'trumpet' },
    { id: 'toy-car', art: 'automobile', slot: 'toy', emoji: '🚗', name: 'Машинка', price: 20, music: 'car' },
    { id: 'toy-bubbles', art: 'bubbles', slot: 'toy', emoji: '🫧', name: 'Мыльные пузыри', price: 15, music: 'bubbles' },
    // Домик: мебель и украшения — стоят в комнате (до 4 сразу).
    { id: 'decor-bed', slot: 'decor', emoji: '🛏️', name: 'Кроватка', price: 40 },
    { id: 'decor-sunflower', slot: 'decor', emoji: '🌻', name: 'Подсолнух', price: 15 },
    { id: 'decor-cactus', slot: 'decor', emoji: '🌵', name: 'Кактус', price: 12 },
    { id: 'decor-picture', slot: 'decor', emoji: '🖼️', name: 'Картина', price: 20 },
    { id: 'decor-lantern', slot: 'decor', emoji: '🏮', name: 'Фонарик', price: 18 },
    { id: 'decor-snowman', slot: 'decor', emoji: '⛄', name: 'Снеговик', price: 25 },
    { id: 'decor-tree', slot: 'decor', emoji: '🎄', name: 'Ёлочка', price: 30 },
    { id: 'decor-tent', slot: 'decor', emoji: '🎪', name: 'Шатёр', price: 45 },
    { id: 'decor-fountain', slot: 'decor', emoji: '⛲', name: 'Фонтан', price: 50 },
    { id: 'decor-carousel', slot: 'decor', emoji: '🎠', name: 'Карусель', price: 60 },
    { id: 'decor-rainbow', slot: 'decor', emoji: '🌈', name: 'Радуга', price: 70 },
    { id: 'decor-castle', slot: 'decor', emoji: '🏰', name: 'Замок', price: 120 },
    // Волшебные краски: перекрашивают выбранного питомца (можно вернуть обычный цвет).
    { id: 'paint-pink', slot: 'paint', emoji: '🎨', name: 'Розовая краска', price: 30, color: '#ff7fb6' },
    { id: 'paint-blue', slot: 'paint', emoji: '🎨', name: 'Голубая краска', price: 30, color: '#6ab8ff' },
    { id: 'paint-green', slot: 'paint', emoji: '🎨', name: 'Зелёная краска', price: 30, color: '#5fd18a' },
    { id: 'paint-purple', slot: 'paint', emoji: '🎨', name: 'Фиолетовая краска', price: 30, color: '#a77dff' },
    { id: 'paint-gold', slot: 'paint', emoji: '🎨', name: 'Золотая краска', price: 60, color: '#ffc93a' },
    { id: 'paint-rainbow', slot: 'paint', emoji: '🎨', name: 'Радужная краска', price: 90, color: 'linear-gradient(90deg,#ff6b8b,#ffb347,#ffe066,#6bd08b,#6aa8ff,#b388ff)' }
  ];
  const DECOR_MAX = 4;
  // Новинки магазина (октябрь 2026) — с пометкой «новое», пока ребёнок их не увидит.
  const SHOP_NEW = ['food-banana', 'food-watermelon', 'food-cheese', 'food-honey', 'food-milk', 'food-pizza', 'food-icecream', 'food-grapes', 'food-fish', 'food-bone',
    'hat-helmet', 'hat-flower', 'hat-star', 'hat-cherry', 'glasses-swim', 'neck-scarf', 'neck-bell', 'neck-beads', 'neck-medal',
    'toy-piano', 'toy-drum', 'toy-trumpet', 'toy-car', 'toy-bubbles',
    'decor-bed', 'decor-sunflower', 'decor-cactus', 'decor-picture', 'decor-lantern', 'decor-snowman', 'decor-tree', 'decor-tent', 'decor-fountain', 'decor-carousel', 'decor-rainbow', 'decor-castle',
    'paint-pink', 'paint-blue', 'paint-green', 'paint-purple', 'paint-gold', 'paint-rainbow',
    'spring', 'autumn', 'winter', 'beach', 'night', 'rainbowland'];

  const BACKGROUNDS = [
    { id: 'meadow', name: 'Полянка', price: 0, deco: '🌼🌿🦋' },
    { id: 'sea', name: 'Море', price: 50, deco: '🐚🌊🐠' },
    { id: 'space', name: 'Космос', price: 70, deco: '🪐⭐🚀' },
    { id: 'castle', name: 'Замок', price: 70, deco: '🏰✨🦄' },
    { id: 'candy', name: 'Сладкая страна', price: 60, deco: '🍭🍬🧁' },
    { id: 'jungle', name: 'Джунгли', price: 60, deco: '🌴🐒🦜' },
    { id: 'spring', name: 'Весна', price: 55, deco: '🌷🌸🐝' },
    { id: 'autumn', name: 'Осень', price: 55, deco: '🍂🍁🍄' },
    { id: 'winter', name: 'Зима', price: 60, deco: '❄️⛄🎄' },
    { id: 'beach', name: 'Пляж', price: 60, deco: '🏖️🐚🦀' },
    { id: 'night', name: 'Звёздная ночь', price: 65, deco: '🌙✨🦉' },
    { id: 'rainbowland', name: 'Радужная страна', price: 80, deco: '🌈☁️🦄' }
  ];

  const TREASURES = [
    { id: 'gem', emoji: '💎', name: 'Алмаз' }, { id: 'crystal', emoji: '🔮', name: 'Хрустальный шар' },
    { id: 'shell', emoji: '🐚', name: 'Ракушка' }, { id: 'star', emoji: '🌟', name: 'Звезда' },
    { id: 'clover', emoji: '🍀', name: 'Клевер' }, { id: 'medal', emoji: '🏵️', name: 'Розетка' },
    { id: 'key', emoji: '🗝️', name: 'Старинный ключ' }, { id: 'rainbow', emoji: '🌈', name: 'Радуга' }
  ];

  const MEDALS = [
    { id: 'first', emoji: '🎉', name: 'Первое занятие', test: s => s.progress.history.length >= 1 },
    { id: 's5', emoji: '🥉', name: '5 занятий', test: s => s.progress.history.length >= 5 },
    { id: 's10', emoji: '🥈', name: '10 занятий', test: s => s.progress.history.length >= 10 },
    { id: 's25', emoji: '🥇', name: '25 занятий', test: s => s.progress.history.length >= 25 },
    { id: 's50', emoji: '🏆', name: '50 занятий', test: s => s.progress.history.length >= 50 },
    { id: 'week5', emoji: '🔥', name: 'Огненная неделя: 5 дней', test: s => (s.progress.puzzle.bonusWeeks || []).length >= 1 },
    { id: 'said100', emoji: '🗣️', name: '100 сказанных слов', test: s => s.progress.stats.saidTotal >= 100 },
    { id: 'said500', emoji: '📣', name: '500 сказанных слов', test: s => s.progress.stats.saidTotal >= 500 },
    { id: 'said1000', emoji: '🎺', name: '1000 сказанных слов', test: s => s.progress.stats.saidTotal >= 1000 },
    { id: 'mushroom30', emoji: '🍄', name: '30 грибочков', test: s => s.progress.stats.mushrooms >= 30 },
    { id: 'mushroom100', emoji: '🌳', name: '100 грибочков', test: s => s.progress.stats.mushrooms >= 100 },
    { id: 'momGood20', emoji: '💖', name: '20 раз «красиво» от мамы', test: s => s.progress.stats.momGoodTotal >= 20 },
    { id: 'pet2', emoji: '🐣', name: 'Второй питомец', test: s => s.progress.pets.owned.length >= 2 },
    { id: 'pet5', emoji: '🏡', name: '5 питомцев', test: s => s.progress.pets.owned.length >= 5 },
    { id: 'chest3', emoji: '🧰', name: '3 сундука', test: s => (s.progress.stats.chests || 0) >= 3 },
    { id: 'puzzle', emoji: '🎁', name: 'Подарок собран', test: s => (s.progress.stats.puzzlesDone || 0) >= 1 },
    { id: 'levelUp', emoji: '⬆️', name: 'Звук на новом уровне', test: s => (s.progress.stats.levelUps || 0) >= 1 },
    { id: 'album1', emoji: '📒', name: 'Первая страница альбома', test: s => albumPagesDone(s) >= 1 },
    { id: 'album3', emoji: '📗', name: '3 страницы альбома', test: s => albumPagesDone(s) >= 3 },
    { id: 'albumAll', emoji: '📚', name: 'Весь альбом наклеек', test: s => albumPagesDone(s) >= data.STICKER_PAGES.length },
    { id: 'story5', emoji: '📖', name: '5 глав сказки', test: s => s.progress.story.unlocked >= 5 },
    { id: 'story10', emoji: '🗺️', name: '10 глав сказки', test: s => s.progress.story.unlocked >= 10 },
    { id: 'storyAll', emoji: '👸', name: 'Сказка до конца', test: s => s.progress.story.unlocked >= data.STORY.length },
    { id: 'petBig', emoji: '🌱', name: 'Питомец вырос большой', test: s => Object.values(s.progress.pets.growth || {}).some(n => n >= PET_STAGES[2].at) },
    { id: 'petChamp', emoji: '🏅', name: 'Питомец-чемпион', test: s => Object.values(s.progress.pets.growth || {}).some(n => n >= PET_STAGES[PET_STAGES.length - 1].at) }
  ];

  // Питомец растёт: за каждый день занятий с ним. Пороги — в днях.
  // scale — во сколько раз меньше «взрослого» размера: малыш вдвое меньше, чемпион крупнее всех.
  const PET_STAGES = [
    { at: 0, name: 'Малыш', icon: '🍼', scale: 0.55 },
    { at: 3, name: 'Подрос', icon: '🌱', scale: 0.7 },
    { at: 7, name: 'Большой', icon: '🌿', scale: 0.85 },
    { at: 12, name: 'Силач', icon: '💪', scale: 1 },
    { at: 20, name: 'Чемпион', icon: '🏆', scale: 1.12 }
  ];

  // Дружба с любимым героем: растёт за сыгранные с ним игры.
  const HERO_FRIEND = [
    { at: 0, name: 'Знакомые' },
    { at: 2, name: 'Приятели' },
    { at: 5, name: 'Друзья' },
    { at: 10, name: 'Лучшие друзья' },
    { at: 16, name: 'Неразлучные' }
  ];

  function heroFriend(state) {
    const games = Number(state.hero && state.hero.friendship) || 0;
    let index = 0;
    HERO_FRIEND.forEach((level, i) => { if (games >= level.at) index = i; });
    const next = HERO_FRIEND[index + 1] || null;
    return { index, level: HERO_FRIEND[index], games, next, toNext: next ? next.at - games : 0 };
  }

  // Сыграли игру с героем: дружба +1. Возвращает новый уровень, если он вырос.
  function addHeroFriendship(state) {
    if (!state.hero) return null;
    const before = heroFriend(state).index;
    state.hero.friendship = (Number(state.hero.friendship) || 0) + 1;
    const after = heroFriend(state);
    return after.index > before ? after : null;
  }

  // Наклейки: шанс редкости и звёзды за повтор (когда весь альбом собран).
  const STICKER_ODDS = { common: 0.65, rare: 0.25, gold: 0.10 };
  const STICKER_DUP_STARS = { common: 3, rare: 5, gold: 10 };
  const PAGE_BONUS_STARS = 10;

  function albumPagesDone(state) {
    const owned = (state.progress.album && state.progress.album.stickers) || {};
    return data.STICKER_PAGES.filter(page => data.STICKERS.filter(s => s.page === page.id).every(s => owned[s.id])).length;
  }

  function petStage(state, petId) {
    const days = Number(((state.progress.pets.growth || {})[petId || state.progress.pets.active])) || 0;
    let index = 0;
    PET_STAGES.forEach((stage, i) => { if (days >= stage.at) index = i; });
    const next = PET_STAGES[index + 1] || null;
    return { index, stage: PET_STAGES[index], days, next, toNext: next ? next.at - days : 0 };
  }

  // ─────────────────────────────────────────────────────────────
  // СОСТОЯНИЕ
  // ─────────────────────────────────────────────────────────────
  function emptyStats() {
    return { sounds: {}, words: {}, daily: {}, saidTotal: 0, momGoodTotal: 0, momSlipTotal: 0, mushrooms: 0, chests: 0, puzzlesDone: 0, levelUps: 0 };
  }

  function createDefaultState(name) {
    const pairs = {};
    for (const pair of data.PAIRS) pairs[pair.id] = pair.on;
    return {
      version: STATE_VERSION,
      profile: { name: String(name || '').trim() },
      hero: { name: '', hasImage: false, inSessions: true, friendship: 0 },
      settings: {
        length: 'normal',
        levels: clone(data.DEFAULT_LEVELS),
        pairs,
        ttsVoice: '',
        micEnabled: true,
        micSensitivity: 3,
        momKeys: true,
        lockCheck: true
      },
      exercises: clone(data.DEFAULT_EXERCISES),
      progress: {
        stars: 0,
        days: {},
        history: [],
        recent: { games: [], gym: [], content: [] },
        puzzle: { size: 16, pieces: 0, lastUnlockDate: '', title: '', complete: false, bonusWeeks: [], chestsOpened: [] },
        pendingChests: 0,
        letterCollection: { letters: {}, total: 0 },
        zoo: [],
        medals: {},
        treasures: {},
        pets: { owned: [], active: '', items: {}, wearing: { hat: '', glasses: '', toy: '', neck: '' }, bg: 'meadow', bgs: ['meadow'], growth: {}, decor: [], colors: {}, favKnown: {}, wish: '' },
        album: { stickers: {}, last: '' },
        story: { unlocked: 1, heard: 0, lastDate: '' }, // первая глава — приглашение в путешествие, доступна сразу
        stats: emptyStats(),
        levelSince: {}
      }
    };
  }

  // Любое старое состояние приводится к текущей схеме без потери прогресса.
  function normalizeState(input) {
    const base = createDefaultState('');
    if (!input || typeof input !== 'object') return base;
    const state = clone(input);
    state.version = STATE_VERSION;
    state.profile = Object.assign({ name: '' }, state.profile || {});
    state.hero = Object.assign({ name: '', hasImage: false, inSessions: true, friendship: 0 }, state.hero || {});
    state.hero.friendship = Math.max(0, Number(state.hero.friendship) || 0);
    const oldSettings = state.settings || {};
    const settings = Object.assign({}, base.settings, oldSettings);
    settings.levels = Object.assign({}, base.settings.levels, oldSettings.levels || {});
    if (!oldSettings.levels && oldSettings.enabledSounds) {
      // Версия 2: включённые звуки С/З/Ц считаем «слова», остальные — как по умолчанию.
      for (const sound of Object.keys(oldSettings.enabledSounds)) {
        if (oldSettings.enabledSounds[sound] && (settings.levels[sound] || 0) < 2 && ['с', 'з', 'ц'].includes(sound)) settings.levels[sound] = 2;
      }
    }
    settings.pairs = Object.assign({}, base.settings.pairs, oldSettings.enabledPairs || {}, oldSettings.pairs || {});
    if (!['short', 'normal', 'long'].includes(settings.length)) settings.length = 'normal';
    if (oldSettings.voice && !settings.ttsVoice) settings.ttsVoice = oldSettings.voice;
    delete settings.enabledSounds; delete settings.enabledPairs; delete settings.voice; delete settings.rate; delete settings.momReads;
    state.settings = settings;

    // Упражнения: встроенные берём в новой редакции, сохраняя включено/выключено и мамины настройки количества.
    const oldExercises = Array.isArray(state.exercises) ? state.exercises : [];
    const byId = new Map(oldExercises.map(item => [item.id, item]));
    const builtIn = data.DEFAULT_EXERCISES.map(def => {
      const old = byId.get(def.id);
      const next = clone(def);
      if (old) {
        if (typeof old.enabled === 'boolean') next.enabled = old.enabled;
        if (old.custom === true || old.edited === true) {
          if (Number(old.amount) > 0) next.amount = Number(old.amount);
          if (Number(old.hold) > 0) next.hold = Number(old.hold);
          if (Number(old.beat) > 0) next.beat = Number(old.beat);
          next.edited = true;
        }
      }
      if (def.fixed) next.enabled = true;
      if (def.variants) applyVariant(next, old && def.variants[old.variant] ? old.variant : def.variant);
      return next;
    });
    const custom = oldExercises.filter(item => !data.DEFAULT_EXERCISES.some(def => def.id === item.id)).map(item => Object.assign({
      custom: true, face: { mouth: 'open-smile', tongue: 'hidden' }, scene: 'stars', child: item.name, mom: item.instruction || ''
    }, item, { mode: item.mode === 'timer' ? 'hold' : (item.mode || 'hold') }));
    // Сохраняем мамин порядок встроенных упражнений, если он был.
    const order = oldExercises.map(item => item.id);
    builtIn.sort((a, b) => {
      const ia = order.indexOf(a.id); const ib = order.indexOf(b.id);
      if (a.fixed) return -1; if (b.fixed) return 1;
      if (ia === -1 && ib === -1) return 0; if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
    state.exercises = [...builtIn, ...custom];

    const p = Object.assign({}, base.progress, state.progress || {});
    p.stars = Number(p.stars) || 0;
    p.days = Object.assign({}, p.days || {});
    p.history = Array.isArray(p.history) ? p.history : [];
    const oldRecent = state.progress && state.progress.recent;
    p.recent = oldRecent && Array.isArray(oldRecent.games) ? oldRecent : {
      games: (state.progress && state.progress.recentGames) || [],
      gym: (state.progress && state.progress.recentGym) || [],
      content: (state.progress && state.progress.recentContent) || []
    };
    delete p.recentGames; delete p.recentGym; delete p.recentContent;
    p.puzzle = Object.assign({}, base.progress.puzzle, p.puzzle || {});
    if (![12, 16].includes(Number(p.puzzle.size))) p.puzzle.size = 16;
    p.puzzle.bonusWeeks = p.puzzle.bonusWeeks || [];
    p.puzzle.chestsOpened = p.puzzle.chestsOpened || [];
    p.pendingChests = Number(p.pendingChests) || 0;
    p.letterCollection = p.letterCollection || { letters: {}, total: 0 };
    p.letterCollection.letters = p.letterCollection.letters || {};
    p.zoo = Array.isArray(p.zoo) ? p.zoo : [];
    p.medals = p.medals || {};
    p.treasures = p.treasures || {};
    p.pets = Object.assign({}, base.progress.pets, p.pets || {});
    p.pets.wearing = Object.assign({}, base.progress.pets.wearing, p.pets.wearing || {});
    p.pets.items = p.pets.items || {};
    p.pets.bgs = p.pets.bgs && p.pets.bgs.length ? p.pets.bgs : ['meadow'];
    p.pets.growth = p.pets.growth && typeof p.pets.growth === 'object' ? p.pets.growth : {};
    p.pets.joy = p.pets.joy && typeof p.pets.joy === 'object' ? p.pets.joy : {};
    p.pets.decor = Array.isArray(p.pets.decor) ? p.pets.decor.filter(id => p.pets.items[id]).slice(0, DECOR_MAX) : [];
    p.pets.colors = p.pets.colors && typeof p.pets.colors === 'object' ? p.pets.colors : {};
    p.pets.favKnown = p.pets.favKnown && typeof p.pets.favKnown === 'object' ? p.pets.favKnown : {};
    p.pets.wish = typeof p.pets.wish === 'string' ? p.pets.wish : '';
    p.pets.seen = p.pets.seen && typeof p.pets.seen === 'object' ? p.pets.seen : {};
    p.album = Object.assign({}, base.progress.album, p.album || {});
    p.album.stickers = p.album.stickers && typeof p.album.stickers === 'object' ? p.album.stickers : {};
    p.story = Object.assign({}, base.progress.story, p.story || {});
    p.story.unlocked = Math.min(data.STORY.length, Math.max(1, Number(p.story.unlocked) || 0));
    p.story.heard = Math.min(p.story.unlocked, Number(p.story.heard) || 0);
    p.stats = Object.assign(emptyStats(), p.stats || {});
    p.levelSince = p.levelSince || {};
    delete p.gold; delete p.gymRecord;
    state.progress = p;
    return state;
  }

  function migrateLegacy(legacy) {
    const next = createDefaultState('');
    if (!legacy || typeof legacy !== 'object') return next;
    next.progress.stars = Number(legacy.stars) || 0;
    next.progress.days = Object.assign({}, legacy.days || {});
    next.progress.zoo = Array.isArray(legacy.zoo) ? legacy.zoo.slice() : [];
    const settings = legacy.settings || {};
    if (settings.len === 'short' || settings.len === 'normal') next.settings.length = settings.len;
    if (typeof settings.voice === 'string') next.settings.ttsVoice = settings.voice;
    return next;
  }

  // ─────────────────────────────────────────────────────────────
  // ВСПОМОГАТЕЛЬНОЕ
  // ─────────────────────────────────────────────────────────────
  function shuffled(items, rng) {
    const result = items.slice();
    const random = typeof rng === 'function' ? rng : Math.random;
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function freshFirst(items, recentIds, rng, idOf) {
    const recent = new Set(recentIds || []);
    const key = idOf || (item => item.id);
    return [...shuffled(items.filter(item => !recent.has(key(item))), rng), ...shuffled(items.filter(item => recent.has(key(item))), rng)];
  }

  function uniqueEmoji(words) {
    const seen = new Set();
    return words.filter(word => {
      if (seen.has(word.emoji)) return false;
      seen.add(word.emoji);
      return true;
    });
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseKey(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  }

  function weekKey(key) {
    const date = parseKey(key);
    const day = (date.getDay() + 6) % 7; // понедельник = 0
    const monday = new Date(date); monday.setDate(date.getDate() - day);
    return dateKey(monday);
  }

  function daysBetween(a, b) {
    return Math.round((parseKey(b) - parseKey(a)) / 86400000);
  }

  const levelOf = (state, sound) => {
    const value = state.settings.levels[sound];
    return Number.isFinite(value) ? value : 0;
  };

  // Звук можно произносить в словах: «говорит хорошо» или уровень «слова» и выше.
  const speakableSound = (state, sound) => { const l = levelOf(state, sound); return l === -1 || l >= 2; };

  function activeSounds(state) {
    return data.SOUND_ORDER.filter(sound => levelOf(state, sound) >= 1);
  }

  // Слово можно просить сказать, если все его отслеживаемые звуки ребёнку уже доступны.
  function isSpeakable(state, word, focus) {
    return word.targets.every(target => target.sound === focus ? levelOf(state, focus) >= 2 : speakableSound(state, target.sound));
  }

  function hasSound(word, sound) { return word.targets.some(target => target.sound === sound); }

  function targetWords(state, focus, source, forSpeaking) {
    return (source || data.WORDS).filter(word => hasSound(word, focus) && (!forSpeaking || isSpeakable(state, word, focus)));
  }

  function otherWords(state, focus, source, avoid) {
    return (source || data.WORDS).filter(word => !hasSound(word, focus) && (!avoid || !hasSound(word, avoid)) &&
      word.targets.every(target => speakableSound(state, target.sound)));
  }

  function activePairFor(state, focus) {
    const pairs = data.PAIRS.filter(pair => state.settings.pairs[pair.id] && (pair.a === focus || pair.b === focus));
    const usable = pairs.map(pair => (pair.a === focus ? pair.b : pair.a)).filter(other => speakableSound(state, other) || levelOf(state, other) >= 2);
    return usable[0] || null;
  }

  // ─────────────────────────────────────────────────────────────
  // ВЫБОР ЗВУКОВ ЗАНЯТИЯ
  // Основной — из звуков на уровне «слова/фразы», давно не тренированный.
  // Второй — из звуков «звук и слоги».
  // ─────────────────────────────────────────────────────────────
  function lastPracticed(state, sound) {
    const info = state.progress.stats.sounds[sound];
    return info && info.last ? info.last : '0000-00-00';
  }

  function chooseSounds(state) {
    const byRecency = list => list.slice().sort((a, b) => lastPracticed(state, a).localeCompare(lastPracticed(state, b)) || data.SOUND_ORDER.indexOf(a) - data.SOUND_ORDER.indexOf(b));
    const words = byRecency(data.SOUND_ORDER.filter(sound => levelOf(state, sound) >= 2));
    const syll = byRecency(data.SOUND_ORDER.filter(sound => levelOf(state, sound) === 1));
    const primary = words[0] || syll[0] || 'с';
    const secondary = syll.find(sound => sound !== primary) || words.find(sound => sound !== primary) || primary;
    return { primary, secondary };
  }

  // ─────────────────────────────────────────────────────────────
  // ГИМНАСТИКА
  // ─────────────────────────────────────────────────────────────
  // Вариант упражнения (как показывал логопед): меняет картинку, фразу ребёнку и подсказку маме.
  function applyVariant(ex, key) {
    if (!ex || !ex.variants || !ex.variants[key]) return ex;
    const v = ex.variants[key];
    ex.variant = key;
    ex.face = clone(v.face);
    ex.child = v.child;
    ex.mom = v.mom;
    return ex;
  }

  function selectGym(exercises, count, recentIds, rng) {
    const enabled = exercises.filter(item => item.enabled !== false);
    if (!enabled.length || count <= 0) return [];
    const fixed = enabled.find(item => item.fixed) || enabled[0];
    const rest = enabled.filter(item => item.id !== fixed.id);
    const chosen = [fixed, ...freshFirst(rest, recentIds, rng)].slice(0, Math.min(count, enabled.length));
    return chosen;
  }

  function mushroomHold(state) {
    const days = Object.keys(state.progress.days || {}).length;
    return Math.min(10, 5 + Math.floor(days / 4));
  }

  // ─────────────────────────────────────────────────────────────
  // СОДЕРЖИМОЕ ИГР
  // ─────────────────────────────────────────────────────────────
  function syllablesFor(sound, level, recent, rng) {
    const all = data.SYLLABLES.filter(item => item.sound === sound);
    const direct = all.filter(item => item.kind === 'direct');
    const harder = all.filter(item => item.kind !== 'direct');
    // На уровне «звук и слоги» сначала прямые слоги (СА, СО), потом немного обратных и между гласными.
    if (level >= 2) return freshFirst([...direct, ...harder], recent, rng);
    return [...freshFirst(direct, recent, rng), ...freshFirst(harder, recent, rng).slice(0, 3)];
  }

  // Слово с ошибкой героя: нужный звук заменяется на похожий (сова → шова / фова / това).
  const HERO_BLOCK = ['водка'];
  function heroMistake(word, sound) {
    const targets = (word && word.targets) || [];
    const target = targets.find(t => t.sound === sound) || targets[0];
    if (!target) return null;
    const swaps = data.HERO_SWAPS[target.sound];
    if (!swaps) return null;
    const text = word.text;
    const letter = target.sound[0];
    const soft = target.sound.length > 1;
    const softNext = ch => /[еёиюяь]/.test(ch || '');
    const positions = [];
    for (let i = 0; i < text.length; i += 1) if (text[i] === letter) positions.push(i);
    if (!positions.length) return null;
    const index = positions.find(i => softNext(text[i + 1]) === soft) ?? positions[0];
    let after = text.slice(index + 1);
    const options = swaps.filter(swap => swap[0] !== after[0] && swap[0] !== text[index - 1]);
    if (!options.length) return null;
    let hash = 0;
    for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
    let swap = options[hash % options.length];
    // Лишний мягкий знак: «ть» перед гласной, «й»/шипящий перед «ь».
    if (swap.endsWith('ь') && (/^[аеёиоуыэюя]/.test(after) || after.startsWith('ь'))) swap = swap.slice(0, -1);
    if (after.startsWith('ь') && /^[йшщжч]$/.test(swap)) after = after.slice(1);
    const wrong = text.slice(0, index) + swap + after;
    if (wrong === text || HERO_BLOCK.includes(wrong)) return null;
    return { text: wrong, swap, sound: target.sound };
  }

  function heroReady(state) { return Boolean(state.hero && state.hero.hasImage); }
  // Пары похожих слов, которые ребёнок уже знает на слух (хотя бы один звук пары занимаемся).
  function heroPairsFor(state) { return data.HERO_PAIRS.filter(pair => pair.sounds.some(sound => levelOf(state, sound) >= 1)); }

  function gamePayload(state, game, sound, rng, recent) {
    const level = levelOf(state, sound);
    const speakTargets = uniqueEmoji(freshFirst(targetWords(state, sound, null, true), recent, rng));
    const listenTargets = uniqueEmoji(freshFirst(targetWords(state, sound, null, false), recent, rng));
    const pairSound = activePairFor(state, sound);
    const others = uniqueEmoji(freshFirst(otherWords(state, sound, null, null), recent, rng));
    const pairWords = pairSound ? uniqueEmoji(freshFirst(targetWords(state, pairSound, null, true).filter(word => !hasSound(word, sound)), recent, rng)) : [];
    const noClash = (list, taken) => { const used = new Set(taken.map(w => w.emoji)); return list.filter(w => !used.has(w.emoji)); };
    const mixDistractors = (count, taken) => {
      const fromPair = noClash(pairWords, taken).slice(0, Math.ceil(count / 2));
      const rest = noClash(others.filter(w => !fromPair.includes(w)), [...taken, ...fromPair]).slice(0, count - fromPair.length);
      return [...fromPair, ...rest];
    };
    const syll = syllablesFor(sound, level, recent, rng);

    switch (game) {
      case 'soundCheck': {
        const targets = (level >= 2 ? speakTargets : listenTargets).slice(0, 5);
        const distract = mixDistractors(3, targets);
        return { sound, pairSound, items: shuffled([...targets.map(word => ({ word, answer: true })), ...distract.map(word => ({ word, answer: false }))], rng) };
      }
      case 'memoryPairs': {
        const chosen = speakTargets.slice(0, 5);
        return { sound, cards: shuffled(chosen.flatMap(word => [{ id: `${word.id}-a`, pair: word.id, word }, { id: `${word.id}-b`, pair: word.id, word }]), rng) };
      }
      case 'groupSort': {
        const a = speakTargets.filter(word => !pairSound || !hasSound(word, pairSound)).slice(0, 3);
        const b = pairSound ? noClash(pairWords, a).slice(0, 3) : noClash(others, a).slice(0, 3);
        return { sound, pairSound, items: shuffled([...a.map(word => ({ word, group: 'a' })), ...b.map(word => ({ word, group: 'b' }))], rng) };
      }
      case 'finishPhrase': {
        const phrases = freshFirst(data.PHRASES.filter(item => item.sound === sound && item.answer), recent, rng).slice(0, 3);
        const pool = uniqueEmoji(data.WORDS.filter(word => word.targets.length));
        return {
          sound,
          phrases: phrases.map(phrase => {
            const distract = shuffled(pool.filter(word => word.emoji !== phrase.answer.emoji && word.text !== phrase.answer.text), rng).slice(0, 2);
            return Object.assign({}, phrase, { options: shuffled([{ text: phrase.answer.text, emoji: phrase.answer.emoji, correct: true }, ...distract.map(word => ({ text: word.text, emoji: word.emoji, correct: false }))], rng) });
          })
        };
      }
      case 'repeatPhrase': {
        const phrases = freshFirst(data.PHRASES.filter(item => item.sound === sound), recent, rng).slice(0, 4);
        return { sound, phrases };
      }
      case 'parrot': {
        if (level >= 2 && speakTargets.length >= 4) return { sound, mode: 'words', items: speakTargets.slice(0, 5).map(word => ({ id: word.id, text: word.text, emoji: word.emoji, word })) };
        return { sound, mode: 'syll', items: syll.slice(0, 5).map(item => ({ id: item.id, text: item.text, syllable: item })) };
      }
      case 'conveyor':
      case 'balloons': {
        const targets = speakTargets.slice(0, 6);
        const distract = mixDistractors(6, targets);
        return { sound, pairSound, items: shuffled([...targets.map(word => ({ word, answer: true })), ...distract.map(word => ({ word, answer: false }))], rng) };
      }
      case 'soundPosition': {
        const single = speakTargets.filter(word => word.targets.filter(t => t.sound === sound).length === 1);
        const byPos = pos => single.filter(word => word.targets.find(t => t.sound === sound).position === pos);
        const picked = [];
        const buckets = [byPos('s'), byPos('m'), byPos('e')];
        for (let round = 0; picked.length < 5 && round < 5; round += 1) {
          for (const bucket of buckets) if (bucket[round] && picked.length < 5) picked.push(bucket[round]);
        }
        return { sound, items: shuffled(picked, rng).map(word => ({ word, position: word.targets.find(t => t.sound === sound).position })) };
      }
      case 'syllableBuilder': {
        const words = speakTargets.filter(word => data.SPLITS[word.text]).slice(0, 3);
        return { sound, items: words.map(word => ({ word, pieces: shuffled(data.SPLITS[word.text].map((text, index) => ({ id: `${word.id}-${index}`, text, order: index })), rng) })) };
      }
      case 'whackMole': {
        // 10 кротов по одному: 6 со звуком, 4 без. Первый — всегда со звуком, чтобы сразу было понятно.
        let mode = 'syll'; let items;
        if (level >= 2 && listenTargets.length >= 4) {
          mode = 'words';
          const targets = listenTargets.slice(0, 6);
          const distract = mixDistractors(4, targets);
          items = [...targets.map(word => ({ id: word.id, text: word.text, emoji: word.emoji, answer: true })), ...distract.map(word => ({ id: word.id, text: word.text, emoji: word.emoji, answer: false }))];
        } else {
          const other = data.SYLLABLES.filter(item => item.sound !== sound && item.kind === 'direct' && item.sound.length === 1 && !data.SOUNDS[item.sound].family.includes('сонор'));
          items = [...syll.slice(0, 6).map(item => ({ id: item.id, text: item.text, answer: true })), ...shuffled(other, rng).slice(0, 4).map(item => ({ id: item.id, text: item.text, answer: false }))];
        }
        const order = shuffled(items, rng);
        const first = order.findIndex(item => item.answer);
        if (first > 0) order.unshift(order.splice(first, 1)[0]);
        return { sound, mode, need: order.filter(item => item.answer).length, items: order };
      }
      case 'beads': {
        // Слова-бусинки: каждый раз на одну больше, говорим всю цепочку по порядку.
        return { sound, items: speakTargets.slice(0, level >= 3 ? 4 : 3) };
      }
      case 'feedPet': {
        return { sound, items: speakTargets.slice(0, 5) };
      }
      case 'wheel': {
        return { sound, items: speakTargets.slice(0, 8), spins: 4 };
      }
      case 'boxes': {
        const words = speakTargets.slice(0, 6).map(word => ({ type: 'word', word }));
        return { sound, boxes: shuffled([...words, { type: 'star' }, { type: 'mushroom' }], rng) };
      }
      case 'whatsMissing': {
        // Раунд 1: 5 картинок, ребёнок называет их сам. Раунд 2: 6 картинок, называет игра (запомнить на слух);
        // на уровне 3+ пропадают сразу две. Варианты ответа — только то, чего НЕТ на экране.
        const random = rng || Math.random;
        const pool = uniqueEmoji(speakTargets);
        const fillers = shuffled(uniqueEmoji(data.WORDS.filter(w => w.emoji && !pool.some(x => x.emoji === w.emoji))), random);
        const plan = [{ n: 5, miss: 1, say: true }, { n: 6, miss: level >= 3 ? 2 : 1, say: false }];
        const rounds = plan.map(pl => {
          const items = shuffled(pool, random).slice(0, pl.n);
          for (const w of fillers) { if (items.length >= pl.n) break; if (!items.some(x => x.emoji === w.emoji)) items.push(w); }
          const missing = shuffled(items.map((_, i) => i), random).slice(0, pl.miss);
          const onScreen = new Set(items.map(w => w.emoji));
          const notShown = uniqueEmoji(shuffled([...pool, ...fillers], random).filter(w => !onScreen.has(w.emoji)));
          const distract = notShown.slice(0, pl.miss > 1 ? 4 : 4);
          return { items, missing, say: pl.say, options: shuffled([...missing.map(i => items[i]), ...distract], random) };
        });
        return { sound, rounds };
      }
      case 'pictureReveal': {
        const target = listenTargets[0];
        const options = shuffled([target, ...noClash(others, [target]).slice(0, 2)], rng);
        return { sound, target, options, tiles: syll.slice(0, 6) };
      }
      case 'syllableTrain': {
        return { sound, wagons: syll.slice(0, 6) };
      }
      case 'hideSeek': {
        // Картинка-сцена: 4 предмета со звуком и 6 без него (часть — с парным звуком, чтобы слушать внимательно).
        const themes = [
          { id: 'meadow', name: 'Полянка', deco: ['🌳', '🌼', '🍄'] },
          { id: 'room', name: 'Комната', deco: ['🖼️', '🛏️', '🕰️'] },
          { id: 'sea', name: 'Морское дно', deco: ['🐠', '🌊', '🐚'] },
          { id: 'space', name: 'Космос', deco: ['🌙', '⭐', '🪐'] }
        ];
        const theme = themes[Math.floor((rng || Math.random)() * themes.length)];
        const targets = speakTargets.slice(0, 4);
        const distract = mixDistractors(6, targets);
        return { sound, theme, items: shuffled([...targets.map(word => ({ word, answer: true })), ...distract.map(word => ({ word, answer: false }))], rng) };
      }
      case 'heroTeach': {
        return { sound, items: speakTargets.filter(word => word.emoji || word.text).slice(0, 5) };
      }
      case 'heroOops': {
        const words = speakTargets.filter(word => heroMistake(word, sound)).slice(0, 6);
        const flags = shuffled(words.map((_, i) => i < Math.ceil(words.length / 2)), rng);
        return { sound, rounds: words.map((word, i) => { const m = heroMistake(word, sound); return { word, wrong: flags[i], mistake: m.text, mistakeSound: m.sound }; }) };
      }
      case 'heroHide': {
        // Три раунда пряток: герой прячется за одной из картинок, ребёнок называет картинки, пока не найдёт.
        const per = level >= 3 ? 4 : 3;
        const pool = speakTargets.slice(0, 12);
        const random = rng || Math.random;
        const rounds = [];
        for (let r = 0; r < 3 && pool.length >= per; r += 1) {
          const items = Array.from({ length: per }, (_, k) => pool[(r * per + k) % pool.length]);
          rounds.push({ items, hideAt: Math.floor(random() * per) });
        }
        return { sound, rounds };
      }
      case 'heroPairs': {
        // Похожие слова: сначала пары с нашим звуком, потом остальные. Герой говорит одно из двух.
        const random = rng || Math.random;
        const pairs = heroPairsFor(state);
        const mine = shuffled(pairs.filter(pair => pair.sounds.includes(sound)), rng);
        const rest = shuffled(pairs.filter(pair => !pair.sounds.includes(sound)), rng);
        const order = [...mine, ...rest];
        const rounds = [];
        for (let r = 0; r < 6 && order.length; r += 1) {
          const pair = order[r % order.length];
          const flip = random() < 0.5;
          rounds.push({ pair, say: flip ? 'b' : 'a', left: random() < 0.5 ? 'a' : 'b' });
        }
        return { sound, rounds };
      }
      case 'heroEcho': {
        return { sound, items: speakTargets.slice(0, 5) };
      }
      case 'heroBackpack': {
        const themes = ['hike', 'sea', 'space'];
        const theme = themes[Math.floor((rng || Math.random)() * themes.length)];
        const targets = speakTargets.slice(0, 4);
        const distract = mixDistractors(4, targets);
        return { sound, theme, items: shuffled([...targets.map(word => ({ word, answer: true })), ...distract.map(word => ({ word, answer: false }))], rng) };
      }
      default:
        return { sound };
    }
  }

  function gameIsPlayable(state, game, sound) {
    const level = levelOf(state, sound);
    const meta = GAMES[game];
    if (!meta || level < meta.min) return false;
    const speak = targetWords(state, sound, null, true).length;
    if (game === 'groupSort') return speak >= 3;
    if (game === 'finishPhrase') return data.PHRASES.filter(item => item.sound === sound && item.answer).length >= 2;
    if (game === 'repeatPhrase') return data.PHRASES.filter(item => item.sound === sound).length >= 3;
    if (game === 'syllableBuilder') return targetWords(state, sound, null, true).filter(word => data.SPLITS[word.text]).length >= 2;
    if (game === 'soundPosition') return speak >= 4;
    if (game === 'soundCheck' || game === 'whackMole' || game === 'pictureReveal' || game === 'syllableTrain' || game === 'parrot') return true;
    if (meta.hero) {
      if (!heroReady(state) || state.hero.inSessions === false) return false;
      if (game === 'heroOops') return targetWords(state, sound, null, true).filter(word => heroMistake(word, sound)).length >= 4;
      if (game === 'heroPairs') return heroPairsFor(state).some(pair => pair.sounds.includes(sound)) && heroPairsFor(state).length >= 3;
      return speak >= 4;
    }
    return speak >= 5;
  }

  function selectGames(state, sound, count, recentGames, rng, exclude) {
    const playable = GAME_TYPES.filter(game => gameIsPlayable(state, game, sound) && !(exclude || []).includes(game));
    const ordered = freshFirst(playable, recentGames, rng, id => id);
    const chosen = ordered.slice(0, count);
    // Хотя бы одна игра, где нужно говорить.
    if (chosen.length && !chosen.some(game => GAMES[game].speak)) {
      const speaking = ordered.find(game => GAMES[game].speak && !chosen.includes(game));
      if (speaking) chosen[chosen.length - 1] = speaking;
    }
    return chosen;
  }

  function funPayload(state, rng, recent, force) {
    const type = force || (state.progress.history.length % 2 === 0 ? 'poem' : 'riddle');
    if (type === 'poem') {
      const poems = freshFirst(data.POEMS, recent, rng);
      return poems.length ? { kind: 'fun', type: 'poem', poem: poems[0] } : null;
    }
    const riddles = freshFirst(data.RIDDLES, recent, rng).slice(0, force ? 1 : 2).map(riddle => riddlePayload(state, riddle, rng));
    return { kind: 'fun', type: 'riddle', riddles };
  }

  // ── Загадки: уровень сложности ──
  // easy — 4 картинки (одна похожая), medium — 6 картинок, половина из той же группы (животные к животным),
  // hard — отгадку собрать из слогов (+2 лишних), картинка открывается в конце.
  function riddleLevel(state) {
    const set = state.settings.riddleLevel;
    if (set === 'easy' || set === 'medium' || set === 'hard') return set;
    const solved = Number(state.progress.riddleSolved) || 0;
    if (solved < 6) return 'easy';
    if (solved < 16) return 'medium';
    return 'mixed';
  }
  const VOWELS_RU = 'аеёиоуыэюя';
  // Деление на слоги для чтения: «со-ба-ка», «мор-ковь», «яй-цо», «о-бе-зья-на».
  function splitSyllables(word) {
    if (data.SPLITS[word]) return data.SPLITS[word].slice();
    const w = String(word);
    const lower = w.toLowerCase();
    const vowels = [];
    for (let i = 0; i < lower.length; i += 1) if (VOWELS_RU.includes(lower[i])) vowels.push(i);
    if (vowels.length < 2) return [w];
    const cuts = [];
    for (let k = 0; k < vowels.length - 1; k += 1) {
      const a = vowels[k]; const cons = lower.slice(a + 1, vowels[k + 1]);
      let cut = a + 1;
      if (cons[0] === 'й') cut = a + 2;
      else if (cons.length >= 2 && !/^[^ьъ][ьъ]$/.test(cons)) {
        if ('ьъ'.includes(cons[1])) cut = a + 3;
        else if ('рлмн'.includes(cons[0]) && 'рлмн'.includes(cons[1]) && cons.length >= 3) cut = a + 3;
        else cut = a + 2;
      }
      cuts.push(cut);
    }
    const parts = [];
    let from = 0;
    for (const c of cuts) { parts.push(w.slice(from, c)); from = c; }
    parts.push(w.slice(from));
    return parts.filter(Boolean);
  }
  function groupOf(text) {
    const entry = Object.entries(data.WORD_GROUPS || {}).find(([, list]) => list.split(' ').includes(text));
    return entry ? entry[0] : '';
  }
  function riddlePayload(state, riddle, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const word = data.WORDS.find(item => item.text === riddle.answer);
    let level = riddleLevel(state);
    if (level === 'mixed') level = random() < 0.5 ? 'hard' : 'medium';
    const syllables = splitSyllables(word.text);
    if (level === 'hard' && syllables.length < 2) level = 'medium';
    const cat = riddle.cat || groupOf(word.text);
    const sameGroup = uniqueEmoji(data.WORDS.filter(item => item.emoji && item.text !== word.text && item.emoji !== word.emoji && groupOf(item.text) === cat));
    const other = uniqueEmoji(data.WORDS.filter(item => item.emoji && item.emoji !== word.emoji && groupOf(item.text) !== cat));
    const pick = (list, n, exclude) => shuffled(list.filter(item => !exclude.some(x => x.emoji === item.emoji)), random).slice(0, n);
    const out = Object.assign({}, riddle, { word, mode: level === 'hard' ? 'build' : 'pick', level });
    if (level === 'hard') {
      const pool = Array.from(new Set(Object.values(data.SPLITS).flat().filter(x => !syllables.includes(x) && x.length <= 3)));
      const extra = shuffled(pool, random).slice(0, 2);
      out.syllables = syllables;
      out.tiles = shuffled([...syllables.map((text, i) => ({ text, order: i })), ...extra.map(text => ({ text, order: -1 }))], random);
      out.options = [];
      return out;
    }
    const near = pick(sameGroup, level === 'easy' ? 1 : 3, [word]);
    const rest = pick(other, (level === 'easy' ? 4 : 6) - 1 - near.length, [word, ...near]);
    out.options = shuffled([word, ...near, ...rest], random);
    return out;
  }

  // Слова и фразы, которые реально прозвучали в занятии (чтобы завтра были другие).
  function sessionContentIds(steps) {
    const contentIds = [];
    const add = id => { if (id && !contentIds.includes(id)) contentIds.push(id); };
    for (const step of steps) {
      if (step.kind === 'game' && step.payload) {
        const p = step.payload;
        (p.items || []).forEach(item => add(item.word ? item.word.id : item.id));
        (p.cards || []).forEach(item => add(item.pair));
        (p.phrases || []).forEach(item => add(item.id));
        (p.boxes || []).forEach(item => item.word && add(item.word.id));
        (p.rounds || []).forEach(round => { (round.items || []).forEach(item => add(item.id)); if (round.word) add(round.word.id); });
        (p.wagons || []).forEach(item => add(item.id));
        if (p.target) add(p.target.id);
      }
    }
    for (const step of steps) {
      if (step.kind !== 'fun') continue;
      if (step.type === 'poem') add(step.poem.id);
      if (step.type === 'riddle') step.riddles.forEach(item => add(item.id));
    }
    return contentIds;
  }

  // Выбор игры: к игре основного звука добавляем вторую на выбор (того же типа — говорим/слушаем).
  function addChoices(state, steps, primary, rng, recentContent, recentGames) {
    const used = steps.filter(step => step.kind === 'game').map(step => step.game);
    const pool = GAME_TYPES.filter(game => gameIsPlayable(state, game, primary) && !used.includes(game));
    const ordered = freshFirst(pool, recentGames, rng, id => id);
    // Любимый герой (если мама добавила картинку) — первым кандидатом на выбор.
    const heroFirst = ordered.filter(game => GAMES[game].hero);
    if (heroFirst.length) {
      const pick = heroFirst[Math.floor((rng || Math.random)() * heroFirst.length)];
      ordered.splice(ordered.indexOf(pick), 1);
      ordered.unshift(pick);
    }
    for (const step of steps) {
      if (step.kind !== 'game' || step.sound !== primary) continue;
      const speak = GAMES[step.game].speak;
      let index = ordered.findIndex(game => GAMES[game].speak === speak);
      if (index < 0 && !speak) index = ordered.findIndex(() => true);
      if (index < 0) continue;
      const game = ordered.splice(index, 1)[0];
      step.alt = { game, payload: gamePayload(state, game, primary, rng, recentContent) };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ЗАНЯТИЕ
  // ─────────────────────────────────────────────────────────────
  // ── Темы дня: занятие каждый день немного другое (через день — обычное, чтобы было привычно) ──
  const DAY_THEMES = {
    normal: { title: 'Обычный день', icon: '☀️' },
    tale:   { title: 'Сказочный день', icon: '📖', note: 'гимнастика-сказка' },
    games:  { title: 'День игр', icon: '🎲', note: 'игр больше' },
    mixed:  { title: 'Вперемешку', icon: '🔀', note: 'разминка между играми' },
    mic:    { title: 'Звуковой день', icon: '🎤', note: 'больше игр с микрофоном' }
  };
  const THEME_CYCLE = ['tale', 'normal', 'games', 'normal', 'mixed', 'normal', 'mic', 'normal'];
  function dayTheme(state, date) {
    if (state.settings.dayThemes === false) return 'normal';
    if ((state.progress.history || []).length < 2) return 'normal';
    const day = Math.floor(new Date(dateKey(date) + 'T12:00:00').getTime() / 86400000);
    return THEME_CYCLE[((day % THEME_CYCLE.length) + THEME_CYCLE.length) % THEME_CYCLE.length];
  }

  function buildSession(state, date, rng, opts) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const key = dateKey(date);
    const theme = (opts && opts.theme) || dayTheme(state, date);
    const base = LENGTHS[state.settings.length] || LENGTHS.normal;
    const plan = theme === 'games' ? Object.assign({}, base, { gym: Math.max(3, base.gym - 1), games: base.games + 1 }) : base;
    const { primary, secondary } = chooseSounds(state);
    const recentContent = state.progress.recent.content || [];
    const recentGames = state.progress.recent.games || [];
    const hold = mushroomHold(state);
    const gym = selectGym(state.exercises, plan.gym, state.progress.recent.gym, random).map(exercise => {
      const copy = clone(exercise);
      if (copy.id === 'mushroom' && !copy.edited) copy.hold = hold;
      return copy;
    });
    // Сказочный день: упражнения по порядку истории.
    if (theme === 'tale') {
      const order = data.GYM_TALE_ORDER || [];
      const rank = ex => (ex.fixed ? -1 : (order.indexOf(ex.id) === -1 ? 99 : order.indexOf(ex.id)));
      gym.sort((a, b) => rank(a) - rank(b));
    }

    const gameSounds = [];
    for (let index = 0; index < plan.games; index += 1) {
      // Второй звук получает одну игру (в середине), остальные — основной.
      gameSounds.push(index === 1 && secondary !== primary ? secondary : primary);
    }
    const primaryCount = gameSounds.filter(s => s === primary).length;
    const primaryGames = selectGames(state, primary, primaryCount, recentGames, random);
    const secondaryGames = secondary !== primary ? selectGames(state, secondary, gameSounds.length - primaryCount, recentGames, random, primaryGames) : [];
    const games = [];
    let pi = 0; let si = 0;
    for (const sound of gameSounds) {
      const game = sound === primary ? primaryGames[pi++] : secondaryGames[si++];
      if (game) games.push({ game, sound });
    }

    const steps = gym.map((exercise, i) => (theme === 'tale' && data.GYM_TALE && data.GYM_TALE[exercise.id]
      ? { kind: 'gym', exercise, tale: true, taleIndex: i, taleLast: i === gym.length - 1 }
      : { kind: 'gym', exercise }));
    // Иногда перед упражнением — «Угадай упражнение» (по лицу), не чаще одного раза за занятие.
    const quizable = steps.filter(st => !st.exercise.fixed && !st.exercise.custom && data.DEFAULT_EXERCISES.some(d => d.id === st.exercise.id));
    if (quizable.length && random() < 0.4) {
      const target = quizable[Math.floor(random() * quizable.length)];
      const pool = state.exercises.filter(e => e.id !== target.exercise.id && !e.custom && data.DEFAULT_EXERCISES.some(d => d.id === e.id) && e.enabled !== false);
      const others = shuffled(pool, random).slice(0, 2);
      if (others.length === 2) target.quiz = shuffled([target.exercise, ...others], random).map(e => ({ id: e.id, name: e.name, emoji: e.emoji }));
    }
    steps.push({ kind: 'position', sound: primary });
    // Микрофонная игра: иногда — «Праздник звуков» (несколько звуков по очереди).
    if (partyEligible(state) && random() < 0.45) steps.push({ kind: 'mic', sound: primary, game: 'party', plan: partyPlan(state, primary, random) });
    else steps.push({ kind: 'mic', sound: primary, game: data.SOUNDS[primary].micGame });
    // «Проверка замка» — после случайной игры, но не после последней.
    const lockAfterGame = state.settings.lockCheck === false || !games.length ? 0
      : (games.length > 1 ? 1 + Math.floor(random() * (games.length - 1)) : 1);
    let secondaryShown = false;
    games.forEach((item, index) => {
      // Перед игрой на второй звук — короткая подсказка, где должен быть язык (если это другая группа звуков).
      if (item.sound !== primary && !secondaryShown && data.SOUNDS[item.sound].articulation !== data.SOUNDS[primary].articulation) {
        steps.push({ kind: 'position', sound: item.sound, short: true });
        secondaryShown = true;
      }
      // Звук уровня «слоги» иногда получает микрофонную игру: отдельный звук — его главная тренировка.
      const micGame = data.SOUNDS[item.sound].micGame;
      if (item.sound !== primary && levelOf(state, item.sound) === 1 && micGame !== data.SOUNDS[primary].micGame && random() < 0.4) {
        steps.push({ kind: 'mic', sound: item.sound, game: micGame });
      } else {
        steps.push({ kind: 'game', game: item.game, sound: item.sound, payload: gamePayload(state, item.game, item.sound, random, recentContent) });
      }
      if (index + 1 === lockAfterGame) steps.push({ kind: 'lock', hold: 10 });
    });

    // Звуковой день: ещё одна микрофонная игра посередине (лучше — «Праздник звуков»).
    if (theme === 'mic') {
      const at = steps.findIndex((st, i) => i > 0 && st.kind === 'game' && steps.slice(0, i).filter(x => x.kind === 'game').length >= 1);
      const extra = partyEligible(state) && !steps.some(st => st.game === 'party')
        ? { kind: 'mic', sound: primary, game: 'party', plan: partyPlan(state, primary, random) }
        : { kind: 'mic', sound: secondary, game: data.SOUNDS[secondary].micGame };
      steps.splice(at > 0 ? at + 1 : steps.length, 0, extra);
    }
    // Вперемешку: Грибочек и ещё одно упражнение — в начале, остальные — между играми.
    if (theme === 'mixed') {
      const gymSteps = steps.filter(st => st.kind === 'gym');
      const later = gymSteps.slice(2);
      if (later.length) {
        later.forEach(st => steps.splice(steps.indexOf(st), 1));
        const gameIdx = steps.map((st, i) => (st.kind === 'game' ? i : -1)).filter(i => i >= 0);
        // Вставляем с конца, чтобы индексы не сдвигались.
        const spots = gameIdx.slice(0, later.length);
        for (let k = spots.length - 1; k >= 0; k -= 1) steps.splice(spots[k] + 1, 0, Object.assign({}, later[k], { between: true }));
        later.slice(spots.length).forEach(st => steps.push(st));
      }
    }

    if (state.settings.choice !== false) addChoices(state, steps, primary, random, recentContent, recentGames);

    // Весёлая минутка: загадки или стишок-повторялка (по очереди).
    const fun = funPayload(state, random, recentContent, plan === LENGTHS.short ? 'riddle' : null);
    if (fun) steps.push(fun);
    // В конце — спокойное дыхание носом с закрытыми губами и языком «в домике» (план логопеда).
    if (state.settings.breath !== false) steps.push({ kind: 'breath', breaths: 5 });

    const contentIds = sessionContentIds(steps);
    return {
      id: `${key}-${Date.now()}`,
      date: key,
      theme,
      primary,
      secondary,
      steps,
      gymIds: gym.map(item => item.id),
      gameIds: steps.filter(step => step.kind === 'game').map(step => step.game),
      contentIds
    };
  }

  // ─────────────────────────────────────────────────────────────
  // СТАТИСТИКА
  // ─────────────────────────────────────────────────────────────
  function addStats(stats, summary, date) {
    const next = stats;
    for (const [sound, info] of Object.entries(summary.sounds || {})) {
      const current = next.sounds[sound] || { said: 0, good: 0, slip: 0, micSec: 0, sessions: 0, last: '' };
      current.said += info.said || 0;
      current.good += info.good || 0;
      current.slip += info.slip || 0;
      current.micSec += Math.round(info.micSec || 0);
      current.sessions += 1;
      current.last = date;
      next.sounds[sound] = current;
    }
    for (const [text, info] of Object.entries(summary.words || {})) {
      const current = next.words[text] || { said: 0, good: 0, slip: 0, last: '', sound: info.sound || '' };
      current.said += info.said || 0;
      current.good += info.good || 0;
      current.slip += info.slip || 0;
      current.last = date;
      if (info.sound) current.sound = info.sound;
      next.words[text] = current;
    }
    const day = next.daily[date] || { minutes: 0, said: 0, good: 0, slip: 0, sessions: 0 };
    day.minutes += Math.round((summary.seconds || 0) / 60);
    day.said += summary.said || 0;
    day.good += summary.good || 0;
    day.slip += summary.slip || 0;
    day.sessions += 1;
    next.daily[date] = day;
    next.saidTotal += summary.said || 0;
    next.momGoodTotal += summary.good || 0;
    next.momSlipTotal += summary.slip || 0;
    next.mushrooms += summary.mushrooms || 0;
    return next;
  }

  function newMedals(state, date) {
    const earned = [];
    for (const medal of MEDALS) {
      if (state.progress.medals[medal.id]) continue;
      let ok = false;
      try { ok = medal.test(state); } catch (error) { ok = false; }
      if (ok) { state.progress.medals[medal.id] = date; earned.push(medal); }
    }
    return earned;
  }

  // ─────────────────────────────────────────────────────────────
  // НАКЛЕЙКИ: альбом заполняется по страницам — так видно, сколько осталось до целой страницы.
  // ─────────────────────────────────────────────────────────────
  function drawSticker(p, rng, date) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const owned = p.album.stickers;
    const roll = random();
    const rarity = roll < STICKER_ODDS.common ? 'common' : roll < STICKER_ODDS.common + STICKER_ODDS.rare ? 'rare' : 'gold';
    const page = data.STICKER_PAGES.find(item => data.STICKERS.some(s => s.page === item.id && !owned[s.id]));
    let sticker; let isNew = true;
    if (page) {
      const open = data.STICKERS.filter(s => s.page === page.id && !owned[s.id]);
      const same = open.filter(s => s.rarity === rarity);
      // Золотая не выпадает первой на странице — её приятнее ждать.
      const pool = same.length && !(rarity === 'gold' && open.length === 6) ? same : open.filter(s => s.rarity !== 'gold' || open.length === 1);
      const list = pool.length ? pool : open;
      sticker = list[Math.floor(random() * list.length)];
    } else {
      const list = data.STICKERS.filter(s => s.rarity === rarity);
      sticker = list[Math.floor(random() * list.length)];
      isNew = false;
    }
    owned[sticker.id] = (Number(owned[sticker.id]) || 0) + 1;
    if (date) p.album.last = date;
    let stars = 0;
    if (!isNew) stars += STICKER_DUP_STARS[sticker.rarity];
    const pageInfo = data.STICKER_PAGES.find(item => item.id === sticker.page);
    const pageItems = data.STICKERS.filter(s => s.page === sticker.page);
    const pageDone = isNew && pageItems.every(s => owned[s.id]);
    if (pageDone) stars += PAGE_BONUS_STARS;
    p.stars += stars;
    return {
      sticker, isNew, stars, pageDone,
      page: pageInfo,
      pageOwned: pageItems.filter(s => owned[s.id]).length,
      pageSize: pageItems.length
    };
  }

  // ─────────────────────────────────────────────────────────────
  // ЗАВЕРШЕНИЕ ЗАНЯТИЯ: звёзды, деталь пазла, бонус недели, сундуки, медали
  // ─────────────────────────────────────────────────────────────
  function completeSession(state, summary, date, rng) {
    const next = normalizeState(state);
    const p = next.progress;
    const stars = Number(summary.stars) || 0;
    const firstToday = !p.days[date];
    p.stars += stars;
    p.days[date] = true;
    p.recent.gym = (summary.gymIds || []).slice();
    p.recent.games = [...(summary.gameIds || []), ...(p.recent.games || [])].slice(0, 8);
    p.recent.content = [...(summary.contentIds || []), ...(p.recent.content || [])].slice(0, 80);
    addStats(p.stats, summary, date);
    p.history.push({
      date,
      stars,
      minutes: Math.max(1, Math.round((summary.seconds || 0) / 60)),
      sounds: (summary.soundsList || []).slice(),
      gymIds: (summary.gymIds || []).slice(),
      gameIds: (summary.gameIds || []).slice(),
      said: summary.said || 0,
      good: summary.good || 0,
      slip: summary.slip || 0
    });

    const primary = (summary.soundsList || [])[0];
    if (primary) {
      p.letterCollection.letters[primary] = (Number(p.letterCollection.letters[primary]) || 0) + 1;
      p.letterCollection.total = (Number(p.letterCollection.total) || 0) + 1;
    }

    const puzzle = p.puzzle;
    let unlocked = 0;
    let bonusPiece = false;
    const before = puzzle.pieces;
    if (puzzle.lastUnlockDate !== date && puzzle.pieces < puzzle.size) {
      puzzle.pieces += 1;
      puzzle.lastUnlockDate = date;
      unlocked += 1;
    }
    const week = weekKey(date);
    const daysThisWeek = Object.keys(p.days).filter(day => p.days[day] && weekKey(day) === week).length;
    if (daysThisWeek >= 5 && !puzzle.bonusWeeks.includes(week)) {
      puzzle.bonusWeeks.push(week);
      bonusPiece = true;
      if (puzzle.pieces < puzzle.size) { puzzle.pieces += 1; unlocked += 1; }
    }
    let chests = 0;
    for (let piece = before + 1; piece <= puzzle.pieces; piece += 1) {
      if (piece % 4 === 0 && piece < puzzle.size && !puzzle.chestsOpened.includes(piece)) {
        puzzle.chestsOpened.push(piece);
        chests += 1;
      }
    }
    p.pendingChests += chests;
    const justCompleted = !puzzle.complete && puzzle.pieces >= puzzle.size;
    puzzle.complete = puzzle.pieces >= puzzle.size;
    if (justCompleted) p.stats.puzzlesDone = (p.stats.puzzlesDone || 0) + 1;

    // Первое занятие дня: наклейка, новая глава сказки, питомец подрастает.
    let sticker = null; let storyChapter = null; let petGrew = null; const petsUp = [];
    if (firstToday) {
      sticker = drawSticker(p, rng, date);
      if (p.story.unlocked < data.STORY.length && p.story.lastDate !== date) {
        p.story.unlocked += 1;
        p.story.lastDate = date;
        storyChapter = data.STORY[p.story.unlocked - 1];
      }
      // Все питомцы растут вместе: день занятий — шаг для каждого (так понятнее, чем «только выбранный»).
      const active = p.pets.active;
      for (const id of p.pets.owned) {
        const before = petStage(next, id).index;
        p.pets.growth[id] = (Number(p.pets.growth[id]) || 0) + 1;
        const after = petStage(next, id);
        if (after.index > before) {
          petsUp.push({ pet: id, stage: after.stage, index: after.index });
          if (id === active || !petGrew) petGrew = { pet: id, stage: after.stage, index: after.index };
        }
      }
    }
    // Довольный питомец (4–5 сердечек) дарит звёзды за занятие.
    let petBonus = 0;
    if (p.pets.active && petJoy(next, p.pets.active, date) >= 4) { petBonus = 3; p.stars += petBonus; }
    const medals = newMedals(next, date);
    return {
      state: next,
      firstToday,
      sticker,
      storyChapter,
      petGrew,
      petsUp,
      petBonus,
      unlockedPieces: unlocked,
      unlockedPiece: unlocked > 0,
      bonusPiece,
      chests,
      puzzleComplete: justCompleted,
      medals,
      letterReward: primary ? { sound: primary, count: p.letterCollection.letters[primary] } : null
    };
  }

  // ─────────────────────────────────────────────────────────────
  // СУНДУК, МАГАЗИН, ПИТОМЦЫ
  // ─────────────────────────────────────────────────────────────
  function openChest(state, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const next = normalizeState(state);
    const p = next.progress;
    if (p.pendingChests <= 0) return { state: next, reward: null };
    p.pendingChests -= 1;
    p.stats.chests = (p.stats.chests || 0) + 1;
    const treasure = TREASURES[Math.floor(random() * TREASURES.length)];
    p.treasures[treasure.id] = (p.treasures[treasure.id] || 0) + 1;
    const roll = random();
    let reward;
    const cheapPets = PETS.filter(pet => pet.price > 0 && pet.price <= 60 && !p.pets.owned.includes(pet.id));
    const wearables = ITEMS.filter(item => item.slot !== 'food' && !p.pets.items[item.id]);
    if (roll < 0.25 && cheapPets.length) {
      const pet = cheapPets[Math.floor(random() * cheapPets.length)];
      p.pets.owned.push(pet.id);
      reward = { type: 'pet', pet };
    } else if (roll < 0.6 && wearables.length) {
      const item = wearables[Math.floor(random() * wearables.length)];
      p.pets.items[item.id] = 1;
      if (item.slot === 'decor' && p.pets.decor.length < DECOR_MAX) p.pets.decor.push(item.id);
      reward = { type: 'item', item };
    } else {
      const amount = 15 + Math.floor(random() * 4) * 5;
      p.stars += amount;
      reward = { type: 'stars', amount };
    }
    reward.treasure = treasure;
    // В каждом сундуке ещё и наклейка.
    reward.sticker = drawSticker(p, random, '');
    const medals = newMedals(next, dateKey(new Date()));
    return { state: next, reward, medals };
  }

  function findShopEntry(id) {
    const pet = PETS.find(item => item.id === id);
    if (pet) return { kind: 'pet', entry: pet };
    const item = ITEMS.find(entry => entry.id === id);
    if (item) return { kind: 'item', entry: item };
    const bg = BACKGROUNDS.find(entry => entry.id === id);
    if (bg) return { kind: 'bg', entry: bg };
    return null;
  }

  function buy(state, id) {
    const next = normalizeState(state);
    const found = findShopEntry(id);
    if (!found) return { ok: false, reason: 'unknown', state: next };
    const { kind, entry } = found;
    const pets = next.progress.pets;
    if (kind === 'pet' && pets.owned.includes(id)) return { ok: false, reason: 'owned', state: next };
    if (kind === 'bg' && pets.bgs.includes(id)) return { ok: false, reason: 'owned', state: next };
    if (kind === 'item' && entry.slot !== 'food' && pets.items[id]) return { ok: false, reason: 'owned', state: next };
    if (next.progress.stars < entry.price) return { ok: false, reason: 'stars', state: next };
    next.progress.stars -= entry.price;
    if (kind === 'pet') { pets.owned.push(id); if (!pets.active) pets.active = id; }
    if (kind === 'bg') { pets.bgs.push(id); pets.bg = id; }
    if (kind === 'item') {
      pets.items[id] = (pets.items[id] || 0) + 1;
      if (entry.slot === 'decor') { if (!pets.decor.includes(id)) pets.decor = [...pets.decor, id].slice(-DECOR_MAX); }
      else if (entry.slot === 'paint') { if (pets.active) pets.colors[pets.active] = id; }
      else if (entry.slot !== 'food') pets.wearing[entry.slot] = id;
    }
    if (pets.wish === id) pets.wish = '';
    const medals = newMedals(next, dateKey(new Date()));
    return { ok: true, state: next, kind, entry, medals };
  }

  function adoptFirstPet(state) {
    const next = normalizeState(state);
    if (!next.progress.pets.owned.includes('yazychok')) next.progress.pets.owned.unshift('yazychok');
    if (!next.progress.pets.active) next.progress.pets.active = 'yazychok';
    return next;
  }

  // Настроение питомца: 0–5 сердечек. Еда +2, игра/купание/сон +1 (каждое — раз в день),
  // каждый день без заботы — минус одно сердечко.
  const JOY_MAX = 5;
  function petJoy(state, petId, today) {
    const rec = ((state.progress.pets.joy || {})[petId]) || null;
    if (!rec) return 2;
    const v = Number(rec.v) || 0;
    const lost = today && rec.date ? Math.max(0, daysBetween(rec.date, today)) : 0;
    return Math.max(0, Math.min(JOY_MAX, v - lost));
  }
  function addPetJoy(state, petId, amount, today, action) {
    const pets = state.progress.pets;
    pets.joy = pets.joy || {};
    const rec = pets.joy[petId] || { v: 2, date: today, done: [] };
    const doneToday = rec.date === today ? (rec.done || []) : [];
    if (action && doneToday.includes(action)) return { added: 0, joy: petJoy(state, petId, today) };
    const before = petJoy(state, petId, today);
    const after = Math.min(JOY_MAX, before + amount);
    pets.joy[petId] = { v: after, date: today, done: action ? [...doneToday, action] : doneToday };
    return { added: after - before, joy: after };
  }

  function feedPet(state, itemId, today) {
    const next = normalizeState(state);
    const items = next.progress.pets.items;
    if (!items[itemId]) return { ok: false, state: next };
    items[itemId] -= 1;
    if (items[itemId] <= 0) delete items[itemId];
    const activeId = next.progress.pets.active;
    const pet = PETS.find(item => item.id === activeId);
    // Любимая еда: +3 сердечка и радость; запоминаем, что её уже угадали.
    const fav = Boolean(pet && pet.fav === itemId);
    if (fav) next.progress.pets.favKnown[activeId] = true;
    const joy = activeId ? addPetJoy(next, activeId, fav ? 3 : 2, today || dateKey(new Date())) : null;
    return { ok: true, state: next, joy, fav };
  }

  // ─────────────────────────────────────────────────────────────
  // ПОДСКАЗКИ МАМЕ
  // ─────────────────────────────────────────────────────────────
  function levelSuggestions(state, today) {
    const result = [];
    for (const sound of data.SOUND_ORDER) {
      const level = levelOf(state, sound);
      if (level < 1 || level >= 3) continue;
      const info = state.progress.stats.sounds[sound];
      if (!info) continue;
      const since = state.progress.levelSince[sound] || '0000-00-00';
      const sessionsAtLevel = state.progress.history.filter(item => item.date >= since && (item.sounds || []).includes(sound)).length;
      const rated = info.good + info.slip;
      const goodShare = rated ? info.good / rated : 0;
      if (sessionsAtLevel >= 6 && rated >= 15 && goodShare >= 0.75) {
        result.push({ sound, from: level, to: level + 1, goodShare: Math.round(goodShare * 100), sessions: sessionsAtLevel });
      }
    }
    return result;
  }

  function staleSounds(state, today, days) {
    const limit = Number.isFinite(days) ? days : 5;
    return activeSounds(state).map(sound => {
      const last = lastPracticed(state, sound);
      const gap = last === '0000-00-00' ? null : daysBetween(last, today);
      return { sound, last, gap };
    }).filter(item => item.gap === null || item.gap >= limit);
  }

  function hardWords(state, limit) {
    return Object.entries(state.progress.stats.words)
      .map(([text, info]) => ({ text, ...info, share: info.good + info.slip ? info.slip / (info.good + info.slip) : 0 }))
      .filter(item => item.slip >= 2)
      .sort((a, b) => b.share - a.share || b.slip - a.slip)
      .slice(0, limit || 10);
  }

  function neverSaid(state, sound) {
    return targetWords(state, sound, null, true).filter(word => !state.progress.stats.words[word.text]).map(word => word.text);
  }

  // ─────────────────────────────────────────────────────────────
  // РЕЗЕРВНАЯ КОПИЯ: объединение
  // ─────────────────────────────────────────────────────────────
  function mergeState(currentInput, incomingInput) {
    const current = normalizeState(currentInput);
    const incoming = normalizeState(incomingInput);
    const merged = clone(current);
    const p = merged.progress;
    const q = incoming.progress;
    p.days = Object.assign({}, q.days, current.progress.days);
    const seen = new Set();
    p.history = [...q.history, ...current.progress.history].filter(item => {
      const key = JSON.stringify([item.date, item.gymIds, item.gameIds, item.stars]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    p.stars = Math.max(current.progress.stars, q.stars);
    p.puzzle.pieces = Math.max(current.progress.puzzle.pieces, q.puzzle.pieces);
    p.puzzle.complete = p.puzzle.pieces >= p.puzzle.size;
    p.puzzle.bonusWeeks = Array.from(new Set([...q.puzzle.bonusWeeks, ...current.progress.puzzle.bonusWeeks]));
    p.puzzle.chestsOpened = Array.from(new Set([...q.puzzle.chestsOpened, ...current.progress.puzzle.chestsOpened]));
    const letters = {};
    for (const sound of new Set([...Object.keys(q.letterCollection.letters), ...Object.keys(current.progress.letterCollection.letters)])) {
      letters[sound] = Math.max(Number(q.letterCollection.letters[sound]) || 0, Number(current.progress.letterCollection.letters[sound]) || 0);
    }
    p.letterCollection = { letters, total: Object.values(letters).reduce((sum, count) => sum + count, 0) };
    p.zoo = Array.from(new Set([...q.zoo, ...current.progress.zoo]));
    p.medals = Object.assign({}, q.medals, current.progress.medals);
    for (const [id, count] of Object.entries(q.treasures)) p.treasures[id] = Math.max(p.treasures[id] || 0, count);
    p.pets.owned = Array.from(new Set([...q.pets.owned, ...current.progress.pets.owned]));
    p.pets.bgs = Array.from(new Set([...q.pets.bgs, ...current.progress.pets.bgs]));
    for (const [id, count] of Object.entries(q.pets.items)) p.pets.items[id] = Math.max(p.pets.items[id] || 0, count);
    if (!p.pets.active) p.pets.active = q.pets.active;
    for (const [id, count] of Object.entries(q.pets.growth)) p.pets.growth[id] = Math.max(p.pets.growth[id] || 0, count);
    for (const [id, count] of Object.entries(q.album.stickers)) p.album.stickers[id] = Math.max(p.album.stickers[id] || 0, count);
    p.story.unlocked = Math.max(p.story.unlocked, q.story.unlocked);
    merged.hero.friendship = Math.max(Number(current.hero.friendship) || 0, Number(incoming.hero.friendship) || 0);
    p.story.heard = Math.max(p.story.heard, q.story.heard);
    if (q.story.lastDate > p.story.lastDate) p.story.lastDate = q.story.lastDate;
    if (q.stats.saidTotal > p.stats.saidTotal) p.stats = clone(q.stats);
    return merged;
  }

  function pruneRecordingMeta(items, now) {
    const cutoff = Number(now) - 14 * 86400000;
    return (items || [])
      .filter(item => Number(item.createdAt) >= cutoff)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 30);
  }

  return {
    STATE_VERSION, DECOR_MAX, SHOP_NEW, DAY_THEMES, dayTheme, GAMES, GAME_TYPES, MIC_GAMES, PARTY_GUESTS, partyPlan, partyEligible, LENGTHS, PETS, ITEMS, BACKGROUNDS, TREASURES, MEDALS,
    PET_STAGES, HERO_FRIEND, heroFriend, addHeroFriendship, STICKER_ODDS, STICKER_DUP_STARS, petStage, albumPagesDone, drawSticker, sessionContentIds, addChoices,
    createDefaultState, normalizeState, migrateLegacy,
    shuffled, freshFirst, uniqueEmoji, dateKey, weekKey, daysBetween,
    levelOf, speakableSound, activeSounds, isSpeakable, hasSound, targetWords, otherWords, activePairFor,
    chooseSounds, selectGym, applyVariant, mushroomHold, funPayload, riddlePayload, riddleLevel, splitSyllables, syllablesFor, gamePayload, gameIsPlayable, selectGames, buildSession, heroMistake, heroReady, heroPairsFor,
    addStats, completeSession, openChest, buy, adoptFirstPet, feedPet, petJoy, addPetJoy, JOY_MAX, findShopEntry,
    levelSuggestions, staleSounds, hardWords, neverSaid, mergeState, pruneRecordingMeta, newMedals
  };
});

(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) root.YazychokSchoolData = value;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // «ШКОЛА» — задания для 1 класса: счёт, отличия, слоги, пазлы, ряды, лишнее, тени.
  // Два языка: de — как в немецкой школе (Pusteblume, Denken und Rechnen), ru — по-русски.
  // ─────────────────────────────────────────────────────────────

  const TYPES = [
    { id: 'math', icon: '➕', de: 'Rechnen', ru: 'Считаем', maxLevel: 4 },
    { id: 'count', icon: '🔢', de: 'Zählen', ru: 'Счёт и сравнение', maxLevel: 3 },
    { id: 'diff', icon: '🔍', de: 'Unterschiede', ru: 'Найди отличия', maxLevel: 3 },
    { id: 'syll', icon: '🔤', de: 'Silben', ru: 'Слоги', maxLevel: 3 },
    { id: 'puzzle', icon: '🧩', de: 'Puzzleteile', ru: 'Кусочки пазла', maxLevel: 3 },
    { id: 'pattern', icon: '🔁', de: 'Reihen', ru: 'Продолжи ряд', maxLevel: 3 },
    { id: 'odd', icon: '🤔', de: 'Was passt nicht?', ru: 'Найди лишнее', maxLevel: 3 },
    { id: 'shadow', icon: '👤', de: 'Schatten', ru: 'Тени', maxLevel: 3 }
  ];

  // Фразы. Ключ озвучки: sc:<язык>:<категория>:<номер>.
  const LINES = {
    de: {
      lesson: ['Die Schulstunde beginnt! Los geht\'s!'],
      setStart: ['Sechs Aufgaben. Los geht\'s!'],
      right: ['Richtig!', 'Super!', 'Genau!', 'Toll gemacht!', 'Prima!'],
      again: ['Fast! Versuch es noch einmal.', 'Schau noch einmal genau hin.', 'Nicht ganz. Probier es noch mal.'],
      show: ['Schau, so ist es richtig.'],
      calm: ['Lass dir Zeit. Wenn du fertig bist, tippe auf die Antwort.'],
      setDone: ['Geschafft! Das Muster ist fertig!', 'Super! Alle Aufgaben gelöst!'],
      levelUp: ['Du wirst immer besser! Jetzt wird es ein bisschen schwerer.'],
      mathPlus: ['Rechne!'],
      mathHouse: ['Das Zahlenhaus. Welche Zahl fehlt?'],
      mathMissing: ['Welche Zahl fehlt?'],
      countHowMany: ['Wie viele sind es? Zähle!'],
      countMore: ['Auf welcher Seite sind mehr?'],
      countLess: ['Auf welcher Seite sind weniger?'],
      countCompare: ['Größer, kleiner oder gleich?'],
      countNeighbor: ['Welche Zahl fehlt? Finde den Nachbarn!'],
      diffStart: ['Finde die Unterschiede! Tippe sie im rechten Bild an.'],
      diffFound: ['Gefunden!', 'Ja, da!', 'Super, gefunden!'],
      syllBuild: ['Lies die Silben. Welches Bild passt?'],
      syllCount: ['Wie viele Silben hat das Wort? Klatsch mit!'],
      syllFirst: ['Mit welcher Silbe beginnt das Wort?'],
      syllMissing: ['Welche Silbe fehlt?'],
      puzzleStart: ['Welches Puzzleteil passt in die Lücke?'],
      patternStart: ['Wie geht die Reihe weiter?'],
      patternNum: ['Welche Zahl kommt als Nächstes?'],
      oddStart: ['Was passt nicht dazu?'],
      shadowStart: ['Welcher Schatten gehört zum Bild?'],
      plus: ['plus'],
      minus: ['minus'],
      is: ['ist gleich']
    },
    ru: {
      lesson: ['Начинаем урок! Поехали!'],
      setStart: ['Шесть заданий. Поехали!'],
      right: ['Правильно!', 'Верно!', 'Здорово!', 'Молодец!', 'Точно!'],
      again: ['Почти! Попробуй ещё раз.', 'Посмотри ещё раз внимательно.', 'Не совсем. Попробуй снова.'],
      show: ['Смотри, вот так правильно.'],
      calm: ['Не спеши. Когда решишь — нажми на ответ.'],
      setDone: ['Готово! Узор собран!', 'Здорово! Все задания решены!'],
      levelUp: ['У тебя отлично получается! Теперь будет чуть сложнее.'],
      mathPlus: ['Посчитай!'],
      mathHouse: ['Домик чисел. Какого числа не хватает?'],
      mathMissing: ['Какое число пропало?'],
      countHowMany: ['Сколько их? Посчитай!'],
      countMore: ['Где больше?'],
      countLess: ['Где меньше?'],
      countCompare: ['Больше, меньше или поровну?'],
      countNeighbor: ['Какое число пропало? Найди соседа!'],
      diffStart: ['Найди отличия! Нажимай на них на правой картинке.'],
      diffFound: ['Нашла!', 'Да, вот оно!', 'Отлично, нашла!'],
      syllBuild: ['Прочитай слоги. Какая картинка подходит?'],
      syllCount: ['Сколько слогов в слове? Похлопай!'],
      syllFirst: ['С какого слога начинается слово?'],
      syllMissing: ['Какой слог пропал?'],
      puzzleStart: ['Какой кусочек пазла подходит?'],
      patternStart: ['Что будет дальше?'],
      patternNum: ['Какое число следующее?'],
      oddStart: ['Что здесь лишнее?'],
      shadowStart: ['Найди тень этой картинки.'],
      plus: ['плюс'],
      minus: ['минус'],
      is: ['равно']
    }
  };

  // Числа 0–20 и десятки до 100.
  const NUMBERS = {
    de: ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn',
      'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig'],
    ru: ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать',
      'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать']
  };
  const TENS = {
    de: { 30: 'dreißig', 40: 'vierzig', 50: 'fünfzig', 60: 'sechzig', 70: 'siebzig', 80: 'achtzig', 90: 'neunzig', 100: 'hundert' },
    ru: { 30: 'тридцать', 40: 'сорок', 50: 'пятьдесят', 60: 'шестьдесят', 70: 'семьдесят', 80: 'восемьдесят', 90: 'девяносто', 100: 'сто' }
  };

  // Группы для «Найди лишнее»: как сказать «остальные — …».
  const CATEGORIES = {
    fruit: { de: 'Die anderen sind alle Obst.', ru: 'Остальные — фрукты.' },
    veg: { de: 'Die anderen sind alle Gemüse.', ru: 'Остальные — овощи.' },
    animals: { de: 'Die anderen sind alle Tiere.', ru: 'Остальные — животные.' },
    vehicles: { de: 'Die anderen sind alle Fahrzeuge.', ru: 'Остальные — транспорт: на них ездят и летают.' },
    clothes: { de: 'Die anderen sind alle Kleidung.', ru: 'Остальные — одежда.' },
    music: { de: 'Die anderen sind alle Musikinstrumente.', ru: 'Остальные — музыкальные инструменты.' },
    school: { de: 'Die anderen sind alle Schulsachen.', ru: 'Остальные — школьные вещи.' },
    sky: { de: 'Die anderen sind alle am Himmel.', ru: 'Остальные бывают на небе.' },
    toys: { de: 'Die anderen sind alle Spielzeug.', ru: 'Остальные — игрушки.' },
    home: { de: 'Die anderen sind alle im Haus.', ru: 'Остальные — вещи в доме.' },
    body: { de: 'Die anderen sind alle Körperteile.', ru: 'Остальные — части тела.' },
    plants: { de: 'Die anderen sind alle Pflanzen.', ru: 'Остальные — растения.' }
  };
  // Близкие группы — их смешиваем только на высоком уровне (фрукт среди овощей труднее, чем фрукт среди машин).
  const NEAR = { fruit: ['veg'], veg: ['fruit'], toys: ['school', 'home'], school: ['toys', 'home'], home: ['toys', 'school'], sky: ['plants'], plants: ['sky', 'veg'] };

  // Картинки-слова: эмодзи, слово и слоги на двух языках, группа.
  // Слоги через дефис: немецкие — как хлопают в школе (Sprechsilben), русские — по гласным.
  // deTts — как написать слово для немецкого голоса, чтобы он произнёс его чётко (проверено распознаванием).
  const ITEMS = [
    // фрукты
    { e: '🍎', de: 'Ap-fel', ru: 'яб-ло-ко', c: 'fruit' },
    { e: '🍐', de: 'Bir-ne', ru: 'гру-ша', c: 'fruit' },
    { e: '🍌', de: 'Ba-na-ne', ru: 'ба-нан', c: 'fruit' },
    { e: '🍋', de: 'Zi-tro-ne', ru: 'ли-мон', c: 'fruit' },
    { e: '🍒', de: 'Kir-sche', ru: 'виш-ня', c: 'fruit' },
    { e: '🍓', de: 'Erd-bee-re', ru: 'клуб-ни-ка', c: 'fruit' },
    { e: '🍇', de: 'Trau-be', ru: 'ви-но-град', c: 'fruit' },
    { e: '🍍', de: 'A-na-nas', ru: 'а-на-нас', c: 'fruit' },
    { e: '🥝', de: 'Ki-wi', deTts: 'Kiewi', ru: 'ки-ви', c: 'fruit' },
    { e: '🍉', de: 'Me-lo-ne', ru: 'ар-буз', c: 'fruit' },
    // овощи
    { e: '🍅', de: 'To-ma-te', ru: 'по-ми-дор', c: 'veg' },
    { e: '🥕', de: 'Ka-rot-te', ru: 'мор-ковь', c: 'veg' },
    { e: '🥒', de: 'Gur-ke', ru: 'о-гу-рец', c: 'veg' },
    { e: '🌽', de: 'Mais', ru: 'ку-ку-ру-за', c: 'veg' },
    { e: '🫑', de: 'Pa-pri-ka', ru: 'пе-рец', c: 'veg' },
    { e: '🥦', de: 'Brok-ko-li', ru: 'брок-ко-ли', c: 'veg' },
    { e: '🥔', de: 'Kar-tof-fel', ru: 'кар-тош-ка', c: 'veg' },
    { e: '🧅', de: 'Zwie-bel', ru: 'лук', c: 'veg' },
    // животные
    { e: '🐱', de: 'Kat-ze', ru: 'кош-ка', c: 'animals' },
    { e: '🐶', de: 'Hund', ru: 'со-ба-ка', c: 'animals' },
    { e: '🐭', de: 'Maus', ru: 'мыш-ка', c: 'animals' },
    { e: '🐰', de: 'Ha-se', ru: 'за-яц', c: 'animals' },
    { e: '🦔', de: 'I-gel', ru: 'ё-жик', c: 'animals' },
    { e: '🐯', de: 'Ti-ger', ru: 'тигр', c: 'animals' },
    { e: '🦁', de: 'Lö-we', ru: 'лев', c: 'animals' },
    { e: '🦓', de: 'Ze-bra', ru: 'зеб-ра', c: 'animals' },
    { e: '🦒', de: 'Gi-raf-fe', ru: 'жи-раф', c: 'animals' },
    { e: '🐘', de: 'E-le-fant', ru: 'слон', c: 'animals' },
    { e: '🐵', de: 'Af-fe', ru: 'о-бе-зья-на', c: 'animals' },
    { e: '🐧', de: 'Pin-gu-in', ru: 'пинг-вин', c: 'animals' },
    { e: '🐌', de: 'Schne-cke', ru: 'у-лит-ка', c: 'animals' },
    { e: '🐝', de: 'Bie-ne', ru: 'пче-ла', c: 'animals' },
    { e: '🐟', de: 'Fisch', ru: 'ры-ба', c: 'animals' },
    { e: '🦆', de: 'En-te', ru: 'ут-ка', c: 'animals' },
    { e: '🐫', de: 'Ka-mel', ru: 'вер-блюд', c: 'animals' },
    { e: '🐊', de: 'Kro-ko-dil', ru: 'кро-ко-дил', c: 'animals' },
    { e: '🐷', de: 'Schwein', ru: 'сви-нья', c: 'animals' },
    { e: '🐮', de: 'Kuh', ru: 'ко-ро-ва', c: 'animals' },
    { e: '🐴', de: 'Pferd', ru: 'ло-шадь', c: 'animals' },
    { e: '🐑', de: 'Schaf', ru: 'ов-ца', c: 'animals' },
    { e: '🦉', de: 'Eu-le', ru: 'со-ва', c: 'animals' },
    { e: '🐸', de: 'Frosch', ru: 'ля-гуш-ка', c: 'animals' },
    { e: '🐢', de: 'Schild-krö-te', ru: 'че-ре-па-ха', c: 'animals' },
    { e: '🐛', de: 'Rau-pe', ru: 'гу-се-ни-ца', c: 'animals' },
    // транспорт
    { e: '🚗', de: 'Au-to', ru: 'ма-ши-на', c: 'vehicles' },
    { e: '🚌', de: 'Bus', deTts: 'Buss', ru: 'ав-то-бус', c: 'vehicles' },
    { e: '🚂', de: 'Zug', ru: 'по-езд', c: 'vehicles' },
    { e: '🚲', de: 'Fahr-rad', ru: 'ве-ло-си-пед', c: 'vehicles' },
    { e: '✈️', de: 'Flug-zeug', ru: 'са-мо-лёт', c: 'vehicles' },
    { e: '🚢', de: 'Schiff', ru: 'ко-рабль', c: 'vehicles' },
    { e: '🚀', de: 'Ra-ke-te', ru: 'ра-ке-та', c: 'vehicles' },
    { e: '🚜', de: 'Trak-tor', ru: 'трак-тор', c: 'vehicles' },
    { e: '🛴', de: 'Rol-ler', ru: 'са-мо-кат', c: 'vehicles' },
    { e: '🚁', de: 'Hub-schrau-ber', ru: 'вер-то-лёт', c: 'vehicles' },
    { e: '⛵', de: 'Boot', ru: 'лод-ка', c: 'vehicles' },
    { e: '🚕', de: 'Ta-xi', ru: 'так-си', c: 'vehicles' },
    { e: '🚚', de: 'Las-ter', ru: 'гру-зо-вик', c: 'vehicles' },
    // одежда
    { e: '👖', de: 'Ho-se', ru: 'брю-ки', c: 'clothes' },
    { e: '👗', de: 'Kleid', ru: 'пла-тье', c: 'clothes' },
    { e: '🧦', de: 'So-cke', ru: 'но-сок', c: 'clothes' },
    { e: '👟', de: 'Schuh', ru: 'крос-сов-ка', c: 'clothes' },
    { e: '🧢', de: 'Müt-ze', ru: 'кеп-ка', c: 'clothes' },
    { e: '🧥', de: 'Ja-cke', ru: 'курт-ка', c: 'clothes' },
    { e: '👕', de: 'Hemd', ru: 'фут-бол-ка', c: 'clothes' },
    { e: '🧤', de: 'Hand-schuh', ru: 'пер-чат-ки', c: 'clothes' },
    { e: '🧣', de: 'Schal', ru: 'шарф', c: 'clothes' },
    { e: '👢', de: 'Stie-fel', ru: 'са-пог', c: 'clothes' },
    // музыка
    { e: '🎸', de: 'Gi-tar-re', ru: 'ги-та-ра', c: 'music' },
    { e: '🥁', de: 'Trom-mel', ru: 'ба-ра-бан', c: 'music' },
    { e: '🎻', de: 'Gei-ge', ru: 'скрип-ка', c: 'music' },
    { e: '🎺', de: 'Trom-pe-te', ru: 'тру-ба', c: 'music' },
    { e: '🎹', de: 'Kla-vier', ru: 'пи-а-ни-но', c: 'music' },
    { e: '🎷', de: 'Sa-xo-fon', ru: 'сак-со-фон', c: 'music' },
    // школа
    { e: '📕', de: 'Buch', ru: 'кни-га', c: 'school' },
    { e: '✏️', de: 'Stift', ru: 'ка-ран-даш', c: 'school' },
    { e: '✂️', de: 'Sche-re', ru: 'нож-ни-цы', c: 'school' },
    { e: '📏', de: 'Li-ne-al', ru: 'ли-ней-ка', c: 'school' },
    { e: '🎒', de: 'Ran-zen', ru: 'рюк-зак', c: 'school' },
    { e: '🖌️', de: 'Pin-sel', deTts: 'Pinnsel', ru: 'кис-точ-ка', c: 'school' },
    { e: '📓', de: 'Heft', ru: 'тет-радь', c: 'school' },
    // небо
    { e: '☀️', de: 'Son-ne', ru: 'солн-це', c: 'sky' },
    { e: '🌙', de: 'Mond', ru: 'лу-на', c: 'sky' },
    { e: '⭐', de: 'Stern', ru: 'звез-да', c: 'sky' },
    { e: '☁️', de: 'Wol-ke', ru: 'об-ла-ко', c: 'sky' },
    { e: '🌈', de: 'Re-gen-bo-gen', ru: 'ра-ду-га', c: 'sky' },
    { e: '⚡', de: 'Blitz', ru: 'мол-ни-я', c: 'sky' },
    { e: '❄️', de: 'Schnee-flo-cke', ru: 'сне-жин-ка', c: 'sky' },
    // игрушки
    { e: '⚽', de: 'Ball', ru: 'мяч', c: 'toys' },
    { e: '🧸', de: 'Ted-dy', deTts: 'Teddi', ru: 'миш-ка', c: 'toys' },
    { e: '🪁', de: 'Dra-chen', ru: 'змей', c: 'toys' },
    { e: '🎈', de: 'Bal-lon', ru: 'ша-рик', c: 'toys' },
    { e: '🎲', de: 'Wür-fel', ru: 'ку-бик', c: 'toys' },
    { e: '🤖', de: 'Ro-bo-ter', ru: 'ро-бот', c: 'toys' },
    // дом
    { e: '🛋️', de: 'So-fa', ru: 'ди-ван', c: 'home' },
    { e: '💡', de: 'Lam-pe', ru: 'лам-па', c: 'home' },
    { e: '🛏️', de: 'Bett', ru: 'кро-вать', c: 'home' },
    { e: '⏰', de: 'Uhr', ru: 'ча-сы', c: 'home' },
    { e: '🔑', de: 'Schlüs-sel', ru: 'ключ', c: 'home' },
    { e: '🚪', de: 'Tür', ru: 'дверь', c: 'home' },
    { e: '🪑', de: 'Stuhl', deTts: 'Schtuhl', ru: 'стул', c: 'home' },
    // тело
    { e: '👃', de: 'Na-se', ru: 'нос', c: 'body' },
    { e: '👂', de: 'Ohr', ru: 'у-хо', c: 'body' },
    { e: '👁️', de: 'Au-ge', ru: 'глаз', c: 'body' },
    { e: '✋', de: 'Hand', ru: 'ру-ка', c: 'body' },
    { e: '🦶', de: 'Fuß', ru: 'но-га', c: 'body' },
    { e: '👄', de: 'Mund', ru: 'рот', c: 'body' },
    // растения
    { e: '🌹', de: 'Ro-se', ru: 'ро-за', c: 'plants' },
    { e: '🌸', de: 'Blu-me', ru: 'цве-ток', c: 'plants' },
    { e: '🌳', de: 'Baum', ru: 'де-ре-во', c: 'plants' },
    { e: '🌵', de: 'Kak-tus', ru: 'как-тус', c: 'plants' },
    { e: '🍄', de: 'Pilz', ru: 'гриб', c: 'plants' }
  ];

  // Сцены для «Найди отличия»: фон и набор картинок.
  const SCENES = [
    { id: 'garden', bg: 'garden', items: ['🌸', '🌳', '🍄', '🐝', '🦋', '🐞', '🌼', '🐌', '🐦', '🌷', '🐛', '🍓'] },
    { id: 'sea', bg: 'sea', items: ['🐟', '🐠', '🐙', '🦀', '🐚', '⭐', '🐳', '🐬', '🦑', '🐡', '⚓', '🐢'] },
    { id: 'room', bg: 'room', items: ['🧸', '⚽', '🎈', '📚', '🪁', '🎲', '🖍️', '🚗', '🤖', '🎨', '🧩', '🪀'] },
    { id: 'space', bg: 'space', items: ['🚀', '🌙', '⭐', '🪐', '☄️', '👽', '🛸', '🌍', '✨', '🛰️', '🌟', '🔭'] },
    { id: 'farm', bg: 'farm', items: ['🐮', '🐷', '🐔', '🐴', '🐑', '🚜', '🌾', '🐣', '🏠', '🌻', '🐶', '🥕'] },
    { id: 'kitchen', bg: 'room', items: ['🍎', '🍌', '🧁', '🍪', '🥛', '🍕', '🍩', '🥕', '🍇', '🧀', '🍉', '🍞'] }
  ];

  // Для «Продолжи ряд»: фигуры и цвета.
  const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
  const COLORS = ['#ff5b7f', '#3fa7ff', '#ffc531', '#4cc477', '#a77dff', '#ff8d3a'];

  return { TYPES, LINES, NUMBERS, TENS, CATEGORIES, NEAR, ITEMS, SCENES, SHAPES, COLORS };
});

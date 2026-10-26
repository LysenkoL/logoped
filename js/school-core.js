(function (root, factory) {
  const sd = typeof module === 'object' && module.exports ? require('./school-data.js') : root.YazychokSchoolData;
  const value = factory(sd);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.schoolCore = value;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (SD) {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // «Школа»: генераторы заданий (чистые функции — проверяются тестами) и уровни.
  // ─────────────────────────────────────────────────────────────

  const rnd = (rng, n) => Math.floor(rng() * n);
  const between = (rng, a, b) => a + rnd(rng, b - a + 1);
  const pick = (rng, arr) => arr[rnd(rng, arr.length)];
  function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = rnd(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const sample = (rng, arr, n) => shuffle(rng, arr).slice(0, n);
  const SET_SIZE = 6;
  const DAILY_STAR_CAP = 25;

  // Слово на нужном языке: { e, text, syl: ['Ba','na','ne'], c }.
  function word(item, lang) {
    const parts = item[lang].split('-');
    const text = parts.join('');
    return { e: item.e, text, syl: parts, c: item.c };
  }
  const words = lang => SD.ITEMS.map(item => word(item, lang));

  // Варианты ответа: правильный + соседние числа, без повторов, в пределах [lo, hi].
  function numberOptions(rng, answer, count, lo, hi) {
    const set = new Set([answer]);
    const near = shuffle(rng, [answer - 1, answer + 1, answer - 2, answer + 2, answer + 10, answer - 10, answer + 3, answer - 3]);
    for (const n of near) { if (set.size >= count) break; if (n >= lo && n <= hi) set.add(n); }
    let guard = 0;
    while (set.size < count && guard < 50) { set.add(between(rng, lo, hi)); guard += 1; }
    return shuffle(rng, Array.from(set));
  }

  // ─── Счёт ──────────────────────────────────────────────────
  function math(level, rng) {
    const lvl = Math.max(1, Math.min(4, level || 1));
    let a; let b; let op; let missing = 'result';
    if (lvl === 2 && rng() < 0.25) {
      // Zahlenhaus: крыша — число, этаж — две части, одной не хватает.
      const top = between(rng, 4, 10); const left = between(rng, 0, top);
      return { type: 'math', kind: 'house', top, left, right: top - left, answer: top - left, options: numberOptions(rng, top - left, 4, 0, 10), prompt: [{ line: 'mathHouse' }] };
    }
    if (lvl === 1) {
      op = rng() < 0.7 ? '+' : '-';
      if (op === '+') { a = between(rng, 1, 4); b = between(rng, 1, 5 - a); } else { a = between(rng, 2, 5); b = between(rng, 1, a - 1); }
    } else if (lvl === 2) {
      op = rng() < 0.6 ? '+' : '-';
      if (op === '+') { a = between(rng, 1, 9); b = between(rng, 1, 10 - a); } else { a = between(rng, 3, 10); b = between(rng, 1, a - 1); }
    } else if (lvl === 3) {
      if (rng() < 0.3) {
        // Пропущенное число: 4 + ? = 9.
        a = between(rng, 1, 8); const sum = between(rng, a + 1, 10); b = sum - a; op = '+'; missing = 'b';
        return { type: 'math', kind: 'expr', a, b, op, missing, result: sum, answer: b, options: numberOptions(rng, b, 4, 0, 10), dots: false, prompt: [{ line: 'mathMissing' }] };
      }
      // До 20 без перехода через десяток.
      op = rng() < 0.6 ? '+' : '-';
      const x = between(rng, 0, 8);
      if (op === '+') { a = 10 + x; b = between(rng, 1, 9 - x); } else { a = 10 + between(rng, 1, 9); b = between(rng, 1, a - 10); }
    } else {
      // С переходом через десяток.
      op = rng() < 0.6 ? '+' : '-';
      if (op === '+') { a = between(rng, 5, 9); b = between(rng, 11 - a, 9); } else { a = between(rng, 11, 18); b = between(rng, a - 9, 9); }
    }
    const result = op === '+' ? a + b : a - b;
    return { type: 'math', kind: 'expr', a, b, op, missing, result, answer: result, options: numberOptions(rng, result, lvl === 1 ? 3 : 4, 0, 20), dots: lvl <= 2, prompt: [{ line: 'mathPlus' }, { num: a }, { line: op === '+' ? 'plus' : 'minus' }, { num: b }] };
  }

  const COUNT_EMOJI = ['🍎', '⭐', '🐟', '🌸', '🐞', '🎈', '🍓', '⚽', '🦆', '🍄', '🐝', '🧁'];
  function count(level, rng) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    const kinds = lvl === 1 ? ['howMany', 'howMany', 'more'] : lvl === 2 ? ['howMany', 'more', 'neighbor'] : ['howMany', 'compare', 'neighbor', 'more'];
    const kind = pick(rng, kinds);
    const emoji = pick(rng, COUNT_EMOJI);
    if (kind === 'howMany') {
      const n = lvl === 1 ? between(rng, 1, 6) : lvl === 2 ? between(rng, 3, 10) : between(rng, 8, 20);
      return { type: 'count', kind, emoji, n, answer: n, options: numberOptions(rng, n, lvl === 1 ? 3 : 4, 1, lvl === 3 ? 20 : 10), framed: lvl === 3, prompt: [{ line: 'countHowMany' }] };
    }
    if (kind === 'more') {
      const max = lvl === 1 ? 6 : 10;
      const l = between(rng, 1, max); let r = between(rng, 1, max);
      if (r === l) r = l === max ? l - 1 : l + 1;
      const ask = lvl === 1 || rng() < 0.6 ? 'more' : 'less';
      const answer = (ask === 'more') === (l > r) ? 'left' : 'right';
      const other = pick(rng, COUNT_EMOJI.filter(e => e !== emoji));
      return { type: 'count', kind, ask, left: { emoji, n: l }, right: { emoji: lvl === 1 ? emoji : other, n: r }, answer, prompt: [{ line: ask === 'more' ? 'countMore' : 'countLess' }] };
    }
    if (kind === 'compare') {
      const a = between(rng, 0, 20); const b = rng() < 0.2 ? a : between(rng, 0, 20);
      return { type: 'count', kind, a, b, answer: a > b ? '>' : a < b ? '<' : '=', options: ['<', '=', '>'], prompt: [{ line: 'countCompare' }] };
    }
    // Соседи числа: 4 _ 6 или _ 5 6.
    const max = lvl === 2 ? 10 : 20;
    const mid = between(rng, 1, max - 1);
    const row = [mid - 1, mid, mid + 1];
    const gap = rnd(rng, 3);
    const answer = row[gap];
    return { type: 'count', kind, row: row.map((n, i) => (i === gap ? null : n)), answer, options: numberOptions(rng, answer, 3, 0, max), prompt: [{ line: 'countNeighbor' }] };
  }

  // ─── Найди отличия ────────────────────────────────────────
  function diff(level, rng) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    const scene = pick(rng, SD.SCENES);
    const cols = 4; const rows = 3;
    const nItems = lvl === 1 ? 8 : lvl === 2 ? 10 : 11;
    const nDiffs = lvl === 1 ? 3 : lvl === 2 ? 4 : 5;
    const cells = sample(rng, Array.from({ length: cols * rows }, (_, i) => i), nItems);
    const emojis = sample(rng, scene.items, Math.min(scene.items.length, nItems));
    const left = cells.map((cell, i) => ({
      cell,
      x: ((cell % cols) + 0.5) / cols + (rng() - 0.5) * 0.08,
      y: (Math.floor(cell / cols) + 0.5) / rows + (rng() - 0.5) * 0.1,
      e: emojis[i % emojis.length],
      s: 1
    }));
    const right = left.map(item => Object.assign({}, item));
    const free = Array.from({ length: cols * rows }, (_, i) => i).filter(c => !cells.includes(c));
    const kinds = shuffle(rng, ['missing', 'swap', 'size', 'swap', 'missing', 'add', 'size']);
    const diffs = [];
    const used = new Set();
    for (const kind of kinds) {
      if (diffs.length >= nDiffs) break;
      if (kind === 'add') {
        if (!free.length) continue;
        const cell = free.shift();
        const x = ((cell % cols) + 0.5) / cols; const y = (Math.floor(cell / cols) + 0.5) / rows;
        const e = pick(rng, scene.items);
        right.push({ cell, x, y, e, s: 1, added: true });
        diffs.push({ kind, x, y });
        continue;
      }
      const candidates = right.filter(item => !item.added && !used.has(item.cell));
      if (!candidates.length) continue;
      const item = pick(rng, candidates);
      used.add(item.cell);
      if (kind === 'missing') item.hidden = true;
      if (kind === 'size') item.s = 1.45;
      if (kind === 'swap') item.e = pick(rng, scene.items.filter(e => e !== item.e));
      diffs.push({ kind, x: item.x, y: item.y });
    }
    return { type: 'diff', kind: 'diff', scene: scene.id, bg: scene.bg, left, right, diffs, prompt: [{ line: 'diffStart' }] };
  }

  // ─── Слоги ────────────────────────────────────────────────
  function syll(level, rng, lang) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    const all = words(lang);
    const kinds = lvl === 1 ? ['build', 'count', 'first'] : lvl === 2 ? ['build', 'count', 'first', 'missing'] : ['build', 'count', 'missing', 'first'];
    const kind = pick(rng, kinds);
    const range = lvl === 1 ? [2, 2] : lvl === 2 ? [2, 3] : [3, 4];
    if (kind === 'build' || kind === 'missing') {
      const pool = all.filter(w => w.syl.length >= range[0] && w.syl.length <= range[1]);
      const target = pick(rng, pool);
      if (kind === 'build') {
        const others = sample(rng, all.filter(w => w.text !== target.text && w.e !== target.e), lvl === 1 ? 2 : 3);
        const options = shuffle(rng, [target, ...others]);
        return { type: 'syll', kind, target, syl: target.syl, options: options.map(w => ({ e: w.e, text: w.text })), answer: options.indexOf(target), prompt: [{ line: 'syllBuild' }] };
      }
      const gap = rnd(rng, target.syl.length);
      const right = target.syl[gap];
      const allSyl = Array.from(new Set(all.flatMap(w => w.syl.map(s => s.toLowerCase())))).filter(s => s !== right.toLowerCase());
      const fit = s => (gap === 0 && lang === 'de' ? s.charAt(0).toUpperCase() + s.slice(1) : s);
      const wrong = sample(rng, allSyl.filter(s => s.length <= right.length + 2), 2).map(fit);
      const options = shuffle(rng, [right, ...wrong]);
      return { type: 'syll', kind, target, syl: target.syl.map((s, i) => (i === gap ? null : s)), answer: options.indexOf(right), options, prompt: [{ line: 'syllMissing' }, { word: target.text }] };
    }
    if (kind === 'count') {
      const max = lvl === 1 ? 2 : lvl === 2 ? 3 : 4;
      const n = between(rng, 1, max);
      const pool = all.filter(w => w.syl.length === n);
      const target = pick(rng, pool.length ? pool : all);
      const options = Array.from({ length: Math.max(3, max) }, (_, i) => i + 1);
      return { type: 'syll', kind, target, answer: target.syl.length, options, prompt: [{ line: 'syllCount' }, { word: target.text }] };
    }
    // first: услышать слово (картинка) и найти, с какого слога оно начинается.
    const multi = all.filter(w => w.syl.length >= 2);
    const target = pick(rng, multi);
    const right = target.syl[0];
    const firsts = Array.from(new Set(multi.map(w => w.syl[0]))).filter(s => s.toLowerCase() !== right.toLowerCase());
    let pool = lvl === 1
      ? firsts.filter(s => s[0].toLowerCase() !== right[0].toLowerCase())
      : firsts.filter(s => s[0].toLowerCase() === right[0].toLowerCase() || s.slice(-1).toLowerCase() === right.slice(-1).toLowerCase());
    if (pool.length < 3) pool = firsts;
    const options = shuffle(rng, [right, ...sample(rng, pool, lvl === 1 ? 2 : 3)]);
    return { type: 'syll', kind: 'first', target, options, answer: options.indexOf(right), prompt: [{ line: 'syllFirst' }, { word: target.text }] };
  }

  // ─── Кусочки пазла ───────────────────────────────────────
  // Картинка-пейзаж 400×300 (4×3 клетки по 100). Одна клетка вырезана, варианты — кусочки из других мест
  // (на 3 уровне один из них — правильный кусочек, но перевёрнутый).
  function lcg(seed) {
    let v = Math.abs(Math.floor(seed)) % 2147483647;
    if (v <= 0) v += 2147483646;
    return () => { v = (v * 16807) % 2147483647; return v / 2147483647; };
  }
  const SKIES = [['#6ec3ff', '#d6f0ff'], ['#ff9f7a', '#ffe3c2'], ['#8fd8ff', '#effaff'], ['#a995ff', '#ffd3ee']];
  const GROUNDS = [['#86d68e', '#4caa61'], ['#b3e36f', '#69b848'], ['#f2d283', '#dcae52'], ['#9bdcc4', '#55b193']];
  const ROOFS = ['#e8505b', '#5b7cfa', '#ff9f1c', '#8e5cf7', '#2bb673'];
  const WALLS = ['#ffe9b8', '#fff3f0', '#dff3ff', '#f7e1ff'];
  const PETALS = ['#ff5b8a', '#ffd23f', '#7b6cff', '#ff8a3d', '#ffffff', '#3fc1ff'];
  function puzzleScene(seed) {
    const r = lcg(seed);
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    const horizon = ri(150, 175);
    const objs = [];
    const add = (o, x, y, w, h) => { o.box = { x, y, w, h }; objs.push(o); return o; };
    const sky = SKIES[ri(0, SKIES.length - 1)];
    const ground = GROUNDS[ri(0, GROUNDS.length - 1)];
    const hill = { k: 'hill', y: horizon, a: ri(-25, 25), b: ri(-25, 25), c: ri(-20, 20), color: ground[0] };
    if (r() < 0.45) { const cx = ri(120, 280); add({ k: 'rainbow', cx, cy: horizon, rr: ri(90, 120) }, cx - 120, horizon - 120, 240, 120); }
    const sunX = ri(40, 360); add({ k: 'sun', x: sunX, y: ri(42, 70), rr: ri(24, 32) }, sunX - 40, 10, 80, 100);
    for (let i = 0; i < 2; i += 1) { const x = ri(30, 340); const y = ri(28, 105); add({ k: 'cloud', x, y, s: 0.8 + r() * 0.5 }, x - 35, y - 20, 75, 40); }
    if (r() < 0.6) { const x = ri(40, 360); const y = ri(30, 110); add({ k: 'birds', x, y }, x - 20, y - 10, 45, 20); }
    if (r() < 0.55) { const x = ri(30, 370); const y = ri(40, 110); add({ k: 'balloon', x, y, color: ROOFS[ri(0, ROOFS.length - 1)] }, x - 15, y - 20, 30, 60); }
    const houseX = ri(25, 215); const houseW = ri(95, 120); const houseH = ri(70, 85);
    add({ k: 'house', x: houseX, y: horizon + ri(18, 40) - houseH, w: houseW, h: houseH, roof: ROOFS[ri(0, ROOFS.length - 1)], wall: WALLS[ri(0, WALLS.length - 1)], door: r() < 0.5 ? 'left' : 'right' }, houseX - 10, horizon - houseH - 40, houseW + 20, houseH + 80);
    const free = [[0, houseX - 40], [houseX + houseW + 40, 400]].filter(([a, b]) => b - a > 40);
    const treeSpan = free.length ? free[ri(0, free.length - 1)] : [330, 380];
    const treeX = ri(Math.max(20, treeSpan[0] + 20), Math.min(380, treeSpan[1] - 20));
    add({ k: 'tree', x: treeX, y: horizon + ri(20, 45), s: 0.9 + r() * 0.3, apples: r() < 0.5 }, treeX - 45, horizon - 100, 90, 160);
    const fence = r() < 0.5;
    if (fence) add({ k: 'fence', x: ri(0, 200), y: horizon + 55, w: ri(120, 200) }, 0, horizon + 25, 400, 40);
    const nFlowers = ri(5, 8);
    for (let i = 0; i < nFlowers; i += 1) {
      const x = 20 + ((i + r() * 0.7) / nFlowers) * 360; const y = ri(232, 285);
      add({ k: 'flower', x, y, color: PETALS[ri(0, PETALS.length - 1)], s: 0.8 + r() * 0.5 }, x - 14, y - 20, 28, 40);
    }
    if (r() < 0.6) { const x = ri(30, 370); const y = ri(200, 270); add({ k: 'bug', x, y, e: ['🐞', '🦋', '🐌', '🐝'][ri(0, 3)] }, x - 18, y - 18, 36, 36); }
    return { sky, ground, horizon, hill, objs };
  }
  // Сколько «рисунка» (не неба и не травы) в клетке: по пересечению рамок предметов.
  function cellDetail(scene, c, rr) {
    const x0 = c * 100; const y0 = rr * 100;
    let area = 0;
    for (const o of scene.objs) {
      const b = o.box; if (!b) continue;
      const w = Math.max(0, Math.min(x0 + 100, b.x + b.w) - Math.max(x0, b.x));
      const h = Math.max(0, Math.min(y0 + 100, b.y + b.h) - Math.max(y0, b.y));
      area += w * h;
    }
    if (scene.horizon > y0 && scene.horizon < y0 + 100) area += 1500;
    return area;
  }
  function puzzle(level, rng) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    const cols = 4; const rows = 3;
    const seed = Math.floor(rng() * 1e9) + 1;
    const scene = puzzleScene(seed);
    const cells = Array.from({ length: cols * rows }, (_, i) => ({ c: i % cols, r: Math.floor(i / cols) }))
      .map(p => Object.assign(p, { d: cellDetail(scene, p.c, p.r) }));
    const rich = cells.filter(p => p.d >= 1800);
    const hole = pick(rng, rich.length ? rich : cells);
    const far = p => Math.abs(p.r - hole.r) + Math.abs(p.c - hole.c) > (lvl === 1 ? 1 : 0);
    const pool = cells.filter(p => p !== hole && far(p)).sort((a, b) => b.d - a.d);
    const others = sample(rng, pool.slice(0, Math.max(4, Math.ceil(pool.length * 0.7))), lvl === 1 ? 2 : 3);
    let options = [{ c: hole.c, r: hole.r, rot: 0 }, ...others.map(p => ({ c: p.c, r: p.r, rot: 0 }))];
    if (lvl === 3) options[options.length - 1] = { c: hole.c, r: hole.r, rot: 180 };
    options = shuffle(rng, options);
    const answer = options.findIndex(o => o.c === hole.c && o.r === hole.r && o.rot === 0);
    return { type: 'puzzle', kind: 'piece', seed, cols, rows, hole: { c: hole.c, r: hole.r }, options, answer, prompt: [{ line: 'puzzleStart' }] };
  }

  // ─── Продолжи ряд ────────────────────────────────────────
  function pattern(level, rng) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    if (lvl >= 2 && rng() < 0.4) {
      const steps = lvl === 2 ? [1, 2, -1] : [2, 5, 10, -2];
      const step = pick(rng, steps);
      const len = 4;
      // Начало ряда: так, чтобы все числа и ответ были от 0 до 20 (уровень 2) или до 100 (уровень 3).
      let start;
      if (step === 1) start = between(rng, 0, 15);
      else if (step === 2) start = lvl === 2 ? between(rng, 0, 10) : between(rng, 0, 20) * 2;
      else if (step === -1) start = between(rng, 5, 20);
      else if (step === -2) start = between(rng, 5, 25) * 2;
      else if (step === 5) start = between(rng, 0, 5) * 5;
      else start = between(rng, 0, 5) * 10;
      const seq = Array.from({ length: len }, (_, i) => start + step * i);
      const answer = start + step * len;
      const near = [answer + step, seq[len - 1], answer + (step > 0 ? 1 : -1), answer - (step > 0 ? 1 : -1)].filter(n => n >= 0 && n !== answer);
      const options = shuffle(rng, [answer, ...Array.from(new Set(near)).slice(0, 2)]);
      return { type: 'pattern', kind: 'numbers', seq, step, answer, options, prompt: [{ line: 'patternNum' }] };
    }
    const units = lvl === 1 ? ['AB', 'ABC', 'AB'] : lvl === 2 ? ['AAB', 'ABB', 'ABC', 'AB'] : ['AABB', 'ABC', 'AAB', 'ABBC', 'ABCD'];
    const unit = pick(rng, units);
    const letters = Array.from(new Set(unit.split('')));
    // Уровень 1: различаются цвета одной фигуры или фигуры одного цвета. Дальше — и то, и другое.
    const mode = lvl === 1 ? pick(rng, ['color', 'shape']) : 'both';
    const shapes = sample(rng, SD.SHAPES, letters.length);
    const colors = sample(rng, SD.COLORS, letters.length);
    const baseShape = pick(rng, SD.SHAPES); const baseColor = pick(rng, SD.COLORS);
    const el = {};
    letters.forEach((l, i) => { el[l] = { shape: mode === 'color' ? baseShape : shapes[i], color: mode === 'shape' ? baseColor : colors[i] }; });
    const total = unit.length * 2 + between(rng, 0, unit.length - 1);
    const seq = Array.from({ length: total }, (_, i) => el[unit[i % unit.length]]);
    const answer = el[unit[total % unit.length]];
    const pool = letters.map(l => el[l]).filter(x => x !== answer);
    const extra = { shape: mode === 'color' ? baseShape : pick(rng, SD.SHAPES.filter(s => !letters.some(l => el[l].shape === s)).concat(baseShape)), color: mode === 'shape' ? baseColor : pick(rng, SD.COLORS.filter(c => !letters.some(l => el[l].color === c)).concat(baseColor)) };
    const optionsRaw = [answer, ...pool.slice(0, 2)];
    if (optionsRaw.length < 3) optionsRaw.push(extra);
    const same = (a, b) => a.shape === b.shape && a.color === b.color;
    const options = shuffle(rng, optionsRaw.filter((o, i) => optionsRaw.findIndex(p => same(p, o)) === i));
    return { type: 'pattern', kind: 'shapes', unit, seq, options, answer: options.findIndex(o => same(o, answer)), prompt: [{ line: 'patternStart' }] };
  }

  // ─── Найди лишнее ────────────────────────────────────────
  function odd(level, rng, lang) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    const all = words(lang);
    const cats = Object.keys(SD.CATEGORIES).filter(c => all.filter(w => w.c === c).length >= 3);
    const main = pick(rng, cats);
    const near = SD.NEAR[main] || [];
    let otherCats = cats.filter(c => c !== main);
    if (lvl === 1) otherCats = otherCats.filter(c => !near.includes(c));
    if (lvl === 3 && near.length && rng() < 0.6) otherCats = near.filter(c => cats.includes(c));
    const other = pick(rng, otherCats);
    const three = sample(rng, all.filter(w => w.c === main), 3);
    const odd1 = pick(rng, all.filter(w => w.c === other));
    const items = shuffle(rng, [...three, odd1]);
    return { type: 'odd', kind: 'odd', items: items.map(w => ({ e: w.e, text: w.text })), answer: items.indexOf(odd1), category: main, odd: odd1.text, prompt: [{ line: 'oddStart' }] };
  }

  // ─── Тени ────────────────────────────────────────────────
  function shadow(level, rng, lang) {
    const lvl = Math.max(1, Math.min(3, level || 1));
    const all = words(lang);
    const target = pick(rng, all);
    const same = all.filter(w => w.c === target.c && w.e !== target.e);
    const pool = lvl === 1 ? all.filter(w => w.c !== target.c) : same.length >= 3 ? same : all.filter(w => w.e !== target.e);
    const others = sample(rng, pool, lvl === 1 ? 2 : 3);
    const options = shuffle(rng, [target, ...others]).map(w => ({ e: w.e, text: w.text }));
    return { type: 'shadow', kind: 'shadow', target: { e: target.e, text: target.text }, options, answer: options.findIndex(o => o.e === target.e), tilt: lvl === 3, prompt: [{ line: 'shadowStart' }] };
  }

  const GENERATORS = { math, count, diff, syll, puzzle, pattern, odd, shadow };
  function makeTask(type, level, rng, lang) {
    const gen = GENERATORS[type];
    if (!gen) throw new Error(`unknown school task ${type}`);
    return gen(level, rng || Math.random, lang === 'ru' ? 'ru' : 'de');
  }

  // ─── Уровни и прогресс ───────────────────────────────────
  function ensure(state) {
    const p = state.progress;
    if (!p.school || typeof p.school !== 'object') p.school = {};
    const s = p.school;
    if (!s.levels || typeof s.levels !== 'object') s.levels = {};
    if (!s.stats || typeof s.stats !== 'object') s.stats = {};
    if (!s.stars || typeof s.stars !== 'object') s.stars = { day: '', n: 0 };
    if (!Array.isArray(s.recent)) s.recent = [];
    for (const t of SD.TYPES) {
      if (!Number.isInteger(s.levels[t.id])) s.levels[t.id] = 1;
      if (!s.stats[t.id]) s.stats[t.id] = { sets: 0, tasks: 0, firstTry: 0 };
    }
    return s;
  }
  const typeInfo = id => SD.TYPES.find(t => t.id === id);
  const levelOf = (state, type) => ensure(state).levels[type] || 1;

  // Сколько заданий в наборе: «Отличия» длинные — по 3.
  const setSize = type => (type === 'diff' ? 3 : SET_SIZE);

  function buildSet(state, type, rng, lang) {
    const level = levelOf(state, type);
    const n = setSize(type);
    const board = { size: n, results: [], type };
    const tasks = [];
    const seen = new Set();
    for (let i = 0; i < n; i += 1) {
      let task; let guard = 0;
      do { task = makeTask(type, level, rng, lang); guard += 1; } while (seen.has(taskKey(task)) && guard < 8);
      seen.add(taskKey(task));
      tasks.push({ kind: 'school', type, level, lang, task, board, index: i });
    }
    return tasks;
  }

  // Урок дня: 6 разных заданий — сначала то, что давно не делали.
  function buildLesson(state, rng, lang) {
    const s = ensure(state);
    const random = rng || Math.random;
    const order = shuffle(random, SD.TYPES.map(t => t.id).filter(t => t !== 'diff'))
      .sort((a, b) => s.recent.indexOf(a) - s.recent.indexOf(b));
    const types = order.slice(0, 5);
    types.splice(between(random, 1, 4), 0, 'diff');
    const board = { size: types.length, results: [], type: 'lesson' };
    return types.map((type, index) => ({ kind: 'school', type, level: levelOf(state, type), lang, task: makeTask(type, levelOf(state, type), random, lang), board, index, lesson: true }));
  }

  function taskKey(t) {
    return JSON.stringify([t.kind, t.a, t.b, t.op, t.n, t.answer, t.target && t.target.text, t.top, t.left && t.left.n, t.hole && [t.hole.c, t.hole.r], t.unit, t.seq && t.seq.length, t.odd, t.seed]);
  }

  // Итог набора: звёзды за задания с первого раза (с дневным пределом) и рост уровня.
  // results: [{ type, firstTry: bool }]
  function recordSet(state, results, today) {
    const s = ensure(state);
    if (s.stars.day !== today) s.stars = { day: today, n: 0 };
    const byType = {};
    for (const r of results) {
      const st = s.stats[r.type];
      st.tasks += 1;
      if (r.firstTry) st.firstTry += 1;
      (byType[r.type] = byType[r.type] || []).push(r.firstTry);
    }
    const levelUps = [];
    for (const [type, list] of Object.entries(byType)) {
      s.stats[type].sets += 1;
      s.recent = s.recent.filter(t => t !== type).concat(type);
      const info = typeInfo(type);
      const share = list.filter(Boolean).length / list.length;
      // Уровень меняем по целому набору одного вида (в уроке дня — по одному заданию, мягче).
      if (list.length >= 3) {
        if (share >= 0.83 && s.levels[type] < info.maxLevel) { s.levels[type] += 1; levelUps.push(type); }
        else if (share <= 0.34 && s.levels[type] > 1) s.levels[type] -= 1;
      } else if (list.length === 1) {
        const key = `${type}Streak`;
        s[key] = list[0] ? (s[key] || 0) + 1 : 0;
        if (s[key] >= 4 && s.levels[type] < info.maxLevel) { s.levels[type] += 1; s[key] = 0; levelUps.push(type); }
      }
    }
    const earned = results.filter(r => r.firstTry).length + (results.length >= 3 ? 1 : 0);
    const stars = Math.max(0, Math.min(earned, DAILY_STAR_CAP - s.stars.n));
    s.stars.n += stars;
    return { stars, levelUps, capped: stars < earned };
  }

  function setLevel(state, type, level) {
    const s = ensure(state);
    const info = typeInfo(type);
    if (!info) return;
    s.levels[type] = Math.max(1, Math.min(info.maxLevel, Number(level) || 1));
  }

  return { puzzleScene, TYPES: SD.TYPES, SET_SIZE, DAILY_STAR_CAP, makeTask, buildSet, buildLesson, recordSet, ensure, levelOf, setLevel, words, word, numberOptions, setSize, GENERATORS };
});

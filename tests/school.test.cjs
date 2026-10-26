const test = require('node:test');
const assert = require('node:assert/strict');
const sc = require('../js/school-core.js');
const SD = require('../js/school-data.js');

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
const LANGS = ['de', 'ru'];
const uniq = arr => new Set(arr.map(x => JSON.stringify(x))).size === arr.length;

test('школа: слова и слоги в данных корректны', () => {
  for (const item of SD.ITEMS) {
    for (const lang of LANGS) {
      assert.ok(item[lang] && !/\s/.test(item[lang]), `${item.e} ${lang}`);
      const w = sc.word(item, lang);
      assert.equal(w.syl.join(''), w.text);
      assert.ok(w.syl.every(p => p.length > 0));
    }
    assert.ok(SD.CATEGORIES[item.c], item.c);
  }
  // У каждого слова — гласная в каждом слоге (русские слоги считаем по гласным).
  for (const item of SD.ITEMS) {
    for (const part of item.ru.split('-')) assert.match(part, /[аеёиоуыэюя]/i, `${item.ru}`);
    for (const part of item.de.split('-')) assert.match(part, /[aeiouäöüy]/i, `${item.de}`);
  }
});

test('школа: счёт — ответы верные и в пределах уровня', () => {
  const rng = seeded(7);
  for (let i = 0; i < 400; i += 1) {
    for (const level of [1, 2, 3, 4]) {
      const t = sc.makeTask('math', level, rng, 'de');
      assert.ok(t.options.includes(t.answer), JSON.stringify(t));
      assert.ok(uniq(t.options));
      if (t.kind === 'house') { assert.equal(t.left + t.right, t.top); assert.equal(t.answer, t.right); continue; }
      const result = t.op === '+' ? t.a + t.b : t.a - t.b;
      assert.equal(t.result, result);
      assert.ok(result >= 0);
      if (t.missing === 'b') assert.equal(t.answer, t.b); else assert.equal(t.answer, result);
      const max = Math.max(t.a, t.b, result);
      if (level === 1) assert.ok(max <= 5, JSON.stringify(t));
      if (level === 2) assert.ok(max <= 10, JSON.stringify(t));
      if (level === 3 && t.missing !== 'b') {
        assert.ok(max <= 20);
        assert.equal(Math.floor(t.a / 10), Math.floor(result / 10), `без перехода: ${JSON.stringify(t)}`);
      }
      if (level === 4) {
        assert.ok(max <= 20);
        assert.notEqual(Math.floor(t.a / 10), Math.floor(result / 10), `с переходом: ${JSON.stringify(t)}`);
      }
    }
  }
});

test('школа: сравнение, соседи, сколько', () => {
  const rng = seeded(11);
  for (let i = 0; i < 300; i += 1) {
    for (const level of [1, 2, 3]) {
      const t = sc.makeTask('count', level, rng, 'ru');
      if (t.kind === 'howMany') { assert.ok(t.options.includes(t.n)); assert.ok(t.n >= 1 && t.n <= 20); }
      if (t.kind === 'more') {
        assert.notEqual(t.left.n, t.right.n);
        const bigger = t.left.n > t.right.n ? 'left' : 'right';
        assert.equal(t.answer, t.ask === 'more' ? bigger : (bigger === 'left' ? 'right' : 'left'));
      }
      if (t.kind === 'compare') assert.equal(t.answer, t.a > t.b ? '>' : t.a < t.b ? '<' : '=');
      if (t.kind === 'neighbor') {
        const gap = t.row.indexOf(null);
        const full = t.row.map((n, k) => (k === gap ? t.answer : n));
        assert.equal(full[1] - full[0], 1); assert.equal(full[2] - full[1], 1);
        assert.ok(t.options.includes(t.answer));
      }
    }
  }
});

test('школа: отличия — столько, сколько обещано', () => {
  const rng = seeded(3);
  for (let i = 0; i < 200; i += 1) {
    for (const level of [1, 2, 3]) {
      const t = sc.makeTask('diff', level, rng, 'de');
      assert.equal(t.diffs.length, level === 1 ? 3 : level === 2 ? 4 : 5, JSON.stringify(t.diffs));
      const changed = t.right.filter((r, k) => r.added || r.hidden || r.s !== 1 || (t.left[k] && r.e !== t.left[k].e));
      assert.equal(changed.length, t.diffs.length);
    }
  }
});

test('школа: слоги', () => {
  const rng = seeded(5);
  for (let i = 0; i < 300; i += 1) {
    for (const lang of LANGS) {
      for (const level of [1, 2, 3]) {
        const t = sc.makeTask('syll', level, rng, lang);
        if (t.kind === 'build') { assert.equal(t.options[t.answer].text, t.syl.join('')); assert.ok(uniq(t.options.map(o => o.e))); }
        if (t.kind === 'missing') {
          const gap = t.syl.indexOf(null);
          assert.equal(t.options[t.answer], t.target.syl[gap]);
          assert.ok(uniq(t.options.map(o => o.toLowerCase())), JSON.stringify(t.options));
        }
        if (t.kind === 'count') assert.equal(t.answer, t.target.syl.length);
        if (t.kind === 'first') { assert.equal(t.options[t.answer], t.target.syl[0]); assert.ok(uniq(t.options.map(o => o.toLowerCase())), JSON.stringify(t.options)); }
        if (level === 1 && (t.kind === 'build')) assert.equal(t.syl.length, 2);
      }
    }
  }
});

test('школа: пазл, ряды, лишнее, тени', () => {
  const rng = seeded(9);
  for (let i = 0; i < 300; i += 1) {
    for (const level of [1, 2, 3]) {
      const p = sc.makeTask('puzzle', level, rng, 'de');
      const right = p.options[p.answer];
      assert.deepEqual([right.c, right.r, right.rot], [p.hole.c, p.hole.r, 0]);
      assert.equal(p.options.filter(o => o.c === p.hole.c && o.r === p.hole.r && o.rot === 0).length, 1);

      const r = sc.makeTask('pattern', level, rng, 'de');
      if (r.kind === 'numbers') {
        assert.equal(r.answer, r.seq[r.seq.length - 1] + r.step);
        assert.ok(r.options.includes(r.answer)); assert.ok(uniq(r.options)); assert.ok(r.answer >= 0 && r.answer <= 100);
        assert.ok(r.seq.every(n => n >= 0));
      } else {
        const unit = r.unit;
        const firstOf = {};
        r.seq.forEach((el, k) => { const l = unit[k % unit.length]; if (!firstOf[l]) firstOf[l] = el; else assert.deepEqual(el, firstOf[l]); });
        const want = firstOf[unit[r.seq.length % unit.length]];
        assert.deepEqual(r.options[r.answer], want);
        assert.ok(uniq(r.options));
      }

      for (const lang of LANGS) {
        const o = sc.makeTask('odd', level, rng, lang);
        const words = sc.words(lang);
        const cats = o.items.map(it => words.find(w => w.e === it.e).c);
        assert.equal(cats.filter(c => c === o.category).length, 3);
        assert.notEqual(cats[o.answer], o.category);

        const s = sc.makeTask('shadow', level, rng, lang);
        assert.equal(s.options[s.answer].e, s.target.e);
        assert.ok(uniq(s.options.map(x => x.e)));
      }
    }
  }
});

test('школа: наборы, урок дня, уровни и звёзды', () => {
  const state = { progress: {} };
  const rng = seeded(13);
  const set = sc.buildSet(state, 'math', rng, 'de');
  assert.equal(set.length, 6);
  assert.ok(set.every(st => st.kind === 'school' && st.board === set[0].board));
  assert.equal(sc.buildSet(state, 'diff', rng, 'de').length, 3);
  const lesson = sc.buildLesson(state, rng, 'ru');
  assert.equal(lesson.length, 6);
  assert.equal(new Set(lesson.map(st => st.type)).size, 6);
  assert.ok(lesson.some(st => st.type === 'diff'));

  // Всё с первого раза — уровень растёт; почти всё с ошибками — падает (не ниже 1).
  let res = sc.recordSet(state, Array.from({ length: 6 }, () => ({ type: 'math', firstTry: true })), '2026-10-14');
  assert.deepEqual(res.levelUps, ['math']);
  assert.equal(sc.levelOf(state, 'math'), 2);
  assert.equal(res.stars, 7);
  sc.recordSet(state, Array.from({ length: 6 }, (_, k) => ({ type: 'math', firstTry: k === 0 })), '2026-10-14');
  assert.equal(sc.levelOf(state, 'math'), 1);
  sc.recordSet(state, Array.from({ length: 6 }, () => ({ type: 'math', firstTry: false })), '2026-10-14');
  assert.equal(sc.levelOf(state, 'math'), 1);
  // Дневной предел звёзд.
  for (let k = 0; k < 5; k += 1) res = sc.recordSet(state, Array.from({ length: 6 }, () => ({ type: 'odd', firstTry: true })), '2026-10-14');
  assert.ok(state.progress.school.stars.n <= sc.DAILY_STAR_CAP);
  assert.equal(res.stars, 0);
  assert.ok(res.capped);
  // Новый день — снова можно.
  res = sc.recordSet(state, [{ type: 'odd', firstTry: true }], '2026-10-15');
  assert.equal(res.stars, 1);
  sc.setLevel(state, 'math', 9);
  assert.equal(sc.levelOf(state, 'math'), 4);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../js/data.js');
const core = require('../js/core.js');
const report = require('../js/report.js');

test('отчёт логопеду: даты, звуки, упражнения и мамины оценки, без автооценки речи', () => {
  let state = core.createDefaultState('Александра');
  state = core.completeSession(state, {
    stars: 10, gymIds: ['mushroom', 'house'], gameIds: ['wheel'], soundsList: ['с', 'ш'],
    sounds: { 'с': { said: 12, good: 4, slip: 2 } }, words: { 'сова': { said: 3, good: 0, slip: 2, sound: 'с' } },
    said: 12, good: 4, slip: 2, seconds: 600
  }, '2026-09-22').state;
  const text = report.buildTherapistReport(state, { data, today: '2026-09-23' });
  assert.match(text, /Александра/);
  assert.match(text, /22\.09\.2026 · 10 мин · звуки: С, Ш · гимнастика: Грибочек, Домик/);
  assert.match(text, /С — слова · произнесено: 12/);
  assert.match(text, /сова \(С\): проскочил 2/);
  assert.match(text, /не оценивает произношение автоматически/);
});

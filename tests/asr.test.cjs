const test = require('node:test');
const assert = require('node:assert/strict');
const asr = require('../js/asr.js');

test('проверка слова: нужное слово засчитывается, другое слово и тишина — нет', () => {
  assert.equal(asr.matches(['сова'], 'сова'), true);
  assert.equal(asr.matches(['вот сова'], 'Сова'), true);
  assert.equal(asr.matches(['ежик'], 'ёжик'), true, 'ё и е не различаем');
  assert.equal(asr.matches(['собака'], 'сова'), false);
  assert.equal(asr.matches([], 'сова'), false);
  assert.equal(asr.matches(['синий'], 'синий слон'), false);
  assert.equal(asr.matches(['синий слон'], 'синий слон'), true);
});

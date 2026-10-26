const test = require('node:test');
const assert = require('node:assert/strict');
const recordings = require('../js/recordings.js');

test('записи ребёнка показываются от новых к старым с понятной подписью', () => {
  const rows = recordings.summarizeRecords([
    { id: 'a', createdAt: 10, meta: { label: 'сок', createdAt: 10 } },
    { id: 'b', createdAt: 20, meta: { label: 'сова', createdAt: 20 } }
  ]);
  assert.deepEqual(rows.map(item => [item.id, item.label]), [['b', 'сова'], ['a', 'сок']]);
});

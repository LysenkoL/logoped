const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../js/storage.js');

test('аудиофайл проходит через резервную копию без потери содержимого', async () => {
  const original = new Blob(['мамин голос'], { type: 'audio/webm' });
  const encoded = await storage.blobToRecord('voice:praise:1', original, { phraseKey: 'praise' });
  const restored = storage.recordToBlob(encoded);
  assert.equal(restored.type, 'audio/webm');
  assert.equal(await restored.text(), 'мамин голос');
  assert.equal(encoded.meta.phraseKey, 'praise');
});

test('конверт резервной копии содержит версию, состояние и хранилища', () => {
  const envelope = storage.buildBackupEnvelope({ version: 2 }, { voice: [], child: [], assets: [] }, '2026-09-22T12:00:00.000Z');
  assert.deepEqual(envelope, {
    format: 'yazychok-backup',
    version: 2,
    exportedAt: '2026-09-22T12:00:00.000Z',
    state: { version: 2 },
    stores: { voice: [], child: [], assets: [] }
  });
});

test('неподходящий файл резервной копии отклоняется', () => {
  assert.throws(() => storage.validateBackup({ format: 'other' }), /резервной копией/);
});

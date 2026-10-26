(function (root, factory) {
  const core = typeof module === 'object' && module.exports ? require('./core.js') : root.Yazychok.core;
  const value = factory(core, root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root && root.document) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.storage = value;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (core, root) {
  'use strict';

  const STATE_KEY = 'yazychok-v2';
  const LEGACY_KEY = 'alexandra-speech-v1';
  const DB_NAME = 'yazychok-v2';
  const STORES = ['voice', 'child', 'assets'];
  let dbPromise;

  function arrayBufferToBase64(buffer) {
    if (typeof Buffer !== 'undefined') return Buffer.from(buffer).toString('base64');
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(base64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(base64, 'base64'));
    const binary = atob(base64);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }

  async function blobToRecord(id, blob, meta) {
    return {
      id,
      type: blob.type || 'application/octet-stream',
      base64: arrayBufferToBase64(await blob.arrayBuffer()),
      meta: meta || {}
    };
  }

  function recordToBlob(record) {
    return new Blob([base64ToBytes(record.base64)], { type: record.type || 'application/octet-stream' });
  }

  function buildBackupEnvelope(state, stores, exportedAt) {
    return {
      format: 'yazychok-backup',
      version: 2,
      exportedAt: exportedAt || new Date().toISOString(),
      state,
      stores: {
        voice: stores.voice || [],
        child: stores.child || [],
        assets: stores.assets || []
      }
    };
  }

  function validateBackup(value) {
    if (!value || value.format !== 'yazychok-backup' || value.version !== 2 || !value.state || !value.stores) {
      throw new Error('Этот файл не является резервной копией приложения.');
    }
    return value;
  }

  function openDb() {
    if (!root.indexedDB) return Promise.reject(new Error('IndexedDB недоступна'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        for (const name of STORES) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function transaction(storeName, mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = action(store);
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Операция хранилища отменена'));
    });
  }

  function putBlob(storeName, id, blob, meta) {
    return transaction(storeName, 'readwrite', store => store.put({ id, blob, meta: meta || {}, createdAt: Date.now() }));
  }

  async function getBlob(storeName, id) {
    const record = await transaction(storeName, 'readonly', store => store.get(id));
    return record || null;
  }

  function listBlobs(storeName) {
    return transaction(storeName, 'readonly', store => store.getAll());
  }

  function deleteBlob(storeName, id) {
    return transaction(storeName, 'readwrite', store => store.delete(id));
  }

  function clearStore(storeName) {
    return transaction(storeName, 'readwrite', store => store.clear());
  }

  function loadState() {
    if (!root.localStorage) return core.createDefaultState('');
    try {
      const current = JSON.parse(root.localStorage.getItem(STATE_KEY));
      if (current && current.version >= 2) return core.normalizeState(current);
    } catch (error) {}
    try {
      const legacy = JSON.parse(root.localStorage.getItem(LEGACY_KEY));
      if (legacy) {
        const migrated = core.normalizeState(core.migrateLegacy(legacy));
        saveState(migrated);
        return migrated;
      }
    } catch (error) {}
    return core.createDefaultState('');
  }

  function saveState(state) {
    if (!root.localStorage) return false;
    try {
      root.localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  async function requestPersistence() {
    try {
      if (root.navigator && root.navigator.storage && root.navigator.storage.persist) {
        return await root.navigator.storage.persist();
      }
    } catch (error) {}
    return false;
  }

  async function exportBackup(state) {
    const stores = {};
    for (const storeName of STORES) {
      const items = await listBlobs(storeName).catch(() => []);
      stores[storeName] = [];
      for (const item of items) {
        const encoded = await blobToRecord(item.id, item.blob, Object.assign({}, item.meta, { createdAt: item.createdAt }));
        stores[storeName].push(encoded);
      }
    }
    return buildBackupEnvelope(state, stores);
  }

  async function importBackup(envelope, mode, currentState) {
    const backup = validateBackup(envelope);
    const nextState = mode === 'merge' ? core.mergeState(currentState, backup.state) : backup.state;
    if (mode === 'replace') {
      for (const storeName of STORES) await clearStore(storeName);
    }
    for (const storeName of STORES) {
      for (const record of backup.stores[storeName] || []) {
        await putBlob(storeName, record.id, recordToBlob(record), record.meta || {});
      }
    }
    saveState(nextState);
    return nextState;
  }

  async function migrateLegacyVoice() {
    if (!root.indexedDB) return 0;
    const existing = await listBlobs('voice').catch(() => []);
    if (existing.length) return 0;
    return new Promise(resolve => {
      const request = root.indexedDB.open('alexandra-voice', 1);
      request.onerror = () => resolve(0);
      request.onupgradeneeded = () => resolve(0);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('rec')) { resolve(0); return; }
        const tx = db.transaction('rec', 'readonly');
        const store = tx.objectStore('rec');
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = async () => {
          let count = 0;
          for (const key of keysRequest.result || []) {
            const blob = await new Promise(done => {
              const read = store.get(key);
              read.onsuccess = () => done(read.result);
              read.onerror = () => done(null);
            });
            if (blob) {
              await putBlob('voice', `legacy:${key}`, blob, { phraseKey: String(key), legacy: true });
              count += 1;
            }
          }
          resolve(count);
        };
        keysRequest.onerror = () => resolve(0);
      };
    });
  }

  return {
    STATE_KEY,
    STORES,
    blobToRecord,
    recordToBlob,
    buildBackupEnvelope,
    validateBackup,
    openDb,
    putBlob,
    getBlob,
    listBlobs,
    deleteBlob,
    clearStore,
    loadState,
    saveState,
    requestPersistence,
    exportBackup,
    importBackup,
    migrateLegacyVoice
  };
});

// Оставлен для совместимости со старым ярлыком на рабочем столе.
// Записи ребёнка теперь в разделе «Для мамы» → «Записи ребёнка» (js/parent.js).
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function summarizeRecords(records) {
    return (records || []).map(record => ({
      id: record.id,
      label: record.meta && record.meta.label || 'Без подписи',
      createdAt: Number(record.meta && record.meta.createdAt || record.createdAt || 0),
      blob: record.blob
    })).sort((a, b) => b.createdAt - a.createdAt);
  }
  return { summarizeRecords };
});

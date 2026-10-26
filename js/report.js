(function (root, factory) {
  const value = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.report = value;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function formatDate(value) {
    const parts = String(value || '').split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : String(value || '');
  }

  const LEVEL_NAMES = { '-1': 'говорит хорошо', 0: 'пока не тренируем', 1: 'звук и слоги', 2: 'слова', 3: 'фразы и чистоговорки' };

  function upper(sound) { return String(sound || '').toUpperCase(); }

  // Отчёт логопеду: факты занятий, сколько сказано и мамины оценки. Качество произношения оценивает взрослый.
  function buildTherapistReport(state, options) {
    const opts = options || {};
    const data = opts.data || (root && root.YazychokData) || require('./data.js');
    const exerciseNames = new Map((state.exercises || []).map(item => [item.id, item.name]));
    const history = (state.progress && state.progress.history) || [];
    const stats = (state.progress && state.progress.stats) || { sounds: {}, words: {} };
    const name = (state.profile && state.profile.name) || 'Ребёнок';
    const levels = (state.settings && state.settings.levels) || {};
    const lines = [];
    lines.push(`Сводка домашних занятий: ${name}`);
    lines.push(`Сформировано: ${formatDate(opts.today || '')}`.trim());
    lines.push(`Всего завершённых занятий: ${history.length}`);
    lines.push('');
    lines.push('Звуки и текущий уровень (выставляет мама):');
    for (const sound of data.SOUND_ORDER) {
      const level = Number.isFinite(levels[sound]) ? levels[sound] : 0;
      const info = stats.sounds && stats.sounds[sound];
      if (level === 0 && !info) continue;
      const rated = info ? info.good + info.slip : 0;
      const share = rated ? ` · мама отметила «красиво» ${info.good} из ${rated} (${Math.round((info.good / rated) * 100)}%)` : '';
      lines.push(`  ${upper(sound)} — ${LEVEL_NAMES[level]}${info ? ` · произнесено: ${info.said} · занятий: ${info.sessions}${info.micSec ? ` · звучание в микрофонных играх: ${info.micSec} с` : ''}${share}` : ''}`);
    }
    const words = Object.entries(stats.words || {}).filter(([, info]) => info.slip >= 2)
      .sort((a, b) => b[1].slip - a[1].slip).slice(0, 12);
    if (words.length) {
      lines.push('');
      lines.push('Слова, где мама чаще отмечала «язык проскочил»:');
      for (const [text, info] of words) lines.push(`  ${text} (${upper(info.sound)}): проскочил ${info.slip}, красиво ${info.good}`);
    }
    lines.push('');
    lines.push('Занятия:');
    for (const item of history.slice(-40)) {
      const sounds = (item.sounds || []).map(upper).join(', ') || '—';
      const exercises = (item.gymIds || []).map(id => exerciseNames.get(id) || id).join(', ') || '—';
      const said = item.said ? ` · сказано: ${item.said}` : '';
      const rated = item.good || item.slip ? ` · красиво/проскочил: ${item.good || 0}/${item.slip || 0}` : '';
      lines.push(`  ${formatDate(item.date)} · ${item.minutes || '?'} мин · звуки: ${sounds} · гимнастика: ${exercises}${said}${rated}`);
    }
    lines.push('');
    lines.push('Приложение не оценивает произношение автоматически: «красиво» и «проскочил» отмечает мама во время занятия.');
    return lines.join('\n');
  }

  return { formatDate, buildTherapistReport };
});

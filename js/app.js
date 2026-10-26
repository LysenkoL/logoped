// Загрузчик. Старый ярлык на рабочем столе подключает фиксированный список файлов,
// поэтому новые модули подключаются отсюда — в правильном порядке, до запуска приложения.
(function () {
  'use strict';
  var me = document.currentScript && document.currentScript.getAttribute('src') || 'js/app.js';
  var base = me.replace(/app\.js(\?.*)?$/, '');
  var files = [
    'audio-pack-common.js', 'audio-pack-words.js', 'audio-pack-phrases.js', 'audio-pack-story.js', 'audio-pack-hero.js', 'audio-pack-school.js',
    'mic.js', 'asr.js', 'ui.js', 'emoji-art.js', 'face.js', 'gym.js', 'games.js', 'micgames.js', 'fun.js', 'hero.js', 'story.js', 'extra.js',
    'school-data.js', 'school-core.js', 'school.js', 'rewards.js', 'parent.js', 'main.js'
  ];
  for (var i = 0; i < files.length; i += 1) {
    document.write('<script src="' + base + files[i] + '"><\/script>');
  }
})();

// Проверка сказанного слова без интернета: Vosk (распознавание речи в браузере) по списку слов приложения.
// Он не оценивает, где был язык, — только что ребёнок сказал именно это слово, а не шум или другое слово.
(function (root, factory) {
  const value = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root && root.document) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.asr = value.createAsr();
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const norm = text => String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-я\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = text => norm(text).split(' ').filter(Boolean);

  // Частые слова и междометия: чтобы случайная речь не «притягивалась» к нужному слову.
  const EXTRA = ['да', 'нет', 'мама', 'папа', 'это', 'вот', 'я', 'ты', 'он', 'она', 'не', 'а', 'и', 'ну', 'ой', 'ага', 'как', 'что', 'где', 'там', 'тут',
    'дом', 'кот', 'кит', 'мяч', 'рука', 'нога', 'вода', 'дерево', 'машина', 'кукла', 'мишка', 'зайка', 'птица', 'рыба', 'цветок', 'солнце',
    'дай', 'на', 'еще', 'все', 'привет', 'пока', 'хорошо', 'можно', 'хочу', 'буду', 'сейчас', 'ура', 'один', 'два', 'три'];

  // Совпадение: все слова цели есть среди распознанных (буква «ё» не важна).
  function matches(recognized, target) {
    const got = new Set(recognized.flatMap(tokens));
    const want = tokens(target);
    if (!want.length) return false;
    const hits = want.filter(word => got.has(word)).length;
    return want.length === 1 ? hits === 1 : hits >= Math.ceil(want.length * 0.6);
  }

  function createAsr() {
    let state = 'idle'; // idle | loading | ready | failed
    let error = '';
    let model = null;
    let vocab = null;
    let grammarWords = [];
    let loadPromise = null;
    let base = 'js/';
    let mic = null;
    let ring = [];
    let untapRing = null;
    const listeners = new Set();

    try {
      const me = root.document && root.document.currentScript && root.document.currentScript.getAttribute('src');
      if (me) base = me.replace(/asr\.js(\?.*)?$/, '');
    } catch (e) {}

    function setState(next, err) {
      state = next;
      if (err) error = String(err);
      for (const fn of listeners) { try { fn(state); } catch (e) {} }
    }

    function script(src) {
      return new Promise((resolve, reject) => {
        const node = root.document.createElement('script');
        node.src = src;
        node.onload = () => resolve();
        node.onerror = () => reject(new Error(`не загрузился ${src}`));
        root.document.head.appendChild(node);
      });
    }

    function inVocab(word) {
      if (!vocab) return false;
      return vocab.has(word) || vocab.has(word.replace(/е/g, 'ё'));
    }

    function vocabForm(word) {
      if (vocab.has(word)) return word;
      const yo = word.replace(/е/g, 'ё');
      return vocab.has(yo) ? yo : '';
    }

    // Загрузка: ~45 МБ модели и ~6 МБ движка, несколько секунд в фоне.
    function load(options) {
      if (loadPromise) return loadPromise;
      const words = (options && options.words) || [];
      mic = (options && options.mic) || mic;
      setState('loading');
      loadPromise = (async () => {
        try {
          await script(`${base}vosk/vosk.js`);
          await script(`${base}vosk/vocab-ru.js`);
          await script(`${base}vosk/model-ru-1.js`);
          const count = (root.YZ_VOSK && root.YZ_VOSK.count) || 1;
          for (let i = 2; i <= count; i += 1) await script(`${base}vosk/model-ru-${i}.js`);
          vocab = new Set(String(root.YZ_VOSK_VOCAB || '').split('\n'));
          root.YZ_VOSK_VOCAB = null;
          const b64 = root.YZ_VOSK.parts.join('');
          root.YZ_VOSK.parts = [];
          const buffer = await (await root.fetch(`data:application/gzip;base64,${b64}`)).arrayBuffer();
          model = await root.Vosk.createModel('model.tar.gz', -1, buffer);
          const set = new Set();
          for (const text of [...words, ...EXTRA]) for (const word of tokens(text)) { const form = vocabForm(word); if (form) set.add(form); }
          grammarWords = Array.from(set);
          setState('ready');
          if (mic && mic.isOn()) startRing();
          return true;
        } catch (err) {
          setState('failed', err && err.message ? err.message : err);
          return false;
        }
      })();
      return loadPromise;
    }

    // Кольцевой буфер последних ~0,6 с: начало слова не теряется.
    function startRing() {
      if (!mic || untapRing) return;
      untapRing = mic.tap((chunk, rate, suppressed) => {
        if (suppressed) { ring = []; return; }
        ring.push({ chunk, rate });
        let total = ring.reduce((sum, item) => sum + item.chunk.length / item.rate, 0);
        while (ring.length > 1 && total > 0.6) { total -= ring[0].chunk.length / ring[0].rate; ring.shift(); }
      });
    }

    function canCheck(text) {
      if (state !== 'ready' || !mic || !mic.isOn()) return false;
      const want = tokens(text);
      return want.length > 0 && want.every(inVocab);
    }

    // Начать слушать одно слово. finish() — после того как микрофон услышал конец фразы.
    function begin(text) {
      if (!canCheck(text)) return null;
      startRing();
      const want = tokens(text).map(vocabForm);
      const grammar = Array.from(new Set([...want, ...grammarWords])).concat('[unk]');
      const sampleRate = mic.sampleRate ? mic.sampleRate() : ((ring[0] && ring[0].rate) || 48000);
      let recognizer;
      try { recognizer = new model.KaldiRecognizer(sampleRate, JSON.stringify(grammar)); } catch (err) { return null; }
      const texts = [];
      let finalResolve = null;
      recognizer.on('result', message => {
        const t = message && message.result && message.result.text;
        if (t) texts.push(t);
        if (finalResolve) { const fn = finalResolve; finalResolve = null; fn(); }
      });
      const send = (chunk, rate, suppressed) => {
        // Голос самого приложения (подсказка слова) распознавать нельзя — иначе «сказала» засчитается само.
        const data = suppressed ? new Float32Array(chunk.length) : new Float32Array(chunk);
        try { recognizer.acceptWaveformFloat(data, rate); } catch (err) {}
      };
      for (const item of ring) send(item.chunk, item.rate);
      const untap = mic.tap(send);
      let closed = false;
      const close = () => { if (closed) return; closed = true; untap(); setTimeout(() => { try { recognizer.remove(); } catch (err) {} }, 50); };
      return {
        async finish() {
          if (closed) return { match: false, texts };
          untap();
          await new Promise(resolve => {
            finalResolve = resolve;
            try { recognizer.retrieveFinalResult(); } catch (err) { resolve(); }
            setTimeout(() => { if (finalResolve) { finalResolve = null; resolve(); } }, 2500);
          });
          close();
          return { match: matches(texts, text), texts: texts.slice() };
        },
        cancel: close
      };
    }

    return {
      load, begin, canCheck, matches,
      state: () => state,
      error: () => error,
      onState: fn => { listeners.add(fn); return () => listeners.delete(fn); },
      setMic: value => { mic = value; },
      warm: () => { if (state === 'ready') startRing(); }
    };
  }

  return { createAsr, matches, norm, tokens, EXTRA };
});

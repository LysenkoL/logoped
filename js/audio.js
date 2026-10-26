(function (root, factory) {
  const value = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root && root.document) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.createSpeech = value.createSpeech;
    root.Yazychok.sfx = value.createSfx();
    root.Yazychok.audioKeys = { normalize: value.normalizeMomKey, category: value.categoryOf };
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Старые ключи маминых записей (версия 2) → новые категории.
  const LEGACY_KEYS = {
    hello: 'l:hello', gym: 'l:gymStart', repeat: 'l:say', praise: 'l:praiseName', again: 'l:tryAgain',
    finish: 'l:sessionEnd', puzzle: 'l:piece'
  };

  function normalizeMomKey(key) {
    const value = String(key || '');
    if (LEGACY_KEYS[value]) return LEGACY_KEYS[value];
    if (value.startsWith('sound:')) return `snd:${value.slice(6)}`;
    if (value.startsWith('gym:')) return `ex:${value.slice(4)}`;
    return value;
  }

  // «l:praiseShort:3» → «l:praiseShort»: мамина запись категории заменяет все варианты.
  function categoryOf(key) {
    const parts = String(key).split(':');
    return parts.length >= 3 ? parts.slice(0, 2).join(':') : key;
  }

  function rankRussianVoices(allVoices, limit) {
    const maximum = Number.isInteger(limit) ? limit : Infinity;
    const score = voice => {
      const name = String(voice && voice.name || '').toLowerCase();
      let value = 0;
      if (/natural|online/.test(name)) value += 100;
      if (/светлана|дарья|daria|svetlana|dariya/.test(name)) value += 30;
      if (/microsoft/.test(name)) value += 10;
      return value;
    };
    return (allVoices || [])
      .filter(voice => /^ru/i.test(String(voice && voice.lang || '')))
      .filter((voice, index, items) => items.findIndex(item => item.name === voice.name && item.lang === voice.lang) === index)
      .sort((left, right) => score(right) - score(left))
      .slice(0, maximum);
  }

  // ─────────────────────────────────────────────────────────────
  // Очередь речи.
  // interrupt: новая фраза отменяет ожидающие и обрывает текущую, НО только если текущая не защищена.
  // protect: похвала и важные фразы звучат до конца, их нельзя оборвать нажатием.
  // ─────────────────────────────────────────────────────────────
  function createQueue(player) {
    let generation = 0;
    let chain = Promise.resolve(true);
    let current = null;

    function play(items, options) {
      const opts = Object.assign({ interrupt: true, protect: false, gap: 90 }, options || {});
      const list = (Array.isArray(items) ? items : [items]).filter(Boolean);
      if (opts.interrupt) {
        generation += 1;
        if (current && !current.protect) current.stop();
      }
      const mine = generation;
      const run = async () => {
        for (let index = 0; index < list.length; index += 1) {
          if (mine !== generation) return false;
          const handle = player(list[index]);
          current = { stop: handle.stop, protect: opts.protect };
          await handle.done;
          current = null;
          if (mine !== generation) return false;
          if (opts.gap && index < list.length - 1) await wait(opts.gap);
        }
        return true;
      };
      chain = chain.then(run, run);
      return chain;
    }

    function stopAll() {
      generation += 1;
      if (current) current.stop();
    }

    return { play, stopAll, isPlaying: () => Boolean(current) };
  }

  function createSpeech(options) {
    const storage = options && options.storage;
    let clips = (root.YZ_AUDIO && root.YZ_AUDIO.clips) || {};
    let packName = (root.YZ_AUDIO && root.YZ_AUDIO.name) || '';
    let childName = '';
    let ttsVoice = '';
    let source = 'clips'; // 'clips' — готовые записи, 'browser' — голос браузера (в Edge — естественные «Светлана»/«Дарья»)
    let voices = [];
    let lastEnd = 0;
    const mom = new Map(); // ключ → [Blob]
    const liveUtterances = new Set();
    const lineCursor = {};
    const data = root.YazychokData;

    function refreshVoices() {
      if (!root.speechSynthesis) return;
      voices = rankRussianVoices(root.speechSynthesis.getVoices());
    }
    refreshVoices();
    if (root.speechSynthesis) root.speechSynthesis.addEventListener('voiceschanged', refreshVoices);

    async function loadMom() {
      mom.clear();
      if (!storage) return 0;
      const records = await storage.listBlobs('voice').catch(() => []);
      for (const record of records) {
        const key = normalizeMomKey(record.meta && record.meta.phraseKey);
        if (!key || !record.blob) continue;
        if (!mom.has(key)) mom.set(key, []);
        mom.get(key).push(record.blob);
      }
      return mom.size;
    }

    function momFor(key) {
      return mom.get(key) || mom.get(categoryOf(key)) || null;
    }

    function playUrl(url, revoke, rate) {
      let audio = null;
      let finish;
      const done = new Promise(resolve => {
        let finished = false;
        finish = () => {
          if (finished) return;
          finished = true;
          lastEnd = Date.now();
          if (audio) { try { audio.pause(); } catch (error) {} }
          if (revoke) URL.revokeObjectURL(url);
          resolve();
        };
        try {
          audio = new Audio(url);
          // Медленное повторение («🐢»): тот же голос, чуть медленнее, высота голоса не меняется.
          if (rate && rate !== 1) { audio.playbackRate = rate; audio.preservesPitch = true; }
          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
          // Страховка, если «ended» не придёт: длина клипа + запас (главы сказки длиннее 20 секунд).
          let guard = setTimeout(finish, 30000);
          audio.onloadedmetadata = () => {
            if (!Number.isFinite(audio.duration)) return;
            clearTimeout(guard);
            guard = setTimeout(finish, audio.duration * 1000 + 4000);
          };
        } catch (error) { finish(); }
      });
      return { done, stop: () => finish() };
    }

    // fallback — что играть, если голос браузера не сработал (нет интернета для «Светланы»): готовая запись.
    function tts(text, rate, opts) {
      const o = opts || {};
      let finish;
      let fallbackHandle = null;
      const done = new Promise(resolve => {
        let finished = false;
        finish = () => { if (!finished) { finished = true; lastEnd = Date.now(); resolve(); } };
        if (!root.speechSynthesis || !text) {
          if (o.fallback) { fallbackHandle = o.fallback(); fallbackHandle.done.then(finish); } else finish();
          return;
        }
        const start = () => {
          const utterance = new SpeechSynthesisUtterance(text);
          const foreign = o.lang && !/^ru/i.test(o.lang);
          utterance.lang = o.lang || 'ru-RU';
          // Немецкие задания «Школы» без готовой записи — немецким голосом браузера (лучше «естественный»).
          utterance.voice = foreign
            ? (root.speechSynthesis.getVoices().filter(v => String(v.lang || '').toLowerCase().startsWith(o.lang.slice(0, 2).toLowerCase()))
              .sort((a, b) => Number(/natural|online/i.test(b.name)) - Number(/natural|online/i.test(a.name)))[0] || null)
            : (voices.find(voice => voice.name === (o.voice || ttsVoice)) || voices[0] || null);
          utterance.rate = 0.95 * (rate || 1);
          let spoke = false;
          utterance.onstart = () => { spoke = true; };
          utterance.onend = () => { liveUtterances.delete(utterance); finish(); };
          utterance.onerror = event => {
            liveUtterances.delete(utterance);
            const reason = event && event.error;
            if (o.fallback && !spoke && reason !== 'interrupted' && reason !== 'canceled') { fallbackHandle = o.fallback(); fallbackHandle.done.then(finish); }
            else finish();
          };
          liveUtterances.add(utterance); // иначе Chrome может «потерять» фразу и не вызвать onend
          root.speechSynthesis.speak(utterance);
          const words = String(text).trim().split(/\s+/).length;
          setTimeout(finish, 2500 + words * 700);
        };
        // Баг Chrome: speak сразу после cancel иногда глотает фразу — даём паузу.
        if (root.speechSynthesis.speaking || root.speechSynthesis.pending) {
          root.speechSynthesis.cancel();
          setTimeout(start, 90);
        } else start();
      });
      return { done, stop: () => { try { root.speechSynthesis.cancel(); } catch (error) {} if (fallbackHandle) fallbackHandle.stop(); finish(); } };
    }

    // «бЕлка» / «б+елка» → «бе́лка»: знак ударения (U+0301), его понимают голоса Edge.
    function toAccent(text) {
      return String(text || '')
        .replace(/\+([аеёиоуыэюяАЕЁИОУЫЭЮЯ])/g, (m, v) => `${v.toLowerCase()}\u0301`)
        .replace(/([А-Яа-яЁё])([АЕИОУЫЭЮЯ])/g, (m, a, v) => `${a}${v.toLowerCase()}\u0301`);
    }
    let stressFixes = {};

    // item: { key, text } — ключ готового клипа и запасной текст для синтеза.
    function player(item) {
      const blobs = momFor(item.key);
      const rate = item.rate || 1;
      if (blobs && blobs.length) {
        const blob = blobs[Math.floor(Math.random() * blobs.length)];
        return playUrl(URL.createObjectURL(blob), true, rate);
      }
      const usesName = item.usesName;
      const clip = clips[item.key];
      const clipOk = clip && (!usesName || !childName || childName === packName);
      const fromClip = clipOk ? () => playUrl(clip, false, rate) : null;
      // Мама отметила неверное ударение — фраза звучит голосом браузера с её ударением (запись — запасной вариант).
      const fix = stressFixes[item.key];
      if (fix && fix.fix && voices.length) return tts(toAccent(fill(fix.fix)), rate, { fallback: fromClip });
      // Голос браузера по выбору мамы. Звуки (ССС) и голос героя — всегда из записей.
      const russian = !item.lang || /^ru/i.test(item.lang);
      if (source === 'browser' && russian && !/^(snd|h|hw|hx|pv):/.test(String(item.key))) return tts(String(item.text || '').replace(/\+/g, ''), rate, { fallback: fromClip, voice: item.voice });
      if (fromClip) return fromClip();
      return tts(item.text, rate, { voice: item.voice, lang: item.lang });
    }

    const queue = createQueue(player);

    function fill(text) { return String(text).replace(/\{name\}/g, childName || ''); }

    // Фраза приложения из категории; варианты чередуются по кругу.
    function line(category, index) {
      const variants = (data.LINES[category] || []);
      if (!variants.length) return null;
      let i = index;
      if (!Number.isInteger(i)) {
        lineCursor[category] = ((lineCursor[category] ?? Math.floor(Math.random() * variants.length)) + 1) % variants.length;
        i = lineCursor[category];
      }
      const raw = variants[i % variants.length];
      return { key: `l:${category}:${i % variants.length}`, text: fill(raw), usesName: raw.includes('{name}') };
    }

    const word = entry => ({ key: `w:${entry.text}`, text: entry.tts ? entry.tts.replace(/\+/g, '') : entry.text });
    const syll = text => ({ key: `sy:${text}`, text });
    const phrase = item => ({ key: `ph:${item.id}`, text: item.text });
    const prompt = item => ({ key: `pp:${item.id}`, text: item.prompt || item.text });
    const num = n => ({ key: `n:${n}`, text: data.NUMBERS[n - 1] || String(n) });
    const snd = sound => ({ key: `snd:${sound}`, text: (data.SOUNDS[sound] && data.SOUNDS[sound].demo) || sound });
    const exercise = ex => ({ key: ex.variant ? `ex:${ex.id}:${ex.variant}` : `ex:${ex.id}`, text: ex.child || ex.name });
    const articulation = group => ({ key: `ar:${group}`, text: data.ARTICULATION[group].child });
    const gymTale = id => (data.GYM_TALE && data.GYM_TALE[id] ? { key: `gt:${id}`, text: data.GYM_TALE[id] } : null);
    const pet = entry => ({ key: `pet:${entry.id}`, text: entry.name });
    // Любимый герой говорит своим голосом (отдельные клипы).
    const heroCursor = {};
    function heroLine(category, index) {
      const variants = (data.HERO_LINES && data.HERO_LINES[category]) || [];
      if (!variants.length) return null;
      let i = index;
      if (!Number.isInteger(i)) {
        heroCursor[category] = ((heroCursor[category] ?? Math.floor(Math.random() * variants.length)) + 1) % variants.length;
        i = heroCursor[category];
      }
      const raw = variants[i % variants.length];
      return { key: `h:${category}:${i % variants.length}`, text: fill(raw), usesName: raw.includes('{name}') };
    }
    // Питомец говорит своим голосом.
    const petCursor = {};
    function petLine(category) {
      const variants = (data.PET_LINES && data.PET_LINES[category]) || [];
      if (!variants.length) return null;
      petCursor[category] = ((petCursor[category] ?? Math.floor(Math.random() * variants.length)) + 1) % variants.length;
      const i = petCursor[category];
      return { key: `pv:${category}:${i}`, text: fill(variants[i]) };
    }
    const heroWord = entry => ({ key: `hw:${entry.text}`, text: entry.tts ? entry.tts.replace(/\+/g, '') : entry.text });
    const heroMistake = (entry, mistake) => ({ key: `hx:${entry.text}:${mistake.sound}`, text: mistake.text });
    // Сказка-игра: название главы, части рассказа, подсказки заданий и «получилось».
    const storyTitle = ch => ({ key: `stt:${ch.id}`, text: `${ch.title}.` });
    const storyPart = (ch, i) => ({ key: `stp:${ch.id}:${i}`, text: fill(ch.parts[i]), usesName: String(ch.parts[i]).includes('{name}') });
    const storyPrompt = (ch, i) => ({ key: `stq:${ch.id}:${i}`, text: fill(ch.parts[i].text), usesName: ch.parts[i].text.includes('{name}') });
    const storyDone = (ch, i) => ({ key: `std:${ch.id}:${i}`, text: fill(ch.parts[i].done || ''), usesName: String(ch.parts[i].done || '').includes('{name}') });
    // Вся глава подряд (только послушать).
    const story = ch => [storyTitle(ch), ...ch.parts.map((part, i) => (typeof part === 'string' ? storyPart(ch, i) : null)).filter(Boolean)];
    const storyNext = ch => ({ key: `sn:${ch.id}`, text: fill(ch.next) });
    const sticker = st => ({ key: `stk:${st.id}`, text: st.name });

    return {
      play: (items, opts) => {
        const rate = opts && opts.rate;
        if (!rate || rate === 1) return queue.play(items, opts);
        const list = (Array.isArray(items) ? items : [items]).filter(Boolean).map(item => Object.assign({}, item, { rate }));
        return queue.play(list, opts);
      },
      stop: () => queue.stopAll(),
      isPlaying: () => queue.isPlaying() || Boolean(root.speechSynthesis && root.speechSynthesis.speaking),
      msSinceEnd: () => Date.now() - lastEnd,
      line, word, syll, phrase, prompt, num, snd, exercise, articulation, gymTale, pet, story, storyNext, storyTitle, storyPart, storyPrompt, storyDone, sticker, heroLine, heroWord, heroMistake, petLine,
      loadMom,
      hasMom: key => Boolean(momFor(key)),
      hasClip: key => Boolean(clips[key]),
      setName: name => { childName = String(name || '').trim(); },
      setVoice: name => { ttsVoice = name || ''; },
      setSource: value => { source = value === 'browser' ? 'browser' : 'clips'; },
      source: () => source,
      getVoices: () => voices.slice(),
      refreshVoices,
      reloadClips: () => { clips = (root.YZ_AUDIO && root.YZ_AUDIO.clips) || {}; packName = (root.YZ_AUDIO && root.YZ_AUDIO.name) || ''; },
      testTts: (text, voiceName) => queue.play([{ key: '__tts__', text, voice: voiceName }], { interrupt: true }),
      sayStressed: text => queue.play([{ key: '__tts__', text: toAccent(text) }], { interrupt: true }),
      setStressFixes: value => { stressFixes = value && typeof value === 'object' ? value : {}; },
      canBrowserVoice: () => voices.length > 0,
      voices: () => voices.slice(),
      bestVoice: () => voices.find(v => /natural|online/i.test(v.name)) || null,
      toAccent
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Звуковые эффекты — синтезируются, файлов не нужно.
  // ─────────────────────────────────────────────────────────────
  function createSfx() {
    let ctx = null;
    let master = null;
    let lastAt = 0;
    let enabled = true;
    function context() {
      if (!ctx) {
        const Ctx = root.AudioContext || root.webkitAudioContext;
        if (!Ctx) return null;
        ctx = new Ctx();
        // Эффекты заметно тише голоса, чтобы не заглушать слова.
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    function tone(freq, start, dur, type, gain, slideTo) {
      const c = context(); if (!c) return;
      const t = c.currentTime + start;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    function noise(start, dur, gain, freq) {
      const c = context(); if (!c) return;
      const length = Math.floor(c.sampleRate * dur);
      const buffer = c.createBuffer(1, length, c.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = c.createBufferSource(); src.buffer = buffer;
      const filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = freq || 1200;
      const g = c.createGain(); g.gain.value = gain || 0.25;
      src.connect(filter); filter.connect(g); g.connect(master);
      src.start(c.currentTime + start);
    }
    const sounds = {
      pop: () => { tone(620, 0, 0.09, 'triangle', 0.22, 180); noise(0, 0.06, 0.18, 2200); },
      ding: () => { tone(880, 0, 0.35, 'sine', 0.16); tone(1320, 0.06, 0.4, 'sine', 0.1); },
      sparkle: () => { [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, i * 0.06, 0.18, 'sine', 0.07)); },
      whoosh: () => noise(0, 0.35, 0.22, 900),
      boing: () => tone(260, 0, 0.35, 'triangle', 0.18, 520),
      tick: () => tone(1400, 0, 0.04, 'square', 0.05),
      soft: () => tone(330, 0, 0.18, 'sine', 0.12, 250),
      click: () => tone(900, 0, 0.03, 'square', 0.06),
      fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.28, 'triangle', 0.14)); tone(1047, 0.46, 0.6, 'triangle', 0.12); },
      coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.08, 0.25, 'square', 0.07); },
      chest: () => { tone(196, 0, 0.2, 'sawtooth', 0.06); [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.18 + i * 0.07, 0.3, 'sine', 0.1)); },
      step: () => tone(520, 0, 0.07, 'triangle', 0.1, 700),
      // Игрушки питомца: свои короткие мелодии (придуманы здесь).
      piano: () => { [523, 587, 659, 784, 659, 784, 1047, 784, 659, 523].forEach((f, i) => tone(f, i * 0.26, 0.42, 'triangle', 0.12)); },
      drum: () => { [0, 0.35, 0.7, 0.88, 1.05, 1.4, 1.75, 1.93, 2.1].forEach((t, i) => { tone(i % 3 === 2 ? 180 : 110, t, 0.16, 'sine', 0.3, 60); noise(t, 0.05, 0.12, 1500); }); },
      trumpet: () => { [392, 392, 523, 392, 659, 523].forEach((f, i) => tone(f, i * 0.32, i === 5 ? 0.7 : 0.26, 'sawtooth', 0.06)); },
      car: () => { tone(90, 0, 1.6, 'sawtooth', 0.06, 160); tone(660, 1.7, 0.18, 'square', 0.05); tone(660, 1.95, 0.18, 'square', 0.05); },
      bubbles: () => { for (let i = 0; i < 8; i += 1) tone(900 + Math.random() * 900, 0.3 + i * 0.32, 0.06, 'sine', 0.08, 1800); },
      clap: () => { noise(0, 0.07, 0.4, 1600); noise(0.012, 0.05, 0.25, 2600); }
    };
    return {
      play(name) {
        if (!enabled || !sounds[name]) return;
        lastAt = Date.now();
        try { sounds[name](); } catch (error) {}
      },
      unlock() { context(); },
      msSince: () => Date.now() - lastAt,
      setEnabled: value => { enabled = value !== false; }
    };
  }

  return { createQueue, createSpeech, createSfx, rankRussianVoices, normalizeMomKey, categoryOf };
});

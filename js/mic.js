(function (root, factory) {
  const value = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root && root.document) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.mic = value.createMic();
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  // Пороги по чувствительности 1..5 (во сколько раз громче фонового шума).
  const VOICE_K = [9, 6, 4.2, 3, 2.2];
  const HISS_K = [10, 7, 5, 3.4, 2.4];

  // Чистая функция: по энергиям полос решает, есть ли голос/шипение. Удобно тестировать.
  function classify(frame, floors, sensitivity) {
    const s = Math.max(1, Math.min(5, Math.round(sensitivity || 3))) - 1;
    const energy = frame.energy;
    const voice = energy > floors.energy * VOICE_K[s] && energy > 2e-6;
    const hissRatio = frame.high / (frame.low + 1e-12);
    const hiss = frame.high > floors.high * HISS_K[s] && hissRatio > 0.22 && frame.high > 2e-9;
    const level = Math.max(0, Math.min(1, Math.log10(Math.max(1, energy / (floors.energy * 1.5))) / 2.2));
    const hissLevel = Math.max(0, Math.min(1, Math.log10(Math.max(1, frame.high / (floors.high * 1.5))) / 2.2));
    return { voice, hiss, level, hissLevel, hissRatio };
  }

  // Периодичность (есть ли «голос» с высотой тона): автокорреляция на прореженном сигнале.
  // Голос и гласные — 0.5…0.95; шум, хлопки, стук, шипение — обычно ниже 0.35.
  function periodicity(samples, sampleRate, scratch) {
    const step = 4;
    const n = Math.floor(samples.length / step);
    const d = scratch && scratch.length >= n ? scratch : new Float32Array(n);
    let mean = 0;
    for (let i = 0; i < n; i += 1) { d[i] = samples[i * step]; mean += d[i]; }
    mean /= n;
    let r0 = 0;
    for (let i = 0; i < n; i += 1) { d[i] -= mean; r0 += d[i] * d[i]; }
    if (r0 < 1e-7) return 0;
    const sr = sampleRate / step;
    const minLag = Math.max(2, Math.floor(sr / 500));
    const maxLag = Math.min(n - 8, Math.ceil(sr / 75));
    let best = 0;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let r = 0; let e1 = 0; let e2 = 0;
      for (let i = 0; i < n - lag; i += 1) { const a = d[i]; const b = d[i + lag]; r += a * b; e1 += a * a; e2 += b * b; }
      const v = r / (Math.sqrt(e1 * e2) + 1e-12);
      if (v > best) best = v;
    }
    return best;
  }

  // Строгие признаки кадра для игр (подобраны по записям: хлопки, стук, клавиши, шорох, гласные, с/ш/з/ж/ц/ч/р/л).
  //  • sib — «чистое» шипение: в верхней полосе в разы больше энергии, чем в нижней (у с, ш, ц — в десятки-тысячи раз;
  //    у хлопка, шороха и стука — примерно поровну или меньше);
  //  • sibVoiced — звонкое шипение (з, ж): есть тон голоса и заметная верхняя полоса (у гласных и л/р её почти нет);
  //  • tone — голос с высотой тона (а, л, р…).
  const SIB_RATIO = 3;
  const VOICED_RATIO = 0.02;
  // Настройка под голос ребёнка (мама записывает ССС / ШШШ): граница «с»/«ш» и порог «чистоты» шипения.
  let PROFILE = null;
  function setProfile(p) { PROFILE = p && Number.isFinite(p.split) ? p : null; }
  function strictFeatures(frame, result) {
    const ratio = result.hissRatio || 0;
    const sibRatio = PROFILE && Number.isFinite(PROFILE.sibRatio) ? PROFILE.sibRatio : SIB_RATIO;
    const sib = Boolean(result.hiss) && ratio >= sibRatio;
    const sibVoiced = Boolean(result.voice) && frame.periodic >= 0.4 && ratio >= VOICED_RATIO && (result.hissLevel || 0) >= 0.45;
    const tone = Boolean(result.voice) && frame.periodic >= 0.45;
    return { sib, sibVoiced, tone };
  }

  // ─────────────────────────────────────────────────────────────
  // Детектор звука для игр: что считать «правильным» звучанием.
  //  • тянущиеся с, з, ш, ж, щ — устойчивое шипение не короче 120 мс;
  //    «с»-звуки — высокое шипение, «ш»-звуки — пониже;
  //  • ц, ч — короткий шипящий «выстрел» 90–420 мс после тишины, с «плато» громкости
  //    (у хлопка и щелчка громкость сразу падает — не считаются; долгое «ссс» — тоже нет);
  //  • л, р — голос с тоном, который держится (стук затухает за 1–2 кадра).
  // ─────────────────────────────────────────────────────────────
  const S_CLASS = ['с', 'сь', 'з', 'зь', 'ц'];
  const SH_CLASS = ['ш', 'ж', 'щ', 'ч'];
  const VOICED = ['з', 'зь', 'ж'];
  const TONE = ['л', 'ль', 'р', 'рь'];
  const MIN_RUN = 4;
  const TONE_RUN = 5;

  function createSoundDetector(sound, options) {
    const opts = options || {};
    const burst = opts.mode === 'burst' || (!opts.mode && ['ц', 'ч'].includes(sound));
    const tone = opts.mode === 'voice' || TONE.includes(sound);
    const voiced = VOICED.includes(sound);
    let run = 0; let quiet = 0; let armed = false; let wasManual = false;
    let runPeak = 0; let strong = 0; let runEnergies = []; let noisy = 0;
    const recent = [];
    function qualifies(f) {
      if (tone) return Boolean(f.tone);
      const hissy = voiced ? (f.sib || f.sibVoiced) : f.sib;
      if (!hissy) return false;
      if (f.centroid) {
        const prof = opts.profile || PROFILE;
        const sMin = prof ? prof.split - 250 : 5300;
        const shMax = prof ? prof.split + 250 : 5800;
        if (S_CLASS.includes(sound) && f.centroid < sMin) return false;
        if (SH_CLASS.includes(sound) && f.centroid > shMax) return false;
      }
      return true;
    }
    return {
      // Возвращает: active — звучит ли сейчас правильно; credit — сколько кадров по 30 мс засчитать; event — «выстрел» засчитан.
      feed(f) {
        if (!f || f.suppressed) return { skip: true, active: false, credit: 0, event: false };
        if (f.manual) {
          const event = burst && !wasManual;
          wasManual = true;
          return { active: true, credit: 1, event };
        }
        wasManual = false;
        const energy = f.energy || 0;
        recent.push(energy); if (recent.length > 5) recent.shift();
        const recentPeak = Math.max.apply(null, recent);
        // Затухающий удар: громкость за кадр упала в 7+ раз — это хвост стука/хлопка, а не звук.
        const decaying = energy < recentPeak * 0.14;
        const q = qualifies(f) && !decaying;
        const silent = !f.voice && !f.hiss;
        if (burst) {
          let event = false;
          if (q) {
            if (run === 0) { armed = quiet >= 3; runPeak = 0; runEnergies = []; }
            run += 1; runEnergies.push(energy); runPeak = Math.max(runPeak, energy);
          } else {
            if (run >= 3 && run <= 14 && armed) {
              strong = runEnergies.filter(e => e >= runPeak * 0.25).length;
              if (strong >= 2) event = true;
            }
            run = 0;
          }
          // Пауза перед «выстрелом»: тишина ≥ 90 мс; другой звук дольше 2 кадров (речь, гласная) паузу сбрасывает; 1–2 кадра — это «т» в начале «ц».
          if (silent) { quiet += 1; noisy = 0; } else if (q) { noisy = 0; } else { noisy += 1; if (noisy >= 3) quiet = 0; }
          return { active: q && armed, credit: 0, event };
        }
        run = q ? run + 1 : 0;
        const need = tone ? TONE_RUN : MIN_RUN;
        const credit = run === need ? need : (run > need ? 1 : 0);
        return { active: run >= need, credit, event: false };
      }
    };
  }

  // Разбор записи-настройки: кадры, где ребёнок тянул «ССС» и «ШШШ» (и тишина). Возвращает профиль или причину отказа.
  function median(list) { const a = list.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; }
  function quantile(list, q) { const a = list.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * q))] : NaN; }
  function analyzeCalibration(rec) {
    const loud = frames => (frames || []).filter(f => f && f.hiss && !f.suppressed && (f.hissRatio || 0) >= 1);
    const s = loud(rec.s); const sh = loud(rec.sh);
    if (s.length < 12) return { ok: false, reason: 'Мало «С» — пусть тянет «ссс» подольше и поближе к микрофону.' };
    const sC = median(s.map(f => f.centroid));
    const sRatio = quantile(s.map(f => f.hissRatio), 0.25);
    let split;
    let shC = NaN;
    if (sh.length >= 12) {
      shC = median(sh.map(f => f.centroid));
      if (shC >= sC - 300) return { ok: false, reason: '«С» и «Ш» звучат для микрофона одинаково. Попробуйте ещё раз: «ссс» — с улыбкой, «шшш» — губы трубочкой.', sC, shC };
      split = (sC + shC) / 2;
    } else {
      split = sC - 900;
    }
    split = Math.max(3600, Math.min(6600, split));
    const sibRatio = Math.max(1.6, Math.min(3, sRatio * 0.5));
    return { ok: true, profile: { split: Math.round(split), sibRatio: Math.round(sibRatio * 100) / 100, sC: Math.round(sC), shC: Number.isFinite(shC) ? Math.round(shC) : null } };
  }

  // Что микрофон «слышит» сейчас — для маминой проверки.
  function frameLabel(f) {
    if (!f) return 'quiet';
    if (f.suppressed) return 'app';
    if (f.sib) {
      const split = PROFILE ? PROFILE.split : 5550;
      return f.centroid >= split ? 's' : 'sh';
    }
    if (f.sibVoiced) return 'zh';
    if (f.tone) return 'voice';
    if (f.voice || f.hiss) return 'noise';
    return 'quiet';
  }

  // Слежение за фоном: быстро вниз, медленно вверх, не учимся во время речи.
  function updateFloor(floor, value, active) {
    if (!Number.isFinite(floor) || floor <= 0) return value || 1e-9;
    if (value < floor) return floor * 0.85 + value * 0.15;
    if (active) return floor;
    return floor * 0.997 + value * 0.003;
  }

  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
    writeString(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeString(8, 'WAVE');
    writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeString(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i += 1) {
      const v = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function createMic() {
    let stream = null;
    let ctx = null;
    let analyser = null;
    let freq = null;
    let time = null;
    let timer = null;
    let sensitivity = 3;
    let enabled = true;
    let suppressFn = () => false;
    let spaceDown = false;
    let manualPulse = 0;
    const floors = { energy: 0, high: 0, low: 0, peak: 0 };
    const listeners = new Set();
    let warm = 0;
    let lastFrame = { voice: false, hiss: false, level: 0, hissLevel: 0, energy: 0, peak: 0, manual: false, suppressed: false };
    let permission = 'unknown';
    let releaseTimer = null;
    let sourceNode = null;
    let processor = null;
    const taps = new Set();

    // Сырые отрезки звука для распознавания слов (Vosk). Подключается, только когда кто-то слушает.
    function ensureProcessor() {
      if (processor || !ctx || !sourceNode || !taps.size) return;
      try {
        processor = ctx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = event => {
          if (!taps.size) return;
          const data = new Float32Array(event.inputBuffer.getChannelData(0));
          // Пока звучит голос приложения, звук помечается: его нельзя принять за слово ребёнка.
          let suppressed = false;
          try { suppressed = Boolean(suppressFn()); } catch (error) {}
          for (const fn of taps) { try { fn(data, ctx.sampleRate, suppressed); } catch (error) {} }
        };
        const mute = ctx.createGain();
        mute.gain.value = 0;
        sourceNode.connect(processor);
        processor.connect(mute);
        mute.connect(ctx.destination);
      } catch (error) { processor = null; }
    }

    function tap(fn) {
      taps.add(fn);
      ensureProcessor();
      return () => taps.delete(fn);
    }

    function bandPower(from, to) {
      const binHz = ctx.sampleRate / analyser.fftSize;
      const a = Math.max(1, Math.floor(from / binHz));
      const b = Math.min(freq.length - 1, Math.ceil(to / binHz));
      let sum = 0;
      for (let i = a; i <= b; i += 1) sum += Math.pow(10, freq[i] / 10);
      return sum / (b - a + 1);
    }

    // Центр тяжести спектра в полосе шипения: «с» выше (≈5–8 кГц), «ш» ниже (≈2,5–4,5 кГц).
    function centroid(from, to) {
      const binHz = ctx.sampleRate / analyser.fftSize;
      const a = Math.max(1, Math.floor(from / binHz));
      const b = Math.min(freq.length - 1, Math.ceil(to / binHz));
      let num = 0; let den = 0;
      for (let i = a; i <= b; i += 1) { const pw = Math.pow(10, freq[i] / 10); num += pw * i * binHz; den += pw; }
      return den > 0 ? num / den : 0;
    }
    let scratch = null;
    // Страховка фона: минимум энергии по блокам ~1,5 с. Фон не может быть сильно ниже минимума за ~6 с
    // (если фон «застрял» внизу, любой шум комнаты считался бы голосом).
    const minBlocks = []; let block = null; let blockN = 0;
    function guardFloors(frame) {
      if (!block) block = { energy: Infinity, high: Infinity, low: Infinity, peak: Infinity };
      for (const k of ['energy', 'high', 'low', 'peak']) block[k] = Math.min(block[k], frame[k]);
      blockN += 1;
      if (blockN < 50) return;
      minBlocks.push(block); if (minBlocks.length > 4) minBlocks.shift();
      block = null; blockN = 0;
      if (minBlocks.length < 4) return;
      for (const k of ['energy', 'high', 'low', 'peak']) {
        const m = Math.min.apply(null, minBlocks.map(b => b[k]));
        if (Number.isFinite(m) && floors[k] < m * 0.5) floors[k] = m * 0.6;
      }
    }

    function tick() {
      if (!analyser) {
        const manual = spaceDown || Date.now() < manualPulse;
        lastFrame = { energy: 0, low: 0, high: 0, peak: 0, voice: manual, hiss: manual, sib: manual, sibVoiced: manual, tone: manual, periodic: 0, centroid: 0, level: manual ? 0.8 : 0, hissLevel: manual ? 0.8 : 0, peakRatio: 0, manual, suppressed: false, t: Date.now() };
        for (const fn of listeners) { try { fn(lastFrame); } catch (error) {} }
        return;
      }
      analyser.getFloatFrequencyData(freq);
      analyser.getFloatTimeDomainData(time);
      let sq = 0; let peak = 0;
      for (let i = 0; i < time.length; i += 1) { const v = time[i]; sq += v * v; const a = Math.abs(v); if (a > peak) peak = a; }
      if (!scratch) scratch = new Float32Array(Math.ceil(time.length / 4));
      const frame = { energy: sq / time.length, low: bandPower(90, 1000), high: bandPower(2600, 11000), peak,
        periodic: periodicity(time, ctx.sampleRate, scratch), centroid: centroid(2000, 11000) };
      const suppressed = suppressFn();
      // Цифровая тишина (нули в начале потока) не должна опускать фон: иначе любой шум потом «голос».
      if (frame.energy < 1e-11) {
        lastFrame = Object.assign({}, frame, { voice: false, hiss: false, sib: false, sibVoiced: false, tone: false, level: 0, hissLevel: 0, hissRatio: 0, manual: spaceDown || Date.now() < manualPulse, suppressed, t: Date.now() });
        if (lastFrame.manual) Object.assign(lastFrame, { voice: true, hiss: true, sib: true, sibVoiced: true, tone: true, level: 0.8, hissLevel: 0.8 });
        for (const fn of listeners) { try { fn(lastFrame); } catch (error) {} }
        return;
      }
      guardFloors(frame);
      const result = warm > 12 ? classify(frame, floors, sensitivity) : { voice: false, hiss: false, level: 0, hissLevel: 0 };
      const active = result.voice || result.hiss;
      floors.energy = updateFloor(floors.energy, frame.energy, active && !suppressed);
      floors.high = updateFloor(floors.high, frame.high, active && !suppressed);
      floors.low = updateFloor(floors.low, frame.low, active && !suppressed);
      floors.peak = updateFloor(floors.peak, frame.peak, active && !suppressed);
      warm += 1;
      const manual = spaceDown || Date.now() < manualPulse;
      const strict = strictFeatures(frame, result);
      lastFrame = Object.assign({}, frame, result, {
        voice: manual || (!suppressed && result.voice),
        hiss: manual || (!suppressed && result.hiss),
        sib: manual || (!suppressed && strict.sib),
        sibVoiced: manual || (!suppressed && strict.sibVoiced),
        tone: manual || (!suppressed && strict.tone),
        level: manual ? 0.8 : (suppressed ? 0 : result.level),
        hissLevel: manual ? 0.8 : (suppressed ? 0 : result.hissLevel),
        peakRatio: floors.peak > 0 ? frame.peak / floors.peak : 0,
        manual,
        suppressed,
        t: Date.now()
      });
      for (const fn of listeners) { try { fn(lastFrame); } catch (error) {} }
    }

    async function start() {
      clearTimeout(releaseTimer);
      if (!enabled) return false;
      if (stream && analyser) { if (ctx.state === 'suspended') await ctx.resume().catch(() => {}); return true; }
      if (!root.navigator.mediaDevices || !root.navigator.mediaDevices.getUserMedia) { permission = 'unsupported'; return false; }
      try {
        stream = await root.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
        const Ctx = root.AudioContext || root.webkitAudioContext;
        ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        sourceNode = source;
        processor = null;
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.15;
        source.connect(analyser);
        freq = new Float32Array(analyser.frequencyBinCount);
        time = new Float32Array(analyser.fftSize);
        warm = 0;
        ensureLoop();
        ensureProcessor();
        permission = 'granted';
        return true;
      } catch (error) {
        permission = 'denied';
        stream = null;
        return false;
      }
    }

    function ensureLoop() {
      if (!timer) timer = setInterval(tick, 30);
    }

    function stop() {
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null;
      if (ctx) ctx.close().catch(() => {});
      ctx = null; analyser = null; sourceNode = null; processor = null;
    }

    function subscribe(fn) {
      ensureLoop();
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    // Ждём, пока ребёнок что-то скажет, и тишину после. Кнопка/пробел засчитывают сразу.
    function listen(options) {
      // minVoicedMs — сколько всего должно быть голоса в высказывании (короткий шум не считается словом),
      // needHissMs — сколько шипения/свиста нужно, если в слове есть свистящий или шипящий звук.
      const opts = Object.assign({ timeoutMs: 7000, minMs: 120, endSilenceMs: 450, maxMs: 4500, record: false, minVoicedMs: 0, needHissMs: 0 }, options || {});
      let resolveFn;
      let finished = false;
      let recorder = null;
      let chunks = [];
      let recordStart = 0;
      let onsetAt = 0;
      const promise = new Promise(resolve => { resolveFn = resolve; });
      if (opts.record && stream && root.MediaRecorder) {
        try {
          recorder = new MediaRecorder(stream);
          recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
          recorder.start();
          recordStart = Date.now();
        } catch (error) { recorder = null; }
      }
      const began = Date.now();
      let voiceMs = 0; let silenceMs = 0; let speaking = false; let startedAt = 0;
      let totalVoice = 0; let totalHiss = 0; let ignored = 0;
      const finish = async (heard, how) => {
        if (finished) return;
        finished = true;
        unsubscribe();
        let blob = null;
        if (recorder) {
          blob = await new Promise(resolve => {
            recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
            try { recorder.stop(); } catch (error) { resolve(null); }
          });
          if (blob && heard && onsetAt) blob = await trimBlob(blob, Math.max(0, (onsetAt - recordStart) / 1000 - 0.25)).catch(() => blob);
        }
        resolveFn({ heard, how, blob, duration: startedAt ? Date.now() - startedAt : 0, voicedMs: totalVoice, hissMs: totalHiss, ignored });
      };
      const unsubscribe = subscribe(frame => {
        const now = frame.t;
        if (frame.manual && !frame.suppressed) { finish(true, 'manual'); return; }
        // Шёпот: голоса почти нет, есть шум дыхания — считаем и его.
        const active = frame.voice || (opts.activeWhenHiss && frame.hiss && !frame.suppressed);
        if (!speaking) {
          if (active) { voiceMs += 30; if (voiceMs >= opts.minMs) { speaking = true; startedAt = now - voiceMs; onsetAt = startedAt; totalVoice = voiceMs; totalHiss = frame.hiss ? 30 : 0; silenceMs = 0; } }
          else voiceMs = Math.max(0, voiceMs - 30);
          if (now - began > opts.timeoutMs) finish(false, 'timeout');
        } else {
          if (active) { silenceMs = 0; totalVoice += 30; } else silenceMs += 30;
          if ((frame.sib || frame.sibVoiced) && !frame.suppressed) totalHiss += 30;
          const long = now - startedAt > opts.maxMs;
          if (silenceMs >= opts.endSilenceMs || long) {
            const enough = totalVoice >= opts.minVoicedMs && totalHiss >= opts.needHissMs;
            if (enough || long) { finish(true, 'mic'); return; }
            // Слишком коротко — это был шум или «э»: ждём настоящее слово дальше.
            ignored += 1;
            speaking = false; voiceMs = 0; silenceMs = 0; totalVoice = 0; totalHiss = 0;
            if (now - began > opts.timeoutMs) finish(false, 'timeout');
          }
        }
      });
      if (!analyser && !opts.waitForever) {
        // Без микрофона ждём кнопку или пробел.
        setTimeout(() => { if (!finished) finish(false, 'nomic'); }, opts.timeoutMs);
      }
      return { promise, confirm: () => finish(true, 'button'), cancel: () => finish(false, 'cancel') };
    }

    async function trimBlob(blob, fromSec) {
      const Ctx = root.AudioContext || root.webkitAudioContext;
      const decodeCtx = new Ctx();
      try {
        const buffer = await decodeCtx.decodeAudioData(await blob.arrayBuffer());
        const data = buffer.getChannelData(0);
        const start = Math.min(data.length, Math.floor(fromSec * buffer.sampleRate));
        return encodeWav(data.subarray(start), buffer.sampleRate);
      } finally { decodeCtx.close().catch(() => {}); }
    }

    root.addEventListener && root.addEventListener('keydown', event => {
      if (event.code === 'Space' && !event.repeat && !(event.target && /input|textarea|select/i.test(event.target.tagName))) { spaceDown = true; event.preventDefault(); }
    });
    root.addEventListener && root.addEventListener('keyup', event => {
      if (event.code !== 'Space') return;
      spaceDown = false;
      // Пробел — «сказала», а не нажатие на кнопку, где остался фокус.
      if (!(event.target && /input|textarea|select/i.test(event.target.tagName))) event.preventDefault();
    });

    // Микрофон не выключаем сразу после занятия: иначе браузер будет каждый раз спрашивать разрешение.
    function release(ms) {
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(stop, Number.isFinite(ms) ? ms : 180000);
    }

    return {
      start, stop, release, subscribe, listen, tap,
      isOn: () => Boolean(analyser),
      sampleRate: () => (ctx ? ctx.sampleRate : 48000),
      permission: () => permission,
      frame: () => lastFrame,
      setSensitivity: value => { sensitivity = Number(value) || 3; },
      setEnabled: value => { enabled = value !== false; if (!enabled) stop(); },
      setSuppress: fn => { suppressFn = typeof fn === 'function' ? fn : () => false; },
      holdManual: value => { spaceDown = Boolean(value); },
      pulseManual: ms => { manualPulse = Date.now() + (ms || 200); },
      floors: () => Object.assign({}, floors),
      detector: (sound, options) => createSoundDetector(sound, options),
      setProfile,
      frameLabel,
      analyzeCalibration
    };
  }

  return { classify, updateFloor, encodeWav, createMic, periodicity, strictFeatures, createSoundDetector, analyzeCalibration, frameLabel, setProfile, VOICE_K, HISS_K };
});

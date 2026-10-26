(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  Y.steps = Y.steps || {};

  // ─────────────────────────────────────────────────────────────
  // Сценки: что происходит на экране во время упражнения
  // ─────────────────────────────────────────────────────────────
  function makeScene(kind, total) {
    const n = Math.max(1, Math.min(total, 12));
    switch (kind) {
      case 'mushrooms': return {
        html: `<div class="scene scene-mushrooms"><div class="meadow">${Array.from({ length: n }, () => '<span class="shroom-slot"><span class="shroom">🍄</span></span>').join('')}</div></div>`,
        update(node, s) {
          node.querySelectorAll('.shroom-slot').forEach((slot, i) => {
            const shroom = slot.firstElementChild;
            if (i < s.count) { slot.classList.add('grown'); shroom.style.transform = 'scale(1)'; }
            else if (i === s.count && s.phase === 'hold') shroom.style.transform = `scale(${0.25 + 0.75 * s.phaseProgress})`;
            else shroom.style.transform = 'scale(.2)';
          });
        }
      };
      case 'paint': return {
        html: `<div class="scene scene-paint"><div class="ceiling">${Array.from({ length: n }, (_, i) => `<i style="--h:${(i * 360) / n}"></i>`).join('')}</div><span class="brush">🖌️</span></div>`,
        update(node, s) { node.querySelectorAll('.ceiling i').forEach((stripe, i) => stripe.classList.toggle('on', i < s.count)); }
      };
      case 'house': return {
        html: `<div class="scene scene-house"><div class="sky">${Array.from({ length: 6 }, (_, i) => `<span class="sky-star" style="left:${10 + i * 15}%;top:${12 + (i % 2) * 22}%">⭐</span>`).join('')}</div><span class="house">🏠</span><span class="zzz">💤</span></div>`,
        update(node, s) { node.querySelectorAll('.sky-star').forEach((star, i) => star.classList.toggle('on', s.progress > i / 6)); }
      };
      case 'frogElephant': return {
        html: '<div class="scene scene-duo"><span class="duo-a">🐸</span><span class="duo-b">🐘</span></div>',
        update() {}
      };
      case 'hearts': return {
        html: '<div class="scene scene-hearts"><span class="big-heart">❤️</span><div class="hearts-fly"></div></div>',
        update(node, s) {
          const heart = node.querySelector('.big-heart');
          if (heart) heart.style.transform = `scale(${0.6 + s.progress * 0.8})`;
          const fly = node.querySelector('.hearts-fly');
          if (fly && Math.random() < 0.18) {
            const h = document.createElement('i'); h.textContent = '💗'; h.style.left = `${20 + Math.random() * 60}%`;
            fly.appendChild(h); setTimeout(() => h.remove(), 1800);
          }
        }
      };
      case 'cup': return {
        html: '<div class="scene scene-cup"><div class="cup"><div class="cocoa"></div><span class="cup-handle"></span></div><span class="steam">♨️</span></div>',
        update(node, s) { const cocoa = node.querySelector('.cocoa'); if (cocoa) cocoa.style.height = `${Math.round(s.progress * 100)}%`; }
      };
      case 'swing': return {
        html: '<div class="scene scene-swing"><div class="swing-pivot"><div class="swing-rope"><span>🧒</span></div></div></div>',
        update() {}
      };
      case 'horse': return {
        html: '<div class="scene scene-horse"><div class="track"><span class="horse">🐎</span><span class="flag">🏁</span></div></div>',
        update(node, s) { const horse = node.querySelector('.horse'); if (horse) horse.style.left = `${Math.min(88, s.progress * 88)}%`; }
      };
      case 'wind': return {
        html: '<div class="scene scene-wind"><span class="leaf">🍃</span><span class="leaf l2">🍃</span><span class="leaf l3">🍃</span></div>',
        update(node, s) { node.style.setProperty('--p', s.progress); }
      };
      case 'teeth': return {
        html: `<div class="scene scene-teeth"><span class="tooth-big">🦷</span><span class="tooth-brush">🧽</span>${Array.from({ length: n }, (_, i) => `<i class="tsp" style="--a:${(i * 360) / n}deg">✨</i>`).join('')}</div>`,
        update(node, s) { node.querySelectorAll('.tsp').forEach((sp, i) => sp.classList.toggle('on', i < s.count)); }
      };
      case 'hill': return {
        html: '<div class="scene scene-hill"><div class="hill-shape"></div><span class="sled">🛷</span></div>',
        update(node, s) { node.style.setProperty('--p', s.progress); }
      };
      case 'pancake': return {
        html: `<div class="scene scene-pancake"><div class="plate">${Array.from({ length: 8 }, (_, i) => `<i class="pc" style="--i:${i}"></i>`).join('')}</div></div>`,
        update(node, s) { node.querySelectorAll('.pc').forEach((pc, i) => pc.classList.toggle('on', s.progress > i / 8)); }
      };
      case 'drum': return {
        html: `<div class="scene scene-drum"><span class="drum">🥁</span><div class="drum-dots">${Array.from({ length: n }, () => '<i></i>').join('')}</div></div>`,
        update(node, s) {
          node.querySelectorAll('.drum-dots i').forEach((d, i) => d.classList.toggle('on', i < s.count));
          const drum = node.querySelector('.drum'); if (drum && s.count !== drum._c) { drum._c = s.count; drum.classList.remove('hit'); void drum.offsetWidth; drum.classList.add('hit'); }
        }
      };
      default: return {
        html: `<div class="scene scene-stars">${Array.from({ length: n }, () => '<span class="st">⭐</span>').join('')}</div>`,
        update(node, s) { node.querySelectorAll('.st').forEach((star, i) => star.classList.toggle('on', i < Math.round(s.progress * n))); }
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Гимнастика
  // ─────────────────────────────────────────────────────────────
  // ── Зеркальце: камера рядом с картинкой, как зеркало у логопеда. Ничего не записывается. ──
  let mirrorStream = null; let mirrorStop = null;
  async function mirrorOn() {
    clearTimeout(mirrorStop);
    if (mirrorStream) return mirrorStream;
    try { mirrorStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false }); }
    catch (error) { mirrorStream = null; }
    return mirrorStream;
  }
  function mirrorRelease() {
    clearTimeout(mirrorStop);
    mirrorStop = setTimeout(() => { if (mirrorStream) mirrorStream.getTracks().forEach(t => t.stop()); mirrorStream = null; }, 4000);
  }
  async function attachMirror(stage, api) {
    const box = stage.querySelector('.mirror');
    if (!box) return;
    const stream = await mirrorOn();
    if (!stream || !api.alive()) { if (!stream) { box.classList.add('off'); Y.ui.toast('Камера недоступна — зеркальце выключено'); } return; }
    box.innerHTML = '<video autoplay muted playsinline></video><span>🪞</span>';
    box.querySelector('video').srcObject = stream;
    box.classList.add('on');
    api.cleanup(mirrorRelease);
  }

  // «Угадай упражнение»: лицо без названия и 3 варианта. Спокойно, без спешки.
  async function gymQuiz(stage, step, api) {
    const { art, ui, speech, sfx } = api;
    const ex = step.exercise;
    stage.innerHTML = `<div class="gym-quiz"><div class="face-wrap big">${art.face(Object.assign({ size: 270, beat: ex.beat || 2.4 }, ex.face || {}))}</div>
      <div class="quiz-side"><h1>Угадай упражнение!</h1>
      <div class="quiz-options">${step.quiz.map(o => `<button class="option quiz-opt" data-id="${o.id}"><span>${o.emoji}</span><b>${ui.esc(o.name)}</b></button>`).join('')}</div></div></div>`;
    await api.say(speech.line('gymQuiz'), { interrupt: true });
    let misses = 0;
    for (;;) {
      const btn = await ui.tapWait(stage, '.quiz-opt:not(.gone)', api, { replay: () => speech.play(speech.line('gymQuiz')) });
      if (!btn || !api.alive()) return false;
      if (btn.dataset.id === ex.id) {
        btn.classList.add('right'); sfx.play('ding'); ui.sparkleAt(btn);
        await api.say(speech.line('gymQuizRight'), { interrupt: true });
        await api.wait(300);
        return true;
      }
      misses += 1;
      api.wrong(btn); btn.classList.add('gone');
      if (misses >= 2) {
        const right = stage.querySelector(`.quiz-opt[data-id="${ex.id}"]`);
        if (right) right.classList.add('right');
        await api.wait(900);
        return true;
      }
      await api.say(speech.line('gymQuizAgain'), { interrupt: true });
    }
  }

  Y.steps.gym = async function gymStep(stage, step, api) {
    const ex = step.exercise;
    const { art, ui, speech, sfx, mic } = api;
    if (step.quiz && step.quiz.length > 1) { if (!(await gymQuiz(stage, step, api))) return {}; }
    const beat = ex.beat || 2.4;
    const total = ex.mode === 'hold' ? 10 : ex.amount;
    const scene = makeScene(ex.scene, total);
    const mirror = Y.app.state.settings.mirror === true;
    const tale = step.tale ? speech.gymTale(ex.id) : null;
    stage.innerHTML = `<div class="gym ${tale ? 'tale' : ''}">
      ${tale ? `<div class="tale-banner"><span>📖</span><p>${ui.esc(tale.text)}</p></div>` : ''}
      <div class="gym-left">
        <div class="face-wrap ${mirror ? 'with-mirror' : ''}">${art.face(Object.assign({ size: 250, beat }, ex.face || {}))}${mirror ? '<div class="mirror"></div>' : ''}</div>
        <h1 class="gym-title">${ex.emoji} ${ui.esc(ex.name)}</h1>
        <p class="mom-note"><b>Маме:</b> ${ui.esc(ex.mom || '')}</p>
      </div>
      <div class="gym-right">
        ${scene.html}
        <div class="gym-count"><span class="gym-num">0</span><small class="gym-of"></small></div>
        <div class="gym-phase"></div>
        <div class="gym-controls">
          <button class="btn secondary small" data-gym="pause">⏸ Пауза</button>
          <button class="btn secondary small ${mirror ? 'on' : ''}" data-gym="mirror" title="Камера как зеркало: видно себя рядом с картинкой">🪞 ${mirror ? 'Зеркальце вкл.' : 'Зеркальце'}</button>
          <button class="parent-skip" data-gym="skip">Маме: пропустить ⏭</button>
        </div>
      </div>
    </div>`;
    const sceneNode = stage.querySelector('.scene');
    const num = stage.querySelector('.gym-num');
    const of = stage.querySelector('.gym-of');
    const phase = stage.querySelector('.gym-phase');
    let paused = false; let skipped = false;
    const pauseBtn = stage.querySelector('[data-gym="pause"]');
    // Пауза сама снимается через 25 с — если её нажали случайно, гимнастика не «зависнет».
    let pauseTimer = null;
    const setPaused = value => {
      paused = value;
      clearTimeout(pauseTimer);
      pauseBtn.textContent = paused ? '▶ Дальше' : '⏸ Пауза';
      stage.querySelector('.gym').classList.toggle('paused', paused);
      if (paused) pauseTimer = setTimeout(() => setPaused(false), 25000);
    };
    api.cleanup(() => clearTimeout(pauseTimer));
    pauseBtn.onclick = () => setPaused(!paused);
    stage.querySelector('[data-gym="skip"]').onclick = () => { skipped = true; };
    stage.querySelector('[data-gym="mirror"]').onclick = async () => {
      const st = Y.app.state.settings;
      st.mirror = !(st.mirror === true);
      Y.app.save();
      const b = stage.querySelector('[data-gym="mirror"]');
      b.classList.toggle('on', st.mirror); b.textContent = st.mirror ? '🪞 Зеркальце вкл.' : '🪞 Зеркальце';
      const wrap = stage.querySelector('.face-wrap');
      if (st.mirror) {
        if (!wrap.querySelector('.mirror')) { wrap.classList.add('with-mirror'); wrap.insertAdjacentHTML('beforeend', '<div class="mirror"></div>'); }
        attachMirror(stage, api);
      } else {
        const m = wrap.querySelector('.mirror'); if (m) m.remove();
        wrap.classList.remove('with-mirror');
        mirrorRelease();
      }
    };
    if (mirror) attachMirror(stage, api);
    api.setReplay(() => speech.play(speech.exercise(ex)));

    const s = { count: 0, progress: 0, phase: '', phaseProgress: 0 };
    const draw = () => scene.update(sceneNode, s);
    draw();

    // Мамино видео упражнения (как у логопеда) — вместо мультика.
    const own = await Y.storage.getBlob('assets', `exvideo:${ex.id}`).catch(() => null);
    if (own && own.blob && api.alive()) {
      const url = URL.createObjectURL(own.blob);
      const wrap = stage.querySelector('.face-wrap');
      wrap.classList.add('has-video');
      wrap.innerHTML = `<video class="ex-video" src="${url}" autoplay loop muted playsinline></video>`;
      api.cleanup(() => URL.revokeObjectURL(url));
    }

    // Сказка: сначала кусочек истории (в первом упражнении — ещё и вступление).
    if (tale) {
      const items = step.taleIndex === 0 ? [speech.gymTale('intro'), tale] : [tale];
      api.setReplay(() => speech.play([tale, speech.exercise(ex)], { gap: 300 }));
      await api.say(items.filter(Boolean), { interrupt: true, gap: 350 });
      if (!api.alive()) return {};
    }
    await api.say(speech.exercise(ex), { interrupt: true });
    if (!api.alive()) return {};
    // «Приготовились… Начали!» — время сесть ровно и открыть ротик, прежде чем пойдёт счёт.
    if (!(await getReady(api, phase, () => skipped))) return {};
    if (skipped) return {};

    // Тик по 100 мс с учётом паузы. Возвращает false, если занятие закрыто или маму попросили пропустить.
    async function run(ms, onTick) {
      let elapsed = 0;
      while (elapsed < ms) {
        if (!api.alive() || skipped) return false;
        await api.wait(100);
        if (!paused) { elapsed += 100; if (onTick) onTick(elapsed / ms); }
      }
      return true;
    }

    if (ex.mode === 'hold') {
      const seconds = ex.amount;
      of.textContent = 'секунд';
      num.textContent = seconds;
      phase.textContent = 'Держим!';
      sfx.play('ding');
      let lastShown = seconds;
      await run(seconds * 1000, p => {
        s.progress = p;
        const left = Math.ceil(seconds * (1 - p));
        if (left !== lastShown) {
          lastShown = left;
          num.textContent = left;
          if (left <= 3 && left > 0) sfx.play('tick');
        }
        draw();
      });
    } else if (ex.mode === 'holdReps') {
      of.textContent = `из ${ex.amount}`;
      const hold = ex.hold || 5; const rest = ex.rest || 3;
      for (let r = 0; r < ex.amount; r += 1) {
        if (!api.alive() || skipped) break;
        s.phase = 'hold'; s.phaseProgress = 0;
        phase.textContent = `Держим ${hold} сек!`;
        stage.querySelector('.gym').classList.add('holding');
        api.say(r === 0 ? [speech.num(1), speech.line('hold', 0)] : speech.num(r + 1), { interrupt: true });
        sfx.play('ding');
        let lastLeft = hold;
        const ok = await run(hold * 1000, p => {
          s.phaseProgress = p;
          const left = Math.ceil(hold * (1 - p));
          if (left !== lastLeft) { lastLeft = left; phase.textContent = `Держим… ${left}`; }
          draw();
        });
        stage.querySelector('.gym').classList.remove('holding');
        if (!ok) break;
        s.count = r + 1; s.progress = s.count / ex.amount; num.textContent = s.count;
        if (ex.id === 'mushroom') api.mushroom(1);
        draw();
        sfx.play('pop');
        if (r < ex.amount - 1) {
          s.phase = 'rest';
          phase.textContent = 'Отдых — язычок отдыхает';
          if (r === 0) api.say(speech.line('rest', 0), { interrupt: false });
          if (!(await run(rest * 1000))) break;
        }
      }
    } else {
      // Повторы в ритме: считать и нажимать не нужно.
      of.textContent = `из ${ex.amount}`;
      phase.textContent = 'Повторяй в ритм!';
      let lastClick = 0;
      let unsub = null;
      if (ex.clicks && mic.isOn()) {
        let quietFrames = 0;
        unsub = mic.subscribe(frame => {
          if (frame.suppressed) return;
          const loud = frame.peakRatio > 6 && frame.peak > 0.04;
          if (loud && quietFrames >= 3 && Date.now() - lastClick > 280) {
            lastClick = Date.now();
            s.count = Math.min(ex.amount, s.count + 1);
            num.textContent = s.count;
            s.progress = s.count / ex.amount;
            const horse = sceneNode.querySelector('.horse');
            if (horse) { horse.classList.remove('hop'); void horse.offsetWidth; horse.classList.add('hop'); }
            draw();
          }
          quietFrames = loud ? 0 : quietFrames + 1;
        });
        api.cleanup(unsub);
      }
      while (s.count < ex.amount && api.alive() && !skipped) {
        const beatMs = beat * 1000;
        const ok = await run(beatMs);
        if (!ok) break;
        if (Date.now() - lastClick < beatMs * 0.9) continue; // ребёнок цокает сам — метроном ждёт
        s.count += 1;
        s.progress = s.count / ex.amount;
        num.textContent = s.count;
        if (s.count <= 10) api.say(speech.num(s.count), { interrupt: true }); else sfx.play('tick');
        const horse = sceneNode.querySelector('.horse');
        if (horse) { horse.classList.remove('hop'); void horse.offsetWidth; horse.classList.add('hop'); }
        draw();
      }
      if (unsub) unsub();
    }
    if (!api.alive()) return {};
    s.progress = 1; draw();
    phase.textContent = 'Готово!';
    sfx.play('sparkle');
    ui.sparkleAt(num);
    await api.say(speech.line('praiseShort'), { interrupt: false, protect: true });
    if (step.taleLast && api.alive()) await api.say(speech.gymTale('outro'), { interrupt: true, protect: true });
    return { stars: 1 };
  };

  async function getReady(api, phaseNode, isSkipped) {
    const { speech, sfx } = api;
    const skip = () => typeof isSkipped === 'function' && isSkipped();
    if (phaseNode) phaseNode.textContent = 'Приготовились…';
    await api.say(speech.line('ready'), { interrupt: true });
    for (const n of [3, 2, 1]) {
      if (!api.alive() || skip()) return api.alive();
      if (phaseNode) phaseNode.innerHTML = `<b class="countdown">${n}</b>`;
      sfx.play('tick');
      await api.wait(800);
    }
    if (!api.alive()) return false;
    if (phaseNode) phaseNode.textContent = 'Начали!';
    await api.say(speech.line('go'), { interrupt: true });
    return api.alive();
  }

  // ─────────────────────────────────────────────────────────────
  // Где живёт язычок — перед звуком дня
  // ─────────────────────────────────────────────────────────────
  Y.steps.position = async function positionStep(stage, step, api) {
    const { art, ui, speech } = api;
    const sound = step.sound;
    const group = data.SOUNDS[sound].articulation;
    const info = data.ARTICULATION[group];
    stage.innerHTML = `<div class="position">
      <div class="face-wrap big">${art.face(Object.assign({ size: 290 }, info.face))}</div>
      <div class="position-text">
        <div class="position-sound">${ui.badge(sound, 'huge')}</div>
        <h1>${ui.esc(info.child)}</h1>
        <p class="mom-note"><b>Маме:</b> ${ui.esc(info.mom)}</p>
        <div class="row gap wrap">
          <button class="btn secondary" data-pos="listen">🔊 Как звучит</button>
          <button class="btn" data-pos="next">Понятно! 👍</button>
        </div>
      </div>
    </div>`;
    let done;
    const finished = new Promise(resolve => { done = resolve; });
    stage.querySelector('[data-pos="next"]').onclick = () => done();
    stage.querySelector('[data-pos="listen"]').onclick = () => speech.play(speech.snd(sound));
    const items = [speech.articulation(group), speech.snd(sound)];
    api.setReplay(() => speech.play(items));
    await api.say(items, { interrupt: true });
    const timer = setTimeout(() => done(), step.short ? 2500 : 4500);
    api.cleanup(() => { clearTimeout(timer); done(); });
    await finished;
    return { stars: 0 };
  };

  // ─────────────────────────────────────────────────────────────
  // Внезапная «Проверка замка»: Грибочек 10 секунд
  // ─────────────────────────────────────────────────────────────
  Y.steps.lock = async function lockStep(stage, step, api) {
    const { art, speech, sfx, ui } = api;
    const seconds = step.hold || 10;
    stage.innerHTML = `<div class="lock-step">
      <div class="lock-icon">🔓</div>
      <h1>Проверка замка!</h1>
      <div class="lock-row">${art.face({ size: 200, mouth: 'open-wide', tongue: 'suck-up' })}<div class="lock-count">${seconds}</div></div>
      <p class="muted">Язычок-ключ — в замок наверху. Держим Грибочек!</p>
    </div>`;
    sfx.play('boing');
    await api.say(speech.line('lockCheck'), { interrupt: true, protect: true });
    const count = stage.querySelector('.lock-count');
    const icon = stage.querySelector('.lock-icon');
    for (let left = seconds; left > 0; left -= 1) {
      if (!api.alive()) return {};
      count.textContent = left;
      if (left <= 3) sfx.play('tick');
      await api.wait(1000);
    }
    icon.textContent = '🔐';
    icon.classList.add('closed');
    count.textContent = '✓';
    sfx.play('chest');
    ui.confetti(16);
    api.mushroom(1);
    await api.say(speech.line('lockDone'), { interrupt: true, protect: true });
    return { stars: 1 };
  };

  // ─────────────────────────────────────────────────────────────
  // В конце занятия: губы сомкнуты, язык в домике, дышим носом
  // ─────────────────────────────────────────────────────────────
  // Дыхание носиком: медленно (вдох 4 с, выдох 5 с), каждый вдох и выдох подсказывается голосом,
  // в шарике идёт обратный счёт — ребёнок успевает понять, что делать.
  Y.steps.breath = async function breathStep(stage, step, api) {
    const { art, speech, sfx, ui } = api;
    const total = step.breaths || 5;
    const IN = 4000; const OUT = 5000;
    stage.innerHTML = `<div class="breath-step">
      <div class="breath-top"><div class="breath-face">${art.face({ size: 150, mouth: 'closed', tongue: 'hidden' })}</div>
      <div class="breath-ball"><span class="breath-nose">👃</span><b class="breath-count"></b></div></div>
      <h1 class="breath-label">Губки закрыты, язычок в домике</h1>
      <div class="g-dots">${Array.from({ length: total }, () => '<i></i>').join('')}</div>
      <p class="mom-note"><b>Маме:</b> спокойный вдох и выдох носом, рот закрыт, кончик языка у бугорков за верхними зубами. Так язык должен лежать весь день.</p>
    </div>`;
    const ball = stage.querySelector('.breath-ball');
    const label = stage.querySelector('.breath-label');
    const count = stage.querySelector('.breath-count');
    const dots = stage.querySelectorAll('.g-dots i');
    api.setReplay(() => speech.play(speech.line('breathIntro')));
    await api.say(speech.line('breathIntro'), { interrupt: true });
    if (!(await getReady(api, label))) return {};
    const phase = async (text, cls, ms, line) => {
      label.textContent = text;
      ball.style.transitionDuration = `${ms}ms`;
      ball.className = `breath-ball ${cls}`;
      api.say(speech.line(line), { interrupt: true });
      for (let left = Math.round(ms / 1000); left > 0; left -= 1) {
        if (!api.alive()) return false;
        count.textContent = left;
        await api.wait(1000);
      }
      return api.alive();
    };
    for (let i = 0; i < total; i += 1) {
      if (!(await phase('Вдох носиком…', 'in', IN, 'breathIn'))) return {};
      if (!(await phase('Медленный выдох носиком…', 'out', OUT, 'breathOut'))) return {};
      dots[i].classList.add('on');
    }
    count.textContent = '';
    ball.className = 'breath-ball';
    label.textContent = 'Молодец! Так и дышим.';
    sfx.play('sparkle');
    ui.sparkleAt(ball);
    await api.say(speech.line('breathDone'), { interrupt: true, protect: true });
    return { stars: 1 };
  };

  Y.gymScene = makeScene;
})(window);

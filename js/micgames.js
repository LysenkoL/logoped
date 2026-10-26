(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  Y.steps = Y.steps || {};

  // Сценарии микрофонных игр: кто движется и к чему.
  const THEMES = {
    pump:     { mode: 'hiss',  kind: 'inflate', hero: '🎈', rounds: 3, needSec: 2.2, prizes: ['🐰', '🦄', '🐼', '🐸', '🐙'] },
    mosquito: { mode: 'hiss',  kind: 'journey', hero: '🦟', goal: '🌸', bg: 'meadow', needSec: 4.5 },
    snake:    { mode: 'hiss',  kind: 'journey', hero: '🐍', goal: '🍎', bg: 'grass', needSec: 4.5 },
    beetle:   { mode: 'hiss',  kind: 'journey', hero: '🐞', goal: '🌼', bg: 'meadow', needSec: 4.5 },
    brush:    { mode: 'hiss',  kind: 'clean', hero: '🧽', needSec: 4.5 },
    plane:    { mode: 'voice', kind: 'journey', hero: '✈️', goal: '🏝️', bg: 'sky', needSec: 4.5 },
    motor:    { mode: 'voice', kind: 'journey', hero: '🏍️', goal: '🏁', bg: 'road', needSec: 4.5 },
    popper:   { mode: 'burst', kind: 'bubbles', need: 10 },
    train:    { mode: 'burst', kind: 'steps', hero: '🚂', goal: '🏠', bg: 'road', need: 10 }
  };

  Y.steps.mic = async function micStep(stage, step, api) {
    if (step.game === 'party') return partyGame(stage, step, api);
    const { ui, speech, sfx, mic } = api;
    const sound = step.sound;
    const theme = THEMES[step.game] || THEMES.pump;
    const color = ui.soundColor(sound);
    const micOn = mic.isOn();
    stage.innerHTML = `<div class="micgame mg-${theme.kind} bg-${theme.bg || 'sky'}" style="--c:${color}">
      <div class="mg-head">${ui.badge(sound, 'huge')}<button class="btn secondary small" data-mg="demo">🔊 Как звучит</button></div>
      <div class="mg-field"></div>
      <div class="mg-bottom">
        <div class="mg-meter"><i></i></div><span class="mg-hear"></span>
        ${micOn ? '<p class="muted small">Если микрофон не слышит — держите пробел или кнопку.</p>' : ''}
        <button class="btn good hold-btn" data-mg="hold">${micOn ? '🎤 Помочь' : '🎤 Держи, пока говоришь'}</button>
      </div>
    </div>`;
    const field = stage.querySelector('.mg-field');
    const meter = stage.querySelector('.mg-meter i');
    const holdBtn = stage.querySelector('[data-mg="hold"]');
    const press = value => mic.holdManual(value);
    holdBtn.addEventListener('pointerdown', () => press(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(name => holdBtn.addEventListener(name, () => press(false)));
    api.cleanup(() => press(false));
    const demo = () => speech.play(speech.snd(sound), { interrupt: true });
    stage.querySelector('[data-mg="demo"]').onclick = demo;
    api.setReplay(demo);
    // Сцена видна сразу, ещё до подсказки голосом.
    if (theme.mode !== 'burst') field.innerHTML = sceneHtml(theme, 0);
    await api.say([speech.snd(sound), speech.line('micIntro', 0)], { interrupt: true });
    if (!api.alive()) return {};

    let activeMs = 0;
    const said = () => api.counted(`звук ${ui.soundLabel(sound)}`, sound);

    if (theme.mode === 'burst') return burstGame(field, theme, api, meter, said, sound);

    // Непрерывный звук: копим «секунды звучания».
    const rounds = theme.kind === 'inflate' ? theme.rounds : 1;
    // Вся игра не дольше ~75 с, даже если звук пока не получается (без «зависания»).
    const deadline = Date.now() + 75000;
    for (let round = 0; round < rounds && api.alive() && Date.now() < deadline; round += 1) {
      const need = theme.needSec * 1000;
      let progress = 0;
      let streak = false;
      let streakMs = 0;
      field.innerHTML = sceneHtml(theme, round);
      const hero = field.querySelector('.mg-hero');
      // Строгий детектор: шум, хлопки, стук и «а» не двигают игру.
      const detector = mic.detector(sound, { mode: theme.mode === 'voice' ? 'voice' : 'hold' });
      await new Promise(resolve => {
        const unsub = mic.subscribe(frame => {
          const r = detector.feed(frame);
          if (r.skip) return;
          const on = r.active;
          const level = theme.mode === 'hiss' ? frame.hissLevel : frame.level;
          meter.style.width = `${Math.round(Math.min(1, level * 1.2) * 100)}%`;
          meter.classList.toggle('good', Boolean(on));
          hearChip(stage, frame, sound, on);
          stage.querySelector('.micgame').classList.toggle('on', Boolean(on));
          if (r.credit) {
            progress += 30 * r.credit; activeMs += 30 * r.credit; streakMs += 30 * r.credit;
            streak = true;
          } else if (streak && !on) {
            streak = false;
            if (streakMs >= 300) said();
            streakMs = 0;
          }
          if (r.credit) lastGood = Date.now();
          const p = Math.min(1, progress / need);
          applyProgress(theme, field, hero, p);
          if (p >= 1) { unsub(); stopNudge(); if (streak && streakMs >= 300) said(); resolve(); }
        });
        let lastGood = Date.now();
        // Не получается 10 с — игра сама показывает, как надо; через 50 с раунд засчитывается (без «зависания»).
        const stopNudge = nudger(api, sound, () => lastGood, () => { lastGood = Date.now(); }, () => { unsub(); resolve(); }, Math.min(50000, deadline - Date.now()));
        api.cleanup(() => { unsub(); stopNudge(); resolve(); });
      });
      if (!api.alive()) return {};
      sfx.play(theme.kind === 'inflate' ? 'pop' : 'fanfare');
      ui.confetti(18);
      if (theme.kind === 'inflate') {
        const prize = theme.prizes[round % theme.prizes.length];
        field.insertAdjacentHTML('beforeend', `<div class="mg-prize">${prize}</div>`);
      }
      await api.say(speech.line('praiseShort'), { protect: true });
      await api.wait(500);
    }
    api.micSeconds(sound, activeMs / 1000);
    return { stars: 3 };
  };

  function sceneHtml(theme, round) {
    if (theme.kind === 'inflate') {
      const colors = ['#ff6b8b', '#6aa8ff', '#6bd08b'];
      return `<div class="pump-scene"><div class="pump">⛽</div><div class="balloon-grow" style="--c:${colors[round % 3]}"><span class="knot"></span></div></div>`;
    }
    if (theme.kind === 'clean') {
      return `<div class="clean-scene"><div class="tooth">🦷${Array.from({ length: 6 }, (_, i) => `<span class="dirt d${i}"></span>`).join('')}</div><span class="mg-hero">${theme.hero}</span></div>`;
    }
    return `<div class="journey"><span class="mg-hero">${theme.hero}</span><span class="mg-goal">${theme.goal}</span><div class="journey-trail"></div></div>`;
  }

  function applyProgress(theme, field, hero, p) {
    if (theme.kind === 'inflate') {
      const b = field.querySelector('.balloon-grow');
      if (b) b.style.transform = `scale(${0.25 + p * 0.95})`;
      return;
    }
    if (theme.kind === 'clean') {
      field.querySelectorAll('.dirt').forEach((d, i) => d.classList.toggle('gone', p > (i + 1) / 7));
      if (hero) hero.style.transform = `translateX(${Math.sin(p * 30) * 40}px)`;
      return;
    }
    if (hero) hero.style.left = `${4 + p * 78}%`;
    const trail = field.querySelector('.journey-trail');
    if (trail) trail.style.width = `${p * 80}%`;
  }

  // Короткие звуки (Ц, Ч): каждый «выстрел» лопает пузырь или двигает паровоз.
  function burstGame(field, theme, api, meter, said, sound) {
    const { sfx, ui, mic } = api;
    const need = theme.need;
    if (theme.kind === 'bubbles') {
      field.innerHTML = `<div class="bubbles">${Array.from({ length: need }, (_, i) => `<span class="bubble-b" style="--i:${i}"></span>`).join('')}</div>`;
    } else {
      field.innerHTML = `<div class="journey steps"><span class="mg-hero">${theme.hero}</span><span class="mg-goal">${theme.goal}</span><div class="journey-trail"></div></div>`;
    }
    let count = 0;
    // «Выстрел» — короткое шипение после тишины; хлопок, стук, «а» и долгое «ссс» не считаются.
    const detector = mic.detector(sound, { mode: 'burst' });
    return new Promise(resolve => {
      const unsub = mic.subscribe(frame => {
        // Пока звучит «хлопок» самой игры, кадры не считаем ни тишиной, ни звуком.
        const r = detector.feed(frame);
        if (r.skip) return;
        meter.style.width = `${Math.round(Math.min(1, frame.hissLevel * 1.2) * 100)}%`;
        meter.classList.toggle('good', Boolean(r.active));
        hearChip(field.closest('.micgame'), frame, sound, r.active || r.event);
        if (r.event) {
          lastGood = Date.now();
          count += 1;
          said();
          sfx.play('pop');
          if (theme.kind === 'bubbles') {
            const b = field.querySelectorAll('.bubble-b:not(.popped)')[0];
            if (b) { b.classList.add('popped'); ui.sparkleAt(b); }
          } else {
            const hero = field.querySelector('.mg-hero');
            if (hero) hero.style.left = `${4 + (count / need) * 78}%`;
            const trail = field.querySelector('.journey-trail');
            if (trail) trail.style.width = `${(count / need) * 80}%`;
          }
          if (count >= need) { unsub(); stopNudge(); setTimeout(() => resolve(done()), 300); }
        }
      });
      let lastGood = Date.now();
      const stopNudge = nudger(api, sound, () => lastGood, () => { lastGood = Date.now(); }, () => { unsub(); resolve(done()); }, 60000);
      api.cleanup(() => { unsub(); stopNudge(); resolve({}); });
    });
    async function done() {
      sfx.play('fanfare');
      ui.confetti(20);
      await api.say(api.speech.line('praiseShort'), { protect: true });
      return { stars: 3 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // «Праздник звуков»: надуваем шарик одним звуком, лопаем другим, гости прилетают со своими звуками.
  // ─────────────────────────────────────────────────────────────
  async function partyGame(stage, step, api) {
    const { ui, speech, sfx, mic } = api;
    const plan = (step.plan && step.plan.length) ? step.plan : (Y.core.partyPlan ? Y.core.partyPlan(Y.app.state, step.sound, Math.random) : []);
    const micOn = mic.isOn();
    const colors = ['#ff6b8b', '#6aa8ff', '#6bd08b', '#ffb347', '#b388ff'];
    const prizes = ['🐰', '🦄', '🐼', '🐸', '🐙', '🦋', '🍭', '⭐'];
    stage.innerHTML = `<div class="micgame mg-party">
      <div class="mg-head"><div class="party-cue"><span class="cue-badge"></span><b class="cue-text"></b></div><button class="btn secondary small" data-mg="demo">🔊 Как звучит</button></div>
      <div class="mg-field party-field"><div class="garland">🎉 🎈 🎊 🎈 🎉</div>
        <div class="party-balloon-wrap"><div class="party-balloon"><span class="knot"></span></div><i class="party-string"></i></div>
        <div class="party-guest"><span class="pg-hero"></span><span class="pg-goal"></span><div class="journey-trail"></div></div>
        <div class="party-prizes"></div></div>
      <div class="mg-bottom"><div class="mg-meter"><i></i></div><span class="mg-hear"></span>
        ${micOn ? '<p class="muted small">Если микрофон не слышит — держите пробел или кнопку.</p>' : ''}
        <button class="btn good hold-btn" data-mg="hold">${micOn ? '🎤 Помочь' : '🎤 Держи, пока говоришь'}</button></div>
    </div>`;
    const root = stage.querySelector('.micgame');
    const meter = stage.querySelector('.mg-meter i');
    const holdBtn = stage.querySelector('[data-mg="hold"]');
    const press = value => mic.holdManual(value);
    holdBtn.addEventListener('pointerdown', () => press(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(name => holdBtn.addEventListener(name, () => press(false)));
    api.cleanup(() => press(false));
    const balloon = stage.querySelector('.party-balloon');
    const balloonWrap = stage.querySelector('.party-balloon-wrap');
    const guest = stage.querySelector('.party-guest');
    const prizeBox = stage.querySelector('.party-prizes');
    let current = null;
    const demo = () => current && current.sound ? speech.play(speech.snd(current.sound), { interrupt: true }) : null;
    stage.querySelector('[data-mg="demo"]').onclick = demo;
    api.setReplay(demo);
    let activeMs = 0; let balloonN = 0;
    const cue = (sound, text) => {
      root.style.setProperty('--c', sound ? ui.soundColor(sound) : '#ff6b8b');
      stage.querySelector('.cue-badge').innerHTML = sound ? ui.badge(sound, 'huge') : '💥';
      stage.querySelector('.cue-text').textContent = text;
      const c = stage.querySelector('.party-cue');
      c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    };
    // Ждать звук: hold — копим время звучания, burst — один «выстрел». Не получилось 25 с — задание засчитывается само.
    const listenFor = (sound, mode, needMs, onProgress) => new Promise(resolve => {
      const detector = mic.detector(sound, { mode });
      let got = 0; let lastGood = Date.now(); const started = Date.now();
      const unsub = mic.subscribe(frame => {
        const r = detector.feed(frame);
        if (r.skip) return;
        const level = mode === 'voice' ? frame.level : frame.hissLevel;
        meter.style.width = `${Math.round(Math.min(1, level * 1.2) * 100)}%`;
        meter.classList.toggle('good', Boolean(r.active));
        hearChip(root, frame, sound, r.active || r.event);
        root.classList.toggle('on', Boolean(r.active));
        if (mode === 'burst') {
          if (r.event) { lastGood = Date.now(); done(true); }
          return;
        }
        if (r.credit) { got += 30 * r.credit; activeMs += 30 * r.credit; lastGood = Date.now(); if (onProgress) onProgress(Math.min(1, got / needMs)); }
        if (got >= needMs) done(true);
      });
      const timer = setInterval(() => {
        if (!api.alive()) { done(false); return; }
        if (Date.now() - started > 25000) { done(true); return; }
        if (Date.now() - lastGood > 9000 && !speech.isPlaying()) { lastGood = Date.now(); api.say([speech.line('micHint'), speech.snd(sound)], { interrupt: false, gap: 200 }); }
      }, 500);
      let finished = false;
      function done(ok) {
        if (finished) return;
        finished = true; unsub(); clearInterval(timer); root.classList.remove('on'); meter.classList.remove('good');
        resolve(ok);
      }
      api.cleanup(() => done(false));
    });
    const modeOf = sound => (['л', 'ль', 'р', 'рь'].includes(sound) ? 'voice' : 'hold');

    // Звук первого задания виден сразу, ещё во время объяснения.
    if (plan[0]) { current = plan[0]; cue(plan[0].sound, plan[0].type === 'inflate' ? 'Надувай шарик' : (plan[0].name || '')); }
    await api.say(speech.line('partyIntro'), { interrupt: true });
    for (const task of plan) {
      if (!api.alive()) return {};
      current = task;
      if (task.type === 'inflate') {
        balloonN += 1;
        guest.classList.remove('show');
        balloonWrap.classList.remove('gone');
        balloon.style.setProperty('--bc', colors[balloonN % colors.length]);
        balloon.classList.remove('boom'); balloon.style.transform = 'scale(.25)';
        cue(task.sound, 'Надувай шарик');
        await api.say([speech.line('partyInflate'), speech.snd(task.sound)], { interrupt: true, gap: 200 });
        if (!api.alive()) return {};
        const ok = await listenFor(task.sound, modeOf(task.sound), task.needMs, p => { balloon.style.transform = `scale(${0.25 + p * 0.9})`; });
        if (!ok) return {};
        balloon.style.transform = 'scale(1.15)';
        sfx.play('ding');
        api.counted(`звук ${ui.soundLabel(task.sound)}`, task.sound);
      } else if (task.type === 'pop') {
        if (task.sound) {
          cue(task.sound, 'Лопни шарик');
          await api.say([speech.line('partyPop'), speech.snd(task.sound)], { interrupt: true, gap: 200 });
          if (!api.alive()) return {};
          const ok = await listenFor(task.sound, 'burst', 0);
          if (!ok) return {};
          api.counted(`звук ${ui.soundLabel(task.sound)}`, task.sound);
        } else {
          cue('', 'Бах!');
          await api.wait(600);
        }
        balloon.classList.add('boom');
        sfx.play('pop');
        ui.confetti(24);
        const prize = ui.el(`<span class="party-prize">${prizes[(balloonN - 1) % prizes.length]}</span>`);
        prizeBox.appendChild(prize);
        if (!task.sound) await api.say(speech.line('partyAutoPop'), { interrupt: true });
        await api.wait(700);
        balloonWrap.classList.add('gone');
      } else if (task.type === 'guest') {
        balloonWrap.classList.add('gone');
        guest.classList.add('show');
        guest.querySelector('.pg-hero').textContent = task.hero;
        guest.querySelector('.pg-goal').textContent = task.goal;
        const hero = guest.querySelector('.pg-hero');
        const trail = guest.querySelector('.journey-trail');
        hero.style.left = '4%'; trail.style.width = '0';
        cue(task.sound, task.name);
        await api.say([speech.line('partyGuest'), speech.snd(task.sound)], { interrupt: true, gap: 200 });
        if (!api.alive()) return {};
        const move = p => { hero.style.left = `${4 + p * 74}%`; trail.style.width = `${p * 76}%`; };
        let ok;
        if (task.burst) {
          // Паровоз: три «ч!» — три шага.
          for (let k = 1; k <= 3 && api.alive(); k += 1) {
            ok = await listenFor(task.sound, 'burst', 0);
            if (!ok) return {};
            sfx.play('step');
            move(k / 3);
          }
        } else {
          ok = await listenFor(task.sound, modeOf(task.sound), task.needMs, move);
          if (!ok) return {};
        }
        move(1);
        sfx.play('sparkle');
        api.counted(`звук ${ui.soundLabel(task.sound)}`, task.sound);
        await api.say(speech.line('praiseShort'), { interrupt: true });
      }
    }
    if (!api.alive()) return {};
    guest.classList.remove('show');
    cue('', 'Ура!');
    sfx.play('fanfare');
    ui.confetti(40);
    await api.say(speech.line('partyDone'), { interrupt: true, protect: true });
    api.micSeconds(step.sound, activeMs / 1000);
    return { stars: 4 };
  }

  // Подсказка под полоской: что слышит игра. Зелёная галочка — правильно; «шум» — хлопок, стук, шорох.
  const NEED = sound => (['л', 'ль', 'р', 'рь'].includes(sound) ? 'voice' : ['ш', 'ж', 'ч', 'щ'].includes(sound) ? 'sh' : 's');
  function hearChip(scope, frame, sound, ok) {
    const node = scope && scope.querySelector('.mg-hear');
    if (!node || !Y.mic.frameLabel) return;
    const now = Date.now();
    const label = Y.mic.frameLabel(frame);
    let text = ''; let cls = '';
    if (ok) { text = `✅ ${Y.ui.soundLabel(sound)}`; cls = 'ok'; }
    else if (label === 'noise') { text = '🙉 шум'; cls = 'no'; }
    else if (label === 'voice' && NEED(sound) !== 'voice') { text = '🤔 это голос'; cls = 'no'; }
    else if ((label === 's' || label === 'sh') && NEED(sound) !== 'voice' && label !== NEED(sound) && !['з', 'зь', 'ж'].includes(sound)) { text = `🤔 похоже на ${label === 's' ? 'С' : 'Ш'}`; cls = 'no'; }
    if (!text) { if (now - (node._at || 0) > 700) { node.textContent = ''; node.className = 'mg-hear'; } return; }
    node._at = now;
    if (node.textContent !== text) { node.textContent = text; node.className = `mg-hear ${cls}`; }
  }

  // Подсказка, если звук долго не получается: образец звука голосом; по общему таймеру — мягко завершаем.
  function nudger(api, sound, lastGood, reset, giveUp, capMs) {
    const started = Date.now();
    const timer = setInterval(() => {
      if (!api.alive()) { clearInterval(timer); return; }
      if (Date.now() - started > capMs) { clearInterval(timer); giveUp(); return; }
      if (Date.now() - lastGood() > 10000 && !api.speech.isPlaying()) {
        reset();
        api.say([api.speech.line('micHint'), api.speech.snd(sound)], { interrupt: false, gap: 200 });
      }
    }, 1000);
    return () => clearInterval(timer);
  }

  Y.micThemes = THEMES;
})(window);

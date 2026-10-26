(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  Y.steps = Y.steps || {};

  // ─────────────────────────────────────────────────────────────
  // Весёлая минутка: загадки и стишки-повторялки
  // ─────────────────────────────────────────────────────────────
  Y.steps.fun = async function funStep(stage, step, api) {
    if (step.type === 'poem') return poem(stage, step.poem, api);
    return riddles(stage, step.riddles, api);
  };

  async function riddles(stage, list, api) {
    const { ui, speech, sfx, core } = api;
    const { clickOne } = Y.gameHelpers;
    for (const riddle of list) {
      if (!api.alive()) return {};
      const clip = { key: `rd:${riddle.id}`, text: riddle.text };
      api.setReplay(() => speech.play(clip));
      if (riddle.mode === 'build') {
        if (!(await buildAnswer(stage, riddle, clip, api))) return {};
      } else {
        const many = riddle.options.length > 4;
        stage.innerHTML = `<div class="g-riddle"><div class="riddle-card"><span class="riddle-q">❓</span><p>${ui.esc(riddle.text)}</p></div>
          <div class="options ${many ? 'six' : ''}">${riddle.options.map(w => `<button class="option" data-t="${ui.esc(w.text)}">${ui.pic(w, 'pic-lg')}<b>${ui.esc(w.text)}</b></button>`).join('')}</div></div>`;
        await api.say(clip, { interrupt: true });
        let done = false; let misses = 0;
        while (!done) {
          const btn = await clickOne(stage, '.option:not(.gone)', api);
          if (!btn) return {};
          if (btn.dataset.t === riddle.answer) {
            done = true;
            btn.classList.add('right');
          } else {
            misses += 1;
            api.wrong(btn);
            btn.classList.add('gone');
            // После двух ошибок — подсказка: загадка звучит ещё раз.
            await api.say(misses >= 2 ? [speech.line('riddleHint'), clip] : speech.line('tryAgain'), { interrupt: true });
          }
        }
      }
      if (!api.alive()) return {};
      sfx.play('fanfare');
      ui.confetti(20);
      const st = Y.app.state;
      st.progress.riddleSolved = (Number(st.progress.riddleSolved) || 0) + 1;
      Y.app.save();
      await api.say(speech.line('riddleRight'), { protect: true });
      const word = riddle.word;
      const sound = (word.targets[0] && word.targets[0].sound) || 'с';
      if (word.targets.length && word.targets.every(t => core.speakableSound(Y.app.state, t.sound))) {
        await Y.gameHelpers.sayWord(api, word, sound, { compact: true });
      } else {
        await api.say(speech.word(word), { interrupt: true });
      }
    }
    return { stars: 3 };
  }

  // Трудная загадка: отгадку нужно собрать из слогов (есть лишние). Картинка — в конце, как награда.
  async function buildAnswer(stage, riddle, clip, api) {
    const { ui, speech, sfx } = api;
    stage.innerHTML = `<div class="g-riddle build"><div class="riddle-card"><span class="riddle-q">❓</span><p>${ui.esc(riddle.text)}</p></div>
      <div class="riddle-build"><div class="build-pic">❓</div>
        <div class="build-line">${riddle.syllables.map(() => '<span class="slot"></span>').join('')}</div></div>
      <p class="muted center small">Собери отгадку из слогов</p>
      <div class="pieces">${riddle.tiles.map((t, i) => `<button class="piece syl-tile" data-i="${i}">${ui.esc(t.text)}</button>`).join('')}</div></div>`;
    await api.say([clip, speech.line('riddleBuild')], { interrupt: true, gap: 300 });
    let filled = 0;
    const next = () => Array.from(stage.querySelectorAll('.syl-tile:not(:disabled)')).filter(n => riddle.tiles[Number(n.dataset.i)].order === filled);
    while (filled < riddle.syllables.length) {
      const btn = await ui.tapWait(stage, '.syl-tile:not(:disabled)', api, { hintNodes: next, replay: () => speech.play(clip) });
      if (!btn || !api.alive()) return false;
      const tile = riddle.tiles[Number(btn.dataset.i)];
      speech.play(speech.syll(tile.text), { interrupt: true });
      if (tile.order === filled) {
        const slot = stage.querySelectorAll('.build-line .slot')[filled];
        slot.textContent = tile.text;
        slot.classList.add('filled');
        btn.disabled = true;
        sfx.play('pop');
        filled += 1;
      } else {
        api.wrong(btn);
      }
    }
    stage.querySelector('.build-line').classList.add('right');
    const pic = stage.querySelector('.build-pic');
    pic.innerHTML = ui.pic(riddle.word, 'pic-xl');
    pic.classList.add('open');
    return true;
  }

  async function poem(stage, item, api) {
    const { ui, speech, sfx } = api;
    stage.innerHTML = `<div class="g-poem"><div class="poem-head"><span class="poem-hero">${item.emoji}</span><h1>${ui.esc(item.title)}</h1></div>
      <ol class="poem-lines">${item.lines.map(line => `<li>${ui.esc(line)}</li>`).join('')}</ol>
      <div class="poem-progress"><i></i></div></div>`;
    const lines = stage.querySelectorAll('.poem-lines li');
    const bar = stage.querySelector('.poem-progress i');
    const hero = stage.querySelector('.poem-hero');
    for (let i = 0; i < item.lines.length; i += 1) {
      if (!api.alive()) return {};
      lines.forEach((li, j) => li.classList.toggle('current', j === i));
      const clip = { key: `po:${item.id}:${i}`, text: item.lines[i] };
      hero.classList.add('talking');
      const res = await api.sayStep({ item: clip, stat: '', sound: item.sound, prompt: i === 0, maxMs: 7500, endSilenceMs: 800, minMs: 300, compact: true, label: 'Повторила ✓' });
      hero.classList.remove('talking');
      lines[i].classList.remove('current');
      lines[i].classList.add(res.heard ? 'done' : 'skipped');
      bar.style.width = `${Math.round(((i + 1) / item.lines.length) * 100)}%`;
      sfx.play('step');
    }
    if (!api.alive()) return {};
    stage.querySelector('.g-poem').classList.add('complete');
    sfx.play('fanfare');
    ui.confetti(28);
    await api.say(speech.line('poemDone'), { protect: true });
    return { stars: 4 };
  }
})(window);

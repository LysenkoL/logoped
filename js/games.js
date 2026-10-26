(function (root) {
  'use strict';
  const Y = root.Yazychok;
  Y.games = Y.games || {};

  // ─────────────────────────────────────────────────────────────
  // Помощники
  // ─────────────────────────────────────────────────────────────
  function wordCard(ui, word, cls) {
    return `<div class="word-card ${cls || ''}">${ui.pic(word, 'pic-xl')}<b>${ui.esc(word.text)}</b></div>`;
  }

  // Ждём нажатия на один из элементов. null — если занятие закрыли.
  // Ожидание нажатия с подсказками (см. ui.tapWait): экран не «зависает», если ребёнок не понял, что делать.
  function clickOne(scope, selector, api, options) {
    return Y.ui.tapWait(scope, selector, api, Object.assign({ replay: () => api.replay && api.replay() }, options || {}));
  }

  // Как clickOne, но не ждёт бесконечно: через ms вернёт 'timeout' (игра сама пойдёт дальше).
  function clickOrTimeout(scope, selector, api, ms) {
    return new Promise(resolve => {
      let timer = null;
      const handler = event => {
        const target = event.target.closest(selector);
        if (!target || !scope.contains(target) || target.disabled) return;
        scope.removeEventListener('click', handler);
        clearTimeout(timer);
        resolve(target);
      };
      scope.addEventListener('click', handler);
      timer = setTimeout(() => { scope.removeEventListener('click', handler); resolve('timeout'); }, ms);
      api.cleanup(() => { clearTimeout(timer); scope.removeEventListener('click', handler); resolve(null); });
    });
  }

  function dots(count, done) {
    return Array.from({ length: count }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  }

  async function sayWord(api, word, sound, extra) {
    return api.sayStep(Object.assign({
      item: api.speech.word(word), stat: word.text, sound,
      show: `${api.ui.pic(word, 'pic-md')}<b>${api.ui.esc(word.text)}</b>`
    }, extra || {}));
  }

  function soundTitle(ui, sound, text) {
    return `<div class="g-head">${text || ''} ${ui.badge(sound, 'big')}</div>`;
  }

  // ─────────────────────────────────────────────────────────────
  // Есть звук или нет?
  // ─────────────────────────────────────────────────────────────
  Y.games.soundCheck = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    stage.innerHTML = `<div class="g-check">${soundTitle(ui, p.sound, 'Есть звук')}
      <div class="card-slot"></div>
      <div class="answer-row"><button class="btn good huge" data-v="1">👍 Есть</button><button class="btn secondary huge" data-v="0">👎 Нет</button></div>
      <div class="g-dots">${dots(p.items.length, 0)}</div></div>`;
    const slot = stage.querySelector('.card-slot');
    for (let i = 0; i < p.items.length; i += 1) {
      const item = p.items[i];
      slot.innerHTML = wordCard(ui, item.word, 'pop-in');
      const replay = () => speech.play(speech.word(item.word));
      api.setReplay(replay);
      await api.say(speech.word(item.word), { interrupt: true });
      let answered = false;
      while (!answered) {
        const btn = await clickOne(stage, '[data-v]', api);
        if (!btn || !api.alive()) return {};
        if ((btn.dataset.v === '1') === item.answer) {
          answered = true;
          sfx.play('ding');
          slot.firstElementChild.classList.add('right');
          ui.sparkleAt(slot.firstElementChild);
          await api.praiseShort();
        } else {
          api.wrong(btn);
          await api.say([speech.line('tryAgain'), speech.word(item.word)], { interrupt: true });
        }
      }
      stage.querySelector('.g-dots').innerHTML = dots(p.items.length, i + 1);
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Найди пару + назови
  // ─────────────────────────────────────────────────────────────
  Y.games.memoryPairs = async (stage, step, api) => {
    const { ui, sfx } = api;
    const p = step.payload;
    stage.innerHTML = `<div class="g-memory"><div class="memory-grid" style="--cols:${Math.ceil(p.cards.length / 2)}">${p.cards.map(card => `
      <button class="memory-card" data-id="${card.id}" data-pair="${card.pair}"><span class="back">❓</span><span class="front">${ui.pic(card.word, 'pic-lg')}<small>${ui.esc(card.word.text)}</small></span></button>`).join('')}</div></div>`;
    const grid = stage.querySelector('.memory-grid');
    let matched = 0;
    const pairs = p.cards.length / 2;
    let open = [];
    while (matched < pairs && api.alive()) {
      const btn = await clickOne(grid, '.memory-card:not(.open):not(.matched)', api);
      if (!btn) return {};
      btn.classList.add('open');
      sfx.play('click');
      open.push(btn);
      if (open.length < 2) continue;
      const [a, b] = open;
      open = [];
      if (a.dataset.pair === b.dataset.pair) {
        a.classList.add('matched'); b.classList.add('matched');
        sfx.play('ding');
        ui.sparkleAt(b);
        matched += 1;
        const card = p.cards.find(c => c.pair === a.dataset.pair);
        await sayWord(api, card.word, p.sound, { prompt: matched === 1 });
      } else {
        await api.wait(850);
        a.classList.remove('open'); b.classList.remove('open');
      }
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Разложи по домикам (различение пары звуков)
  // ─────────────────────────────────────────────────────────────
  Y.games.groupSort = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    const bLabel = p.pairSound ? ui.badge(p.pairSound, 'big') : '<span class="sound-chip big" style="--c:#70809c">Другие</span>';
    stage.innerHTML = `<div class="g-sort">
      <div class="card-slot"></div>
      <div class="houses">
        <button class="house-btn" data-g="a" style="--c:${ui.soundColor(p.sound)}"><span class="house-roof">🏠</span>${ui.badge(p.sound, 'big')}<span class="house-items"></span></button>
        <button class="house-btn" data-g="b" style="--c:${p.pairSound ? ui.soundColor(p.pairSound) : '#70809c'}"><span class="house-roof">🏡</span>${bLabel}<span class="house-items"></span></button>
      </div></div>`;
    const slot = stage.querySelector('.card-slot');
    for (const item of p.items) {
      if (!api.alive()) return {};
      slot.innerHTML = wordCard(ui, item.word, 'pop-in');
      api.setReplay(() => speech.play(speech.word(item.word)));
      await api.say(speech.word(item.word), { interrupt: true });
      let done = false;
      while (!done) {
        const btn = await clickOne(stage, '.house-btn', api);
        if (!btn) return {};
        if (btn.dataset.g === item.group) {
          done = true;
          sfx.play('whoosh');
          btn.querySelector('.house-items').insertAdjacentHTML('beforeend', ui.pic(item.word, 'pic-sm'));
          slot.innerHTML = '';
          await sayWord(api, item.word, item.group === 'a' ? p.sound : (p.pairSound || p.sound), { compact: true });
        } else {
          api.wrong(btn);
          await api.say([speech.line('tryAgain'), speech.word(item.word)], { interrupt: true });
        }
      }
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Закончи чистоговорку
  // ─────────────────────────────────────────────────────────────
  Y.games.finishPhrase = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    for (const phrase of p.phrases) {
      if (!api.alive()) return {};
      stage.innerHTML = `<div class="g-phrase"><div class="bubble">🎤 <span class="phrase-text">${ui.esc(phrase.prompt)} <b class="blank">…</b></span></div>
        <div class="options">${phrase.options.map((opt, i) => `<button class="option" data-i="${i}">${ui.pic(opt, 'pic-lg')}<b>${ui.esc(opt.text)}</b></button>`).join('')}</div></div>`;
      api.setReplay(() => speech.play(speech.prompt(phrase)));
      await api.say(speech.prompt(phrase), { interrupt: true });
      let done = false;
      while (!done) {
        const btn = await clickOne(stage, '.option', api);
        if (!btn) return {};
        const opt = phrase.options[Number(btn.dataset.i)];
        if (opt.correct) {
          done = true;
          sfx.play('ding');
          btn.classList.add('right');
          stage.querySelector('.phrase-text').textContent = phrase.text;
          await api.sayStep({ item: speech.phrase(phrase), stat: phrase.text, sound: p.sound, maxMs: 7000, endSilenceMs: 750, minMs: 300, show: `<b>${ui.esc(phrase.text)}</b>` });
        } else {
          api.wrong(btn);
          await api.say(speech.prompt(phrase), { interrupt: true });
        }
      }
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Повторяй за мной (фразы)
  // ─────────────────────────────────────────────────────────────
  Y.games.repeatPhrase = async (stage, step, api) => {
    const { ui, speech } = api;
    const p = step.payload;
    for (let i = 0; i < p.phrases.length; i += 1) {
      const phrase = p.phrases[i];
      if (!api.alive()) return {};
      stage.innerHTML = `<div class="g-repeat"><div class="bubble big-bubble">🗣️ ${ui.esc(phrase.text)}</div><div class="g-dots">${dots(p.phrases.length, i)}</div></div>`;
      await api.sayStep({ item: speech.phrase(phrase), stat: phrase.text, sound: p.sound, prompt: i === 0, maxMs: 8000, endSilenceMs: 800, minMs: 300 });
      await api.praiseShort();
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Попугай: повторяет голос ребёнка
  // ─────────────────────────────────────────────────────────────
  Y.games.parrot = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    for (let i = 0; i < p.items.length; i += 1) {
      const item = p.items[i];
      if (!api.alive()) return {};
      const isWord = p.mode === 'words';
      const times = isWord ? 1 : (item.syllable && item.syllable.kind === 'between' ? 2 : 3);
      const label = isWord ? item.text : Array.from({ length: times }, () => item.text.toUpperCase()).join('-');
      stage.innerHTML = `<div class="g-parrot"><div class="parrot-perch"><span class="parrot">🦜</span></div>
        <div class="parrot-card">${isWord ? ui.pic(item.word, 'pic-xl') : ''}<b class="${isWord ? '' : 'syll-big'}">${ui.esc(isWord ? item.text : label)}</b></div>
        <div class="g-dots">${dots(p.items.length, i)}</div></div>`;
      const clip = isWord ? speech.word(item.word) : speech.syll(item.text);
      const res = await api.sayStep({ item: clip, repeat: times, stat: item.text, sound: p.sound, prompt: i === 0, record: true, compact: true, maxMs: 6000 });
      if (!api.alive()) return {};
      const parrot = stage.querySelector('.parrot');
      if (res.heard && res.blob && res.blob.size > 2000) {
        parrot.classList.add('talking');
        sfx.play('boing');
        await playBlob(res.blob, api);
        parrot.classList.remove('talking');
        await api.wait(250);
      } else if (res.heard) {
        parrot.classList.add('talking');
        await api.say(Array.from({ length: times }, () => clip), { interrupt: true, gap: 140 });
        parrot.classList.remove('talking');
      }
      await api.praiseShort();
      Y.saveChildRecording && res.blob && res.heard && Y.saveChildRecording(res.blob, item.text);
    }
    return { stars: 3 };
  };

  function playBlob(blob, api) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = 1.08;
      const done = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onended = done; audio.onerror = done;
      audio.play().catch(done);
      api.cleanup(() => { try { audio.pause(); } catch (error) {} done(); });
      setTimeout(done, 8000);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Лента: картинки едут, лови со звуком
  // ─────────────────────────────────────────────────────────────
  function movingGame(stage, step, api, kind) {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    const targets = p.items.filter(item => item.answer).length;
    stage.innerHTML = kind === 'conveyor'
      ? `<div class="g-conveyor">${soundTitle(ui, p.sound, 'Лови со звуком')}<div class="belt-area"></div><div class="basket">🧺 <b class="caught">0</b> / ${targets}</div></div>`
      : `<div class="g-balloons">${soundTitle(ui, p.sound, 'Лопай шарики со звуком')}<div class="sky-area"></div><div class="basket">🎈 <b class="caught">0</b> / ${targets}</div></div>`;
    const area = stage.querySelector(kind === 'conveyor' ? '.belt-area' : '.sky-area');
    const counter = stage.querySelector('.caught');
    const colors = ['#ff6b8b', '#ffb347', '#6bd08b', '#6aa8ff', '#b388ff', '#ffd166'];
    let caught = 0; let spawned = 0;
    api.setReplay(() => speech.play([speech.line(kind === 'conveyor' ? 'g.conveyor' : 'g.balloons'), speech.snd(p.sound)]));
    return new Promise(resolve => {
      let finished = false;
      const finish = () => { if (!finished) { finished = true; resolve({ stars: 3 }); } };
      api.cleanup(() => { finished = true; resolve({}); });
      const checkEnd = () => { if (spawned >= p.items.length && !area.querySelector('.belt-item, .balloon-item')) setTimeout(finish, 450); };
      // Медленно: читать не нужно — каждую картинку игра называет вслух, когда она появляется.
      const duration = kind === 'conveyor' ? 11000 : 11500;
      const gap = kind === 'conveyor' ? 2600 : 2500;
      p.items.forEach((item, index) => {
        const timer = setTimeout(() => {
          if (!api.alive() || finished) return;
          const node = document.createElement('button');
          node.className = kind === 'conveyor' ? 'belt-item' : 'balloon-item';
          if (kind === 'balloons') {
            node.style.left = `${8 + Math.random() * 76}%`;
            node.style.setProperty('--c', colors[index % colors.length]);
            node.style.setProperty('--sway', `${(Math.random() - 0.5) * 60}px`);
          }
          node.style.animationDuration = `${duration}ms`;
          node.innerHTML = `${ui.pic(item.word, 'pic-lg')}<b>${ui.esc(item.word.text)}</b>`;
          setTimeout(() => { if (api.alive() && node.isConnected && !node.classList.contains('hit')) speech.play(speech.word(item.word), { interrupt: true }); }, 700);
          node.onclick = () => {
            if (node.classList.contains('hit')) return;
            if (item.answer) {
              node.classList.add('hit');
              sfx.play(kind === 'conveyor' ? 'whoosh' : 'pop');
              ui.sparkleAt(node);
              speech.play(speech.word(item.word), { interrupt: true });
              caught += 1;
              counter.textContent = caught;
              setTimeout(() => { node.remove(); checkEnd(); }, 450);
            } else {
              api.wrong(node);
              sfx.play('boing');
            }
          };
          node.addEventListener('animationend', event => {
            if (event.target !== node) return;
            node.remove();
            checkEnd();
          });
          spawned += 1;
          area.appendChild(node);
        }, 500 + index * gap);
        api.cleanup(() => clearTimeout(timer));
      });
    });
  }

  Y.games.conveyor = (stage, step, api) => movingGame(stage, step, api, 'conveyor');
  Y.games.balloons = (stage, step, api) => movingGame(stage, step, api, 'balloons');

  // ─────────────────────────────────────────────────────────────
  // Где спрятался звук? (вагончики: начало, середина, конец)
  // ─────────────────────────────────────────────────────────────
  Y.games.soundPosition = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    const labels = { s: 'В начале', m: 'В середине', e: 'В конце' };
    for (let i = 0; i < p.items.length; i += 1) {
      const item = p.items[i];
      if (!api.alive()) return {};
      stage.innerHTML = `<div class="g-position">${soundTitle(ui, p.sound, 'Где звук')}
        <div class="card-slot">${wordCard(ui, item.word, 'pop-in')}</div>
        <div class="train"><span class="engine">🚂</span>${['s', 'm', 'e'].map(pos => `<button class="wagon" data-pos="${pos}"><span class="wagon-body"></span><small>${labels[pos]}</small></button>`).join('')}</div>
        <div class="g-dots">${dots(p.items.length, i)}</div></div>`;
      api.setReplay(() => speech.play(speech.word(item.word)));
      await api.say(speech.word(item.word), { interrupt: true });
      let done = false;
      while (!done) {
        const btn = await clickOne(stage, '.wagon', api);
        if (!btn) return {};
        if (btn.dataset.pos === item.position) {
          done = true;
          sfx.play('ding');
          btn.classList.add('right');
          btn.querySelector('.wagon-body').innerHTML = ui.badge(p.sound);
          await sayWord(api, item.word, p.sound, { compact: true });
        } else {
          api.wrong(btn);
          await api.say([speech.line('tryAgain'), speech.word(item.word)], { interrupt: true });
        }
      }
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Собери слово из слогов
  // ─────────────────────────────────────────────────────────────
  Y.games.syllableBuilder = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    for (let i = 0; i < p.items.length; i += 1) {
      const item = p.items[i];
      if (!api.alive()) return {};
      stage.innerHTML = `<div class="g-builder"><div class="builder-pic">${ui.pic(item.word, 'pic-xl')}</div>
        <div class="build-line">${item.pieces.map(() => '<span class="slot"></span>').join('')}</div>
        <div class="pieces">${item.pieces.map(piece => `<button class="piece" data-id="${piece.id}">${ui.esc(piece.text)}</button>`).join('')}</div>
        <div class="g-dots">${dots(p.items.length, i)}</div></div>`;
      api.setReplay(() => speech.play(speech.word(item.word)));
      await api.say(speech.word(item.word), { interrupt: true });
      let built = 0;
      while (built < item.pieces.length) {
        const btn = await clickOne(stage, '.piece:not(:disabled)', api);
        if (!btn) return {};
        const piece = item.pieces.find(x => x.id === btn.dataset.id);
        if (piece.order === built) {
          btn.disabled = true;
          stage.querySelectorAll('.build-line .slot')[built].textContent = piece.text;
          stage.querySelectorAll('.build-line .slot')[built].classList.add('filled');
          built += 1;
          sfx.play('step');
          speech.play(speech.syll(piece.text), { interrupt: true });
        } else {
          api.wrong(btn);
        }
      }
      sfx.play('ding');
      stage.querySelector('.build-line').classList.add('right');
      await sayWord(api, item.word, p.sound, { compact: true });
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Бей крота
  // ─────────────────────────────────────────────────────────────
  // Спокойный темп: один крот за раз, показывает картинку и говорит слово (читать не нужно).
  // Есть звук — стукнуть крота, нет — кнопка «Нет звука». Не ответила за 15 секунд — игра сама объясняет и идёт дальше.
  Y.games.whackMole = async (stage, step, api) => {
    const { ui, speech, sfx, art, data } = api;
    const p = step.payload;
    const HOLES = 6;
    const rounds = p.items;
    stage.innerHTML = `<div class="g-mole">${soundTitle(ui, p.sound, 'Есть звук — стукни крота!')}
      <div class="mole-field">${Array.from({ length: HOLES }, (_, i) => `<div class="hole" data-h="${i}"><div class="mole-pop"><div class="mole-sign"></div><div class="mole-body">${art.mole()}</div></div><div class="hole-front"></div></div>`).join('')}</div>
      <div class="mole-bar"><button class="btn secondary big mole-no">🙅 Нет звука</button><div class="g-dots">${dots(rounds.length, 0)}</div><div class="basket">🔨 <b class="caught">0</b></div></div></div>`;
    const field = stage.querySelector('.mole-field');
    const counter = stage.querySelector('.caught');
    const clip = item => {
      const word = p.mode === 'words' && data.WORDS.find(w => w.text === item.text);
      return word ? speech.word(word) : speech.syll(item.text);
    };
    let right = 0; let lastHole = -1;
    for (let i = 0; i < rounds.length; i += 1) {
      if (!api.alive()) return {};
      const item = rounds[i];
      let h = Math.floor(Math.random() * HOLES);
      if (h === lastHole) h = (h + 1 + Math.floor(Math.random() * (HOLES - 1))) % HOLES;
      lastHole = h;
      const hole = field.querySelector(`[data-h="${h}"]`);
      hole.querySelector('.mole-sign').innerHTML = p.mode === 'words'
        ? `${ui.pic(item, 'pic-lg')}<small>${ui.esc(item.text)}</small>`
        : `<b class="syll">${ui.esc(item.text.toUpperCase())}</b><small>🔊</small>`;
      hole.dataset.answer = item.answer ? '1' : '0';
      hole.dataset.text = item.text;
      hole.classList.remove('bonked', 'giggle', 'sad');
      hole.classList.add('up');
      sfx.play('whoosh');
      await api.wait(380);
      const replay = () => speech.play(clip(item), { interrupt: true });
      api.setReplay(replay);
      await api.say(clip(item), { interrupt: true });
      if (!api.alive()) return {};
      const answer = await clickOrTimeout(stage, '.hole.up .mole-pop, .mole-no', api, 15000);
      if (!api.alive() || answer === null) return {};
      const saidYes = answer !== 'timeout' && !answer.classList.contains('mole-no');
      const correct = answer === 'timeout' ? !item.answer : saidYes === item.answer;
      if (correct) {
        right += 1;
        counter.textContent = right;
        if (item.answer) {
          hole.classList.add('bonked');
          sfx.play('pop');
          ui.sparkleAt(hole);
          await api.say(speech.line('moleYes'), { interrupt: true });
        } else {
          hole.classList.add('giggle');
          sfx.play('ding');
          if (answer !== 'timeout') await api.say(speech.line('moleNoRight'), { interrupt: true });
        }
      } else {
        hole.classList.add('sad');
        if (answer !== 'timeout') api.wrong(answer);
        const why = item.answer ? (answer === 'timeout' ? 'moleMissed' : 'moleHasSound') : 'moleNoSound';
        await api.say([speech.line(why), clip(item)], { interrupt: true, gap: 160 });
      }
      await api.wait(450);
      hole.classList.remove('up');
      const dotsNode = stage.querySelector('.g-dots');
      if (dotsNode) dotsNode.innerHTML = dots(rounds.length, i + 1);
      await api.wait(500);
    }
    return { stars: right >= rounds.length - 2 ? 3 : 2 };
  };

  // ─────────────────────────────────────────────────────────────
  // Бусы из слов: каждая новая бусинка — новое слово; говорим всю цепочку по порядку (память + речь)
  // ─────────────────────────────────────────────────────────────
  Y.games.beads = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    const colors = ['#ff8fab', '#ffc46b', '#8fe3a8', '#8cc8ff', '#c7a6ff'];
    stage.innerHTML = `<div class="g-beads">${soundTitle(ui, p.sound, 'Бусы из слов')}
      <div class="beads-string"><i class="thread"></i></div><div class="g-dots">${dots(p.items.length, 0)}</div></div>`;
    const string = stage.querySelector('.beads-string');
    for (let n = 0; n < p.items.length; n += 1) {
      if (!api.alive()) return {};
      const word = p.items[n];
      const bead = ui.el(`<div class="bead new" style="--c:${colors[n % colors.length]}">${ui.pic(word, 'pic-lg')}<small>${ui.esc(word.text)}</small></div>`);
      string.appendChild(bead);
      sfx.play('pop');
      await api.wait(500);
      bead.classList.remove('new');
      const chain = p.items.slice(0, n + 1);
      if (n > 0) await api.say(speech.line('beadsNext'), { interrupt: true });
      // Пока звучит цепочка, бусинки подсвечиваются по очереди.
      const beads = Array.from(string.querySelectorAll('.bead'));
      beads.forEach((b, i) => setTimeout(() => { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 700); }, i * 900));
      await api.sayStep({ items: chain.map(w => speech.word(w)), stat: word.text, sound: p.sound, prompt: n === 0, compact: true,
        show: chain.map(w => ui.pic(w, 'pic-sm')).join(' '), maxMs: 2500 + chain.length * 1600, endSilenceMs: 900, noStyle: true });
      if (!api.alive()) return {};
      beads.forEach(b => b.classList.add('done'));
      stage.querySelector('.g-dots').innerHTML = dots(p.items.length, n + 1);
    }
    string.classList.add('complete');
    sfx.play('fanfare');
    ui.confetti(30);
    await api.say(speech.line('beadsDone'), { interrupt: true, protect: true });
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Покорми питомца: нажми на картинку, назови её — питомец съест «словечко»
  // ─────────────────────────────────────────────────────────────
  Y.games.feedPet = async (stage, step, api) => {
    const { ui, speech, sfx, art } = api;
    const p = step.payload;
    const app = Y.app;
    const petId = app.state.progress.pets.active;
    const pet = Y.core.PETS.find(item => item.id === petId);
    const petHtml = petId ? app.petMarkup(petId, 210, 'bob', { grow: true }) : art.mascot(180);
    stage.innerHTML = `<div class="g-feed">${soundTitle(ui, p.sound, `Покорми ${pet ? ui.esc(pet.acc || pet.name) : 'Язычка'}`)}
      <div class="feed-scene"><div class="feed-pet">${petHtml}<div class="pet-bubble"></div></div><div class="feed-spoon"></div></div>
      <div class="feed-plate">${p.items.map((word, i) => `<button class="feed-card" data-i="${i}">${ui.pic(word, 'pic-lg')}<small>${ui.esc(word.text)}</small></button>`).join('')}</div>
      <div class="g-dots">${dots(p.items.length, 0)}</div></div>`;
    const petBox = () => stage.querySelector('.feed-pet .pet-box');
    const bubble = text => { const b = stage.querySelector('.feed-pet .pet-bubble'); if (!b) return; b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 1800); };
    api.setReplay(() => speech.play(speech.line('g.feedPet')));
    for (let n = 0; n < p.items.length; n += 1) {
      if (!api.alive()) return {};
      const card = await clickOne(stage, '.feed-card:not(.eaten)', api);
      if (!card || !api.alive()) return {};
      const word = p.items[Number(card.dataset.i)];
      sfx.play('pop');
      // Картинка «на ложке» перед питомцем, ребёнок называет слово.
      const spoon = stage.querySelector('.feed-spoon');
      spoon.innerHTML = `${ui.pic(word, 'pic-xl')}`;
      spoon.classList.remove('eat'); spoon.classList.add('show');
      card.classList.add('eaten');
      await sayWord(api, word, p.sound, { compact: true, prompt: n === 0 });
      if (!api.alive()) return {};
      spoon.classList.add('eat');
      const box = petBox();
      if (box) { box.classList.remove('chomp'); void box.offsetWidth; box.classList.add('chomp'); }
      sfx.play('pop');
      const line = speech.petLine('eatWord');
      if (line) { bubble(line.text); await api.say(line, { interrupt: true }); }
      await api.wait(500);
      spoon.classList.remove('show', 'eat');
      stage.querySelector('.g-dots').innerHTML = dots(p.items.length, n + 1);
    }
    if (petId) { Y.core.addPetJoy(app.state, petId, 1, app.today(), 'feedWords'); app.save(); }
    sfx.play('sparkle');
    ui.confetti(20);
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Колесо фортуны
  // ─────────────────────────────────────────────────────────────
  Y.games.wheel = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    const n = p.items.length;
    const colors = ['#ff8fab', '#ffc46b', '#8fe3a8', '#8cc8ff', '#c7a6ff', '#ffe28a', '#7fe0d6', '#ffab91'];
    const seg = 360 / n;
    const slices = p.items.map((word, i) => {
      const a0 = (i * seg - 90) * Math.PI / 180; const a1 = ((i + 1) * seg - 90) * Math.PI / 180;
      const x0 = 100 + 96 * Math.cos(a0); const y0 = 100 + 96 * Math.sin(a0);
      const x1 = 100 + 96 * Math.cos(a1); const y1 = 100 + 96 * Math.sin(a1);
      const mid = ((i + 0.5) * seg - 90) * Math.PI / 180;
      const tx = 100 + 64 * Math.cos(mid); const ty = 100 + 64 * Math.sin(mid);
      return `<path d="M100 100 L${x0.toFixed(1)} ${y0.toFixed(1)} A96 96 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="2"/>
        <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="22" text-anchor="middle" dominant-baseline="central">${word.emoji}</text>`;
    }).join('');
    stage.innerHTML = `<div class="g-wheel"><div class="wheel-wrap"><div class="wheel-pointer">▼</div>
      <svg class="wheel" viewBox="0 0 200 200">${slices}<circle cx="100" cy="100" r="16" fill="#fff" stroke="#e7e7e7" stroke-width="3"/></svg></div>
      <div class="wheel-side"><div class="card-slot"></div><button class="btn big spin">🎡 Крутить!</button><div class="g-dots">${dots(p.spins, 0)}</div></div></div>`;
    const wheel = stage.querySelector('.wheel');
    const spinBtn = stage.querySelector('.spin');
    const slot = stage.querySelector('.card-slot');
    let angle = 0;
    const used = new Set();
    for (let s = 0; s < p.spins; s += 1) {
      if (!api.alive()) return {};
      spinBtn.disabled = false;
      const btn = await clickOne(stage, '.spin', api, { auto: true });
      if (!btn) return {};
      spinBtn.disabled = true;
      slot.innerHTML = '';
      let index;
      do { index = Math.floor(Math.random() * n); } while (used.has(index) && used.size < n);
      used.add(index);
      const target = 360 * (4 + Math.floor(Math.random() * 2)) + (360 - (index + 0.5) * seg);
      angle = angle - (angle % 360) + target;
      wheel.style.transition = 'transform 3.2s cubic-bezier(.17,.67,.2,1)';
      wheel.style.transform = `rotate(${angle}deg)`;
      sfx.play('whoosh');
      const ticker = api.every(180, () => sfx.play('tick'));
      await api.wait(3300);
      ticker();
      const word = p.items[index];
      slot.innerHTML = wordCard(api.ui, word, 'pop-in');
      sfx.play('ding');
      await sayWord(api, word, p.sound, { prompt: s === 0, compact: true });
      stage.querySelector('.g-dots').innerHTML = dots(p.spins, s + 1);
      await api.praiseShort();
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Открой коробку
  // ─────────────────────────────────────────────────────────────
  Y.games.boxes = async (stage, step, api) => {
    const { ui, speech, sfx, art } = api;
    const p = step.payload;
    const bows = ['#ff6b8b', '#6aa8ff', '#6bd08b', '#ffb347', '#b388ff', '#ffd166', '#7fe0d6', '#ff8a65'];
    stage.innerHTML = `<div class="g-boxes"><div class="box-grid">${p.boxes.map((box, i) => `<button class="gift-box" data-i="${i}" style="--c:${bows[i % bows.length]}"><span class="lid"></span><span class="box-body">🎁</span><span class="box-inside"></span></button>`).join('')}</div></div>`;
    let opened = 0;
    while (opened < p.boxes.length && api.alive()) {
      const btn = await clickOne(stage, '.gift-box:not(.opened)', api, { auto: true });
      if (!btn) return {};
      const box = p.boxes[Number(btn.dataset.i)];
      btn.classList.add('opened');
      opened += 1;
      sfx.play('chest');
      const inside = btn.querySelector('.box-inside');
      if (box.type === 'word') {
        inside.innerHTML = `${ui.pic(box.word, 'pic-md')}<b>${ui.esc(box.word.text)}</b>`;
        await sayWord(api, box.word, p.sound, { prompt: opened === 1, compact: true });
      } else if (box.type === 'star') {
        inside.innerHTML = '<span class="pic pic-md">🌟</span><b>Звезда!</b>';
        ui.confetti(12);
        api.star(2, btn);
        await api.say(speech.line('praiseShort'), { protect: true });
      } else {
        inside.innerHTML = '<span class="pic pic-md">🍄</span><b>Грибочек!</b>';
        const m = ui.modal(`<div class="center">${art.face({ size: 180, mouth: 'open-wide', tongue: 'suck-up' })}<h2>Грибочек — 5 секунд!</h2><div class="lock-count" data-left>5</div></div>`, { dismissible: false });
        await api.say(speech.exercise(api.data.DEFAULT_EXERCISES[0]), { interrupt: true });
        for (let left = 5; left > 0 && api.alive(); left -= 1) {
          m.node.querySelector('[data-left]').textContent = left;
          sfx.play('tick');
          await api.wait(1000);
        }
        m.close();
        api.mushroom(1);
        sfx.play('sparkle');
      }
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Что пропало?
  // ─────────────────────────────────────────────────────────────
  Y.games.whatsMissing = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    for (let r = 0; r < p.rounds.length; r += 1) {
      const round = p.rounds[r];
      const missing = Array.isArray(round.missing) ? round.missing : [round.missing];
      if (!api.alive()) return {};
      stage.innerHTML = `<div class="g-missing"><div class="missing-row n${round.items.length}">${round.items.map((word, i) => `<div class="missing-cell" data-i="${i}">${ui.pic(word, 'pic-lg')}<b>${ui.esc(word.text)}</b></div>`).join('')}</div><div class="curtain"></div><div class="missing-options"></div></div>`;
      const cells = stage.querySelectorAll('.missing-cell');
      if (r === 0) await api.say(speech.line('g.whatsMissing'), { interrupt: true });
      if (round.say !== false) {
        // Назови все картинки по очереди.
        for (let i = 0; i < round.items.length; i += 1) {
          cells[i].classList.add('focus');
          await api.sayStep({ item: speech.word(round.items[i]), stat: round.items[i].text, sound: p.sound, compact: true });
          cells[i].classList.remove('focus');
          if (!api.alive()) return {};
        }
      } else {
        // Второй раунд: картинки называет игра — запоминаем на слух и глазами.
        await api.say(speech.line('rememberAll'), { interrupt: true });
        for (let i = 0; i < round.items.length; i += 1) {
          cells[i].classList.add('focus');
          await api.say(speech.word(round.items[i]), { interrupt: true });
          await api.wait(350);
          cells[i].classList.remove('focus');
          if (!api.alive()) return {};
        }
        await api.wait(1200);
      }
      const curtain = stage.querySelector('.curtain');
      curtain.classList.add('down');
      await api.say(speech.line('closeEyes'), { interrupt: true });
      await api.wait(1300);
      missing.forEach(i => cells[i].classList.add('gone'));
      curtain.classList.remove('down');
      sfx.play('whoosh');
      const left = new Set(missing.map(i => round.items[i].text));
      const optionsHtml = round.options.map(w => `<button class="option" data-t="${ui.esc(w.text)}">${ui.pic(w, 'pic-md')}<b>${ui.esc(w.text)}</b></button>`).join('');
      stage.querySelector('.missing-options').innerHTML = `<p>${missing.length > 1 ? 'Пропали две картинки!' : 'Что пропало?'}</p>${optionsHtml}`;
      api.setReplay(() => speech.play(speech.line(missing.length > 1 ? 'whatGone2' : 'whatGone')));
      await api.say(speech.line(missing.length > 1 ? 'whatGone2' : 'whatGone'), { interrupt: true });
      while (left.size) {
        const btn = await clickOne(stage, '.missing-options .option:not(.gone):not(.right)', api);
        if (!btn) return {};
        if (left.has(btn.dataset.t)) {
          left.delete(btn.dataset.t);
          btn.classList.add('right');
          const idx = round.items.findIndex(w => w.text === btn.dataset.t);
          cells[idx].classList.remove('gone');
          cells[idx].classList.add('back');
          sfx.play('ding');
          ui.sparkleAt(cells[idx]);
          await sayWord(api, round.items[idx], p.sound, { compact: true });
          if (left.size) await api.say(speech.line('oneMore'), { interrupt: true });
        } else {
          api.wrong(btn);
          btn.classList.add('gone');
        }
      }
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Картинка-загадка: открывай окошки слогами
  // ─────────────────────────────────────────────────────────────
  Y.games.pictureReveal = async (stage, step, api) => {
    const { ui, speech, sfx, core } = api;
    const p = step.payload;
    stage.innerHTML = `<div class="g-reveal"><div class="reveal-box"><div class="reveal-pic">${ui.pic(p.target, 'pic-giant')}</div>
      <div class="reveal-tiles">${p.tiles.map((t, i) => `<button class="tile-cover" data-i="${i}">${ui.esc(t.text.toUpperCase())}</button>`).join('')}</div></div>
      <div class="reveal-options"></div></div>`;
    let opened = 0;
    while (opened < p.tiles.length && api.alive()) {
      const btn = await clickOne(stage, '.tile-cover:not(.open)', api, { auto: true });
      if (!btn) return {};
      const syll = p.tiles[Number(btn.dataset.i)];
      btn.classList.add('active');
      await api.sayStep({ item: speech.syll(syll.text), stat: syll.text, sound: p.sound, prompt: opened === 0, compact: true });
      btn.classList.remove('active');
      btn.classList.add('open');
      sfx.play('pop');
      opened += 1;
    }
    if (!api.alive()) return {};
    stage.querySelector('.reveal-options').innerHTML = `<p>Кто это?</p>${p.options.map(w => `<button class="option" data-t="${ui.esc(w.text)}">${ui.pic(w, 'pic-md')}<b>${ui.esc(w.text)}</b></button>`).join('')}`;
    await api.say(speech.line('whatHidden'), { interrupt: true });
    let done = false;
    while (!done) {
      const btn = await clickOne(stage, '.reveal-options .option', api);
      if (!btn) return {};
      if (btn.dataset.t === p.target.text) {
        done = true;
        sfx.play('fanfare');
        ui.confetti(16);
        const speakable = core.isSpeakable(Y.app.state, p.target, p.sound);
        if (speakable) await sayWord(api, p.target, p.sound, { compact: true });
        else await api.say(speech.word(p.target), { interrupt: true });
      } else api.wrong(btn);
    }
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Поезд слогов
  // ─────────────────────────────────────────────────────────────
  Y.games.syllableTrain = async (stage, step, api) => {
    const { ui, speech, sfx } = api;
    const p = step.payload;
    stage.innerHTML = `<div class="g-train"><div class="rails"><div class="train-line">${p.wagons.map((w, i) => `<div class="s-wagon" data-i="${i}" style="--c:${ui.soundColor(p.sound)}"><b>${ui.esc(w.text.toUpperCase())}</b><span class="wheel-l"></span><span class="wheel-r"></span></div>`).join('')}<span class="engine">🚂</span></div></div></div>`;
    const line = stage.querySelector('.train-line');
    for (let i = 0; i < p.wagons.length; i += 1) {
      if (!api.alive()) return {};
      const wagon = stage.querySelectorAll('.s-wagon')[i];
      wagon.classList.add('current');
      const w = p.wagons[i];
      const times = w.kind === 'between' ? 2 : 3;
      const chain = Array.from({ length: times }, () => w.text.toUpperCase()).join('-');
      await api.sayStep({ item: speech.syll(w.text), repeat: times, stat: w.text, sound: p.sound, prompt: i === 0, compact: true, show: `<b class="chain">${ui.esc(chain)}</b>` });
      wagon.classList.remove('current');
      wagon.classList.add('lit');
      sfx.play('step');
      if (i % 2 === 1) await api.praiseShort();
    }
    sfx.play('fanfare');
    line.classList.add('leave');
    await api.wait(1200);
    return { stars: 3 };
  };

  Y.gameHelpers = { wordCard, clickOne, dots, sayWord };
})(window);

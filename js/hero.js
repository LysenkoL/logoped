// Любимый герой: картинку и имя задаёт мама. Герой — «гость из Германии», Александра учит его русским словам.
// Игры: «Научи героя», «Герой ошибается», «Прятки», «Что сказал герой?» (похожие слова), «Повторюшка» (её голосом), «Рюкзак героя».
(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  const { core, ui, sfx } = Y;
  const { esc } = ui;
  Y.games = Y.games || {};
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};
  const A = () => Y.app;
  const S = () => Y.app.state;

  function dots(count, done) {
    return Array.from({ length: count }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  }

  // Общая сцена: герой слева с облачком, справа карточка.
  function scene(stage) {
    stage.innerHTML = `<div class="g-hero">
      <div class="hero-side"><button class="hero-tap">${A().heroMarkup(200, 'bob', { friend: true })}</button><div class="hero-bubble"></div></div>
      <div class="hero-main"><div class="hero-card"></div><div class="hero-controls"></div><div class="g-dots"></div></div>
    </div>`;
    return {
      bubble: stage.querySelector('.hero-bubble'),
      pic: stage.querySelector('.hero-pic'),
      tap: stage.querySelector('.hero-tap'),
      card: stage.querySelector('.hero-card'),
      controls: stage.querySelector('.hero-controls'),
      dots: stage.querySelector('.g-dots')
    };
  }

  function heroSayer(api, view) {
    return async (items, text, opts) => {
      if (!api.alive()) return;
      view.bubble.textContent = text;
      view.bubble.classList.remove('show'); void view.bubble.offsetWidth; view.bubble.classList.add('show');
      view.pic.classList.add('talking');
      await api.say(items, Object.assign({ interrupt: true }, opts || {}));
      view.pic.classList.remove('talking');
    };
  }

  // Сыграли с героем — дружба крепче. Новое сердечко — праздник: рамка меняется, герой радуется.
  async function friendship(api, view, heroSay) {
    if (!api.alive()) return;
    const up = core.addHeroFriendship(S());
    A().save();
    if (!up) return;
    const pic = view.pic;
    pic.outerHTML = A().heroMarkup(200, 'bob talking friend-up', { friend: true });
    view.pic = view.tap.querySelector('.hero-pic');
    view.bubble.insertAdjacentHTML('afterend', A().heartsMarkup(false));
    sfx.play('fanfare');
    ui.confetti(40);
    const line = api.speech.heroLine('friendUp');
    await heroSay(line, `💞 ${line.text}`);
    ui.toast(`Дружба с героем: «${up.level.name}»`, 'good');
  }

  // ─────────────────────────────────────────────────────────────
  // Научи героя: картинка без подписи, Александра называет — герой повторяет и «запоминает».
  // ─────────────────────────────────────────────────────────────
  Y.games.heroTeach = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const view = scene(stage);
    const heroSay = heroSayer(api, view);
    let last = null;
    view.tap.onclick = () => { if (last) heroSay(last.items, last.text); };
    api.setReplay(() => { if (last) heroSay(last.items, last.text); });
    for (let i = 0; i < p.items.length; i += 1) {
      const word = p.items[i];
      if (!api.alive()) return {};
      view.dots.innerHTML = dots(p.items.length, i);
      view.card.innerHTML = `${ui.pic(word, 'pic-xl')}<b class="hero-word" hidden>${esc(word.text)}</b>`;
      view.controls.innerHTML = '<button class="btn secondary small hero-hint">🔊 Подсказка</button>';
      view.controls.querySelector('.hero-hint').onclick = () => {
        const label = view.card.querySelector('.hero-word');
        if (label) label.hidden = false;
        speech.play(speech.word(word), { interrupt: true });
      };
      const ask = speech.heroLine(i === 0 ? 'teachIntro' : 'ask');
      last = { items: ask, text: ask.text };
      await heroSay(ask, ask.text);
      if (!api.alive()) return {};
      const res = await api.sayStep({ item: speech.word(word), stat: word.text, sound: p.sound, silent: true, compact: true, noStyle: true });
      if (!api.alive()) return {};
      view.controls.innerHTML = '';
      const label = view.card.querySelector('.hero-word');
      if (label) label.hidden = false;
      if (res.verified) {
        const learned = speech.heroLine('learned');
        sfx.play('sparkle');
        ui.confetti(12);
        last = { items: [learned, speech.heroWord(word)], text: `${learned.text} ${word.text}!` };
        await heroSay(last.items, last.text);
      } else if (res.heard) {
        last = { items: [speech.heroWord(word)], text: `${word.text}?` };
        await heroSay(last.items, last.text);
      }
      await api.wait(250);
    }
    view.dots.innerHTML = dots(p.items.length, p.items.length);
    const praise = speech.heroLine('praise');
    await heroSay(praise, praise.text);
    await friendship(api, view, heroSay);
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Герой ошибается: он говорит слово — правильно или «шова» вместо «сова».
  // Александра решает 👍 / 👎, а ошибку исправляет сама — так тренируется слух на звук.
  // ─────────────────────────────────────────────────────────────
  Y.games.heroOops = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const view = scene(stage);
    const heroSay = heroSayer(api, view);
    let utter = null;
    view.tap.onclick = () => { if (utter) heroSay(utter.items, utter.text); };
    const intro = speech.heroLine('oopsIntro');
    await heroSay(intro, intro.text);
    let right = 0;
    for (let i = 0; i < p.rounds.length; i += 1) {
      const round = p.rounds[i];
      if (!api.alive()) return {};
      view.dots.innerHTML = dots(p.rounds.length, i);
      view.card.innerHTML = `${ui.pic(round.word, 'pic-xl')}<b class="hero-word" hidden>${esc(round.word.text)}</b>`;
      view.controls.innerHTML = `<div class="judge-row"><button class="judge yes" data-v="yes" disabled>👍<small>Правильно</small></button><button class="judge no" data-v="no" disabled>👎<small>Неправильно</small></button></div>
        <div class="listen-row"><button class="btn secondary listen-again">🔁 Ещё раз</button><button class="btn secondary listen-slow">🐢 Медленно</button></div>`;
      const spoken = round.wrong ? round.mistake : round.word.text;
      const clip = round.wrong ? speech.heroMistake(round.word, { text: round.mistake, sound: round.mistakeSound || p.sound }) : speech.heroWord(round.word);
      const check = speech.heroLine('check');
      // Слово не пишем — ошибку нужно услышать, а не прочитать.
      utter = { items: [clip, check], text: `🔊 … ${check.text}` };
      // Не расслышали — можно повторить сколько угодно раз, и медленно.
      const again = slow => heroSay([clip], slow ? '🐢 Слушай внимательно…' : '🔁 Слушай…', slow ? { rate: 0.7 } : undefined);
      view.controls.querySelector('.listen-again').onclick = () => again(false);
      view.controls.querySelector('.listen-slow').onclick = () => again(true);
      view.tap.onclick = () => again(false);
      api.setReplay(() => again(false));
      await heroSay(utter.items, utter.text);
      if (!api.alive()) return {};
      const buttons = Array.from(view.controls.querySelectorAll('.judge'));
      buttons.forEach(btn => { btn.disabled = false; });
      const choice = await ui.tapWait(view.controls, '.judge', api, { replay: () => api.replay() });
      if (!choice || !api.alive()) return {};
      buttons.forEach(btn => { btn.disabled = true; });
      view.controls.querySelectorAll('.listen-row button').forEach(btn => { btn.disabled = true; });
      const saysRight = choice.dataset.v === 'yes';
      const label = view.card.querySelector('.hero-word');
      if (saysRight === !round.wrong) {
        right += 1;
        choice.classList.add('ok');
        sfx.play('ding');
      } else {
        api.wrong(choice);
        const hmm = speech.heroLine('notQuite');
        await heroSay([hmm, clip], `${hmm.text} «${spoken}»`);
        buttons.find(btn => btn.dataset.v === (round.wrong ? 'no' : 'yes')).classList.add('ok');
      }
      if (!api.alive()) return {};
      if (round.wrong) {
        const oops = speech.heroLine('wrong');
        await heroSay(oops, oops.text);
        if (label) label.hidden = false;
        view.controls.innerHTML = '';
        const res = await api.sayStep({ item: speech.word(round.word), stat: round.word.text, sound: p.sound, silent: true, compact: true, noStyle: true });
        if (!api.alive()) return {};
        if (res.heard) {
          const thanks = speech.heroLine('thanks');
          await heroSay([thanks, speech.heroWord(round.word)], `${thanks.text} ${round.word.text}!`);
        }
      } else {
        if (label) label.hidden = false;
        const yes = speech.heroLine('right');
        await heroSay(yes, yes.text);
      }
      await api.wait(300);
    }
    view.dots.innerHTML = dots(p.rounds.length, p.rounds.length);
    const praise = speech.heroLine('praise');
    await heroSay(praise, praise.text);
    await friendship(api, view, heroSay);
    return { stars: right >= Math.ceil(p.rounds.length * 0.7) ? 3 : 2 };
  };

  // ─────────────────────────────────────────────────────────────
  // Прятки: герой прячется за одной из картинок. Ребёнок нажимает на картинку и называет её —
  // герой отвечает «не тут!» или выглядывает: «Ку-ку!». Три раунда.
  // ─────────────────────────────────────────────────────────────
  Y.games.heroHide = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const view = scene(stage);
    stage.querySelector('.g-hero').classList.add('g-hide');
    const heroSay = heroSayer(api, view);
    let last = null;
    const replay = () => { if (last) heroSay(last.items, last.text); };
    view.tap.onclick = replay;
    api.setReplay(replay);
    const showRound = round => {
      view.card.className = 'hero-card hide-field';
      view.card.innerHTML = round.items.map((w, i) => `<button class="hide-spot" data-i="${i}" style="--d:${i * 0.12}s">
        <span class="hide-peek"></span><span class="hide-pic">${ui.pic(w, 'pic-lg')}</span><b class="hide-name" hidden>${esc(w.text)}</b></button>`).join('');
    };
    if (p.rounds[0]) showRound(p.rounds[0]);
    view.dots.innerHTML = dots(p.rounds.length, 0);
    const intro = speech.heroLine('hideIntro');
    last = { items: intro, text: intro.text };
    await heroSay(intro, intro.text);
    for (let r = 0; r < p.rounds.length; r += 1) {
      const round = p.rounds[r];
      if (!api.alive()) return {};
      view.dots.innerHTML = dots(p.rounds.length, r);
      view.tap.classList.add('hiding');
      if (r > 0) showRound(round);
      view.controls.innerHTML = '';
      sfx.play('whoosh');
      const hidden = speech.heroLine('hideAgain');
      last = { items: hidden, text: hidden.text };
      await heroSay(hidden, `🙈 ${hidden.text}`);
      view.controls.innerHTML = '<p class="muted hide-tip">Нажми на картинку и назови её</p>';
      while (api.alive()) {
        const spot = await ui.tapWait(view.card, '.hide-spot:not(.checked)', api, { replay: () => api.replay() });
        if (!spot || !api.alive()) return {};
        const i = Number(spot.dataset.i);
        const word = round.items[i];
        view.card.querySelectorAll('.hide-spot').forEach(b => b.classList.toggle('asking', b === spot));
        spot.querySelector('.hide-name').hidden = false;
        view.controls.innerHTML = '';
        await api.sayStep({ item: speech.word(word), stat: word.text, sound: p.sound, silent: true, compact: true, noStyle: true });
        if (!api.alive()) return {};
        spot.classList.remove('asking');
        if (i === round.hideAt) {
          spot.classList.add('found');
          spot.querySelector('.hide-peek').innerHTML = A().heroMarkup(96, 'peek');
          view.card.querySelectorAll('.hide-spot').forEach(b => { b.disabled = true; });
          sfx.play('sparkle');
          ui.confetti(16);
          view.tap.classList.remove('hiding');
          const yes = speech.heroLine('hideFound');
          last = { items: yes, text: yes.text };
          await heroSay(yes, `🎉 ${yes.text}`);
          break;
        }
        spot.classList.add('checked');
        const no = speech.heroLine('hideNo');
        last = { items: no, text: no.text };
        await heroSay(no, no.text);
        view.controls.innerHTML = '<p class="muted hide-tip">Ищи дальше! Нажми на другую картинку</p>';
      }
      await api.wait(500);
    }
    view.tap.classList.remove('hiding');
    view.dots.innerHTML = dots(p.rounds.length, p.rounds.length);
    const praise = speech.heroLine('praise');
    await heroSay(praise, praise.text);
    await friendship(api, view, heroSay);
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Что сказал герой? Две похожие картинки (миска — мишка), герой говорит одно слово — найди какое.
  // После ответа подписи открываются, отличающаяся буква подсвечена.
  // ─────────────────────────────────────────────────────────────
  function markDiff(text, other) {
    return Array.from(text).map((ch, i) => (other[i] !== ch ? `<i class="diff">${esc(ch)}</i>` : esc(ch))).join('');
  }
  Y.games.heroPairs = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const view = scene(stage);
    const heroSay = heroSayer(api, view);
    const showRound = round => {
      const order = round.left === 'a' ? ['a', 'b'] : ['b', 'a'];
      view.card.className = 'hero-card pairs-field';
      view.card.innerHTML = order.map(k => {
        const w = round.pair[k]; const other = round.pair[k === 'a' ? 'b' : 'a'];
        return `<button class="pair-card" data-k="${k}">${ui.pic(w, 'pic-xl')}<b class="pair-word" hidden>${markDiff(w.text, other.text)}</b></button>`;
      }).join('');
    };
    if (p.rounds[0]) showRound(p.rounds[0]);
    view.dots.innerHTML = dots(p.rounds.length, 0);
    const intro = speech.heroLine('pairsIntro');
    await heroSay(intro, intro.text);
    let right = 0;
    for (let r = 0; r < p.rounds.length; r += 1) {
      const round = p.rounds[r];
      if (!api.alive()) return {};
      const target = round.pair[round.say];
      view.dots.innerHTML = dots(p.rounds.length, r);
      if (r > 0) showRound(round);
      view.controls.innerHTML = '<div class="listen-row"><button class="btn secondary listen-again">🔁 Ещё раз</button><button class="btn secondary listen-slow">🐢 Медленно</button></div>';
      const clip = speech.heroWord(target);
      const again = slow => heroSay([clip], slow ? '🐢 Слушай внимательно…' : '🔁 Слушай…', slow ? { rate: 0.7 } : undefined);
      view.controls.querySelector('.listen-again').onclick = () => again(false);
      view.controls.querySelector('.listen-slow').onclick = () => again(true);
      view.tap.onclick = () => again(false);
      api.setReplay(() => again(false));
      const ask = speech.heroLine('pairsAsk');
      await heroSay([ask, clip], `${ask.text} 🔊`);
      if (!api.alive()) return {};
      const choice = await ui.tapWait(view.card, '.pair-card', api, { replay: () => api.replay() });
      if (!choice || !api.alive()) return {};
      const cards = Array.from(view.card.querySelectorAll('.pair-card'));
      cards.forEach(c => { c.disabled = true; c.querySelector('.pair-word').hidden = false; });
      view.controls.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const good = cards.find(c => c.dataset.k === round.say);
      if (choice === good) {
        right += 1;
        choice.classList.add('ok');
        sfx.play('ding');
        const yes = speech.heroLine('pairsRight');
        await heroSay(yes, yes.text);
      } else {
        api.wrong(choice);
        good.classList.add('ok');
        const no = speech.heroLine('pairsWrong');
        await heroSay([no, clip], `${no.text} «${target.text}»`);
      }
      await api.wait(600);
    }
    view.dots.innerHTML = dots(p.rounds.length, p.rounds.length);
    const praise = speech.heroLine('praise');
    await heroSay(praise, praise.text);
    await friendship(api, view, heroSay);
    return { stars: right >= p.rounds.length - 1 ? 3 : 2 };
  };

  // ─────────────────────────────────────────────────────────────
  // Повторюшка: ребёнок говорит слово, герой «повторяет» её записью смешным голосом.
  // Потом сама решает: звук красивый или ещё разок. В конце — все её слова подряд.
  // ─────────────────────────────────────────────────────────────
  function playRecording(blob, api, view, rate) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      // Смешной голос: быстрее и выше (тон не сохраняем).
      audio.preservesPitch = false; audio.mozPreservesPitch = false; audio.webkitPreservesPitch = false;
      audio.playbackRate = rate || 1;
      if (view && view.pic) view.pic.classList.add('talking');
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        if (view && view.pic) view.pic.classList.remove('talking');
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = done; audio.onerror = done;
      audio.play().catch(done);
      api.cleanup(() => { try { audio.pause(); } catch (error) {} done(); });
      setTimeout(done, 9000);
    });
  }
  Y.games.heroEcho = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const view = scene(stage);
    const heroSay = heroSayer(api, view);
    let last = null;
    api.setReplay(() => { if (last) heroSay(last.items, last.text); });
    if (p.items[0]) view.card.innerHTML = `${ui.pic(p.items[0], 'pic-xl')}<b class="hero-word">${esc(p.items[0].text)}</b>`;
    view.dots.innerHTML = dots(p.items.length, 0);
    const intro = speech.heroLine('echoIntro');
    await heroSay(intro, intro.text);
    const kept = [];
    for (let i = 0; i < p.items.length; i += 1) {
      const word = p.items[i];
      if (!api.alive()) return {};
      view.dots.innerHTML = dots(p.items.length, i);
      view.card.className = 'hero-card';
      view.card.innerHTML = `${ui.pic(word, 'pic-xl')}<b class="hero-word">${esc(word.text)}</b>`;
      view.controls.innerHTML = '';
      const ask = speech.heroLine('echoAsk');
      last = { items: ask, text: ask.text };
      await heroSay(ask, ask.text);
      if (!api.alive()) return {};
      let res = await api.sayStep({ item: speech.word(word), stat: word.text, sound: p.sound, record: true, silent: true, compact: true, noStyle: true, maxMs: 5000 });
      if (!api.alive()) return {};
      if (!(res.heard && res.blob && res.blob.size > 2000)) {
        // Микрофона нет — герой просто повторяет слово своим голосом.
        if (res.heard) await heroSay([speech.heroWord(word)], `${word.text}!`);
        continue;
      }
      sfx.play('boing');
      await playRecording(res.blob, api, view, 1.32);
      const after = speech.heroLine('echoAfter');
      await heroSay(after, after.text);
      if (!api.alive()) return {};
      // Сама проверяет себя: послушать ещё раз своим голосом и решить.
      view.controls.innerHTML = `<div class="listen-row"><button class="btn secondary echo-me">🎧 Мой голос</button></div>
        <div class="judge-row"><button class="judge yes" data-v="good">👍<small>Красиво</small></button><button class="judge again" data-v="again">🔁<small>Ещё раз</small></button></div>`;
      let blob = res.blob;
      view.controls.querySelector('.echo-me').onclick = () => playRecording(blob, api, null, 1);
      const judge = speech.heroLine('echoJudge');
      last = { items: judge, text: judge.text };
      await heroSay(judge, judge.text);
      const choice = await ui.tapWait(view.controls, '.judge', api, { replay: () => api.replay() });
      if (!choice || !api.alive()) return {};
      view.controls.innerHTML = '';
      if (choice.dataset.v === 'again') {
        const more = speech.heroLine('echoAgain');
        await heroSay(more, more.text);
        res = await api.sayStep({ item: speech.word(word), stat: word.text, sound: p.sound, record: true, silent: true, compact: true, noStyle: true, maxMs: 5000 });
        if (!api.alive()) return {};
        if (res.heard && res.blob && res.blob.size > 2000) { blob = res.blob; await playRecording(blob, api, view, 1.32); }
      }
      const good = speech.heroLine('echoGood');
      sfx.play('sparkle');
      await heroSay(good, good.text);
      kept.push({ word, blob });
      if (Y.saveChildRecording) Y.saveChildRecording(blob, word.text);
      await api.wait(250);
    }
    view.dots.innerHTML = dots(p.items.length, p.items.length);
    if (kept.length >= 2 && api.alive()) {
      const fin = speech.heroLine('echoFinale');
      await heroSay(fin, fin.text);
      view.controls.innerHTML = '';
      for (const k of kept) {
        if (!api.alive()) return {};
        view.card.innerHTML = `${ui.pic(k.word, 'pic-xl')}<b class="hero-word">${esc(k.word.text)}</b>`;
        await playRecording(k.blob, api, null, 1);
        await api.wait(250);
      }
    }
    const praise = speech.heroLine('praise');
    await heroSay(praise, praise.text);
    await friendship(api, view, heroSay);
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Рюкзак героя: герой собирается в поход (на море, в космос) и берёт только вещи с нужным звуком.
  // Ребёнок нажимает на картинку: со звуком — называет, и вещь летит в рюкзак; без звука — «не берём».
  // ─────────────────────────────────────────────────────────────
  function flyToBag(from, bag) {
    const a = from.getBoundingClientRect();
    const b = bag.getBoundingClientRect();
    const pic = from.querySelector('.pic');
    if (!pic || !a.width) return;
    const clone = pic.cloneNode(true);
    clone.classList.add('pack-fly');
    clone.style.left = `${a.left + a.width / 2}px`;
    clone.style.top = `${a.top + a.height / 2}px`;
    document.body.appendChild(clone);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 3 - (a.top + a.height / 2);
    const anim = clone.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 90}px)) scale(1.1)`, offset: 0.5 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3)`, opacity: 0.4 }], { duration: 750, easing: 'ease-in' });
    anim.onfinish = () => clone.remove();
    setTimeout(() => clone.remove(), 1200);
  }
  const PACK_THEMES = { hike: { line: 'packHike', icon: '⛺' }, sea: { line: 'packSea', icon: '🏖️' }, space: { line: 'packSpace', icon: '🚀' } };
  Y.games.heroBackpack = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const view = scene(stage);
    stage.querySelector('.g-hero').classList.add('g-pack');
    const heroSay = heroSayer(api, view);
    const theme = PACK_THEMES[p.theme] || PACK_THEMES.hike;
    const total = p.items.filter(x => x.answer).length;
    view.card.className = 'hero-card pack-field';
    view.card.innerHTML = `<div class="pack-items">${p.items.map((it, i) => `<button class="pack-item" data-i="${i}" style="--d:${i * 0.07}s">${ui.pic(it.word, 'pic-lg')}<small hidden>${esc(it.word.text)}</small></button>`).join('')}</div>
      <div class="pack-bag"><span class="pack-theme">${theme.icon}</span><span class="bag">🎒</span><b class="bag-count">0 / ${total}</b></div>`;
    const bag = view.card.querySelector('.pack-bag');
    const label = (data.SOUNDS[p.sound] && data.SOUNDS[p.sound].label) || p.sound.toUpperCase();
    const themeLine = speech.heroLine(theme.line);
    const need = speech.heroLine('packNeed');
    const intro = [themeLine, need, speech.snd(p.sound)];
    const introText = `${theme.icon} ${themeLine.text} ${need.text} ${label}.`;
    api.setReplay(() => heroSay(intro, introText));
    view.tap.onclick = () => heroSay(intro, introText);
    await heroSay(intro, introText);
    view.controls.innerHTML = `<p class="muted hide-tip">Нажми на вещь со звуком ${ui.badge(p.sound)} и назови её</p>`;
    let packed = 0;
    while (packed < total && api.alive()) {
      const btn = await ui.tapWait(view.card, '.pack-item:not(.done):not(.gone)', api, { replay: () => api.replay() });
      if (!btn || !api.alive()) return {};
      const it = p.items[Number(btn.dataset.i)];
      btn.querySelector('small').hidden = false;
      if (it.answer) {
        btn.classList.add('asking');
        await api.sayStep({ item: speech.word(it.word), stat: it.word.text, sound: p.sound, silent: true, compact: true, noStyle: true });
        if (!api.alive()) return {};
        btn.classList.remove('asking');
        flyToBag(btn, bag);
        btn.classList.add('done');
        packed += 1;
        bag.querySelector('.bag-count').textContent = `${packed} / ${total}`;
        bag.classList.remove('gulp'); void bag.offsetWidth; bag.classList.add('gulp');
        sfx.play('pop');
        const yes = speech.heroLine('packYes');
        await heroSay(yes, yes.text);
      } else {
        api.wrong(btn);
        btn.classList.add('gone');
        const no = speech.heroLine('packNo');
        await heroSay(no, `${no.text}`);
      }
    }
    if (!api.alive()) return {};
    view.controls.innerHTML = '';
    bag.classList.add('ready');
    sfx.play('fanfare');
    ui.confetti(24);
    const done = speech.heroLine('packDone');
    await heroSay(done, `${theme.icon} ${done.text}`);
    await friendship(api, view, heroSay);
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Экран героя
  // ─────────────────────────────────────────────────────────────
  function heroSound(state) {
    const { primary } = core.chooseSounds(state);
    if (core.levelOf(state, primary) >= 2) return primary;
    return data.SOUND_ORDER.find(sound => core.levelOf(state, sound) >= 2) || '';
  }

  // Игры в комнате героя: что написано на кнопке и коротко — что делать.
  const HERO_GAMES = [
    ['heroTeach', '🧑‍🏫', 'Научи меня словам', 'назови картинку'],
    ['heroOops', '🙊', 'Найди мою ошибку', 'я говорю — правильно?'],
    ['heroHide', '🫣', 'Прятки', 'найди, где я спрятался'],
    ['heroPairs', '👂', 'Что я сказал?', 'миска или мишка?'],
    ['heroEcho', '🔁', 'Повторюшка', 'я повторю твоим голосом'],
    ['heroBackpack', '🎒', 'Собери рюкзак', 'вещи с нужным звуком']
  ];

  let greeting = null;
  Y.screens.hero = {
    render: () => {
      const s = S();
      const name = (s.hero && s.hero.name) || '';
      const sound = heroSound(s);
      greeting = A().speech.heroLine('hello');
      return `<div class="shell">${A().topbar(name || 'Мой герой', 'home')}
        <section class="card hero-room">
          <div class="hero-big-wrap"><button class="hero-big" data-action="hero-hello">${A().heroMarkup(210, 'bob', { friend: true })}</button>
            ${A().heartsMarkup(false)}<small class="muted">${esc(core.heroFriend(s).level.name)}</small></div>
          <div class="hero-room-main">
            <button class="say-bubble" data-action="hero-hello">${esc(greeting.text)} <span>🔊</span></button>
            ${sound ? `<div class="hero-games">${HERO_GAMES.map(([game, icon, label, note]) => `<button class="hero-game" data-action="hero-play" data-game="${game}"><span>${icon}</span><b>${label}</b><small>${note}</small></button>`).join('')}</div>
            <p class="muted">Тренируем звук ${ui.badge(sound)}</p>` : '<p class="muted">Игры с героем — для звука на уровне «слова». Мама может поставить уровень в «Для мамы» → «Звуки и уровни».</p>'}
          </div>
        </section>
        ${A().heroUrl() ? '' : '<div class="notice">Мама может добавить картинку любимого героя: «Для мамы» → «Любимый герой». Картинка хранится только на этом компьютере.</div>'}
      </div>`;
    },
    mount: () => {
      const activation = navigator.userActivation;
      if (activation && !activation.hasBeenActive) return;
      setTimeout(() => { if (greeting && document.querySelector('.hero-room')) sayHello(); }, 400);
    }
  };

  function sayHello() {
    const pic = document.querySelector('.hero-big .hero-pic');
    if (pic) pic.classList.add('talking');
    A().speech.play(greeting, { interrupt: true }).then(() => { if (pic) pic.classList.remove('talking'); });
  }
  Y.actions['hero-hello'] = () => sayHello();

  Y.actions['hero-play'] = btn => {
    const s = S();
    const sound = heroSound(s);
    if (!sound) return;
    const game = btn.dataset.game;
    const payload = core.gamePayload(s, game, sound, Math.random, s.progress.recent.content);
    if ((payload.items && payload.items.length < 3) || (payload.rounds && payload.rounds.length < 3)) { ui.toast('Для этого звука мало слов'); return; }
    A().startMini([{ kind: 'game', game, sound, payload }], 'hero');
  };

  // ─────────────────────────────────────────────────────────────
  // Для мамы: имя и картинка героя
  // ─────────────────────────────────────────────────────────────
  Y.heroSettingsMarkup = () => {
    const s = S();
    const hero = s.hero || {};
    return `<section class="section"><h3>Любимый герой</h3>
      <div class="row gap wrap hero-settings">${A().heroMarkup(96)}
        <div class="grow">
          <label class="field">Как его зовут<input id="hero-name" value="${esc(hero.name || '')}" placeholder="Например: Вузель" data-change="hero-name"></label>
          <div class="row gap wrap">
            <button class="btn secondary small" data-action="hero-upload">🖼 ${A().heroUrl() ? 'Другая картинка' : 'Картинка героя'}</button>
            ${A().heroUrl() ? '<button class="btn secondary small" data-action="hero-remove">Убрать картинку</button>' : ''}
          </div>
        </div>
      </div>
      <label class="check"><input type="checkbox" data-change="hero-sessions" ${hero.inSessions !== false ? 'checked' : ''}> Игры с героем попадают в занятие (когда есть картинка)</label>
      <p class="muted small">Можно сфотографировать игрушку или сохранить картинку героя с экрана. Картинка хранится только в этом браузере и попадает в резервную копию. Герой говорит своим голосом, учит слова вместе с Александрой и иногда хвалит её.</p>
    </section>`;
  };

  Y.actions['hero-name'] = input => {
    S().hero.name = input.value.trim().slice(0, 30);
    A().save();
  };
  Y.actions['hero-sessions'] = input => {
    S().hero.inSessions = input.checked;
    A().save();
  };
  Y.actions['hero-upload'] = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      await Y.storage.putBlob('assets', 'hero', file, { filename: file.name });
      await A().refreshHero();
      S().hero.hasImage = true;
      A().save();
      ui.toast('Картинка героя сохранена');
      A().render();
    };
    input.click();
  };
  Y.actions['hero-remove'] = async () => {
    const ok = await ui.confirmBox('Убрать картинку героя?', 'Убрать', 'Оставить');
    if (!ok) return;
    await Y.storage.deleteBlob('assets', 'hero').catch(() => {});
    await A().refreshHero();
    S().hero.hasImage = false;
    A().save();
    A().render();
  };
})(window);

// Сказка-игра «Путешествие Язычка»: глава — это рассказ и задания между частями.
// Александра помогает героям: называет картинку, тянет звук, находит картинку со звуком.
// Карта путешествия и рюкзак с находками — на экране «Сказка».
(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  const { core, ui, sfx } = Y;
  const { esc } = ui;
  Y.steps = Y.steps || {};
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};
  const A = () => Y.app;
  const S = () => Y.app.state;
  const SIBILANT_LETTERS = /[сзцшжчщ]/i;

  const chapterIndex = id => data.STORY.findIndex(ch => ch.id === id);
  const sceneEmoji = ch => ch.scene.match(/\p{Extended_Pictographic}️?/gu) || [];
  const fillName = (text, name) => esc(text).replace(/\{name\}/g, `<b class="hero-name">${esc(name)}</b>`);

  function dots(count, done) {
    return Array.from({ length: count }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  }

  // Отметить главу пройденной: открывается находка в рюкзак и «что дальше».
  function markHeard(index) {
    const story = S().progress.story;
    if (index >= story.unlocked) return false;
    if (index + 1 > story.heard) { story.heard = index + 1; A().save(); return true; }
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // Задания
  // ─────────────────────────────────────────────────────────────
  async function taskSay(api, box, part) {
    const word = data.WORDS.find(w => w.text === part.word);
    if (!word) return;
    box.innerHTML = `<div class="sp-card">${ui.pic(word, 'pic-xl')}<b class="sp-word" hidden>${esc(word.text)}</b></div>`;
    const sound = (word.targets[0] && word.targets[0].sound) || 'с';
    // Без подсказки: ребёнок называет картинку сам. Если молчит — прозвучит образец.
    const res = await api.sayStep({ item: api.speech.word(word), stat: word.text, sound, silent: true, compact: true });
    const label = box.querySelector('.sp-word');
    if (label) label.hidden = false;
    if (res.verified) { sfx.play('sparkle'); ui.confetti(14); }
  }

  // Тянуть звук: с, з — сколько секунд «свиста» набралось; ц — сколько коротких «ц».
  function taskSound(api, box, part) {
    const { speech, mic } = api;
    const bursts = part.sound === 'ц';
    const goal = bursts ? 6 : 2400;
    box.innerHTML = `<div class="sp-sound">
      <div class="sp-icon">${part.icon || '✨'}</div>
      <div class="sp-meter"><i></i></div>
      <div class="sp-sound-label">${ui.badge(part.sound, 'big')} <span>${bursts ? 'коротко: ц! ц! ц!' : 'долго-долго'}</span></div>
      <button class="btn secondary small sp-model">🔊 Как надо</button>
      ${mic.isOn() ? '' : '<button class="btn good sp-done">Готово ✓</button>'}
    </div>`;
    const meter = box.querySelector('.sp-meter i');
    const icon = box.querySelector('.sp-icon');
    box.querySelector('.sp-model').onclick = () => speech.play(speech.snd(part.sound), { interrupt: true });
    api.setReplay(() => speech.play(speech.snd(part.sound), { interrupt: true }));
    return new Promise(resolve => {
      let amount = 0; let finished = false;
      const started = Date.now();
      const detector = mic.detector(part.sound, { mode: bursts ? 'burst' : 'hold' });
      const finish = () => {
        if (finished) return;
        finished = true;
        unsub();
        meter.style.width = '100%';
        icon.classList.add('sp-icon-done');
        resolve();
      };
      // Строгий детектор: хлопки, стук и «а» не засчитываются.
      const unsub = mic.subscribe(frame => {
        if (finished) return;
        const r = detector.feed(frame);
        if (r.skip) return;
        if (bursts && r.event) { amount += 1; sfx.play('pop'); icon.classList.remove('sp-pulse'); void icon.offsetWidth; icon.classList.add('sp-pulse'); }
        if (!bursts && r.credit) amount += 30 * r.credit;
        const share = Math.min(1, amount / goal);
        meter.style.width = `${Math.round(share * 100)}%`;
        icon.style.setProperty('--grow', String(1 + share * 0.6));
        if (amount >= goal) finish();
        if (Date.now() - started > 30000) finish();
      });
      api.cleanup(() => { unsub(); resolve(); });
      const done = box.querySelector('.sp-done');
      if (done) done.onclick = finish;
      api.wait(200).then(() => { if (!finished && api.alive()) speech.play(speech.snd(part.sound), { interrupt: false }); });
    });
  }

  // Найти из трёх картинку, в которой есть звук.
  async function taskPick(api, box, part) {
    const { speech } = api;
    const random = Math.random;
    // Звук должен быть и на письме (без «глаз» = [глас]): ребёнок читает подписи.
    const withSound = core.uniqueEmoji(data.WORDS.filter(w => w.emoji && w.text.includes(part.sound) && w.targets.some(t => t.sound === part.sound)));
    const without = core.uniqueEmoji(data.WORDS.filter(w => w.emoji && !SIBILANT_LETTERS.test(w.text)));
    const target = core.shuffled(withSound, random)[0];
    const others = core.shuffled(without.filter(w => w.emoji !== target.emoji), random).slice(0, 2);
    const options = core.shuffled([target, ...others], random);
    box.innerHTML = `<div class="sp-pick">${options.map((w, i) => `<button class="sp-option" data-i="${i}">${ui.pic(w, 'pic-lg')}<b>${esc(w.text)}</b></button>`).join('')}</div>`;
    api.setReplay(() => speech.play([speech.storyPrompt(part.chapter, part.index), speech.snd(part.sound)], { interrupt: true }));
    for (;;) {
      const btn = await ui.tapWait(box, '.sp-option', api, { replay: () => api.replay() });
      if (!btn || !api.alive()) return;
      const word = options[Number(btn.dataset.i)];
      if (word === target) {
        btn.classList.add('ok');
        sfx.play('ding');
        await api.say(speech.word(word), { interrupt: true });
        return;
      }
      api.wrong(btn);
      await api.say([speech.word(word), speech.line('tryAgain')], { interrupt: true });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Шаг «глава сказки» (запускается как мини-занятие: работают клавиши мамы, «назад», 🔊)
  // ─────────────────────────────────────────────────────────────
  Y.steps.story = async (stage, step, api) => {
    const { speech } = api;
    const index = chapterIndex(step.id);
    const ch = data.STORY[index];
    if (!ch) return {};
    const name = A().childName();
    stage.innerHTML = `<div class="story-play">
      <div class="sp-head"><small>Глава ${index + 1}</small><h2>${esc(ch.title)}</h2></div>
      <div class="sp-scene">${sceneEmoji(ch).map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
      <div class="sp-text"></div>
      <div class="sp-task"></div>
      <div class="g-dots"></div>
    </div>`;
    const textEl = stage.querySelector('.sp-text');
    const taskEl = stage.querySelector('.sp-task');
    const dotsEl = stage.querySelector('.g-dots');
    await api.say(speech.storyTitle(ch), { interrupt: true });
    for (let i = 0; i < ch.parts.length; i += 1) {
      if (!api.alive()) return {};
      const part = ch.parts[i];
      dotsEl.innerHTML = dots(ch.parts.length, i);
      if (typeof part === 'string') {
        taskEl.innerHTML = '';
        textEl.className = 'sp-text';
        textEl.innerHTML = fillName(part, name);
        const clip = speech.storyPart(ch, i);
        api.setReplay(() => speech.play(clip, { interrupt: true }));
        await api.say(clip, { interrupt: true });
        await api.wait(250);
        continue;
      }
      textEl.className = 'sp-text sp-quest';
      textEl.innerHTML = `<span class="sp-badge">Задание</span> ${fillName(part.text, name)}`;
      const prompt = speech.storyPrompt(ch, i);
      api.setReplay(() => speech.play(prompt, { interrupt: true }));
      await api.say(part.task === 'pick' ? [prompt] : prompt, { interrupt: true });
      if (!api.alive()) return {};
      if (part.task === 'say') await taskSay(api, taskEl, part);
      else if (part.task === 'sound') await taskSound(api, taskEl, part);
      else if (part.task === 'pick') await taskPick(api, taskEl, Object.assign({ chapter: ch, index: i }, part));
      if (!api.alive()) return {};
      if (part.done) {
        textEl.className = 'sp-text sp-done';
        textEl.innerHTML = `✨ ${fillName(part.done, name)}`;
        sfx.play('sparkle');
        await api.say(speech.storyDone(ch, i), { interrupt: true });
      }
      await api.wait(300);
    }
    dotsEl.innerHTML = dots(ch.parts.length, ch.parts.length);
    const fresh = markHeard(index);
    taskEl.innerHTML = `<div class="sp-end">
      <div class="sp-item"><span>${ch.item[0]}</span><b>${fresh ? 'В рюкзак' : 'В рюкзаке'}: ${esc(ch.item[1])}</b></div>
      <div class="chapter-next"><b>Что дальше?</b> ${esc(ch.next)}</div>
    </div>`;
    textEl.innerHTML = '';
    sfx.play('fanfare');
    ui.confetti(30);
    await api.say(speech.storyNext(ch), { interrupt: true });
    await api.wait(800);
    return { stars: fresh ? 2 : 1 };
  };

  function playChapter(id) {
    const index = chapterIndex(id);
    if (index < 0 || index >= S().progress.story.unlocked) {
      A().speech.play(A().speech.line('storyLocked'), { interrupt: true });
      return;
    }
    A().startMini([{ kind: 'story', id }], 'book');
  }
  Y.actions['story-play'] = btn => playChapter(btn.dataset.id);

  // ─────────────────────────────────────────────────────────────
  // Карта путешествия и рюкзак
  // ─────────────────────────────────────────────────────────────
  Y.screens.book = {
    render: () => {
      const story = S().progress.story;
      const done = Boolean(S().progress.days[A().today()]);
      const perRow = 5;
      const nodes = data.STORY.map((ch, i) => {
        const row = Math.floor(i / perRow);
        const col = row % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
        const style = `grid-row:${row + 1};grid-column:${col + 1}`;
        const first = sceneEmoji(ch)[0] || '📖';
        if (i < story.unlocked) {
          const fresh = i >= story.heard;
          return `<button class="map-node ${fresh ? 'fresh' : 'done'}" style="${style}" data-action="go" data-screen="chapter" data-id="${ch.id}">
            <span class="map-dot">${first}${fresh ? '' : '<i>✓</i>'}</span><small>${i + 1}. ${esc(ch.title)}</small>${fresh ? '<em>новая!</em>' : ''}</button>`;
        }
        if (i === story.unlocked) {
          return `<button class="map-node next" style="${style}" data-action="story-locked"><span class="map-dot">🔒</span><small>${i + 1}. ???</small><em>${done ? 'завтра' : 'после занятия'}</em></button>`;
        }
        return `<div class="map-node locked" style="${style}"><span class="map-dot">·</span><small>${i + 1}</small></div>`;
      }).join('');
      const backpack = data.STORY.map((ch, i) => (i < story.heard ? `<span class="bp-item" title="${esc(ch.item[1])}">${ch.item[0]}</span>` : '<span class="bp-item empty">?</span>')).join('');
      return `<div class="shell">${A().topbar('Сказка', 'home')}
        <section class="card book-head"><span class="book-icon">🗺️</span><div><h1>Путешествие Язычка</h1>
          <p class="muted">Открыто глав: <b>${story.unlocked} из ${data.STORY.length}</b>. В каждой главе ты помогаешь героям — говоришь слова и находишь звуки. Новая глава — за первое занятие дня.</p></div></section>
        <section class="card"><h3>🎒 Рюкзак путешественника <small class="muted">${story.heard} из ${data.STORY.length}</small></h3><div class="backpack">${backpack}</div></section>
        <section class="card map">${nodes}</section></div>`;
    }
  };

  Y.actions['story-locked'] = btn => {
    btn.classList.remove('wobble'); void btn.offsetWidth; btn.classList.add('wobble');
    A().speech.play(A().speech.line('storyLocked'), { interrupt: true });
  };

  Y.screens.chapter = {
    render: params => {
      const story = S().progress.story;
      const index = Math.max(0, chapterIndex(params.id));
      const ch = data.STORY[index];
      if (!ch || index >= story.unlocked) return `<div class="shell">${A().topbar('Сказка', 'book')}<section class="card center"><div class="giant">🔒</div><p>Эта глава ещё закрыта.</p></section></div>`;
      const name = A().childName();
      const heard = index < story.heard;
      const prev = data.STORY[index - 1];
      const next = data.STORY[index + 1];
      return `<div class="shell narrow-wide">${A().topbar(`Глава ${index + 1}`, 'book')}
        <section class="card chapter">
          <div class="chapter-scene">${sceneEmoji(ch).map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
          <h1>${esc(ch.title)}</h1>
          <div class="row gap wrap center-row">
            <button class="btn big" data-action="story-play" data-id="${ch.id}">▶ Играть главу</button>
            <button class="btn secondary" data-action="chapter-listen" data-id="${ch.id}">🔊 Просто послушать</button>
          </div>
          <p class="chapter-text">${fillName(ch.text, name)}</p>
          ${heard ? `<div class="sp-item small"><span>${ch.item[0]}</span><b>В рюкзаке: ${esc(ch.item[1])}</b></div><div class="chapter-next"><b>Что дальше?</b> ${esc(ch.next)}</div>` : '<p class="muted">Сыграй главу — и в рюкзак попадёт находка!</p>'}
          <div class="row gap wrap center-row">
            ${prev ? `<button class="btn secondary" data-action="go" data-screen="chapter" data-id="${prev.id}">← Глава ${index}</button>` : ''}
            ${next && index + 1 < story.unlocked ? `<button class="btn secondary" data-action="go" data-screen="chapter" data-id="${next.id}">Глава ${index + 2} →</button>` : ''}
            <button class="btn secondary" data-action="go" data-screen="book">🗺️ К карте</button>
          </div>
        </section></div>`;
    }
  };

  Y.actions['chapter-listen'] = btn => {
    const ch = data.STORY[chapterIndex(btn.dataset.id)];
    if (!ch) return;
    const sp = A().speech;
    sp.play([...sp.story(ch), sp.storyNext(ch)], { interrupt: true, gap: 350 });
  };
})(window);

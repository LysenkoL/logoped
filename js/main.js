(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  const { core, storage, mic, art, sfx, ui } = Y;
  const { esc, el } = ui;
  const speech = Y.createSpeech({ storage });
  const appEl = document.getElementById('app');
  const giftInput = document.getElementById('gift-file');
  const backupInput = document.getElementById('backup-file');
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};

  let state = core.normalizeState(storage.loadState());
  let current = { name: state.profile.name ? 'home' : 'setup', params: {} };
  let giftUrl = '';
  let heroUrl = '';
  let session = null; // активное занятие

  const WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const STEP_ICONS = { gym: '👅', position: '😁', mic: '🎤', lock: '🔒', fun: '🎭', breath: '👃', story: '📖', postcard: '💌' };

  const A = Y.app = {
    get state() { return state; },
    set state(value) { state = core.normalizeState(value); },
    speech,
    save,
    go,
    render,
    childName: () => state.profile.name || 'Малыш',
    today: () => core.dateKey(new Date()),
    giftUrl: () => giftUrl,
    refreshGift,
    heroUrl: () => heroUrl,
    refreshHero,
    heroMarkup,
    heartsMarkup,
    heroName: () => (state.hero && state.hero.name) || 'Герой',
    topbar,
    starPill,
    petMarkup,
    wishMarkup,
    pathMarkup,
    growthMarkup,
    pawsMarkup,
    session: () => session,
    applySettings,
    exportBackup,
    giftInput,
    backupInput
  };

  function save() {
    if (!storage.saveState(state)) ui.toast('Не удалось сохранить. Сделайте резервную копию в разделе «Для мамы».');
  }

  function go(name, params) {
    if (session && name !== 'session') endSession(false);
    speech.stop();
    const prev = Y.screens[current.name];
    if (prev && prev.unmount) { try { prev.unmount(); } catch (error) {} }
    current = { name, params: params || {} };
    render();
  }

  function render() {
    const screen = Y.screens[current.name] || Y.screens.home;
    appEl.innerHTML = screen.render(current.params || {});
    appEl.dataset.screen = current.name;
    root.scrollTo(0, 0);
    if (screen.mount) { try { screen.mount(appEl, current.params || {}); } catch (error) { console.error(error); } }
  }

  function applySettings() {
    speech.setName(state.profile.name);
    speech.setVoice(state.settings.ttsVoice);
    speech.setSource(state.settings.voiceSource);
    speech.setStressFixes(state.settings.stressFlags);
    mic.setSensitivity(state.settings.micSensitivity);
    if (mic.setProfile) mic.setProfile(state.settings.micProfile);
    mic.setEnabled(state.settings.micEnabled !== false);
    sfx.setEnabled(state.settings.sfx !== false);
  }

  function starPill() {
    return `<span class="pill star-pill" data-star-pill>⭐ <b>${state.progress.stars}</b></span>`;
  }

  function topbar(title, back) {
    return `<div class="topbar">
      ${back ? `<button class="icon-btn" data-action="go" data-screen="${back}" aria-label="Назад">←</button>` : ''}
      <h2>${esc(title)}</h2>${starPill()}
    </div>`;
  }

  // Питомец с одеждой. size — «взрослый» размер в пикселях.
  // opts.grow — размер и вид по стадии роста (малыш в скорлупке вдвое меньше, у силача плащ, у чемпиона корона);
  // opts.stage — показать конкретную стадию (для ростомера).
  function petMarkup(petId, size, extraClass, opts) {
    const pet = core.PETS.find(item => item.id === petId);
    const pets = state.progress.pets;
    const o = opts || {};
    const stageIndex = Number.isInteger(o.stage) ? o.stage : (o.grow ? core.petStage(state, petId).index : -1);
    const stage = core.PET_STAGES[stageIndex];
    const px = Math.round((size || 160) * (stage ? stage.scale : 1));
    if (!pet) return `<div class="pet-box egg ${extraClass || ''}" style="--size:${px}px"><span class="pet-emoji">🥚</span></div>`;
    // o.preview — примерка в магазине: { slot: id } поверх того, что надето.
    const preview = o.preview || {};
    const wearing = slot => {
      if (preview[slot] !== undefined) return core.ITEMS.find(entry => entry.id === preview[slot]) || null;
      const id = pets.wearing[slot];
      return pets.active === petId && !o.bare ? core.ITEMS.find(entry => entry.id === id) : null;
    };
    const paintId = preview.paint !== undefined ? preview.paint : ((pets.colors || {})[petId] || '');
    // Наряд садится по меркам питомца (art.wearMarkup); неизвестная вещь — по-старому, эмодзи.
    const fitKey = pet.kind === 'svg' ? pet.design : pet.art;
    const wear = slot => {
      const item = wearing(slot);
      if (!item) return '';
      return art.wearMarkup(fitKey, item) || `<span class="wear wear-${slot} item-${item.id}">${slot === 'toy' && item.id === 'toy-balloon' ? '<i class="string"></i>' : ''}${item.emoji}</span>`;
    };
    const body = pet.kind === 'svg' ? art.pet(pet.design, px) : art.emojiImg(pet.art, 'pet-emoji pet-img', `<span class="pet-emoji">${pet.emoji}</span>`);
    let decor = '';
    if (stageIndex === 0) decor += '<span class="st-shell"></span>';
    if (stageIndex === 2 || stageIndex === 3) decor += '<span class="st-spark">✨</span>';
    if (stageIndex === 3) decor += '<span class="st-badge">💪</span>';
    if (stageIndex >= 4) decor += `${wearing('hat') ? '' : (art.wearMarkup(fitKey, { id: 'hat-crown', emoji: '👑' }, 'st-crown-fit') || '<span class="st-crown">👑</span>')}<span class="st-badge">🏆</span>`;
    const cls = stageIndex >= 0 ? `stage-${stageIndex}` : '';
    const paint = paintId ? `paint ${paintId}` : '';
    return `<div class="pet-box ${cls} ${paint} ${extraClass || ''}" style="--size:${px}px">${body}${decor}${wear('hat')}${wear('glasses')}${wear('neck')}${wear('toy')}</div>`;
  }

  // «Коплю на…»: мечта из магазина и сколько звёзд осталось.
  function wishMarkup() {
    const id = state.progress.pets.wish;
    const found = id ? core.findShopEntry(id) : null;
    if (!found) return '';
    const e = found.entry;
    const visual = found.kind === 'pet' ? petMarkup(e.id, 56, '', { bare: true }) : found.kind === 'bg' ? `<span class="wish-bg bg-${e.id}">${e.deco}</span>` : e.slot === 'paint' ? `<span class="paint-swatch small" style="background:${e.color}"></span>` : `<span class="wish-emoji">${art.itemIcon(e)}</span>`;
    const have = state.progress.stars;
    const ready = have >= e.price;
    const share = Math.min(1, have / Math.max(1, e.price));
    return `<button class="card wish-card ${ready ? 'ready' : ''}" data-action="go" data-screen="shop">
      ${visual}<div class="wish-info"><b>${ready ? 'Хватает звёзд! Можно купить:' : 'Коплю на:'} ${esc(e.name)}</b>
      <span class="wish-bar"><i style="width:${Math.round(share * 100)}%"></i></span>
      <small>⭐ ${Math.min(have, e.price)} из ${e.price}${ready ? ' — в магазин! 🛍️' : ` · осталось ${e.price - have}`}</small></div></button>`;
  }

  // Следы-лапки до следующего роста: цветные — уже пройдено, серые — осталось. Понятно без чтения.
  function pawsMarkup(petId, small) {
    const g = core.petStage(state, petId);
    if (!g.next) return `<div class="paws ${small ? 'small' : ''}"><span class="paw on">🏆</span></div>`;
    const total = g.next.at - g.stage.at;
    const done = Math.max(0, Math.min(total, g.days - g.stage.at));
    return `<div class="paws ${small ? 'small' : ''}" title="ещё ${g.toNext} ${plural(g.toNext, 'занятие', 'занятия', 'занятий')} до роста">${Array.from({ length: total }, (_, i) => `<span class="paw ${i < done ? 'on' : ''}">🐾</span>`).join('')}<span class="paw-goal">⬆️</span></div>`;
  }

  // Рост питомца. Коротко (главный экран) — лапки; полностью (домик) — ростомер: каким был и каким станет.
  function growthMarkup(petId, full) {
    const id = petId || state.progress.pets.active;
    if (!id) return '';
    const g = core.petStage(state, id);
    const pet = core.PETS.find(item => item.id === id);
    if (!full) return `<div class="grow-mini">${pawsMarkup(id, true)}</div>`;
    const left = g.next ? `Ещё ${g.toNext} ${plural(g.toNext, 'занятие', 'занятия', 'занятий')} (в разные дни) — и ${pet ? pet.name : 'питомец'} подрастёт: станет «${g.next.name}».` : 'Вырос самым большим — настоящий чемпион!';
    return `<div class="grow-full">
      <div class="grow-chart">${core.PET_STAGES.map((st, i) => `<div class="gc-col ${i < g.index ? 'past' : ''} ${i === g.index ? 'now' : ''} ${i > g.index ? 'future' : ''}">
        <span class="gc-here">${i === g.index ? '👇' : ''}</span>
        ${petMarkup(id, 104, i > g.index ? 'silhouette' : '', { stage: i, bare: true })}
        <small>${esc(st.name)}</small></div>`).join('')}</div>
      ${pawsMarkup(id, false)}
      <p class="muted">${esc(left)} Каждое занятие — новый след 🐾.</p></div>`;
  }

  function pathMarkup(compact) {
    const puzzle = state.progress.puzzle;
    const pet = state.progress.pets.active;
    const petEmoji = (() => {
      const found = core.PETS.find(item => item.id === pet);
      return found && found.kind === 'emoji' ? found.emoji : '🙂';
    })();
    const cells = [];
    for (let i = 1; i <= puzzle.size; i += 1) {
      const done = i <= puzzle.pieces;
      const here = i === puzzle.pieces;
      const chest = i % 4 === 0 && i < puzzle.size;
      const final = i === puzzle.size;
      let icon = '';
      if (final) icon = giftUrl ? `<img src="${giftUrl}" alt="">` : '🎁';
      else if (chest) icon = puzzle.chestsOpened.includes(i) ? '✅' : '🧰';
      cells.push(`<div class="path-cell ${done ? 'done' : ''} ${here ? 'here' : ''} ${chest ? 'chest' : ''} ${final ? 'final' : ''}">
        <span class="path-num">${i}</span>${icon ? `<span class="path-icon">${icon}</span>` : ''}${here ? `<span class="path-token">${pet === 'yazychok' || !pet ? '😊' : petEmoji}</span>` : ''}
      </div>`);
    }
    const left = Math.max(0, puzzle.size - puzzle.pieces);
    return `<div class="path ${compact ? 'compact' : ''}" style="--n:${puzzle.size}">${cells.join('')}</div>
      <p class="path-note">${puzzle.complete ? 'Подарок собран! 🎉' : `До подарка: <b>${left}</b> ${plural(left, 'шаг', 'шага', 'шагов')}. Каждое занятие — один шаг.`}</p>`;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10; const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  A.plural = plural;

  function weekMarkup() {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + index);
      const key = core.dateKey(date);
      const done = state.progress.days[key];
      return `<div class="day ${done ? 'done' : ''} ${index === 6 ? 'today' : ''}">${WEEK[date.getDay()]}<span>${done ? '★' : '·'}</span></div>`;
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  // ЭКРАНЫ: первое знакомство и главный
  // ─────────────────────────────────────────────────────────────
  Y.screens.setup = {
    render: () => `<div class="shell narrow"><section class="card center">
      ${art.mascot(150)}
      <h1>Привет!</h1>
      <p>Как зовут ребёнка? Имя хранится только на этом компьютере.</p>
      <label class="field">Полное имя<input id="setup-name" autocomplete="off" placeholder="Например: Александра"></label>
      <button class="btn big" data-action="save-name">Готово</button>
    </section></div>`
  };

  Y.actions['save-name'] = () => {
    const value = document.getElementById('setup-name').value.trim();
    if (!value) { ui.toast('Введите имя'); return; }
    state.profile.name = value;
    applySettings();
    save();
    go('home');
  };

  let homeInvite = null;
  let invitedKey = '';
  Y.screens.home = {
    render: () => {
      const { primary, secondary } = core.chooseSounds(state);
      const done = Boolean(state.progress.days[A.today()]);
      const pets = state.progress.pets;
      const pending = state.progress.pendingChests;
      const story = state.progress.story;
      const nextChapter = data.STORY[story.unlocked] || null;
      const unheard = story.heard < story.unlocked ? data.STORY[story.heard] : null;
      const album = state.progress.album.stickers;
      const stickerCount = data.STICKERS.filter(item => album[item.id]).length;
      homeInvite = speech.line(!pets.owned.length ? 'homeEgg' : done ? 'homeDone' : 'homeInvite');
      const prizes = done
        ? `<div class="today-prizes tomorrow"><b>Завтра:</b>${nextChapter ? `<span class="prize"><i>📖</i>глава ${story.unlocked + 1}</span>` : ''}<span class="prize"><i class="mini-sticker">?</i>наклейка</span><span class="prize"><i>🧩</i>деталь</span></div>`
        : `<div class="today-prizes"><b>За занятие:</b><span class="prize"><i>🧩</i>деталь подарка</span><span class="prize"><i class="mini-sticker">?</i>наклейка-сюрприз</span>${nextChapter ? `<span class="prize"><i>📖</i>глава ${story.unlocked + 1}</span>` : ''}${pets.active ? '<span class="prize"><i>🌱</i>питомец подрастёт</span>' : ''}</div>`;
      return `<div class="shell home">
        <header class="home-top">
          <div><h1 class="hello">Привет, ${esc(A.childName())}!</h1>
          <p class="muted">Сегодня тренируем ${ui.badge(primary)}${secondary !== primary ? ` и ${ui.badge(secondary)}` : ''}</p></div>
          ${starPill()}
        </header>
        <section class="card hero">
          <div class="hero-left">
            <button class="hero-pet" data-action="go" data-screen="pet" aria-label="Мой питомец">${petMarkup(pets.active, 150, 'bob', { grow: true })}</button>
            ${growthMarkup(pets.active, false)}
          </div>
          <div class="hero-main">
            <button class="say-bubble" data-action="${pets.owned.length ? 'home-invite' : 'go'}" data-screen="pet">${esc(homeInvite ? homeInvite.text : '')} <span>🔊</span></button>
            <button class="btn big start" data-action="start">${done ? 'Позаниматься ещё' : 'Начать занятие'} 🚀</button>
            ${(() => { const t = core.dayTheme(state, new Date()); const th = core.DAY_THEMES[t]; return t !== 'normal' ? `<div class="day-theme">${th.icon} Сегодня: <b>${esc(th.title)}</b> <small>${esc(th.note || '')}</small></div>` : ''; })()}
            ${prizes}
          </div>
        </section>
        ${unheard ? `<button class="card story-banner" data-action="story-play" data-id="${unheard.id}"><span>📖</span><b>Новая глава: «${esc(unheard.title)}»</b><em>Играть!</em></button>` : ''}
        ${pending ? `<button class="card chest-banner" data-action="go" data-screen="chest">🧰 Тебя ждёт сундук! Открыть</button>` : ''}
        ${wishMarkup()}
        <section class="card path-card"><div class="row between"><h3>Дорожка к подарку</h3><button class="link" data-action="go" data-screen="puzzle">Пазл 🧩</button></div>${pathMarkup(true)}</section>
        <div class="tiles">
          <button class="tile tile-hero" data-action="go" data-screen="hero"><span>${heroUrl ? `<img src="${heroUrl}" alt="">` : '🧸'}</span>${esc((state.hero && state.hero.name) || 'Мой герой')}${heartsMarkup(true)}</button>
          <button class="tile" data-action="go" data-screen="pet"><span>🐾</span>Питомец</button>
          <button class="tile" data-action="go" data-screen="book"><span>📖</span>Сказка<small>${story.unlocked} из ${data.STORY.length}</small></button>
          <button class="tile" data-action="go" data-screen="album"><span>📒</span>Наклейки<small>${stickerCount} из ${data.STICKERS.length}</small></button>
          <button class="tile" data-action="go" data-screen="shop"><span>🛍️</span>Магазин</button>
          <button class="tile" data-action="go" data-screen="awards"><span>🏅</span>Награды</button>
          <button class="tile" data-action="go" data-screen="fun"><span>🎭</span>Стишки<small>и загадки</small></button>
          ${state.settings.school === false ? '' : `<button class="tile tile-school ${state.settings.schoolAfter && !done ? 'locked' : ''}" data-action="go" data-screen="school"><span>${state.settings.schoolAfter && !done ? '🔒' : '🎒'}</span>Школа<small>${state.settings.schoolAfter && !done ? 'после занятия' : 'счёт, слоги, пазлы'}</small></button>`}
          <button class="tile ${done ? '' : 'locked'}" data-action="go" data-screen="arcade"><span>${done ? '🕹️' : '🔒'}</span>Игротека<small>${done ? 'любые игры' : 'после занятия'}</small></button>
        </div>
        <div class="week">${weekMarkup()}</div>
        <button class="parent-link" data-action="parent-lock">⚙️ Для мамы</button>
      </div>`;
    },
    mount: () => {
      // Питомец зовёт голосом — один раз за открытие (и один раз после занятия).
      const key = `${A.today()}-${Boolean(state.progress.days[A.today()])}`;
      if (state.settings.homeVoice === false || invitedKey === key || !homeInvite || !state.profile.name) return;
      // Без первого нажатия браузер звук не пустит — тогда позовём, когда вернёмся на главный экран.
      const activation = navigator.userActivation;
      if (activation && !activation.hasBeenActive) return;
      invitedKey = key;
      setTimeout(() => {
        if (current.name !== 'home' || session) return;
        const pet = document.querySelector('.hero-pet .pet-box');
        if (pet) { pet.classList.remove('jump'); void pet.offsetWidth; pet.classList.add('jump'); }
        speech.play(homeInvite, { interrupt: false });
      }, 700);
    }
  };

  Y.actions['home-invite'] = () => {
    const pet = document.querySelector('.hero-pet .pet-box');
    if (pet) { pet.classList.remove('jump'); void pet.offsetWidth; pet.classList.add('jump'); }
    if (homeInvite) speech.play(homeInvite, { interrupt: true });
  };

  // ─────────────────────────────────────────────────────────────
  // ЗАНЯТИЕ
  // ─────────────────────────────────────────────────────────────
  function newStats() { return { sounds: {}, words: {}, said: 0, good: 0, slip: 0, mushrooms: 0 }; }

  function soundStat(stats, sound) {
    if (!stats.sounds[sound]) stats.sounds[sound] = { said: 0, good: 0, slip: 0, micSec: 0 };
    return stats.sounds[sound];
  }

  Y.screens.session = {
    render: () => `<div class="session">
      <div class="s-top">
        <button class="icon-btn" data-action="exit-session" aria-label="Выйти">✕</button>
        <button class="icon-btn" data-action="back-step" aria-label="Вернуть прошлое задание" title="Вернуть прошлое задание (клавиша 4)">↩</button>
        <div class="progress" id="progress"></div>
        <button class="icon-btn" data-action="replay" aria-label="Повторить">🔊</button>
        ${starPill()}
      </div>
      <main id="stage" class="stage"></main>
      <div id="companion" class="companion"></div>
      <div id="mom-hint" class="mom-hint"><span id="mom-clock">0:00</span><span class="mom-keys"> · <b>1</b> красиво · <b>2</b> ещё раз / проскочил · <b>пробел</b> сказала · <b>3</b> пропустить · <b>4</b> вернуть прошлое</span></div>
    </div>`
  };

  function updateProgress() {
    const bar = document.getElementById('progress');
    if (!bar || !session) return;
    bar.innerHTML = session.steps.map((step, index) => {
      const schoolType = step.kind === 'school' && Y.schoolCore ? Y.schoolCore.TYPES.find(t => t.id === step.type) : null;
      const icon = step.alt ? '🎲' : step.kind === 'game' ? core.GAMES[step.game].icon : step.kind === 'fun' ? (step.type === 'poem' ? '📜' : '❓') : schoolType ? schoolType.icon : STEP_ICONS[step.kind];
      const done = index < session.index;
      return done
        ? `<i class="done" data-action="jump-step" data-i="${index}" title="Вернуться к этому заданию">${icon}</i>`
        : `<i class="${index === session.index ? 'current' : ''}">${icon}</i>`;
    }).join('') + (session.mini ? '' : `<i class="goal" title="Сюрприз в конце">${state.progress.days[A.today()] ? '⭐' : '🎁'}</i>`);
    const pill = document.querySelector('[data-star-pill] b');
    if (pill) pill.textContent = state.progress.stars + session.stars;
  }

  function createApi(ctx) {
    // У каждого шага свой «жетон»: если мама пропустила шаг, его таймеры и ожидания сразу завершаются.
    const token = ctx.stepToken || 0;
    const alive = () => session === ctx && !ctx.ended && (ctx.stepToken || 0) === token;
    const api = {
      data, core, art, sfx, ui, speech, mic,
      name: A.childName(),
      alive,
      get stage() { return document.getElementById('stage'); },
      cleanup(fn) { ctx.cleanups.push(fn); },
      wait(ms) {
        return new Promise(resolve => {
          const timer = setTimeout(resolve, ms);
          ctx.cleanups.push(() => { clearTimeout(timer); resolve(); });
        });
      },
      every(ms, fn) {
        const timer = setInterval(fn, ms);
        ctx.cleanups.push(() => clearInterval(timer));
        return () => clearInterval(timer);
      },
      say(items, opts) { return alive() ? speech.play(items, opts) : Promise.resolve(false); },
      line: category => speech.line(category),
      word: word => speech.word(word),
      setReplay(fn) { ctx.replay = fn; },
      replay() { if (ctx.replay) return ctx.replay(); return null; },
      star(n, fromEl) {
        const amount = n || 1;
        ctx.stars += amount;
        sfx.play('coin');
        ui.flyStar(fromEl, amount);
        updateProgress();
      },
      async praiseShort() {
        if (!alive()) return;
        if (ctx.unverified) { ctx.unverified = false; return; }
        ctx.praiseCounter = (ctx.praiseCounter || 0) + 1;
        if (ctx.praiseCounter % 2 === 1) await speech.play(speech.line('praiseShort'), { protect: true, interrupt: true });
      },
      wrong(node) {
        ui.shake(node);
        sfx.play('soft');
        ctx.wrongs = (ctx.wrongs || 0) + 1;
      },
      counted(text, sound, rating, times) {
        const n = Math.max(1, Number(times) || 1);
        const s = soundStat(ctx.stats, sound);
        s.said += n;
        ctx.stats.said += n;
        if (text) {
          const w = ctx.stats.words[text] || { said: 0, good: 0, slip: 0, sound };
          w.said += n;
          ctx.stats.words[text] = w;
        }
        ctx.lastSaid = { text, sound, at: Date.now(), rated: false };
        if (rating) rate(rating);
      },
      micSeconds(sound, sec) { soundStat(ctx.stats, sound).micSec += sec; },
      mushroom(n) { ctx.stats.mushrooms += n || 1; },
      sayStep: opts => sayStep(ctx, opts),
      momHint(show) { const hint = document.getElementById('mom-hint'); if (hint) hint.classList.toggle('keys', Boolean(show)); }
    };
    return api;
  }

  // Сколько слогов — чтобы понимать, сколько голоса ждать от слова.
  const vowelCount = text => (String(text || '').toLowerCase().match(/[аеёиоуыэюя]/g) || []).length || 1;
  const SIBILANTS = ['с', 'сь', 'з', 'зь', 'ц', 'ш', 'ж', 'ч', 'щ'];
  // Как засчитывать сказанное: 'asr' — проверять слово распознаванием, 'mom' — решает мама, 'voice' — любой голос.
  function checkMode() { const m = state.settings.checkMode; return m === 'mom' || m === 'voice' ? m : 'asr'; }

  function markSlip(ctx, text, sound) {
    const s = soundStat(ctx.stats, sound);
    s.slip += 1; ctx.stats.slip += 1;
    if (text) { const w = ctx.stats.words[text] || (ctx.stats.words[text] = { said: 0, good: 0, slip: 0, sound }); w.slip += 1; }
  }

  // Ребёнок произносит слово. Засчитываем только настоящее слово: микрофон ждёт голос нужной длины,
  // распознавание проверяет, что сказано именно это слово. Мама всегда может решить сама: 1 — красиво, 2 — ещё раз, пробел — дальше.
  async function sayStep(ctx, opts) {
    const o = Object.assign({ prompt: false, record: false, maxMs: 4500, endSilenceMs: 600, minMs: 140, host: null, label: 'Сказала ✓' }, opts || {});
    const host = o.host || document.getElementById('stage');
    const api = ctx.api;
    if (!api.alive() || !host) return { heard: false };
    const mode = checkMode();
    const repeat = Math.max(1, o.repeat || 1);
    const wordText = o.item && typeof o.item.key === 'string' && o.item.key.startsWith('w:') && repeat === 1 && !o.items ? o.item.key.slice(2) : '';
    // Иногда — сказать по-разному: шёпотом, громко, как робот… (разнообразие и игра голосом).
    const style = pickSayStyle(ctx, o, wordText);
    const sylCount = vowelCount(o.stat || (o.item && o.item.text));
    const syllables = o.items ? o.items.reduce((n, it) => n + vowelCount(it.text), 0) : sylCount * repeat;
    const minVoicedMs = Math.round(Math.min(900, Math.max(200, syllables * 90)) * (style ? 0.6 : 1));
    const needHissMs = mode === 'voice' && SIBILANTS.includes(o.sound) && !style ? 60 : 0;
    const panel = el(`<div class="say-panel ${o.compact ? 'compact' : ''} ${style ? `styled style-${style.id}` : ''}">
      <div class="ear-wrap"><span class="ear">👂</span><span class="meter"><i></i></span></div>
      ${style ? `<div class="say-style"><span>${style.icon}</span><b>${esc(style.label)}</b>${style.id === 'clap' ? `<i class="clap-dots">${'👏'.repeat(Math.min(5, sylCount))}</i>` : ''}</div>` : ''}
      ${o.show ? `<div class="say-what">${o.show}</div>` : ''}
      <button class="btn good say-done">${esc(o.label)}</button>
      <div class="say-mom ${mode === 'mom' ? 'on' : ''}"><span class="say-heard"></span>
        <button data-judge="good">1 · красиво</button><button data-judge="retry">2 · ещё раз</button><button data-judge="next">␣ дальше</button></div>
    </div>`);
    host.appendChild(panel);
    api.momHint(true);
    const meter = panel.querySelector('.meter i');
    const heardNote = panel.querySelector('.say-heard');
    const unsub = mic.subscribe(frame => {
      if (meter) meter.style.width = `${Math.round((frame.voice ? Math.max(0.35, frame.level) : frame.level * 0.6) * 100)}%`;
      panel.classList.toggle('hearing', Boolean(frame.voice));
    });
    ctx.cleanups.push(unsub);
    let listening = null;
    let decision = null;
    let decisionWaiter = null;
    const judge = kind => {
      decision = kind;
      if (listening) { if (kind === 'retry') listening.cancel(); else listening.confirm(); }
      if (decisionWaiter) { const fn = decisionWaiter; decisionWaiter = null; fn(); }
    };
    ctx.activeSay = { judge, waitingMom: () => Boolean(decisionWaiter) };
    panel.querySelector('.say-done').onclick = () => judge('next');
    panel.querySelectorAll('[data-judge]').forEach(btn => { btn.onclick = () => judge(btn.dataset.judge); });
    // Цепочка «са-са-са»: один клип повторяется несколько раз с короткой паузой; «бусы» — несколько слов подряд.
    const clipList = o.items ? o.items.slice() : (o.item ? Array.from({ length: repeat }, () => o.item) : []);
    const styleLine = style ? speech.line(style.line) : null;
    ctx.replay = () => speech.play(styleLine ? [...clipList, styleLine] : clipList, { gap: o.items ? 380 : 140 });
    if (o.prompt) await speech.play(speech.line('say'), { interrupt: true });
    if (clipList.length && !o.silent && api.alive()) await speech.play(clipList, { interrupt: !o.prompt, gap: o.items ? 380 : 140 });
    if (styleLine && api.alive()) await speech.play(styleLine, { interrupt: false });
    if (!api.alive()) { unsub(); ctx.activeSay = null; return { heard: false }; }
    const micOn = mic.isOn();
    panel.classList.add('listening');
    const listenOnce = timeout => {
      listening = mic.listen({ timeoutMs: timeout, maxMs: style && ['slow', 'robot', 'clap'].includes(style.id) ? Math.max(o.maxMs, 7000) : o.maxMs, endSilenceMs: style && ['slow', 'robot', 'clap'].includes(style.id) ? 900 : o.endSilenceMs, minMs: o.minMs, record: o.record, waitForever: !micOn, minVoicedMs, needHissMs, activeWhenHiss: Boolean(style && style.id === 'whisper') });
      const handle = listening;
      ctx.cleanups.push(() => handle.cancel());
      return handle.promise.then(res => { if (listening === handle) listening = null; return res; });
    };
    // Мама не оценила за 8 с — засчитываем и идём дальше (экран не ждёт бесконечно).
    const waitDecision = () => new Promise(resolve => {
      if (decision) { resolve(); return; }
      decisionWaiter = resolve;
      const auto = setTimeout(() => { if (decisionWaiter === resolve) judge('next'); }, 8000);
      ctx.cleanups.push(() => clearTimeout(auto));
      ctx.cleanups.push(() => { if (decisionWaiter === resolve) { decisionWaiter = null; resolve(); } });
    });
    let result = { heard: false };
    let accepted = false;
    let rating = null;
    let misses = 0;
    while (api.alive()) {
      decision = null;
      // По-особому сказанное слово (шёпотом, как робот…) распознавание не проверяет — засчитываем голос.
      const asrRun = mode === 'asr' && wordText && Y.asr && !style ? Y.asr.begin(wordText) : null;
      result = await listenOnce(micOn ? 6500 : 25000);
      if (!result.heard && result.how === 'timeout' && api.alive() && !decision) {
        await speech.play([speech.line('notHeard'), ...clipList], { interrupt: true, gap: 140 });
        if (api.alive() && !decision) result = await listenOnce(8000);
      }
      if (!api.alive()) { if (asrRun) asrRun.cancel(); break; }
      if (mode === 'mom' && result.heard && !decision) {
        panel.classList.add('waiting-mom');
        heardNote.textContent = 'Мама, оцените:';
        await waitDecision();
        panel.classList.remove('waiting-mom');
        if (!api.alive()) { if (asrRun) asrRun.cancel(); break; }
      }
      let verdict = null;
      if (asrRun && result.heard && !decision) {
        panel.classList.add('checking');
        verdict = await asrRun.finish();
        panel.classList.remove('checking');
        heardNote.textContent = verdict.texts.length ? `услышано: ${verdict.texts.join(' ')}` : 'услышано: —';
      } else if (asrRun) asrRun.cancel();
      if (!api.alive()) break;
      if (decision === 'retry') {
        markSlip(ctx, o.stat, o.sound);
        await speech.play([speech.line('momAgain'), ...clipList], { interrupt: true, gap: 140 });
        continue;
      }
      if (decision === 'good' || decision === 'next' || result.how === 'manual' || result.how === 'button') {
        accepted = true; rating = decision === 'good' ? 'good' : null; break;
      }
      if (!result.heard) break;
      if (verdict && !verdict.match) {
        misses += 1;
        if (misses >= 2) break;
        await speech.play([speech.line('wordAgain'), ...clipList], { interrupt: true, gap: 140 });
        continue;
      }
      accepted = true;
      break;
    }
    unsub();
    ctx.activeSay = null;
    panel.classList.remove('listening');
    ctx.unverified = false;
    if (accepted) {
      panel.classList.add('ok');
      sfx.play('ding');
      api.counted(o.stat, o.sound, rating, repeat);
      await api.wait(380);
    } else if (result.heard && api.alive()) {
      // Два раза не то слово: без похвалы, спокойно идём дальше.
      ctx.unverified = true;
      api.counted(o.stat, o.sound, null, repeat);
      await speech.play(speech.line('moveOn'), { interrupt: true });
    }
    panel.remove();
    return Object.assign({}, result, { heard: accepted || Boolean(result.heard), verified: accepted });
  }

  const SAY_STYLES = [
    { id: 'whisper', icon: '🤫', label: 'Шёпотом', line: 'styleWhisper' },
    { id: 'loud', icon: '📢', label: 'Громко', line: 'styleLoud' },
    { id: 'slow', icon: '🐢', label: 'Медленно', line: 'styleSlow' },
    { id: 'robot', icon: '🤖', label: 'Как робот', line: 'styleRobot' },
    { id: 'mouse', icon: '🐭', label: 'Тоненько, как мышка', line: 'styleMouse' },
    { id: 'bear', icon: '🐻', label: 'Низко, как мишка', line: 'styleBear' },
    { id: 'clap', icon: '👏', label: 'С хлопками', line: 'styleClap' },
    { id: 'smile', icon: '😁', label: 'С улыбкой', line: 'styleSmile' }
  ];
  function pickSayStyle(ctx, o, wordText) {
    if (state.settings.sayStyles === false || o.noStyle || !wordText || o.items) return null;
    ctx.styleCount = ctx.styleCount || 0;
    if (ctx.styleCount >= 5 || Math.random() > 0.28) return null;
    const pool = SAY_STYLES.filter(st => st.id !== ctx.lastStyle);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    ctx.styleCount += 1; ctx.lastStyle = pick.id;
    return pick;
  }

  // Мамины оценки последнего сказанного.
  function rate(kind) {
    const ctx = session;
    if (!ctx || !ctx.lastSaid || ctx.lastSaid.rated || Date.now() - ctx.lastSaid.at > 12000) {
      if (ctx) ui.toast(kind === 'good' ? 'Нечего оценивать — пусть сначала скажет' : 'Нечего отмечать', 'mom');
      return;
    }
    const last = ctx.lastSaid;
    last.rated = true;
    const s = soundStat(ctx.stats, last.sound);
    const w = last.text ? (ctx.stats.words[last.text] || (ctx.stats.words[last.text] = { said: 0, good: 0, slip: 0, sound: last.sound })) : null;
    if (kind === 'good') {
      s.good += 1; ctx.stats.good += 1; if (w) w.good += 1;
      ctx.stars += 1;
      updateProgress();
      sfx.play('sparkle');
      ui.confetti(14);
      ui.toast('💖 Красиво!', 'good');
      if (!speech.isPlaying()) speech.play(speech.line('momGood'), { interrupt: false });
    } else {
      s.slip += 1; ctx.stats.slip += 1; if (w) w.slip += 1;
      ui.toast('отмечено: ещё потренировать', 'mom');
    }
  }

  document.addEventListener('keydown', event => {
    if (!session || state.settings.momKeys === false) return;
    if (event.target && /input|textarea|select/i.test(event.target.tagName)) return;
    const say = session.activeSay;
    if (say && (event.key === '1' || event.key === '2')) { say.judge(event.key === '1' ? 'good' : 'retry'); return; }
    if (say && event.code === 'Space' && say.waitingMom()) { event.preventDefault(); say.judge('next'); return; }
    if (event.key === '1') rate('good');
    if (event.key === '2') rate('slip');
    if (event.key === '3') skipStep();
    if (event.key === '4') backStep();
  });

  // Мама пропускает текущее задание (скучно, трудно или ребёнок устал).
  // Вернуться к прошлому заданию (или к выбранному в полосе шагов), если его случайно пропустили.
  function backStep(target) {
    const ctx = session;
    if (!ctx || ctx.ended) return;
    const to = Number.isInteger(target) ? target : Math.max(0, ctx.index - 1);
    ctx.jumpTo = Math.max(0, Math.min(to, ctx.steps.length - 1));
    ctx.skipped = true;
    ctx.stepToken = (ctx.stepToken || 0) + 1;
    speech.stop();
    mic.holdManual(false);
    runCleanups(ctx);
    document.querySelectorAll('.modal-back, .praise-overlay').forEach(node => node.remove());
    ui.toast('возвращаемся к заданию', 'mom');
  }

  function nextIndex(ctx) {
    if (Number.isInteger(ctx.jumpTo)) { ctx.index = ctx.jumpTo; ctx.jumpTo = null; return; }
    ctx.index += 1;
  }

  function skipStep() {
    const ctx = session;
    if (!ctx || ctx.ended) return;
    ctx.skipped = true;
    ctx.stepToken = (ctx.stepToken || 0) + 1;
    speech.stop();
    mic.holdManual(false);
    runCleanups(ctx);
    document.querySelectorAll('.modal-back').forEach(node => node.remove());
    ui.toast('задание пропущено', 'mom');
  }

  function startClock(ctx) {
    const tick = () => {
      const node = document.getElementById('mom-clock');
      if (!node || session !== ctx) { clearInterval(timer); return; }
      const sec = Math.round((Date.now() - ctx.startedAt) / 1000);
      node.textContent = `⏱ ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    };
    const timer = setInterval(tick, 1000);
    tick();
  }

  async function startSession() {
    sfx.unlock();
    speech.stop();
    const built = core.buildSession(state, new Date(), Math.random);
    const ctx = Object.assign(built, { index: 0, stars: 0, cleanups: [], ended: false, startedAt: Date.now(), stats: newStats(), replay: null });
    ctx.surpriseAt = planSurprises(ctx.steps);
    ctx.api = createApi(ctx);
    session = ctx;
    current = { name: 'session', params: {} };
    render();
    showCompanion();
    updateProgress();
    startClock(ctx);
    if (state.settings.micEnabled !== false) {
      const ok = await mic.start();
      if (!ok) ui.toast('Микрофон недоступен — нажимайте «Сказала» или пробел');
      else if (Y.asr) { loadAsr(); Y.asr.warm(); }
    }
    await speech.play(speech.line('hello'), { interrupt: true });
    // Тема дня — коротко показываем и называем.
    const th = ctx.theme && ctx.theme !== 'normal' ? core.DAY_THEMES[ctx.theme] : null;
    if (th && session === ctx) {
      const stage = document.getElementById('stage');
      if (stage) stage.innerHTML = `<div class="splash theme-splash"><div class="splash-icon">${th.icon}</div><h1>${esc(th.title)}</h1><p class="muted">${esc(th.note || '')}</p></div>`;
      sfx.play('sparkle');
      await speech.play(speech.line(`theme.${ctx.theme}`), { interrupt: true });
      if (session === ctx) await new Promise(r => setTimeout(r, 400));
    }
    if (session === ctx) runSteps(ctx);
  }

  function runCleanups(ctx) {
    const list = ctx.cleanups.splice(0);
    for (const fn of list) { try { fn(); } catch (error) {} }
  }

  async function stepSplash(ctx, step) {
    const stage = document.getElementById('stage');
    if (!stage) return;
    let icon = ''; let title = ''; let lineKey = ''; let withSound = false;
    if (step.kind === 'game') {
      icon = core.GAMES[step.game].icon; title = core.GAMES[step.game].title; lineKey = `g.${step.game}`;
      withSound = ['soundCheck', 'conveyor', 'balloons', 'whackMole', 'hideSeek'].includes(step.game);
    } else if (step.kind === 'mic') {
      const meta = core.MIC_GAMES[step.game]; icon = meta.icon; title = meta.title; lineKey = `g.mic.${step.game}`;
    } else if (step.kind === 'fun') {
      icon = step.type === 'poem' ? '📜' : '❓'; title = step.type === 'poem' ? 'Весёлый стишок' : 'Загадки'; lineKey = step.type === 'poem' ? 'g.poem' : 'g.riddle';
    } else return;
    stage.innerHTML = `<div class="splash"><div class="splash-icon">${icon}</div><h1>${esc(title)}</h1>${step.sound ? `<div class="splash-sound">${ui.badge(step.sound, 'big')}</div>` : ''}</div>`;
    sfx.play('whoosh');
    const items = [speech.line(lineKey)];
    if (withSound) items.push(speech.snd(step.sound));
    ctx.replay = () => speech.play(items);
    await speech.play(items, { interrupt: true });
    if (session === ctx) await ctx.api.wait(250);
  }

  // Ребёнок сам выбирает одну игру из двух: свой выбор — больше интереса.
  function chooseGame(ctx, step) {
    const stage = document.getElementById('stage');
    if (!stage || !step.alt) return Promise.resolve();
    const options = [{ game: step.game, payload: step.payload }, step.alt];
    if (Math.random() < 0.5) options.reverse();
    stage.className = 'stage stage-choice';
    stage.innerHTML = `<div class="choice"><h1>Выбирай игру!</h1><div class="choice-cards">${options.map((option, index) => `
      <button class="choice-card" data-choice="${index}" style="--i:${index}"><span class="choice-icon">${core.GAMES[option.game].icon}</span><b>${esc(core.GAMES[option.game].title)}</b></button>`).join('')}</div></div>`;
    sfx.play('whoosh');
    return new Promise(resolve => {
      let done = false;
      const finish = index => {
        if (done) return;
        done = true;
        const pick = options[index] || options[0];
        step.game = pick.game;
        step.payload = pick.payload;
        delete step.alt;
        updateProgress();
        resolve();
      };
      stage.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => {
        if (done) return;
        sfx.play('pop');
        btn.classList.add('picked');
        stage.querySelectorAll('[data-choice]').forEach(other => { if (other !== btn) other.classList.add('faded'); });
        setTimeout(() => finish(Number(btn.dataset.choice)), 450);
      }));
      // Выбор без спешки: через 20 с вопрос звучит ещё раз, через 40 с игра выбирается сама.
      const hintTimer = setTimeout(() => { if (!done) speech.play(speech.line('choose'), { interrupt: false }); }, 20000);
      const timer = setTimeout(() => finish(Math.random() < 0.5 ? 0 : 1), 40000);
      ctx.cleanups.push(() => clearTimeout(hintTimer));
      ctx.cleanups.push(() => { clearTimeout(timer); finish(0); });
      const line = speech.line('choose');
      ctx.replay = () => speech.play(line, { interrupt: true });
      speech.play(line, { interrupt: true });
    });
  }

  // Большая похвала после игры — звучит до конца, нажатия её не обрывают.
  // ── Питомец на занятии: сидит в уголке, радуется похвале, иногда приносит сюрприз ──
  function showCompanion() {
    const box = document.getElementById('companion');
    const id = state.progress.pets.active;
    if (!box || !id) return;
    box.innerHTML = `<div class="pet-bubble"></div>${petMarkup(id, 120, 'bob', { grow: true })}`;
  }
  function companionCheer(text) {
    const box = document.getElementById('companion');
    if (!box || !box.firstElementChild) return;
    const pet = box.querySelector('.pet-box');
    if (pet) { pet.classList.remove('jump'); void pet.offsetWidth; pet.classList.add('jump'); }
    const bubble = box.querySelector('.pet-bubble');
    if (bubble && text) { bubble.textContent = text; bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show'); setTimeout(() => bubble.classList.remove('show'), 2200); }
    for (let i = 0; i < 4; i += 1) {
      const h = el(`<i class="comp-heart" style="left:${20 + Math.random() * 60}%;animation-delay:${i * 0.12}s">${['💖', '✨', '💗'][i % 3]}</i>`);
      box.appendChild(h); setTimeout(() => h.remove(), 1800);
    }
  }
  // 1–2 сюрприза за занятие — после игр в середине (не после последней).
  function planSurprises(steps) {
    const spots = steps.map((step, i) => (['game', 'mic', 'fun'].includes(step.kind) && i < steps.length - 2 ? i : -1)).filter(i => i > 1);
    if (!spots.length) return [];
    const first = spots[Math.floor(Math.random() * spots.length)];
    const rest = spots.filter(i => Math.abs(i - first) >= 2);
    return Math.random() < 0.6 && rest.length ? [first, rest[Math.floor(Math.random() * rest.length)]] : [first];
  }
  async function petSurprise(ctx) {
    const stage = document.getElementById('stage');
    if (!stage || session !== ctx) return;
    const petId = state.progress.pets.active;
    const roll = Math.random();
    const kind = roll < 0.5 ? 'stars' : roll < 0.75 ? 'food' : 'sticker';
    const overlay = el(`<div class="praise-overlay surprise-overlay"><div class="praise-card">
      <div class="surprise-pet">${petId ? petMarkup(petId, 150, 'bob', { grow: true }) : art.mascot(130)}</div>
      <h1>Сюрприз!</h1><button class="surprise-box">🎁</button><div class="surprise-prize"></div></div></div>`);
    stage.appendChild(overlay);
    const comp = document.getElementById('companion');
    if (comp) comp.style.visibility = 'hidden';
    sfx.play('whoosh');
    const petLine = speech.petLine('gift');
    if (petLine) await speech.play(petLine, { interrupt: true });
    const box = overlay.querySelector('.surprise-box');
    const api = ctx.api;
    await ui.tapWait(overlay, '.surprise-box', api, { auto: true, hintMs: 4000, autoMs: 3000, maxHints: 1 });
    if (session !== ctx) { overlay.remove(); if (comp) comp.style.visibility = ''; return; }
    box.classList.add('open');
    sfx.play('fanfare');
    ui.confetti(40);
    const prize = overlay.querySelector('.surprise-prize');
    let text = '';
    if (kind === 'stars') {
      const n = 3 + Math.floor(Math.random() * 3);
      ctx.stars += n; updateProgress();
      prize.innerHTML = `<div class="prize-big">${'⭐'.repeat(n)}</div><b>+${n} звёзд!</b>`;
      text = `+${n} звёзд`;
    } else if (kind === 'food') {
      const foods = core.ITEMS.filter(item => item.slot === 'food');
      const food = foods[Math.floor(Math.random() * foods.length)];
      state.progress.pets.items[food.id] = (Number(state.progress.pets.items[food.id]) || 0) + 1;
      save();
      prize.innerHTML = `<div class="prize-big">${food.emoji}</div><b>${esc(food.name)} — для питомца!</b>`;
      text = food.name;
    } else {
      const got = core.drawSticker(state.progress, Math.random, null);
      save(); updateProgress();
      prize.innerHTML = `<div class="prize-big sticker-prize rarity-${got.sticker.rarity}">${got.sticker.emoji}</div><b>Наклейка «${esc(got.sticker.name)}»!</b>${got.pageDone ? `<div class="page-done">📒 Страница собрана! +${got.stars} ⭐</div>` : got.stars ? `<div>+${got.stars} ⭐</div>` : ''}`;
      if (got.pageDone) ui.confetti(80);
      text = got.sticker.name;
    }
    void text;
    await speech.play(speech.line('surprise'), { interrupt: true, protect: true });
    await new Promise(resolve => setTimeout(resolve, 1600));
    overlay.remove();
    if (comp) comp.style.visibility = '';
  }

  async function bigPraise(ctx, stars) {
    const stage = document.getElementById('stage');
    if (!stage || session !== ctx) return;
    // Иногда хвалит любимый герой — своим голосом.
    const byHero = Boolean(heroUrl) && Math.random() < 0.5;
    const line = byHero ? speech.heroLine('praise') : speech.line('praiseName');
    const overlay = el(`<div class="praise-overlay"><div class="praise-card">${byHero ? heroMarkup(170, 'talking', { friend: true }) : art.mascot(140)}<h1>${esc(line.text)}</h1><div class="praise-stars">${'⭐'.repeat(Math.min(stars, 5))}</div></div></div>`);
    stage.appendChild(overlay);
    sfx.play('fanfare');
    ui.confetti(24);
    ctx.stars += stars;
    updateProgress();
    const cheer = speech.petLine('cheer');
    companionCheer(cheer && cheer.text);
    const started = Date.now();
    await speech.play(line, { interrupt: true, protect: true });
    // Иногда питомец тоже хвалит — своим голосом.
    if (cheer && !byHero && Math.random() < 0.3 && session === ctx) await speech.play(cheer, { interrupt: true });
    const rest = 1500 - (Date.now() - started);
    if (rest > 0) await new Promise(resolve => setTimeout(resolve, rest));
    await new Promise(resolve => setTimeout(resolve, 350));
    overlay.remove();
  }

  async function runSteps(ctx) {
    while (session === ctx && ctx.index < ctx.steps.length) {
      const step = ctx.steps[ctx.index];
      ctx.skipped = false;
      ctx.api = createApi(ctx);
      updateProgress();
      ctx.replay = null;
      ctx.api.momHint(false);
      if (step.alt && !ctx.mini) {
        await chooseGame(ctx, step);
        if (session !== ctx) return;
        if (ctx.skipped) { nextIndex(ctx); continue; }
      }
      const handler = step.kind === 'game' ? Y.games[step.game] : Y.steps[step.kind];
      await stepSplash(ctx, step);
      if (session !== ctx) return;
      if (ctx.skipped) { nextIndex(ctx); continue; }
      const stage = document.getElementById('stage');
      stage.innerHTML = '';
      stage.className = `stage stage-${step.kind} ${step.kind === 'game' ? `game-${step.game}` : ''}`;
      let result = null;
      try {
        result = handler ? await handler(stage, step, ctx.api) : null;
      } catch (error) {
        console.error('Шаг упал', step, error);
      }
      runCleanups(ctx);
      if (session !== ctx) return;
      ctx.api.momHint(false);
      if (ctx.skipped) { nextIndex(ctx); continue; }
      // Вне занятия (игротека, стишки) — по одной звезде, чтобы главная награда оставалась за занятие.
      if (['game', 'mic', 'fun', 'story', 'postcard'].includes(step.kind)) await bigPraise(ctx, ctx.mini ? Math.min(2, (result && result.stars) || 1) : ((result && result.stars) || 3));
      if (!ctx.mini && (ctx.surpriseAt || []).includes(ctx.index) && session === ctx) {
        ctx.surpriseAt = ctx.surpriseAt.filter(i => i !== ctx.index);
        await petSurprise(ctx);
      }
      else if (step.kind === 'gym' || step.kind === 'lock' || step.kind === 'breath') {
        ctx.stars += step.kind === 'lock' ? 1 : 1;
        updateProgress();
      }
      nextIndex(ctx);
    }
    if (session === ctx) (ctx.mini ? finishMini(ctx) : finishSession(ctx));
  }

  // Стишки и загадки вне занятия: без гимнастики и без детали пазла, только звёзды.
  // opts.noMic — без микрофона (школьные задания), opts.onFinish(ctx) — подвести итог перед выходом.
  async function startMini(steps, returnTo, opts) {
    sfx.unlock();
    speech.stop();
    const o = opts || {};
    const ctx = { mini: true, returnTo: returnTo || 'fun', steps, index: 0, stars: 0, cleanups: [], ended: false, startedAt: Date.now(), stats: newStats(), replay: null, primary: '', secondary: '', onFinish: o.onFinish || null, noMic: Boolean(o.noMic) };
    ctx.api = createApi(ctx);
    session = ctx;
    current = { name: 'session', params: {} };
    render();
    updateProgress();
    startClock(ctx);
    if (!ctx.noMic && state.settings.micEnabled !== false && await mic.start() && Y.asr) { loadAsr(); Y.asr.warm(); }
    runSteps(ctx);
  }

  function finishMini(ctx) {
    if (typeof ctx.onFinish === 'function') { try { ctx.onFinish(ctx); } catch (error) { console.error(error); } }
    state.progress.stars += ctx.stars;
    state.progress.stats.saidTotal += ctx.stats.said;
    save();
    endSession(true);
    mic.release();
    ui.toast(`+${ctx.stars} ⭐`, 'good');
    go(ctx.returnTo || 'fun');
  }

  async function finishSession(ctx) {
    const seconds = Math.round((Date.now() - ctx.startedAt) / 1000);
    const summary = {
      stars: ctx.stars + 5,
      gymIds: ctx.gymIds,
      gameIds: ctx.steps.filter(step => step.kind === 'game').map(step => step.game),
      contentIds: core.sessionContentIds(ctx.steps),
      soundsList: Array.from(new Set([ctx.primary, ctx.secondary])),
      sounds: ctx.stats.sounds,
      words: ctx.stats.words,
      said: ctx.stats.said,
      good: ctx.stats.good,
      slip: ctx.stats.slip,
      mushrooms: ctx.stats.mushrooms,
      seconds
    };
    for (const sound of summary.soundsList) soundStat(ctx.stats, sound);
    const result = core.completeSession(state, summary, A.today(), Math.random);
    state = result.state;
    save();
    endSession(true);
    mic.release();
    result.sessionStars = summary.stars;
    result.said = summary.said;
    current = { name: 'finish', params: { result } };
    render();
  }

  function endSession() {
    if (!session) return;
    session.ended = true;
    runCleanups(session);
    session = null;
    speech.stop();
  }

  Y.actions.start = () => startSession();
  Y.actions['back-step'] = () => backStep();
  Y.actions['jump-step'] = btn => backStep(Number(btn.dataset.i));
  Y.actions.replay = () => { if (session && session.replay) session.replay(); };
  Y.actions['exit-session'] = async () => {
    const school = session && session.steps.some(step => step.kind === 'school');
    const ok = await ui.confirmBox(school ? 'Закончить задания сейчас? Звёзды за этот набор не начислятся.' : 'Закончить занятие сейчас? Шаг по дорожке засчитывается только за целое занятие.', 'Выйти', 'Продолжить', 12000);
    if (!ok) return;
    endSession(false);
    mic.release();
    go(school ? 'school' : 'home');
  };
  Y.actions.go = btn => go(btn.dataset.screen, Object.assign({}, btn.dataset));

  // ─────────────────────────────────────────────────────────────
  // ОБЩЕЕ
  // ─────────────────────────────────────────────────────────────
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const handler = Y.actions[btn.dataset.action];
    if (!handler) return;
    if (session && btn.blur) btn.blur();
    sfx.unlock();
    if (btn.dataset.action !== 'replay') sfx.play('click');
    Promise.resolve(handler(btn, event)).catch(error => { console.error(error); ui.toast('Что-то пошло не так'); });
  });

  // В занятии фокус с кнопок снимаем: пробел — это «сказала», а не повторное нажатие.
  document.addEventListener('click', () => {
    if (session) setTimeout(() => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }, 0);
  }, true);

  document.addEventListener('change', event => {
    const target = event.target.closest('[data-change]');
    if (!target) return;
    const handler = Y.actions[target.dataset.change];
    if (handler) Promise.resolve(handler(target, event)).catch(error => console.error(error));
  });

  // Любимый герой: картинку загружает мама, хранится только в этом браузере.
  async function refreshHero() {
    if (heroUrl) URL.revokeObjectURL(heroUrl);
    const record = await storage.getBlob('assets', 'hero').catch(() => null);
    heroUrl = record && record.blob ? URL.createObjectURL(record.blob) : '';
    if (state.hero) state.hero.hasImage = Boolean(heroUrl);
  }

  // opts.friend — вид по дружбе: рамка розовая → серебряная → золотая → радужная, картинка чуть крупнее.
  function heroMarkup(size, extraClass, opts) {
    const o = opts || {};
    const level = o.friend ? core.heroFriend(state).index : 0;
    const px = Math.round((size || 160) * (1 + level * 0.06));
    const inner = heroUrl ? `<img src="${heroUrl}" alt="">` : '<span class="hero-empty">🧸</span>';
    const deco = o.friend && level >= 3 ? '<span class="hf-spark a">✨</span><span class="hf-spark b">⭐</span>' : '';
    return `<div class="hero-pic ${heroUrl ? '' : 'empty'} ${o.friend ? `friend-${level}` : ''} ${extraClass || ''}" style="--size:${px}px">${inner}${deco}</div>`;
  }

  // Сердечки дружбы: закрашенные — уже есть, белые — впереди.
  function heartsMarkup(small) {
    const f = core.heroFriend(state);
    const hearts = core.HERO_FRIEND.slice(1).map((_, i) => `<span class="${i < f.index ? 'on' : ''}">${i < f.index ? '❤️' : '🤍'}</span>`).join('');
    return `<div class="hero-hearts ${small ? 'small' : ''}" title="${esc(f.level.name)}${f.next ? ` · ещё ${f.toNext} ${plural(f.toNext, 'игра', 'игры', 'игр')} до нового сердечка` : ''}">${hearts}</div>`;
  }

  async function refreshGift() {
    if (giftUrl) URL.revokeObjectURL(giftUrl);
    const record = await storage.getBlob('assets', 'gift').catch(() => null);
    giftUrl = record && record.blob ? URL.createObjectURL(record.blob) : '';
  }

  async function exportBackup(silent) {
    const envelope = await storage.exportBackup(state);
    ui.downloadBlob(new Blob([JSON.stringify(envelope)], { type: 'application/json' }), `yazychok-backup-${A.today()}.json`);
    if (!silent) ui.toast('Резервная копия сохранена в «Загрузки»');
  }

  giftInput.addEventListener('change', async () => {
    const file = giftInput.files && giftInput.files[0];
    if (!file) return;
    await storage.putBlob('assets', 'gift', file, { filename: file.name });
    await refreshGift();
    giftInput.value = '';
    ui.toast('Картинка подарка сохранена');
    render();
  });

  backupInput.addEventListener('change', async () => {
    const file = backupInput.files && backupInput.files[0];
    if (!file) return;
    try {
      await exportBackup(true);
      const envelope = storage.validateBackup(JSON.parse(await file.text()));
      const replace = await ui.confirmBox('Текущие данные уже сохранены в «Загрузки». Как импортировать?', 'Заменить всё', 'Объединить');
      state = core.normalizeState(await storage.importBackup(envelope, replace ? 'replace' : 'merge', state));
      save();
      await refreshGift();
      await speech.loadMom();
      applySettings();
      ui.toast('Данные импортированы');
      go('parent');
    } catch (error) { ui.toast(error.message || 'Не удалось импортировать файл'); }
    backupInput.value = '';
  });

  root.addEventListener('beforeunload', () => { mic.stop(); });

  mic.setSuppress(() => speech.isPlaying() || speech.msSinceEnd() < 350 || sfx.msSince() < 220);

  async function init() {
    applySettings();
    if (state.profile.name && !state.progress.pets.owned.length) {
      // Первый питомец — Язычок, выдаётся при первом входе в домик.
    }
    render();
    storage.requestPersistence();
    await storage.migrateLegacyVoice().catch(() => 0);
    await speech.loadMom();
    await refreshGift();
    await refreshHero();
    if (Y.cleanupChildRecordings) await Y.cleanupChildRecordings().catch(() => {});
    save();
    render();
    // Распознавание слов грузится в фоне (~50 МБ с диска, несколько секунд).
    setTimeout(loadAsr, 2500);
  }

  function asrWords() {
    const extra = (Y.heroWords && Y.heroWords()) || [];
    return [...data.WORDS.map(word => word.text), ...extra];
  }
  function loadAsr() {
    if (!Y.asr || checkMode() !== 'asr') return Promise.resolve(false);
    Y.asr.setMic(mic);
    return Y.asr.load({ words: asrWords(), mic });
  }
  A.loadAsr = loadAsr;
  A.checkMode = checkMode;

  A.startSession = startSession;
  A.startMini = startMini;
  A.skipStep = skipStep;
  A.backStep = backStep;
  A.rate = rate;
  init();
})(window);

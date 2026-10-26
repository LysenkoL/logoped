(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  const { core, ui, art, sfx } = Y;
  const { esc } = ui;
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};
  const A = () => Y.app;
  const S = () => Y.app.state;

  // ─────────────────────────────────────────────────────────────
  // Пазл подарка
  // ─────────────────────────────────────────────────────────────
  function puzzleMarkup(revealFrom) {
    const puzzle = S().progress.puzzle;
    const cols = 4; const rows = puzzle.size === 12 ? 3 : 4;
    const url = A().giftUrl();
    const covers = Array.from({ length: puzzle.size }, (_, i) => {
      const open = i < puzzle.pieces;
      const fresh = revealFrom !== undefined && i >= revealFrom && open;
      return `<div class="pz-cover ${open && !fresh ? 'open' : ''} ${fresh ? 'fresh' : ''}" style="--d:${fresh ? (i - revealFrom) * 0.5 + 0.6 : 0}s">${open && !fresh ? '' : '✦'}</div>`;
    }).join('');
    return `<div class="puzzle" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);${url ? `background-image:url('${url}')` : ''}">
      ${url ? '' : '<div class="pz-fallback">🎁</div>'}${covers}</div>`;
  }

  Y.screens.puzzle = {
    render: () => {
      const puzzle = S().progress.puzzle;
      return `<div class="shell">${A().topbar('Подарок', 'home')}
        <section class="card center">
          <h1>${esc(puzzle.title || 'Большой сюрприз')}</h1>
          ${puzzleMarkup()}
          <p class="big-note"><b>${puzzle.pieces} из ${puzzle.size}</b> деталей</p>
          ${puzzle.complete ? '<button class="btn" data-action="certificate">🏅 Грамота</button>' : ''}
        </section>
        <section class="card">${A().pathMarkup(false)}
          <p class="muted">Одна деталь — за первое целое занятие дня. Если за неделю было 5 дней занятий — бонусная деталь! На каждой 4-й клетке — сундук.</p>
        </section></div>`;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Итог занятия
  // ─────────────────────────────────────────────────────────────
  // Карточка наклейки: сначала рубашкой вверх, ребёнок переворачивает сам.
  function stickerCard(info, flipped) {
    const st = info.sticker;
    return `<button class="sticker-flip ${flipped ? 'flipped' : ''}" data-action="sticker-flip" data-id="${st.id}" data-new="${info.isNew ? 1 : 0}" data-page-done="${info.pageDone ? 1 : 0}">
      <span class="sf-inner">
        <span class="sf-back"><b>?</b><small>Переверни!</small></span>
        <span class="sf-front rarity-${st.rarity}"><span class="sf-emoji">${st.emoji}</span><b>${esc(st.name)}</b>
          <small>${st.rarity === 'gold' ? '🌟 золотая!' : st.rarity === 'rare' ? '✨ блестящая' : ''}</small></span>
      </span>
    </button>
    <div class="sf-note" hidden>${info.isNew ? `Страница «${esc(info.page.title)}»: <b>${info.pageOwned} из ${info.pageSize}</b>${info.pageDone ? ' — собрана! +10 ⭐' : ''}` : `Такая уже есть — +${info.stars} ⭐`}</div>`;
  }

  Y.screens.finish = {
    render: params => {
      const r = params.result;
      const puzzle = S().progress.puzzle;
      const letter = r.letterReward;
      const pets = S().progress.pets;
      const pet = core.PETS.find(item => item.id === pets.active);
      const surprises = [];
      if (r.sticker) surprises.push(`<div class="surprise sticker-box"><h3>Наклейка дня</h3>${stickerCard(r.sticker, false)}</div>`);
      if (r.storyChapter) surprises.push(`<div class="surprise"><h3>Сказка</h3><button class="story-new" data-action="story-play" data-id="${r.storyChapter.id}"><span class="story-scene">${r.storyChapter.scene}</span><b>Новая глава!</b><small>«${esc(r.storyChapter.title)}»</small><em>Играть ▶</em></button></div>`);
      const ups = (r.petsUp && r.petsUp.length ? r.petsUp : (r.petGrew ? [r.petGrew] : [])).slice(0, 3);
      for (const up of ups) {
        const upPet = core.PETS.find(item => item.id === up.pet);
        if (!upPet) continue;
        const from = core.PET_STAGES[up.index - 1];
        const ratio = from ? (from.scale / up.stage.scale).toFixed(2) : '0.7';
        surprises.push(`<div class="surprise grew-box"><h3>Подрос! ⬆️</h3><div class="grew"><div class="grow-up" style="--from:${ratio}">${A().petMarkup(upPet.id, 130, '', { grow: true })}</div><b>${esc(upPet.name)} — теперь «${esc(up.stage.name)}»</b></div></div>`);
      }
      const petNote = r.firstToday && pets.owned.length ? `<p class="pets-step">🐾 ${pets.owned.length > 1 ? `Все питомцы (${pets.owned.length}) сделали шаг к росту!` : `${esc(pet ? pet.name : 'Питомец')} сделал шаг к росту!`}${r.petBonus ? ` &nbsp;❤️ ${esc(pet ? pet.name : 'Питомец')} доволен и дарит <b>+${r.petBonus} ⭐</b>` : ''}</p>` : (r.petBonus ? `<p class="pets-step">❤️ ${esc(pet ? pet.name : 'Питомец')} доволен и дарит <b>+${r.petBonus} ⭐</b></p>` : '');
      if (r.unlockedPieces) surprises.push(`<div class="surprise"><h3>${r.bonusPiece ? '🔥 Бонусная деталь!' : 'Деталь подарка'}</h3><div class="finish-puzzle">${puzzleMarkup(puzzle.pieces - r.unlockedPieces)}</div><small><b>${puzzle.pieces} из ${puzzle.size}</b></small></div>`);
      return `<div class="shell finish">
        <section class="card center celebrate">
          <div class="finish-head">${art.mascot(96)}<div><h1>Ура, ${esc(A().childName())}!</h1>
          <p class="big-note">Занятие закончено! +<b>${r.sessionStars}</b> ⭐${r.said ? ` · сказано: <b>${r.said}</b>` : ''}</p></div></div>
          ${petNote}
          ${surprises.length ? `<div class="surprises">${surprises.join('')}</div>` : ''}
          ${r.firstToday === false ? `<p class="muted">Наклейка и новая глава — завтра, за первое занятие дня. А звёзды уже твои!</p>` : ''}
          ${r.puzzleComplete ? '<div class="gift-done">🏆 Подарок собран! Мама, пора дарить! 🎁<br><button class="btn small" data-action="certificate">🏅 Скачать грамоту</button></div>' : ''}
          <div class="finish-extras">
          ${letter ? `<div class="letter-prize" style="--c:${ui.soundColor(letter.sound)}"><span>✨</span><b>${esc(ui.soundLabel(letter.sound))}</b><small>${letter.count === 1 ? 'Новая волшебная буква!' : `Буква сияет ярче (${letter.count})`}</small></div>` : ''}
          ${r.medals && r.medals.length ? `<div class="new-medals">${r.medals.map(m => `<div class="medal on"><span>${m.emoji}</span><small>${esc(m.name)}</small></div>`).join('')}</div>` : ''}
          </div>
          <div class="row gap wrap center-row">
            ${S().progress.pendingChests ? '<button class="btn big chest-btn" data-action="go" data-screen="chest">🧰 Открыть сундук!</button>' : ''}
            ${r.storyChapter ? `<button class="btn big" data-action="story-play" data-id="${r.storyChapter.id}">📖 Играть новую главу</button>` : ''}
            <button class="btn secondary" data-action="go" data-screen="album">📒 Альбом</button>
            <button class="btn secondary" data-action="go" data-screen="pet">🐾 К питомцу</button>
            <button class="btn secondary" data-action="go" data-screen="home">Готово</button>
          </div>
        </section></div>`;
    },
    mount: (node, params) => {
      const r = params.result;
      const speech = A().speech;
      ui.confetti(r.puzzleComplete ? 80 : 40);
      sfx.play('fanfare');
      const items = [speech.line('sessionEnd')];
      if (r.bonusPiece) items.push(speech.line('bonusPiece'));
      if (r.unlockedPieces) items.push(speech.line('piece'));
      if (r.petGrew) items.push(speech.line('petGrow'));
      if (r.petBonus) { const b = speech.petLine('bonus'); if (b) items.push(b); }
      if (r.storyChapter) items.push(speech.line('storyNew'));
      if (r.sticker) items.push(speech.line('stickerReveal'));
      else if (S().progress.pendingChests) items.push(speech.line('chest'));
      speech.play(items, { interrupt: true, protect: true });
      if (r.unlockedPieces) setTimeout(() => sfx.play('sparkle'), 700);
    }
  };

  Y.actions['sticker-flip'] = btn => {
    if (btn.classList.contains('flipped')) {
      const st = data.STICKERS.find(item => item.id === btn.dataset.id);
      if (st) A().speech.play(A().speech.sticker(st), { interrupt: true });
      return;
    }
    btn.classList.add('flipped');
    const note = btn.parentNode && btn.parentNode.querySelector('.sf-note');
    const st = data.STICKERS.find(item => item.id === btn.dataset.id);
    setTimeout(() => {
      if (note) note.hidden = false;
      sfx.play(st && st.rarity !== 'common' ? 'fanfare' : 'sparkle');
      ui.confetti(st && st.rarity === 'gold' ? 70 : st && st.rarity === 'rare' ? 40 : 22);
      ui.sparkleAt && ui.sparkleAt(btn);
      const speech = A().speech;
      const items = [speech.line(btn.dataset.new === '1' ? 'stickerNew' : 'stickerDup')];
      if (st) items.push(speech.sticker(st));
      if (btn.dataset.pageDone === '1') items.push(speech.line('pageDone'));
      speech.play(items, { interrupt: true, protect: true });
    }, 380);
  };

  // ─────────────────────────────────────────────────────────────
  // Сундук
  // ─────────────────────────────────────────────────────────────
  let chestTaps = 0;
  Y.screens.chest = {
    render: () => {
      chestTaps = 0;
      const pending = S().progress.pendingChests;
      if (!pending) {
        return `<div class="shell">${A().topbar('Сундук', 'home')}<section class="card center"><div class="giant">🧰</div><p>Сундуков пока нет. Они стоят на дорожке к подарку — на каждой 4-й клетке!</p><button class="btn" data-action="go" data-screen="home">Домой</button></section></div>`;
      }
      return `<div class="shell">${A().topbar('Сундук', 'home')}<section class="card center chest-room">
        <p class="big-note">Нажми на сундук 3 раза!</p>
        <button class="chest-big" data-action="chest-tap">🧰</button>
        <div class="chest-reward"></div>
      </section></div>`;
    },
    mount: () => A().speech.play(A().speech.line('chest'), { interrupt: true })
  };

  Y.actions['chest-tap'] = btn => {
    chestTaps += 1;
    btn.classList.remove('wobble'); void btn.offsetWidth; btn.classList.add('wobble');
    sfx.play('boing');
    if (chestTaps < 3) return;
    btn.disabled = true;
    const result = core.openChest(S(), Math.random);
    A().state = result.state;
    A().save();
    const reward = result.reward;
    if (!reward) return;
    sfx.play('chest');
    ui.confetti(50);
    const room = btn.closest('.chest-room');
    const hint = room && room.querySelector('.big-note');
    if (hint) hint.remove();
    btn.remove();
    let prize = '';
    if (reward.type === 'pet') prize = `<div class="reward-big">${A().petMarkup(reward.pet.id, 130)}</div><h2>Новый питомец: ${esc(reward.pet.name)}!</h2>`;
    if (reward.type === 'item') prize = `<div class="reward-big"><span class="giant">${Y.art.itemIcon(reward.item)}</span></div><h2>${esc(reward.item.name)} — для питомца!</h2>`;
    if (reward.type === 'stars') prize = `<div class="reward-big"><span class="giant">⭐</span></div><h2>+${reward.amount} звёзд!</h2>`;
    let html = `<div class="chest-prizes"><div class="chest-prize">${prize}<p class="treasure-note">И сокровище: <span class="treasure">${reward.treasure.emoji}</span> ${esc(reward.treasure.name)}</p></div>`;
    if (reward.sticker) html += `<div class="chest-sticker"><h3>И наклейка!</h3>${stickerCard(reward.sticker, false)}</div>`;
    html += `</div><div class="row gap wrap center-row">${S().progress.pendingChests ? '<button class="btn" data-action="go" data-screen="chest">Ещё сундук!</button>' : ''}
      <button class="btn secondary" data-action="go" data-screen="album">📒 Альбом</button><button class="btn secondary" data-action="go" data-screen="pet">🐾 К питомцу</button><button class="btn" data-action="go" data-screen="home">Домой</button></div>`;
    document.querySelector('.chest-reward').innerHTML = html;
    if (reward.sticker) setTimeout(() => A().speech.play(A().speech.line('stickerChest'), { interrupt: false }), 900);
    const pill = document.querySelector('[data-star-pill] b');
    if (pill) pill.textContent = S().progress.stars;
  };

  // ─────────────────────────────────────────────────────────────
  // Домик питомца
  // ─────────────────────────────────────────────────────────────
  let eggTaps = 0;
  Y.screens.pet = {
    render: () => {
      const pets = S().progress.pets;
      if (!pets.owned.length) {
        eggTaps = 0;
        return `<div class="shell">${A().topbar('Мой питомец', 'home')}<section class="card center">
          <h1>Кто там в яйце?</h1><p>Нажми на яйцо 3 раза!</p>
          <button class="egg-big" data-action="egg-tap">🥚</button></section></div>`;
      }
      const pet = core.PETS.find(item => item.id === pets.active) || core.PETS[0];
      const bg = core.BACKGROUNDS.find(item => item.id === pets.bg) || core.BACKGROUNDS[0];
      const foods = core.ITEMS.filter(item => item.slot === 'food' && pets.items[item.id]);
      const toys = core.ITEMS.filter(item => item.slot === 'toy' && pets.items[item.id]);
      const wearables = core.ITEMS.filter(item => ['hat', 'glasses', 'neck'].includes(item.slot) && pets.items[item.id]);
      const paints = core.ITEMS.filter(item => item.slot === 'paint' && pets.items[item.id]);
      const decorOwned = core.ITEMS.filter(item => item.slot === 'decor' && pets.items[item.id]);
      const decorShown = pets.decor.map(id => core.ITEMS.find(x => x.id === id)).filter(Boolean);
      const joy = core.petJoy(S(), pet.id, A().today());
      const favId = pets.favKnown[pet.id] ? pet.fav : '';
      return `<div class="shell">${A().topbar('Мой питомец', 'home')}
        <section class="pet-room bg-${bg.id}">
          <div class="room-deco">${Array.from(bg.deco).map((d, i) => `<span style="--i:${i}">${d}</span>`).join('')}</div>
          <div class="room-decor">${decorShown.map((d, i) => `<span class="decor-item ds${i} ${d.id}" title="${esc(d.name)}">${d.emoji}</span>`).join('')}</div>
          <div class="room-joy" title="Настроение">${joyHearts(joy)}</div>
          <div class="room-stage"><div class="pet-bubble"></div><button class="room-pet" data-action="pet-do" data-do="pat">${A().petMarkup(pet.id, 250, 'bob', { grow: true })}</button></div>
          <div class="pet-name">${esc(pet.name)} <small>${esc(core.petStage(S(), pet.id).stage.name)}</small></div>
          <div class="fx-layer"></div><div class="night-layer"><span>🌙</span><i>⭐</i><i>⭐</i><i>✨</i></div>
          <div class="tray tray-food"><b>🍽️</b>${foods.length ? foods.map(f => `<button class="tray-item ${f.id === favId ? 'fav' : ''}" data-action="pet-feed" data-id="${f.id}" title="${esc(f.name)}">${f.emoji}<small>${pets.items[f.id]}</small>${f.id === favId ? '<em>❤️</em>' : ''}</button>`).join('') : '<button class="tray-item empty" data-action="go" data-screen="shop" title="Купить еду">🛍️</button>'}</div>
          <div class="tray tray-toys"><b>🧸</b>${toys.length ? toys.map(t => `<button class="tray-item" data-action="pet-play" data-id="${t.id}" title="${esc(t.name)}">${Y.art.itemIcon(t)}</button>`).join('') : '<button class="tray-item empty" data-action="go" data-screen="shop" title="Купить игрушку">🛍️</button>'}</div>
        </section>
        <div class="pet-actions big-actions">
          <button class="act" data-action="pet-do" data-do="pat"><span>🤗</span>Погладить</button>
          <button class="act" data-action="pet-do" data-do="tickle"><span>😆</span>Пощекотать</button>
          <button class="act" data-action="pet-do" data-do="bath"><span>🛁</span>Искупать</button>
          <button class="act" data-action="pet-do" data-do="sleep"><span>🌙</span>Уложить спать</button>
          <button class="act" data-action="pet-name"><span>🗣️</span>Скажи имя</button>
          <button class="act shop" data-action="go" data-screen="shop"><span>🛍️</span>Магазин</button>
        </div>
        <section class="card"><h3>👒 Наряд</h3>${wearables.length ? `<div class="chips">${wearables.map(w => `<button class="chip ${pets.wearing[w.slot] === w.id ? 'on' : ''}" data-action="pet-wear" data-id="${w.id}">${Y.art.itemIcon(w)} ${esc(w.name)}</button>`).join('')}</div>` : '<p class="muted">Шапки, очки, шарфики появляются в магазине и в сундуках.</p>'}
          ${paints.length ? `<h3>🎨 Цвет ${esc(pet.acc || pet.name)}</h3><div class="chips"><button class="chip ${!pets.colors[pet.id] ? 'on' : ''}" data-action="pet-paint" data-id="">Свой цвет</button>${paints.map(pt => `<button class="chip ${pets.colors[pet.id] === pt.id ? 'on' : ''}" data-action="pet-paint" data-id="${pt.id}"><span class="paint-swatch tiny" style="background:${pt.color}"></span> ${esc(pt.name.replace(' краска', ''))}</button>`).join('')}</div>` : ''}
          ${decorOwned.length ? `<h3>🏡 В домике <small class="muted">(до ${core.DECOR_MAX} сразу)</small></h3><div class="chips">${decorOwned.map(d => `<button class="chip ${pets.decor.includes(d.id) ? 'on' : ''}" data-action="pet-decor" data-id="${d.id}">${d.emoji} ${esc(d.name)}</button>`).join('')}</div>` : ''}
          ${pets.bgs.length > 1 ? `<h3>Фон</h3><div class="chips">${pets.bgs.map(id => { const b = core.BACKGROUNDS.find(x => x.id === id); return `<button class="chip ${pets.bg === id ? 'on' : ''}" data-action="pet-bg" data-id="${id}">${esc(b.name)}</button>`; }).join('')}</div>` : ''}
        </section>
        <section class="card"><h3>Как растёт ${esc(pet.name)}</h3>
          <p class="grow-rule">🌱 <b>Все твои питомцы растут вместе.</b> Каждый день, когда ты занимаешься, каждый питомец делает шаг 🐾. Выбирать никого не нужно.</p>
          ${A().growthMarkup(pet.id, true)}
          <p class="grow-rule">❤️ <b>Настроение</b> — от заботы: покорми (❤️❤️), искупай, поиграй, уложи спать (по ❤️ в день). Каждый день без заботы — минус сердечко. Если сердечек 4 или 5, питомец дарит <b>+3 ⭐</b> за занятие!</p>
        </section>
        <section class="card"><h3>Мои питомцы (${pets.owned.length})</h3>
          ${pets.owned.length > 1 ? '<p class="muted small">Нажми на питомца — он будет жить на главном экране и помогать на занятии. Растут все вместе.</p>' : ''}
          <div class="pet-shelf">${pets.owned.map(id => {
          const p = core.PETS.find(x => x.id === id);
          return `<button class="shelf-pet ${id === pets.active ? 'on' : ''}" data-action="pet-choose" data-id="${id}"><span class="shelf-stage">${A().petMarkup(id, 86, '', { grow: true, bare: true })}</span><small>${esc(p.name)}</small><span class="shelf-joy">${joyHearts(core.petJoy(S(), id, A().today()), true)}</span>${A().pawsMarkup(id, true)}</button>`;
        }).join('')}</div></section>
      </div>`;
    }
  };

  function joyHearts(joy, small) {
    const n = core.JOY_MAX;
    return `<span class="joy ${small ? 'small' : ''}">${Array.from({ length: n }, (_, i) => `<i class="${i < joy ? 'on' : ''}">${i < joy ? '❤️' : '🤍'}</i>`).join('')}</span>`;
  }

  Y.actions['egg-tap'] = btn => {
    eggTaps += 1;
    btn.classList.remove('wobble'); void btn.offsetWidth; btn.classList.add('wobble');
    sfx.play('boing');
    if (eggTaps === 2) btn.textContent = '🐣';
    if (eggTaps < 3) return;
    A().state = core.adoptFirstPet(S());
    A().save();
    sfx.play('fanfare');
    ui.confetti(40);
    A().render();
    const speech = A().speech;
    speech.play([speech.line('petThanks', 0)], { interrupt: true });
  };

  // ── Домик: эффекты ──
  const room = () => document.querySelector('.pet-room');
  const petNode = () => document.querySelector('.room-pet .pet-box');
  function fx(html, cls, ms) {
    const layer = document.querySelector('.fx-layer');
    if (!layer) return null;
    const node = ui.el(`<span class="fx ${cls || ''}">${html}</span>`);
    layer.appendChild(node);
    setTimeout(() => node.remove(), ms || 2200);
    return node;
  }
  function hearts(n) {
    for (let i = 0; i < (n || 6); i += 1) {
      const h = fx(['💖', '💗', '✨'][i % 3], 'heart-fly');
      if (h) { h.style.left = `${35 + Math.random() * 30}%`; h.style.animationDelay = `${i * 0.12}s`; }
    }
  }
  function petAnim(cls, ms) {
    const pet = petNode();
    if (!pet) return;
    pet.classList.remove('jump', 'chomp', 'wiggle', 'washing', 'sleepy', 'rainbow', 'dance');
    void pet.offsetWidth;
    pet.classList.add(cls);
    if (ms) setTimeout(() => pet.classList.remove(cls), ms);
  }
  let bubbleTimer = null;
  function bubble(text, ms) {
    const node = document.querySelector('.pet-bubble');
    if (!node) return;
    node.textContent = text;
    node.classList.remove('show'); void node.offsetWidth; node.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => node.classList.remove('show'), ms || 2400);
  }
  function petSay(category) {
    const sp = A().speech;
    const line = sp.petLine(category);
    if (!line) return Promise.resolve();
    bubble(line.text);
    return sp.play(line, { interrupt: true });
  }
  // Забота добавляет сердечки (раз в день за каждое действие) — показываем, как они наполняются.
  function care(action, amount) {
    const pets = S().progress.pets;
    const res = core.addPetJoy(S(), pets.active, amount, A().today(), action);
    A().save();
    refreshJoy(res.added);
    return res;
  }
  function refreshJoy(added) {
    const box = document.querySelector('.room-joy');
    if (!box) return;
    box.innerHTML = joyHearts(core.petJoy(S(), S().progress.pets.active, A().today()));
    if (added > 0) {
      const on = box.querySelectorAll('i.on');
      for (let i = on.length - added; i < on.length; i += 1) if (on[i]) on[i].classList.add('new');
      sfx.play('sparkle');
    }
  }
  let busy = false;
  const BUSY_MS = { pat: 900, tickle: 1600, bath: 4200, sleep: 6500 };
  Y.actions['pet-pat'] = () => Y.actions['pet-do']({ dataset: { do: 'pat' } });
  Y.actions['pet-do'] = btn => {
    const what = btn.dataset.do;
    if (busy || !room()) return;
    busy = true;
    setTimeout(() => { busy = false; }, BUSY_MS[what] || 1000);
    if (what === 'pat') {
      petAnim('jump', 700); sfx.play('boing'); hearts(); petSay('pat');
    } else if (what === 'tickle') {
      petAnim('wiggle', 1400); sfx.play('boing'); petSay('giggle');
      for (let i = 0; i < 4; i += 1) { const f = fx(['😆', '✋', '💫'][i % 3], 'pop-around'); if (f) f.style.setProperty('--a', `${i * 90}deg`); }
    } else if (what === 'bath') {
      const tub = fx('🛁', 'tub', 4200);
      for (let i = 0; i < 14; i += 1) { const b = fx('', 'soap', 3600); if (b) { b.style.left = `${30 + Math.random() * 40}%`; b.style.animationDelay = `${Math.random() * 2}s`; b.style.setProperty('--s', `${14 + Math.random() * 26}px`); } }
      petAnim('washing', 3200); sfx.play('whoosh');
      setTimeout(() => { if (!room()) return; petSay('bath'); hearts(4); care('bath', 1); }, 2600);
      if (tub) tub.classList.add('in');
    } else if (what === 'sleep') {
      const r = room(); r.classList.add('night');
      if (S().progress.pets.items['decor-bed']) {
        const stageNode = document.querySelector('.room-stage');
        if (stageNode) { const bed = ui.el('<span class="bed-under">🛏️</span>'); stageNode.prepend(bed); setTimeout(() => bed.remove(), 5300); }
      }
      petAnim('sleepy');
      petSay('night');
      const zzz = setInterval(() => { if (!room()) { clearInterval(zzz); return; } const z = fx('💤', 'zzz', 2000); if (z) z.style.left = `${55 + Math.random() * 10}%`; }, 700);
      setTimeout(() => {
        clearInterval(zzz);
        if (!room()) return;
        room().classList.remove('night');
        petAnim('jump', 700);
        petSay('morning');
        care('sleep', 1);
      }, 5200);
    }
  };

  Y.actions['pet-feed'] = btn => {
    if (busy) return;
    const result = core.feedPet(S(), btn.dataset.id, A().today());
    if (!result.ok) return;
    busy = true;
    A().state = result.state;
    A().save();
    const item = core.ITEMS.find(x => x.id === btn.dataset.id);
    const pet = petNode();
    sfx.play('pop');
    // Еда летит от кнопки прямо в рот питомцу, он жуёт и говорит «ням-ням».
    const from = btn.getBoundingClientRect();
    const to = pet ? pet.getBoundingClientRect() : from;
    const food = ui.el(`<span class="food-fly">${item.emoji}</span>`);
    document.body.appendChild(food);
    const x0 = from.left + from.width / 2; const y0 = from.top + from.height / 2;
    const x1 = to.left + to.width / 2; const y1 = to.top + to.height * 0.62;
    food.style.left = `${x0}px`; food.style.top = `${y0}px`;
    const anim = food.animate([
      { transform: 'translate(-50%, -50%) scale(1)' },
      { transform: `translate(calc(-50% + ${(x1 - x0) / 2}px), calc(-50% + ${(y1 - y0) / 2 - 120}px)) scale(1.4)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.3)` }
    ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' });
    anim.onfinish = () => {
      food.remove();
      petAnim('chomp', 1300);
      sfx.play('pop');
      for (let i = 0; i < 6; i += 1) { const c = fx(item.emoji, 'crumb', 1200); if (c) c.style.setProperty('--a', `${i * 60}deg`); }
      if (result.fav) {
        // Угадали любимую еду!
        petSay('fav');
        ui.confetti(30);
        setTimeout(() => ui.toast('❤️ Это любимая еда! Теперь в магазине она отмечена сердечком', 'good'), 600);
      } else petSay('yum');
      setTimeout(() => { hearts(result.fav ? 10 : 5); refreshJoy(result.joy ? result.joy.added : 0); }, 900);
      const left = S().progress.pets.items[item.id] || 0;
      if (left) { const n = btn.querySelector('small'); if (n) n.textContent = left; } else btn.remove();
      setTimeout(() => { busy = false; }, 900);
    };
  };

  // Игрушки: каждая играет по-своему прямо в комнате.
  Y.actions['pet-play'] = btn => {
    if (busy || !room()) return;
    busy = true;
    const item = core.ITEMS.find(x => x.id === btn.dataset.id);
    const pets = S().progress.pets;
    pets.wearing.toy = item.id;
    A().save();
    const kind = item.id.replace('toy-', '');
    const node = fx(Y.art.itemIcon(item), `toy-play toy-${kind}`, 5200);
    // Музыкальные игрушки играют мелодию; машинка гудит; пузыри летают.
    if (item.music) {
      sfx.play(item.music);
      if (['piano', 'drum', 'trumpet'].includes(kind)) {
        for (let i = 0; i < 8; i += 1) setTimeout(() => { const n = fx(['🎵', '🎶'][i % 2], 'note-fly', 1800); if (n) n.style.left = `${40 + Math.random() * 25}%`; }, i * 350);
        petAnim('dance', 3600);
      }
      if (kind === 'bubbles') for (let i = 0; i < 16; i += 1) { const b = fx('', 'soap', 4200); if (b) { b.style.left = `${20 + Math.random() * 60}%`; b.style.animationDelay = `${Math.random() * 2.5}s`; b.style.setProperty('--s', `${16 + Math.random() * 30}px`); } }
    }
    if (kind === 'balloon' && node) node.innerHTML = `<i class="string"></i>${Y.art.itemIcon(item)}`;
    if (kind === 'wand') petAnim('rainbow', 3600); else petAnim('jump', 700);
    if (kind === 'ball') { setTimeout(() => petAnim('jump', 700), 1300); setTimeout(() => petAnim('jump', 700), 2600); }
    if (kind === 'bear') setTimeout(() => hearts(6), 900);
    if (kind === 'wand') for (let i = 0; i < 8; i += 1) { const sp = fx('✨', 'orbit', 3600); if (sp) sp.style.animationDelay = `${i * 0.18}s`; }
    sfx.play('whoosh');
    petSay('play');
    care('play', 1);
    setTimeout(() => { busy = false; A().render(); }, 5000);
  };

  Y.actions['pet-wear'] = btn => {
    const item = core.ITEMS.find(x => x.id === btn.dataset.id);
    const pets = S().progress.pets;
    pets.wearing[item.slot] = pets.wearing[item.slot] === item.id ? '' : item.id;
    A().save();
    sfx.play('pop');
    A().render();
  };

  Y.actions['pet-paint'] = btn => {
    const pets = S().progress.pets;
    if (btn.dataset.id) pets.colors[pets.active] = btn.dataset.id; else delete pets.colors[pets.active];
    A().save(); sfx.play('sparkle'); A().render();
  };
  Y.actions['pet-decor'] = btn => {
    const pets = S().progress.pets;
    const id = btn.dataset.id;
    if (pets.decor.includes(id)) pets.decor = pets.decor.filter(x => x !== id);
    else {
      if (pets.decor.length >= core.DECOR_MAX) { ui.toast(`В домике помещается ${core.DECOR_MAX} вещи — сначала убери одну`); return; }
      pets.decor = [...pets.decor, id];
    }
    A().save(); sfx.play('pop'); A().render();
  };
  Y.actions['pet-bg'] = btn => { S().progress.pets.bg = btn.dataset.id; A().save(); A().render(); };
  Y.actions['pet-choose'] = btn => { S().progress.pets.active = btn.dataset.id; A().save(); sfx.play('step'); A().render(); };

  Y.actions['pet-name'] = async btn => {
    const pets = S().progress.pets;
    const pet = core.PETS.find(item => item.id === pets.active);
    if (!pet || btn.dataset.busy) return;
    btn.dataset.busy = '1';
    const speech = A().speech;
    const mic = Y.mic;
    const ok = S().settings.micEnabled !== false && await mic.start();
    await speech.play([speech.line('petName'), speech.pet(pet)], { interrupt: true });
    btn.textContent = '👂 Слушаю…';
    let heard = true;
    if (ok) heard = (await mic.listen({ timeoutMs: 7000 }).promise).heard;
    else await new Promise(resolve => setTimeout(resolve, 2500));
    if (heard) {
      petAnim('jump', 700); hearts();
      ui.confetti(20);
      await speech.play(speech.line('petThanks'), { interrupt: true });
    }
    mic.release();
    delete btn.dataset.busy;
    btn.textContent = '🗣️ Скажи моё имя';
  };

  // ─────────────────────────────────────────────────────────────
  // Магазин
  // ─────────────────────────────────────────────────────────────
  let shopTab = 'pets';
  const SHOP_TABS = [
    ['pets', '🐾 Питомцы'], ['food', '🍓 Еда'], ['wear', '👒 Наряды'], ['toys', '🧸 Игрушки'],
    ['home', '🏡 Домик'], ['paint', '🎨 Краски'], ['bg', '🏝️ Фоны']
  ];
  const TAB_SLOTS = { food: ['food'], wear: ['hat', 'glasses', 'neck'], toys: ['toy'], home: ['decor'], paint: ['paint'] };
  const isNew = id => core.SHOP_NEW.includes(id) && !S().progress.pets.seen[id];
  const tabHasNew = tab => {
    if (tab === 'pets') return false;
    if (tab === 'bg') return core.BACKGROUNDS.some(b => isNew(b.id));
    return core.ITEMS.some(i => TAB_SLOTS[tab].includes(i.slot) && isNew(i.id));
  };
  Y.screens.shop = {
    render: () => {
      const s = S();
      const pets = s.progress.pets;
      const stars = s.progress.stars;
      const priceBtn = (id, price, owned, label) => {
        if (owned) return `<span class="owned">${label || 'Есть ✓'}</span>`;
        if (stars >= price) return `<button class="btn small buy" data-action="buy" data-id="${id}">⭐ ${price}</button>`;
        return `<button class="btn small buy locked" disabled>⭐ ${price}<small>ещё ${price - stars}</small></button>`;
      };
      // «Хочу!» — мечта: копим звёзды, на главном экране видно, сколько осталось.
      const wishBtn = (id, owned, price) => (owned || stars >= price) ? '' : `<button class="wish ${pets.wish === id ? 'on' : ''}" data-action="shop-wish" data-id="${id}" title="Коплю на это">${pets.wish === id ? '💖 Коплю!' : '🤍 Хочу'}</button>`;
      const tryBtn = id => pets.active ? `<button class="try" data-action="shop-try" data-id="${id}">👀 Примерить</button>` : '';
      const card = (id, visual, name, owned, price, extra) => `<div class="shop-card ${owned ? 'has' : ''} ${pets.wish === id ? 'wished' : ''}">${isNew(id) ? '<i class="new-badge">новое</i>' : ''}${visual}<b>${esc(name)}</b>${extra || ''}${priceBtn(id, price, owned)}${wishBtn(id, owned, price)}</div>`;
      let cards = '';
      if (shopTab === 'pets') {
        cards = core.PETS.filter(p => p.price > 0 || pets.owned.includes(p.id)).map(p => card(p.id, A().petMarkup(p.id, 96), p.name, pets.owned.includes(p.id), p.price)).join('');
      } else if (shopTab === 'bg') {
        cards = core.BACKGROUNDS.map(b => card(b.id, `<div class="bg-thumb bg-${b.id}">${b.deco}</div>`, b.name, pets.bgs.includes(b.id), b.price)).join('');
      } else if (shopTab === 'food') {
        const pet = core.PETS.find(x => x.id === pets.active);
        const favKnown = pet && pets.favKnown[pet.id];
        cards = core.ITEMS.filter(i => i.slot === 'food').map(i => card(i.id, `<span class="shop-emoji">${i.emoji}</span>`, i.name, false, i.price,
          `${favKnown && pet.fav === i.id ? `<small class="fav-mark">❤️ любимое у ${esc(pet.acc || pet.name)}</small>` : ''}${pets.items[i.id] ? `<small class="muted">есть: ${pets.items[i.id]}</small>` : ''}`)).join('');
        if (pet && !favKnown) cards = `<div class="shop-tip">❓ У ${esc(pet.name)} есть любимая еда. Покорми разной едой — и узнаешь, какая!</div>` + cards;
      } else {
        const slots = TAB_SLOTS[shopTab];
        cards = core.ITEMS.filter(i => slots.includes(i.slot)).map(i => {
          const visual = i.slot === 'paint' ? `<span class="paint-swatch" style="background:${i.color}"></span>` : `<span class="shop-emoji">${Y.art.itemIcon(i)}</span>`;
          return card(i.id, visual, i.name, pets.items[i.id], i.price, i.slot === 'decor' ? '' : tryBtn(i.id));
        }).join('');
        if (shopTab === 'home') cards = `<div class="shop-tip">🏡 Мебель и украшения стоят в домике питомца — сразу до ${core.DECOR_MAX} штук.</div>` + cards;
      }
      const wish = pets.wish ? core.findShopEntry(pets.wish) : null;
      return `<div class="shell">${A().topbar('Магазин', 'home')}
        ${pets.owned.length ? '' : '<div class="notice">Сначала загляни в домик — там тебя ждёт яйцо с первым питомцем! <button class="link" data-action="go" data-screen="pet">В домик →</button></div>'}
        ${wish ? A().wishMarkup() : ''}
        <div class="tabs">${SHOP_TABS.map(([id, label]) => `<button class="tab ${shopTab === id ? 'on' : ''}" data-action="shop-tab" data-tab="${id}">${label}${tabHasNew(id) ? '<i class="tab-new"></i>' : ''}</button>`).join('')}</div>
        <div class="shop-grid">${cards}</div></div>`;
    },
    mount: () => {
      // Всё, что ребёнок увидел на вкладке, больше не «новое» (метка исчезнет при следующем заходе).
      const seen = S().progress.pets.seen;
      const ids = shopTab === 'bg' ? core.BACKGROUNDS.map(b => b.id) : shopTab === 'pets' ? [] : core.ITEMS.filter(i => TAB_SLOTS[shopTab].includes(i.slot)).map(i => i.id);
      let changed = false;
      ids.forEach(id => { if (!seen[id]) { seen[id] = true; changed = true; } });
      if (changed) A().save();
    }
  };

  Y.actions['shop-tab'] = btn => { shopTab = btn.dataset.tab; A().render(); };
  Y.actions['shop-wish'] = btn => {
    const pets = S().progress.pets;
    pets.wish = pets.wish === btn.dataset.id ? '' : btn.dataset.id;
    A().save();
    sfx.play(pets.wish ? 'sparkle' : 'soft');
    if (pets.wish) ui.toast('Копим! На главном экране будет видно, сколько звёзд осталось', 'good');
    A().render();
  };
  // Примерка: питомец в обновке, ещё до покупки.
  Y.actions['shop-try'] = btn => {
    const item = core.ITEMS.find(x => x.id === btn.dataset.id);
    const pets = S().progress.pets;
    if (!item || !pets.active) return;
    const preview = item.slot === 'paint' ? { paint: item.id } : { [item.slot]: item.id };
    const pet = core.PETS.find(x => x.id === pets.active);
    const bg = core.BACKGROUNDS.find(x => x.id === pets.bg) || core.BACKGROUNDS[0];
    const m = ui.modal(`<div class="try-room bg-${bg.id}">${A().petMarkup(pet.id, 190, 'bob', { grow: true, preview })}</div>
      <h3 class="center">${esc(pet.name)} + ${esc(item.name)}</h3>
      <div class="row gap center-row">${pets.items[item.id] ? '<span class="owned">Есть ✓</span>' : (S().progress.stars >= item.price ? `<button class="btn" data-buy>Купить ⭐ ${item.price}</button>` : `<span class="muted">Нужно ⭐ ${item.price}, есть ${S().progress.stars}</span>`)}
      <button class="btn secondary" data-close>Закрыть</button></div>`);
    sfx.play('sparkle');
    const buyBtn = m.node.querySelector('[data-buy]');
    if (buyBtn) buyBtn.onclick = () => { m.close(); Y.actions.buy({ dataset: { id: item.id } }); };
    m.node.querySelector('[data-close]').onclick = () => m.close();
  };
  Y.actions.buy = btn => {
    const result = core.buy(S(), btn.dataset.id);
    if (!result.ok) { ui.toast(result.reason === 'stars' ? 'Не хватает звёзд — позанимайся ещё!' : 'Уже есть'); return; }
    A().state = result.state;
    A().save();
    sfx.play('coin');
    ui.confetti(30);
    const name = result.entry.name;
    const slot = result.entry.slot;
    const where = slot === 'decor' ? ' — уже стоит в домике!' : slot === 'paint' ? ' — питомец перекрашен!' : '';
    ui.toast(result.kind === 'pet' ? `Ура! Новый питомец: ${name}!` : `Куплено: ${name}${where}`, 'good');
    if (result.medals && result.medals.length) setTimeout(() => ui.toast(`Новая медаль: ${result.medals[0].emoji} ${result.medals[0].name}`, 'good'), 1600);
    A().render();
  };

  // ─────────────────────────────────────────────────────────────
  // Награды: медали, сокровища, волшебная азбука
  // ─────────────────────────────────────────────────────────────
  Y.screens.awards = {
    render: () => {
      const p = S().progress;
      const medals = core.MEDALS.map(m => `<div class="medal ${p.medals[m.id] ? 'on' : ''}"><span>${p.medals[m.id] ? m.emoji : '🔒'}</span><small>${esc(m.name)}</small></div>`).join('');
      const treasures = core.TREASURES.map(t => `<div class="medal ${p.treasures[t.id] ? 'on' : ''}"><span>${p.treasures[t.id] ? t.emoji : '❔'}</span><small>${esc(t.name)}${p.treasures[t.id] > 1 ? ` × ${p.treasures[t.id]}` : ''}</small></div>`).join('');
      const letters = data.SOUND_ORDER.map(sound => {
        const count = Number(p.letterCollection.letters[sound]) || 0;
        return `<div class="letter-card ${count ? 'on' : ''}" style="--c:${ui.soundColor(sound)}"><b>${esc(ui.soundLabel(sound))}</b><small>${count ? '✦'.repeat(Math.min(5, count)) : '🔒'}</small></div>`;
      }).join('');
      return `<div class="shell">${A().topbar('Награды', 'home')}
        <section class="card"><h3>Медали</h3><div class="medal-grid">${medals}</div></section>
        <section class="card"><h3>Сокровища из сундуков</h3><div class="medal-grid">${treasures}</div></section>
        <section class="card"><h3>Волшебная азбука</h3><p class="muted">Буква звука, который тренировали, загорается после занятия.</p><div class="letter-grid">${letters}</div></section>
        ${p.zoo.length ? `<section class="card"><h3>Старый зоопарк</h3><div class="chips">${p.zoo.map(name => `<span class="chip on">${esc(name)}</span>`).join('')}</div></section>` : ''}
      </div>`;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Стишки и загадки — свободная игра вне занятия
  // ─────────────────────────────────────────────────────────────
  Y.screens.fun = {
    mount: () => { if (Y.refreshPostcards) Y.refreshPostcards(); },
    render: () => `<div class="shell">${A().topbar('Стишки и загадки', 'home')}
      ${Y.postcardsMarkup ? Y.postcardsMarkup() : ''}
      <section class="card"><h3>Загадки</h3><button class="btn big" data-action="fun-riddles">❓ Отгадать 3 загадки</button></section>
      <section class="card"><h3>Стишки-повторялки</h3><div class="poem-grid">${data.POEMS.map(poem => `<button class="poem-card" data-action="fun-poem" data-id="${poem.id}"><span>${poem.emoji}</span><b>${esc(poem.title)}</b><small>${esc(poem.lines[0])}</small></button>`).join('')}</div></section>
    </div>`
  };

  Y.actions['fun-riddles'] = () => {
    const step = core.funPayload(S(), Math.random, S().progress.recent.content, 'riddle');
    step.riddles = core.freshFirst(data.RIDDLES, S().progress.recent.content || [], Math.random).slice(0, 3).map(riddle => core.riddlePayload(S(), riddle, Math.random));
    A().startMini([step], 'fun');
  };
  Y.actions['fun-poem'] = btn => {
    const poem = data.POEMS.find(item => item.id === btn.dataset.id);
    A().startMini([{ kind: 'fun', type: 'poem', poem }], 'fun');
  };

  // ─────────────────────────────────────────────────────────────
  // Игротека: после занятия — любые игры на выбор. Для мамы — просмотр всех игр.
  // ─────────────────────────────────────────────────────────────
  let arcadeSound = '';
  Y.screens.arcade = {
    render: params => {
      const s = S();
      const preview = params.preview === '1';
      const done = Boolean(s.progress.days[A().today()]);
      const back = preview ? 'parent' : 'home';
      if (!done && !preview) {
        return `<div class="shell">${A().topbar('Игротека', back)}<section class="card center">
          <div class="giant">🔒</div><h2>Игротека откроется после занятия</h2>
          <p>Сначала занятие — потом любые игры, какие захочешь!</p>
          <button class="btn big" data-action="start">Начать занятие 🚀</button></section></div>`;
      }
      const sounds = data.SOUND_ORDER.filter(sound => core.levelOf(s, sound) >= 1);
      if (!sounds.includes(arcadeSound)) arcadeSound = core.chooseSounds(s).primary;
      const games = core.GAME_TYPES.filter(game => core.gameIsPlayable(s, game, arcadeSound));
      const micGame = data.SOUNDS[arcadeSound].micGame;
      return `<div class="shell">${A().topbar(preview ? 'Все игры (просмотр)' : 'Игротека', back)}
        ${preview ? '<div class="notice">Здесь можно попробовать любую игру. Звёзд за игру вне занятия — одна.</div>' : ''}
        <section class="card"><h3>Какой звук?</h3><div class="chips">${sounds.map(sound => `<button class="chip ${sound === arcadeSound ? 'on' : ''}" data-action="arcade-sound" data-sound="${sound}">${esc(ui.soundLabel(sound))}</button>`).join('')}</div></section>
        <div class="arcade-grid">
          <button class="arcade-card" data-action="arcade-play" data-mic="1"><span>${core.MIC_GAMES[micGame].icon}</span><b>${esc(core.MIC_GAMES[micGame].title)}</b><small>микрофон</small></button>
          ${core.partyEligible(s) ? `<button class="arcade-card" data-action="arcade-play" data-mic="party"><span>🎉</span><b>Праздник звуков</b><small>микрофон · разные звуки</small></button>` : ''}
          ${games.map(game => `<button class="arcade-card" data-action="arcade-play" data-game="${game}"><span>${core.GAMES[game].icon}</span><b>${esc(core.GAMES[game].title)}</b><small>${core.GAMES[game].speak ? 'говорим' : 'слушаем'}</small></button>`).join('')}
        </div></div>`;
    }
  };
  Y.actions['arcade-sound'] = btn => { arcadeSound = btn.dataset.sound; A().render(); };
  Y.actions['arcade-play'] = btn => {
    const s = S();
    const back = document.querySelector('.topbar [data-screen]');
    const returnTo = back && back.dataset.screen === 'parent' ? 'parent' : 'arcade';
    if (btn.dataset.mic === 'party') {
      A().startMini([{ kind: 'mic', sound: arcadeSound, game: 'party', plan: core.partyPlan(s, arcadeSound, Math.random) }], returnTo);
      return;
    }
    if (btn.dataset.mic) {
      A().startMini([{ kind: 'mic', sound: arcadeSound, game: data.SOUNDS[arcadeSound].micGame }], returnTo);
      return;
    }
    const game = btn.dataset.game;
    const payload = core.gamePayload(s, game, arcadeSound, Math.random, s.progress.recent.content);
    A().startMini([{ kind: 'game', game, sound: arcadeSound, payload }], returnTo);
  };


  // Сказка-игра — в js/story.js.

  // ─────────────────────────────────────────────────────────────
  // Альбом наклеек
  // ─────────────────────────────────────────────────────────────
  Y.screens.album = {
    render: () => {
      const owned = S().progress.album.stickers;
      const total = data.STICKERS.filter(st => owned[st.id]).length;
      const pages = data.STICKER_PAGES.map(page => {
        const items = data.STICKERS.filter(st => st.page === page.id);
        const have = items.filter(st => owned[st.id]).length;
        const complete = have === items.length;
        return `<section class="card album-page ${complete ? 'complete' : ''} ${have ? '' : 'empty'}">
          <div class="row between"><h3>${esc(page.title)}</h3><span class="pill">${complete ? '✅ ' : ''}${have} / ${items.length}</span></div>
          <div class="sticker-grid">${items.map(st => owned[st.id]
            ? `<button class="sticker rarity-${st.rarity}" data-action="sticker-say" data-id="${st.id}"><span>${st.emoji}</span><small>${esc(st.name)}</small>${owned[st.id] > 1 ? `<i>×${owned[st.id]}</i>` : ''}</button>`
            : `<div class="sticker empty rarity-${st.rarity}"><span>?</span><small>${st.rarity === 'gold' ? 'золотая' : st.rarity === 'rare' ? 'блестящая' : ''}</small></div>`).join('')}</div>
        </section>`;
      }).join('');
      return `<div class="shell">${A().topbar('Альбом наклеек', 'home')}
        <div class="notice">Собрано: <b>${total} из ${data.STICKERS.length}</b>. Наклейка выпадает за первое занятие дня и в каждом сундуке. Целая страница — +10 ⭐!</div>
        <div class="album">${pages}</div></div>`;
    }
  };

  Y.actions['sticker-say'] = btn => {
    const st = data.STICKERS.find(item => item.id === btn.dataset.id);
    btn.classList.remove('jump'); void btn.offsetWidth; btn.classList.add('jump');
    sfx.play('pop');
    if (st) A().speech.play(A().speech.sticker(st), { interrupt: true });
  };

  // Грамота, когда подарок собран: картинка, которую можно распечатать.
  function certificate() {
    const s = S();
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1130;
    const c = canvas.getContext('2d');
    const g = c.createLinearGradient(0, 0, 1600, 1130);
    g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#ffe3ef');
    c.fillStyle = g; c.fillRect(0, 0, 1600, 1130);
    c.strokeStyle = '#ed477f'; c.lineWidth = 18; c.strokeRect(40, 40, 1520, 1050);
    c.strokeStyle = '#ffc83d'; c.lineWidth = 6; c.strokeRect(78, 78, 1444, 974);
    c.textAlign = 'center'; c.fillStyle = '#1d2c59';
    c.font = '900 120px "Trebuchet MS", sans-serif'; c.fillText('ГРАМОТА', 800, 250);
    c.font = '700 54px "Trebuchet MS", sans-serif'; c.fillText('вручается', 800, 350);
    c.fillStyle = '#b82d5e'; c.font = '900 110px "Trebuchet MS", sans-serif'; c.fillText(A().childName(), 800, 490);
    c.fillStyle = '#1d2c59'; c.font = '700 50px "Trebuchet MS", sans-serif';
    c.fillText('за старание на занятиях с язычком', 800, 600);
    const title = s.progress.puzzle.title ? `и собранный подарок «${s.progress.puzzle.title}»` : 'и собранный подарок';
    c.fillText(title, 800, 670);
    c.font = '600 42px "Trebuchet MS", sans-serif'; c.fillStyle = '#66729a';
    c.fillText(`Занятий: ${s.progress.history.length} · сказано слов и звуков: ${s.progress.stats.saidTotal}`, 800, 770);
    c.font = '90px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    c.fillText('🏆 🎁 ⭐', 800, 910);
    c.font = '600 36px "Trebuchet MS", sans-serif'; c.fillStyle = '#1d2c59';
    c.fillText(new Date().toLocaleDateString('ru-RU'), 800, 1010);
    canvas.toBlob(blob => ui.downloadBlob(blob, `gramota-${A().today()}.png`), 'image/png');
  }
  Y.actions.certificate = () => { certificate(); ui.toast('Грамота сохранена в «Загрузки»'); };

  Y.puzzleMarkup = puzzleMarkup;
})(window);

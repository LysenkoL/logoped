// «Звуковые прятки» (найди в картинке-сцене предметы со звуком и назови их)
// и «Голосовая открытка» (стишок голосом Александры — послушать и отправить бабушке).
(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  const { core, ui, sfx, storage } = Y;
  const { esc } = ui;
  Y.games = Y.games || {};
  Y.steps = Y.steps || {};
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};
  const A = () => Y.app;
  const S = () => Y.app.state;

  // ─────────────────────────────────────────────────────────────
  // Звуковые прятки
  // ─────────────────────────────────────────────────────────────
  Y.games.hideSeek = async (stage, step, api) => {
    const { speech } = api;
    const p = step.payload;
    const need = p.items.filter(item => item.answer).length;
    // Раскладываем предметы по сетке 4×3 со случайным сдвигом — каждый раз по-новому, без наложений.
    const cells = core.shuffled(Array.from({ length: 12 }, (_, i) => i), Math.random);
    const deco = p.theme.deco.map(emoji => ({ deco: emoji }));
    const things = [...p.items, ...deco].slice(0, 12);
    const placed = things.map((thing, i) => {
      const cell = cells[i];
      const col = cell % 4; const row = Math.floor(cell / 4);
      const x = col * 25 + 4 + Math.random() * 12;
      const y = row * 33 + 4 + Math.random() * 14;
      const tilt = Math.round(Math.random() * 24 - 12);
      return Object.assign({ x, y, tilt, i }, thing);
    });
    stage.innerHTML = `<div class="g-hide">
      <div class="hide-head">${ui.badge(p.sound, 'big')} <b>${esc(p.theme.name)}</b> <span class="hide-count">Найдено: <b>0</b> из ${need}</span></div>
      <div class="hide-scene theme-${p.theme.id}">${placed.map(t => t.deco
        ? `<span class="hide-deco" style="left:${t.x}%;top:${t.y}%;--tilt:${t.tilt}deg">${t.deco}</span>`
        : `<button class="hide-thing" data-i="${t.i}" style="left:${t.x}%;top:${t.y}%;--tilt:${t.tilt}deg">${ui.pic(t.word, 'pic-md')}</button>`).join('')}</div>
    </div>`;
    const countEl = stage.querySelector('.hide-count b');
    api.setReplay(() => speech.play([speech.line('g.hideSeek'), speech.snd(p.sound)], { interrupt: true }));
    let found = 0;
    while (found < need && api.alive()) {
      const btn = await ui.tapWait(stage, '.hide-thing:not(.found):not(.empty)', api, { replay: () => api.replay() });
      if (!btn || !api.alive()) return {};
      const item = p.items[Number(btn.dataset.i)];
      btn.classList.add('active');
      await api.say(speech.word(item.word), { interrupt: true });
      if (!api.alive()) return {};
      if (item.answer) {
        btn.classList.add('found');
        sfx.play('sparkle');
        await api.say(speech.line('hideFound'), { interrupt: true });
        await api.sayStep({ item: speech.word(item.word), stat: item.word.text, sound: p.sound, silent: true, compact: true, show: `${ui.pic(item.word, 'pic-md')}<b>${esc(item.word.text)}</b>` });
        found += 1;
        countEl.textContent = String(found);
        ui.sparkleAt && ui.sparkleAt(btn);
      } else {
        btn.classList.add('empty');
        sfx.play('soft');
        await api.say(speech.line('hideNo'), { interrupt: true });
      }
      btn.classList.remove('active');
    }
    if (!api.alive()) return {};
    stage.querySelectorAll('.hide-thing:not(.found)').forEach(node => node.classList.add('empty'));
    await api.say(speech.line('hideDone'), { interrupt: true });
    return { stars: 3 };
  };

  // ─────────────────────────────────────────────────────────────
  // Голосовая открытка: стишок по строчке, всё записывается и склеивается в один файл.
  // ─────────────────────────────────────────────────────────────
  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const str = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
    str(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    str(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i += 1) {
      const v = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Склеить записи в один WAV: паузы между строчками, громкость выровнена.
  async function joinRecordings(blobs) {
    const Ctx = root.AudioContext || root.webkitAudioContext;
    const ctx = new Ctx();
    try {
      const rate = ctx.sampleRate;
      const pieces = [];
      for (const blob of blobs) {
        try {
          const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
          pieces.push(new Float32Array(buffer.getChannelData(0)));
        } catch (error) {}
      }
      if (!pieces.length) return null;
      const gap = new Float32Array(Math.round(rate * 0.35));
      const total = pieces.reduce((sum, piece) => sum + piece.length + gap.length, gap.length);
      const out = new Float32Array(total);
      let offset = gap.length;
      for (const piece of pieces) { out.set(piece, offset); offset += piece.length + gap.length; }
      let peak = 0;
      for (let i = 0; i < out.length; i += 1) peak = Math.max(peak, Math.abs(out[i]));
      if (peak > 0.01) { const k = 0.9 / peak; for (let i = 0; i < out.length; i += 1) out[i] *= k; }
      return encodeWav(out, rate);
    } finally { ctx.close().catch(() => {}); }
  }

  // «от Александры»: родительный падеж для обычных имён на -а/-я.
  function genitive(name) {
    const n = String(name || '').trim();
    if (/[гкхжшчщ]а$/i.test(n)) return n.slice(0, -1) + 'и';
    if (/а$/i.test(n)) return n.slice(0, -1) + 'ы';
    if (/я$/i.test(n)) return n.slice(0, -1) + 'и';
    return n;
  }
  Y.genitive = genitive;

  async function savePostcard(blob, title) {
    const createdAt = Date.now();
    await storage.putBlob('assets', `postcard:${createdAt}`, blob, { kind: 'postcard', title, createdAt });
    // Храним 10 последних открыток.
    const all = (await storage.listBlobs('assets').catch(() => [])).filter(item => item.meta && item.meta.kind === 'postcard')
      .sort((a, b) => (b.meta.createdAt || 0) - (a.meta.createdAt || 0));
    for (const old of all.slice(10)) await storage.deleteBlob('assets', old.id).catch(() => {});
  }

  function playBlob(blob, api) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const done = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onended = done; audio.onerror = done;
      audio.play().catch(done);
      if (api) api.cleanup(() => { try { audio.pause(); } catch (error) {} done(); });
    });
  }

  Y.steps.postcard = async (stage, step, api) => {
    const { speech } = api;
    const poem = data.POEMS.find(item => item.id === step.poemId) || data.POEMS[0];
    stage.innerHTML = `<div class="g-postcard">
      <div class="pc-envelope">💌</div>
      <h2>Открытка: ${esc(poem.emoji)} ${esc(poem.title)}</h2>
      <ol class="pc-lines"><li class="pc-who">Кому открытка?</li>${poem.lines.map(line => `<li>${esc(line)}</li>`).join('')}</ol>
      <div class="pc-rec">🔴 запись</div>
    </div>`;
    const items = Array.from(stage.querySelectorAll('.pc-lines li'));
    const blobs = [];
    await api.say(speech.line('postcardIntro'), { interrupt: true });
    items[0].classList.add('now');
    const who = await api.sayStep({ stat: '', sound: poem.sound || 'с', record: true, silent: true, compact: true, maxMs: 4000, label: 'Сказала ✓' });
    if (!api.alive()) return {};
    if (who.heard && who.blob) blobs.push(who.blob);
    items[0].classList.remove('now'); items[0].classList.add('ok');
    await api.say(speech.line('postcardLines'), { interrupt: true });
    for (let i = 0; i < poem.lines.length; i += 1) {
      if (!api.alive()) return {};
      const li = items[i + 1];
      li.classList.add('now');
      const res = await api.sayStep({ item: { key: `po:${poem.id}:${i}`, text: poem.lines[i] }, stat: '', sound: poem.sound || 'с', record: true, maxMs: 7500, endSilenceMs: 800, minMs: 300, compact: true, label: 'Повторила ✓' });
      if (!api.alive()) return {};
      if (res.heard && res.blob) blobs.push(res.blob);
      li.classList.remove('now'); li.classList.add('ok');
    }
    stage.querySelector('.pc-rec').textContent = '⏳ склеиваю открытку…';
    const card = await joinRecordings(blobs);
    if (!card || !api.alive()) return {};
    const title = `${poem.title} — от ${genitive(A().childName())}`;
    await savePostcard(card, title);
    stage.querySelector('.pc-rec').textContent = '✅ открытка сохранена';
    stage.querySelector('.pc-envelope').classList.add('ready');
    sfx.play('fanfare');
    ui.confetti(30);
    await api.say(speech.line('postcardDone'), { interrupt: true });
    await playBlob(card, api);
    return { stars: 2 };
  };

  Y.actions['postcard-new'] = btn => {
    A().startMini([{ kind: 'postcard', poemId: btn.dataset.id }], 'fun');
  };

  // Список открыток на экране «Стишки и загадки»: послушать, сохранить файл, удалить.
  Y.postcardsMarkup = () => `<section class="card postcards"><h3>💌 Голосовая открытка</h3>
    <p class="muted">Выбери стишок — повторяй по строчке, а приложение запишет твой голос. Получится открытка, которую можно отправить бабушке и дедушке.</p>
    <div class="chips">${data.POEMS.map(poem => `<button class="chip" data-action="postcard-new" data-id="${poem.id}">${poem.emoji} ${esc(poem.title)}</button>`).join('')}</div>
    <div class="pc-list" id="pc-list"></div></section>`;

  Y.refreshPostcards = async () => {
    const box = document.getElementById('pc-list');
    if (!box) return;
    const all = (await storage.listBlobs('assets').catch(() => [])).filter(item => item.meta && item.meta.kind === 'postcard')
      .sort((a, b) => (b.meta.createdAt || 0) - (a.meta.createdAt || 0));
    if (!all.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<h4>Мои открытки</h4>${all.map(item => `<div class="pc-item">
      <span>💌</span><div class="grow"><b>${esc(item.meta.title || 'Открытка')}</b><small class="muted">${new Date(item.meta.createdAt).toLocaleDateString('ru-RU')}</small></div>
      <button class="mini" data-action="postcard-play" data-id="${esc(item.id)}" aria-label="Послушать">▶</button>
      <button class="mini" data-action="postcard-save" data-id="${esc(item.id)}" aria-label="Сохранить файл">💾</button>
      <button class="mini" data-action="postcard-del" data-id="${esc(item.id)}" aria-label="Удалить">✕</button></div>`).join('')}`;
  };

  async function postcardBlob(id) {
    const record = await storage.getBlob('assets', id).catch(() => null);
    return record && record.blob ? record : null;
  }
  Y.actions['postcard-play'] = async btn => { const r = await postcardBlob(btn.dataset.id); if (r) { A().speech.stop(); playBlob(r.blob); } };
  Y.actions['postcard-save'] = async btn => {
    const r = await postcardBlob(btn.dataset.id);
    if (!r) return;
    const title = (r.meta && r.meta.title) || 'Открытка';
    ui.downloadBlob(r.blob, `Открытка ${title}.wav`.replace(/[\\/:*?"<>|]/g, ''));
    ui.toast('Файл сохранён в «Загрузки» — его можно отправить в мессенджере');
  };
  Y.actions['postcard-del'] = async btn => {
    const ok = await ui.confirmBox('Удалить эту открытку?', 'Удалить', 'Оставить');
    if (!ok) return;
    await storage.deleteBlob('assets', btn.dataset.id).catch(() => {});
    Y.refreshPostcards();
  };
})(window);

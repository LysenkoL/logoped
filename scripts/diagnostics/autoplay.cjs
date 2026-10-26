// Автопрогон приложения в Chromium с «фейковым» микрофоном.
// Запуск: node scripts/diagnostics/autoplay.cjs [out-dir]
// Нужен Playwright (npm i -g playwright). Для разработчика, не для ребёнка.
const path = require('node:path');
const fs = require('node:fs');
let playwright;
try { playwright = require('playwright'); } catch (error) {
  playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright'));
}

const root = path.resolve(__dirname, '..', '..');
const outDir = path.resolve(process.argv[2] || path.join(root, '..', 'shots'));
const fakeMic = process.env.FAKE_MIC || path.join(__dirname, 'fake-mic.wav');
fs.mkdirSync(outDir, { recursive: true });

const DRIVER = () => {
  const Y = window.Yazychok;
  window.__log = [];
  window.__listen = { mic: 0, button: 0, manual: 0, timeout: 0, nomic: 0, cancel: 0 };
  const origListen = Y.mic.listen;
  Y.mic.listen = opts => {
    const handle = origListen(opts);
    handle.promise.then(res => { window.__listen[res.how] = (window.__listen[res.how] || 0) + 1; });
    return handle;
  };
  let last = 0; let stepSeen = -1; let stepAt = 0; let sayAt = 0;
  const q = s => document.querySelector(s);
  const click = el => { if (el) { el.click(); last = Date.now(); return true; } return false; };
  setInterval(() => {
    const s = Y.app.session();
    if (!s) return;
    if (s.index !== stepSeen || s !== window.__lastSession) { stepSeen = s.index; stepAt = Date.now(); window.__lastSession = s; }
    const step = s.steps[s.index];
    if (!step) return;
    const since = Date.now() - stepAt;
    const say = q('.say-panel.listening .say-done');
    if (say) {
      if (!sayAt) sayAt = Date.now();
      if (Date.now() - sayAt > 3500) { sayAt = 0; click(say); }
      return;
    }
    sayAt = 0;
    if (q('.praise-overlay') || q('.splash')) return;
    const choice = q('.choice-card:not(.picked)');
    if (choice && !q('.choice-card.picked')) { if (since > 1500) click(document.querySelectorAll('.choice-card')[Math.floor(Math.random() * 2)]); return; }
    if (Date.now() - last < (window.__realistic ? 1800 : 700)) return;
    const kind = step.kind === 'game' ? step.game : step.kind;
    const p = step.payload || {};
    const stageText = sel => (q(sel) ? q(sel).textContent.trim() : '');
    switch (kind) {
      case 'school': {
        // Школа: отвечаем правильно (иногда сначала ошибаемся), в «Отличиях» нажимаем на все отличия.
        const fin = q('.sc-final [data-sc="next"]');
        if (fin) { click(fin); break; }
        if (since < 1500 || !q('.sc')) break;
        const t = step.task;
        if (step.type === 'diff') {
          const pic = q('.sc-diffpic[data-side="right"]');
          if (!pic) break;
          const r = pic.getBoundingClientRect();
          const d = t.diffs[Math.floor(Math.random() * t.diffs.length)];
          pic.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + d.x * r.width, clientY: r.top + d.y * r.height }));
          last = Date.now();
          break;
        }
        let right = t.answer;
        if (t.kind === 'more') right = t.answer === 'left' ? 0 : 1;
        else if (['math', 'count'].includes(step.type) || (step.type === 'pattern' && t.kind === 'numbers') || (step.type === 'syll' && t.kind === 'count')) right = t.options.indexOf(t.answer);
        const wrong = document.querySelector(`.sc-opt:not(.gone):not([data-i="${right}"])`);
        if (wrong && Math.random() < 0.25) click(wrong); else click(q(`.sc-opt[data-i="${right}"]`));
        break;
      }
      case 'gym': {
        const opts = document.querySelectorAll('.quiz-opt:not(.gone)');
        if (opts.length) { if (since > 1500) { click(opts[Math.floor(Math.random() * opts.length)]); window.__log.push('gym-quiz'); } break; }
        if (!window.__realistic && since > 2500) click(q('[data-gym="skip"]'));
        break;
      }
      case 'position': click(q('[data-pos="next"]')); break;
      case 'mic': if (since > 25000) { Y.mic.holdManual(!window.__micHeld); window.__micHeld = !window.__micHeld; if (window.__log[window.__log.length - 1] !== 'mic-manual') window.__log.push('mic-manual'); } break;
      case 'soundCheck': {
        const word = stageText('.card-slot .word-card b');
        const item = p.items.find(i => i.word.text === word);
        if (item) click(q(`[data-v="${item.answer ? 1 : 0}"]`));
        break;
      }
      case 'memoryPairs': {
        const open = [...document.querySelectorAll('.memory-card.open:not(.matched)')];
        const closed = [...document.querySelectorAll('.memory-card:not(.open):not(.matched)')];
        if (open.length === 1) click(closed.find(c => c.dataset.pair === open[0].dataset.pair));
        else if (!open.length) click(closed[0]);
        break;
      }
      case 'groupSort': {
        const word = stageText('.card-slot .word-card b');
        const item = p.items.find(i => i.word.text === word);
        if (item) click(q(`.house-btn[data-g="${item.group}"]`));
        break;
      }
      case 'finishPhrase': {
        const text = stageText('.phrase-text');
        const phrase = p.phrases.find(ph => text.startsWith(ph.prompt));
        if (phrase && q('.option')) click(q(`.option[data-i="${phrase.options.findIndex(o => o.correct)}"]`));
        break;
      }
      case 'conveyor': case 'balloons': {
        const targets = new Set(p.items.filter(i => i.answer).map(i => i.word.text));
        const node = [...document.querySelectorAll('.belt-item:not(.hit), .balloon-item:not(.hit)')].find(n => targets.has(n.querySelector('b').textContent));
        if (node) { const r = node.getBoundingClientRect(); if (r.left > 0 && r.left < innerWidth - 100 && r.top > 0) click(node); }
        break;
      }
      case 'soundPosition': {
        const word = stageText('.card-slot .word-card b');
        const item = p.items.find(i => i.word.text === word);
        if (item) click(q(`.wagon[data-pos="${item.position}"]`));
        break;
      }
      case 'syllableBuilder': {
        const done = document.querySelectorAll('.g-dots i.on').length;
        const item = p.items[done];
        const filled = document.querySelectorAll('.build-line .slot.filled').length;
        const piece = item && item.pieces.find(x => x.order === filled);
        if (piece) click(q(`.piece[data-id="${piece.id}"]:not(:disabled)`));
        break;
      }
      case 'whackMole': {
        if (q('.hole.up[data-answer="1"]:not(.bonked):not(.sad)')) click(q('.hole.up[data-answer="1"] .mole-pop'));
        else if (q('.hole.up[data-answer="0"]:not(.giggle):not(.sad)')) click(q('.mole-no'));
        break;
      }
      case 'feedPet': if (!q('.say-panel')) click(q('.feed-card:not(.eaten)')); break;
      case 'wheel': { const b = q('.spin'); if (b && !b.disabled) click(b); break; }
      case 'boxes': if (!q('.modal-back')) click(q('.gift-box:not(.opened)')); break;
      case 'whatsMissing': {
        const gone = stageText('.missing-cell.gone b');
        if (gone && q('.missing-options .option')) click([...document.querySelectorAll('.missing-options .option')].find(o => o.dataset.t === gone));
        break;
      }
      case 'pictureReveal': {
        if (q('.reveal-options .option')) click(q(`.reveal-options .option[data-t="${p.target.text}"]`));
        else if (!q('.tile-cover.active')) click(q('.tile-cover:not(.open)'));
        break;
      }
      case 'fun': {
        if (step.type === 'riddle') {
          const text = stageText('.riddle-card p');
          const r = step.riddles.find(x => x.text === text);
          if (r && r.mode === 'build') {
            const filled = document.querySelectorAll('.build-line .slot.filled').length;
            const tile = [...document.querySelectorAll('.syl-tile:not(:disabled)')].find(t => r.tiles[Number(t.dataset.i)].order === filled);
            if (tile) click(tile);
          } else if (r) click([...document.querySelectorAll('.option')].find(o => o.dataset.t === r.answer));
        }
        break;
      }
      case 'story': {
        const opts = [...document.querySelectorAll('.sp-option:not(.ok)')];
        if (opts.length && !q('.sp-option.ok')) click(opts[Math.floor(Math.random() * opts.length)]);
        else if (since > 8000) click(q('.sp-done'));
        break;
      }
      case 'hideSeek': {
        const btn = [...document.querySelectorAll('.hide-thing:not(.found):not(.empty)')].find(n => p.items[Number(n.dataset.i)].answer);
        if (btn && !q('.say-panel')) click(btn);
        break;
      }
      case 'heroOops': {
        const i = document.querySelectorAll('.g-dots i.on').length;
        const round = p.rounds && p.rounds[i];
        const btn = round && q(`.judge[data-v="${round.wrong ? 'no' : 'yes'}"]:not(:disabled)`);
        if (btn) click(btn);
        break;
      }
      case 'heroHide': {
        // Нажимаем на непроверенную картинку (сначала мимо, потом найдём).
        if (q('.say-panel')) break;
        const spots = [...document.querySelectorAll('.hide-spot:not(.checked):not(:disabled)')];
        if (spots.length) click(spots[Math.floor(Math.random() * spots.length)]);
        break;
      }
      case 'heroPairs': {
        const i = document.querySelectorAll('.g-dots i.on').length;
        const round = p.rounds && p.rounds[i];
        const card = round && q(`.pair-card[data-k="${Math.random() < 0.8 ? round.say : (round.say === 'a' ? 'b' : 'a')}"]:not(:disabled)`);
        if (card) click(card);
        break;
      }
      case 'heroEcho': {
        const judge = q(`.judge[data-v="${Math.random() < 0.3 ? 'again' : 'good'}"]`);
        if (judge) click(judge);
        break;
      }
      case 'heroBackpack': {
        if (q('.say-panel')) break;
        const items = [...document.querySelectorAll('.pack-item:not(.done):not(.gone)')];
        const pick = items.find(n => p.items[Number(n.dataset.i)].answer === (Math.random() < 0.8));
        if (pick) click(pick); else if (items[0]) click(items[0]);
        break;
      }
      default: break;
    }
  }, 250);
};

(async () => {
  const errors = [];
  const browser = await playwright.chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fakeMic}`,
      '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files']
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}\n${e.stack}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('crash', () => { console.log('PAGE CRASHED'); });
  browser.on('disconnected', () => { console.log('BROWSER DISCONNECTED'); });
  await page.addInitScript(() => {
    if (window.speechSynthesis) window.speechSynthesis.speak = u => setTimeout(() => u.onend && u.onend(), 40);
  });
  const url = 'file://' + path.join(root, 'index.html');
  const shot = async name => page.screenshot({ path: path.join(outDir, `${name}.png`) });
  const mode = process.env.MODE || 'all';

  await page.goto(url);
  await page.waitForTimeout(800);
  if (await page.$('#setup-name')) {
    await shot('00-setup');
    await page.fill('#setup-name', 'Александра');
    await page.click('[data-action="save-name"]');
  }
  await page.waitForTimeout(500);
  await shot('01-home');

  if (mode === 'all' || mode === 'session') {
    await page.evaluate(DRIVER);
    if (process.env.REALISTIC) await page.evaluate(() => { window.__realistic = true; });
    if (process.env.THEME) {
      await page.evaluate(theme => {
        const core = window.Yazychok.core; const orig = core.buildSession;
        core.buildSession = (state, date, rng, opts) => orig(state, date, rng, Object.assign({}, opts, { theme }));
      }, process.env.THEME);
    }
    await page.click('[data-action="start"]');
    const seen = new Set();
    const started = Date.now();
    while (Date.now() - started < 9 * 60 * 1000) {
      await page.waitForTimeout(700);
      const info = await page.evaluate(() => {
        const s = window.Yazychok.app.session();
        const screen = document.getElementById('app').dataset.screen;
        if (!s) return { screen };
        const st = s.steps[s.index];
        return { screen, index: s.index, kind: st ? (st.kind === 'game' ? st.game : st.kind === 'fun' ? `fun-${st.type}` : st.kind) : null, total: s.steps.length };
      });
      if (info.screen === 'finish') break;
      if (info.kind) {
        const key = `${info.index}-${info.kind}`;
        const hasContent = await page.evaluate(() => !document.querySelector('.splash') && !document.querySelector('.praise-overlay'));
        if (!seen.has(key) && hasContent) {
          await page.waitForTimeout(1200);
          seen.add(key);
          await shot(`s-${String(info.index).padStart(2, '0')}-${info.kind}`);
          console.log('step', info.index, '/', info.total, info.kind, `${Math.round((Date.now() - started) / 1000)}s`);
        }
      }
    }
    await page.waitForTimeout(1500);
    await shot('s-99-finish');
    if (await page.$('.sticker-flip')) {
      await page.waitForTimeout(3000);
      await page.click('.sticker-flip');
      await page.waitForTimeout(1500);
      await shot('s-99-finish-sticker');
    }
    if (await page.$('.story-new')) {
      await page.evaluate(() => document.querySelector('.story-new').click());
      await page.waitForTimeout(2500);
      await shot('s-99-chapter');
      const heard = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 22000)); return window.Yazychok.app.state.progress.story.heard; });
      await shot('s-99-chapter-end');
      console.log('chapter heard', heard);
      await page.evaluate(() => window.Yazychok.app.go('home'));
      await page.waitForTimeout(900);
      await shot('s-99-home-after');
    }
    console.log('session seconds', Math.round((Date.now() - started) / 1000));
    console.log('listen stats', JSON.stringify(await page.evaluate(() => window.__listen)), JSON.stringify(await page.evaluate(() => window.__log)));
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('yazychok-v2')));
    console.log('pieces', state.progress.puzzle.pieces, 'stars', state.progress.stars, 'said', state.progress.stats.saidTotal, 'history', state.progress.history.length);
  }

  if (mode === 'all' || mode === 'games') {
    await page.goto(url);
    await page.waitForTimeout(600);
    await page.evaluate(DRIVER);
    const games = process.env.GAMES ? process.env.GAMES.split(',') : await page.evaluate(() => window.Yazychok.core.GAME_TYPES);
    for (const game of games) {
      const t0 = Date.now();
      await page.evaluate(g => {
        const Y = window.Yazychok; const s = Y.app.state;
        const sound = g === 'finishPhrase' || g === 'repeatPhrase' ? 'ц' : 'с';
        if (g === 'finishPhrase' || g === 'repeatPhrase') s.settings.levels['ц'] = 3;
        const payload = Y.core.gamePayload(s, g, sound, Math.random, []);
        Y.app.startMini([{ kind: 'game', game: g, sound, payload }]);
      }, game);
      let shotDone = false;
      while (Date.now() - t0 < 150000) {
        await page.waitForTimeout(600);
        const screen = await page.evaluate(() => document.getElementById('app').dataset.screen);
        if (screen !== 'session') break;
        if (!shotDone && await page.evaluate(() => !document.querySelector('.splash'))) { await page.waitForTimeout(1500); await shot(`g-${game}`); shotDone = true; }
      }
      const ok = await page.evaluate(() => document.getElementById('app').dataset.screen !== 'session');
      console.log('game', game, ok ? 'OK' : 'TIMEOUT', `${Math.round((Date.now() - t0) / 1000)}s`);
      if (!ok) { await shot(`g-${game}-timeout`); await page.evaluate(() => window.Yazychok.app.go('home')); }
    }
    const micSounds = process.env.MICS === 'none' ? [] : (process.env.MICS ? process.env.MICS.split(',') : ['с', 'з', 'ц', 'ш', 'ж', 'ч', 'щ', 'л', 'р']);
    for (const sound of micSounds) {
      const t0 = Date.now();
      await page.evaluate(snd => {
        const Y = window.Yazychok;
        Y.app.startMini([{ kind: 'mic', sound: snd, game: window.YazychokData.SOUNDS[snd].micGame }]);
      }, sound);
      let shotDone = false;
      while (Date.now() - t0 < 60000) {
        await page.waitForTimeout(600);
        if (await page.evaluate(() => document.getElementById('app').dataset.screen) !== 'session') break;
        if (!shotDone && await page.evaluate(() => !document.querySelector('.splash'))) { await page.waitForTimeout(2500); await shot(`m-${sound}`); shotDone = true; }
      }
      const ok = await page.evaluate(() => document.getElementById('app').dataset.screen !== 'session');
      console.log('mic', sound, ok ? 'OK' : 'TIMEOUT', `${Math.round((Date.now() - t0) / 1000)}s`, JSON.stringify(await page.evaluate(() => window.__log.slice(-1))));
      if (!ok) await page.evaluate(() => window.Yazychok.app.go('home'));
      await page.evaluate(() => window.Yazychok.mic.holdManual(false));
    }
    for (const type of (process.env.MICS === 'none' ? [] : ['poem', 'riddle'])) {
      const t0 = Date.now();
      await page.evaluate(tp => window.Yazychok.actions[tp === 'poem' ? 'fun-poem' : 'fun-riddles']({ dataset: { id: window.YazychokData.POEMS[0].id } }), type);
      let shotDone = false;
      while (Date.now() - t0 < 90000) {
        await page.waitForTimeout(600);
        if (await page.evaluate(() => document.getElementById('app').dataset.screen) !== 'session') break;
        if (!shotDone && await page.evaluate(() => !document.querySelector('.splash'))) { await page.waitForTimeout(1500); await shot(`f-${type}`); shotDone = true; }
      }
      console.log('fun', type, `${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }

  if (mode === 'extra') {
    await page.goto(url);
    await page.waitForTimeout(600);
    await page.evaluate(DRIVER);
    const runMini = async (name, steps, limit) => {
      const t0 = Date.now();
      await page.evaluate(st => window.Yazychok.app.startMini(st, 'home'), steps);
      let shots = 0;
      while (Date.now() - t0 < limit) {
        await page.waitForTimeout(700);
        if (await page.evaluate(() => document.getElementById('app').dataset.screen) !== 'session') break;
        if (Date.now() - t0 > 6000 + shots * 15000 && shots < 4) { await shot(`e-${name}-${shots}`); shots += 1; }
      }
      const ok = await page.evaluate(() => document.getElementById('app').dataset.screen !== 'session');
      console.log(name, ok ? 'OK' : 'TIMEOUT', `${Math.round((Date.now() - t0) / 1000)}s`);
      if (!ok) await page.evaluate(() => window.Yazychok.app.go('home'));
    };
    await runMini('story-st02', [{ kind: 'story', id: 'st02' }], 200000);
    await runMini('story-st01', [{ kind: 'story', id: 'st01' }], 200000);
    await runMini('postcard', [{ kind: 'postcard', poemId: 'p-sharik' }], 200000);
    const heard = await page.evaluate(() => window.Yazychok.app.state.progress.story.heard);
    console.log('story heard', heard);
    // Возврат к прошлому шагу: два шага, на втором жмём «назад» — первый должен начаться снова.
    await page.evaluate(() => window.Yazychok.app.startMini([{ kind: 'breath', breaths: 1 }, { kind: 'breath', breaths: 1 }], 'home'));
    await page.waitForTimeout(500);
    let seenBack = false;
    for (let i = 0; i < 60; i += 1) {
      await page.waitForTimeout(500);
      const idx = await page.evaluate(() => { const s = window.Yazychok.app.session(); return s ? s.index : -1; });
      if (idx === 1 && !seenBack) { await page.keyboard.press('4'); seenBack = true; await page.waitForTimeout(400); const after = await page.evaluate(() => window.Yazychok.app.session().index); console.log('back step: index after 4 =', after); }
      if (idx === -1) break;
    }
    await page.evaluate(() => window.Yazychok.app.go('fun'));
    await page.waitForTimeout(1200);
    await shot('e-fun-postcards');
    await page.evaluate(() => window.Yazychok.app.go('book'));
    await page.waitForTimeout(800);
    await shot('e-book-map');
  }

  if (mode === 'all' || mode === 'school') {
    await page.goto(url);
    await page.waitForTimeout(600);
    await page.evaluate(DRIVER);
    for (const lang of (process.env.LANGS || 'de,ru').split(',')) {
      await page.evaluate(lg => { const Y = window.Yazychok; Y.app.state.settings.schoolLang = lg; Y.app.save(); Y.app.go('school'); }, lang);
      await page.waitForTimeout(500);
      await shot(`sc-${lang}-screen`);
      const types = (process.env.TYPES || 'lesson,math,count,diff,syll,puzzle,pattern,odd,shadow').split(',');
      for (const type of types) {
        const t0 = Date.now();
        if (type === 'lesson') await page.click('[data-action="school-lesson"]'); else await page.click(`[data-action="school-set"][data-type="${type}"]`);
        let shotTaken = false;
        while (Date.now() - t0 < 240000) {
          await page.waitForTimeout(600);
          if (!shotTaken && Date.now() - t0 > 2500) { await shot(`sc-${lang}-${type}`); shotTaken = true; }
          if (await page.evaluate(() => document.getElementById('app').dataset.screen) !== 'session') break;
        }
        const res = await page.evaluate(() => ({ screen: document.getElementById('app').dataset.screen, levels: JSON.stringify(window.Yazychok.app.state.progress.school.levels), stars: window.Yazychok.app.state.progress.school.stars.n }));
        console.log('school', lang, type, res.screen === 'school' ? 'OK' : `STUCK(${res.screen})`, `${Math.round((Date.now() - t0) / 1000)}s`, 'stars today', res.stars);
        if (res.screen !== 'school') await page.evaluate(() => window.Yazychok.app.go('school'));
      }
      console.log('levels', await page.evaluate(() => JSON.stringify(window.Yazychok.app.state.progress.school.levels)));
    }
  }

  if (mode === 'all' || mode === 'screens') {
    await page.goto(url);
    await page.waitForTimeout(500);
    const go = async (screen, name) => { await page.evaluate(s => window.Yazychok.app.go(s), screen); await page.waitForTimeout(700); await shot(name); };
    await go('pet', 'x-pet-egg');
    for (let i = 0; i < 3; i += 1) { await page.click('[data-action="egg-tap"]').catch(() => {}); await page.waitForTimeout(250); }
    await page.waitForTimeout(800);
    await shot('x-pet-room');
    await page.evaluate(() => { const Y = window.Yazychok; Y.app.state.progress.stars += 300; Y.app.state.progress.pendingChests += 1; Y.app.save(); });
    await go('shop', 'x-shop');
    await page.click('[data-action="buy"]').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('[data-action="shop-tab"][data-tab="wear"]');
    await page.click('[data-action="buy"]').catch(() => {});
    await page.waitForTimeout(400);
    await shot('x-shop-wear');
    await go('pet', 'x-pet-dressed');
    await go('chest', 'x-chest');
    for (let i = 0; i < 3; i += 1) { await page.click('[data-action="chest-tap"]').catch(() => {}); await page.waitForTimeout(250); }
    await page.waitForTimeout(700);
    await shot('x-chest-open');
    await page.evaluate(() => {
      const Y = window.Yazychok; const st = Y.app.state;
      let s2 = st;
      for (let d = 1; d <= 9; d += 1) s2 = Y.core.completeSession(s2, { stars: 3, soundsList: ['с'] }, `2026-08-${String(d).padStart(2, '0')}`).state;
      s2.progress.story.heard = 7;
      Y.app.state = s2; Y.app.save();
    });
    await go('album', 'x-album');
    await go('book', 'x-book');
    await page.evaluate(() => window.Yazychok.app.go('chapter', { id: 'st05' }));
    await page.waitForTimeout(1200);
    await shot('x-chapter');
    await go('home', 'x-home-progress');
    await go('pet', 'x-pet-grown');
    await go('awards', 'x-awards');
    await go('puzzle', 'x-puzzle');
    await go('fun', 'x-fun');
    await go('home', 'x-home2');
    await page.click('[data-action="parent-lock"]');
    await page.waitForTimeout(300);
    const answer = await page.evaluate(() => { const t = document.querySelector('.math').textContent; const [a, b] = t.match(/\d+/g).map(Number); return a + b; });
    await page.fill('#lock-answer', String(answer));
    await page.click('[data-action="unlock"]');
    await page.waitForTimeout(500);
    await shot('p-parent');
    await page.screenshot({ path: path.join(outDir, 'p-parent-full.png'), fullPage: true });
    for (const s of ['sounds', 'exercises', 'voice', 'stats', 'childrec']) {
      await page.evaluate(x => window.Yazychok.app.go(x), s);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(outDir, `p-${s}.png`), fullPage: true });
    }
    const report = await page.evaluate(() => window.Yazychok.report.buildTherapistReport(window.Yazychok.app.state, { data: window.YazychokData, today: '2026-09-23' }));
    fs.writeFileSync(path.join(outDir, 'report.txt'), report);
    await context.close();
    const narrow = await browser.newContext({ viewport: { width: 420, height: 860 } });
    const np = await narrow.newPage();
    np.on('pageerror', e => errors.push(`pageerror(narrow): ${e.message}`));
    await np.goto(url);
    await np.waitForTimeout(600);
    await np.screenshot({ path: path.join(outDir, 'n-home.png'), fullPage: true });
  }

  await browser.close();
  console.log(errors.length ? `ERRORS (${errors.length}):\n${[...new Set(errors)].slice(0, 30).join('\n')}` : 'NO ERRORS');
})().catch(error => { console.error(error); process.exit(1); });

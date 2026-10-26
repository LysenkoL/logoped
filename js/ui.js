(function (root) {
  'use strict';
  const Y = root.Yazychok = root.Yazychok || {};
  const data = root.YazychokData;

  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }

  const pick = items => items[Math.floor(Math.random() * items.length)];
  const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function soundColor(sound) { return (data.SOUNDS[sound] && data.SOUNDS[sound].color) || '#ed477f'; }
  function soundLabel(sound) { return (data.SOUNDS[sound] && data.SOUNDS[sound].label) || String(sound || '').toUpperCase(); }
  function badge(sound, extra) {
    return `<span class="sound-chip ${extra || ''}" style="--c:${soundColor(sound)}">${esc(soundLabel(sound))}</span>`;
  }

  let toastTimer = null;
  function toast(text, kind) {
    document.querySelector('.toast')?.remove();
    const node = el(`<div class="toast ${kind || ''}">${esc(text)}</div>`);
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.remove(), kind === 'mom' ? 1400 : 2800);
  }

  function confetti(count, origin) {
    if (reduced()) return;
    const holder = el('<div class="confetti" aria-hidden="true"></div>');
    for (let i = 0; i < (count || 30); i += 1) {
      const bit = document.createElement('i');
      bit.textContent = pick(['★', '●', '◆', '♥', '✦']);
      bit.style.left = origin ? `${origin.x + (Math.random() - 0.5) * 30}%` : `${Math.random() * 100}%`;
      bit.style.color = pick(['#ed477f', '#ffc83d', '#1da66e', '#8b5cd6', '#2f7be5', '#ff8a3d']);
      bit.style.fontSize = `${12 + Math.random() * 20}px`;
      bit.style.animationDelay = `${Math.random() * 0.6}s`;
      bit.style.animationDuration = `${2 + Math.random() * 1.4}s`;
      holder.appendChild(bit);
    }
    document.body.appendChild(holder);
    setTimeout(() => holder.remove(), 3800);
  }

  // Звёздочка летит от элемента к счётчику.
  function flyStar(fromEl, count) {
    const target = document.querySelector('[data-star-pill]');
    if (!fromEl || !target || reduced()) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    for (let i = 0; i < Math.min(count || 1, 5); i += 1) {
      const star = el('<span class="fly-star">⭐</span>');
      star.style.left = `${a.left + a.width / 2}px`;
      star.style.top = `${a.top + a.height / 2}px`;
      document.body.appendChild(star);
      requestAnimationFrame(() => {
        star.style.transitionDelay = `${i * 0.08}s`;
        star.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.6)`;
        star.style.opacity = '0.2';
      });
      setTimeout(() => star.remove(), 1100 + i * 80);
    }
  }

  function sparkleAt(node) {
    if (!node || reduced()) return;
    const r = node.getBoundingClientRect();
    for (let i = 0; i < 8; i += 1) {
      const s = el('<span class="spark">✦</span>');
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      const angle = (i / 8) * Math.PI * 2;
      s.style.setProperty('--dx', `${Math.cos(angle) * 70}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * 70}px`);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }

  function shake(node) {
    if (!node) return;
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
    setTimeout(() => node.classList.remove('shake'), 600);
  }

  // Модальное окно внутри приложения (без системных диалогов).
  function modal(html, options) {
    const opts = options || {};
    const node = el(`<div class="modal-back"><div class="modal ${opts.className || ''}">${html}</div></div>`);
    document.body.appendChild(node);
    const close = () => node.remove();
    if (opts.dismissible !== false) node.addEventListener('click', event => { if (event.target === node) close(); });
    return { node, close };
  }

  // autoNoMs — если никто не ответил, окно само закрывается ответом «нет» (ребёнок случайно нажал ✕ — занятие идёт дальше).
  function confirmBox(text, okText, cancelText, autoNoMs) {
    return new Promise(resolve => {
      const m = modal(`<p class="modal-text">${esc(text)}</p><div class="row gap"><button class="btn secondary" data-no>${esc(cancelText || 'Отмена')}${autoNoMs ? '<i class="auto-bar"></i>' : ''}</button><button class="btn" data-yes>${esc(okText || 'Да')}</button></div>`, { dismissible: false });
      let timer = null;
      const done = value => { clearTimeout(timer); m.close(); resolve(value); };
      if (autoNoMs) {
        const bar = m.node.querySelector('.auto-bar');
        if (bar) bar.style.animationDuration = `${autoNoMs}ms`;
        timer = setTimeout(() => done(false), autoNoMs);
      }
      m.node.querySelector('[data-yes]').onclick = () => done(true);
      m.node.querySelector('[data-no]').onclick = () => done(false);
    });
  }

  // Ждём нажатия ребёнка спокойно. Два режима:
  //  • выбор (по умолчанию: картинки, ответы) — ребёнок думает сколько нужно, ничего не дёргается.
  //    Через 25 с без нажатия задание тихо звучит ещё раз; через ~55 с — мягкая подсказка голосом и лёгкое свечение. Всё.
  //  • действие (auto: true — крутить колесо, открыть коробку): через 10 с кнопка мягко светится,
  //    ещё через 10 с игра нажимает сама — чтобы экран не стоял.
  // Возвращает нажатый элемент или null, если шаг закончился.
  function tapWait(scope, selector, api, options) {
    const action = Boolean(options && options.auto);
    const o = Object.assign(action
      ? { hintMs: 10000, autoMs: 10000, line: 'tapHint' }
      : { hintMs: 25000, everyMs: 30000, line: 'choiceHint' }, { replay: null }, options || {});
    return new Promise(resolve => {
      let timer = null; let hints = 0; let finished = false;
      const eligible = () => Array.from(scope.querySelectorAll(selector)).filter(n => !n.disabled && n.getClientRects().length);
      const unmark = () => scope.querySelectorAll('.tap-hint').forEach(n => n.classList.remove('tap-hint'));
      const handler = event => {
        const target = event.target.closest(selector);
        if (!target || !scope.contains(target) || target.disabled) return;
        done(target);
      };
      function done(value) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        scope.removeEventListener('click', handler);
        unmark();
        resolve(value);
      }
      const speaking = () => { try { return Boolean(api.speech && api.speech.isPlaying()); } catch (error) { return false; } };
      const glow = list => { unmark(); list.slice(0, 3).forEach(n => n.classList.add('tap-hint')); };
      function hint() {
        if (finished) return;
        if (api.alive && !api.alive()) { done(null); return; }
        if (speaking()) { timer = setTimeout(hint, 1500); return; }
        const nodes = eligible();
        hints += 1;
        if (action) {
          if (hints >= 2 && nodes.length) { done(nodes[0]); return; }
          glow(nodes);
          if (api.say && api.line) api.say(api.line(o.line), { interrupt: false });
          timer = setTimeout(hint, o.autoMs);
          return;
        }
        if (hints === 1) {
          // Тихо повторяем задание — вдруг ребёнок забыл, что искать.
          if (typeof o.replay === 'function') o.replay();
          else if (api.say && api.line) api.say(api.line(o.line), { interrupt: false });
          timer = setTimeout(hint, o.everyMs);
        } else if (hints === 2) {
          if (typeof o.hintNodes === 'function') glow(o.hintNodes());
          if (api.say && api.line) api.say(api.line('choiceHint'), { interrupt: false });
        }
      }
      scope.addEventListener('click', handler);
      timer = setTimeout(hint, o.hintMs);
      if (api.cleanup) api.cleanup(() => done(null));
    });
  }

  // Проверка, рисует ли система эмодзи (на старых Windows новых эмодзи может не быть):
  // сравниваем с заведомо отсутствующим символом — если картинки совпали, это «квадратик».
  const emojiCache = new Map();
  let canvasCtx = null;
  let tofu = null;
  function drawGlyph(text) {
    const ctx = canvasCtx;
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#000';
    ctx.font = '26px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 0, 2);
    return ctx.getImageData(0, 0, 32, 32).data;
  }
  function emojiOk(emoji) {
    if (emojiCache.has(emoji)) return emojiCache.get(emoji);
    let ok = true;
    try {
      if (!canvasCtx) {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
        tofu = drawGlyph('\u{10FFFD}').slice();
      }
      const pixels = drawGlyph(emoji);
      let same = true; let ink = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 20) ink += 1;
        if (same && (Math.abs(pixels[i + 3] - tofu[i + 3]) > 10 || Math.abs(pixels[i] - tofu[i]) > 10)) same = false;
      }
      ok = ink > 20 && !same;
    } catch (error) { ok = true; }
    emojiCache.set(emoji, ok);
    return ok;
  }

  // Картинка слова: эмодзи или, если система его не рисует, кружок с первой буквой.
  function pic(word, cls) {
    const emoji = word.emoji;
    if (!emoji || !emojiOk(emoji)) {
      return `<span class="pic pic-fallback ${cls || ''}" aria-hidden="true">${esc((word.text || '?').slice(0, 1).toUpperCase())}</span>`;
    }
    return `<span class="pic ${cls || ''}" aria-hidden="true">${emoji}</span>`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  Y.ui = { esc, el, pick, reduced, soundColor, soundLabel, badge, toast, confetti, flyStar, sparkleAt, shake, modal, confirmBox, tapWait, emojiOk, pic, downloadBlob, wait };
})(window);

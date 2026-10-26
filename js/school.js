(function (root) {
  'use strict';
  // ─────────────────────────────────────────────────────────────
  // «ШКОЛА»: задания для 1 класса. Отдельный раздел, свой язык (немецкий или русский).
  // Каждый набор — 6 заданий; внизу полоска набора: плитка на каждое задание (★ — с первого раза, ✓ — с подсказкой).
  // ─────────────────────────────────────────────────────────────
  const Y = root.Yazychok;
  const SD = root.YazychokSchoolData;
  const SC = Y.schoolCore;
  const { ui, sfx } = Y;
  const { esc } = ui;
  Y.steps = Y.steps || {};
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};
  const A = () => Y.app;
  const S = () => Y.app.state;

  const LANG_CODE = { de: 'de-DE', ru: 'ru-RU' };
  const lang = () => (S().settings.schoolLang === 'ru' ? 'ru' : 'de');
  const typeInfo = id => SD.TYPES.find(t => t.id === id);
  const UI_TEXT = {
    de: { lesson: 'Schulstunde', lessonNote: '6 verschiedene Aufgaben', level: 'Stufe', next: 'Weiter', done: 'Geschafft!', starsToday: 'Sterne heute', more: 'mehr', less: 'weniger', claps: 'Silben' },
    ru: { lesson: 'Урок дня', lessonNote: '6 разных заданий', level: 'Уровень', next: 'Дальше', done: 'Готово!', starsToday: 'Звёзд сегодня', more: 'больше', less: 'меньше', claps: 'слогов' }
  };

  // ─── Озвучка ──────────────────────────────────────────────
  const cursor = {};
  function sLine(lg, cat, index) {
    const variants = (SD.LINES[lg] && SD.LINES[lg][cat]) || [];
    if (!variants.length) return null;
    let i = index;
    if (!Number.isInteger(i)) {
      const k = `${lg}:${cat}`;
      cursor[k] = ((cursor[k] ?? Math.floor(Math.random() * variants.length)) + 1) % variants.length;
      i = cursor[k];
    }
    return { key: `sc:${lg}:l:${cat}:${i}`, text: variants[i], lang: LANG_CODE[lg] };
  }
  function sNum(lg, n) {
    const text = n >= 0 && n <= 20 ? SD.NUMBERS[lg][n] : SD.TENS[lg][n];
    return text ? { key: `sc:${lg}:n:${n}`, text, lang: LANG_CODE[lg] } : null;
  }
  const sWord = (lg, text) => ({ key: `sc:${lg}:w:${text}`, text, lang: LANG_CODE[lg] });
  const sCat = (lg, cat) => ({ key: `sc:${lg}:cat:${cat}`, text: SD.CATEGORIES[cat][lg], lang: LANG_CODE[lg] });
  function promptItems(lg, prompt) {
    return (prompt || []).map(p => (p.line ? sLine(lg, p.line, 0) : Number.isInteger(p.num) ? sNum(lg, p.num) : p.word ? sWord(lg, p.word) : null)).filter(Boolean);
  }
  const instruction = (lg, prompt) => {
    const first = (prompt || []).find(p => p.line);
    return first ? SD.LINES[lg][first.line][0] : '';
  };

  // ─── Рисунки ──────────────────────────────────────────────
  const OP = { '+': '+', '-': '−' };
  function dots(n, cls) {
    return `<span class="sc-dots ${cls || ''}" style="grid-template-columns:repeat(${Math.max(1, Math.min(5, n))},26px)">${Array.from({ length: n }, () => '<i></i>').join('')}</span>`;
  }
  function shapeSvg(el, size) {
    const s = size || 56;
    const c = el.color;
    const body = {
      circle: `<circle cx="50" cy="50" r="40" fill="${c}"/>`,
      square: `<rect x="12" y="12" width="76" height="76" rx="12" fill="${c}"/>`,
      triangle: `<path d="M50 10 L92 88 L8 88Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`,
      star: `<path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 71 L21 92 L32 58 L4 38 L38 38Z" fill="${c}" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`,
      heart: `<path d="M50 88 C10 60 4 34 22 20 C36 9 48 18 50 28 C52 18 64 9 78 20 C96 34 90 60 50 88Z" fill="${c}"/>`
    }[el.shape] || '';
    return `<svg class="sc-shape" viewBox="0 0 100 100" width="${s}" height="${s}">${body}</svg>`;
  }

  // Пейзаж для пазла (school-core.puzzleScene) → SVG.
  function sceneSvg(scene, uid) {
    const h = scene.horizon;
    const hl = scene.hill;
    const parts = [];
    parts.push(`<defs><linearGradient id="sky${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.sky[0]}"/><stop offset="1" stop-color="${scene.sky[1]}"/></linearGradient>
      <linearGradient id="gr${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.ground[0]}"/><stop offset="1" stop-color="${scene.ground[1]}"/></linearGradient></defs>`);
    parts.push(`<rect width="400" height="300" fill="url(#sky${uid})"/>`);
    const back = [];
    const front = [];
    for (const o of scene.objs) {
      if (o.k === 'rainbow') {
        const cols = ['#ff5b5b', '#ffa23a', '#ffe14d', '#5ed36f', '#4aa8ff', '#9a6bff'];
        back.push(cols.map((col, i) => `<path d="M${o.cx - o.rr + i * 9} ${o.cy} A${o.rr - i * 9} ${o.rr - i * 9} 0 0 1 ${o.cx + o.rr - i * 9} ${o.cy}" stroke="${col}" stroke-width="9" fill="none" opacity=".85"/>`).join(''));
      } else if (o.k === 'sun') {
        let rays = '';
        for (let i = 0; i < 10; i += 1) { const a = (i / 10) * Math.PI * 2; rays += `<line x1="${(o.x + Math.cos(a) * (o.rr + 6)).toFixed(1)}" y1="${(o.y + Math.sin(a) * (o.rr + 6)).toFixed(1)}" x2="${(o.x + Math.cos(a) * (o.rr + 16)).toFixed(1)}" y2="${(o.y + Math.sin(a) * (o.rr + 16)).toFixed(1)}" stroke="#ffc22e" stroke-width="5" stroke-linecap="round"/>`; }
        back.push(`${rays}<circle cx="${o.x}" cy="${o.y}" r="${o.rr}" fill="#ffd43b"/><circle cx="${o.x - 8}" cy="${o.y - 4}" r="3" fill="#7a4b00"/><circle cx="${o.x + 8}" cy="${o.y - 4}" r="3" fill="#7a4b00"/><path d="M${o.x - 9} ${o.y + 7} Q${o.x} ${o.y + 15} ${o.x + 9} ${o.y + 7}" stroke="#7a4b00" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
      } else if (o.k === 'cloud') {
        back.push(`<g transform="translate(${o.x} ${o.y}) scale(${o.s.toFixed(2)})" fill="#fff"><ellipse cx="0" cy="6" rx="34" ry="13"/><circle cx="-14" cy="0" r="13"/><circle cx="6" cy="-6" r="17"/><circle cx="22" cy="2" r="11"/></g>`);
      } else if (o.k === 'birds') {
        back.push(`<path d="M${o.x - 18} ${o.y} q8 -9 16 0 q8 -9 16 0 M${o.x + 6} ${o.y + 12} q6 -7 12 0 q6 -7 12 0" stroke="#33415c" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      } else if (o.k === 'balloon') {
        back.push(`<path d="M${o.x} ${o.y + 18} q-6 14 4 30" stroke="#555" stroke-width="1.5" fill="none"/><ellipse cx="${o.x}" cy="${o.y}" rx="14" ry="18" fill="${o.color}"/><path d="M${o.x - 3} ${o.y + 17} L${o.x + 3} ${o.y + 17} L${o.x} ${o.y + 21}Z" fill="${o.color}"/><ellipse cx="${o.x - 5}" cy="${o.y - 6}" rx="3" ry="5" fill="#fff" opacity=".6"/>`);
      } else if (o.k === 'house') {
        const { x, y, w } = o; const hh = o.h;
        const doorX = o.door === 'left' ? x + w * 0.18 : x + w * 0.6;
        const winX = o.door === 'left' ? x + w * 0.58 : x + w * 0.14;
        front.push(`<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${o.wall}" stroke="#8a6d4a" stroke-width="2"/>
          <path d="M${x - 10} ${y + 2} L${x + w / 2} ${y - 42} L${x + w + 10} ${y + 2}Z" fill="${o.roof}"/>
          <rect x="${doorX}" y="${y + hh - 40}" width="${w * 0.22}" height="40" rx="4" fill="#9b5d33"/><circle cx="${doorX + w * 0.18}" cy="${y + hh - 20}" r="2.5" fill="#ffd43b"/>
          <rect x="${winX}" y="${y + 16}" width="${w * 0.26}" height="${w * 0.24}" fill="#9ad8ff" stroke="#fff" stroke-width="4"/>
          <rect x="${x + w * 0.66}" y="${y - 34}" width="12" height="22" fill="#a0522d"/>`);
      } else if (o.k === 'tree') {
        const { x, y } = o; const s = o.s;
        front.push(`<g transform="translate(${x} ${y}) scale(${s.toFixed(2)})"><rect x="-8" y="-50" width="16" height="52" rx="4" fill="#8b5a2b"/>
          <circle cx="0" cy="-74" r="34" fill="#3fae5a"/><circle cx="-22" cy="-58" r="20" fill="#4cc06a"/><circle cx="22" cy="-58" r="20" fill="#36a052"/>
          ${o.apples ? '<circle cx="-12" cy="-70" r="5" fill="#ff4d4d"/><circle cx="14" cy="-82" r="5" fill="#ff4d4d"/><circle cx="8" cy="-56" r="5" fill="#ff4d4d"/>' : ''}</g>`);
      } else if (o.k === 'fence') {
        let posts = '';
        for (let px = o.x; px < Math.min(400, o.x + o.w); px += 18) posts += `<rect x="${px}" y="${o.y - 26}" width="10" height="30" rx="3" fill="#f3d9a6" stroke="#b98b4f" stroke-width="1.5"/>`;
        front.push(`<rect x="${o.x}" y="${o.y - 18}" width="${Math.min(400 - o.x, o.w)}" height="6" fill="#d9b277"/>${posts}`);
      } else if (o.k === 'flower') {
        const { x, y } = o; const s = o.s;
        front.push(`<g transform="translate(${x.toFixed(1)} ${y}) scale(${s.toFixed(2)})"><path d="M0 0 L0 18" stroke="#2f8f46" stroke-width="3"/><circle cx="-6" cy="-4" r="6" fill="${o.color}"/><circle cx="6" cy="-4" r="6" fill="${o.color}"/><circle cx="0" cy="-10" r="6" fill="${o.color}"/><circle cx="0" cy="2" r="6" fill="${o.color}"/><circle cx="0" cy="-4" r="4" fill="#ffcf33"/></g>`);
      } else if (o.k === 'bug') {
        front.push(`<text x="${o.x}" y="${o.y}" font-size="28" text-anchor="middle" dominant-baseline="central">${o.e}</text>`);
      }
    }
    parts.push(back.join(''));
    parts.push(`<path d="M0 ${h} Q100 ${h + hl.a} 200 ${h + hl.c} T400 ${h + hl.b} L400 300 L0 300Z" fill="url(#gr${uid})"/>`);
    parts.push(`<path d="M0 ${h + 60} Q120 ${h + 40} 220 ${h + 62} T400 ${h + 54}" stroke="${scene.ground[1]}" stroke-width="10" fill="none" opacity=".35"/>`);
    parts.push(front.join(''));
    return parts.join('');
  }
  // Форма кусочка пазла: ушки справа и снизу, выемки слева и сверху (клетка 100×100).
  function piecePath(x, y) {
    return `M${x} ${y} L${x + 38} ${y} A13 13 0 1 0 ${x + 62} ${y} L${x + 100} ${y} L${x + 100} ${y + 38} A13 13 0 1 1 ${x + 100} ${y + 62} L${x + 100} ${y + 100} L${x + 62} ${y + 100} A13 13 0 1 1 ${x + 38} ${y + 100} L${x} ${y + 100} L${x} ${y + 62} A13 13 0 1 1 ${x} ${y + 38}Z`;
  }
  let uidCounter = 0;
  const uid = () => `s${Date.now().toString(36)}${(uidCounter += 1)}`;

  // ─── Полоска набора ──────────────────────────────────────
  const TILE_COLORS = ['#ff5b7f', '#ff9f43', '#ffd23f', '#4cc477', '#3fa7ff', '#a77dff'];
  function boardMarkup(board, current) {
    return `<div class="sc-board" aria-hidden="true">${Array.from({ length: board.size }, (_, i) => {
      const r = board.results[i];
      const state = r ? (r.firstTry ? 'first' : 'done') : i === current ? 'now' : '';
      return `<span class="sc-tile-b ${state}" style="--c:${TILE_COLORS[i % TILE_COLORS.length]}"><i>${r ? (r.firstTry ? '★' : '✓') : i + 1}</i></span>`;
    }).join('')}</div>`;
  }
  function refreshBoard(stage, board, current) {
    const node = stage.querySelector('.sc-board');
    if (node) node.outerHTML = boardMarkup(board, current);
  }

  // ─── Выбор ответа (общий) ─────────────────────────────────
  // Ошибся — вариант гаснет и звучит «попробуй ещё»; после двух ошибок правильный подсвечивается.
  async function choose(scope, api, lg, right, opts) {
    const o = opts || {};
    let wrong = 0;
    while (api.alive()) {
      const btn = await ui.tapWait(scope, '.sc-opt:not(.gone)', api, {
        replay: () => api.replay(),
        hintNodes: () => [scope.querySelector(`.sc-opt[data-i="${right}"]`)].filter(Boolean)
      });
      if (!btn || !api.alive()) return null;
      const i = Number(btn.dataset.i);
      if (i === right) {
        btn.classList.add('right');
        sfx.play('ding');
        if (o.onRight) await o.onRight(btn);
        await api.say(sLine(lg, 'right'), { interrupt: true });
        if (o.after) await o.after();
        return { firstTry: wrong === 0, wrong };
      }
      wrong += 1;
      btn.classList.add('gone');
      api.wrong(btn);
      if (wrong >= 2) {
        const r = scope.querySelector(`.sc-opt[data-i="${right}"]`);
        if (r) r.classList.add('reveal');
        await api.say(sLine(lg, 'show'), { interrupt: true });
      } else await api.say(sLine(lg, 'again'), { interrupt: true });
    }
    return null;
  }
  const opt = (i, inner, cls) => `<button class="sc-opt ${cls || ''}" data-i="${i}">${inner}</button>`;

  // ─── Виды заданий ─────────────────────────────────────────
  const R = {};

  R.math = {
    body(t) {
      if (t.kind === 'house') {
        return `<div class="sc-house"><div class="sc-roof"><b>${t.top}</b></div><div class="sc-rooms"><b>${t.left}</b><b class="q">?</b></div></div>
          <div class="sc-options">${t.options.map((n, i) => opt(i, `<b>${n}</b>`, 'num')).join('')}</div>`;
      }
      const qa = t.missing === 'b';
      const vis = t.dots ? `<div class="sc-dotrow">${t.op === '+' ? `${dots(t.a, 'a')}<i class="plus">+</i>${dots(t.b, 'b')}` : `<span class="sc-dots a" style="grid-template-columns:repeat(${Math.min(5, t.a)},26px)">${Array.from({ length: t.a }, (_, k) => `<i class="${k >= t.a - t.b ? 'out' : ''}"></i>`).join('')}</span>`}</div>` : '';
      return `<div class="sc-expr"><b>${t.a}</b><i>${OP[t.op]}</i><b class="${qa ? 'q' : ''}">${qa ? '?' : t.b}</b><i>=</i><b class="${qa ? '' : 'q'}">${qa ? t.result : '?'}</b></div>${vis}
        <div class="sc-options">${t.options.map((n, i) => opt(i, `<b>${n}</b>`, 'num')).join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      return choose(stage, api, lg, t.options.indexOf(t.answer), {
        onRight: () => { const q = stage.querySelector('.q'); if (q) { q.textContent = t.answer; q.classList.add('filled'); } }
      });
    }
  };

  function scatter(n, emoji, seedShift) {
    // Предметы врассыпную по сетке 5×4 — не налезают друг на друга.
    const cells = Array.from({ length: 20 }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    return cells.slice(0, n).map(c => `<span class="sc-thing" style="left:${((c % 5) + 0.5) * 20 + (Math.random() - 0.5) * 6}%;top:${(Math.floor(c / 5) + 0.5) * 25 + (Math.random() - 0.5) * 8 + (seedShift || 0)}%">${emoji}</span>`).join('');
  }
  R.count = {
    body(t, lg) {
      if (t.kind === 'howMany') {
        const field = t.framed
          ? `<div class="sc-frame">${Array.from({ length: Math.ceil(t.n / 10) }, (_, row) => `<div class="sc-frame-row">${Array.from({ length: 10 }, (_, k) => `<span class="${row * 10 + k < t.n ? 'on' : ''}">${row * 10 + k < t.n ? t.emoji : ''}</span>`).join('')}</div>`).join('')}</div>`
          : `<div class="sc-field">${scatter(t.n, t.emoji)}</div>`;
        return `${field}<div class="sc-options">${t.options.map((n, i) => opt(i, `<b>${n}</b>`, 'num')).join('')}</div>`;
      }
      if (t.kind === 'more') {
        return `<div class="sc-groups">${[t.left, t.right].map((g, i) => opt(i, `<div class="sc-field small">${scatter(g.n, g.emoji)}</div>`, 'group')).join('')}</div>`;
      }
      if (t.kind === 'compare') {
        return `<div class="sc-cmp"><b>${t.a}</b><span class="q">?</span><b>${t.b}</b></div>
          <div class="sc-options">${t.options.map((s, i) => opt(i, `<b>${s}</b>`, 'num sym')).join('')}</div>`;
      }
      return `<div class="sc-row">${t.row.map(n => `<b class="${n === null ? 'q' : ''}">${n === null ? '?' : n}</b>`).join('')}</div>
        <div class="sc-options">${t.options.map((n, i) => opt(i, `<b>${n}</b>`, 'num')).join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      let right;
      if (t.kind === 'more') right = t.answer === 'left' ? 0 : 1;
      else right = t.options.indexOf(t.answer);
      return choose(stage, api, lg, right, {
        onRight: () => { const q = stage.querySelector('.q'); if (q) { q.textContent = t.answer; q.classList.add('filled'); } },
        after: async () => { if (t.kind === 'howMany') await api.say(sNum(lg, t.n), { interrupt: true }); }
      });
    }
  };

  R.syll = {
    body(t, lg) {
      if (t.kind === 'build') {
        return `<div class="sc-syls">${t.syl.map(s => `<b>${esc(s)}</b>`).join('<i>·</i>')}</div>
          <div class="sc-options">${t.options.map((w, i) => opt(i, `<span class="sc-pic">${w.e}</span>`, 'pic')).join('')}</div>`;
      }
      if (t.kind === 'count') {
        return `<div class="sc-word"><span class="sc-pic big">${t.target.e}</span><b class="sc-wordtext">${t.target.syl.map(s => `<span class="syl">${esc(s)}</span>`).join('')}</b></div>
          <div class="sc-options">${t.options.map((n, i) => opt(i, `<b>${n}</b><small>${'👏'.repeat(n)}</small>`, 'num claps')).join('')}</div>`;
      }
      if (t.kind === 'first') {
        return `<div class="sc-word"><span class="sc-pic big">${t.target.e}</span><button class="sc-listen small" data-sc="word" aria-label="Слово">🔊</button><b class="sc-wordtext hidden-word">${t.target.syl.map((s, i) => `<span class="syl ${i === 0 ? 'first' : ''}">${esc(s)}</span>`).join('')}</b></div>
          <div class="sc-options">${t.options.map((s, i) => opt(i, `<b>${esc(s)}</b>`, 'syl')).join('')}</div>`;
      }
      return `<div class="sc-word"><span class="sc-pic big">${t.target.e}</span><b class="sc-slots">${t.syl.map(s => (s === null ? '<span class="slot q">?</span>' : `<span class="slot">${esc(s)}</span>`)).join('')}</b></div>
        <div class="sc-options">${t.options.map((s, i) => opt(i, `<b>${esc(s)}</b>`, 'syl')).join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      if (t.kind === 'first') {
        const b = stage.querySelector('[data-sc="word"]');
        if (b) b.addEventListener('click', () => api.say(sWord(lg, t.target.text), { interrupt: true }));
        return choose(stage, api, lg, t.answer, {
          onRight: () => { const w = stage.querySelector('.hidden-word'); if (w) w.classList.remove('hidden-word'); },
          after: () => api.say(sWord(lg, t.target.text), { interrupt: true })
        });
      }
      if (t.kind === 'build') {
        return choose(stage, api, lg, t.answer, {
          onRight: btn => { btn.insertAdjacentHTML('beforeend', `<small class="sc-said">${esc(t.target.text)}</small>`); },
          after: () => api.say(sWord(lg, t.target.text), { interrupt: true })
        });
      }
      if (t.kind === 'count') {
        return choose(stage, api, lg, t.options.indexOf(t.answer), {
          onRight: async () => {
            // Слоговые дуги, как в тетради, и хлопки.
            const syls = stage.querySelectorAll('.sc-wordtext .syl');
            for (const s of syls) { if (!api.alive()) break; s.classList.add('arc'); sfx.play('clap'); await api.wait(420); }
          },
          after: () => api.say(sWord(lg, t.target.text), { interrupt: true })
        });
      }
      return choose(stage, api, lg, t.answer, {
        onRight: () => { const q = stage.querySelector('.slot.q'); if (q) { q.textContent = t.options[t.answer]; q.classList.remove('q'); q.classList.add('filled'); } },
        after: () => api.say(sWord(lg, t.target.text), { interrupt: true })
      });
    }
  };

  R.puzzle = {
    body(t) {
      const id = uid();
      const scene = SC.puzzleScene(t.seed);
      const svg = sceneSvg(scene, id);
      const hx = t.hole.c * 100; const hy = t.hole.r * 100;
      const pieces = t.options.map((o, i) => {
        const pid = `${id}p${i}`;
        const x = o.c * 100; const y = o.r * 100;
        return opt(i, `<svg viewBox="${x - 16} ${y - 16} 132 132" class="sc-piece"><defs><clipPath id="${pid}"><path d="${piecePath(x, y)}"/></clipPath></defs>
          <g transform="${o.rot ? `rotate(180 ${x + 50} ${y + 50})` : ''}"><g clip-path="url(#${pid})">${sceneSvg(scene, `${pid}s`)}</g></g>
          <path d="${piecePath(x, y)}" fill="none" stroke="#fff" stroke-width="3" transform="${o.rot ? `rotate(180 ${x + 50} ${y + 50})` : ''}"/></svg>`, 'piece');
      }).join('');
      return `<div class="sc-puzzle"><svg viewBox="0 0 400 300" class="sc-picture">${svg}
          <path class="sc-hole" d="${piecePath(hx, hy)}" fill="#eef3f8" stroke="#7d8bb0" stroke-width="3" stroke-dasharray="8 6"/></svg></div>
        <div class="sc-options">${pieces}</div>`;
    },
    async play(stage, t, lg, api) {
      return choose(stage, api, lg, t.answer, {
        onRight: async () => {
          const hole = stage.querySelector('.sc-hole');
          if (hole) { hole.classList.add('fill'); await api.wait(500); }
        }
      });
    }
  };

  R.pattern = {
    body(t) {
      if (t.kind === 'numbers') {
        return `<div class="sc-row long">${t.seq.map(n => `<b>${n}</b>`).join('')}<b class="q">?</b></div>
          <div class="sc-options">${t.options.map((n, i) => opt(i, `<b>${n}</b>`, 'num')).join('')}</div>`;
      }
      return `<div class="sc-seq">${t.seq.map(el => shapeSvg(el, 58)).join('')}<span class="q shape-q">?</span></div>
        <div class="sc-options">${t.options.map((el, i) => opt(i, shapeSvg(el, 70), 'shape')).join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      const right = t.kind === 'numbers' ? t.options.indexOf(t.answer) : t.answer;
      return choose(stage, api, lg, right, {
        onRight: () => {
          const q = stage.querySelector('.q');
          if (!q) return;
          if (t.kind === 'numbers') { q.textContent = t.answer; q.classList.add('filled'); } else { q.outerHTML = shapeSvg(t.options[t.answer], 58).replace('sc-shape', 'sc-shape filled'); }
        }
      });
    }
  };

  R.odd = {
    body(t, lg) {
      return `<div class="sc-options grid4">${t.items.map((w, i) => opt(i, `<span class="sc-pic">${w.e}</span><small>${esc(w.text)}</small>`, 'pic tall')).join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      return choose(stage, api, lg, t.answer, {
        onRight: () => { stage.querySelectorAll('.sc-opt').forEach((b, i) => { if (i !== t.answer) b.classList.add('same'); }); },
        after: () => api.say(sCat(lg, t.category), { interrupt: true })
      });
    }
  };

  R.shadow = {
    body(t) {
      return `<div class="sc-target"><span class="sc-pic huge">${t.target.e}</span></div>
        <div class="sc-options">${t.options.map((w, i) => opt(i, `<span class="sc-pic sil" style="--tilt:${t.tilt ? Math.round((Math.random() - 0.5) * 40) : 0}deg">${w.e}</span>`, 'pic')).join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      return choose(stage, api, lg, t.answer, {
        onRight: btn => { const p = btn.querySelector('.sil'); if (p) p.classList.add('lit'); },
        after: () => api.say(sWord(lg, t.target.text), { interrupt: true })
      });
    }
  };

  // «Найди отличия»: две картинки, нажимать на правой.
  R.diff = {
    body(t) {
      const pic = (items, side) => `<div class="sc-diffpic bg-${t.bg}" data-side="${side}">${items.filter(it => !it.hidden).map(it => `<span class="sc-thing" style="left:${(it.x * 100).toFixed(1)}%;top:${(it.y * 100).toFixed(1)}%;--s:${it.s}">${it.e}</span>`).join('')}</div>`;
      return `<div class="sc-diffwrap">${pic(t.left, 'left')}${pic(t.right, 'right')}</div>
        <div class="sc-diffcount">${t.diffs.map(() => '<i></i>').join('')}</div>`;
    },
    async play(stage, t, lg, api) {
      const right = stage.querySelector('.sc-diffpic[data-side="right"]');
      const left = stage.querySelector('.sc-diffpic[data-side="left"]');
      const found = new Set();
      let misses = 0;
      let idleTimer = null;
      const mark = (pic, d, cls) => pic.insertAdjacentHTML('beforeend', `<span class="sc-ring ${cls || ''}" style="left:${(d.x * 100).toFixed(1)}%;top:${(d.y * 100).toFixed(1)}%"></span>`);
      const counters = stage.querySelectorAll('.sc-diffcount i');
      return new Promise(resolve => {
        let finished = false;
        const finish = value => { if (finished) return; finished = true; clearTimeout(idleTimer); right.removeEventListener('click', onTap); left.removeEventListener('click', onTap); resolve(value); };
        const armIdle = () => {
          clearTimeout(idleTimer);
          // Долго не находит — мягко подсвечиваем одно отличие (без спешки: через минуту).
          idleTimer = setTimeout(() => {
            if (!api.alive()) return finish(null);
            const next = t.diffs.findIndex((d, i) => !found.has(i));
            if (next >= 0) { mark(right, t.diffs[next], 'hint'); api.say(sLine(lg, 'calm'), { interrupt: false }); }
          }, 60000);
        };
        const onTap = async event => {
          if (!api.alive()) return finish(null);
          const pic = event.currentTarget;
          const rect = pic.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width; const y = (event.clientY - rect.top) / rect.height;
          let best = -1; let bestD = 1;
          t.diffs.forEach((d, i) => { if (found.has(i)) return; const dd = Math.hypot((d.x - x) * 1.33, d.y - y); if (dd < bestD) { bestD = dd; best = i; } });
          if (best >= 0 && bestD < 0.13) {
            found.add(best);
            right.querySelectorAll('.sc-ring.hint').forEach(n => n.remove());
            mark(right, t.diffs[best]); mark(left, t.diffs[best]);
            if (counters[found.size - 1]) counters[found.size - 1].classList.add('on');
            sfx.play('ding');
            armIdle();
            if (found.size === t.diffs.length) {
              await api.say(sLine(lg, 'right'), { interrupt: true });
              finish({ firstTry: misses <= 1, wrong: misses });
            } else api.say(sLine(lg, 'diffFound'), { interrupt: true });
          } else {
            misses += 1;
            sfx.play('soft');
            pic.insertAdjacentHTML('beforeend', `<span class="sc-miss" style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%">✕</span>`);
            const m = pic.lastElementChild; setTimeout(() => m && m.remove(), 700);
          }
        };
        right.addEventListener('click', onTap);
        left.addEventListener('click', onTap);
        api.cleanup(() => finish(null));
        armIdle();
      });
    }
  };

  // ─── Шаг занятия ──────────────────────────────────────────
  Y.steps.school = async (stage, step, api) => {
    const lg = step.lang === 'ru' ? 'ru' : 'de';
    const t = step.task;
    const info = typeInfo(step.type);
    const renderer = R[step.type];
    if (!renderer) return {};
    // Подсказка «не спеши» — на языке задания.
    const sapi = Object.create(api);
    sapi.line = category => (category === 'choiceHint' || category === 'tapHint' ? sLine(lg, 'calm') : api.line(category));
    stage.classList.add('stage-school');
    stage.innerHTML = `<div class="sc sc-t-${step.type} sc-k-${t.kind}" lang="${lg}">
      <div class="sc-head"><span class="sc-icon">${info.icon}</span><h2>${esc(instruction(lg, t.prompt))}</h2><button class="sc-say" data-sc="say" aria-label="Повторить">🔊</button></div>
      <div class="sc-body">${renderer.body(t, lg)}</div>
      ${boardMarkup(step.board, step.index)}</div>`;
    const prompt = promptItems(lg, t.prompt);
    const say = () => api.say(prompt, { interrupt: true });
    api.setReplay(say);
    const sayBtn = stage.querySelector('[data-sc="say"]');
    if (sayBtn) sayBtn.addEventListener('click', say);
    if (step.index === 0 && !step.greeted) {
      step.greeted = true;
      await api.say(sLine(lg, step.lesson ? 'lesson' : 'setStart'), { interrupt: true });
    }
    say();
    const res = await renderer.play(stage, t, lg, sapi, step);
    if (!res || !api.alive()) return {};
    step.board.results[step.index] = { type: step.type, firstTry: Boolean(res.firstTry) };
    refreshBoard(stage, step.board, -1);
    await api.wait(650);
    if (step.index === step.board.size - 1) await finishSet(stage, step, api, lg);
    return { stars: 0 };
  };

  function recordBoard(board) {
    if (board.recorded) return board.summary;
    const results = board.results.filter(Boolean);
    board.recorded = true;
    board.summary = results.length ? SC.recordSet(S(), results, A().today()) : { stars: 0, levelUps: [] };
    A().save();
    return board.summary;
  }

  async function finishSet(stage, step, api, lg) {
    const sum = recordBoard(step.board);
    const tx = UI_TEXT[lg];
    const ups = (sum.levelUps || []).map(typeInfo).filter(Boolean);
    const overlay = ui.el(`<div class="praise-overlay sc-final"><div class="praise-card">
      <div class="sc-pattern">${Array.from({ length: step.board.size }, (_, i) => `<span style="--c:${TILE_COLORS[i % TILE_COLORS.length]};--d:${i * 0.12}s"><i>${step.board.results[i] && step.board.results[i].firstTry ? '★' : '✓'}</i></span>`).join('')}</div>
      <h1>${esc(tx.done)}</h1>
      ${sum.stars ? `<div class="praise-stars">${'⭐'.repeat(Math.min(sum.stars, 7))}</div>` : ''}
      ${ups.length ? `<p class="sc-up">⬆️ ${ups.map(u => `${u.icon} ${esc(u[lg])}`).join(', ')}</p>` : ''}
      <button class="btn big" data-sc="next">${esc(tx.next)} →</button></div></div>`);
    stage.appendChild(overlay);
    sfx.play('fanfare');
    ui.confetti(30);
    if (sum.stars) api.star(sum.stars, overlay.querySelector('.praise-stars'));
    await api.say([sLine(lg, 'setDone'), ...(ups.length ? [sLine(lg, 'levelUp', 0)] : [])], { interrupt: true });
    await ui.tapWait(overlay, '[data-sc="next"]', api, { auto: true });
    overlay.remove();
  }

  // ─── Экран «Школа» ────────────────────────────────────────
  function startSchool(steps) {
    const board = steps[0] && steps[0].board;
    A().startMini(steps, 'school', {
      noMic: true,
      onFinish: ctx => {
        // Набор закончился без последнего шага (мама пропустила) — итог всё равно подводим.
        if (board && !board.recorded && board.results.some(Boolean)) {
          const sum = recordBoard(board);
          ctx.stars += sum.stars || 0;
        }
      }
    });
  }

  Y.screens.school = {
    render: () => {
      const s = S();
      const lg = lang();
      const tx = UI_TEXT[lg];
      const school = SC.ensure(s);
      const done = Boolean(s.progress.days[A().today()]);
      if (s.settings.schoolAfter === true && !done) {
        return `<div class="shell">${A().topbar('Школа', 'home')}<section class="card center">
          <div class="giant">🔒</div><h2>Школа откроется после занятия</h2>
          <p>Сначала занятие с язычком — потом счёт, слоги и пазлы!</p>
          <button class="btn big" data-action="start">Начать занятие 🚀</button></section></div>`;
      }
      const today = school.stars.day === A().today() ? school.stars.n : 0;
      return `<div class="shell school-screen">${A().topbar('Школа', 'home')}
        <button class="card sc-lesson" data-action="school-lesson"><span class="sc-lesson-icon">📚</span><span><b>${esc(tx.lesson)}</b><small>${esc(tx.lessonNote)}</small></span><em>▶</em></button>
        <div class="sc-tiles">${SD.TYPES.map(t => {
          const lvl = school.levels[t.id] || 1;
          return `<button class="sc-type" data-action="school-set" data-type="${t.id}"><span class="sc-type-icon">${t.icon}</span><b>${esc(t[lg])}</b>
            <i class="sc-lvl" title="${esc(tx.level)} ${lvl}">${Array.from({ length: t.maxLevel }, (_, k) => `<em class="${k < lvl ? 'on' : ''}"></em>`).join('')}</i></button>`;
        }).join('')}</div>
        <p class="muted center sc-today">⭐ ${esc(tx.starsToday)}: ${today} / ${SC.DAILY_STAR_CAP} · ${lg === 'de' ? '🇩🇪 Deutsch' : '🇷🇺 по-русски'}</p>
      </div>`;
    }
  };

  Y.actions['school-lesson'] = () => startSchool(SC.buildLesson(S(), Math.random, lang()));
  Y.actions['school-set'] = btn => startSchool(SC.buildSet(S(), btn.dataset.type, Math.random, lang()));
  Y.actions['school-lang'] = btn => { S().settings.schoolLang = btn.dataset.lang === 'ru' ? 'ru' : 'de'; A().save(); A().render(); };
  Y.actions['school-level'] = btn => {
    const type = btn.dataset.type;
    SC.setLevel(S(), type, SC.levelOf(S(), type) + Number(btn.dataset.d || 0));
    A().save();
    A().render();
  };

  Y.school = { sLine, sNum, sWord, sCat, sceneSvg, piecePath, UI_TEXT };
})(typeof window !== 'undefined' ? window : globalThis);

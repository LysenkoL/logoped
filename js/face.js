(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root && root.document) {
    root.Yazychok = root.Yazychok || {};
    root.Yazychok.art = value;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const C = {
    skin: '#ffd8b8', hair: '#7b4a2c', lips: '#c9445f', inside: '#5c1c2e', teeth: '#ffffff',
    tongue: '#ff7d95', tongueDark: '#e2566f', cheek: '#ff9fb2', eye: '#2b2140'
  };

  // Лицо ребёнка с положением языка. mouth/tongue — см. data.js (face у упражнений и звуков).
  function face(options) {
    const opts = Object.assign({ mouth: 'closed', tongue: 'hidden', size: 220, beat: 2.4, label: '' }, options || {});
    const id = `f${Math.random().toString(36).slice(2, 8)}`;
    const head = `
      <circle cx="100" cy="104" r="84" fill="${C.skin}"/>
      <path d="M18 98 Q16 22 100 18 Q184 22 182 98 Q170 70 146 60 Q124 76 100 62 Q76 78 54 60 Q30 72 18 98Z" fill="${C.hair}"/>
      <circle cx="22" cy="108" r="12" fill="${C.skin}"/><circle cx="178" cy="108" r="12" fill="${C.skin}"/>
      <g class="eyes">
        <ellipse cx="70" cy="96" rx="13" ry="15" fill="#fff"/><ellipse cx="130" cy="96" rx="13" ry="15" fill="#fff"/>
        <circle cx="71" cy="98" r="8" fill="${C.eye}"/><circle cx="131" cy="98" r="8" fill="${C.eye}"/>
        <circle cx="74" cy="94" r="3" fill="#fff"/><circle cx="134" cy="94" r="3" fill="#fff"/>
      </g>
      <path d="M56 76 Q70 68 84 76" stroke="${C.hair}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M116 76 Q130 68 144 76" stroke="${C.hair}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="48" cy="126" r="12" fill="${C.cheek}" opacity=".55"/><circle cx="152" cy="126" r="12" fill="${C.cheek}" opacity=".55"/>
      <path d="M95 118 Q100 123 105 118" stroke="#c98a6a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return `<svg class="face mouth-${opts.mouth} tongue-${opts.tongue}" viewBox="0 0 200 210" width="${opts.size}" height="${Math.round(opts.size * 1.05)}" style="--beat:${opts.beat}s" role="img" aria-label="${opts.label}">
      <defs><clipPath id="${id}-open"><path d="${openPath(opts.mouth)}"/></clipPath></defs>
      ${head}${mouth(opts.mouth, opts.tongue, id)}
    </svg>`;
  }

  function openPath(mouthType) {
    if (mouthType === 'open-wide') return 'M66 132 Q100 124 134 132 Q136 190 100 194 Q64 190 66 132Z';
    if (mouthType === 'lips-forward') return 'M86 150 A14 12 0 1 0 114 150 A14 12 0 1 0 86 150Z';
    if (mouthType === 'smile-gap' || mouthType === 'smile-teeth') return 'M64 138 Q100 130 136 138 Q128 172 100 174 Q72 172 64 138Z';
    return 'M68 136 Q100 130 132 136 Q130 180 100 182 Q70 180 68 136Z';
  }

  function tongueShape(tongue, mouthType) {
    const pink = C.tongue; const dark = C.tongueDark;
    const bottom = mouthType === 'open-wide' ? 176 : 168;
    switch (tongue) {
      case 'suck-up':
        return `<g class="tg"><path d="M72 138 Q100 128 128 138 L126 156 Q100 164 74 156Z" fill="${pink}"/>
          <path d="M84 152 Q100 158 116 152" stroke="${dark}" stroke-width="2" fill="none"/>
          <line x1="100" y1="160" x2="100" y2="${bottom + 6}" stroke="${dark}" stroke-width="4" stroke-linecap="round"/></g>`;
      case 'painter':
        return `<g class="tg tg-paint"><ellipse cx="100" cy="146" rx="15" ry="9" fill="${pink}"/><path d="M100 150 L100 ${bottom + 8}" stroke="${pink}" stroke-width="20" stroke-linecap="round"/></g>`;
      case 'swing':
        return `<g class="tg tg-swing"><ellipse cx="100" cy="146" rx="13" ry="9" fill="${pink}"/><path d="M100 150 L100 ${bottom + 10}" stroke="${pink}" stroke-width="22"/></g>`;
      case 'tip-up':
        return `<g class="tg"><path d="M82 ${bottom + 10} Q84 152 100 143 Q116 152 118 ${bottom + 10}Z" fill="${pink}"/><path d="M100 150 L100 ${bottom}" stroke="${dark}" stroke-width="2"/></g>`;
      case 'cup-up':
        return `<g class="tg"><path d="M86 144 Q100 166 114 144 L112 154 Q100 170 88 154Z" fill="${pink}"/></g>`;
      case 'brush-lower':
        // Кончик языка за нижними зубами, ходит влево-вправо (чистим зубки изнутри).
        return `<g class="tg tg-brush-lower"><ellipse cx="100" cy="167" rx="16" ry="9" fill="${pink}"/><path d="M89 167 Q100 160 111 167" stroke="${dark}" stroke-width="2" fill="none"/></g>`;
      case 'hill':
        // «Горка»: кончик упирается в нижние зубы, спинка выгнута вверх.
        return `<g class="tg"><path d="M70 ${bottom + 4} Q72 150 100 145 Q128 150 130 ${bottom + 4}Z" fill="${pink}"/><path d="M84 160 Q100 150 116 160" stroke="${dark}" stroke-width="2.5" fill="none"/><path d="M100 150 L100 ${bottom - 2}" stroke="${dark}" stroke-width="2" opacity=".6"/></g>`;
      case 'swing-out':
        return `<g class="tg"><ellipse cx="100" cy="172" rx="26" ry="12" fill="${pink}"/></g>`;
      case 'behind-lower':
        return `<g class="tg"><ellipse cx="100" cy="163" rx="24" ry="8" fill="${pink}"/></g>`;
      default:
        return '';
    }
  }

  // Язык поверх зубов (внутри рта): «Маляр» по зубам спереди.
  function frontTongue(tongue) {
    if (tongue === 'paint-front') {
      return `<g class="tg tg-paint-front"><path d="M88 176 L88 150 Q88 138 100 137 Q112 138 112 150 L112 176Z" fill="${C.tongue}"/>
        <ellipse cx="100" cy="142" rx="11" ry="6" fill="${C.tongueDark}" opacity=".35"/></g>`;
    }
    return '';
  }

  function outsideTongue(tongue) {
    if (tongue === 'spatula' || tongue === 'slap') {
      // «Лопаточка»: широкий спокойный язык лежит на нижней губе. «Накажем»: губы шлёпают по нему.
      return `<g class="tg ${tongue === 'slap' ? 'tg-slap' : ''}"><path d="M68 166 Q64 198 100 200 Q136 198 132 166Z" fill="${C.tongue}"/><path d="M100 172 L100 192" stroke="${C.tongueDark}" stroke-width="2" opacity=".6"/></g>
        ${tongue === 'slap' ? `<path class="lip-slap" d="M70 150 Q100 162 130 150" stroke="${C.lips}" stroke-width="8" fill="none" stroke-linecap="round"/>` : ''}`;
    }
    if (tongue === 'swing-out') {
      // Качели снаружи: кончик языка тянется к носику, потом к подбородку.
      return `<g class="tg tg-sw-up"><path d="M84 166 Q82 132 100 122 Q118 132 116 166Z" fill="${C.tongue}"/><path d="M100 132 L100 160" stroke="${C.tongueDark}" stroke-width="2"/></g>
        <g class="tg tg-sw-down"><path d="M84 150 Q82 196 100 207 Q118 196 116 150Z" fill="${C.tongue}"/><path d="M100 160 L100 196" stroke="${C.tongueDark}" stroke-width="2"/></g>`;
    }
    if (tongue === 'cup-out') {
      return `<g class="tg tg-out"><path d="M76 168 Q72 204 100 206 Q128 204 124 168Z" fill="${C.tongue}"/>
        <ellipse cx="100" cy="184" rx="14" ry="11" fill="${C.tongueDark}" opacity=".55"/></g>`;
    }
    if (tongue === 'needle') {
      return `<g class="tg tg-out"><path d="M90 166 Q100 212 110 166Z" fill="${C.tongue}"/><path d="M100 170 L100 196" stroke="${C.tongueDark}" stroke-width="2"/></g>`;
    }
    return '';
  }

  function teethFor(mouthType) {
    if (mouthType === 'smile-gap') {
      return `<path d="M70 139 Q100 133 130 139 L128 149 Q100 145 72 149Z" fill="${C.teeth}"/>
        <path d="M76 156 Q100 153 124 156 L120 166 Q100 170 80 166Z" fill="${C.teeth}"/>`;
    }
    if (mouthType === 'smile-teeth') {
      return `<path d="M70 139 Q100 133 130 139 L128 152 Q100 149 72 152Z" fill="${C.teeth}"/>
        <path d="M74 152 Q100 149 126 152 L120 166 Q100 170 80 166Z" fill="#f2f2f2"/>
        <path d="M72 152 Q100 149 128 152" stroke="#d8d0d0" stroke-width="1.5" fill="none"/>`;
    }
    if (mouthType === 'lips-forward') {
      return `<rect x="90" y="138" width="20" height="6" rx="2" fill="${C.teeth}"/><rect x="91" y="157" width="18" height="5" rx="2" fill="${C.teeth}"/>`;
    }
    if (mouthType === 'open-wide') {
      return `<path d="M70 132 Q100 126 130 132 L128 140 Q100 136 72 140Z" fill="${C.teeth}"/>
        <path d="M78 184 Q100 188 122 184 L124 190 Q100 196 76 190Z" fill="${C.teeth}"/>`;
    }
    return `<path d="M72 137 Q100 132 128 137 L126 145 Q100 141 74 145Z" fill="${C.teeth}"/>
      <path d="M80 174 Q100 177 120 174 L122 180 Q100 185 78 180Z" fill="${C.teeth}"/>`;
  }

  function mouth(mouthType, tongue, id) {
    if (mouthType === 'closed') {
      return `<path d="M76 146 Q100 164 124 146" stroke="${C.lips}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    }
    if (mouthType === 'tube') {
      return `<g class="m-tube"><ellipse cx="100" cy="152" rx="17" ry="15" fill="${C.lips}"/><ellipse cx="100" cy="152" rx="6" ry="5" fill="${C.inside}"/>
        <path d="M88 142 L92 146 M112 142 L108 146 M88 162 L92 158 M112 162 L108 158" stroke="#9d3148" stroke-width="2"/></g>`;
    }
    if (mouthType === 'smile-tube') {
      return `<g class="alt-a">${mouth('smile-teeth', 'hidden', id)}</g><g class="alt-b">${mouth('tube', 'hidden', id)}</g>`;
    }
    const clip = `url(#${id}-open)`;
    const lipStroke = mouthType === 'lips-forward' ? 9 : 6;
    return `<g class="m-open">
      <path d="${openPath(mouthType)}" fill="${C.inside}"/>
      <g clip-path="${clip}">${tongueShape(tongue, mouthType)}${teethFor(mouthType)}${frontTongue(tongue)}</g>
      <path d="${openPath(mouthType)}" fill="none" stroke="${C.lips}" stroke-width="${lipStroke}" stroke-linejoin="round"/>
      ${outsideTongue(tongue)}
    </g>`;
  }

  // ─────────────────────────────────────────────────────────────
  // ПИТОМЦЫ-МОНСТРИКИ (свои персонажи)
  // ─────────────────────────────────────────────────────────────
  function eyes(x1, x2, y, r) {
    return `<g class="pet-eyes"><circle cx="${x1}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#fff"/>
      <circle cx="${x1 + 1}" cy="${y + 2}" r="${r * 0.5}" fill="#2b2140"/><circle cx="${x2 + 1}" cy="${y + 2}" r="${r * 0.5}" fill="#2b2140"/>
      <circle cx="${x1 + 3}" cy="${y - 2}" r="${r * 0.18}" fill="#fff"/><circle cx="${x2 + 3}" cy="${y - 2}" r="${r * 0.18}" fill="#fff"/></g>`;
  }

  function pet(design, size) {
    const s = size || 180;
    const wrap = inner => `<svg class="pet-svg pet-${design}" viewBox="0 0 200 200" width="${s}" height="${s}" role="img">${inner}</svg>`;
    switch (design) {
      case 'tongue':
      case 'rainbowTongue': {
        const fill = design === 'rainbowTongue' ? 'url(#rb)' : '#ff7d95';
        const defs = design === 'rainbowTongue' ? `<defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b8b"/><stop offset=".3" stop-color="#ffb347"/><stop offset=".55" stop-color="#ffe066"/><stop offset=".75" stop-color="#6bd08b"/><stop offset="1" stop-color="#6aa8ff"/></linearGradient></defs>` : '';
        return wrap(`${defs}<ellipse cx="100" cy="190" rx="52" ry="7" fill="#000" opacity=".1"/>
          <path d="M42 96 Q40 34 100 32 Q160 34 158 96 L158 150 Q158 188 100 188 Q42 188 42 150Z" fill="${fill}"/>
          <path d="M100 58 L100 150" stroke="#e2566f" stroke-width="5" stroke-linecap="round" opacity=".6"/>
          ${eyes(78, 122, 88, 15)}
          <path d="M84 124 Q100 138 116 124" stroke="#9b2f47" stroke-width="5" fill="none" stroke-linecap="round"/>
          <circle cx="62" cy="116" r="9" fill="#ff4f74" opacity=".4"/><circle cx="138" cy="116" r="9" fill="#ff4f74" opacity=".4"/>
          <ellipse cx="36" cy="132" rx="9" ry="14" fill="${fill}" transform="rotate(25 36 132)"/><ellipse cx="164" cy="132" rx="9" ry="14" fill="${fill}" transform="rotate(-25 164 132)"/>`);
      }
      case 'fluffy': {
        let spikes = '';
        for (let i = 0; i < 28; i += 1) {
          const a = (i / 28) * Math.PI * 2;
          const r1 = 70; const r2 = 84;
          const x = 100 + Math.cos(a) * (i % 2 ? r1 : r2); const y = 108 + Math.sin(a) * (i % 2 ? r1 : r2);
          spikes += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
        }
        return wrap(`<ellipse cx="100" cy="192" rx="50" ry="6" fill="#000" opacity=".1"/><path d="${spikes}Z" fill="#9b7bff"/>
          <circle cx="100" cy="108" r="66" fill="#a98bff"/>${eyes(78, 122, 98, 17)}
          <path d="M86 132 Q100 144 114 132" stroke="#4b2c9e" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M92 134 L95 142 L98 135Z M104 135 L107 142 L110 134Z" fill="#fff"/>`);
      }
      case 'horny':
        return wrap(`<ellipse cx="100" cy="192" rx="54" ry="6" fill="#000" opacity=".1"/>
          <path d="M58 52 L66 18 L80 48Z M142 52 L134 18 L120 48Z" fill="#ffd166"/>
          <rect x="40" y="44" width="120" height="142" rx="52" fill="#57c46a"/>
          <circle cx="68" cy="150" r="9" fill="#43a856"/><circle cx="132" cy="80" r="7" fill="#43a856"/><circle cx="120" cy="164" r="6" fill="#43a856"/>
          ${eyes(78, 122, 96, 16)}
          <path d="M76 128 Q100 150 124 128" stroke="#1f6b31" stroke-width="5" fill="#2d7a3f" stroke-linecap="round"/>
          <path d="M94 131 L100 146 L106 132Z" fill="#fff"/>`);
      case 'eyes3':
        return wrap(`<ellipse cx="100" cy="192" rx="54" ry="6" fill="#000" opacity=".1"/>
          <path d="M100 30 Q170 34 166 118 Q166 188 100 188 Q34 188 34 118 Q30 34 100 30Z" fill="#ff9f43"/>
          <path d="M78 34 Q70 14 60 14 M122 34 Q130 14 140 14" stroke="#ff9f43" stroke-width="6" fill="none" stroke-linecap="round"/>
          <circle cx="60" cy="14" r="6" fill="#ff6b6b"/><circle cx="140" cy="14" r="6" fill="#ff6b6b"/>
          ${eyes(70, 130, 96, 13)}<circle cx="100" cy="74" r="13" fill="#fff"/><circle cx="101" cy="76" r="6.5" fill="#2b2140"/><circle cx="104" cy="72" r="2.3" fill="#fff"/>
          <path d="M80 130 Q100 150 120 130" stroke="#8a4a14" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      case 'cloudy':
        return wrap(`<ellipse cx="100" cy="190" rx="56" ry="6" fill="#000" opacity=".08"/>
          <path d="M50 150 Q20 150 24 120 Q26 94 54 96 Q56 60 92 62 Q112 40 138 60 Q176 58 174 96 Q192 110 180 134 Q176 152 150 150Z" fill="#a9dcff"/>
          <path d="M40 150 L162 150 Q160 170 100 172 Q42 170 40 150Z" fill="#a9dcff"/>
          ${eyes(80, 120, 108, 13)}
          <path d="M88 132 Q100 142 112 132" stroke="#2c6aa0" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="64" cy="126" r="8" fill="#ff9fb2" opacity=".6"/><circle cx="136" cy="126" r="8" fill="#ff9fb2" opacity=".6"/>
          <path d="M150 170 Q156 182 150 188 Q144 182 150 170Z" fill="#6ab8f5"/>`);
      default:
        return wrap('<circle cx="100" cy="100" r="80" fill="#ddd"/>');
    }
  }

  // Персонаж-ведущий на экранах похвалы — Язычок.
  function mascot(size) { return pet('tongue', size || 150); }

  // Крот для игры «Бей крота» — свой рисунок.
  function mole() {
    return `<svg class="mole-svg" viewBox="0 0 120 120" width="100%" height="100%">
      <ellipse cx="60" cy="72" rx="42" ry="46" fill="#8a5a3b"/><ellipse cx="60" cy="86" rx="28" ry="26" fill="#b98763"/>
      <circle cx="44" cy="56" r="6" fill="#2b2140"/><circle cx="76" cy="56" r="6" fill="#2b2140"/><circle cx="46" cy="54" r="2" fill="#fff"/><circle cx="78" cy="54" r="2" fill="#fff"/>
      <ellipse cx="60" cy="70" rx="9" ry="7" fill="#ff8fa3"/><path d="M50 82 Q60 90 70 82" stroke="#5b3822" stroke-width="3" fill="none"/>
      <rect x="53" y="84" width="6" height="7" rx="1" fill="#fff"/><rect x="61" y="84" width="6" height="7" rx="1" fill="#fff"/></svg>`;
  }

  // ─────────────────────────────────────────────────────────────
  // КАРТИНКИ FLUENT EMOJI (js/emoji-art.js): питомцы, наряды, игрушки.
  // Рисуем картинкой, а не шрифтом — одинаково на любом компьютере, и наряд точно садится на голову.
  // ─────────────────────────────────────────────────────────────
  const urlCache = {};
  function emojiUrl(name) {
    const lib = typeof window !== 'undefined' ? window.YazychokEmojiArt : null;
    if (!name || !lib || !lib[name]) return '';
    if (!urlCache[name]) {
      try { urlCache[name] = URL.createObjectURL(new Blob([lib[name]], { type: 'image/svg+xml' })); } catch (e) { urlCache[name] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(lib[name])}`; }
    }
    return urlCache[name];
  }
  function emojiImg(name, cls, fallback) {
    const url = emojiUrl(name);
    return url ? `<img class="emoji-img ${cls || ''}" src="${url}" alt="" draggable="false">` : (fallback || '');
  }
  // Значок вещи: картинка, если есть, иначе эмодзи.
  function itemIcon(item, cls) { return item ? emojiImg(item.art, cls, item.emoji) : ''; }

  // Где у питомца голова, сбоку на голове (бантик), глаза и шея.
  // img:true — координаты в долях картинки-эмодзи (она занимает 78% коробки по центру), иначе — в долях коробки (SVG 200×200).
  // head: x,y — середина макушки, w — ширина головы; side: место для бантика/цветочка; eyes: d — расстояние между глазами.
  const TONGUE_FIT = { head: { x: .5, y: .17, w: .5 }, side: { x: .69, y: .19, rot: 22 }, eyes: { x: .5, y: .44, d: .22 }, neck: { x: .5, y: .78, w: .56 } };
  const PET_FIT = {
    tongue: TONGUE_FIT,
    rainbowTongue: TONGUE_FIT,
    fluffy: { head: { x: .5, y: .2, w: .5 }, side: { x: .68, y: .22, rot: 22 }, eyes: { x: .5, y: .49, d: .22 }, neck: { x: .5, y: .8, w: .5 } },
    horny: { head: { x: .5, y: .23, w: .36 }, side: { x: .5, y: .23, rot: 0 }, eyes: { x: .5, y: .48, d: .22 }, neck: { x: .5, y: .78, w: .56 } },
    eyes3: { head: { x: .5, y: .16, w: .5 }, side: { x: .69, y: .18, rot: 22 }, eyes: { x: .5, y: .48, d: .3 }, neck: { x: .5, y: .8, w: .54 } },
    cloudy: { head: { x: .52, y: .3, w: .45 }, side: { x: .7, y: .3, rot: 20 }, eyes: { x: .5, y: .54, d: .2 }, neck: { x: .5, y: .79, w: .58 } },
    'cat-face': { img: true, head: { x: .5, y: .3, w: .6 }, side: { x: .71, y: .29, rot: 20 }, eyes: { x: .5, y: .585, d: .25 }, neck: { x: .5, y: .93, w: .55 } },
    'rabbit-face': { img: true, head: { x: .5, y: .33, w: .5 }, side: { x: .66, y: .36, rot: 22 }, eyes: { x: .505, y: .585, d: .19 }, neck: { x: .5, y: .93, w: .55 } },
    'front-facing-baby-chick': { img: true, head: { x: .5, y: .18, w: .42 }, side: { x: .65, y: .19, rot: 20 }, eyes: { x: .5, y: .335, d: .23 }, neck: { x: .5, y: .5, w: .44 } },
    'mouse-face': { img: true, head: { x: .5, y: .34, w: .48 }, side: { x: .66, y: .36, rot: 20 }, eyes: { x: .5, y: .65, d: .25 }, neck: { x: .5, y: .88, w: .46 } },
    hedgehog: { img: true, head: { x: .33, y: .45, w: .38, rot: -12 }, side: { x: .38, y: .44, rot: -10 }, eyes: { x: .26, y: .6, d: .12 }, neck: { x: .42, y: .72, w: .28 } },
    panda: { img: true, head: { x: .5, y: .2, w: .55 }, side: { x: .72, y: .21, rot: 22 }, eyes: { x: .5, y: .53, d: .25 }, neck: { x: .5, y: .9, w: .6 } },
    'dog-face': { img: true, head: { x: .5, y: .14, w: .5 }, side: { x: .68, y: .15, rot: 20 }, eyes: { x: .495, y: .44, d: .19 }, neck: { x: .5, y: .87, w: .55 } },
    penguin: { img: true, head: { x: .5, y: .2, w: .38 }, side: { x: .62, y: .21, rot: 22 }, eyes: { x: .5, y: .335, d: .1 }, neck: { x: .5, y: .5, w: .42 } },
    fox: { img: true, head: { x: .5, y: .26, w: .48 }, side: { x: .68, y: .27, rot: 20 }, eyes: { x: .5, y: .57, d: .24 }, neck: { x: .5, y: .92, w: .5 } },
    octopus: { img: true, head: { x: .5, y: .1, w: .5 }, side: { x: .67, y: .14, rot: 25 }, eyes: { x: .5, y: .41, d: .3 }, neck: { x: .5, y: .6, w: .55 } },
    unicorn: { img: true, head: { x: .55, y: .29, w: .42, rot: 15 }, side: { x: .55, y: .28, rot: 15 }, eyes: { x: .36, y: .43, d: .12, rot: -25 }, neck: { x: .6, y: .8, w: .44 } },
    'dragon-face': { img: true, head: { x: .44, y: .27, w: .42 }, side: { x: .55, y: .26, rot: 15 }, eyes: { x: .47, y: .47, d: .12 }, neck: { x: .6, y: .86, w: .42 } }
  };

  // Как сидит вещь. k — ширина в долях головы (или шеи); seat — где в картинке точка посадки (доля высоты);
  // ax — точка по горизонтали; clip — какую часть картинки показывать по высоте; lens — расстояние между стёклами очков.
  const WEAR_FIT = {
    'hat-crown': { art: 'crown', kind: 'hat', k: .95, seat: .86 },
    'hat-bow': { art: 'ribbon', kind: 'side', k: .62, seat: .4 },
    'hat-cap': { art: 'billed-cap', kind: 'hat', k: 1.15, seat: .7, ax: .6 },
    'hat-top': { art: 'top-hat', kind: 'hat', k: .95, seat: .86 },
    'hat-grad': { art: 'graduation-cap', kind: 'hat', k: 1.1, seat: .64 },
    'hat-sun': { art: 'womans-hat', kind: 'hat', k: 1.25, seat: .74 },
    'hat-helmet': { art: 'rescue-workers-helmet', kind: 'hat', k: 1.05, seat: .5, clip: [0, .56] },
    'hat-flower': { art: 'cherry-blossom', kind: 'side', k: .5, seat: .5 },
    'hat-star': { art: 'glowing-star', kind: 'side', k: .54, seat: .55 },
    'hat-cherry': { art: 'cherries', kind: 'side', k: .56, seat: .2, ax: .56 },
    'glasses-sun': { art: 'sunglasses', kind: 'eyes', lens: .42, seat: .52 },
    'glasses-round': { art: 'glasses', kind: 'eyes', lens: .46, seat: .5 },
    'glasses-swim': { art: 'goggles', kind: 'eyes', lens: .44, seat: .66, clip: [.42, .92] },
    'neck-scarf': { svg: 'scarf', kind: 'neck', k: 1.08, seat: .3, aspect: .62 },
    'neck-bell': { svg: 'bell', kind: 'neck', k: .95, seat: .22, aspect: .62 },
    'neck-beads': { svg: 'beads', kind: 'neck', k: .95, seat: .2, aspect: .5 },
    'neck-medal': { art: 'sports-medal', kind: 'neck', k: .55, seat: .08 },
    // Игрушки стоят рядом с питомцем (координаты коробки: x — середина, y — низ).
    'toy-bear': { art: 'teddy-bear', kind: 'toy', at: { x: 1.02, y: 1.0, w: .42 }, seat: .93 },
    'toy-ball': { art: 'soccer-ball', kind: 'toy', at: { x: 1.0, y: 1.0, w: .32 }, seat: .94 },
    'toy-kite': { art: 'kite', kind: 'toy', at: { x: 1.08, y: .35, w: .45 }, seat: .9 },
    'toy-wand': { art: 'crystal-ball', kind: 'toy', at: { x: 1.0, y: 1.0, w: .36 }, seat: .94 },
    'toy-balloon': { art: 'balloon', kind: 'toy', at: { x: 1.02, y: .3, w: .4 }, seat: .95, string: true },
    'toy-piano': { art: 'musical-keyboard', kind: 'toy', at: { x: 1.04, y: 1.0, w: .44 }, seat: .86 },
    'toy-drum': { art: 'drum', kind: 'toy', at: { x: 1.02, y: 1.0, w: .4 }, seat: .92 },
    'toy-trumpet': { art: 'trumpet', kind: 'toy', at: { x: 1.04, y: 1.0, w: .42 }, seat: .86 },
    'toy-car': { art: 'automobile', kind: 'toy', at: { x: 1.04, y: 1.0, w: .44 }, seat: .86 },
    'toy-bubbles': { art: 'bubbles', kind: 'toy', at: { x: 1.02, y: .95, w: .4 }, seat: .95 }
  };

  // Свои рисунки для шеи (эмодзи шарфа и бус на шее выглядят странно). viewBox 100×(100·aspect).
  function neckSvg(kind) {
    const wrap = (h, inner) => `<svg viewBox="0 0 100 ${h}" width="100%" height="100%" preserveAspectRatio="none">${inner}</svg>`;
    if (kind === 'scarf') {
      return wrap(62, `<path d="M6 10 Q50 34 94 10 L96 26 Q50 52 4 26Z" fill="#ff4f6d"/>
        <path d="M14 16 L12 31 M28 21 L26 37 M42 24 L41 40 M58 24 L59 40 M72 21 L74 37 M86 16 L88 31" stroke="#fff" stroke-width="3" opacity=".55"/>
        <path d="M64 30 L78 30 L82 58 L66 60Z" fill="#e8385a"/><path d="M66 54 L66 61 M70 54 L70 61 M74 54 L74 61 M78 54 L79 60" stroke="#fff" stroke-width="2" opacity=".6"/>
        <path d="M6 10 Q50 34 94 10" stroke="#c42645" stroke-width="2" fill="none" opacity=".5"/>`);
    }
    if (kind === 'bell') {
      return wrap(62, `<path d="M6 12 Q50 34 94 12 L94 20 Q50 42 6 20Z" fill="#e53950"/>
        <circle cx="50" cy="31" r="4" fill="#b8860b"/>
        <path d="M38 52 Q38 34 50 32 Q62 34 62 52 Q66 54 66 57 L34 57 Q34 54 38 52Z" fill="#ffc83d" stroke="#d9971d" stroke-width="1.6"/>
        <circle cx="50" cy="58" r="3.4" fill="#d9971d"/><path d="M44 40 Q45 36 49 35" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`);
    }
    const colors = ['#ff7eb6', '#ffd166', '#7bdcb5', '#8ab6ff', '#c89bff', '#ff9f6b', '#7bdcb5', '#ffd166', '#ff7eb6'];
    let beads = '';
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8; const x = 8 + t * 84; const y = 10 + Math.sin(t * Math.PI) * 30;
      beads += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 4 ? 9 : 6.5}" fill="${colors[i]}"/><circle cx="${(x - 2).toFixed(1)}" cy="${(y - 2.5).toFixed(1)}" r="2" fill="#fff" opacity=".7"/>`;
    }
    return wrap(50, `<path d="M8 10 Q50 70 92 10" stroke="#9a7b5a" stroke-width="1.5" fill="none"/>${beads}`);
  }

  // Разметка вещи на питомце. petKey — design (SVG-питомец) или art (картинка); null, если вещь не знаем.
  function wearMarkup(petKey, item, extraClass) {
    const wf = item && WEAR_FIT[item.id];
    if (!wf) return null;
    const pf = PET_FIT[petKey] || TONGUE_FIT;
    const k = pf.img ? .78 : 1;
    const tr = p => ({ x: pf.img ? .11 + .78 * p.x : p.x, y: pf.img ? .11 + .78 * p.y : p.y });
    let anchor; let W; let rot = 0;
    if (wf.kind === 'toy') { anchor = wf.at; W = wf.at.w; }
    else if (wf.kind === 'hat') { anchor = tr(pf.head); W = pf.head.w * k * wf.k; rot = pf.head.rot || 0; }
    else if (wf.kind === 'side') { anchor = tr(pf.side); W = pf.head.w * k * wf.k; rot = pf.side.rot || 0; }
    else if (wf.kind === 'eyes') { anchor = tr(pf.eyes); W = (Math.max(pf.eyes.d, .14) * k) / wf.lens; rot = pf.eyes.rot || 0; }
    else { anchor = tr(pf.neck); W = pf.neck.w * k * wf.k; rot = pf.neck.rot || 0; }
    const aspect = wf.aspect || 1;
    const [c0, c1] = wf.clip || [0, 1];
    const ax = wf.ax == null ? .5 : wf.ax;
    const visH = W * aspect * (c1 - c0);
    const left = anchor.x - ax * W;
    const top = anchor.y - (wf.seat - c0) * W * aspect;
    const pct = v => `${(v * 100).toFixed(2)}%`;
    const origin = `${(ax * 100).toFixed(1)}% ${(((wf.seat - c0) / (c1 - c0)) * 100).toFixed(1)}%`;
    const inner = wf.svg ? neckSvg(wf.svg) : emojiImg(wf.art, '', `<span class="wear-fallback">${item.emoji || ''}</span>`);
    const clipped = wf.clip ? `<span class="wear-clip" style="top:${pct(-c0 / (c1 - c0))};height:${pct(1 / (c1 - c0))}">${inner}</span>` : inner;
    const slot = wf.kind === 'toy' ? 'toy' : wf.kind === 'eyes' ? 'glasses' : wf.kind === 'neck' ? 'neck' : 'hat';
    return `<span class="wear fit wear-${slot} item-${item.id} ${wf.clip ? 'clip' : ''} ${extraClass || ''}" style="left:${pct(left)};top:${pct(top)};width:${pct(W)};height:${pct(visH)};transform:rotate(${rot}deg);transform-origin:${origin}">${wf.string ? '<i class="string"></i>' : ''}${clipped}</span>`;
  }

  return { face, pet, mascot, mole, COLORS: C, emojiUrl, emojiImg, itemIcon, wearMarkup, PET_FIT, WEAR_FIT };
});

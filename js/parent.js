(function (root) {
  'use strict';
  const Y = root.Yazychok;
  const data = root.YazychokData;
  const { core, ui, art, sfx, storage, mic } = Y;
  const { esc } = ui;
  Y.screens = Y.screens || {};
  Y.actions = Y.actions || {};
  const A = () => Y.app;
  const S = () => Y.app.state;

  // ─────────────────────────────────────────────────────────────
  // Замок
  // ─────────────────────────────────────────────────────────────
  let lock = null;
  const makeLock = () => { const a = 6 + Math.floor(Math.random() * 7); const b = 4 + Math.floor(Math.random() * 6); return { a, b, answer: a + b, error: false }; };

  Y.actions['parent-lock'] = () => { lock = makeLock(); A().go('parentLock'); };
  Y.screens.parentLock = {
    render: () => `<div class="shell narrow"><section class="card center"><div class="giant">🔐</div><h2>Раздел для мамы</h2>
      <p>Решите пример:</p><div class="math">${lock.a} + ${lock.b} = ?</div>
      <label class="field"><input id="lock-answer" type="number" inputmode="numeric" aria-label="Ответ" autofocus></label>
      ${lock.error ? '<p class="error">Не подошло, попробуйте ещё раз.</p>' : ''}
      <div class="row gap"><button class="btn secondary" data-action="go" data-screen="home">Назад</button><button class="btn" data-action="unlock">Открыть</button></div>
    </section></div>`,
    mount: node => {
      const input = node.querySelector('#lock-answer');
      if (input) { input.focus(); input.addEventListener('keydown', e => { if (e.key === 'Enter') Y.actions.unlock(); }); }
    }
  };
  Y.actions.unlock = () => {
    const value = Number(document.getElementById('lock-answer').value);
    if (value === lock.answer) A().go('parent');
    else { lock.error = true; A().render(); }
  };

  // ─────────────────────────────────────────────────────────────
  // Главная страница мамы
  // ─────────────────────────────────────────────────────────────
  Y.screens.parent = {
    render: () => {
      const s = S();
      const puzzle = s.progress.puzzle;
      const voices = A().speech.getVoices();
      const natural = voices.filter(v => /natural|online/i.test(v.name));
      const suggestions = core.levelSuggestions(s, A().today());
      return `<div class="shell">${A().topbar('Для мамы', 'home')}
        ${suggestions.length ? `<div class="notice good">${suggestions.map(x => `Похоже, звук ${ui.badge(x.sound)} можно поднять на уровень ${x.to}: ${x.sessions} занятий, «красиво» — ${x.goodShare}%. <button class="link" data-action="level-up" data-sound="${x.sound}" data-to="${x.to}">Поднять</button>`).join('<br>')}</div>` : ''}
        <details class="section howto"><summary><b>Как это работает — коротко</b></summary>
          <ul>
            <li>Занятие ≈14 минут (обычное): гимнастика → «где живёт язычок» → игра с микрофоном → 4 игры → внезапный «Грибочек» → стишок или загадки → дыхание носиком → награды. Длину можно поменять ниже.</li>
            <li>Без спешки: пока ребёнок выбирает картинку, ничего не дёргается. Через 25 с задание тихо звучит ещё раз, позже — мягкая подсказка. Простые действия (крутить колесо, открыть коробку) сначала мягко светятся, а через 20 с игра делает их сама.</li>
            <li><b>🎒 Школа</b> (кнопка на главном экране): задания для 1 класса — счёт и «домики чисел», сравнение, отличия, слоги, кусочки пазла, ряды, «что лишнее», тени. Язык — немецкий или русский (ниже, раздел «Школа»). Уровни растут сами; звёзд — не больше 25 в день.</li>
            <li>Разнообразие: через день — <b>тема дня</b> (сказка-гимнастика, день игр, вперемешку, звуковой день); иногда «Угадай упражнение» и просьба сказать слово по-разному (шёпотом, как робот, по слогам…). В гимнастике кнопка <b>🪞 Зеркальце</b> показывает ребёнка рядом с образцом (камера, ничего не записывается).</li>
            <li>Питомцы: <b>все купленные питомцы растут вместе</b> — каждый день занятий каждому +1 шаг 🐾, выбирать не нужно. Выбранный питомец сидит в уголке на занятии, радуется похвале и 1–2 раза за занятие приносит сюрприз (звёзды, еду или наклейку). Сердечки — настроение: кормление, купание, игра, сон. 4–5 сердечек — +3 ⭐ за занятие.</li>
            <li>«Маляр» и «Качели»: в «Гимнастике» выберите вариант «как у логопеда» или запишите своё видео упражнения — ребёнок увидит его вместо мультика.</li>
            <li>Микрофон: «🎯 Настроить под голос» (раздел «Микрофон» ниже) — 20 секунд, и игры лучше отличают «С» от «Ш» и от шума. В «Проверить микрофон» видно, что слышат игры.</li>
            <li>Загадки сами усложняются: 4 картинки → 6 похожих → собрать отгадку из слогов. Уровень можно закрепить ниже.</li>
            <li>Неверное ударение: «Мамин голос» → «Прослушать всё подряд» → «✏️ Ударение не то». Фраза зазвучит голосом браузера с вашим ударением, а список можно скопировать и отправить для исправления.</li>
            <li>Когда внизу появляется ушко 👂 — ребёнок говорит слово. Приложение ждёт настоящее слово (не шум) и проверяет распознаванием, что сказано именно оно. Не то слово — просит повторить; два раза не то — идёт дальше без похвалы. Где был язык, программа не слышит — это решаете вы клавишей <b>2</b>.</li>
            <li>Любимый герой: добавьте картинку и имя ниже — в комнате героя 6 игр: «Научи меня словам», «Найди мою ошибку», «Прятки», «Что я сказал?» (миска — мишка), «Повторюшка» (герой повторяет её голосом) и «Собери рюкзак». Они же иногда попадают в занятие, а герой хвалит своим голосом.</li>
            <li>Ваши клавиши: <b>1</b> — «красиво» (ребёнку звезда), <b>2</b> — «ещё разок» / «язык проскочил», <b>3</b> — пропустить задание, <b>4</b> — вернуть прошлое задание.</li>
            <li>Одна деталь пазла в день. 5 дней за неделю — бонусная деталь. На дорожке сундуки. Звёзды тратятся в магазине на питомцев и вещи.</li>
            <li>Чтобы хотелось вернуться завтра: за <b>первое занятие дня</b> открывается новая глава сказки «Путешествие Язычка» (20 глав, каждая заканчивается «а что дальше?»), выпадает наклейка-сюрприз в альбом (обычная, блестящая или золотая) и подрастает питомец. Второе занятие в тот же день даёт только звёзды — так интерес растягивается на недели.</li>
            <li>Перед некоторыми играми ребёнок сам выбирает одну из двух — выбор повышает интерес. Обе игры тренируют один и тот же звук.</li>
            <li>Игротека открывается только после занятия: «сначала занятие — потом любые игры».</li>
            <li>Звуки и уровни — в разделе ниже. Слова со звуками «не учим» в «говорящих» играх не появятся.</li>
            <li>Любую фразу и любое слово можно перезаписать своим голосом — «Мамин голос».</li>
          </ul>
        </details>
        <section class="section"><h3>Ребёнок и занятие</h3>
          <label class="field">Полное имя<input id="profile-name" value="${esc(s.profile.name)}"></label>
          <div class="chips">${Object.entries(core.LENGTHS).map(([id, info]) => `<button class="chip ${s.settings.length === id ? 'on' : ''}" data-action="set-length" data-v="${id}">${id === 'short' ? 'Короткое' : id === 'normal' ? 'Обычное' : 'Длинное'} ${info.label}</button>`).join('')}</div>
          <div class="row gap wrap small riddle-level">Загадки: ${[['auto', 'сами усложняются'], ['easy', 'лёгкие (4 картинки)'], ['medium', 'средние (6 похожих)'], ['hard', 'трудные (собрать из слогов)']].map(([v, t]) => `<button class="chip ${(s.settings.riddleLevel || 'auto') === v ? 'on' : ''}" data-action="riddle-level" data-v="${v}">${t}</button>`).join('')}</div>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="dayThemes" ${s.settings.dayThemes !== false ? 'checked' : ''}> Темы дня: через день занятие немного другое (сказка-гимнастика, день игр, вперемешку, звуковой день)</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="sayStyles" ${s.settings.sayStyles !== false ? 'checked' : ''}> Иногда просить сказать слово по-разному (шёпотом, громко, как робот, по слогам…)</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="lockCheck" ${s.settings.lockCheck !== false ? 'checked' : ''}> Внезапная «Проверка замка» (Грибочек посреди игр)</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="breath" ${s.settings.breath !== false ? 'checked' : ''}> В конце — дыхание носиком (губы сомкнуты, язык в домике): 5 медленных вдохов, около минуты</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="choice" ${s.settings.choice !== false ? 'checked' : ''}> Ребёнок сам выбирает игру из двух</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="homeVoice" ${s.settings.homeVoice !== false ? 'checked' : ''}> Питомец зовёт заниматься голосом на главном экране</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="sfx" ${s.settings.sfx !== false ? 'checked' : ''}> Звуковые эффекты (хлопки, звоночки)</label>
        </section>
        ${Y.heroSettingsMarkup ? Y.heroSettingsMarkup() : ''}
        ${Y.schoolCore ? (() => {
          const sc = Y.schoolCore.ensure(s);
          const lg = s.settings.schoolLang === 'ru' ? 'ru' : 'de';
          return `<section class="section school-settings"><h3>🎒 Школа (1 класс)</h3>
          <p class="muted small">Отдельный раздел на главном экране: счёт, сравнение, отличия, слоги, пазлы, ряды, «что лишнее», тени. 6 заданий подряд, внизу — полоска набора. Звёзды — за задания с первого раза, не больше ${Y.schoolCore.DAILY_STAR_CAP} в день.</p>
          <div class="row gap wrap small">Язык заданий: <button class="chip ${lg === 'de' ? 'on' : ''}" data-action="school-lang" data-lang="de">🇩🇪 Deutsch (как в школе)</button><button class="chip ${lg === 'ru' ? 'on' : ''}" data-action="school-lang" data-lang="ru">🇷🇺 Русский</button></div>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="school" ${s.settings.school !== false ? 'checked' : ''}> Показывать «Школу» на главном экране</label>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="schoolAfter" ${s.settings.schoolAfter === true ? 'checked' : ''}> Школа открывается только после занятия с язычком</label>
          <div class="school-levels">${Y.schoolCore.TYPES.map(t => `<div class="school-level"><span>${t.icon} ${esc(t.ru)}</span><button class="chip" data-action="school-level" data-type="${t.id}" data-d="-1" aria-label="Проще">−</button><b>${sc.levels[t.id]}/${t.maxLevel}</b><button class="chip" data-action="school-level" data-type="${t.id}" data-d="1" aria-label="Сложнее">+</button><small class="muted">${sc.stats[t.id].tasks ? `${Math.round((sc.stats[t.id].firstTry / sc.stats[t.id].tasks) * 100)}% с первого раза` : ''}</small></div>`).join('')}</div>
          <p class="muted small">Уровни растут сами: набор почти без ошибок — уровень выше, много ошибок — ниже. Счёт: 1 — до 5 с точками, 2 — до 10 и «домики чисел», 3 — до 20 без перехода, 4 — с переходом через десяток.</p>
          </section>`;
        })() : ''}
        <div class="grid2">
          <button class="menu-card" data-action="go" data-screen="sounds"><span>🔤</span>Звуки и уровни<small>${data.SOUND_ORDER.filter(x => core.levelOf(s, x) >= 1).map(x => ui.soundLabel(x)).join(' ')}</small></button>
          <button class="menu-card" data-action="go" data-screen="stats"><span>📊</span>Статистика<small>что повторяли, трудные слова</small></button>
          <button class="menu-card" data-action="go" data-screen="exercises"><span>👅</span>Гимнастика<small>${s.exercises.filter(x => x.enabled).length} включено</small></button>
          <button class="menu-card" data-action="go" data-screen="voice"><span>🎙</span>Мамин голос<small>записать свои фразы</small></button>
          <button class="menu-card" data-action="go" data-screen="arcade" data-preview="1"><span>🕹️</span>Все игры<small>попробовать любую</small></button>
          <button class="menu-card" data-action="go" data-screen="fun"><span>🎭</span>Стишки и загадки<small>${data.POEMS.length} стишков, ${data.RIDDLES.length} загадок</small></button>
        </div>
        <section class="section"><h3>Микрофон</h3>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="micEnabled" ${s.settings.micEnabled !== false ? 'checked' : ''}> Слушать ребёнка (автопереход после «Скажи!»)</label>
          <label class="field">Когда засчитывать сказанное слово
            <select data-change="check-mode">
              <option value="asr" ${A().checkMode() === 'asr' ? 'selected' : ''}>Проверять, что сказано именно это слово (без интернета)</option>
              <option value="mom" ${A().checkMode() === 'mom' ? 'selected' : ''}>Решает мама после каждого слова (1 — красиво, 2 — ещё раз, пробел — дальше)</option>
              <option value="voice" ${A().checkMode() === 'voice' ? 'selected' : ''}>Любой голос нужной длины (как раньше, но строже)</option>
            </select></label>
          <p class="muted small" id="asr-status">${asrStatus()}</p>
          <p class="muted small">Распознавание понимает, <b>какое</b> слово сказано, но не видит, где был язык. Если язык проскочил — нажмите <b>2</b>: попросит сказать ещё раз. Не то слово два раза — идём дальше без похвалы.</p>
          <button class="btn secondary small" data-action="asr-test">🧪 Проверить распознавание</button>
          <div class="asr-test" hidden></div>
          <label class="field">Чувствительность: <b id="sens-val">${s.settings.micSensitivity}</b>
            <input type="range" min="1" max="5" step="1" value="${s.settings.micSensitivity}" data-change="mic-sens"></label>
          <p class="muted small">Если игра идёт дальше сама без слов — уменьшите. Если не слышит ребёнка — увеличьте.</p>
          <button class="btn secondary small" data-action="mic-test">🎤 Проверить микрофон</button>
          <div class="mic-test" hidden><div class="mt-row">Голос <span class="mt-bar"><i data-mt="voice"></i></span></div><div class="mt-row">Свист/шипение <span class="mt-bar hiss"><i data-mt="hiss"></i></span></div>
            <div class="mt-hear">Слышу: <b data-mt="label">тишина</b></div>
            <p class="muted small">Скажите «ааа» — загорится верхняя полоса. Скажите «ссс» — нижняя. Внизу видно, что именно слышат игры: «С», «Ш», «З/Ж», голос или шум (хлопок, стук).</p></div>
          <div class="mic-profile">
            <button class="btn secondary small" data-action="mic-calibrate">🎯 Настроить под голос ${esc(A().childName())}</button>
            ${s.settings.micProfile ? `<span class="good-text small">✓ настроено ${esc(s.settings.micProfile.date || '')}</span> <button class="link" data-action="mic-calibrate-reset">сбросить</button>` : '<span class="muted small">20 секунд: ребёнок тянет «ссс» и «шшш» — игры лучше отличают звуки друг от друга и от шума.</span>'}
          </div>
        </section>
        <section class="section"><h3>Ваши оценки во время занятия</h3>
          <label class="check"><input type="checkbox" data-change="toggle-setting" data-key="momKeys" ${s.settings.momKeys !== false ? 'checked' : ''}> Включить клавиши</label>
          <p class="muted"><b>1</b> — «красиво»: слово засчитано, ребёнку звезда и искры · <b>2</b> — пока ребёнок на слове (горит ушко 👂): «ещё разок, язычок за зубками» и слово звучит снова; после — только отметка «проскочил» в статистику · <b>пробел</b> — «сказала», засчитать без проверки · <b>3</b> — пропустить текущее задание (скучно или трудно) · <b>4</b> или ↩ вверху — вернуть прошлое задание (можно нажать и на значок пройденного задания в полосе шагов).</p>
        </section>
        <section class="section"><h3>Подарок</h3>
          <label class="field">Название<input id="puzzle-title" value="${esc(puzzle.title)}" placeholder="Например: кукла-сюрприз"></label>
          <div class="chips"><button class="chip ${puzzle.size === 12 ? 'on' : ''}" data-action="puzzle-size" data-size="12">12 деталей</button><button class="chip ${puzzle.size === 16 ? 'on' : ''}" data-action="puzzle-size" data-size="16">16 деталей</button></div>
          <p class="muted">Открыто ${puzzle.pieces} из ${puzzle.size}. Размер меняется, пока не открыта ни одна деталь.</p>
          <div class="row gap wrap"><button class="btn secondary small" data-action="gift-upload">🖼 Фото подарка</button><button class="btn secondary small" data-action="new-puzzle">↺ Новый подарок</button></div>
        </section>
        <section class="section"><h3>Голос озвучки</h3>
          <div class="chips"><button class="chip ${s.settings.voiceSource === 'browser' ? '' : 'on'}" data-action="voice-source" data-v="clips">Готовые записи (нейросеть, без интернета)</button><button class="chip ${s.settings.voiceSource === 'browser' ? 'on' : ''}" data-action="voice-source" data-v="browser">Голос браузера (нужен интернет)</button></div>
          <p class="muted small">В Edge есть естественные голоса «Светлана» и «Дарья» — они звучат приятнее, ударения у них обычно правильные. Нужен интернет; если его нет — сама собой звучит готовая запись. Ваши записи («Мамин голос») звучат в любом режиме. Звуки ССС/ЗЗЗ и голос героя — всегда из записей.</p>
          ${natural.length ? `<div class="voice-compare"><b>Сравните:</b> <button class="btn secondary small" data-action="voice-compare" data-v="clips">▶ Готовая запись</button>${natural.slice(0, 3).map(v => `<button class="btn secondary small" data-action="voice-compare" data-v="${esc(v.name)}">▶ ${esc(shortVoice(v.name))}</button>`).join('')}</div>` : '<p class="muted small">Естественных голосов не найдено: откройте «Язычок» в Microsoft Edge — там они есть.</p>'}
          <label class="field"><select data-change="tts-voice">${voices.length ? voices.map(v => `<option value="${esc(v.name)}" ${v.name === s.settings.ttsVoice ? 'selected' : ''}>${esc(v.name)}</option>`).join('') : '<option>Русский голос браузера</option>'}</select></label>
          <button class="btn secondary small" data-action="tts-test">🔊 Проверить</button>
        </section>
        <section class="section"><h3>Данные</h3>
          <div class="row gap wrap">
            <button class="btn secondary small" data-action="report">📄 Отчёт логопеду</button>
            <button class="btn secondary small" data-action="go" data-screen="childrec">🎧 Записи ребёнка</button>
            <button class="btn secondary small" data-action="backup-export">💾 Резервная копия</button>
            <button class="btn secondary small" data-action="backup-import">📥 Импорт копии</button>
          </div>
          <p class="muted small">Всё хранится только в этом браузере. Резервная копия нужна для переноса на другой компьютер.</p>
        </section>
      </div>`;
    },
    unmount: () => { stopMicTest(); saveInputs(); }
  };

  function saveInputs() {
    const name = document.getElementById('profile-name');
    const title = document.getElementById('puzzle-title');
    if (name && name.value.trim()) S().profile.name = name.value.trim();
    if (title) S().progress.puzzle.title = title.value.trim();
    A().applySettings();
    A().save();
  }

  Y.actions['set-length'] = btn => { saveInputs(); S().settings.length = btn.dataset.v; A().save(); A().render(); };
  function asrStatus() {
    if (A().checkMode() !== 'asr') return '';
    const st = Y.asr ? Y.asr.state() : 'failed';
    if (st === 'ready') return '✅ Распознавание готово.';
    if (st === 'loading') return '⏳ Распознавание загружается (несколько секунд)…';
    if (st === 'failed') return `⚠️ Распознавание не загрузилось${Y.asr && Y.asr.error() ? ` (${Y.asr.error()})` : ''} — засчитываем голос нужной длины.`;
    return '⏳ Распознавание загрузится при первом занятии.';
  }
  if (Y.asr) Y.asr.onState(() => { const node = document.getElementById('asr-status'); if (node) node.textContent = asrStatus(); });

  Y.actions['check-mode'] = select => {
    S().settings.checkMode = select.value;
    A().save();
    if (select.value === 'asr') A().loadAsr();
    const node = document.getElementById('asr-status');
    if (node) node.textContent = asrStatus();
  };

  // Мама говорит слово — видно, что услышало распознавание.
  Y.actions['asr-test'] = async btn => {
    const box = document.querySelector('.asr-test');
    if (!box || btn.dataset.busy) return;
    btn.dataset.busy = '1';
    box.hidden = false;
    const mic = Y.mic;
    if (!(await mic.start())) { box.textContent = 'Микрофон недоступен.'; delete btn.dataset.busy; return; }
    box.textContent = 'Загружаю распознавание…';
    const ok = await A().loadAsr();
    if (!ok) { box.textContent = asrStatus() || 'Включите режим «Проверять слово».'; delete btn.dataset.busy; return; }
    Y.asr.warm();
    const pool = core.shuffled(data.WORDS.filter(w => w.targets.length && !w.text.includes(' ')), Math.random).slice(0, 3);
    for (const word of pool) {
      box.innerHTML = `Скажите: <b>${esc(word.text)}</b> 👂`;
      const run = Y.asr.begin(word.text);
      const res = await mic.listen({ timeoutMs: 6000, endSilenceMs: 600, minVoicedMs: 200 }).promise;
      const verdict = run ? await run.finish() : { match: false, texts: [] };
      box.innerHTML = `Скажите: <b>${esc(word.text)}</b> — ${res.heard ? `услышано: «${esc(verdict.texts.join(' ') || '—')}» ${verdict.match ? '✅' : '❌'}` : 'тишина'}`;
      await new Promise(resolve => setTimeout(resolve, 1600));
    }
    box.innerHTML += '<br><span class="muted small">Попробуйте сказать другое слово или кашлянуть — должно быть ❌.</span>';
    mic.release();
    delete btn.dataset.busy;
  };

  const shortVoice = name => String(name).replace(/^Microsoft\s+/, '').replace(/\s+Online.*$/, '').replace(/\s*-\s*Russian.*$/, '');
  Y.actions['voice-compare'] = btn => {
    const sp = A().speech;
    const phrase = `${A().childName()}, молодец! Скажи: белка, сова, цапля.`;
    if (btn.dataset.v === 'clips') sp.play([sp.line('praiseName'), sp.line('say')], { interrupt: true });
    else sp.testTts(phrase, btn.dataset.v);
  };
  Y.actions['voice-source'] = btn => {
    S().settings.voiceSource = btn.dataset.v === 'browser' ? 'browser' : 'clips';
    // Голос браузера: сразу выбираем самый естественный («Светлана»/«Дарья»), если он есть.
    if (S().settings.voiceSource === 'browser') {
      const best = A().speech.bestVoice();
      const cur = A().speech.voices().find(v => v.name === S().settings.ttsVoice);
      if (best && (!cur || !/natural|online/i.test(cur.name))) S().settings.ttsVoice = best.name;
    }
    A().applySettings();
    A().save();
    A().render();
    const sp = A().speech;
    sp.play(sp.line('praiseName'), { interrupt: true });
  };

  Y.actions['riddle-level'] = btn => { S().settings.riddleLevel = btn.dataset.v; A().save(); A().render(); };
  Y.actions['toggle-setting'] = input => { S().settings[input.dataset.key] = input.checked; A().applySettings(); A().save(); };
  Y.actions['mic-sens'] = input => { S().settings.micSensitivity = Number(input.value); document.getElementById('sens-val').textContent = input.value; A().applySettings(); A().save(); };
  Y.actions['tts-voice'] = select => { S().settings.ttsVoice = select.value; A().applySettings(); A().save(); };
  Y.actions['tts-test'] = () => A().speech.testTts(`${A().childName()}, послушай: сова, цапля, шапка.`);

  let micTestUnsub = null;
  function stopMicTest() { if (micTestUnsub) { micTestUnsub(); micTestUnsub = null; mic.release(5000); } }
  Y.actions['mic-test'] = async () => {
    const box = document.querySelector('.mic-test');
    if (micTestUnsub) { stopMicTest(); box.hidden = true; return; }
    const ok = await mic.start();
    if (!ok) { ui.toast('Микрофон недоступен. Разрешите доступ в адресной строке браузера.'); return; }
    box.hidden = false;
    micTestUnsub = mic.subscribe(frame => {
      const v = document.querySelector('[data-mt="voice"]');
      const h = document.querySelector('[data-mt="hiss"]');
      if (!v) { stopMicTest(); return; }
      v.style.width = `${Math.round(frame.level * 100)}%`; v.classList.toggle('on', frame.voice);
      h.style.width = `${Math.round(frame.hissLevel * 100)}%`; h.classList.toggle('on', frame.hiss);
      // Подпись «что слышу» держится 300 мс, чтобы её успеть прочитать.
      const label = mic.frameLabel ? mic.frameLabel(frame) : 'quiet';
      const node = document.querySelector('[data-mt="label"]');
      const now = Date.now();
      if (node && (label !== 'quiet' || now - (node._at || 0) > 300)) {
        if (label !== node.dataset.l) { node.dataset.l = label; node.textContent = HEAR[label] || label; node.className = `hear-${label}`; }
        if (label !== 'quiet') node._at = now;
      }
    });
  };
  const HEAR = { quiet: 'тишина', app: 'голос приложения', s: 'С (свист)', sh: 'Ш (шипение)', zh: 'З / Ж (звонко)', voice: 'голос (а, л, р…)', noise: 'шум — не звук игры' };

  // ── Настройка микрофона под голос ребёнка ──
  Y.actions['mic-calibrate'] = async () => {
    stopMicTest();
    const ok = await mic.start();
    if (!ok) { ui.toast('Микрофон недоступен. Разрешите доступ в адресной строке браузера.'); return; }
    const name = A().childName();
    const steps = [
      { id: 'silence', title: 'Тишина', text: 'Пару секунд тишины — микрофон запоминает шум комнаты.', ms: 2000, auto: true },
      { id: 's', title: '«ССС»', text: `${name}, улыбнись и тяни долго: «сссссс». Как насос!`, ms: 3500, model: 'с' },
      { id: 'sh', title: '«ШШШ»', text: 'Теперь губки трубочкой: «шшшшшш». Как змейка!', ms: 3500, model: 'ш', skip: true }
    ];
    const rec = {};
    const m = ui.modal(`<h3>🎯 Настройка под голос</h3><div class="cal-steps">${steps.map(st => `<span data-cal="${st.id}">${st.title}</span>`).join('')}</div>
      <p class="cal-text"></p><div class="mg-meter cal-meter"><i></i></div><p class="cal-count"></p>
      <div class="row gap center-row cal-buttons"></div>`, { dismissible: false });
    const text = m.node.querySelector('.cal-text'); const count = m.node.querySelector('.cal-count'); const buttons = m.node.querySelector('.cal-buttons');
    const meter = m.node.querySelector('.cal-meter i');
    const unsubMeter = mic.subscribe(f => { meter.style.width = `${Math.round(Math.max(f.level, f.hissLevel) * 100)}%`; });
    const close = () => { unsubMeter(); m.close(); mic.release(3000); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const ask = (html) => new Promise(resolve => { buttons.innerHTML = html; buttons.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => resolve(b.dataset.c); }); });
    for (const st of steps) {
      m.node.querySelectorAll('[data-cal]').forEach(n => n.classList.toggle('now', n.dataset.cal === st.id));
      text.textContent = st.text;
      if (!st.auto) {
        if (st.model) A().speech.play(A().speech.snd(st.model), { interrupt: true });
        const choice = await ask(`<button class="btn" data-c="go">● Записать</button>${st.skip ? '<button class="btn secondary" data-c="skip">Пока не получается — пропустить</button>' : ''}<button class="btn secondary" data-c="cancel">Отмена</button>`);
        if (choice === 'cancel') { close(); return; }
        if (choice === 'skip') { m.node.querySelector(`[data-cal="${st.id}"]`).classList.add('skipped'); continue; }
      }
      buttons.innerHTML = '';
      const frames = [];
      const unsub = mic.subscribe(f => { frames.push({ hiss: f.hiss, voice: f.voice, hissRatio: f.hissRatio, centroid: f.centroid, energy: f.energy, suppressed: f.suppressed }); });
      const end = Date.now() + st.ms;
      while (Date.now() < end) { count.textContent = `${Math.ceil((end - Date.now()) / 1000)}…`; await wait(200); }
      unsub();
      count.textContent = '';
      rec[st.id] = frames;
      m.node.querySelector(`[data-cal="${st.id}"]`).classList.add('done');
    }
    const result = mic.analyzeCalibration ? mic.analyzeCalibration(rec) : (Y.micLib && Y.micLib.analyzeCalibration(rec));
    m.node.dataset.debug = JSON.stringify(Object.assign({}, result, { n: { s: (rec.s || []).filter(f => f.hiss).length, sh: (rec.sh || []).filter(f => f.hiss).length } }));
    if (!result || !result.ok) {
      text.textContent = `Не получилось: ${result ? result.reason : 'нет данных'}`;
      const again = await ask('<button class="btn" data-c="again">Ещё раз</button><button class="btn secondary" data-c="cancel">Закрыть</button>');
      close();
      if (again === 'again') Y.actions['mic-calibrate']();
      return;
    }
    S().settings.micProfile = Object.assign({ date: A().today() }, result.profile);
    A().save(); A().applySettings();
    const low = result.profile.sC < 5000;
    text.textContent = `Готово! Теперь игры лучше отличают «С»${result.profile.shC ? ' от «Ш»' : ''} и от шума.${low ? ' Заметка: «С» звучит низковато, почти как «Ш» — так бывает, когда язык между зубами. Игры будут принимать такой звук; если хотите строже — повторите настройку, когда «С» получится чище.' : ''} Проверить можно ниже: «Проверить микрофон» — там видно, что слышат игры.`;
    await ask('<button class="btn" data-c="ok">Хорошо</button>');
    close();
    A().render();
  };
  Y.actions['mic-calibrate-reset'] = () => { delete S().settings.micProfile; A().save(); A().applySettings(); A().render(); };

  Y.actions['puzzle-size'] = btn => {
    saveInputs();
    if (S().progress.puzzle.pieces > 0) { ui.toast('Размер меняется только для нового подарка'); return; }
    S().progress.puzzle.size = Number(btn.dataset.size);
    A().save(); A().render();
  };
  Y.actions['gift-upload'] = () => { saveInputs(); A().giftInput.click(); };
  Y.actions['new-puzzle'] = async () => {
    saveInputs();
    const ok = await ui.confirmBox('Начать новый подарок? Детали пазла закроются, дорожка начнётся заново. Звёзды, питомцы и медали останутся.', 'Начать заново', 'Отмена');
    if (!ok) return;
    const p = S().progress.puzzle;
    Object.assign(p, { pieces: 0, lastUnlockDate: '', complete: false, chestsOpened: [] });
    A().save(); A().render();
    ui.toast('Новый подарок! Загрузите фото, если нужно.');
  };
  Y.actions.report = () => {
    saveInputs();
    const text = Y.report.buildTherapistReport(S(), { data, today: A().today() });
    ui.downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `otchet-logopedu-${A().today()}.txt`);
    ui.toast('Отчёт сохранён в «Загрузки»');
  };
  Y.actions['backup-export'] = () => { saveInputs(); return A().exportBackup(false); };
  Y.actions['backup-import'] = () => { saveInputs(); A().backupInput.click(); };
  Y.actions['level-up'] = btn => setLevel(btn.dataset.sound, Number(btn.dataset.to));

  function setLevel(sound, level) {
    const s = S();
    const before = core.levelOf(s, sound);
    s.settings.levels[sound] = level;
    s.progress.levelSince[sound] = A().today();
    if (level > before && before >= 1) s.progress.stats.levelUps = (s.progress.stats.levelUps || 0) + 1;
    core.newMedals(s, A().today());
    A().save();
    A().render();
  }

  // ─────────────────────────────────────────────────────────────
  // Звуки и уровни
  // ─────────────────────────────────────────────────────────────
  Y.screens.sounds = {
    render: () => {
      const s = S();
      const rows = data.SOUND_ORDER.map(sound => {
        const level = core.levelOf(s, sound);
        const info = s.progress.stats.sounds[sound];
        return `<div class="sound-row">${ui.badge(sound, 'big')}
          <div class="seg">${data.LEVELS.map(l => `<button class="seg-btn ${level === l.value ? 'on' : ''}" data-action="set-level" data-sound="${sound}" data-v="${l.value}" title="${esc(l.hint)}">${esc(l.short)}</button>`).join('')}</div>
          <small class="muted">${info ? `сказано ${info.said}` : ''}</small></div>`;
      }).join('');
      const pairs = data.PAIRS.map(pair => `<button class="chip ${s.settings.pairs[pair.id] ? 'on' : ''}" data-action="toggle-pair" data-id="${pair.id}">${esc(ui.soundLabel(pair.a))} — ${esc(ui.soundLabel(pair.b))}</button>`).join('');
      return `<div class="shell">${A().topbar('Звуки и уровни', 'parent')}
        <section class="section">
          <p class="muted"><b>хорошо</b> — говорит правильно, слова с этим звуком можно везде · <b>не учим</b> — трудный, в «говорящих» играх его не будет · <b>слоги</b> — звук, слоги и микрофонные игры · <b>слова</b> — слова в начале, середине, конце · <b>фразы</b> — чистоговорки и фразы.</p>
          <p class="muted">Каждое занятие берёт один звук уровня «слова/фразы» (давно не тренированный) и один звук уровня «слоги».</p>
          ${rows}
        </section>
        <section class="section"><h3>Различение пар</h3><p class="muted">Игры «Разложи по домикам», лента и шарики будут смешивать эти звуки.</p><div class="chips">${pairs}</div></section>
      </div>`;
    }
  };
  Y.actions['set-level'] = btn => setLevel(btn.dataset.sound, Number(btn.dataset.v));
  Y.actions['toggle-pair'] = btn => { const p = S().settings.pairs; p[btn.dataset.id] = !p[btn.dataset.id]; A().save(); A().render(); };

  // ─────────────────────────────────────────────────────────────
  // Гимнастика: редактор
  // ─────────────────────────────────────────────────────────────
  Y.screens.exercises = {
    render: () => {
      const s = S();
      const rows = s.exercises.map((ex, i) => {
        const amountLabel = ex.mode === 'reps' ? 'повторов' : ex.mode === 'hold' ? 'секунд' : 'раз';
        return `<div class="ex-row ${ex.enabled ? '' : 'off'}">
          <div class="ex-face">${art.face(Object.assign({ size: 90 }, ex.face || { mouth: 'closed' }))}</div>
          <div class="grow"><b>${ex.emoji} ${esc(ex.name)}</b>${ex.fixed ? ' <small class="pill small">всегда первым</small>' : ''}
            <p class="muted small">${esc(ex.mom || '')}</p>
            <div class="row gap wrap small">
              <label>${amountLabel}: <input type="number" min="1" max="120" value="${ex.amount}" data-change="ex-amount" data-i="${i}" class="num"></label>
              ${ex.mode === 'holdReps' ? `<label>по <input type="number" min="2" max="30" value="${ex.hold || 5}" data-change="ex-hold" data-i="${i}" class="num"> сек${ex.id === 'mushroom' && !ex.edited ? ' (растёт само: 5→10)' : ''}</label>` : ''}
              ${ex.mode === 'reps' ? `<label>темп: <select data-change="ex-beat" data-i="${i}">${[[2.4, 'быстрее'], [3, 'спокойно'], [4, 'медленно']].map(([v, t]) => `<option value="${v}" ${Math.abs((ex.beat || 2.4) - v) < 0.01 ? 'selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
            </div>
            ${ex.variants ? `<div class="row gap wrap small ex-variant">Как у логопеда: ${Object.entries(ex.variants).map(([key, v]) => `<label class="check"><input type="radio" name="var-${ex.id}" value="${key}" data-change="ex-variant" data-i="${i}" ${ex.variant === key ? 'checked' : ''}> ${esc(v.label)}</label>`).join('')}</div>` : ''}
            <div class="row gap wrap small ex-video-row" data-ex-video="${ex.id}">
              <span class="muted">🎬 Своё видео:</span>
              <button class="btn secondary small" data-action="ex-video-record" data-i="${i}">🎥 Записать с камеры</button>
              <button class="btn secondary small" data-action="ex-video-file" data-i="${i}">📁 Выбрать файл</button>
              <span class="ex-video-state"></span>
            </div>
          </div>
          <div class="ex-ctrl">
            ${ex.fixed ? '' : `<button class="mini" data-action="ex-up" data-i="${i}" aria-label="Выше">↑</button>`}
            ${ex.fixed ? '' : `<button class="toggle ${ex.enabled ? 'on' : ''}" data-action="ex-toggle" data-i="${i}" aria-label="Включить"></button>`}
          </div></div>`;
      }).join('');
      setTimeout(markExerciseVideos, 0);
      return `<div class="shell">${A().topbar('Гимнастика', 'parent')}
        <div class="notice">Если упражнение у логопеда делается иначе, чем на картинке, — выберите вариант «как у логопеда» или запишите своё видео: ребёнок увидит его вместо мультика.</div>
        <div class="notice">«Грибочек» всегда первый. Каждый день берутся 3–5 включённых упражнений по очереди. Упражнения из плана логопеда (осанка, ватка, палочка, жевание, тренажёр, иголочка, массаж) выключены — включайте, когда нужно.</div>
        <section class="section">${rows}</section>
        <section class="section"><h3>Своё упражнение</h3>
          <label class="field">Название<input id="ex-name"></label>
          <label class="field">Что сказать ребёнку (коротко)<input id="ex-child"></label>
          <label class="field">Пояснение для себя<textarea id="ex-mom"></textarea></label>
          <div class="row gap wrap"><label class="field">Эмодзи<input id="ex-emoji" value="🙂" maxlength="4"></label>
          <label class="field">Режим<select id="ex-mode"><option value="reps">Повторы в ритм</option><option value="hold">Удержание, сек</option></select></label>
          <label class="field">Сколько<input id="ex-amount" type="number" min="1" max="120" value="8"></label></div>
          <button class="btn" data-action="ex-add">Добавить</button>
        </section></div>`;
    }
  };
  // Есть ли у упражнения своё видео — показываем «▶ посмотреть / убрать».
  async function markExerciseVideos() {
    const rows = document.querySelectorAll('[data-ex-video]');
    if (!rows.length) return;
    const list = await Y.storage.listBlobs('assets').catch(() => []);
    const have = new Set(list.map(r => r.id));
    rows.forEach(row => {
      const id = row.dataset.exVideo;
      const i = S().exercises.findIndex(x => x.id === id);
      const state = row.querySelector('.ex-video-state');
      state.innerHTML = have.has(`exvideo:${id}`)
        ? `<b class="good-text">✓ видео есть</b> <button class="btn secondary small" data-action="ex-video-view" data-i="${i}">▶ посмотреть</button> <button class="btn secondary small" data-action="ex-video-remove" data-i="${i}">убрать</button>`
        : '';
    });
  }
  async function saveExerciseVideo(ex, blob, name) {
    if (blob.size > 60 * 1024 * 1024) { ui.toast('Видео слишком большое (больше 60 МБ) — обрежьте до 10–20 секунд'); return; }
    await Y.storage.putBlob('assets', `exvideo:${ex.id}`, blob, { filename: name || 'video', type: blob.type });
    ui.toast(`Видео для «${ex.name}» сохранено`, 'good');
    markExerciseVideos();
  }
  Y.actions['ex-video-file'] = btn => {
    const ex = S().exercises[Number(btn.dataset.i)];
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/*';
    input.onchange = () => { const file = input.files && input.files[0]; if (file) saveExerciseVideo(ex, file, file.name); };
    input.click();
  };
  Y.actions['ex-video-record'] = async btn => {
    const ex = S().exercises[Number(btn.dataset.i)];
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false }); }
    catch (error) { ui.toast('Камера недоступна — можно выбрать готовое видео файлом'); return; }
    const m = ui.modal(`<h3>🎥 ${esc(ex.name)}</h3><p class="muted small">Покажите упражнение крупно, лицо прямо в камеру. 10–20 секунд хватит.</p>
      <video class="rec-preview live" autoplay muted playsinline></video>
      <div class="row gap center-row"><button class="btn" data-rec="start">⏺ Записать</button><button class="btn secondary" data-rec="cancel">Отмена</button></div>`, { dismissible: false });
    const video = m.node.querySelector('video'); video.srcObject = stream;
    const startBtn = m.node.querySelector('[data-rec="start"]');
    let recorder = null; let chunks = []; let timer = null;
    const close = () => { clearTimeout(timer); stream.getTracks().forEach(t => t.stop()); m.close(); };
    m.node.querySelector('[data-rec="cancel"]').onclick = () => { if (recorder && recorder.state === 'recording') { recorder.onstop = null; recorder.stop(); } close(); };
    startBtn.onclick = () => {
      if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
      chunks = [];
      try { recorder = new MediaRecorder(stream); } catch (error) { ui.toast('Запись видео не поддерживается'); close(); return; }
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' }); close(); if (blob.size) saveExerciseVideo(ex, blob, 'camera.webm'); };
      recorder.start();
      startBtn.textContent = '⏹ Готово';
      timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 30000);
    };
  };
  Y.actions['ex-video-view'] = async btn => {
    const ex = S().exercises[Number(btn.dataset.i)];
    const rec = await Y.storage.getBlob('assets', `exvideo:${ex.id}`);
    if (!rec) return;
    const url = URL.createObjectURL(rec.blob);
    const m = ui.modal(`<video class="rec-preview" src="${url}" autoplay loop muted playsinline controls></video><div class="row center-row"><button class="btn" data-close>Закрыть</button></div>`);
    m.node.querySelector('[data-close]').onclick = () => { URL.revokeObjectURL(url); m.close(); };
  };
  Y.actions['ex-video-remove'] = async btn => {
    const ex = S().exercises[Number(btn.dataset.i)];
    const ok = await ui.confirmBox(`Убрать своё видео для «${ex.name}»? Снова будет мультик.`, 'Убрать', 'Оставить');
    if (!ok) return;
    await Y.storage.deleteBlob('assets', `exvideo:${ex.id}`).catch(() => {});
    markExerciseVideos();
  };
  Y.actions['ex-variant'] = input => {
    const ex = S().exercises[Number(input.dataset.i)];
    Y.core.applyVariant(ex, input.value);
    A().save(); A().render();
    A().speech.play(A().speech.exercise(ex), { interrupt: true });
  };
  Y.actions['ex-beat'] = input => { const ex = S().exercises[Number(input.dataset.i)]; ex.beat = Number(input.value) || 3; ex.edited = true; A().save(); };
  Y.actions['ex-toggle'] = btn => { const ex = S().exercises[Number(btn.dataset.i)]; ex.enabled = !ex.enabled; A().save(); A().render(); };
  Y.actions['ex-up'] = btn => {
    const i = Number(btn.dataset.i); const list = S().exercises;
    if (i <= 1) return;
    [list[i - 1], list[i]] = [list[i], list[i - 1]];
    A().save(); A().render();
  };
  Y.actions['ex-amount'] = input => { const ex = S().exercises[Number(input.dataset.i)]; ex.amount = Math.max(1, Math.min(120, Number(input.value) || ex.amount)); ex.edited = true; A().save(); };
  Y.actions['ex-hold'] = input => { const ex = S().exercises[Number(input.dataset.i)]; ex.hold = Math.max(2, Math.min(30, Number(input.value) || 5)); ex.edited = true; A().save(); };
  Y.actions['ex-add'] = () => {
    const name = document.getElementById('ex-name').value.trim();
    if (!name) { ui.toast('Введите название'); return; }
    const mode = document.getElementById('ex-mode').value;
    S().exercises.push({
      id: `custom-${Date.now()}`, custom: true, name,
      child: document.getElementById('ex-child').value.trim() || name,
      mom: document.getElementById('ex-mom').value.trim(),
      emoji: document.getElementById('ex-emoji').value || '🙂',
      mode, amount: Math.max(1, Number(document.getElementById('ex-amount').value) || 8), beat: 2.4,
      face: { mouth: 'open-smile', tongue: 'hidden' }, scene: 'stars', enabled: true
    });
    A().save(); A().render(); ui.toast('Упражнение добавлено');
  };

  // ─────────────────────────────────────────────────────────────
  // Мамин голос
  // ─────────────────────────────────────────────────────────────
  const VOICE_GROUPS = () => [
    ['Часто звучит', [
      ['l:hello', `Приветствие («Привет, ${A().childName()}!»)`],
      ['l:say', '«Повтори!» / «Скажи!»'],
      ['l:praiseShort', 'Короткая похвала («Супер!», «Есть!»)'],
      ['l:praiseName', `Похвала с именем («${A().childName()}, ты молодец!»)`],
      ['l:tryAgain', '«Попробуй ещё!»'],
      ['l:notHeard', '«Скажи погромче!»'],
      ['l:momGood', '«Красиво!» (после клавиши 1)'],
      ['l:lockCheck', '«Проверка замка! Грибочек!»'],
      ['l:sessionEnd', 'Конец занятия'],
      ['l:piece', '«Открылась новая деталь подарка!»'],
      ['l:petName', '«Скажи моё имя!» (питомец)']
    ]],
    ['Отдельные звуки (лучше записать самой)', data.SOUND_ORDER.map(sound => [`snd:${sound}`, `Звук ${ui.soundLabel(sound)} — протяжно, как в логопедии`])],
    ['Упражнения', S().exercises.filter(ex => ex.enabled).map(ex => [A().speech.exercise(ex).key, `${ex.emoji} ${ex.name}`])]
  ];

  let voiceCounts = {};
  let recording = null;
  let voiceWordsSound = '';

  async function refreshVoiceCounts() {
    const records = await storage.listBlobs('voice').catch(() => []);
    voiceCounts = {};
    for (const record of records) {
      const key = Y.audioKeys ? Y.audioKeys.normalize(record.meta && record.meta.phraseKey) : record.meta && record.meta.phraseKey;
      if (key) voiceCounts[key] = (voiceCounts[key] || 0) + 1;
    }
  }

  function sourceLabel(key) {
    if (voiceCounts[key]) return `<span class="src mom">мамин голос · ${voiceCounts[key]}</span>`;
    const sp = A().speech;
    const probe = key.startsWith('l:') ? `${key}:0` : key;
    if (sp.hasClip(probe)) return '<span class="src clip">готовая запись</span>';
    return '<span class="src tts">голос браузера</span>';
  }

  function voiceRow(key, label) {
    return `<div class="voice-row"><div class="grow"><b>${esc(label)}</b><div>${sourceLabel(key)}</div></div>
        <button class="mini ${recording && recording.key === key ? 'rec' : ''}" data-action="voice-rec" data-key="${esc(key)}" aria-label="Записать">${recording && recording.key === key ? '■' : '●'}</button>
        <button class="mini" data-action="voice-play" data-key="${esc(key)}" aria-label="Послушать">▶</button>
        ${voiceCounts[key] ? `<button class="mini" data-action="voice-del" data-key="${esc(key)}" aria-label="Удалить мои записи">✕</button>` : ''}</div>`;
  }
  Y.actions['voice-words'] = btn => { voiceWordsSound = voiceWordsSound === btn.dataset.sound ? '' : btn.dataset.sound; A().render(); };

  Y.screens.voice = {
    render: () => `<div class="shell">${A().topbar('Мамин голос', 'parent')}
      <div class="notice">Ваши записи звучат вместо готовых. Можно записать несколько вариантов одной фразы — они будут чередоваться. Нажмите ● чтобы начать, ■ чтобы остановить.</div>
      <button class="menu-card wide" data-action="go" data-screen="voicereview"><span>🎧</span>Прослушать всё подряд и поправить<small>фраза за фразой: звучит хорошо — дальше, плохо — записать своим голосом. Можно по частям.</small></button>
      ${VOICE_GROUPS().map(([title, items]) => `<section class="section"><h3>${esc(title)}</h3>${items.map(([key, label]) => voiceRow(key, label)).join('')}</section>`).join('')}
      <section class="section"><h3>Слова (по желанию)</h3>
        <p class="muted small">Если какое-то слово звучит невнятно — запишите его своим голосом. Выберите звук:</p>
        <div class="chips">${data.SOUND_ORDER.filter(x => core.levelOf(S(), x) >= 1).map(x => `<button class="chip ${voiceWordsSound === x ? 'on' : ''}" data-action="voice-words" data-sound="${x}">${esc(ui.soundLabel(x))}</button>`).join('')}</div>
        ${voiceWordsSound ? core.targetWords(S(), voiceWordsSound, null, false).map(w => voiceRow(`w:${w.text}`, `${w.emoji} ${w.text}`)).join('') : ''}
      </section>
    </div>`,
    mount: async () => {
      if (!Y.screens.voice._loaded) { Y.screens.voice._loaded = true; await refreshVoiceCounts(); A().render(); Y.screens.voice._loaded = false; }
    },
    unmount: () => { if (recording) stopRecording(false); }
  };

  async function stopRecording(saveIt) {
    const rec = recording;
    recording = null;
    if (!rec) return;
    await new Promise(resolve => {
      rec.recorder.onstop = async () => {
        rec.stream.getTracks().forEach(t => t.stop());
        if (saveIt) {
          const blob = new Blob(rec.chunks, { type: rec.recorder.mimeType || 'audio/webm' });
          if (blob.size > 1500) await storage.putBlob('voice', `voice:${rec.key}:${Date.now()}`, blob, { phraseKey: rec.key });
        }
        resolve();
      };
      try { rec.recorder.stop(); } catch (error) { resolve(); }
    });
    await A().speech.loadMom();
    await refreshVoiceCounts();
  }

  Y.actions['voice-rec'] = async btn => {
    const key = btn.dataset.key;
    if (recording && recording.key === key) { await stopRecording(true); A().render(); ui.toast('Записано'); return; }
    if (recording) await stopRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.start();
      recording = { key, stream, recorder, chunks };
      A().render();
    } catch (error) { ui.toast('Микрофон недоступен'); }
  };

  Y.actions['voice-play'] = btn => {
    const key = btn.dataset.key;
    const sp = A().speech;
    if (key.startsWith('l:')) return sp.play(sp.line(key.slice(2)), { interrupt: true });
    if (key.startsWith('snd:')) return sp.play(sp.snd(key.slice(4)), { interrupt: true });
    if (key.startsWith('ex:')) { const ex = S().exercises.find(x => x.id === key.slice(3).split(':')[0]); if (ex) return sp.play(sp.exercise(ex), { interrupt: true }); }
    if (key.startsWith('w:')) { const w = data.WORDS.find(x => x.text === key.slice(2)); if (w) return sp.play(sp.word(w), { interrupt: true }); }
    return null;
  };

  Y.actions['voice-del'] = async btn => {
    const key = btn.dataset.key;
    const ok = await ui.confirmBox('Удалить ваши записи этой фразы? Снова будет звучать готовая запись.', 'Удалить', 'Отмена');
    if (!ok) return;
    const records = await storage.listBlobs('voice').catch(() => []);
    for (const record of records) {
      const k = Y.audioKeys ? Y.audioKeys.normalize(record.meta && record.meta.phraseKey) : record.meta && record.meta.phraseKey;
      if (k === key) await storage.deleteBlob('voice', record.id);
    }
    await A().speech.loadMom();
    await refreshVoiceCounts();
    A().render();
  };

  // ─────────────────────────────────────────────────────────────
  // Прослушать всё подряд: мама слушает готовые записи и перезаписывает те, где ударение или интонация не те.
  // ─────────────────────────────────────────────────────────────
  function reviewSets() {
    const s = S();
    const sp = A().speech;
    const name = A().childName();
    const fill = t => String(t).replace(/\{name\}/g, name);
    const sets = [
      { id: 'lines', title: 'Фразы приложения', items: Object.entries(data.LINES).flatMap(([cat, variants]) => variants.map((t, i) => ({ key: `l:${cat}:${i}`, text: fill(t), clip: () => sp.line(cat, i) }))) }
    ];
    for (const sound of data.SOUND_ORDER.filter(x => core.levelOf(s, x) >= 1)) {
      sets.push({ id: `w-${sound}`, title: `Слова ${ui.soundLabel(sound)}`, items: core.targetWords(s, sound, null, false).map(w => ({ key: `w:${w.text}`, text: w.text, emoji: w.emoji, clip: () => sp.word(w) })) });
    }
    sets.push({ id: 'phrases', title: 'Чистоговорки', items: data.PHRASES.filter(p => core.levelOf(s, p.sound) >= 1).map(p => ({ key: `ph:${p.id}`, text: p.text, clip: () => sp.phrase(p) })) });
    sets.push({ id: 'riddles', title: 'Загадки', items: data.RIDDLES.map(r => ({ key: `rd:${r.id}`, text: r.text, clip: () => ({ key: `rd:${r.id}`, text: r.text }) })) });
    sets.push({ id: 'poems', title: 'Стишки', items: data.POEMS.flatMap(poem => poem.lines.map((line, i) => ({ key: `po:${poem.id}:${i}`, text: line, clip: () => ({ key: `po:${poem.id}:${i}`, text: line }) }))) });
    sets.push({ id: 'story', title: 'Сказка', items: data.STORY.flatMap(ch => [
      ...ch.parts.flatMap((part, i) => typeof part === 'string'
        ? [{ key: `stp:${ch.id}:${i}`, text: fill(part), clip: () => sp.storyPart(ch, i) }]
        : [{ key: `stq:${ch.id}:${i}`, text: fill(part.text), clip: () => sp.storyPrompt(ch, i) }, ...(part.done ? [{ key: `std:${ch.id}:${i}`, text: fill(part.done), clip: () => sp.storyDone(ch, i) }] : [])]),
      { key: `sn:${ch.id}`, text: fill(ch.next), clip: () => sp.storyNext(ch) }]) });
    return sets;
  }

  let review = { set: 'lines', index: 0 };
  let reviewRec = null;
  const reviewed = () => { const s = S(); s.voiceReview = s.voiceReview || {}; return s.voiceReview; };

  function reviewCurrent() {
    const sets = reviewSets();
    const set = sets.find(x => x.id === review.set) || sets[0];
    review.set = set.id;
    if (review.index >= set.items.length) review.index = Math.max(0, set.items.length - 1);
    return { sets, set, item: set.items[review.index] };
  }

  Y.screens.voicereview = {
    render: () => {
      const { sets, set, item } = reviewCurrent();
      const done = reviewed();
      const count = list => list.items.filter(x => done[x.key]).length;
      const mine = item && voiceCounts[item.key];
      return `<div class="shell">${A().topbar('Прослушать и поправить', 'voice')}
        <div class="chips">${sets.map(x => `<button class="chip ${x.id === set.id ? 'on' : ''}" data-action="review-set" data-id="${x.id}">${esc(x.title)} <small>${count(x)}/${x.items.length}</small></button>`).join('')}</div>
        ${item ? `<section class="card review-card ${reviewRec ? 'recording' : ''}">
          <p class="muted">${review.index + 1} из ${set.items.length}${done[item.key] === 'ok' ? ' · ✓ проверено' : done[item.key] === 'mom' ? ' · 🎙 ваш голос' : ''}${mine ? ` · записей: ${mine}` : ''}</p>
          <div class="review-text">${item.emoji ? `<span>${item.emoji}</span>` : ''}${esc(item.text)}</div>
          <div class="row gap wrap center-row">
            <button class="btn secondary" data-action="review-play">▶ Послушать <small>P</small></button>
            <button class="btn good" data-action="review-ok">✓ Звучит хорошо <small>Enter</small></button>
            <button class="btn ${reviewRec ? 'rec' : ''}" data-action="review-rec">${reviewRec ? '■ Стоп и сохранить <small>пробел</small>' : '● Записать своим голосом <small>R</small>'}</button>
            <button class="btn secondary" data-action="review-stress">✏️ Ударение не то <small>U</small></button>
          </div>
          ${stressFlags()[item.key] ? `<p class="stress-note">✏️ Отмечено: «${esc(stressFlags()[item.key].fix || stressFlags()[item.key].text)}» — ${A().speech.canBrowserVoice() ? 'пока звучит голосом браузера с вашим ударением' : 'вошло в список на исправление'}. <button class="link" data-action="review-unstress">снять отметку</button></p>` : ''}
          <div class="row gap wrap center-row">
            <button class="link" data-action="review-move" data-d="-1">← назад</button>
            <button class="link" data-action="review-move" data-d="1">пропустить →</button>
            ${mine ? '<button class="link" data-action="review-del">удалить мои записи этой фразы</button>' : ''}
          </div>
        </section>` : '<p>Здесь пока ничего нет.</p>'}
        <p class="muted small">Слушайте готовую запись. Если ударение не то — нажмите «✏️ Ударение не то» и напишите слово с большой ударной буквой (бЕлка): фраза будет звучать голосом браузера с правильным ударением, а список можно отправить разработчику — в следующем обновлении запись переделают. Или нажмите «Записать» и прочитайте фразу сами — ваша запись звучит вместо готовой. Отметки сохраняются — можно продолжить в другой день.</p>
        ${Object.keys(stressFlags()).length ? `<section class="card"><h3>Ударения на исправление (${Object.keys(stressFlags()).length})</h3>
          <div class="stress-list">${Object.entries(stressFlags()).map(([k, v]) => `<div>«${esc(v.text)}» → <b>${esc(v.fix || '?')}</b></div>`).join('')}</div>
          <button class="btn secondary small" data-action="stress-copy">📋 Скопировать список (чтобы отправить)</button></section>` : ''}
      </div>`;
    },
    mount: async () => {
      await refreshVoiceCounts();
      const node = document.querySelector('.review-card p.muted');
      if (!node) return;
      setTimeout(() => { if (document.querySelector('.review-card') && !reviewRec) playReview(); }, 250);
    },
    unmount: () => { if (reviewRec) stopReviewRec(false); }
  };

  function playReview() {
    const { item } = reviewCurrent();
    if (item) A().speech.play(item.clip(), { interrupt: true });
  }

  function nextUnreviewed(step) {
    const { set } = reviewCurrent();
    const done = reviewed();
    let i = review.index + step;
    while (i >= 0 && i < set.items.length && step > 0 && done[set.items[i].key]) i += 1;
    review.index = Math.max(0, Math.min(set.items.length - 1, i));
  }

  async function stopReviewRec(saveIt) {
    const rec = reviewRec;
    reviewRec = null;
    if (!rec) return false;
    let saved = false;
    await new Promise(resolve => {
      rec.recorder.onstop = async () => {
        rec.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(rec.chunks, { type: rec.recorder.mimeType || 'audio/webm' });
        if (saveIt && blob.size > 1500) { await storage.putBlob('voice', `voice:${rec.key}:${Date.now()}`, blob, { phraseKey: rec.key }); saved = true; }
        resolve();
      };
      try { rec.recorder.stop(); } catch (error) { resolve(); }
    });
    await A().speech.loadMom();
    await refreshVoiceCounts();
    return saved;
  }

  const stressFlags = () => { const st = S().settings; st.stressFlags = st.stressFlags || {}; return st.stressFlags; };
  Y.actions['review-stress'] = () => {
    const { item } = reviewCurrent();
    if (!item) return;
    const prev = stressFlags()[item.key];
    const m = ui.modal(`<h3>✏️ Где ударение?</h3><p class="muted small">Напишите фразу, ударную гласную — большой буквой. Например: «бЕлка», «Жила-былА».</p>
      <input class="stress-input" value="${esc(prev ? prev.fix : item.text)}">
      <div class="row gap center-row"><button class="btn secondary" data-no>Отмена</button><button class="btn secondary" data-try>▶ Послушать</button><button class="btn" data-yes>Сохранить</button></div>`);
    const input = m.node.querySelector('input');
    input.focus();
    m.node.querySelector('[data-no]').onclick = () => m.close();
    m.node.querySelector('[data-try]').onclick = () => A().speech.sayStressed(input.value);
    m.node.querySelector('[data-yes]').onclick = () => {
      stressFlags()[item.key] = { text: item.text, fix: input.value.trim() };
      reviewed()[item.key] = 'stress';
      A().save(); A().applySettings();
      m.close();
      ui.toast('Отмечено. Спасибо!', 'good');
      nextUnreviewed(1);
      A().render();
    };
  };
  Y.actions['review-unstress'] = () => {
    const { item } = reviewCurrent();
    if (!item) return;
    delete stressFlags()[item.key];
    delete reviewed()[item.key];
    A().save(); A().applySettings(); A().render();
  };
  Y.actions['stress-copy'] = async () => {
    const text = Object.entries(stressFlags()).map(([k, v]) => `${k} | ${v.text} | ${v.fix}`).join('\n');
    try { await navigator.clipboard.writeText(`Язычок — ударения на исправление:\n${text}`); ui.toast('Список скопирован — вставьте его в сообщение', 'good'); }
    catch (error) { ui.modal(`<p>Скопируйте вручную:</p><textarea class="stress-copy" rows="8">${esc(text)}</textarea>`); }
  };

  Y.actions['review-set'] = btn => {
    review = { set: btn.dataset.id, index: 0 };
    const { set } = reviewCurrent();
    const done = reviewed();
    const first = set.items.findIndex(x => !done[x.key]);
    review.index = first >= 0 ? first : 0;
    A().render();
  };
  Y.actions['review-play'] = () => playReview();
  Y.actions['review-ok'] = () => {
    const { item } = reviewCurrent();
    if (!item) return;
    if (!reviewed()[item.key]) reviewed()[item.key] = 'ok';
    A().save();
    nextUnreviewed(1);
    A().render();
  };
  Y.actions['review-move'] = btn => { review.index += Number(btn.dataset.d) || 0; if (review.index < 0) review.index = 0; A().render(); };
  Y.actions['review-rec'] = async () => {
    const { item } = reviewCurrent();
    if (!item) return;
    if (reviewRec) {
      const saved = await stopReviewRec(true);
      if (saved) {
        reviewed()[item.key] = 'mom';
        A().save();
        ui.toast('Записано — теперь звучит ваш голос', 'good');
        await A().speech.play(item.clip(), { interrupt: true });
        nextUnreviewed(1);
      }
      A().render();
      return;
    }
    A().speech.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.start();
      reviewRec = { key: item.key, stream, recorder, chunks };
      A().render();
    } catch (error) { ui.toast('Микрофон недоступен'); }
  };
  Y.actions['review-del'] = async () => {
    const { item } = reviewCurrent();
    if (!item) return;
    const records = await storage.listBlobs('voice').catch(() => []);
    for (const record of records) {
      const k = Y.audioKeys ? Y.audioKeys.normalize(record.meta && record.meta.phraseKey) : record.meta && record.meta.phraseKey;
      if (k === item.key) await storage.deleteBlob('voice', record.id);
    }
    delete reviewed()[item.key];
    A().save();
    await A().speech.loadMom();
    await refreshVoiceCounts();
    A().render();
  };

  document.addEventListener('keydown', event => {
    if (!document.querySelector('.review-card')) return;
    if (event.target && /input|textarea|select/i.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (event.code === 'Space') { event.preventDefault(); if (reviewRec) Y.actions['review-rec'](); else playReview(); }
    else if (event.key === 'Enter') { event.preventDefault(); if (!reviewRec) Y.actions['review-ok'](); }
    else if (key === 'r' || key === 'к') { if (!reviewRec) Y.actions['review-rec'](); }
    else if (key === 'p' || key === 'з') playReview();
    else if ((key === 'u' || key === 'г') && !document.querySelector('.modal-back')) Y.actions['review-stress']();
    else if (event.key === 'ArrowRight') Y.actions['review-move']({ dataset: { d: '1' } });
    else if (event.key === 'ArrowLeft') Y.actions['review-move']({ dataset: { d: '-1' } });
  });

  // ─────────────────────────────────────────────────────────────
  // Статистика
  // ─────────────────────────────────────────────────────────────
  Y.screens.stats = {
    render: () => {
      const s = S();
      const st = s.progress.stats;
      const today = A().today();
      const days = [];
      for (let i = 13; i >= 0; i -= 1) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = core.dateKey(d);
        days.push({ key, info: st.daily[key], done: s.progress.days[key] });
      }
      const maxSaid = Math.max(10, ...days.map(d => (d.info ? d.info.said : 0)));
      const bars = days.map(d => `<div class="bar-col" title="${d.key}"><div class="bar" style="height:${Math.round(((d.info ? d.info.said : 0) / maxSaid) * 100)}%"></div><small>${d.key.slice(8)}</small>${d.done ? '<i>★</i>' : ''}</div>`).join('');
      const soundRows = data.SOUND_ORDER.filter(sound => core.levelOf(s, sound) !== 0 || st.sounds[sound]).map(sound => {
        const info = st.sounds[sound] || { said: 0, good: 0, slip: 0, sessions: 0, last: '' };
        const rated = info.good + info.slip;
        const gap = info.last ? core.daysBetween(info.last, today) : null;
        return `<tr><td>${ui.badge(sound)}</td><td>${esc((data.LEVELS.find(l => l.value === core.levelOf(s, sound)) || {}).short || '')}</td><td>${info.said}</td><td>${info.sessions}</td>
          <td>${rated ? `${Math.round((info.good / rated) * 100)}% <small class="muted">(${info.good}/${rated})</small>` : '—'}</td>
          <td class="${gap !== null && gap >= 5 ? 'warn' : ''}">${gap === null ? 'ещё не было' : gap === 0 ? 'сегодня' : `${gap} дн. назад`}</td></tr>`;
      }).join('');
      const hard = core.hardWords(s, 12);
      const stale = core.staleSounds(s, today, 5);
      const { primary } = core.chooseSounds(s);
      const never = core.neverSaid(s, primary).slice(0, 14);
      const last7 = days.slice(7).filter(d => d.done).length;
      return `<div class="shell">${A().topbar('Статистика', 'parent')}
        <div class="stat-tiles">
          <div class="stat"><b>${s.progress.history.length}</b><small>занятий всего</small></div>
          <div class="stat"><b>${last7}</b><small>дней из последних 7</small></div>
          <div class="stat"><b>${st.saidTotal}</b><small>раз сказано</small></div>
          <div class="stat"><b>${st.momGoodTotal}/${st.momSlipTotal}</b><small>красиво / проскочил</small></div>
        </div>
        <section class="section"><h3>Сколько сказано за 14 дней</h3><div class="bars">${bars}</div></section>
        <section class="section"><h3>По звукам</h3><table class="table"><thead><tr><th>Звук</th><th>Уровень</th><th>Сказано</th><th>Занятий</th><th>Красиво</th><th>Последний раз</th></tr></thead><tbody>${soundRows}</tbody></table></section>
        ${stale.length ? `<section class="section"><h3>Давно не повторяли</h3><p>${stale.map(x => `${ui.badge(x.sound)} ${x.gap === null ? 'ещё ни разу' : `${x.gap} дн.`}`).join(' · ')}</p></section>` : ''}
        <section class="section"><h3>Трудные слова</h3>${hard.length ? `<p class="muted small">Где вы чаще нажимали «2 — проскочил».</p><div class="chips">${hard.map(w => `<span class="chip">${esc(w.text)} <small>${w.slip}✗ / ${w.good}✓</small></span>`).join('')}</div>` : '<p class="muted">Появятся, когда вы будете отмечать клавишей 2, где язык проскочил.</p>'}</section>
        <section class="section"><h3>Ещё не говорила (звук ${ui.badge(primary)})</h3>${never.length ? `<div class="chips">${never.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '<p class="muted">Все слова этого звука уже звучали!</p>'}</section>
        <button class="btn secondary" data-action="report">📄 Скачать отчёт логопеду</button>
      </div>`;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Записи ребёнка (из «Попугая»)
  // ─────────────────────────────────────────────────────────────
  Y.saveChildRecording = async (blob, label) => {
    const createdAt = Date.now();
    await storage.putBlob('child', `child:${createdAt}`, blob, { label, createdAt }).catch(() => {});
    await Y.cleanupChildRecordings().catch(() => {});
  };
  Y.cleanupChildRecordings = async () => {
    const items = await storage.listBlobs('child').catch(() => []);
    const meta = items.map(item => ({ id: item.id, createdAt: (item.meta && item.meta.createdAt) || item.createdAt }));
    const kept = new Set(core.pruneRecordingMeta(meta, Date.now()).map(item => item.id));
    for (const item of items) if (!kept.has(item.id)) await storage.deleteBlob('child', item.id);
  };

  let childRecords = [];
  Y.screens.childrec = {
    render: () => `<div class="shell">${A().topbar(`Записи: ${A().childName()}`, 'parent')}
      <div class="notice">Записи из игры «Попугай». Хранятся 14 дней, не больше 30 штук. Удобно послушать, где язык проскакивает.</div>
      <section class="section">${childRecords.length ? childRecords.map(r => `<div class="voice-row"><div class="grow"><b>${esc(r.label)}</b><div class="muted small">${new Date(r.createdAt).toLocaleString('ru-RU')}</div></div>
        <button class="mini" data-action="child-play" data-id="${esc(r.id)}">▶</button><button class="mini" data-action="child-del" data-id="${esc(r.id)}">✕</button></div>`).join('') : '<p class="muted">Записей пока нет.</p>'}</section></div>`,
    mount: async () => {
      if (Y.screens.childrec._busy) return;
      Y.screens.childrec._busy = true;
      const items = await storage.listBlobs('child').catch(() => []);
      childRecords = items.map(r => ({ id: r.id, label: (r.meta && r.meta.label) || '—', createdAt: (r.meta && r.meta.createdAt) || r.createdAt, blob: r.blob })).sort((a, b) => b.createdAt - a.createdAt);
      A().render();
      Y.screens.childrec._busy = false;
    }
  };
  Y.actions['child-play'] = btn => {
    const r = childRecords.find(x => x.id === btn.dataset.id);
    if (!r) return;
    const url = URL.createObjectURL(r.blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch(() => {});
  };
  Y.actions['child-del'] = async btn => { await storage.deleteBlob('child', btn.dataset.id); childRecords = childRecords.filter(x => x.id !== btn.dataset.id); A().render(); };
})(window);

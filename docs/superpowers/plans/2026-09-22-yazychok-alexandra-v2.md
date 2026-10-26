# «Язычок Александры» V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать проверяемое статическое приложение ежедневной гимнастики, пяти мини-игр и пазла-награды, которое работает через `file://` и готово к GitHub Pages.

**Architecture:** Классические JavaScript-файлы публикуют данные и чистую логику в `window.Yazychok`, а в Node.js — через `module.exports`. Браузерный слой отвечает только за рендеринг, события, звук и IndexedDB; генерация занятия, миграция и награды остаются чистыми функциями и проверяются `node:test`.

**Tech Stack:** HTML5, CSS3, JavaScript ES2020 без библиотек, Web Speech API, MediaRecorder, IndexedDB, localStorage, Node.js 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-22-yazychok-alexandra-design-v2.md`

## Global Constraints

- Имя ребёнка является локальной настройкой и не зашивается в публикуемый код.
- Приложение работает через `file://`; ES-модули запрещены.
- Награда выдаётся за завершение, не за правильность.
- Не более одной детали пазла за календарный день.
- Пазл имеет 12 или 16 деталей.
- Новые медицинские упражнения не назначаются приложением.
- Все слова имеют ручную фонетическую разметку.
- Записи и изображения остаются в браузере.

---

### Task 1: Каркас проекта и ручная разметка данных

**Files:**
- Create: `package.json`
- Create: `js/data.js`
- Create: `tests/data.test.cjs`

**Interfaces:**
- Produces: `YazychokData.SOUNDS`, `YazychokData.WORDS`, `YazychokData.PHRASES`, `YazychokData.DEFAULT_EXERCISES`, `YazychokData.PRAISE`.

- [ ] **Step 1: Write the failing data validation test**

```js
test('каждое слово имеет ручную фонетическую разметку', () => {
  for (const word of data.WORDS) {
    assert.equal(typeof word.text, 'string');
    assert.ok(word.emoji);
    assert.ok(word.targets.length > 0);
    for (const target of word.targets) {
      assert.ok(['с','з','ц','ш','л'].includes(target.sound));
      assert.ok(['start','middle','end'].includes(target.position));
      assert.equal(typeof target.soft, 'boolean');
    }
  }
});
```

- [ ] **Step 2: Run `node --test tests/data.test.cjs` and confirm it fails because `js/data.js` is absent.**
- [ ] **Step 3: Implement the five sound banks, phrases, praise variants and the eight existing exercises in a UMD-style data file.**
- [ ] **Step 4: Run the data test and confirm zero failures.**

### Task 2: Чистая логика занятия, гимнастики и пазла

**Files:**
- Create: `js/core.js`
- Create: `tests/core.test.cjs`

**Interfaces:**
- Consumes: `YazychokData`.
- Produces: `createDefaultState(name)`, `migrateLegacy(legacy)`, `selectGym(exercises,count,recentIds,rng)`, `selectGames(count,recentIds,rng)`, `buildSession(state,data,date,rng)`, `completeSession(state,summary,date)`, `mergeState(current,incoming)`, `pruneRecordingMeta(items,now)`.

- [ ] **Step 1: Write failing tests for fixed-first gym rotation, unique game types, one puzzle piece per day, legacy migration, merge semantics and the 14-day/30-recording limit.**
- [ ] **Step 2: Run `node --test tests/core.test.cjs` and confirm failures are caused by missing functions.**
- [ ] **Step 3: Implement the smallest deterministic pure functions needed by the tests.**
- [ ] **Step 4: Run `npm test` and confirm all data and core tests pass.**
- [ ] **Step 5: Refactor repeated selection logic while keeping tests green.**

### Task 3: Браузерное хранение, миграция и резервная копия

**Files:**
- Create: `js/storage.js`
- Create: `tests/backup.test.cjs`

**Interfaces:**
- Produces browser namespace `Yazychok.storage` with `init`, `loadState`, `saveState`, `putBlob`, `getBlob`, `listBlobs`, `deleteBlob`, `exportBackup`, `importBackup`, `requestPersistence`, `migrateLegacyVoice`.

- [ ] **Step 1: Write failing pure serialization tests for Blob-to-base64 and backup merge/replace descriptors.**
- [ ] **Step 2: Run the focused test and verify expected missing exports.**
- [ ] **Step 3: Implement IndexedDB stores `voice`, `child`, `assets`, legacy state migration and persistence request; keep browser-only APIs behind capability checks.**
- [ ] **Step 4: Implement backup export/import with automatic pre-import download and merge/replace choice supplied by the caller.**
- [ ] **Step 5: Run `npm test` and confirm zero failures.**

### Task 4: Последовательная озвучка и запись голоса

**Files:**
- Create: `js/audio.js`
- Create: `tests/audio.test.cjs`

**Interfaces:**
- Produces `createAudioQueue(adapters)` with `speak`, `playKey`, `pause`, `stop`, `isBusy`; browser facade `Yazychok.audio` adds MediaRecorder handling.

- [ ] **Step 1: Write a failing test using real promises that proves a second phrase starts only after the first resolves and the configured pause completes.**
- [ ] **Step 2: Run the focused test and confirm the queue function is missing.**
- [ ] **Step 3: Implement the promise queue, cancellation token, recorded-voice priority and TTS fallback.**
- [ ] **Step 4: Add MediaRecorder helpers that save multiple variants per phrase key.**
- [ ] **Step 5: Run `npm test` and confirm the ordering test and complete suite pass.**

### Task 5: Интерфейс, гимнастика и пять мини-игр

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `js/app.js`
- Create: `tests/session-flow.test.cjs`

**Interfaces:**
- Consumes: data, core, storage and audio namespaces.
- Produces screens `setup`, `home`, `session`, `reward`, `puzzle`, `parentLock`, `settings`, `exerciseEditor`, `voiceStudio`, `history`.

- [ ] **Step 1: Write a failing session-flow test proving a short session contains gym first and three distinct game types, while a normal session contains gym first and five distinct types.**
- [ ] **Step 2: Run the focused test and verify expected failure.**
- [ ] **Step 3: Build accessible semantic HTML shell and responsive visual system with large controls and reduced-motion support.**
- [ ] **Step 4: Implement setup, home, gym repeat/timer screens and long-press parent skip.**
- [ ] **Step 5: Implement `soundCheck`, `memoryPairs`, `groupSort`, `finishPhrase` and `echo` renderers and event handlers.**
- [ ] **Step 6: Ensure every completion awaits audio feedback before advancing.**
- [ ] **Step 7: Run `npm test` and confirm the session-flow and complete suite pass.**

### Task 6: Пазл, родительский раздел, отчёт и редактор упражнений

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `js/app.js`
- Create: `tests/report.test.cjs`

**Interfaces:**
- Adds `buildTherapistReport(state)` to core and browser actions for image upload, 12/16 selection, math lock, exercise CRUD/reorder, voice variants, backup and report download.

- [ ] **Step 1: Write a failing report test with literal expected dates, sounds and exercise names.**
- [ ] **Step 2: Run the focused test and verify missing report builder.**
- [ ] **Step 3: Implement puzzle grid with uploaded image, remaining-session count, daily unlock and final celebration.**
- [ ] **Step 4: Implement math parent lock and guarded destructive actions.**
- [ ] **Step 5: Implement exercise enable/add/reorder controls and voice studio.**
- [ ] **Step 6: Implement backup import/export and therapist report download.**
- [ ] **Step 7: Run `npm test` and confirm zero failures.**

### Task 7: Установка, документация и браузерная проверка

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `scripts/smoke-test.cjs`
- Copy after verification: project deployment files to `C:\Users\elenk\Desktop\yazychok-alexandra`
- Backup after verification: `C:\Users\elenk\Desktop\yazychok.html` to a dated filename

**Interfaces:**
- Produces a local project ready for GitHub Pages and a checked local entry point.

- [ ] **Step 1: Implement a smoke script that parses `index.html`, verifies every local asset exists and rejects `type="module"` or remote runtime dependencies.**
- [ ] **Step 2: Run `node scripts/smoke-test.cjs` and correct every reported problem.**
- [ ] **Step 3: Run `npm test` fresh and record test counts and exit code.**
- [ ] **Step 4: Open the app through `file://` and a local web server; exercise setup, short session, reward, parent lock and 12/16 puzzle.**
- [ ] **Step 5: Check narrow and wide viewport screenshots and fix visible overflow or unreadable controls.**
- [ ] **Step 6: Initialize local git history, save the verified project, copy it to the Desktop folder and preserve the original HTML as a dated backup.**
- [ ] **Step 7: Write README instructions for local use, GitHub Pages and backup transfer.**

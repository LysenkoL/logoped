const test = require('node:test');
const assert = require('node:assert/strict');
const mic = require('../js/mic.js');

const floors = { energy: 1e-6, high: 1e-9, low: 1e-7 };

test('тишина — ни голоса, ни шипения', () => {
  const r = mic.classify({ energy: 1.1e-6, high: 1.2e-9, low: 1.1e-7 }, floors, 3);
  assert.equal(r.voice, false);
  assert.equal(r.hiss, false);
});

test('гласный звук — голос без шипения', () => {
  const r = mic.classify({ energy: 5e-4, high: 3e-9, low: 5e-5 }, floors, 3);
  assert.equal(r.voice, true);
  assert.equal(r.hiss, false);
});

test('«ссс» — шипение', () => {
  const r = mic.classify({ energy: 1e-4, high: 5e-6, low: 2e-6 }, floors, 3);
  assert.equal(r.hiss, true);
});

test('чувствительность 5 ловит тише, чем 1', () => {
  const quiet = { energy: 4e-6, high: 1e-9, low: 1e-7 };
  assert.equal(mic.classify(quiet, floors, 5).voice, true);
  assert.equal(mic.classify(quiet, floors, 1).voice, false);
});

test('фон быстро опускается и медленно поднимается', () => {
  assert.ok(mic.updateFloor(1, 0.5, false) < 0.95);
  assert.ok(mic.updateFloor(1, 2, false) < 1.01);
  assert.equal(mic.updateFloor(1, 2, true), 1);
});

// ── Строгий детектор звука для игр ──
const det = require('../js/mic.js');
const quietF = () => ({ energy: 1e-6, voice: false, hiss: false, sib: false, sibVoiced: false, tone: false, centroid: 6000 });
const sibF = (e = 0.01, c = 7000) => ({ energy: e, voice: true, hiss: true, sib: true, sibVoiced: false, tone: false, centroid: c });
const toneF = (e = 0.02) => ({ energy: e, voice: true, hiss: false, sib: false, sibVoiced: false, tone: true, centroid: 4000 });
function feedAll(d, frames) { const out = { events: 0, credit: 0 }; for (const f of frames) { const r = d.feed(f); out.events += r.event ? 1 : 0; out.credit += r.credit || 0; } return out; }
const quiet = n => Array.from({ length: n }, quietF);

test('ц: короткий шипящий выстрел после тишины засчитывается', () => {
  const d = det.createSoundDetector('ц', { mode: 'burst' });
  const r = feedAll(d, [...quiet(5), sibF(0.01), sibF(0.012), sibF(0.009), sibF(0.006), ...quiet(5)]);
  assert.equal(r.events, 1);
});

test('ц: хлопок (одна громкая вспышка и быстрый спад) не засчитывается', () => {
  const d = det.createSoundDetector('ц', { mode: 'burst' });
  const r = feedAll(d, [...quiet(5), sibF(0.008), sibF(0.0003), ...quiet(5), sibF(0.01), ...quiet(5)]);
  assert.equal(r.events, 0);
});

test('ц: долгое «сссс» — не выстрел', () => {
  const d = det.createSoundDetector('ц', { mode: 'burst' });
  const r = feedAll(d, [...quiet(5), ...Array.from({ length: 40 }, () => sibF()), ...quiet(5)]);
  assert.equal(r.events, 0);
});

test('ц: без паузы перед звуком не засчитывается (шум подряд)', () => {
  const d = det.createSoundDetector('ц', { mode: 'burst' });
  const r = feedAll(d, [...quiet(5), toneF(), toneF(), toneF(), sibF(), sibF(), sibF(), ...quiet(3)]);
  assert.equal(r.events, 0);
});

test('с: тянущееся шипение копит время, гласная и стук — нет', () => {
  const d = det.createSoundDetector('с');
  assert.equal(feedAll(d, Array.from({ length: 20 }, () => sibF())).credit, 20);
  const d2 = det.createSoundDetector('с');
  assert.equal(feedAll(d2, [...quiet(3), ...Array.from({ length: 20 }, () => toneF())]).credit, 0);
  const d3 = det.createSoundDetector('с');
  assert.equal(feedAll(d3, [...quiet(3), sibF(0.01), sibF(0.002), sibF(0.0004), ...quiet(3)]).credit, 0);
});

test('с: низкое «ш» не засчитывается за «с», а за «ш» — да', () => {
  const low = Array.from({ length: 10 }, () => sibF(0.01, 4200));
  assert.equal(feedAll(det.createSoundDetector('с'), low).credit, 0);
  assert.equal(feedAll(det.createSoundDetector('ш'), low).credit, 10);
});

test('р: тон, который держится, засчитывается; затухающий стук — нет', () => {
  assert.equal(feedAll(det.createSoundDetector('р'), Array.from({ length: 10 }, () => toneF())).credit, 10);
  const knock = [toneF(0.03), toneF(0.004), toneF(0.0005), toneF(0.00006), toneF(0.00001), ...quiet(3)];
  assert.equal(feedAll(det.createSoundDetector('р'), knock).credit, 0);
});

test('голос приложения (suppressed) пропускается, кнопка мамы засчитывает', () => {
  const d = det.createSoundDetector('ц', { mode: 'burst' });
  assert.equal(d.feed({ suppressed: true }).skip, true);
  assert.equal(d.feed({ manual: true }).event, true);
  assert.equal(d.feed({ manual: true }).event, false);
});

test('strictFeatures: хлопок с ровным спектром — не шипение', () => {
  const f = det.strictFeatures({ periodic: 0.12 }, { hiss: true, voice: true, hissRatio: 0.9, hissLevel: 1 });
  assert.equal(f.sib, false);
  const s = det.strictFeatures({ periodic: 0.15 }, { hiss: true, voice: true, hissRatio: 900, hissLevel: 1 });
  assert.equal(s.sib, true);
  const z = det.strictFeatures({ periodic: 0.7 }, { hiss: false, voice: true, hissRatio: 0.045, hissLevel: 1 });
  assert.equal(z.sibVoiced, true);
  const a = det.strictFeatures({ periodic: 0.9 }, { hiss: false, voice: true, hissRatio: 0.0007, hissLevel: 0.3 });
  assert.equal(a.sibVoiced, false);
  assert.equal(a.tone, true);
});

test('настройка под голос: граница «с»/«ш» по записям ребёнка', () => {
  const fr = (centroid, ratio) => ({ hiss: true, hissRatio: ratio, centroid, energy: 0.01 });
  const s = Array.from({ length: 40 }, (_, i) => fr(6200 + (i % 5) * 50, 40 + i));
  const sh = Array.from({ length: 40 }, (_, i) => fr(4100 + (i % 5) * 40, 30 + i));
  const r = det.analyzeCalibration({ s, sh, silence: [] });
  assert.equal(r.ok, true);
  assert.ok(r.profile.split > 4700 && r.profile.split < 5400, String(r.profile.split));
  // «с» и «ш» одинаковые — просим повторить
  const same = det.analyzeCalibration({ s, sh: s, silence: [] });
  assert.equal(same.ok, false);
  // мало «с»
  assert.equal(det.analyzeCalibration({ s: s.slice(0, 5), sh, silence: [] }).ok, false);
});

test('профиль голоса сдвигает границу «с»/«ш» в детекторе', () => {
  const low = Array.from({ length: 10 }, () => sibF(0.01, 5000));
  assert.equal(feedAll(det.createSoundDetector('с'), low).credit, 0, 'без настройки 5000 Гц — это не «с»');
  assert.equal(feedAll(det.createSoundDetector('с', { profile: { split: 4600 } }), low).credit, 10, 'с настройкой — «с»');
});

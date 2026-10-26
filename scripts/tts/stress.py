# Ударения для озвучки: ruaccent (словарь + модель для омографов: зАмок/замОк) → текст с «+» для Silero.
# Запуск: python3 scripts/tts/stress.py  (читает и дополняет work/lines.json полем "stressed")
import json, os, re, sys
from ruaccent import RUAccent
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get('TTS_WORK', os.path.join(HERE, 'work'))
path = os.path.join(WORK, 'lines.json')
data = json.load(open(path, encoding='utf-8'))
# Совместимость с новыми transformers: модели ударений нужен token_type_ids.
import numpy as np
from ruaccent import accent_model as _am
_orig_put = _am.AccentModel.put_accent
def _put_accent(self, word):
    names = [i.name for i in self.session.get_inputs()]
    inputs = self.tokenizer(word.lower(), return_tensors="np")
    inputs = {k: v.astype(np.int64) for k, v in inputs.items() if k in names}
    if 'token_type_ids' in names and 'token_type_ids' not in inputs:
        inputs['token_type_ids'] = np.zeros_like(inputs['input_ids'])
    outputs = self.session.run(None, inputs)
    idx = {o.name: i for i, o in enumerate(self.session.get_outputs())}
    logits = outputs[idx['logits']]
    probs = _am.softmax(logits)
    scores = np.max(probs, axis=-1)[0]
    labels = np.argmax(logits, axis=-1)[0]
    pred = [{'label': self.id2label[str(l)], 'score': float(sc)} for l, sc in zip(labels, scores)]
    return self.render_stress(word, pred)
_am.AccentModel.put_accent = _put_accent

acc = RUAccent()
acc.load(omograph_model_size='turbo3.1', use_dictionary=True, tiny_mode=False)

# Ручные поправки поверх словаря (то, что проверила на слух мама, можно добавить сюда).
FIX = {
    'Замок Звуков': 'З+амок Зв+уков',
    'Замка Звуков': 'З+амка Зв+уков',
    'у ворот': 'у вор+от',
    'У ворот': 'У вор+от',
    'Жила-была': 'Жил+а-был+а',
    'Дома их ждал': 'Д+ома их ждал',
    'до двери': 'до дв+ери',
    'Ова, ова': 'Ов+а, ов+а',
    'Шуша': 'Ш+уша',
    'Лоло': 'Л+оло',
    'Как здорово купаться': 'Как здор+ово куп+аться',
}

# Слова, где словарь ошибается или не ставит ударение (проверено вручную, 2026-10).
WORD_FIX = {
    'получится': 'получ+ится',
    'белка': 'б+елка', 'белку': 'б+елку', 'белки': 'б+елки', 'белке': 'б+елке',
    'небе': 'н+ебе', 'это': '+это', 'шарик': 'ш+арик', 'сразу': 'ср+азу', 'спросил': 'спрос+ил',
    'узнаем': 'узн+аем', 'сказала': 'сказ+ала', 'любит': 'л+юбит', 'запело': 'зап+ело', 'берег': 'б+ерег',
    'стоял': 'сто+ял', 'какой': 'как+ой', 'королева': 'корол+ева', 'ярко': '+ярко', 'ова': 'ов+а',
    'шуша': 'ш+уша', 'лоло': 'л+оло',
    'среди': 'сред+и', 'крылья': 'кр+ылья', 'летом': 'л+етом', 'чтобы': 'чт+обы', 'самое': 'с+амое', 'каждый': 'к+аждый', 'играми': 'игр+ами',
}

def word_fix(text):
    def sub(m):
        w = m.group(0)
        plain = w.replace('+', '').lower()
        if plain not in WORD_FIX: return w
        fixed = WORD_FIX[plain]
        if not w.replace('+', '')[0].isupper(): return fixed
        i = 1 if fixed.startswith('+') else 0
        return fixed[:i] + fixed[i].upper() + fixed[i + 1:]
    return WORD.sub(sub, text)

def fix_apply(text):
    for plain, stressed in FIX.items():
        pattern = ''.join(re.escape(ch) + r'\+?' if ch.isalpha() else re.escape(ch) for ch in plain)
        pattern = r'(?<![А-Яа-яЁё+])\+?' + pattern + r'(?![А-Яа-яЁё])'
        text = re.sub(pattern, stressed, text)
    return text

WORD = re.compile(r"[А-Яа-яЁё+]+(?:-[А-Яа-яЁё+]+)*")
VOWELS = re.compile(r"[аеёиоуыэюяАЕЁИОУЫЭЮЯ]")

def tidy(word):
    # «+» перед «ё» лишний; в односложных словах (на, в, ты, вот) ударение не ставим — синтез сам их «проглатывает» как надо.
    word = re.sub(r'\+(?=[ёЁ])', '', word)
    parts = word.split('-')
    parts = [p.replace('+', '') if len(VOWELS.findall(p.replace('+', ''))) <= 1 else p for p in parts]
    return '-'.join(parts)

def apply(original, stressed):
    # Переносим ударения на исходный текст: так сохраняются «…», кавычки и тире.
    src = WORD.findall(original)
    got = WORD.findall(stressed)
    if len(src) != len(got) or any(a.lower() != b.replace('+', '').lower() for a, b in zip(src, got)):
        return None
    it = iter(got)
    return WORD.sub(lambda m: tidy(next(it)), original)

for item in data['lines']:
    kind, text = item['kind'], item['text']
    if kind in ('syll', 'snd', 'num', 'sc-ru-num', 'sc-ru-sy') or kind.startswith('sc-de'):
        continue
    if '+' in text:
        item['stressed'] = text
        continue
    # Цепочки слогов в начале чистоговорок («Са-са-са — …») не трогаем: ударение в них ставит сам синтез.
    head = ''
    m = re.match(r'^((?:[А-Яа-яЁё]{1,3}-){2}[А-Яа-яЁё]{1,3}\s*—\s*)(.*)$', text)
    if m:
        head, text = m.group(1), m.group(2)
    out = acc.process_all(text)
    merged = apply(text, out)
    if merged is None:
        # Не совпало по словам — ставим ударения только на слова, которые удалось сопоставить.
        stressed_words = {w.replace('+', '').lower(): tidy(w) for w in WORD.findall(out)}
        merged = WORD.sub(lambda m: stressed_words.get(m.group(0).lower(), m.group(0)) if m.group(0)[0].islower() else (lambda t: t[0].upper() + t[1:] if t else t)(stressed_words.get(m.group(0).lower(), m.group(0))), text)
    item['stressed'] = head + word_fix(fix_apply(merged))

json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('stressed', sum(1 for x in data['lines'] if 'stressed' in x))

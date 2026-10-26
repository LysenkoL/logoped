"""Собирает js/emoji-art.js — рисунки Microsoft Fluent Emoji (лицензия MIT) для питомцев и вещей магазина.
Так питомцы и наряды выглядят одинаково на любом компьютере, и шапки точно садятся на голову.
Источник: npm-пакет @iconify-json/fluent-emoji (icons.json). Запуск:
  python3 scripts/emoji/build.py /path/to/icons.json
"""
import json, re, sys, os

NAMES = [
    # питомцы
    'cat-face', 'rabbit-face', 'front-facing-baby-chick', 'mouse-face', 'hedgehog', 'panda', 'dog-face', 'penguin',
    'fox', 'octopus', 'unicorn', 'dragon-face',
    # наряды
    'crown', 'ribbon', 'billed-cap', 'top-hat', 'graduation-cap', 'womans-hat', 'rescue-workers-helmet', 'cherry-blossom',
    'glowing-star', 'cherries', 'sunglasses', 'glasses', 'goggles', 'sports-medal', 'bell',
    # игрушки
    'balloon', 'teddy-bear', 'soccer-ball', 'kite', 'crystal-ball', 'musical-keyboard', 'drum', 'trumpet', 'automobile', 'bubbles',
]

def squeeze(body):
    # Округляем числа до 2 знаков — в поле 32×32 этого достаточно, файл вдвое меньше.
    body = re.sub(r'(\d+\.\d{3,})', lambda m: ('%.2f' % float(m.group(1))).rstrip('0').rstrip('.'), body)
    return re.sub(r'\s+', ' ', body)

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/fluent/package/icons.json'
    data = json.load(open(src, encoding='utf-8'))
    icons = data['icons']
    out = {}
    for name in NAMES:
        icon = icons[name]
        w = icon.get('width', data.get('width', 32)); h = icon.get('height', data.get('height', 32))
        out[name] = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{squeeze(icon["body"])}</svg>'
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    js = ('// Рисунки Microsoft Fluent Emoji (MIT License, © Microsoft Corporation) — собраны scripts/emoji/build.py.\n'
          '// Питомцы и вещи магазина рисуются картинками, а не шрифтом: одинаково на любом компьютере.\n'
          '(function (root) {\n  root.YazychokEmojiArt = ' + json.dumps(out, ensure_ascii=False) + ';\n'
          '})(typeof window !== \'undefined\' ? window : globalThis);\n')
    open(os.path.join(root, 'js', 'emoji-art.js'), 'w', encoding='utf-8').write(js)
    print('emoji-art.js', len(js) // 1024, 'KB,', len(out), 'pictures')

main()

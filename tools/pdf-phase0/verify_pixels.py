"""Compara los PNG de Poppler. Pillow es una herramienta de QA, no de la app."""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'evidence/phase-0'
operations = json.loads((EVIDENCE / 'brie-placement.json').read_text())['operations']
results = []
for number in (1, 2):
    source = Image.open(EVIDENCE / f'brie-original-poppler-{number}.png').convert('RGB')
    filled = Image.open(EVIDENCE / f'brie-filled-poppler-{number}.png').convert('RGB')
    if source.size != filled.size:
        raise ValueError('Las imágenes tienen medidas diferentes')
    channels = ImageChops.difference(source, filled).split()
    diff = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    mask = Image.new('L', source.size)
    draw = ImageDraw.Draw(mask)
    sx, sy = source.width / 595.25, source.height / 842
    for operation in operations:
        if operation['page'] != number - 1:
            continue
        rect = operation['rect']
        draw.rectangle((
            int(rect['x'] * sx) - 2,
            int((842 - rect['y'] - rect['height']) * sy) - 2,
            int((rect['x'] + rect['width']) * sx) + 2,
            int((842 - rect['y']) * sy) + 2,
        ), fill=255)
    outside = ImageChops.multiply(diff, ImageChops.invert(mask))
    outside_pixels = outside.point(lambda value: 255 if value else 0).histogram()[255]
    changed_pixels = diff.point(lambda value: 255 if value else 0).histogram()[255]
    results.append({
        'page': number,
        'changedPixels': changed_pixels,
        'changedOutsideFillRegions': outside_pixels,
        'maskMarginPixels': 2,
        'pass': outside_pixels == 0 and changed_pixels > 0,
    })
    outside.save(EVIDENCE / f'brie-outside-diff-{number}.png')
result = {'renderer': 'Poppler', 'pages': results, 'pass': all(r['pass'] for r in results)}
(EVIDENCE / 'brie-pixel-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(0 if result['pass'] else 1)

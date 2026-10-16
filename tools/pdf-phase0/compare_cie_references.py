"""Contraste de cobertura y posiciones de las referencias elec1_m*.pdf."""
import hashlib
import json
import re
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evidence/phase-0/referencias-usos'
layout = json.loads((ROOT / 'tools/pdf-phase0/cie-layout.json').read_text())
normalize = lambda s: re.sub(r'\s+', ' ', s).strip()
choices = layout['fields']['TXT_Us']['choices']
covered = set()
records = []
for path in sorted((ROOT / 'plantillas').glob('elec1_m*.pdf'), key=lambda p: int(re.search(r'm(\d+)', p.name)[1])):
    with pdfplumber.open(path) as pdf:
        lines = pdf.pages[0].extract_text_lines()
        fulltext = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        uses = []
        for key, text in choices.items():
            matches = [line for line in lines if normalize(line['text']) == normalize(text)]
            if matches:
                covered.add(key)
                uses.append({'key': key, 'text': text, 'x': matches[0]['x0'], 'top': matches[0]['top']})
        answers = [{'value': l['text'], 'x': l['x0'], 'top': l['top']} for l in lines if l['text'] in ['Sí', 'No']]
        records.append({'file': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'uses': uses, 'answers50': answers, 'specificUseLabelPresent': 'Especifiqueu quin ús' in fulltext, 'p1DetailPresent': any(s in normalize(fulltext) for s in layout['fields']['TXT_P1']['choices']), 'p2DetailPresent': any(s in normalize(fulltext) for s in layout['fields']['TXT_P2']['choices'])})

positions = [use for r in records for use in r['uses']]
answers = [answer for r in records for answer in r['answers50']]
def span(items, axis):
    return round(max(i[axis] for i in items)-min(i[axis] for i in items), 5) if items else None
report = {
    'filesReviewed': len(records), 'sourceChoiceCount': len(choices), 'coveredChoiceCount': len(covered),
    'coveredKeys': sorted(covered), 'missingKeys': sorted(set(choices)-covered),
    'usePositionSpreadPoints': {'x': span(positions, 'x'), 'top': span(positions, 'top')},
    'answers50': sorted(set(a['value'] for a in answers)),
    'answerPositionSpreadPoints': {'x': span(answers, 'x'), 'top': span(answers, 'top')},
    'coveragePass': covered == set(choices) and set(a['value'] for a in answers) == {'Sí', 'No'},
    'positionsPass': all(span(items, axis) is not None and span(items, axis) < 0.01 for items in [positions, answers] for axis in ['x', 'top']),
    'doesNotEstablish': ['Posición del supuesto específico TXT_P1/TXT_P2', 'Subclasificaciones g1…g10 y h1…h22', 'Campo de texto de otros usos', 'Valor de otra tensión'],
    'limits': 'Referencias Carta con tipografía alterada; sirven para cobertura y geometría relativa. No sustituyen la base A4 ni prueban los campos que no muestran.',
    'cases': records,
}
OUT.mkdir(exist_ok=True)
(OUT / 'comparison.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
print(json.dumps({k: report[k] for k in ['filesReviewed', 'sourceChoiceCount', 'coveredChoiceCount', 'coveragePass', 'positionsPass', 'usePositionSpreadPoints', 'answerPositionSpreadPoints']}, indent=2))
raise SystemExit(0 if report['coveragePass'] and report['positionsPass'] else 1)

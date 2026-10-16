"""QA independiente: reabre los PDF, extrae texto y compara imágenes Poppler."""
import json
import os
import re
import subprocess
import sys
import tempfile
import hashlib
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'evidence/phase-0'
PDFS = ROOT / 'output/pdf/phase-0'
TEMPLATE = ROOT / 'plantillas/Plta_ELEC1CertificatInstalElectricaBT-result.pdf'
generation = json.loads((EVIDENCE / 'cie-static-generation.json').read_text())
env = dict(os.environ)
log_path = EVIDENCE / 'cie-static-render.log'
log_path.write_bytes(b'')
# Algunas distribuciones de Poppler para macOS no incluyen fonts.conf.
font_temp = tempfile.TemporaryDirectory(prefix='boletinexpress-fonts-')
if sys.platform == 'darwin' and not env.get('FONTCONFIG_FILE'):
    config = Path(font_temp.name) / 'fonts.conf'
    config.write_text(f'<?xml version="1.0"?><fontconfig><dir>/System/Library/Fonts/Supplemental</dir><dir>/Library/Fonts</dir><cachedir>{font_temp.name}</cachedir></fontconfig>')
    env['FONTCONFIG_FILE'] = str(config)


def render(file, prefix):
    with log_path.open('ab') as log:
        subprocess.run(['pdftoppm', '-scale-to', '1600', '-png', str(file), str(prefix)], check=True, env=env, stdout=log, stderr=log)


def compact(text):
    return re.sub(r'\s+', '', text)


render(TEMPLATE, EVIDENCE / 'cie-static-original-poppler')
def form_hashes(reader):
    result=set()
    visited=set()
    def visit(resources):
        if not resources:
            return
        resources=resources.get_object()
        for reference in resources.get('/XObject',{}).get_object().values() if resources.get('/XObject') else []:
            obj=reference.get_object()
            key=id(obj)
            if key in visited:
                continue
            visited.add(key)
            if obj.get('/Subtype')=='/Form':
                result.add(hashlib.sha256(obj.get_data()).hexdigest())
                visit(obj.get('/Resources'))
    for page in reader.pages:
        visit(page.get('/Resources'))
    return result

source_forms=form_hashes(PdfReader(TEMPLATE))
results = []
for case in generation['cases']:
    pdf_path = PDFS / case['file']
    background=EVIDENCE / 'backgrounds' / f"CIE-{case['id']}-background.pdf"
    render(background,EVIDENCE / f"cie-background-{case['id']}")
    render(pdf_path, EVIDENCE / f"cie-static-{case['id']}-poppler")
    placement = json.loads((EVIDENCE / f"cie-static-{case['id']}-placement.json").read_text())
    reader = PdfReader(pdf_path)
    background_reader=PdfReader(background)
    provenance=source_forms <= form_hashes(background_reader) and source_forms <= form_hashes(reader)
    texts = [compact(page.extract_text()) for page in reader.pages]
    text_checks = [{'field': op['name'], 'pass': compact(op['text']) in texts[op['page']]} for op in placement['operations'] if 'text' in op]
    structural = len(reader.pages) == 2 and '/AcroForm' not in reader.trailer['/Root'] and all(not p.get('/Annots') for p in reader.pages)
    pages = []
    for number in (1, 2):
        source = Image.open(EVIDENCE / f"cie-background-{case['id']}-{number}.png").convert('RGB')
        filled = Image.open(EVIDENCE / f"cie-static-{case['id']}-poppler-{number}.png").convert('RGB')
        if source.size != filled.size:
            raise ValueError('Medidas distintas')
        channels = ImageChops.difference(source, filled).split()
        diff = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
        mask = Image.new('L', source.size)
        draw = ImageDraw.Draw(mask)
        sx, sy = source.width / 595, source.height / 842
        for op in placement['operations']:
            if op['page'] != number - 1:
                continue
            for r in [op['rect']]+([op['labelRect']] if 'labelRect' in op else []):
                draw.rectangle((int(r['x'] * sx)-2, int((842-r['y']-r['height'])*sy)-2, int((r['x']+r['width'])*sx)+2, int((842-r['y'])*sy)+2), fill=255)
        outside = ImageChops.multiply(diff, ImageChops.invert(mask))
        outside_count = outside.point(lambda v: 255 if v else 0).histogram()[255]
        changed = diff.point(lambda v: 255 if v else 0).histogram()[255]
        has_operations = any(op['page'] == number-1 for op in placement['operations'])
        pages.append({'page': number, 'changedPixels': changed, 'changedOutsideFillRegions': outside_count, 'pass': outside_count == 0 and (changed > 0 or not has_operations)})
    results.append({'id': case['id'], 'structurePass': structural, 'originalVectorFormsPreserved':provenance, 'textChecks': text_checks, 'textPass': all(t['pass'] for t in text_checks), 'pages': pages, 'pass': structural and provenance and all(t['pass'] for t in text_checks) and all(p['pass'] for p in pages)})

report = {'renderer': 'Poppler', 'readback': 'pypdf', 'comparisonBasis':'Fondo vectorial de cada variante después de trasladar los bloques originales; no se compara todo con la plantilla vacía.', 'maskMarginPixels': 2, 'cases': results, 'pass': all(c['pass'] for c in results), 'limitation': 'La comparación de relleno no sustituye el contraste independiente de las traslaciones y saltos de página con XFA y Adobe.'}
(EVIDENCE / 'cie-static-verification.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
print(json.dumps({'cases': len(results), 'pass': report['pass'], 'failures': [c['id'] for c in results if not c['pass']]}, indent=2))
raise SystemExit(0 if report['pass'] else 1)

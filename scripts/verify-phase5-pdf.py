"""Reabre los CIE del worker y compara relleno contra cada fondo vectorial aprobado."""
from pathlib import Path
import hashlib, json, os, re, subprocess, tempfile
from PIL import Image, ImageChops, ImageDraw
from pypdf import PdfReader
base=Path(__file__).resolve().parents[1]/'evidence/phase-5'
variants=json.loads((base/'variants.json').read_text())
renderdir=base/'render';renderdir.mkdir(exist_ok=True)
poppler=os.environ.get('PDFTOPPM','pdftoppm')
results=[]
def compact(s):return re.sub(r'\s+','',s)
def form_hashes(reader):
    result=set();visited=set()
    def visit(resources):
        if not resources:return
        resources=resources.get_object()
        for ref in resources.get('/XObject',{}).get_object().values() if resources.get('/XObject') else []:
            obj=ref.get_object();key=id(obj)
            if key in visited:continue
            visited.add(key)
            if obj.get('/Subtype')=='/Form':result.add(hashlib.sha256(obj.get_data()).hexdigest());visit(obj.get('/Resources'))
    for page in reader.pages:visit(page.get('/Resources'))
    return result
source_forms=form_hashes(PdfReader(base.parents[1]/'assets/pdf/cie.pdf'))
for variant in variants:
    name=variant['id'];file=base/'variants'/f'{name}.pdf';pdf=PdfReader(file)
    assert hashlib.sha256(file.read_bytes()).hexdigest()==variant['sha256']
    assert len(pdf.pages)==2 and not pdf.get_fields()
    assert all(not any(a.get_object().get('/Subtype')=='/Widget' for a in page.get('/Annots',[])) for page in pdf.pages)
    assert all(abs(float(page.mediabox.width)-595)<0.01 and abs(float(page.mediabox.height)-842)<0.01 for page in pdf.pages)
    text=compact('\n'.join(page.extract_text() for page in pdf.pages))
    checks=[{'field':o['name'],'pass':compact(o['text']) in text} for o in variant['operations'] if o.get('text')]
    assert all(c['pass'] for c in checks),(name,checks)
    preserved=not source_forms or source_forms.issubset(form_hashes(pdf));assert preserved,name
    for suffix,input in [('',file),('-background',base/'variants'/f'{name}-background.pdf')]:
        subprocess.run([poppler,'-scale-to','1200','-png',str(input),str(renderdir/f'{name}{suffix}')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    pages=[]
    for n in [1,2]:
        source=Image.open(renderdir/f'{name}-background-{n}.png').convert('RGB');output=Image.open(renderdir/f'{name}-{n}.png').convert('RGB');assert source.size==output.size
        channels=ImageChops.difference(source,output).split();diff=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2])
        mask=Image.new('L',source.size);draw=ImageDraw.Draw(mask);sx,sy=source.width/595,source.height/842
        for o in variant['operations']:
            if o['page']!=n-1:continue
            for r in [o['rect']]+([o['labelRect']] if o.get('labelRect') else []):
                draw.rectangle((int(r['x']*sx)-2,int((842-r['y']-r['height'])*sy)-2,int((r['x']+r['width'])*sx)+2,int((842-r['y'])*sy)+2),fill=255)
        outside=ImageChops.multiply(diff,ImageChops.invert(mask));count=outside.point(lambda v:255 if v else 0).histogram()[255]
        pages.append({'page':n,'changedOutsideFields':count,'pass':count==0});assert count==0,(name,n,count)
    results.append({'id':name,'pass':True,'pages':pages,'originalVectorFormsPreserved':preserved,'textChecks':checks})
report={'pass':True,'cases':len(results),'pages':2*len(results),'results':results,'limitation':'Compara cada relleno con su fondo recompuesto. La fidelidad de los desplazamientos se apoya en las referencias aprobadas de fase 0.'}
(base/'pdf-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
# Láminas de inspección: una pareja de páginas por variante, con referencia completa a los PNG.
from PIL import ImageOps
sheets=[]
for offset in range(0,len(variants),4):
    chunk=variants[offset:offset+4];sheet=Image.new('RGB',(600,len(chunk)*440),'#dbe1e8');draw=ImageDraw.Draw(sheet)
    for row,v in enumerate(chunk):
        draw.text((8,row*440+3),v['id'],fill='black')
        for n in [1,2]:
            img=Image.open(renderdir/f"{v['id']}-{n}.png").convert('RGB');img.thumbnail((290,410));sheet.paste(img,((n-1)*300+5,row*440+22))
    sheet.save(renderdir/f'contact-{offset//4+1}.png')
print(json.dumps({'pass':True,'cases':len(results),'pages':2*len(results),'changedOutsideFields':0}))

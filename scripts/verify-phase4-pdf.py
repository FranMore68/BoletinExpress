"""QA local: verifica que el worker solo escribe en las regiones de campos aprobadas."""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
base = Path(__file__).resolve().parents[1] / 'evidence/phase-4'
results=[]
for case in ['completo','incompleto']:
    ops=json.loads((base/f'{case}-placement.json').read_text())['operations']
    for page in [1,2]:
        source=Image.open(base/f'render/original-{page}.png').convert('RGB')
        output=Image.open(base/f'render/{case}-{page}.png').convert('RGB')
        assert source.size==output.size
        channels=ImageChops.difference(source,output).split()
        diff=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2])
        mask=Image.new('L',source.size); draw=ImageDraw.Draw(mask)
        sx,sy=source.width/595.25,source.height/842
        for op in ops:
            if op['page']!=page-1:continue
            r=op['rect']
            draw.rectangle((int(r['x']*sx)-2,int((842-r['y']-r['height'])*sy)-2,int((r['x']+r['width'])*sx)+2,int((842-r['y'])*sy)+2),fill=255)
        outside=ImageChops.multiply(diff,ImageChops.invert(mask))
        pixels=outside.point(lambda v:255 if v else 0).histogram()[255]
        results.append({'case':case,'page':page,'changedOutsideApprovedFields':pixels,'pass':pixels==0})
r={'pass':all(x['pass'] for x in results),'renderer':'Poppler 110 dpi','results':results}
(base/'pixel-verification.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps(r,indent=2));raise SystemExit(0 if r['pass'] else 1)

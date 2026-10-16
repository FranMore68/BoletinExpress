from lxml import etree as E
from copy import deepcopy
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject
ROOT=Path(__file__).resolve().parents[2]
N='http://www.xfa.org/schema/xfa-form/2.8/';tag=lambda s:'{'+N+'}'+s
source=E.parse(str(ROOT/'evidence/phase-0/referencia-auditori/saved-form.xml')).getroot()
def child(e,t,n):
 for c in e:
  if c.tag==tag(t) and c.get('name')==n:return c
 return E.SubElement(e,tag(t),name=n)
def setv(e,value):
 for c in list(e):
  if c.tag==tag('value'):e.remove(c)
 v=E.SubElement(e,tag('value'),override='1')
 if value is not None:E.SubElement(v,tag('text')).text=value
out=ROOT/'evidence/phase-0/derived-xfa-references';out.mkdir(exist_ok=True)
for case in ['p2-h','altres','altra-tensio']:
 root=deepcopy(source);s=child(child(child(child(root,'subform','DATA'),'subform','principal'),'subform','sInstallacio'),'subform','sCaracteristiques');r=child(s,'subform','sRequisits')
 group=child(r,'exclGroup','RB_Requisits')
 for n in ['OPT_P1','OPT_P2','OPT_Memoria']:setv(child(group,'field',n),('P2' if n=='OPT_P2' else '0') if case=='p2-h' else ('Memoria' if n=='OPT_Memoria' else '0'))
 for sub,n in [('sP1','TXT_P1'),('sP2','TXT_P2'),('sG','TXT_G'),('sH','TXT_H')]:
  field=child(child(r,'subform',sub),'field',n);field.set('presence','hidden');setv(field,None)
 other=child(r,'subform','AltresUsos');other.set('presence','hidden')
 if case=='p2-h':
  p=child(child(r,'subform','sP2'),'field','TXT_P2');p.set('presence','visible');setv(p,'a) Instal·lacions corresponents a indústries, en general  20 kW>P<=100 kW');setv(child(r,'field','TXT_Us'),'h');p=child(child(r,'subform','sH'),'field','TXT_H');p.set('presence','visible');setv(p,'h6) Bar, cafeteria, restaurant o similar')
 elif case=='altres':
  setv(child(r,'field','TXT_Us'),'14');other.set('presence','visible');setv(child(other,'field','AltresUsos'),'Ús fictici d’avaluació')
 else:
  setv(child(r,'field','TXT_Us'),'5');allfields=child(r,'subform','sTotes');setv(child(allfields,'field','TXT_Tensio'),'Altra');p=child(allfields,'field','InfoTensioAltre');p.set('presence','visible');p.set('access','open');setv(p,'3 x 230 V')
 (out/(case+'-form.xml')).write_bytes(E.tostring(root))
 # Copias diagnósticas: plantilla oficial intacta; estado de formulario y datos coherentes.
 reader=PdfReader(ROOT/'plantillas/Plta_ELEC1CertificatInstalElectricaBTauditori.pdf')
 writer=PdfWriter();writer.clone_document_from_reader(reader);writer.pdf_header=b'%PDF-1.7'
 packets=writer._root_object['/AcroForm']['/XFA']
 for i in range(0,len(packets),2):
  name=str(packets[i]); raw=packets[i+1].get_object().get_data()
  if name=='form': raw=E.tostring(root)
  else:continue
  stream=DecodedStreamObject();stream.set_data(raw);packets[i+1]=writer._add_object(stream)
 writer.add_metadata({'/Title':f'PROVA FICTICIA - referencia derivada {case}'})
 writer.write(out/f'CIE-ref-{case}.pdf')
print(out)

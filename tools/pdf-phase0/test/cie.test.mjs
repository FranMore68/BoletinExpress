import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFName} from 'pdf-lib';
import {generateCie,checkCieValues,cieFields,CIE_STATIC_SHA256} from '../cie.mjs';
import {cieFixture,cieCases} from '../cie-fixtures.mjs';
import {templates} from '../paths.mjs';
import {sha256,inspectSource} from '../source.mjs';
import {flowMetrics} from '../cie-flow.mjs';

test('la plantilla estática conserva su huella y los originales no se modifican',async()=>{
  const files=[templates.brie,templates.cie,templates.cieStatic,templates.cieWorking];
  const before=await Promise.all(files.map(async p=>sha256(await readFile(p))));
  assert.equal(before[2],CIE_STATIC_SHA256);
  await generateCie(cieFixture);
  assert.deepEqual(await Promise.all(files.map(async p=>sha256(await readFile(p)))),before);
});
test('el archivo de trabajo conserva la estructura XFA de la referencia oficial',async()=>{
  const [official,working]=await Promise.all([inspectSource(templates.cie),inspectSource(templates.cieWorking)]);
  assert.equal(official.summary.sha256,'f846613f63196b0c2a2b343a64650e6e95a808d06a8ab7c5c1681f9b7d4ca19a');
  assert.equal(working.packets.template,official.packets.template);
});
test('CIE conserva dos páginas A4, cero widgets, cero XFA y fuente incrustada',async()=>{
  const result=await generateCie(cieFixture),pdf=await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(p=>p.getSize()),[{width:595,height:842},{width:595,height:842}]);
  assert.equal(pdf.catalog.has(PDFName.of('AcroForm')),false);
  for(const p of pdf.getPages()) assert.ok(!p.node.Annots() || p.node.Annots().size()===0);
  assert.ok(Buffer.from(result.bytes).includes(Buffer.from('/FontFile2')));
  assert.equal(result.operations.length,Object.keys(cieFixture).length);
  assert.deepEqual(result.warnings,[]);
  assert.equal(result.placementApproved,false);
});
for(const fixture of cieCases.filter(c=>c.expected?.length)) {
  test(`escribe el dato elegido en ${fixture.id} sin activar otras ramas`,async()=>{
    const result=await generateCie(fixture.values);
    const conditional=result.operations.filter(o=>o.placementStatus && o.name!=='TXT_Tecnologia').map(o=>o.name);
    assert.deepEqual(conditional.sort(),[...fixture.expected].sort());
    for(const n of fixture.expected) assert.equal(result.operations.find(o=>o.name===n).value,fixture.values[n]);
    assert.deepEqual(result.warnings,[]);
  });
}
test('un borrador incompleto señala ausencias sin inventar respuestas',async()=>{
  const f=cieCases.find(c=>c.id==='incomplet'),r=await generateCie(f.values);
  assert.deepEqual(r.warnings.sort(),['Dato pendiente: DDLAmpliaMod','Dato pendiente: TXT_P1','Dato pendiente: InfoTensioAltre'].sort());
  assert.equal(r.operations.length,Object.keys(f.values).length);
});
test('las ramas incompatibles se rechazan antes de dibujar',async()=>{
  const first=n=>Object.keys(cieFields[n].choices)[0];
  for(const values of [
    {RB_TipusActuacio:'NOVA',DDLAmpliaMod:'SI'},
    {RB_Requisits:'P1',TXT_P2:first('TXT_P2')},
    {RB_Requisits:'P2',TXT_P1:first('TXT_P1')},
    {TXT_Us:'g',TXT_H:first('TXT_H')},
    {TXT_Us:'h',TXT_G:first('TXT_G')},
    {TXT_Us:'5',AltresUsos:'dato antiguo'},
    {TXT_Tensio:'230 V',InfoTensioAltre:'dato antiguo'},
  ]) await assert.rejects(generateCie(values),/incompatible/);
});
test('todos los valores oficiales de P1, P2, g y h se escriben sin abreviar ni recortar',async()=>{
  for(const [name,parent,value] of [['TXT_P1','RB_Requisits','P1'],['TXT_P2','RB_Requisits','P2'],['TXT_G','TXT_Us','g'],['TXT_H','TXT_Us','h']]) {
    for(const option of Object.keys(cieFields[name].choices)) {
      const result=await generateCie({[parent]:value,[name]:option});
      assert.equal(result.operations.find(o=>o.name===name).text,option);
    }
  }
});
test('rechaza exceso de anchura, de altura y palabras indivisibles',async()=>{
  await assert.rejects(generateCie({TXT_Num:'A'.repeat(100)}),/no cabe/);
  await assert.rejects(generateCie({TXT_Observacions:'línea\n'.repeat(20)}),/altura/);
  await assert.rejects(generateCie({TXT_Observacions:'A'.repeat(1000)}),/palabra no cabe/);
  await assert.rejects(generateCie({TXT_Us:'14',AltresUsos:'A'.repeat(500)}),/no cabe/);
});
test('identificadores, valores de opción y tipos incorrectos no se aceptan',async()=>{
  for(const name of ['inventado','__proto__','constructor','toString','SignatureField1','CurrentPage','PageCount']) {
    await assert.rejects(generateCie(JSON.parse(`{"${name}":"dato"}`)),/Campo desconocido/);
  }
  await assert.rejects(generateCie({RB_Requisits:'OTRA'}),/Opción no válida/);
  await assert.rejects(generateCie({TXT_Num:42}),/Se esperaba texto/);
  await assert.rejects(generateCie({TXT_Us:'constructor'}),/Opción no válida/);
  await assert.rejects(generateCie({TXT_CodiPostal:'8001'}),/cinco cifras/);
  await assert.rejects(generateCie({RB_TipusActuacio:'NOVA',TXT_CUPS:'dato'}),/CUPS incompatible/);
  for(const value of [null,[],new Date(),'texto']) assert.throws(()=>checkCieValues(value),/no válidos/);
});
test('cero y No explícitos se conservan y no se inventan datos ausentes',async()=>{
  const r=await generateCie({TXT_Potencia:'0',RB_Subministrament:'NO',TXT_Num:null,NomCognoms:''});
  assert.equal(r.operations.length,2);
  assert.equal(r.operations[0].text,'0');assert.equal(r.operations[1].value,'NO');
});
test('rechaza una versión distinta de la plantilla',async()=>{
  await assert.rejects(generateCie({},Buffer.from('%PDF-otra')),/no coincide/);
});
test('se pueden combinar ampliación, P1, uso g y otra tensión sin perder datos',async()=>{
  const values={...cieFixture,RB_TipusActuacio:'AMPLIACIO',DDLAmpliaMod:'SI',RB_Requisits:'P1',TXT_P1:Object.keys(cieFields.TXT_P1.choices)[0],TXT_Us:'g',TXT_G:'g1) Cine',TXT_Tensio:'Altra',InfoTensioAltre:'3 x 230 V'};
  const r=await generateCie(values);
  for(const name of ['DDLAmpliaMod','TXT_P1','TXT_G','InfoTensioAltre']) assert.equal(r.operations.find(o=>o.name===name).value,values[name]);
  assert.deepEqual(r.warnings,[]);
});
test('cada campo del inventario XFA está mapeado o excluido expresamente',async()=>{
  const inv=JSON.parse(await readFile(new URL('../../../evidence/phase-0/inventory.json',import.meta.url),'utf8'));
  const mapped=new Set(Object.values(cieFields).flatMap(f=>f.sourcePaths||[f.sourcePath]).filter(Boolean));
  for(const f of inv.cie.fields) assert.ok(mapped.has(f.path) || ['SignatureField1','CurrentPage','PageCount'].includes(f.name),f.path);
  assert.equal(mapped.size,74);
});
test('los catorce usos conservan la lista y se desplazan solo al insertar un supuesto P1/P2',async()=>{
  for(const use of Object.keys(cieFields.TXT_Us.choices)) {
    const operations=[];
    for(const admin of ['P1','P2','MEMORIA']) {
      const r=await generateCie({RB_Requisits:admin,TXT_Us:use});
      const op=r.operations.find(o=>o.name==='TXT_Us');
      operations.push({text:op.text,rect:op.rect,fontSize:op.fontSize});
    }
    assert.deepEqual(operations[0],operations[1]);
    assert.equal(operations[0].text,operations[2].text);
    assert.equal(operations[0].rect.x,operations[2].rect.x);
    assert.ok(Math.abs(operations[2].rect.y-operations[0].rect.y-flowMetrics.classHeight)<0.001);
  }
});
test('la referencia Auditori tiene P1 bajo los botones y el detalle antes de los datos técnicos de página 2',async()=>{
  const f=cieCases.find(c=>c.id==='auditori_ref');const r=await generateCie(f.values);
  const op=name=>r.operations.find(o=>o.name===name);
  const p1=op('TXT_P1'),radio=op('RB_Requisits'),use=op('TXT_Us'),g=op('TXT_G'),power=op('TXT_PotenciaMax');
  assert.equal(p1.page,0);assert.ok(p1.rect.y+p1.rect.height<radio.rect.y);
  assert.ok(p1.rect.y>use.rect.y+use.rect.height);
  assert.equal(g.page,1);assert.ok(g.rect.y>power.rect.y+power.rect.height);
  assert.ok(Math.abs(r.flow.technicalShift-(13.5+3.822)*72/25.4)<0.001);
  assert.equal(r.components.find(c=>c.role==='technical-body').dy,-r.flow.technicalShift);
});
test('las variantes g/h y otros usos trasladan todos los datos técnicos, incluida la marca Sí/No',async()=>{
  for(const id of ['us_g','us_h','altres_usos']) {
    const f=cieCases.find(c=>c.id===id),r=await generateCie(f.values);
    for(const op of r.operations.filter(o=>o.page===1 && o.name!==r.flow.detailField)) {
      const original=cieFields[op.name];
      const originalY=original.type==='enumMark'?original.choices[op.value].y+2:original.rect.y;
      assert.ok(Math.abs(op.rect.y-originalY+r.flow.technicalShift)<0.001,op.name);
    }
  }
});
test('la pregunta del 50 % conserva posición y coloca Sí/No a la derecha',async()=>{
  const results=[];
  for(const action of ['AMPLIACIO','MODIFICACIO'])for(const value of ['SI','NO']) {
    const r=await generateCie({RB_TipusActuacio:action,DDLAmpliaMod:value});
    const op=r.operations.find(o=>o.name==='DDLAmpliaMod');
    assert.ok(op.valueRect.x>op.rect.x+200);
    assert.equal(op.labelLines.join(' '),cieFields.DDLAmpliaMod.label);
    results.push({rect:op.rect,valueRect:op.valueRect,labelLines:op.labelLines});
  }
  for(const r of results)assert.deepEqual(r,results[0]);
});
test('todas las operaciones quedan en la página y no se solapan entre sí',async()=>{
  for(const c of cieCases) {
    const {operations:ops}=await generateCie(c.values);
    for(const o of ops) {
      const r=o.rect;assert.ok(r.x>=0 && r.y>=0 && r.x+r.width<=595 && r.y+r.height<=842,o.name);
    }
    for(let i=0;i<ops.length;i++)for(let j=i+1;j<ops.length;j++) {
      const a=ops[i],b=ops[j];if(a.page!==b.page)continue;
      const x=Math.min(a.rect.x+a.rect.width,b.rect.x+b.rect.width)-Math.max(a.rect.x,b.rect.x);
      const y=Math.min(a.rect.y+a.rect.height,b.rect.y+b.rect.height)-Math.max(a.rect.y,b.rect.y);
      assert.ok(x<=0 || y<=0,`${c.id}: ${a.name} solapa ${b.name}`);
    }
  }
});

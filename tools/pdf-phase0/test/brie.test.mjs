import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFName } from 'pdf-lib';
import { generateBrie,BRIE_SOURCE_SHA256 } from '../brie.mjs';
import { brieFixture,brieFields } from '../brie-layout.mjs';
import { inspectSource,sha256 } from '../source.mjs';
import { templates } from '../paths.mjs';

test('la plantilla BRIE conserva su huella y sus dos páginas',async()=>{
  const source=await inspectSource(templates.brie);
  assert.equal(source.summary.sha256,BRIE_SOURCE_SHA256);
  assert.equal(source.summary.storedPages,2);
  assert.equal(source.summary.form,'static');
});
test('la plantilla CIE original sigue intacta y se identifica como XFA',async()=>{
  const source=await inspectSource(templates.cie);
  assert.equal(source.summary.sha256,'f846613f63196b0c2a2b343a64650e6e95a808d06a8ab7c5c1681f9b7d4ca19a');
  assert.equal(source.summary.form,'XFA');
  assert.ok(source.packets.template.includes('RB_Requisits'));
});
test('el BRIE completo conserva páginas, medidas y fuente incrustada',async()=>{
  const result=await generateBrie(brieFixture);
  const pdf=await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(p=>p.getSize()),[{width:595.25,height:842},{width:595.25,height:842}]);
  assert.equal(pdf.catalog.has(PDFName.of('AcroForm')),false);
  assert.equal(pdf.catalog.has(PDFName.of('JavaScript')),false);
  assert.equal(result.operations.length,58);
  assert.ok(Buffer.from(result.bytes).includes(Buffer.from('/FontFile2')));
});
test('las opciones No y el valor cero se trasladan sin desaparecer',async()=>{
  const result=await generateBrie({ascensor:false,potencia_ascensor:'0'});
  assert.equal(result.operations.length,2);
  assert.equal(result.operations[0].value,false);
  assert.equal(result.operations[0].rect.x,brieFields.ascensor.no.x-1);
  assert.equal(result.operations[1].lines[0],'0');
});
test('los datos ausentes dejan campos vacíos sin valores inventados',async()=>{
  const result=await generateBrie({empresa_nom:'',empresa_rasic:null});
  assert.equal(result.operations.length,0);
});
test('el campo condicional de tensión del defecto 3 también admite datos explícitos',async()=>{
  const result=await generateBrie({defecte_3:true,defecte_3_tensio:'24'});
  assert.equal(result.operations.length,2);
  assert.equal(result.operations[1].lines[0],'24');
});
test('rechaza una plantilla distinta antes de escribir datos',async()=>{
  await assert.rejects(generateBrie({},Buffer.from('%PDF-otra-plantilla')),/plantilla BRIE no coincide/);
});
for(const name of ['campo_inventado','toString','constructor','__proto__']) {
  test(`rechaza el campo no definido ${name}`,async()=>{
    await assert.rejects(generateBrie(JSON.parse(`{"${name}":"prueba"}`)),/Campo desconocido/);
  });
}
test('rechaza texto excesivo y nunca lo recorta',async()=>{
  await assert.rejects(generateBrie({local_cp:'1234567890'.repeat(10)}),/no cabe/);
});
test('rechaza párrafos que superan el espacio disponible',async()=>{
  await assert.rejects(generateBrie({comentaris:'línea\n'.repeat(20)}),/altura/);
});
test('rechaza palabras indivisibles que no caben en el campo',async()=>{
  await assert.rejects(generateBrie({treball:'A'.repeat(500)}),/palabra no cabe/);
});
test('rechaza opciones, booleanos y tipos de texto incorrectos',async()=>{
  await assert.rejects(generateBrie({exemplar:'otra'}),/Opción no válida/);
  await assert.rejects(generateBrie({ascensor:'No'}),/Sí\/No/);
  await assert.rejects(generateBrie({potencia_maxima:9.2}),/Se esperaba texto/);
});
test('todas las marcas quedan en la página y en la opción seleccionada',async()=>{
  const result=await generateBrie(brieFixture);
  for(const op of result.operations) {
    assert.ok(op.rect.x>=0 && op.rect.y>=0);
    assert.ok(op.rect.x+op.rect.width<=595.25);
    assert.ok(op.rect.y+op.rect.height<=842);
  }
  assert.equal(result.operations.filter(op=>op.name==='exemplar').length,1);
});
test('la generación no modifica los bytes de la plantilla',async()=>{
  const before=sha256(await readFile(templates.brie));
  await generateBrie(brieFixture);
  assert.equal(sha256(await readFile(templates.brie)),before);
});

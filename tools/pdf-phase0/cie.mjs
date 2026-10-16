import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,rgb,PDFName} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {toolDir,templates} from './paths.mjs';
import {sha256} from './source.mjs';
import {planCieFlow,composeCieBackground,placeCieField} from './cie-flow.mjs';

export const cieLayout=JSON.parse(await readFile(new URL('./cie-layout.json',import.meta.url),'utf8'));
export const CIE_STATIC_SHA256=cieLayout.staticSourceSha256;
export const cieFields=cieLayout.fields;
const conditionals=['DDLAmpliaMod','TXT_P1','TXT_P2','TXT_G','TXT_H','AltresUsos','InfoTensioAltre'];
const present=v=>v!==undefined && v!==null && v!=='';
const isRecord=v=>v && typeof v==='object' && !Array.isArray(v) && [Object.prototype,null].includes(Object.getPrototypeOf(v));

export function checkCieValues(values) {
  if(!isRecord(values)) throw new Error('Datos de CIE no válidos');
  for(const [name,value] of Object.entries(values)) {
    if(!Object.hasOwn(cieFields,name)) throw new Error(`Campo desconocido: ${name}`);
    if(!present(value)) continue;
    if(typeof value!=='string') throw new Error(`Se esperaba texto: ${name}`);
    const f=cieFields[name];
    if(f.choices && !Object.hasOwn(f.choices,value)) throw new Error(`Opción no válida: ${name}`);
    if(f.postal && !/^\d{5}$/.test(value)) throw new Error(`Código postal de cinco cifras: ${name}`);
  }
  const active={
    DDLAmpliaMod:['AMPLIACIO','MODIFICACIO'].includes(values.RB_TipusActuacio),
    TXT_P1:values.RB_Requisits==='P1',TXT_P2:values.RB_Requisits==='P2',
    TXT_G:values.TXT_Us==='g',TXT_H:values.TXT_Us==='h',AltresUsos:values.TXT_Us==='14',
    InfoTensioAltre:values.TXT_Tensio==='Altra',
  };
  for(const name of conditionals) if(present(values[name]) && !active[name]) throw new Error(`Campo incompatible con la selección: ${name}`);
  // Regla impresa en el propio modelo: no cumplimentar CUPS en nueva instalación.
  if(values.RB_TipusActuacio==='NOVA' && present(values.TXT_CUPS)) throw new Error('CUPS incompatible con instalación nueva');
  const warnings=conditionals.filter(n=>active[n] && !present(values[n])).map(n=>`Dato pendiente: ${n}`);
  return {active,warnings};
}

function wrap(text,font,size,width,multiline) {
  const fits=s=>font.widthOfTextAtSize(s,size)<=width;
  if(!multiline) {
    if(text.includes('\n') || !fits(text)) throw new Error('El texto no cabe en el campo');
    return [text];
  }
  const lines=[];
  for(const p of text.split('\n')) {
    let line='';
    for(const word of p.split(/\s+/).filter(Boolean)) {
      if(!fits(word)) throw new Error('Una palabra no cabe en el campo');
      const candidate=line?`${line} ${word}`:word;
      if(!fits(candidate)) {lines.push(line);line=word;} else line=candidate;
    }
    lines.push(line);
  }
  return lines;
}

// Prototipo de emplazamiento. Las posiciones de campos ocultos NO están aprobadas.
export async function generateCie(values,sourceBytes) {
  const {warnings}=checkCieValues(values);
  const bytes=sourceBytes||await readFile(templates.cieStatic);
  if(sha256(bytes)!==CIE_STATIC_SHA256) throw new Error('La plantilla CIE no coincide con la versión revisada');
  const source=await PDFDocument.load(bytes,{updateMetadata:false});
  if(source.getPageCount()!==2 || source.catalog.has(PDFName.of('AcroForm'))) throw new Error('Se esperaba la plantilla estática de dos páginas');
  const flow=planCieFlow(values);
  let {pdf,components}=await composeCieBackground(source,flow);
  pdf.setTitle('CIE - PROVA FICTÍCIA - PENDENT D\'ACCEPTACIÓ');
  pdf.setAuthor('BoletinExpress - proves de programari');
  pdf.setSubject('Dades fictícies; sense signatura. Mostra per a la revisió de la fase 0.');
  pdf.setCreator('BoletinExpress - prototip fase 0');
  const backgroundBytes=await pdf.save({useObjectStreams:false});
  // Tras serializar, pdf-lib conserva en caché los streams ya pintados.
  // Reabrir crea un stream de relleno nuevo y evita entregar solo el fondo.
  pdf=await PDFDocument.load(backgroundBytes,{updateMetadata:false});
  pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(await readFile(path.join(toolDir,'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')),{subset:true});
  const operations=[];
  for(const [name,value] of Object.entries(values)) {
    if(!present(value)) continue;
    const field=placeCieField(name,cieFields[name],flow);
    const page=pdf.getPage(field.page);
    if(field.type==='enumMark') {
      const r=field.choices[value];
      // Cruz centrada dentro del círculo impreso, sin borrar su contorno.
      for(const flip of [false,true]) page.drawLine({start:{x:r.x+3,y:r.y+(flip?3:7)},end:{x:r.x+7,y:r.y+(flip?7:3)},thickness:0.7,color:rgb(0,0,0)});
      operations.push({name,page:field.page,type:'mark',value,rect:{x:r.x+2,y:r.y+2,width:6,height:6}});
      continue;
    }
    const r=field.valueRect||field.rect;
    const text=field.choices?field.choices[value]:value;
    // Mantener 8 pt; solo los supuestos oficiales muy largos se ajustan a 7 pt.
    const size=['TXT_P1','TXT_P2'].includes(name) && font.widthOfTextAtSize(text,8)>r.width-2?7:8;
    let lines;
    try {lines=wrap(text,font,size,r.width-2,field.multiline===true);} catch(e) {throw new Error(`${name}: ${e.message}`);}
    const step=size+2,labelSize=name==='DDLAmpliaMod'?7:6.5;
    const labelHeight=field.label && !field.valueRect && !field.labelRect?labelSize+2:0;
    const required=(lines.length-1)*step+size+1+labelHeight;
    if(required>r.height+0.01 && !field.postal) throw new Error(`${name}: el texto supera la altura del campo`);
    const top=r.y+r.height;
    if(field.labelRect) {
      page.drawText(field.label,{x:field.labelRect.x+1,y:field.labelRect.y+2.18,size:8,font});
    } else if(field.valueRect && field.labelLines) {
      const labelWidth=field.valueRect.x-field.rect.x-8;
      for(const [i,line] of field.labelLines.entries()) {
        if(font.widthOfTextAtSize(line,8)>labelWidth) throw new Error(`${name}: la etiqueta no cabe`);
        page.drawText(line,{x:field.rect.x+1,y:field.rect.y+field.rect.height-11-i*10,size:8,font});
      }
    } else if(field.label) {
      if(font.widthOfTextAtSize(field.label,labelSize)>r.width) throw new Error(`${name}: la etiqueta no cabe`);
      page.drawText(field.label,{x:r.x+1,y:top-labelSize,size:labelSize,font});
    }
    if(field.postal) {
      const cell=r.width/5;
      [...text].forEach((char,i)=>page.drawText(char,{x:r.x+i*cell+(cell-font.widthOfTextAtSize(char,size))/2,y:r.y+(r.height-size)/2+1,size,font}));
    } else {
      const y=field.label && !field.valueRect && !field.labelRect?top-labelHeight-size:r.y+(r.height-required)/2+2+(lines.length-1)*step;
      lines.forEach((line,i)=>page.drawText(line,{x:r.x+1,y:y-i*step,size,font}));
    }
    operations.push({name,page:field.page,type:field.type,value,text,lines,fontSize:size,rect:{...field.rect},...(field.labelRect?{labelRect:field.labelRect}:{}),...(field.valueRect?{valueRect:{...field.valueRect},labelLines:field.labelLines}:{}),...(field.placementStatus?{placementStatus:field.placementStatus}:{})});
  }
  return {bytes:await pdf.save({useObjectStreams:false}),backgroundBytes,components,flow,operations,warnings,placementApproved:false};
}

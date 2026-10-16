import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import path from 'node:path';
import { brieFields } from './brie-layout.mjs';
import { sha256 } from './source.mjs';
import { templates, toolDir } from './paths.mjs';

export const BRIE_SOURCE_SHA256='5cc739303306d37a35a0b4912c6e7b6240d141e8ae251c4dc1d604e086eb2b64';

function linesFor(value, field, font) {
  const size=field.fontSize;
  const fits=line=>font.widthOfTextAtSize(line,size)<=field.width;
  if(!field.multiline) {
    if(value.includes('\n') || !fits(value)) throw new Error('El texto no cabe en el campo');
    return [value];
  }
  const lines=[];
  for(const paragraph of value.split('\n')) {
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)) {
      if(!fits(word)) throw new Error('Una palabra no cabe en el campo');
      const candidate=line?`${line} ${word}`:word;
      if(!fits(candidate)) {lines.push(line);line=word;} else line=candidate;
    }
    lines.push(line);
  }
  if(lines.length*10>field.height) throw new Error('El texto supera la altura del campo');
  return lines;
}

export async function generateBrie(values, sourceBytes) {
  if(!values || typeof values!=='object' || Array.isArray(values)) throw new Error('Datos de BRIE no válidos');
  const bytes=sourceBytes||await readFile(templates.brie);
  if(sha256(bytes)!==BRIE_SOURCE_SHA256) throw new Error('La plantilla BRIE no coincide con la versión revisada');
  const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  pdf.setTitle('BRIE - PROVA FICTÍCIA - BoletinExpress');
  pdf.setAuthor('BoletinExpress - proves de programari');
  pdf.setSubject('Exemple fictici sense signatures ni validesa de certificat');
  pdf.setCreator('BoletinExpress - prototip fase 0');
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());
  pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(await readFile(path.join(toolDir,'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')),{subset:true});
  const operations=[];
  for(const [name,value] of Object.entries(values)) {
    if(!Object.hasOwn(brieFields,name)) throw new Error(`Campo desconocido: ${name}`);
    const field=brieFields[name];
    if(value===null || value===undefined || value==='') continue;
    if(field.type==='boolean' && typeof value!=='boolean') throw new Error(`Se esperaba Sí/No: ${name}`);
    if(field.type==='enum' && !Object.hasOwn(field.choices,value)) throw new Error(`Opción no válida: ${name}`);
    if(field.type==='text' && typeof value!=='string') throw new Error(`Se esperaba texto: ${name}`);
    const page=pdf.getPage(field.page);
    if(field.type==='text') {
      let lines;
      try {lines=linesFor(value,field,font);} catch(error) {throw new Error(`${name}: ${error.message}`);}
      for(let i=0;i<lines.length;i++) page.drawText(lines[i],{x:field.x,y:field.y-i*10,size:field.fontSize,font,color:rgb(0,0,0)});
      operations.push({name,page:field.page,type:'text',value,lines,rect:{x:field.x-1,y:field.y-(lines.length-1)*10-3,width:field.width+2,height:lines.length*10+2}});
    } else {
      const rect=field.type==='boolean'?(value?field.yes:field.no):field.choices[value];
      const inset=0.8;
      page.drawLine({start:{x:rect.x+inset,y:rect.y+inset},end:{x:rect.x+rect.width-inset,y:rect.y+rect.height-inset},thickness:0.8,color:rgb(0,0,0)});
      page.drawLine({start:{x:rect.x+inset,y:rect.y+rect.height-inset},end:{x:rect.x+rect.width-inset,y:rect.y+inset},thickness:0.8,color:rgb(0,0,0)});
      operations.push({name,page:field.page,type:field.type,value,rect:{x:rect.x-1,y:rect.y-1,width:rect.width+2,height:rect.height+2}});
    }
  }
  return {bytes:await pdf.save({useObjectStreams:false}),operations};
}

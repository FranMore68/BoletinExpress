import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateBrie } from './brie.mjs';
import { brieFields, brieFixture } from './brie-layout.mjs';
import { evidenceDir,pdfDir,toolDir } from './paths.mjs';

await mkdir(pdfDir,{recursive:true});
await mkdir(evidenceDir,{recursive:true});
const result=await generateBrie(brieFixture);
await writeFile(path.join(pdfDir,'BRIE-datos-ficticios-PRUEBA.pdf'),result.bytes);
await writeFile(path.join(evidenceDir,'brie-placement.json'),JSON.stringify({fields:brieFields,operations:result.operations},null,2)+'\n');
await writeFile(path.join(toolDir,'brie-fixture.json'),JSON.stringify(brieFixture,null,2)+'\n');
console.log(JSON.stringify({pages:2,filledFields:result.operations.length,output:'output/pdf/phase-0/BRIE-datos-ficticios-PRUEBA.pdf'}));

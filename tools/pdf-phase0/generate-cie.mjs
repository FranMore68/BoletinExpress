import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {generateCie,cieLayout} from './cie.mjs';
import {cieCases} from './cie-fixtures.mjs';
import {evidenceDir,pdfDir} from './paths.mjs';

await mkdir(path.join(pdfDir,'cie-variantes'),{recursive:true});
await mkdir(path.join(evidenceDir,'backgrounds'),{recursive:true});
const results=[];
for(const fixture of cieCases) {
  const result=await generateCie(fixture.values);
  const relative=fixture.id==='base'?'CIE-datos-ficticios-PRUEBA.pdf':`cie-variantes/CIE-${fixture.id}-PRUEBA.pdf`;
  await writeFile(path.join(pdfDir,relative),result.bytes);
  await writeFile(path.join(evidenceDir,'backgrounds',`CIE-${fixture.id}-background.pdf`),result.backgroundBytes);
  await writeFile(path.join(evidenceDir,`cie-static-${fixture.id}-placement.json`),JSON.stringify({id:fixture.id,file:relative,sourceSha256:cieLayout.staticSourceSha256,operations:result.operations,warnings:result.warnings,flow:result.flow,components:result.components,placementApproved:false},null,2)+'\n');
  results.push({id:fixture.id,file:relative,operations:result.operations.length,warnings:result.warnings,expected:fixture.expected||[],dataTransferred:(fixture.expected||[]).every(n=>result.operations.some(o=>o.name===n && o.value===fixture.values[n])),placementApproved:false});
}
await writeFile(path.join(evidenceDir,'cie-static-fixtures.json'),JSON.stringify(cieCases,null,2)+'\n');
await writeFile(path.join(evidenceDir,'cie-static-generation.json'),JSON.stringify({approach:'static-overlay',cases:results,sourceSha256:cieLayout.staticSourceSha256,acceptance:'PENDIENTE_REFERENCIAS_VARIANTES_ADOBE'},null,2)+'\n');
console.log(JSON.stringify(results,null,2));

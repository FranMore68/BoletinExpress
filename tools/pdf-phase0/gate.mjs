import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {evidenceDir,pdfDir} from './paths.mjs';

// Las pruebas unitarias del prototipo no son una aprobación de la fase.
try {
  const variants=JSON.parse(await readFile(path.join(evidenceDir,'cie-static-generation.json'),'utf8'));
  const ciePixels=JSON.parse(await readFile(path.join(evidenceDir,'cie-static-verification.json'),'utf8'));
  const references=JSON.parse(await readFile(path.join(evidenceDir,'referencias-usos/comparison.json'),'utf8'));
  const pixels=JSON.parse(await readFile(path.join(evidenceDir,'brie-pixel-verification.json'),'utf8'));
  const audit=JSON.parse(await readFile(path.join(evidenceDir,'npm-audit.json'),'utf8'));
  const visual=JSON.parse(await readFile(path.join(evidenceDir,'visual-review.json'),'utf8'));
  const unit=await readFile(path.join(evidenceDir,'unit-tests.tap'),'utf8');
  const reviewedFiles=await Promise.all(variants.cases.map(async c=>{
    const hash=createHash('sha256').update(await readFile(path.join(pdfDir,c.file))).digest('hex');
    return visual.cie.reviewedPdfHashes?.[c.file]===hash;
  }));
  const checks={
    unitTests:/^# fail 0$/m.test(unit) && /^# tests [1-9][0-9]*$/m.test(unit) && !/^not ok /m.test(unit),
    briePixels:pixels.pass===true,
    cieVariants:['ampliacio_50','modificacio_50','classe_p1','classe_p2','us_g','us_h','altres_usos','tensio_altra'].every(id=>variants.cases.some(c=>c.id===id && c.dataTransferred===true)),
    ciePixels:ciePixels.pass===true && ciePixels.cases.length===11 && ciePixels.cases.every(c=>c.pass===true),
    cieUseAnd50References:references.coveragePass===true && references.positionsPass===true,
    dependencies:(audit.metadata?.vulnerabilities?.high===0 && audit.metadata?.vulnerabilities?.critical===0),
    visualReview:visual.brie.pass===true && visual.cie.pass===true,
    cieReferenceFidelity:visual.cie.conditionalReferenceComparison?.pass===true,
    reviewedFilesUnchanged:reviewedFiles.every(Boolean),
  };
  const passed=Object.values(checks).every(Boolean);
  console.log(JSON.stringify({phase:0,status:passed?'PENDIENTE_ACEPTACION_USUARIO':'BLOQUEADA',checks},null,2));
  process.exitCode=passed?0:1;
} catch(error) {
  console.error(`Fase 0 incompleta: ${error.message}`);
  process.exitCode=1;
}

import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startProbeServer } from './browser-probe.mjs';
import { templates,evidenceDir,chromePath } from './paths.mjs';

const server=await startProbeServer(await readFile(templates.cie));
let browser;
try {
  browser=await chromium.launch({executablePath:chromePath,headless:true});
  const context=await browser.newContext({viewport:{width:900,height:1100}});
  await context.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
  const page=await context.newPage();
  const results=[];
  async function reset() {
    await page.goto(server.url);
    await page.waitForFunction(()=>window.probe?.ready,undefined,{timeout:60000});
    const error=await page.evaluate(()=>window.probe.error);
    if(error) throw new Error(error);
  }
  async function caseRadio(id,index,expectedOption) {
    await reset();
    await page.locator('.sheet').first().locator('input[type=radio]').nth(index).check();
    const actual=await page.locator('select option').allTextContents();
    const pass=actual.some(t=>t.startsWith(expectedOption));
    results.push({id,pass,expected:`Aparece el campo con la opción «${expectedOption}»`,observed:pass?'Campo presente':'El campo condicional no aparece'});
  }
  await caseRadio('ampliacio_50',1,'Sí');
  await caseRadio('modificacio_50',2,'Sí');
  await caseRadio('classe_p1',3,'a) Instal·lacions industrials amb una potència');
  await caseRadio('classe_p2',4,'a) Instal·lacions corresponents a indústries');
  for(const [value,prefix] of [['g','g1) Cine'],['h','h1) Temple']]) {
    await reset();
    await page.locator('select').filter({has:page.locator('option[value="g"]')}).selectOption(value);
    const pass=(await page.locator('select option').allTextContents()).some(t=>t.startsWith(prefix));
    results.push({id:`us_${value}`,pass,expected:`Aparece la subclasificación ${value}`,observed:pass?'Campo presente':'La subclasificación no aparece'});
  }
  await reset();
  await page.locator('select').filter({has:page.locator('option[value="g"]')}).selectOption('14');
  const otherVisible=await page.getByText('Especifiqueu quin ús',{exact:true}).count();
  results.push({id:'altres_usos',pass:otherVisible>0,expected:'Aparece el campo Especifiqueu quin ús',observed:`${otherVisible} etiquetas presentes`});
  await reset();
  const voltage=page.locator('select[aria-label="Tensió"]');
  await voltage.selectOption('Altra');
  const info=await page.evaluate(()=>{
    const select=document.querySelector('select[aria-label="Tensió"]');
    const parent=select.closest('.xfaField');
    return {html:parent?.parentElement?.outerHTML||select.parentElement.parentElement.outerHTML};
  });
  const hasVisibleOther=await page.locator('input[aria-label="Té subministrament complementari?"]').isVisible();
  results.push({id:'tensio_altra',pass:hasVisibleOther,expected:'El campo de otra tensión se hace visible',observed:hasVisibleOther?'Campo visible':'El campo sigue invisible'});
  await writeFile(path.join(evidenceDir,'cie-variants.json'),JSON.stringify({pdfjsVersion:'6.4.299',scriptingExecuted:false,cases:results,voltageDom:info.html},null,2)+'\n');
  await page.locator('.sheet').nth(1).screenshot({path:path.join(evidenceDir,'cie-tensio-altra-pdfjs.png')});
  console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,cases:results},null,2));
  if(results.some(r=>!r.pass)) process.exitCode=1;
} finally {await browser?.close();await server.close();}

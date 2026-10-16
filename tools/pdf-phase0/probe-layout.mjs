// Diagnóstico de geometría; no genera una plantilla aprobada ni ejecuta scripts XFA.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {startProbeServer} from './browser-probe.mjs';
import {chromePath,templates,evidenceDir} from './paths.mjs';

const file=process.argv[2]||templates.cie;
const prefix=process.argv[3]||'cie-layout-base';
const server=await startProbeServer(await readFile(file));
let browser;
try {
  browser=await chromium.launch({executablePath:chromePath,headless:true});
  const ctx=await browser.newContext({viewport:{width:1000,height:1300}});
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
  const page=await ctx.newPage();await page.goto(server.url);
  await page.waitForFunction(()=>window.probe?.ready,undefined,{timeout:60000});
  const result=await page.evaluate(()=>{
    if(window.probe.error)throw new Error(window.probe.error);
    const sheets=[...document.querySelectorAll('.sheet')];
    return {probe:window.probe,controls:[...document.querySelectorAll('input,select,textarea')].map(el=>{
      const sheet=el.closest('.sheet'),s=sheet.getBoundingClientRect(),r=el.getBoundingClientRect();
      const scale=s.width/595;
      return {page:sheets.indexOf(sheet),tag:el.tagName,label:el.getAttribute('aria-label'),value:el.value,visible:r.width>0 && r.height>0,rect:{x:(r.x-s.x)/scale,y:842-(r.y-s.y+r.height)/scale,width:r.width/scale,height:r.height/scale},options:el.options?[...el.options].map(o=>({value:o.value,label:o.textContent})):undefined};
    })};
  });
  await writeFile(path.join(evidenceDir,`${prefix}.json`),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({pages:result.probe.pages.length,targets:result.controls.filter(c=>c.options?.some(o=>o.value==='g' || o.label.includes('superior a 100 kW') || o.label.includes('g3) Auditori')))},null,2));
} finally {await browser?.close();await server.close();}

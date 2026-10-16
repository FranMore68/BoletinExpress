import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startProbeServer } from './browser-probe.mjs';
import { templates,evidenceDir,chromePath } from './paths.mjs';

export async function renderStatic(file, prefix) {
  await mkdir(evidenceDir,{recursive:true});
  const server=await startProbeServer(await readFile(file));
  let browser;
  try {
    browser=await chromium.launch({executablePath:chromePath,headless:true});
    const context=await browser.newContext();
    await context.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
    const page=await context.newPage();
    await page.goto(`${server.url}/static.html`);
    await page.waitForFunction(()=>window.staticProbe?.ready,undefined,{timeout:60000});
    const result=await page.evaluate(()=>window.staticProbe);
    if(result.error) throw new Error(result.error);
    const images=await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>c.toDataURL('image/png').split(',')[1]));
    for(let i=0;i<images.length;i++) await writeFile(path.join(evidenceDir,`${prefix}-page${i+1}.png`),Buffer.from(images[i],'base64'));
    await writeFile(path.join(evidenceDir,`${prefix}-text.json`),JSON.stringify(result,null,2)+'\n');
    return result;
  } finally { await browser?.close(); await server.close(); }
}
if(process.argv[1] && path.resolve(process.argv[1])===new URL(import.meta.url).pathname) {
  const result=await renderStatic(process.argv[2]||templates.brie,process.argv[3]||'brie-original');
  console.log(JSON.stringify({pages:result.pages.map(p=>({number:p.number,width:p.width,height:p.height}))}));
}

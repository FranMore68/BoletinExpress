import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startProbeServer } from './browser-probe.mjs';
import { templates, evidenceDir, chromePath } from './paths.mjs';

await mkdir(evidenceDir, { recursive: true });
const server = await startProbeServer(await readFile(templates.cie));
let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 900, height: 1100 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === server.url ? route.continue() : route.abort());
  const page = await context.newPage();
  const messages = [];
  page.on('console', message => messages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', error => messages.push({ type: 'pageerror', text: String(error) }));
  await page.goto(server.url);
  await page.waitForFunction(() => window.probe?.ready, undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    await document.fonts.ready;
  });
  const result = await page.evaluate(() => ({
    ...window.probe,
    text: document.getElementById('pages').innerText,
    fonts: [...document.fonts].map(f => ({family:f.family,status:f.status})),
    computedFonts: [...document.querySelectorAll('.xfaLayer span')].slice(0,12).map(el=>({text:el.textContent.slice(0,80), family:getComputedStyle(el).fontFamily, size:getComputedStyle(el).fontSize})),
    images: [...document.images].map(img=>({complete:img.complete,width:img.naturalWidth,height:img.naturalHeight,source:img.src.slice(0,50)})),
    controls: [...document.querySelectorAll('input, textarea, select')].map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      title: el.title,
      ariaLabel: el.getAttribute('aria-label'),
      dataId: el.getAttribute('data-element-id'),
      value: el.value,
      options: el.tagName === 'SELECT' ? [...el.options].map(o => ({text:o.text, value:o.value})) : null,
      rect: {x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height},
    })),
  }));
  result.messages = messages;
  await writeFile(path.join(evidenceDir, 'cie-probe.json'), JSON.stringify(result, null, 2) + '\n');
  if (result.error) throw new Error(result.error);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(evidenceDir, 'CIE-PDFjs-base-NO-APTO.pdf'), preferCSSPageSize: true, printBackground: true });
  for (let i = 0; i < result.pages.length; i++) {
    await page.locator('.sheet').nth(i).screenshot({path: path.join(evidenceDir, `cie-pdfjs-page${i+1}.png`)});
  }
  console.log(JSON.stringify({ pdfjsVersion: result.pdfjsVersion, pages: result.pages, controls: result.controls.length, errors: messages.filter(m=>m.type==='error'||m.type==='pageerror') }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}

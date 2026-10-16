import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { inspectSource } from './source.mjs';
import { templates, evidenceDir, chromePath } from './paths.mjs';
import { brieFields } from './brie-layout.mjs';

export async function inventory() {
  await mkdir(evidenceDir, { recursive: true });
  const brie = await inspectSource(templates.brie);
  const cie = await inspectSource(templates.cie);
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage();
    const xfa = await page.evaluate(xml => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Invalid XFA XML');
      const tag = el => el.localName;
      const direct = (el, name) => [...el.children].find(child => tag(child) === name);
      const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
      function location(el) {
        const parts = [];
        for (let node = el; node?.parentElement; node = node.parentElement) {
          if (!node.hasAttribute('name')) continue;
          const name = node.getAttribute('name');
          const same = [...node.parentElement.children].filter(s => s.localName === node.localName && s.getAttribute('name') === name);
          parts.unshift(`${name}[${same.indexOf(node)}]`);
        }
        return parts.join('.');
      }
      const nodes = [...doc.getElementsByTagName('*')];
      const fields = nodes.filter(el => tag(el) === 'field').map(el => ({
        path: location(el),
        name: el.getAttribute('name'),
        parentKind: tag(el.parentElement),
        parentPath: location(el.parentElement),
        ui: direct(el, 'ui')?.firstElementChild?.localName || null,
        caption: text(direct(el, 'caption')),
        attributes: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])),
        bind: direct(el, 'bind') ? Object.fromEntries([...direct(el, 'bind').attributes].map(a => [a.name, a.value])) : null,
        defaultValue: text(direct(el, 'value')),
        itemLists: [...el.children].filter(n => tag(n) === 'items').map(n => ({
          attributes: Object.fromEntries([...n.attributes].map(a => [a.name, a.value])),
          values: [...n.children].map(text),
        })),
        scripts: [...el.getElementsByTagName('*')].filter(n => tag(n) === 'script').map(n => text(n)),
      }));
      const scripts = nodes.filter(el => tag(el) === 'script').map(el => ({
        path: location(el),
        event: el.parentElement.getAttribute('activity'),
        contentType: el.getAttribute('contentType'),
        code: el.textContent,
      }));
      return {
        fields,
        exclusionGroups: nodes.filter(el => tag(el) === 'exclGroup').map(el => ({path: location(el), members: [...el.children].filter(n => tag(n) === 'field').map(n => n.getAttribute('name'))})),
        conditionalNodes: nodes.filter(el => ['hidden', 'invisible'].includes(el.getAttribute('presence'))).map(el => ({path: location(el), kind: tag(el), presence: el.getAttribute('presence')})),
        scripts,
        media: nodes.filter(el => tag(el) === 'medium').map(el => Object.fromEntries([...el.attributes].map(a => [a.name, a.value]))),
      };
    }, cie.packets.template);
    const result = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: { brie: brie.summary, cie: cie.summary },
      brie: { fieldCount:Object.keys(brieFields).length,fields:brieFields },
      cie: { ...xfa, fieldCount: xfa.fields.length },
      warnings: [
        'Las páginas almacenadas del ELEC-1 son el aviso de compatibilidad, no sus páginas XFA renderizadas.',
        'No se deduce obligatoriedad técnica ni normativa por ausencia de validaciones XFA.',
        'Las firmas y sellos se excluyen de los datos ficticios de la prueba.',
      ],
    };
    await writeFile(path.join(evidenceDir, 'inventory.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const result = await inventory();
  console.log(JSON.stringify({ sources: result.sources, xfaFields: result.cie.fieldCount, scripts: result.cie.scripts.length, conditionalNodes: result.cie.conditionalNodes.length }, null, 2));
}

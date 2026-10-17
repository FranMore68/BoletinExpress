import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderBrie, BRIE_SOURCE_SHA256 } from '../../shared/pdf/brie.mjs';
import { templates, toolDir } from './paths.mjs';
export { BRIE_SOURCE_SHA256 };
export async function generateBrie(values, sourceBytes) {
 return renderBrie(values, sourceBytes || await readFile(templates.brie), await readFile(path.join(toolDir,'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')));
}

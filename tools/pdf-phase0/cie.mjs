import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {toolDir,templates} from './paths.mjs';
import {renderCie} from '../../shared/pdf/cie.mjs';
export {cieLayout,CIE_STATIC_SHA256,cieFields,checkCieValues} from '../../shared/pdf/cie.mjs';
export async function generateCie(values,sourceBytes) {
  return {...await renderCie(values,sourceBytes||await readFile(templates.cieStatic),await readFile(path.join(toolDir,'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'))),placementApproved:false};
}

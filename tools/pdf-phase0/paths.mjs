import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const toolDir = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(toolDir, '../..');
export const evidenceDir = path.join(root, 'evidence/phase-0');
export const pdfDir = path.join(root, 'output/pdf/phase-0');
export const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const templates = {
  brie: path.join(root, 'plantillas/Plta_ButlletiReconeixementBT.pdf'),
  // Referencia oficial fijada; el archivo de trabajo se ha guardado desde PDFCraft.
  cie: path.join(root, 'evidence/phase-0/sources/ELEC1-oficial-original.pdf'),
  cieWorking: path.join(root, 'plantillas/Plta_ELEC1CertificatInstalElectricaBT.pdf'),
  cieStatic: path.join(root, 'plantillas/Plta_ELEC1CertificatInstalElectricaBT-result.pdf'),
};

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function inspectSource(file) {
  const bytes = await readFile(file);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const acro = pdf.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  const xfa = acro?.lookupMaybe(PDFName.of('XFA'), PDFArray);
  const packets = {};
  if (xfa) {
    for (let i = 0; i < xfa.size(); i += 2) {
      packets[xfa.lookup(i).decodeText()] = Buffer.from(
        decodePDFRawStream(xfa.lookup(i + 1, PDFRawStream)).decode()
      ).toString('utf8');
    }
  }
  return {
    bytes,
    pdf,
    packets,
    summary: {
      sha256: sha256(bytes),
      bytes: bytes.length,
      storedPages: pdf.getPageCount(),
      pageSizes: pdf.getPages().map(page => page.getSize()),
      form: xfa ? 'XFA' : acro ? 'AcroForm' : 'static',
      acroFormFields: acro?.lookupMaybe(PDFName.of('Fields'), PDFArray)?.size() || 0,
    },
  };
}

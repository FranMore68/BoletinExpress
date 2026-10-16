import { getDocument, GlobalWorkerOptions, XfaLayer, version } from '/pdf.mjs';

GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
window.probe = { ready: false, error: null };
try {
  const pdf = await getDocument({
    url: '/fixture.pdf',
    enableXfa: true,
    isEvalSupported: false,
    useSystemFonts: false,
    standardFontDataUrl: '/fonts/',
    stopAtErrors: true,
  }).promise;
  const xfa = pdf.allXfaHtml;
  if (!pdf.isPureXfa || !xfa) throw new Error('The input is not pure XFA');
  const pages = [];
  for (let i = 0; i < xfa.children.length; i++) {
    const page = await pdf.getPage(i + 1);
    // Loading the operator list also attaches the font faces needed by the XFA DOM.
    await page.getOperatorList();
    // PDF points use 72 units/inch; browser print layout uses 96 CSS px/inch.
    const viewport = page.getViewport({ scale: 96 / 72 });
    const sheet = document.createElement('section');
    sheet.className = 'sheet';
    sheet.style.width = `${viewport.width}px`;
    sheet.style.height = `${viewport.height}px`;
    const div = document.createElement('div');
    sheet.append(div);
    document.getElementById('pages').append(sheet);
    XfaLayer.render({
      viewport: viewport.clone({ dontFlip: true }),
      div,
      xfaHtml: xfa.children[i],
      annotationStorage: pdf.annotationStorage,
      linkService: { addLinkAttributes: () => {} },
      intent: 'display',
    });
    pages.push({ number: i + 1, width: viewport.width, height: viewport.height });
  }
  await document.fonts.ready;
  window.probe = { ready: true, error: null, pdfjsVersion: version, pages };
} catch (error) {
  window.probe = { ready: true, error: String(error) };
}

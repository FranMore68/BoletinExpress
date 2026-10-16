import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { toolDir } from './paths.mjs';

const pdfjsDir = path.join(toolDir, 'node_modules/pdfjs-dist');
const csp = "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

export async function startProbeServer(fixture) {
  const routes = new Map([
    ['/', [path.join(toolDir, 'probe.html'), 'text/html']],
    ['/probe.mjs', [path.join(toolDir, 'probe-client.mjs'), 'text/javascript']],
    ['/static.html', [path.join(toolDir, 'static.html'), 'text/html']],
    ['/static-client.mjs', [path.join(toolDir, 'static-client.mjs'), 'text/javascript']],
    ['/pdf.mjs', [path.join(pdfjsDir, 'build/pdf.mjs'), 'text/javascript']],
    ['/pdf.worker.mjs', [path.join(pdfjsDir, 'build/pdf.worker.mjs'), 'text/javascript']],
    ['/viewer.css', [path.join(pdfjsDir, 'web/pdf_viewer.css'), 'text/css']],
  ]);
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/fixture.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.end(fixture);
        return;
      }
      let route = routes.get(url.pathname);
      if (/^\/fonts\/[A-Za-z0-9_-]+\.(ttf|pfb)$/.test(url.pathname)) {
        route = [path.join(pdfjsDir, 'standard_fonts', path.basename(url.pathname)), 'application/octet-stream'];
      }
      if (!route) { res.writeHead(404); res.end(); return; }
      res.setHeader('Content-Type', route[1]);
      res.end(await readFile(route[0]));
    } catch {
      res.writeHead(500); res.end('Probe error');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

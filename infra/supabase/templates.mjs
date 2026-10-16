import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
createServer(async(req,res)=>{
  const name = req.url?.slice(1);
  if (!['confirmation.html','recovery.html'].includes(name)) {res.writeHead(404);return res.end();}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(await readFile(new URL(name,import.meta.url)));
}).listen(8080,'0.0.0.0');

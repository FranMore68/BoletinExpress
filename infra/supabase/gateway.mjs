import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
const routes = [['/auth/v1/', 'auth', 9999], ['/rest/v1/', 'rest', 3000], ['/storage/v1/', 'storage', 5000]];
const allowed = [process.env.ANON_KEY, process.env.SERVICE_ROLE_KEY].filter(Boolean).map(k=>Buffer.from(k));
http.createServer((req,res)=>{
  const path = req.url || '/';
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type':'application/json'}); return res.end('{"ok":true}');
  }
  let normalized;
  try { normalized = decodeURIComponent(new URL(path, 'http://gateway').pathname); } catch {res.writeHead(400);return res.end();}
  const key = Buffer.from(String(req.headers.apikey || ''));
  const match = routes.find(([prefix])=>path.startsWith(prefix));
  if (!match || !allowed.some(k=>k.length===key.length && timingSafeEqual(k,key)) || /\/(?:sign|public)(?:\/|$)/.test(normalized) || /\/render\//.test(normalized)) {
    res.writeHead(404); return res.end();
  }
  const [prefix,host,port] = match;
  const upstream = http.request({host,port,path:'/'+path.slice(prefix.length),method:req.method,headers:{...req.headers,host:host+':'+port}},result=>{
    res.writeHead(result.statusCode || 502,result.headers); result.pipe(res);
  });
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
  req.on('aborted',()=>upstream.destroy()); req.pipe(upstream);
}).listen(8000,'0.0.0.0');

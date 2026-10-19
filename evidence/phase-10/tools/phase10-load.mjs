// Run only inside the isolated BoletinExpress web container, before public evaluation.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const origin = process.env.APP_URL;
assert.equal(origin, 'https://boletinexpress.moremaker3d.cloud');
assert.equal(process.env.NODE_ENV, 'production');
const fixture = {"exemplar":"titular","empresa_nom":"INSTAL·LACIONS PROVA SL","empresa_telefon":"000000000","empresa_rasic":"PROVA-0000","installador_nom":"PERSONA INSTAL·LADORA FICTÍCIA","installador_nif":"00000000T","installador_dni":"00000000T","activitat_anterior":"Habitatge de prova","activitat_actual":"Habitatge de prova","superficie":"80","local_carrer":"Carrer de la Prova Fictícia","local_numero":"10","local_pis":"2","local_porta":"A","local_municipi":"Municipi de prova","local_cp":"00000","titular_nom":"TITULAR FICTICI DE PROVA","titular_nif":"00000000T","titular_domicili":"Carrer Fictici, 20","titular_municipi":"Municipi de prova","titular_telefon":"000000000","titular_cp":"00000","treball":"DADES FICTÍCIES. Prova de posició dels camps.\nAquest exemple no acredita cap instal·lació.","diferencial_1_nombre":"1","diferencial_1_in":"40","diferencial_1_sensibilitat":"30","diferencial_2_nombre":"1","diferencial_2_in":"25","diferencial_2_sensibilitat":"30","seccio_derivacio":"10","terra_existeix":true,"resistencia_terra":"12","resistencia_aillament":"1000000","potencia_maxima":"9,2","potencia_inicial":"5,75","potencia_contractar":"5,75","tensio_anterior":"230","tensio_actual":"230","intensitat_iga":"40","intensitat_icpm":"25","ascensor":false,"potencia_ascensor":"0","certificat_nom":"PERSONA INSTAL·LADORA FICTÍCIA","certificat_dni":"00000000T","certificat_rasic":"PROVA-0000","lloc_data":"Municipi de prova, 15/10/2026","defecte_3_tensio":"","defecte_10_descripcio":"Prova fictícia del camp de descripció.","comentaris":"DADES FICTÍCIES PER AVALUAR EL PROGRAMARI.\nNo és un certificat vàlid ni una verificació tècnica.","defecte_1":false,"defecte_2":false,"defecte_3":false,"defecte_4":false,"defecte_5":false,"defecte_6":false,"defecte_7":false,"defecte_8":false,"defecte_9":false,"defecte_10":true};
const pause = ms => new Promise(r => setTimeout(r, ms));
class Session {
  cookies = new Map();
  async request(path, body) {
    const r = await fetch('http://127.0.0.1:3000' + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
      signal: AbortSignal.timeout(60000),
      headers: { Host: new URL(origin).host, Origin: origin,
        Cookie: [...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),
        ...(body === undefined ? {} : {'Content-Type':'application/json'}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    for (const c of r.headers.getSetCookie()) {
      const p=c.split(';')[0], i=p.indexOf('=');
      if (/max-age=0(?:;|$)/i.test(c)) this.cookies.delete(p.slice(0,i));
      else this.cookies.set(p.slice(0,i),p.slice(i+1));
    }
    return r;
  }
  async json(path,body,status=200) {
    const r=await this.request(path,body); assert.equal(r.status,status,`${path}: HTTP ${r.status}`);return r.json();
  }
}
async function token(email) {
  for(let i=0;i<150;i++) {
    const r=await fetch('http://mail:8025/api/v1/search?query='+encodeURIComponent('to:'+email));
    assert.equal(r.status,200); const list=await r.json();
    for(const m of list.messages||[]) {
      const d=await fetch('http://mail:8025/api/v1/message/'+m.ID).then(r=>r.json());
      const match=(d.HTML||d.Text||'').replaceAll('&amp;','&').match(/https?:\/\/[^"<>\s]+\/auth\/confirm\?[^"<>\s]+/);
      if(match) {const u=new URL(match[0]);if(u.searchParams.get('type')==='email')return u.searchParams.get('token_hash');}
    }
    await pause(200);
  }
  throw Error('No confirmation in private fictitious mailbox');
}
const users=[];
for(let i=0;i<2;i++) {
  const s=new Session(),email=`phase10-${i}-${randomUUID()}@example.invalid`;
  await s.json('/api/auth/signup',{email,password:randomUUID()});
  await s.json('/api/auth/confirm',{token_hash:await token(email),type:'email'});
  const session=await s.json('/api/auth/session');
  let doc=(await s.json('/api/private/documents',{type:'BRIE',title:'EVALUACION FICTICIA DE CAPACIDAD'},201)).document;
  doc=(await s.json(`/api/private/documents/${doc.id}/fields`,{fields:fixture,revision:doc.revision})).document;
  users.push({s,id:session.id,doc});
}
assert.notEqual(users[0].id,users[1].id);
const report={startedAt:new Date().toISOString(),durationSeconds:600,users:2,maxConcurrentPdfJobs:1,httpTransport:'internal HTTP; HTTPS verified separately',pdfJobs:0,reads:0,pdfHashes:[],passed:false};
console.log('READY '+JSON.stringify({users:2,durationSeconds:600,maxConcurrentPdfJobs:1}));
const start=Date.now();let stop=false;
const reader=(async()=>{while(!stop){await Promise.all(users.map(async u=>{await u.s.json('/api/private/documents');report.reads++;}));await pause(2000);}})();
try {
  let n=0;
  while(Date.now()-start<600000) {
    const u=users[n++%2];
    u.doc=(await u.s.json(`/api/private/documents/${u.doc.id}/fields`,{fields:{...fixture,comentaris:`DADES FICTICIES. Prova de capacitat ${n}.`},revision:u.doc.revision})).document;
    await u.s.json(`/api/private/documents/${u.doc.id}/preview`,{revision:u.doc.revision},202);
    let ready=false;
    for(let i=0;i<120;i++) {
      const {preview:p}=await u.s.json(`/api/private/documents/${u.doc.id}/preview`);
      assert.notEqual(p?.status,'failed','PDF generation failed');
      if(p?.status==='ready') {
        const r=await u.s.request(`/api/private/documents/${u.doc.id}/preview/file?revision=${u.doc.revision}`);
        assert.equal(r.status,200);const b=Buffer.from(await r.arrayBuffer());
        assert.equal(b.subarray(0,5).toString(),'%PDF-');
        const hash=createHash('sha256').update(b).digest('hex');assert.equal(hash,p.sha256);
        report.pdfHashes.push(hash);report.pdfJobs++;ready=true;break;
      }
      await pause(1000);
    }
    assert.ok(ready,'PDF timed out');
    console.log('PDF '+JSON.stringify({number:report.pdfJobs,elapsedSeconds:Math.round((Date.now()-start)/1000)}));
    await pause(Math.min(15000,Math.max(0,600000-(Date.now()-start))));
  }
  report.passed=report.pdfJobs>=2;
} finally {stop=true;await reader;report.elapsedSeconds=(Date.now()-start)/1000;report.endedAt=new Date().toISOString();console.log('RESULT '+JSON.stringify(report));}

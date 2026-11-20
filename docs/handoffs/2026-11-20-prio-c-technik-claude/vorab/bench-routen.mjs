// Claude · 20.11.2026 · Auftrag #265, „Vorab-Start verkürzen“: Rechenzeit der Abrufe, die der Vorab-Start am Server auslöst,
// lokal im live-nahen Aufbau des Projekts (scripts/customer-model-benchmark.mjs: echte SQLite-Werkstatt, echte Zuordnungsablage
// mit 404 Varianten, echte Katalog-Freigabe, Dokument > 10 MB). Nur synthetische Daten, nur Loopback. Lokale Werte sind keine Live-Aussage.
// Aufruf: ROOT=<Arbeitskopie> node vorab/bench-routen.mjs   (JE=<Designs je Größe>, PAD=<kB Polster je Design>)
import http from 'node:http';import {once} from 'node:events';import {pathToFileURL} from 'node:url';import fs from 'node:fs';import path from 'node:path';
const ROOT=process.env.ROOT,JE=Number(process.env.JE||3),PAD=Number(process.env.PAD||50);
const imp=p=>import(pathToFileURL(ROOT+'/'+p));
const {openBench,liveLikeFixture,benchEntry}=await imp('scripts/customer-model-benchmark.mjs'),{appProxySignature}=await imp('app/workshop/shopify-app-proxy.mjs');
const origin='https://app.example',shopDomain='bench-synthetic.myshopify.com',secret='synthetic-benchmark-secret',proxyPath='/apps/konfigurator';
const bench=openBench({designsPerSize:JE,padKb:PAD});const previewDir=path.join(bench.dir,'public-previews');fs.mkdirSync(previewDir);bench.live={...liveLikeFixture(bench,{variants:404}),previewDir};
// Zeitnehmer um die teuren Bausteine: wie oft und wie lange je Abruf?
const uhr={};let laufend=null;
const tick=(label,t)=>{const u=uhr[label]??={n:0,ms:0};u.n++;u.ms+=performance.now()-t;};
// Eingefrorene Objekte nicht ändern: eine Hülle, die jede Funktion des Originals misst und unverändert weiterreicht.
const huelle=(obj,label,nur=null)=>{const out={};for(const k of Reflect.ownKeys(obj)){const v=obj[k];out[k]=typeof v==='function'&&typeof k==='string'&&(!nur||nur.includes(k))?(...a)=>{const s=performance.now();try{return v.apply(obj,a);}finally{tick(label+'.'+k,s);}}:v;}return out;};
const w0=bench.workshop;
bench.workshop={...w0,repository:huelle(w0.repository,'repository',['get']),orderIntake:huelle(w0.orderIntake,'orderIntake'),...Object.fromEntries(['galleryModel','model','publicPreviewModel'].filter(n=>typeof w0[n]==='function').map(n=>[n,(...a)=>{const s=performance.now();try{return w0[n](...a);}finally{tick('workshop.'+n,s);}}]))};
bench.live.registry=huelle(bench.live.registry,'registry');
const nimm=()=>{const o=Object.fromEntries(Object.entries(uhr).map(([k,v])=>[k,v.n+'× '+v.ms.toFixed(0)+' ms']));for(const k of Object.keys(uhr))delete uhr[k];return o;};
const events=[];const made=benchEntry(bench,{modelResponseCache:true,liveLike:true,events});const entry=made.create();
const srv=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}entry.handle(req,res,url);});srv.listen(0,'127.0.0.1');await once(srv,'listening');
// Gegenlauf: derselbe Aufbau ohne Antwortspeicher (wie vor der Änderung gerechnet); die Antworten müssen gleich sein.
const ohne=benchEntry(bench,{modelResponseCache:false,liveLike:true}).create();
const srv2=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!ohne.matches(url.pathname)){res.writeHead(404).end();return;}ohne.handle(req,res,url);});srv2.listen(0,'127.0.0.1');await once(srv2,'listening');
const request2=(p,{headers={},method='GET',body=null}={})=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:srv2.address().port,path:p,method,headers:{Host:'app.example','X-Forwarded-Proto':'https',...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks)}));});req.on('error',reject);if(body)req.write(body);req.end();});
const request=(p,{headers={},method='GET',body=null}={})=>new Promise((resolve,reject)=>{const t=performance.now();const req=http.request({host:'127.0.0.1',port:srv.address().port,path:p,method,headers:{Host:'app.example','X-Forwarded-Proto':'https',...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}),...headers}},res=>{const chunks=[];let first=null;res.on('data',c=>{first??=performance.now()-t;chunks.push(c);});res.on('end',()=>{const buf=Buffer.concat(chunks);let data=null;try{data=JSON.parse(buf);}catch{}resolve({status:res.statusCode,headers:res.headers,ms:+(performance.now()-t).toFixed(1),ersterByteMs:+(first??performance.now()-t).toFixed(1),kB:Math.round(buf.length/1024),data,text:data?null:buf.toString().slice(0,160)});});});req.on('error',reject);if(body)req.write(body);req.end();});
const productGid=made.binding.shopifyProductId,variantGid=made.binding.shopifyVariantId;
const startPath=(json=false)=>{const search=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',product:productGid.split('/').at(-1),variant:variantGid.split('/').at(-1),...(json?{format:'json'}:{})});search.set('signature',appProxySignature(search,secret));return proxyPath+'/start?'+search;};
const out={stand:ROOT.split('/').pop(),bank:{designs:bench.bank.designs,formate:bench.bank.formats,dokumentMB:+(bench.documentBytes/1048576).toFixed(1)},reihe:[]};
const mess=(name,r,extra={})=>{out.reihe.push({abruf:name,status:r.status,ms:r.ms,ersterByteMs:r.ersterByteMs,kB:r.kB,bausteine:nimm(),...extra,...(r.status>=400?{fehler:r.data?.error?.code||r.text}:{})});return r;};
// Zwei Kunden nacheinander: der erste nach dem Neustart (kalt), der zweite mit warmem Server.
for(const kunde of ['erster Kunde (kalt)','zweiter Kunde (warm)','dritter Kunde (warm)']){
 const s=mess(kunde+': start',await request(startPath(true),{headers:{Accept:'application/json'}}));
 let token=null;try{token=new URLSearchParams(new URL(s.data.url).hash.slice(1)).get('s');}catch{}
 if(!token){const r=await request(startPath());token=new URLSearchParams(new URL(r.headers.location||'http://x/#').hash.slice(1)).get('s');}
 const h={'X-Gravuru-Shop-Session':token,Origin:origin};
 const m=mess(kunde+': model',await request('/api/shop-entry/model',{headers:h}));
 const target=m.data?.startPreview?.target;
 if(target)mess(kunde+': design-gallery-preview (Startdesign)',await request('/api/shop-entry/design-gallery-preview',{headers:h,method:'POST',body:JSON.stringify({target})}),{vorschauAdresse:!!m.data?.startPreview?.previewUrl});
 const g=mess(kunde+': design-gallery Seite 0',await request('/api/shop-entry/design-gallery?page=0&theme=preferred',{headers:h}));
 out.reihe.at(-1).karten=g.data?.items?.length;out.reihe.at(-1).gesamt=g.data?.total;
 mess(kunde+': design-gallery Seite 0 noch einmal',await request('/api/shop-entry/design-gallery?page=0&theme=preferred',{headers:h}));
 const ids=(g.data?.items||[]).filter(i=>i.current).map(i=>i.designId).filter(id=>id!==m.data?.model?.universal?.profile?.defaultDesignId);
 if(ids.length){mess(kunde+': design-parts ('+Math.min(3,ids.length)+' Designs)',await request('/api/shop-entry/design-parts?designs='+ids.slice(0,3).join(','),{headers:h}));
  mess(kunde+': design-parts dieselben noch einmal',await request('/api/shop-entry/design-parts?designs='+ids.slice(0,3).join(','),{headers:h}));}
 const andere=(g.data?.items||[]).find(i=>i.target&&i.designId!==m.data?.model?.universal?.profile?.defaultDesignId);
 if(andere){mess(kunde+': design-gallery-preview (anderes Design)',await request('/api/shop-entry/design-gallery-preview',{headers:h,method:'POST',body:JSON.stringify({target:andere.target})}));
  mess(kunde+': design-gallery-preview (dasselbe noch einmal)',await request('/api/shop-entry/design-gallery-preview',{headers:h,method:'POST',body:JSON.stringify({target:andere.target})}));}
 mess(kunde+': acryl-guides? (model noch einmal)',await request('/api/shop-entry/model',{headers:h}));
 if(kunde.startsWith('dritter')){const gleich={};
  const a1=await request('/api/shop-entry/design-gallery?page=0&theme=preferred',{headers:h}),b1=await request2('/api/shop-entry/design-gallery?page=0&theme=preferred',{headers:h});gleich.designliste=a1.status===200&&b1.status===200&&JSON.stringify(a1.data)===b1.body.toString();
  if(andere){const a2=await request('/api/shop-entry/design-gallery-preview',{headers:h,method:'POST',body:JSON.stringify({target:andere.target})}),b2=await request2('/api/shop-entry/design-gallery-preview',{headers:h,method:'POST',body:JSON.stringify({target:andere.target})});gleich.vorschau=a2.status===200&&b2.status===200&&a2.kB===Math.round(b2.body.length/1024)&&(a2.text||'').slice(0,160)===b2.body.toString().slice(0,160);}
  const a3=await request(startPath(true),{headers:{Accept:'application/json'}}),b3=await request2(startPath(true),{headers:{Accept:'application/json'}});gleich.startkarteVorwaermliste=a3.status===200&&b3.status===200&&JSON.stringify(a3.data.warm)===JSON.stringify(JSON.parse(b3.body).warm);
  const a4=await request('/api/shop-entry/model',{headers:h}),b4=await request2('/api/shop-entry/model',{headers:h});gleich.modell=a4.status===200&&JSON.stringify(a4.data)===b4.body.toString();
  out.gleichOhneSpeicher=gleich;nimm();}
}
out.protokoll=events.filter(e=>/model_response_cache|gallery/.test(e.event||'')).slice(-3);
console.log(JSON.stringify(out,null,1));
srv.closeAllConnections();srv.close();srv2.closeAllConnections();srv2.close();bench.close();

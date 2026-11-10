// Paket 1c: Katalog-Arbeiter. Antworten bytegleich zum direkten Weg, gleiche Fehler, Zusammenlegen, Obergrenze,
// Absturz, freier Hauptprozess, Schalter aus.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {designDashboardWithFit,designFile,forgetKatalog,forgetDashboardCache,dashboardCacheWrites} from './design-dashboard.mjs';
import {targetDesignPreview} from './design-target-preview.mjs';
import {designPreviewGlyphs,previewWarningHeader} from './design-preview-glyphs.mjs';
import {createProductRepository} from './repository.mjs';
import {createKatalogWorker} from './katalog-worker-client.mjs';
import {openKatalogReader,codeFingerprint,loadDiskCache,saveDiskCache,memoReader} from './katalog-worker.mjs';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('Muster Test')].map(c=>[c,{a:400,d:'M0 0 L300 0 L300 600 L0 600 Z'}]))}};
const write=(root,rel,value)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');};
const svg=(w,h,inner)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">\n<rect id="platte" width="${w}" height="${h}" fill="none"/>\n${inner}\n</svg>\n`;
const textEl=(n,font,text)=>`<text id="text-${n}" x="45" y="30" font-family="${font}" font-size="5" fill="#000000" text-anchor="middle"><tspan x="45" dy="0">${text}</tspan></text>`;

function katalog(t,count=6,pad=0){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'p1c-katalog-'));t.after(()=>{forgetKatalog();forgetDashboardCache();fs.rmSync(root,{recursive:true,force:true});});
 for(const part of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,part),path.join(root,part),{recursive:true});
 write(root,'linien/test-linie.json',{schema:'gravuru-line/v2',id:'test-linie',name:'Test Linie',families:['test-schilder'],status:'Fixture',subcategories:[{id:'namensschilder',name:'Namensschilder',themeId:'namensschilder',mainProducts:[]}]});
 const design=(id,extra)=>{write(root,`designs/test-reihe/${id}/design.json`,{id,material:'Edelstahl',process:'Gravur',plate:{widthMm:90,heightMm:60},texts:[{text:'Muster',font:'Michroma',sizePt:16,color:'#000000',align:'center',anchorMm:[45,30]}],fonts:['Michroma'],themes:['namensschilder'],ziele:[{familie:'test-schilder',freigabe:null}],...(pad?{name:id+' '+'x'.repeat(pad)}:{}),...extra});
  write(root,`designs/test-reihe/${id}/design.svg`,svg(90,60,textEl(1,'Michroma','Muster')));};
 for(let i=1;i<=count;i++)design('T-D'+i,i%3===0?{transfer:{fromKey:'T-12x8-D'+i}}:i%3===1?{source:'ohne Vorlage; neuer Entwurf'}:{source:'T-D'+i+' (Bestand, T_Designs.cdr)',hidden:i===5});
 fs.writeFileSync(path.join(root,'designs/test-reihe/T-D1/original.png'),Buffer.from('89504e470d0a1a0a0000','hex'));
 return root;
}

// Datenbank wie in der Werkstatt, mit einem importierten Produkt zu Design T-D1.
function database(t,root){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p1c-db-'));const file=path.join(dir,'werkstatt.sqlite');
 const repository=createProductRepository({filename:file,tenantId:'gravuru'});
 t.after(()=>{repository.close();fs.rmSync(dir,{recursive:true,force:true});});
 const keys=[];
 designDashboardWithFit(root,{linie:'test-linie',available:{Michroma:FONT},repository:{importItem:key=>{keys.push(key);return null;},get:()=>{throw Error('x');}}});
 return {file,repository,keys};
}
const importProduct=(repository,key,name='Importiert')=>repository.importBatch([{key,fingerprint:'a'.repeat(64),document:{name,kind:'product',masterId:null,config:{profile:{designs:[{id:'katalog-T-D1',katalog:{designId:'T-D1'}}]}}}}])[0];

async function direct(root,repository,args){forgetKatalog();return Buffer.from(JSON.stringify(await designDashboardWithFit(root,{...args,repository,available:{Michroma:FONT}})));}
const queryArgs=o=>({linie:null,reihe:null,material:null,status:null,freigabe:null,bestand:null,startDesigns:false,...o});

test('Worker: Übersicht, Linie und Filter sind bytegleich zum direkten Weg (mit Produkt aus der Datenbank)',async t=>{
 const root=katalog(t),db=database(t,root);
 assert.ok(db.keys.length>0,'Schlüssel für Importprodukte erkannt');
 const imported=importProduct(db.repository,db.keys[0]);
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT}});t.after(()=>worker.close());
 const cases=[{},{linie:'test-linie'},{linie:'test-linie',status:'ok'},{linie:'test-linie',status:'prüfen'},{linie:'test-linie',freigabe:'nein'},{linie:'test-linie',freigabe:'ja'},{linie:'test-linie',reihe:'test-reihe'},{linie:'test-linie',material:'Edelstahl'},{linie:'test-linie',startDesigns:true},{linie:'test-linie',bestand:'T'}];
 let sawProduct=false;
 for(const c of cases){
  const args=queryArgs(c),want=await direct(root,db.repository,args);
  const got=await worker.call('designs.list',root,args,{acceptGzip:false});
  assert.equal(got.gzip,false);assert.deepEqual(got.bytes,want,JSON.stringify(c));
  if(c.linie==='test-linie'&&!c.status&&!c.freigabe&&!c.bestand&&!c.startDesigns&&!c.reihe&&!c.material){const rows=JSON.parse(got.bytes.toString()).rows;sawProduct=rows.some(r=>r.konfi?.products?.some(p=>p.productId===imported.id));}
 }
 assert.ok(sawProduct,'Produktbezug aus der Nur-Lese-Datenbank erscheint wie im Repository');
});

test('Worker: große Antwort wird im Worker gzip-komprimiert und entpackt bytegleich; kleine bleibt unkomprimiert',async t=>{
 const root=katalog(t,260),db=database(t,root);
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT}});t.after(()=>worker.close());
 const args=queryArgs({linie:'test-linie'}),want=await direct(root,db.repository,args);
 assert.ok(want.length>=262144,'Fixture groß genug: '+want.length);
 const zipped=await worker.call('designs.list',root,args,{acceptGzip:true});
 assert.equal(zipped.gzip,true);assert.deepEqual(gunzipSync(zipped.bytes),want);
 const plain=await worker.call('designs.list',root,args,{acceptGzip:false});assert.equal(plain.gzip,false);assert.deepEqual(plain.bytes,want);
 const small=await worker.call('designs.list',root,queryArgs({}),{acceptGzip:true});assert.equal(small.gzip,false);
});

test('Worker: Zielvorschau und Designdateien sind bytegleich zum direkten Weg',async t=>{
 const root=katalog(t,2),db=database(t,root);
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT}});t.after(()=>worker.close());
 const q={reihe:'test-reihe',id:'T-D1',familie:'test-schilder'};
 forgetKatalog();const want=Buffer.from(JSON.stringify(await targetDesignPreview(root,q,{available:{Michroma:FONT}})));
 const got=await worker.call('designs.targetPreview',root,q);assert.deepEqual(got.bytes,want);assert.equal(got.gzip,false);
 for(const file of ['design.svg','original.png']){
  const request={reihe:'test-reihe',bestand:null,id:'T-D1',file};
  forgetKatalog();const {file:real,type}=designFile(root,request);
  const preview=type.startsWith('image/svg+xml')?await designPreviewGlyphs({file:real,root,available:{Michroma:FONT}}):{bytes:fs.readFileSync(real),warnings:[]};
  const got=await worker.call('designs.svg',root,request);
  assert.equal(got.type,type);assert.deepEqual(got.bytes,Buffer.from(preview.bytes));assert.equal(previewWarningHeader(got.warnings),previewWarningHeader(preview.warnings));
  // zweiter Aufruf (Vorschau-Speicher im Worker darf durch die Übertragung nicht leer werden)
  assert.deepEqual((await worker.call('designs.svg',root,{...request,id:'T-D1'})).bytes,Buffer.from(preview.bytes));
 }
});

test('Worker: Fehler haben Status, Code und Text wie im direkten Weg',async t=>{
 const root=katalog(t,2),db=database(t,root);
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT}});t.after(()=>worker.close());
 const same=async(op,args,directRun)=>{
  let want;forgetKatalog();try{await directRun();assert.fail('direkter Weg sollte werfen');}catch(e){if(e.code==='ERR_ASSERTION')throw e;want=e;}
  await assert.rejects(worker.call(op,root,args),e=>{assert.equal(e.status,want.status);assert.equal(e.code,want.code);assert.equal(e.message,want.message);return true;});
  return want;
 };
 const a=await same('designs.list',queryArgs({linie:'gibt-es-nicht'}),()=>designDashboardWithFit(root,{...queryArgs({linie:'gibt-es-nicht'}),repository:db.repository,available:{Michroma:FONT}}));assert.equal(a.status,404);
 const b=await same('designs.list',queryArgs({linie:'test-linie',status:'quatsch'}),()=>designDashboardWithFit(root,{...queryArgs({linie:'test-linie',status:'quatsch'}),repository:db.repository,available:{Michroma:FONT}}));assert.equal(b.status,422);
 const r={reihe:'test-reihe',bestand:null,id:'T-D1',file:'design.json'};
 const c=await same('designs.svg',r,async()=>designFile(root,r));assert.equal(c.status,404);
 const d=await same('designs.targetPreview',{reihe:'test-reihe',id:'T-D1',familie:'erfunden'},()=>targetDesignPreview(root,{reihe:'test-reihe',id:'T-D1',familie:'erfunden'},{available:{Michroma:FONT}}));assert.ok(d.status>=400);
});

test('Leser: importItem und get liefern dasselbe wie das Repository, nur lesend',async t=>{
 const root=katalog(t,2),db=database(t,root);
 const made=importProduct(db.repository,'katalog:t:leser:1');
 const reader=openKatalogReader({dbFile:db.file,tenantId:'gravuru'});t.after(()=>reader.close());
 assert.deepEqual(reader.importItem('katalog:t:leser:1'),db.repository.importItem('katalog:t:leser:1'));
 assert.equal(reader.importItem('gibt-es-nicht'),null);
 const a=reader.get(made.id),b=db.repository.get(made.id);
 for(const field of ['id','revision','publishedRevision','status','document','metadata','createdAt','updatedAt'])assert.deepEqual(a[field],b[field],field);
 assert.throws(()=>reader.get('cfg_unbekannt'),e=>e.status===404&&e.code==='not_found');
 // Später gespeicherte Revision erscheint im Leser (kein veralteter Stand).
 const next=structuredClone(b.document);next.name='Zweite Fassung';db.repository.save(made.id,next,b.revision);
 assert.equal(reader.get(made.id).revision,2);assert.equal(reader.get(made.id).document.name,'Zweite Fassung');
 // Der Leser kann nichts schreiben.
 assert.equal(openKatalogReader({dbFile:':memory:'}),null);
 const raw=openKatalogReader({dbFile:db.file,tenantId:'gravuru'});raw.close();
});

test('Zusammenlegen: drei gleichzeitige gleiche Aufrufe teilen eine Rechnung',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true});t.after(()=>worker.close());
 const logs=[];const logged=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true,logger:e=>logs.push(e)});t.after(()=>logged.close());
 const three=await Promise.all([1,2,3].map(()=>worker.call('test.sleep','/x',{ms:200})));
 assert.deepEqual(three.map(r=>JSON.parse(r.bytes).counter),[1,1,1]);
 assert.equal(JSON.parse((await worker.call('test.sleep','/x',{ms:10})).bytes).counter,2,'ein anderer Aufruf rechnet neu (andere Argumente)');
 assert.equal(JSON.parse((await worker.call('test.sleep','/x',{ms:200})).bytes).counter,3,'nach Abschluss wird nicht aus altem Ergebnis geantwortet');
 await Promise.all([logged.call('test.sleep','/y',{ms:100}),logged.call('test.sleep','/y',{ms:100})]);
 assert.deepEqual(logs.map(l=>[l.event,l.op,l.shared,l.ok]),[['katalog_worker','test.sleep',true,true],['katalog_worker','test.sleep',false,true]].sort((a,b)=>logs.findIndex(l=>l.shared===a[2])-logs.findIndex(l=>l.shared===b[2])),'je Aufruf eine Zeile');
 {const allowed=new Set(['bytes','event','gzip','ms','ok','op','pending','shared','msList','msSerialize','msRun','cpuMs','heapMb','rssMb']);assert.ok(logs.every(l=>Object.keys(l).every(key=>allowed.has(key))&&Object.values(l).every(v=>typeof v!=='string'||!v.includes('/'))),'nur technische Felder, keine Pfade');}
});

test('Zusammenlegen: nach invalidate() wird nicht an eine ältere Rechnung angehängt',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true});t.after(()=>worker.close());
 const first=worker.call('test.sleep','/x',{ms:200});worker.invalidate();const second=worker.call('test.sleep','/x',{ms:200});
 assert.deepEqual([JSON.parse((await first).bytes).counter,JSON.parse((await second).bytes).counter],[1,2]);
});

test('Obergrenze: bei vollem Wartestand sofort 503 designs_busy',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true,maxPending:2});t.after(()=>worker.close());
 const a=worker.call('test.sleep','/x',{ms:300}),b=worker.call('test.sleep','/x',{ms:301});
 const begin=performance.now();
 await assert.rejects(worker.call('test.sleep','/x',{ms:302}),e=>e.status===503&&e.code==='designs_busy'&&e.message==='Die Designliste rechnet gerade. Bitte in einer Minute erneut laden.');
 assert.ok(performance.now()-begin<100,'sofort');
 await Promise.all([a,b]);
 assert.equal(JSON.parse((await worker.call('test.sleep','/x',{ms:5})).bytes).counter,3,'danach wieder frei');
});

test('Obergrenze: viele gleichzeitige Vorschaubilder zählen nicht gegen die enge Grenze der Listenrechnungen',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true,maxPending:1});t.after(()=>worker.close());
 // Eine schwere Rechnung belegt die enge Grenze vollständig.
 const heavy=worker.call('test.sleep','/x',{ms:200});
 // 60 verschiedene leichte Aufrufe (unbekannte Designdatei -> fachlicher Fehler aus dem Worker, kein designs_busy).
 const light=await Promise.allSettled(Array.from({length:60},(_,i)=>worker.call('designs.svg','/nicht-vorhanden-'+i,{reihe:'r',bestand:null,id:'d'+i,file:'design.svg'})));
 assert.equal(light.length,60);
 assert.equal(light.filter(r=>r.status==='rejected'&&r.reason?.code==='designs_busy').length,0,'kein Vorschaubild darf an der Listen-Grenze scheitern');
 assert.equal(light.filter(r=>r.status==='rejected'&&r.reason?.code==='designs_worker').length,0);
 // Die enge Grenze gilt weiter für eine zweite schwere Rechnung.
 await assert.rejects(worker.call('test.sleep','/x',{ms:201}),e=>e.status===503&&e.code==='designs_busy');
 await heavy;
});

test('Absturz: wartende Aufrufe enden mit 503 designs_worker, der nächste Aufruf startet den Worker neu',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true});t.after(()=>worker.close());
 const waiting=worker.call('test.sleep','/x',{ms:2000}),crash=worker.call('test.crash','/x',{});
 await assert.rejects(crash,e=>e.status===503&&e.code==='designs_worker');
 await assert.rejects(waiting,e=>e.status===503&&e.code==='designs_worker');
 assert.equal(worker.pendingCount(),0);
 assert.equal(JSON.parse((await worker.call('test.sleep','/x',{ms:5})).bytes).counter,1,'neuer Worker');
});

test('Test-Operationen sind ohne ausdrückliches Einschalten nicht erreichbar',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{}});t.after(()=>worker.close());
 await assert.rejects(worker.call('test.busy','/x',{ms:1}),e=>e.status===500&&e.code==='worker_op');
});

test('Hauptprozess bleibt frei: während der Worker 600 ms rechnet, bleibt die größte Verzögerung unter 100 ms',async t=>{
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true});t.after(()=>worker.close());
 await worker.call('test.sleep','/x',{ms:1});// Worker vorwärmen (Start gehört nicht zur Messung)
 let last=performance.now(),max=0;const timer=setInterval(()=>{const now=performance.now();max=Math.max(max,now-last-10);last=now;},10);
 const begin=performance.now();await worker.call('test.busy','/x',{ms:600});const took=performance.now()-begin;clearInterval(timer);
 assert.ok(took>=500,'Worker hat gerechnet: '+took);
 assert.ok(max<100,'größte Verzögerung im Hauptprozess: '+max.toFixed(1)+' ms');
});

test('Schriften: eine geänderte Schriftliste erreicht den laufenden Worker',async t=>{
 const root=katalog(t,2),db=database(t,root),available={};
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available});t.after(()=>worker.close());
 const args=queryArgs({linie:'test-linie'});
 const without=await worker.call('designs.list',root,args);
 assert.deepEqual(without.bytes,await (async()=>{forgetKatalog();return Buffer.from(JSON.stringify(await designDashboardWithFit(root,{...args,repository:db.repository,available:{}})));})());
 available.Michroma=FONT;// wie Object.assign(formFonts,…) im Server
 const withFont=await worker.call('designs.list',root,args);
 assert.deepEqual(withFont.bytes,await direct(root,db.repository,args));
 assert.notDeepEqual(withFont.bytes,without.bytes);
});

test('Katalogstand: nach invalidate() sieht der Worker eine Änderung sofort, nicht erst nach dem 2-Sekunden-Speicher',async t=>{
 const root=katalog(t,2),db=database(t,root);
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT}});t.after(()=>worker.close());
 const args=queryArgs({linie:'test-linie'}),names=async()=>JSON.parse((await worker.call('designs.list',root,args)).bytes).rows.map(r=>r.name);
 const before=await names();
 const file=path.join(root,'designs/test-reihe/T-D1/design.json'),j=JSON.parse(fs.readFileSync(file,'utf8'));j.name='Umbenannt im Test';fs.writeFileSync(file,JSON.stringify(j,null,1)+'\n');
 const later=new Date(Date.now()+5000);fs.utimesSync(file,later,later);
 worker.invalidate();
 const after=await names();
 assert.notDeepEqual(after,before);assert.ok(after.includes('Umbenannt im Test'));
});

test('Katalogkontext: die Schriftliste wird je Anfrage ausgewertet, nicht je Design (Befund 10.11.2026: zwei Minuten je Linie)',async t=>{
 // Die verfügbaren Formschriften sind mehrere MB groß. Wird ihre Signatur je Design neu gebildet, wächst die Rechenzeit mit
 // der Zahl der Designs. Gezählt wird, wie oft die Schriftliste aufgezählt wird: das darf nicht von der Designzahl abhängen.
 const count=async designs=>{
  const root=katalog(t,designs);let reads=0;
  const available=new Proxy({Michroma:FONT},{ownKeys(target){reads+=1;return Reflect.ownKeys(target);}});
  forgetKatalog();forgetDashboardCache();
  const result=await designDashboardWithFit(root,{linie:'test-linie',available});
  assert.equal(result.rows.length>=designs,true);
  return reads;
 };
 const few=await count(2),many=await count(9);
 assert.equal(many,few,'Auswertungen der Schriftliste: '+few+' bei 2 Designs, '+many+' bei 9 Designs');
});

// ---- Paket 1c-2: Zwischenspeicher auf Platte, Vorrechnen, Messwerte ----
test('Plattenspeicher: nach „Neustart“ wird nichts neu gerechnet und die Antwort ist bytegleich; anderer Programmstand wird verworfen',async t=>{
 const root=katalog(t,6),dir=fs.mkdtempSync(path.join(os.tmpdir(),'p1c2-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'cache.json.gz'),fingerprint=codeFingerprint();
 assert.match(fingerprint,/^[0-9a-f]{64}$/);
 forgetKatalog();forgetDashboardCache();
 const options={linie:'test-linie',available:{Michroma:FONT}};
 const cold=JSON.stringify(await designDashboardWithFit(root,options));
 const saved=saveDiskCache(file,fingerprint);
 assert.ok(saved.entries>0);assert.equal(saved.skipped,0);
 // „Neustart“: Speicher leer, Datei laden.
 forgetKatalog();forgetDashboardCache();
 assert.deepEqual(loadDiskCache(path.join(dir,'fehlt.gz'),fingerprint),{loaded:0,reason:'keine Datei'});
 assert.deepEqual(loadDiskCache(file,'0'.repeat(64)),{loaded:0,reason:'anderer Programmstand'});
 const loaded=loadDiskCache(file,fingerprint);
 assert.equal(loaded.reason,'geladen');assert.equal(loaded.loaded,saved.entries);
 const writes=dashboardCacheWrites();
 const warm=JSON.stringify(await designDashboardWithFit(root,options));
 assert.equal(warm,cold,'Antwort nach dem Laden bytegleich');
 assert.equal(dashboardCacheWrites(),writes,'nach dem Laden wird kein Eintrag neu gerechnet');
 // Geänderte Designdatei: genau dieser Eintrag wird trotz geladenem Speicher neu gerechnet.
 const design=path.join(root,'designs/test-reihe/T-D1/design.json'),j=JSON.parse(fs.readFileSync(design,'utf8'));j.name='Nach dem Sichern geändert';fs.writeFileSync(design,JSON.stringify(j,null,1)+'\n');
 const later=new Date(Date.now()+5000);fs.utimesSync(design,later,later);forgetKatalog();
 const changed=await designDashboardWithFit(root,options);
 assert.ok(changed.rows.some(row=>row.name==='Nach dem Sichern geändert'));
 assert.ok(dashboardCacheWrites()>writes,'geänderte Datei wird neu gerechnet');
 // Beschädigte Datei wird ignoriert, nicht geworfen.
 fs.writeFileSync(file,'kaputt');assert.deepEqual(loadDiskCache(file,fingerprint),{loaded:0,reason:'unlesbar'});
});

test('Worker: sichert den Zwischenspeicher nach einer Listenrechnung, lädt ihn beim nächsten Start und meldet Messwerte',async t=>{
 const root=katalog(t,5),db=database(t,root),dir=fs.mkdtempSync(path.join(os.tmpdir(),'p1c2w-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cacheFile=path.join(dir,'cache.json.gz'),args=queryArgs({linie:'test-linie'});
 const logs=[],make=()=>createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT},cacheFile,cacheSaveDelayMs:20,logger:entry=>logs.push(entry)});
 const first=make();
 const cold=(await first.call('designs.list',root,args)).bytes;
 for(let i=0;i<200&&!logs.some(e=>e.event==='katalog_worker_cache_save');i++)await new Promise(r=>setTimeout(r,25));
 await first.close();
 const save=logs.find(e=>e.event==='katalog_worker_cache_save');
 assert.ok(save&&save.entries>0&&!save.error,'Speicher wurde gesichert');assert.ok(fs.statSync(cacheFile).size>0);
 assert.equal(logs.find(e=>e.event==='katalog_worker_cache_load').reason,'keine Datei');
 const list=logs.find(e=>e.event==='katalog_worker'&&e.op==='designs.list');
 for(const key of ['msList','msSerialize','msRun','cpuMs','heapMb','rssMb'])assert.equal(typeof list[key],'number',key);
 logs.length=0;
 const second=make();t.after(()=>second.close());
 const warm=(await second.call('designs.list',root,args)).bytes;
 assert.ok(Buffer.compare(warm,cold)===0,'Antwort nach Neustart bytegleich');
 const load=logs.find(e=>e.event==='katalog_worker_cache_load');
 assert.equal(load.reason,'geladen');assert.equal(load.loaded,save.entries);
});

test('Vorrechnen: designs.warm rechnet jede Linie einmal und meldet je Linie Dauer und Erfolg',async t=>{
 const root=katalog(t,4),db=database(t,root);
 const worker=createKatalogWorker({dbFile:db.file,tenantId:'gravuru',available:{Michroma:FONT}});t.after(()=>worker.close());
 const result=JSON.parse((await worker.call('designs.warm',root,{})).bytes);
 assert.ok(Array.isArray(result.lines)&&result.lines.length>=1);
 assert.ok(result.lines.some(line=>line.id==='test-linie'&&line.ok===true&&typeof line.ms==='number'));
 // Danach kommt die Linie aus dem Zwischenspeicher und ist bytegleich zum direkten Weg.
 const viaWorker=(await worker.call('designs.list',root,queryArgs({linie:'test-linie'}))).bytes;
 forgetKatalog();
 const direct=Buffer.from(JSON.stringify(await designDashboardWithFit(root,{...queryArgs({linie:'test-linie'}),repository:db.repository,available:{Michroma:FONT}})));
 assert.ok(Buffer.compare(viaWorker,direct)===0);
});

test('Speicherwächter: belegt der Prozess zu viel Arbeitsspeicher, endet nur der Worker (503 designs_memory, protokolliert); der Hauptprozess läuft weiter',async t=>{
 const logs=[],limit=Math.round(process.memoryUsage().rss/1048576)+150;
 const worker=createKatalogWorker({dbFile:':memory:',tenantId:'gravuru',available:{},testOps:true,maxRssMb:limit,watchMs:20,logger:entry=>logs.push(entry)});t.after(()=>worker.close());
 const started=performance.now();
 await assert.rejects(worker.call('test.memory','/x',{mb:500,holdMs:20000}),e=>e.status===503&&e.code==='designs_memory');
 assert.ok(performance.now()-started<10000,'der Worker wird beendet, bevor seine Rechnung fertig wäre');
 const lost=logs.find(e=>e.event==='katalog_worker_lost');
 assert.ok(lost&&/^Speichergrenze: Prozess belegt \d+ MB \(Grenze \d+ MB\)$/.test(lost.reason),'Ausfall ist mit Messwert protokolliert');
 // Der Hauptprozess lebt und der nächste Aufruf startet einen neuen Worker.
 for(let i=0;i<100&&process.memoryUsage().rss/1048576>limit;i++)await new Promise(r=>setTimeout(r,50));
 assert.equal(JSON.parse((await worker.call('test.sleep','/x',{ms:1})).bytes).counter,1);
});

test('Datenbank je Rechnung: gleiche Schlüssel und Produkte werden nur einmal gelesen, Fehler bleiben Fehler, Antwort bleibt gleich',async t=>{
 const root=katalog(t,8),db=database(t,root);
 const imported=importProduct(db.repository,db.keys[0]);
 const counts={items:0,gets:0},keys=new Set(),ids=new Set();
 const counting={importItem:key=>{counts.items+=1;keys.add(key);return db.repository.importItem(key);},get:id=>{counts.gets+=1;ids.add(id);return db.repository.get(id);}};
 const options={linie:'test-linie',available:{Michroma:FONT}};
 forgetKatalog();
 const direct=JSON.stringify(await designDashboardWithFit(root,{...options,repository:db.repository}));
 forgetKatalog();
 const memo=JSON.stringify(await designDashboardWithFit(root,{...options,repository:memoReader(counting)}));
 assert.equal(memo,direct,'Antwort mit gemerkten Datenbankantworten bytegleich');
 assert.ok(memo.includes(imported.id),'das importierte Produkt steht in der Antwort');
 assert.equal(counts.items,keys.size,'jeder Schlüssel wird genau einmal gelesen');
 assert.equal(counts.gets,ids.size,'jedes Produkt wird genau einmal gelesen');
 // Fehler werden gemerkt und wieder geworfen; null bleibt null; ohne Leser bleibt es ohne Leser.
 let calls=0;const failing=memoReader({importItem:()=>null,get:()=>{calls+=1;throw Object.assign(new Error('weg'),{status:404});}});
 assert.throws(()=>failing.get('a'),/weg/);assert.throws(()=>failing.get('a'),/weg/);assert.equal(calls,1);
 assert.equal(failing.importItem('x'),null);assert.equal(memoReader(null),null);
});

// ---- HTTP: Weiche ----
const raw=(base,route,headers={})=>new Promise((resolve,reject)=>{
 http.get(base+route,{headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));}).on('error',reject);
});

async function server(t,root,dir,seed,enabled){
 const before=process.env.GRAVURU_KATALOG_WORKER;
 if(enabled)process.env.GRAVURU_KATALOG_WORKER='enabled';else delete process.env.GRAVURU_KATALOG_WORKER;
 let workshop;try{workshop=createWorkshop({filename:path.join(dir,(enabled?'on':'off')+'.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:root});}
 finally{if(before===undefined)delete process.env.GRAVURU_KATALOG_WORKER;else process.env.GRAVURU_KATALOG_WORKER=before;}
 const srv=createPreviewServer({outputDirectory:dir,workshop});srv.listen(0,'127.0.0.1');await once(srv,'listening');
 t.after(async()=>{await new Promise(r=>srv.close(r));workshop.close();});
 return {base:'http://127.0.0.1:'+srv.address().port,workshop};
}

test('HTTP: mit Schalter antwortet die Werkstatt bytegleich (Kopfzeilen und Körper), ohne Schalter läuft kein Worker',async t=>{
 const root=katalog(t,6,60000);
 const dir=fs.mkdtempSync(path.join(path.resolve('.local-data'),'p1c-http-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const logs=[],log=console.warn;console.warn=(...a)=>{try{const e=JSON.parse(a[0]);if(e.event==='katalog_worker'){logs.push(e);return;}}catch{}log(...a);};t.after(()=>{console.warn=log;});
 const off=await server(t,root,dir,seed,false),on=await server(t,root,dir,seed,true);
 const routes=['/api/workshop/designs','/api/workshop/designs?linie=test-linie','/api/workshop/designs?linie=test-linie&status=ok','/api/workshop/designs?linie=test-linie&startDesigns=true','/api/workshop/designs?linie=test-linie&startDesigns=quatsch','/api/workshop/designs?linie=nix','/api/workshop/designs?linie=test-linie&status=quatsch',
  '/api/workshop/designs/target-preview?reihe=test-reihe&id=T-D1&familie=test-schilder','/api/workshop/designs/target-preview?reihe=test-reihe&id=T-D1&familie=erfunden',
  '/api/workshop/designs/svg?reihe=test-reihe&id=T-D1&file=design.svg','/api/workshop/designs/svg?reihe=test-reihe&id=T-D1&file=original.png','/api/workshop/designs/svg?reihe=test-reihe&id=T-D1&file=design.json','/api/workshop/designs/svg?reihe=..&id=linien&file=design.svg'];
 const cmp=async(route,headers)=>{
  forgetKatalog();const a=await raw(off.base,route,headers);forgetKatalog();const b=await raw(on.base,route,headers);
  assert.equal(b.status,a.status,route);
  for(const h of new Set([...Object.keys(a.headers),...Object.keys(b.headers)]))if(!['date','connection','keep-alive'].includes(h))assert.equal(b.headers[h],a.headers[h],route+' '+h);
  assert.deepEqual(b.body,a.body,route);return a;
 };
 for(const route of routes)await cmp(route);
 const big=await cmp('/api/workshop/designs?linie=test-linie',{'accept-encoding':'gzip'});
 assert.equal(big.headers['content-encoding'],'gzip','große Antwort ist gzip');
 const small=await cmp('/api/workshop/designs',{'accept-encoding':'gzip'});assert.equal(small.headers['content-encoding'],undefined);
 assert.ok(logs.length>0,'Worker wurde benutzt und hat protokolliert');
 assert.equal(off.workshop.katalogWorker,null,'ohne Schalter kein Client');assert.equal(on.workshop.katalogWorker.started(),true);
});

test('HTTP: Schreibweg bleibt im Hauptprozess; nach PATCH liefert der Worker sofort den neuen Stand',async t=>{
 const root=katalog(t,3);
 const dir=fs.mkdtempSync(path.join(path.resolve('.local-data'),'p1c-http-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const log=console.warn;console.warn=(...a)=>{try{if(JSON.parse(a[0]).event==='katalog_worker')return;}catch{}log(...a);};t.after(()=>{console.warn=log;});
 const on=await server(t,root,dir,seed,true);
 const rows=async()=>(await (await fetch(on.base+'/api/workshop/designs?linie=test-linie&reihe=test-reihe')).json()).rows;
 const before=await rows();assert.ok(before.length>0);
 const session=await (await fetch(on.base+'/api/workshop/session')).json();
 const patched=await fetch(on.base+'/api/workshop/designs',{method:'PATCH',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':session.csrfToken},body:JSON.stringify({reihe:'test-reihe',designId:'T-D1',name:'Neu benannt'})});
 assert.equal(patched.status,200,await patched.clone().text());
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'designs/test-reihe/T-D1/design.json'),'utf8')).name,'Neu benannt');
 assert.equal((await rows()).find(r=>r.id==='T-D1').name,'Neu benannt');
});

test('Schalter aus: kein Worker wird erzeugt (auch nicht bei anderen Werten als „enabled“)',async t=>{
 const root=katalog(t,2);
 const dir=fs.mkdtempSync(path.join(path.resolve('.local-data'),'p1c-http-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const off=await server(t,root,dir,seed,false);
 assert.equal((await raw(off.base,'/api/workshop/designs?linie=test-linie')).status,200);
 assert.equal(off.workshop.katalogWorker,null);
 const before=process.env.GRAVURU_KATALOG_WORKER;
 for(const value of ['1','true','Enabled','']){
  process.env.GRAVURU_KATALOG_WORKER=value;
  try{const w=createWorkshop({filename:path.join(dir,'x.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:root});assert.equal(w.katalogWorker,null,value);w.close();}
  finally{if(before===undefined)delete process.env.GRAVURU_KATALOG_WORKER;else process.env.GRAVURU_KATALOG_WORKER=before;}
 }
 // :memory: hat keine gemeinsame Datei für den Leser → bewusst kein Worker
 process.env.GRAVURU_KATALOG_WORKER='enabled';
 try{const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,katalogDir:root});assert.equal(w.katalogWorker,null);w.close();}
 finally{if(before===undefined)delete process.env.GRAVURU_KATALOG_WORKER;else process.env.GRAVURU_KATALOG_WORKER=before;}
});

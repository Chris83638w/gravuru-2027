// Paket 1c: Die lesenden Katalog-Rechnungen der Werkstatt-Designliste laufen in einem dauerhaften Worker-Thread,
// damit der Hauptprozess (auch Kunden-Konfigurator) währenddessen frei bleibt. Diese Datei läuft IM Worker.
// Sie rechnet mit dem vorhandenen Code (design-dashboard, design-target-preview, design-preview-glyphs) und
// serialisiert selbst; der Hauptprozess bekommt fertige Bytes. Die Datenbank wird nur gelesen.
import {parentPort,workerData} from 'node:worker_threads';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {designDashboardWithFit,designFile,forgetKatalog,exportDashboardCache,importDashboardCache,dashboardCacheWrites} from './design-dashboard.mjs';
import {targetDesignPreview} from './design-target-preview.mjs';
import {designPreviewGlyphs} from './design-preview-glyphs.mjs';
import {tenantOption} from './tenant.mjs';

export const GZIP_MIN_BYTES=262144;
const notFound=()=>Object.assign(new Error('Konfiguration nicht gefunden.'),{status:404,code:'not_found'});

/** Nur-Lese-Zugriff auf die Produktdatenbank der Werkstatt mit genau den zwei Methoden, die konfiProducts() braucht
 *  (gleiche Bedeutung wie im Repository). Kein createProductRepository: das legt Tabellen an und schreibt beim Öffnen. */
export function openKatalogReader({dbFile,tenantId}){
  if(typeof dbFile!=='string'||!dbFile||dbFile===':memory:')return null;
  const tenant=tenantOption({tenantId});
  const db=new DatabaseSync(dbFile,{readOnly:true});
  try{db.exec('PRAGMA busy_timeout = 5000;');}catch(error){db.close();throw error;}
  const item=db.prepare('SELECT import_key, fingerprint, product_id FROM import_items WHERE import_key = ? AND tenant_id = ?');
  const head=db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?');
  const revision=db.prepare('SELECT * FROM product_revisions WHERE product_id = ? AND revision = ? AND tenant_id = ?');
  return {
    importItem(key){
      const row=item.get(key,tenant);
      return row?{key:row.import_key,fingerprint:row.fingerprint,id:row.product_id}:null;
    },
    get(id){
      const row=typeof id==='string'?head.get(id,tenant):null;
      if(!row)throw notFound();
      const snap=revision.get(row.id,row.revision,tenant);
      if(!snap)throw Object.assign(new Error('Revision nicht gefunden.'),{status:404,code:'revision_not_found'});
      return {id:row.id,revision:snap.revision,publishedRevision:snap.published_revision,status:snap.status,document:JSON.parse(snap.document),metadata:JSON.parse(snap.metadata),createdAt:row.created_at,updatedAt:snap.created_at};
    },
    close(){db.close();},
  };
}

// Fertige Bytes für die Übertragung: eigener ArrayBuffer ohne Pool-Anteil (ein Pool-Puffer darf nie übertragen werden).
const transferable=buffer=>{
  if(buffer.byteOffset===0&&buffer.byteLength===buffer.buffer.byteLength&&buffer.buffer instanceof ArrayBuffer&&buffer.byteLength>=8192)return buffer.buffer;
  return copyOf(buffer);
};

const copyOf=buffer=>{const copy=new Uint8Array(buffer.byteLength);copy.set(buffer);return copy.buffer;};

// ---- Zwischenspeicher auf Platte (Paket 1c-2) ----
// Der Rechenstand der Designliste übersteht so einen Neustart. Die Datei gilt nur für genau diesen Programmstand:
// der Fingerabdruck umfasst alle Module der Werkstatt und des Konfigurators. Nach jeder Installation wird neu gerechnet.
export const CACHE_FORMAT='katalog-worker-cache-v1';
export function codeFingerprint(){
 const here=path.dirname(fileURLToPath(import.meta.url)),hash=createHash('sha256').update(CACHE_FORMAT);
 for(const dir of [here,path.join(here,'..','configurator','variant-m')]){
  let names=[];try{names=fs.readdirSync(dir).filter(name=>name.endsWith('.mjs')&&!name.endsWith('.test.mjs')).sort();}catch{}
  for(const name of names){hash.update(name+'\0');try{hash.update(fs.readFileSync(path.join(dir,name)));}catch{hash.update('fehlt');}}
 }
 return hash.digest('hex');
}
export function loadDiskCache(file,fingerprint){
 if(typeof file!=='string'||!file)return {loaded:0,reason:'aus'};
 try{
  const data=JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));
  if(data?.format!==CACHE_FORMAT||data.fingerprint!==fingerprint)return {loaded:0,reason:'anderer Programmstand'};
  return {loaded:importDashboardCache(data.cache),reason:'geladen'};
 }catch(error){return {loaded:0,reason:error?.code==='ENOENT'?'keine Datei':'unlesbar'};}
}
export function saveDiskCache(file,fingerprint){
 if(typeof file!=='string'||!file)return null;
 const cache=exportDashboardCache();
 const bytes=gzipSync(Buffer.from(JSON.stringify({format:CACHE_FORMAT,fingerprint,savedAt:new Date().toISOString(),cache:{targets:cache.targets,targetsOf:cache.targetsOf}})),{level:6});
 const temp=file+'.'+process.pid+'.tmp';
 fs.writeFileSync(temp,bytes);fs.renameSync(temp,file);
 return {bytes:bytes.length,entries:cache.targets.length+cache.targetsOf.length,skipped:cache.skipped};
}

/** Rechenlogik der Operationen, unabhängig vom Thread (wird auch direkt getestet). */
export function createKatalogOperations({reader,getAvailable,testOps=false}){
  let counter=0;
  const json=(value,acceptGzip)=>{
    const raw=Buffer.from(JSON.stringify(value));
    if(!acceptGzip||raw.length<GZIP_MIN_BYTES)return {kind:'json',bytes:raw,gzip:false,fresh:true};
    return {kind:'json',bytes:gzipSync(raw,{level:6}),gzip:true,fresh:true};
  };
  const ops={
    // Gleiche Aufrufe wie der Handler in http.mjs (ohne Worker).
    'designs.list':async(root,args,{acceptGzip})=>{
      const started=performance.now(),value=await designDashboardWithFit(root,{...args,repository:reader,available:getAvailable()}),computed=performance.now();
      const out=json(value,acceptGzip);out.timing={msList:Math.round(computed-started),msSerialize:Math.round(performance.now()-computed)};return out;
    },
    // Vorrechnen aller Linien im Hintergrund (nach dem Start): füllt die Zwischenspeicher, damit niemand auf den ersten,
    // kalten Durchlauf einer Linie warten muss. Zwischen zwei Linien kommen wartende echte Anfragen an die Reihe.
    'designs.warm':async root=>{
      const overview=await designDashboardWithFit(root,{repository:reader,available:getAvailable()}),lines=[];
      for(const line of Array.isArray(overview?.linien)?overview.linien:[]){
        if(typeof line?.id!=='string')continue;
        await new Promise(resolve=>setImmediate(resolve));
        const started=performance.now();let ok=true;
        try{await designDashboardWithFit(root,{linie:line.id,repository:reader,available:getAvailable()});}catch{ok=false;}
        lines.push({id:line.id,ms:Math.round(performance.now()-started),ok});
      }
      return json({lines},false);
    },
    'designs.targetPreview':async(root,args)=>json(await targetDesignPreview(root,args,{available:getAvailable()}),false),
    'designs.svg':async(root,args)=>{
      const {file,type}=designFile(root,args);
      const preview=type.startsWith('image/svg+xml')?await designPreviewGlyphs({file,root,available:getAvailable()}):{bytes:fs.readFileSync(file),warnings:[]};
      return {kind:'file',type,bytes:Buffer.from(preview.bytes.buffer,preview.bytes.byteOffset,preview.bytes.byteLength),warnings:preview.warnings};
    },
  };
  if(testOps){
    // Nur wenn der Aufrufer sie über workerData ausdrücklich einschaltet; über die Server-Umgebung nicht erreichbar.
    ops['test.busy']=async(root,args,{acceptGzip})=>{const end=performance.now()+Number(args.ms||0);while(performance.now()<end);counter+=1;return json({counter},acceptGzip);};
    ops['test.sleep']=async(root,args,{acceptGzip})=>{await new Promise(r=>setTimeout(r,Number(args.ms||0)));counter+=1;return json({counter},acceptGzip);};
    ops['test.crash']=async()=>{process.exit(3);};
  }
  return ops;
}

// Rechenzeit dieses Threads (ms). Liegt sie weit unter der Laufzeit, wartet der Worker auf die Platte oder wird gebremst.
const cpuNow=()=>{const usage=typeof process.threadCpuUsage==='function'?process.threadCpuUsage():process.cpuUsage();return (usage.user+usage.system)/1000;};

async function run(ops,message){
  const {id,op,root,args,acceptGzip}=message;
  try{
    const handler=Object.hasOwn(ops,op)?ops[op]:null;
    if(!handler)throw Object.assign(new Error('Unbekannte Operation.'),{status:500,code:'worker_op'});
    const cpuBefore=cpuNow(),runStarted=performance.now();
    const result=await handler(root,args||{},{acceptGzip:Boolean(acceptGzip)});
    const timing={...(result.timing||{}),msRun:Math.round(performance.now()-runStarted),cpuMs:Math.round(cpuNow()-cpuBefore)};
    // Nur frisch erzeugte Antworten dürfen übertragen (und damit im Worker ungültig) werden; Dateiantworten stammen aus dem
    // Vorschau-Speicher des Workers und werden kopiert.
    const buffer=result.bytes,bytes=result.fresh?transferable(buffer):copyOf(buffer);
    return {reply:{id,ok:true,kind:result.kind,gzip:result.gzip||false,type:result.type,warnings:result.warnings,timing,bytes},transfer:[bytes]};
  }catch(error){
    return {reply:{id,ok:false,status:error?.status,code:error?.code,message:String(error?.message??error),actualRevision:error?.actualRevision}};
  }
}

if(parentPort){
  const {dbFile,tenantId,available:initial,testOps=false}=workerData||{};
  let available=initial||{},epoch=0,fontsVersion=0;
  const reader=openKatalogReader({dbFile,tenantId});
  const ops=createKatalogOperations({reader,getAvailable:()=>available,testOps});
  const cacheFile=typeof workerData?.cacheFile==='string'?workerData.cacheFile:null,fingerprint=cacheFile?codeFingerprint():null;
  let savedWrites=dashboardCacheWrites(),saveTimer=null;
  if(cacheFile){const loaded=loadDiskCache(cacheFile,fingerprint);parentPort.postMessage({note:'cache_load',loaded:loaded.loaded,reason:loaded.reason});}
  const saveSoon=()=>{
    if(!cacheFile||saveTimer||dashboardCacheWrites()===savedWrites)return;
    saveTimer=setTimeout(()=>{
      saveTimer=null;const writes=dashboardCacheWrites();
      try{const saved=saveDiskCache(cacheFile,fingerprint);savedWrites=writes;parentPort.postMessage({note:'cache_save',...saved});}
      catch(error){parentPort.postMessage({note:'cache_save',error:String(error?.code||error?.message||error)});}
    },Number(workerData?.cacheSaveDelayMs??5000));
  };
  parentPort.on('message',async message=>{
    // Schriften und Katalogstand kommen vom Hauptprozess: neue Schriften übernehmen, nach Schreibvorgängen den
    // 2-Sekunden-Speicher des geöffneten Katalogs verwerfen (im Hauptprozess macht das forgetKatalog() der Schreibwege).
    if(message.available&&message.fontsVersion!==fontsVersion){available=message.available;fontsVersion=message.fontsVersion;}
    if(message.epoch!==epoch){epoch=message.epoch;forgetKatalog();}
    const {reply,transfer}=await run(ops,message);
    parentPort.postMessage(reply,transfer||[]);
    if(message.op==='designs.list'||message.op==='designs.warm')saveSoon();
  });
}

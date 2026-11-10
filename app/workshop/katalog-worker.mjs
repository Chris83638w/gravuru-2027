// Paket 1c: Die lesenden Katalog-Rechnungen der Werkstatt-Designliste laufen in einem dauerhaften Worker-Thread,
// damit der Hauptprozess (auch Kunden-Konfigurator) währenddessen frei bleibt. Diese Datei läuft IM Worker.
// Sie rechnet mit dem vorhandenen Code (design-dashboard, design-target-preview, design-preview-glyphs) und
// serialisiert selbst; der Hauptprozess bekommt fertige Bytes. Die Datenbank wird nur gelesen.
import {parentPort,workerData} from 'node:worker_threads';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {gzipSync} from 'node:zlib';
import {designDashboardWithFit,designFile,forgetKatalog} from './design-dashboard.mjs';
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
    'designs.list':async(root,args,{acceptGzip})=>json(await designDashboardWithFit(root,{...args,repository:reader,available:getAvailable()}),acceptGzip),
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

async function run(ops,message){
  const {id,op,root,args,acceptGzip}=message;
  try{
    const handler=Object.hasOwn(ops,op)?ops[op]:null;
    if(!handler)throw Object.assign(new Error('Unbekannte Operation.'),{status:500,code:'worker_op'});
    const result=await handler(root,args||{},{acceptGzip:Boolean(acceptGzip)});
    // Nur frisch erzeugte Antworten dürfen übertragen (und damit im Worker ungültig) werden; Dateiantworten stammen aus dem
    // Vorschau-Speicher des Workers und werden kopiert.
    const buffer=result.bytes,bytes=result.fresh?transferable(buffer):copyOf(buffer);
    return {reply:{id,ok:true,kind:result.kind,gzip:result.gzip||false,type:result.type,warnings:result.warnings,bytes},transfer:[bytes]};
  }catch(error){
    return {reply:{id,ok:false,status:error?.status,code:error?.code,message:String(error?.message??error),actualRevision:error?.actualRevision}};
  }
}

if(parentPort){
  const {dbFile,tenantId,available:initial,testOps=false}=workerData||{};
  let available=initial||{},epoch=0,fontsVersion=0;
  const reader=openKatalogReader({dbFile,tenantId});
  const ops=createKatalogOperations({reader,getAvailable:()=>available,testOps});
  parentPort.on('message',async message=>{
    // Schriften und Katalogstand kommen vom Hauptprozess: neue Schriften übernehmen, nach Schreibvorgängen den
    // 2-Sekunden-Speicher des geöffneten Katalogs verwerfen (im Hauptprozess macht das forgetKatalog() der Schreibwege).
    if(message.available&&message.fontsVersion!==fontsVersion){available=message.available;fontsVersion=message.fontsVersion;}
    if(message.epoch!==epoch){epoch=message.epoch;forgetKatalog();}
    const {reply,transfer}=await run(ops,message);
    parentPort.postMessage(reply,transfer||[]);
  });
}

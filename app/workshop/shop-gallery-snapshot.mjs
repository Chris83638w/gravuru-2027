import {createHmac,timingSafeEqual} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';

const schema='gravuru-shop-gallery-cache/v4';
// Limits apply only to this disposable cache. The caller falls back to a live
// build on a read miss and keeps the built gallery if persisting it fails.
const blockRows=256,blockBytes=1024*1024,totalBytes=512*1024*1024,envelopeBytes=64*1024*1024;
const bindingFields=['storeId','tenantId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','bindingId','assignmentRevision','options','unitCents'];
const pick=(value,fields)=>Object.fromEntries(fields.map(k=>[k,value[k]]));
const contextScope=context=>[context.store.workshop.tenantId,context.store.storeId,context.binding.shopDomain];
const projectRow=row=>({
 binding:pick(row.binding,bindingFields),scope:pick(row.scope,['key','lineId','familyId']),process:row.process,
 design:{katalog:{target:row.design.katalog.target?pick(row.design.katalog.target,['lineId','familyId','explicit','released']):undefined}},
 availability:{universal:{doorbell:{schema:row.availability.universal.doorbell.schema}}},designId:row.designId,dedupe:row.dedupe,
 search:pick(row.search,['text','number','rank','unnamedMotifs']),
 card:pick(row.card,['productId','productRevision','designId','productName','designName','themes','widthMm','heightMm','shape','unitCents','currency','shopifyProductId','shopifyVariantId'])
});

const cacheLimit=()=>{throw Error('Gallery snapshot exceeds cache limits');};
function pack(values,totals){
 const blocks=[];let pieces=[],bytes=2;
 const flush=()=>{
  if(!pieces.length)return;
  if(totals.bytes+bytes>totalBytes)cacheLimit();
  const data=deflateRawSync('['+pieces.join(',')+']',{level:1}).toString('base64');
  totals.bytes+=bytes;totals.rows+=pieces.length;totals.packed+=data.length;
  if(totals.packed>envelopeBytes)cacheLimit();
  blocks.push({rows:pieces.length,bytes,data});pieces=[];bytes=2;
 };
 for(const value of values){
  const json=JSON.stringify(value),size=Buffer.byteLength(json);
  if(size+2>blockBytes)cacheLimit();
  if(pieces.length===blockRows||bytes+size+(pieces.length?1:0)>blockBytes)flush();
  bytes+=size+(pieces.length?1:0);pieces.push(json);
 }
 flush();return blocks;
}
function* rowsOf(rows){for(let i=0;i<rows.length;i++)yield i in rows?projectRow(rows[i]):null;}
function* sourcesOf(sources){for(const [key,value] of sources)yield [key,{scope:pick(value.scope,['key','lineId','familyId']),process:value.process,theme:value.theme}];}
const count=value=>Number.isSafeInteger(value)&&value>=0;
function inspectBlocks(blocks,totals){
 if(!Array.isArray(blocks))throw Error('Invalid cache blocks');
 for(const b of blocks){
  if(!b||!count(b.rows)||b.rows<1||b.rows>blockRows||!count(b.bytes)||b.bytes<2||b.bytes>blockBytes||typeof b.data!=='string'||!b.data.length||b.data.length%4||b.data.length>Math.ceil((blockBytes+1024)/3)*4||/[^A-Za-z0-9+/=]|=[^=]|={3}/.test(b.data))throw Error('Invalid cache block');
  totals.bytes+=b.bytes;totals.rows+=b.rows;
  if(totals.bytes>totalBytes)cacheLimit();
 }
}
function* unpack(blocks){
 for(const b of blocks){
  const compressed=Buffer.from(b.data,'base64');
  if(compressed.length>blockBytes+1024||compressed.toString('base64')!==b.data)throw Error('Invalid cache block encoding');
  const raw=inflateRawSync(compressed,{maxOutputLength:b.bytes});
  if(raw.length!==b.bytes)throw Error('Invalid cache block length');
  const values=JSON.parse(raw.toString('utf8'));
  if(!Array.isArray(values)||values.length!==b.rows)throw Error('Invalid cache block count');
  yield* values;
 }
}

export function gallerySnapshotCodec(secret){
 const mac=payload=>createHmac('sha256',secret).update(schema+'\0').update(payload).digest('hex');
  // Gemeinsame Prüfung für decode/decodeLazy: Signatur, Umschlag, alle Blockangaben und die Quellen.
  function open(context,revision,saved){
   // v2/v3 are intentionally misses: parsing their full plaintext snapshot
   // would reintroduce the peak this derived v4 cache is intended to avoid.
   if(!saved||typeof saved.payload!=='string'||saved.payload.length>envelopeBytes||Buffer.byteLength(saved.payload)>envelopeBytes||!/^[a-f0-9]{64}$/.test(saved.mac||'')||!timingSafeEqual(Buffer.from(mac(saved.payload)),Buffer.from(saved.mac)))return null;
   try{
    const data=JSON.parse(saved.payload);
    if(data.schema!==schema||data.revision!==revision||JSON.stringify(data.scope)!==JSON.stringify(contextScope(context))||!Array.isArray(data.scopes)||!count(data.cards)||!count(data.sourceCount)||!count(data.bytes)||data.bytes>totalBytes)return null;
    // Check every manifest and aggregate before allocating inflated rows.
    const totals={bytes:0,rows:0},scopeKeys=new Set();
    for(const entry of data.scopes){
     if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||scopeKeys.has(entry[0]))return null;
     scopeKeys.add(entry[0]);inspectBlocks(entry[1],totals);
    }
    if(totals.rows!==data.cards)return null;
    inspectBlocks(data.sources,totals);
    if(totals.rows!==data.cards+data.sourceCount||totals.bytes!==data.bytes)return null;
    const sources=new Map();
    for(const pair of unpack(data.sources)){
     if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||sources.has(pair[0])||!pair[1]||typeof pair[1]!=='object'||Array.isArray(pair[1]))return null;
     sources.set(pair[0],pair[1]);
    }
    if(sources.size!==data.sourceCount)return null;
    return {data,sources};
   }catch{return null;}
  }
 return {
  encode(context,revision,snapshot){
   // Each temporary projection/JSON buffer is bounded. Never construct the
   // complete uncompressed payload or a second complete projected card graph.
   const totals={bytes:0,rows:0,packed:0},scopes=[];
   for(const [key,rows] of snapshot.scopes)scopes.push([key,pack(rowsOf(rows),totals)]);
   const cards=totals.rows,sources=pack(sourcesOf(snapshot.sources),totals);
   const payload=JSON.stringify({schema,scope:contextScope(context),revision,cards,sourceCount:totals.rows-cards,bytes:totals.bytes,scopes,sources});
   if(Buffer.byteLength(payload)>envelopeBytes)cacheLimit();
   return {payload,mac:mac(payload)};
  },
  decode(context,revision,saved){
   const opened=open(context,revision,saved);if(!opened)return null;
   try{
    const scopes=new Map();for(const [key,blocks] of opened.data.scopes)scopes.set(key,Array.from(unpack(blocks)));
    return scopes.size===opened.data.scopes.length?{scopes,sources:opened.sources}:null;
   }catch{return null;}
  },
  // Audit 17.11.2026: Live-Cache 245.830 Karten in 44 Bereichen (339 MB JSON). decode() entpackte bei jedem
  // Treffer alles (~3 s Hauptthread, ~1 GB Heap), eine Anfrage braucht aber nur den Bereich ihres Produkts.
  // decodeLazy prüft Signatur, Umschlag und alle Blockangaben sofort wie decode(), entpackt einen Bereich
  // aber erst beim ersten get() und merkt ihn sich. Ein (nach gültiger Signatur praktisch unmöglicher)
  // Fehler beim späteren Entpacken wirft, statt still eine leere Galerie zu liefern.
  decodeLazy(context,revision,saved){
   const opened=open(context,revision,saved);if(!opened)return null;
   const blocks=new Map(opened.data.scopes),inflated=new Map();
   const scopes=Object.freeze({
    get(key){if(!blocks.has(key))return undefined;if(!inflated.has(key))inflated.set(key,Array.from(unpack(blocks.get(key))));return inflated.get(key);},
    has:key=>blocks.has(key),keys:()=>blocks.keys(),get size(){return blocks.size;},
    get inflated(){return inflated.size;}
   });
   return {scopes,sources:opened.sources};
  }
 };
}

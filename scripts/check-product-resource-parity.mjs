// Explicit local acceptance: compare a preserved inline copy with its compact
// sibling, then exercise the unchanged native preview and manufacturing code.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readStoredDocumentText} from '../app/workshop/product-document-resources.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {prepareAcrylicReview} from '../app/workshop/acrylic-review.mjs';
import {acrylicArtwork} from '../app/workshop/acrylic-artwork.mjs';
import {build,OUTPUT} from '../app/configurator/variant-m/build.mjs';

const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
if(!args.includes('--before')||!args.includes('--after')||!args.includes('--out'))throw Error('Use --before ISOLATED_COPY --after MIGRATED_COPY --out NEW_DIRECTORY');
const before=fs.realpathSync(arg('--before')),after=fs.realpathSync(arg('--after')),out=path.resolve(arg('--out'));
if(before===after||fs.existsSync(out))throw Error('Use distinct copies and a new report directory');
// The rendering phase opens application services: immutable backup directories
// must never be used directly, even though this comparison does not save designs.
if([before,after].some(p=>p.split(/[\\/]/).includes('checkpoints')))throw Error('Copy the backup into isolated acceptance directories first');
fs.mkdirSync(out,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex'),quote=value=>'"'+value.replaceAll('"','""')+'"';
// The existing contour renderer allocates process-local mask IDs. Sequential
// renders intentionally differ only in these IDs and their matching URL refs.
// Do not normalize geometry, text, font paths, resource data or other attributes.
const comparisonSvg=svg=>{
 const ids=new Map();
 return svg.replace(/\bm-design-area-\d+\b/g,id=>{if(!ids.has(id))ids.set(id,'m-design-area-'+ids.size);return ids.get(id);});
};
const report={schema:'gravuru-product-resource-parity/v1',startedAt:new Date().toISOString(),scope:'isolated-acceptance-copies',immutableBackupOpened:false,shopifyWrites:0,result:'RUNNING',tables:[],revisions:0,heads:0,previews:0,production:0,examples:[]};
report.svgComparison='Exact after renaming only process-local m-design-area mask IDs and their matching references';
const left=new DatabaseSync(path.join(before,'workshop.sqlite'),{readOnly:true}),right=new DatabaseSync(path.join(after,'workshop.sqlite'),{readOnly:true});
let a,b;
try{
 const names=left.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 const afterNames=right.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 assert.deepEqual(afterNames.filter(n=>n!=='product_document_resources'),names.filter(n=>n!=='product_document_resources'),'no unrelated tables added or removed');
 const digestRows=(db,name)=>{
  const sum=createHash('sha256');let count=0;
  const hasRowid=db.prepare('PRAGMA table_list').all().find(r=>r.name===name)?.wr===0;
  const stmt=db.prepare('SELECT '+(hasRowid?'rowid AS __storage_rowid,':'')+'* FROM '+quote(name)+(hasRowid?' ORDER BY rowid':''));
  stmt.setReadBigInts(true);
  for(const row of stmt.iterate()){
   const fields=Object.entries(row).map(([key,value])=>[key,value instanceof Uint8Array?['bytes',value.length,hash(value)]:typeof value==='bigint'?['bigint',String(value)]:value]);
   sum.update(JSON.stringify(fields)+'\n');count++;
  }
  return {rows:count,sha256:sum.digest('hex')};
 };
 for(const name of names){
  if(name==='product_revisions'||name==='product_document_resources')continue;
  const old=digestRows(left,name),next=digestRows(right,name);assert.deepEqual(next,old,name+' must be unchanged');report.tables.push({name,...old});
 }
 const rows=left.prepare('SELECT product_id,revision,tenant_id FROM product_revisions ORDER BY product_id,revision').all();
 const select=db=>db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=? AND tenant_id=?'),l=select(left),r=select(right);
 const revisionDigests=createHash('sha256');
 for(const key of rows){
  const old=l.get(key.product_id,key.revision,key.tenant_id),next=r.get(key.product_id,key.revision,key.tenant_id);
  assert.ok(next,'revision exists');const original=readStoredDocumentText(left,old.document,{tenantId:key.tenant_id}),restored=readStoredDocumentText(right,next.document,{tenantId:key.tenant_id});
  assert.equal(restored,original,'full serialized revision must remain byte-identical');
  delete old.document;delete next.document;assert.deepEqual(next,old,'revision identity/status/metadata unchanged');
  revisionDigests.update(JSON.stringify([key,hash(original)])+'\n');report.revisions++;
 }
 assert.equal(right.prepare('SELECT count(*) AS n FROM product_revisions').get().n,report.revisions);
 report.revisionSha256=revisionDigests.digest('hex');
 for(const name of fs.readdirSync(before).filter(n=>n.endsWith('.sqlite')&&n!=='workshop.sqlite')){
  const x=new DatabaseSync(path.join(before,name),{readOnly:true}),y=new DatabaseSync(path.join(after,name),{readOnly:true});
  try{for(const {name:table}of x.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()){
   const old=digestRows(x,table),next=digestRows(y,table);assert.deepEqual(next,old,name+'/'+table);report.tables.push({name:name+'/'+table,...old});
  }}finally{x.close();y.close();}
 }
 const heads=left.prepare('SELECT id,revision,tenant_id FROM products ORDER BY id').all();
 const seed=JSON.parse(readStoredDocumentText(left,l.get(heads[0].id,heads[0].revision,heads[0].tenant_id).document,{tenantId:heads[0].tenant_id}));
 left.close();right.close();
 if(!fs.existsSync(path.join(OUTPUT,'models.json')))build();
 const legacy=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0].legacy;
 a=createWorkshop({filename:path.join(before,'workshop.sqlite'),seedConfig:seed.config,legacy,katalogDir:null});
 b=createWorkshop({filename:path.join(after,'workshop.sqlite'),seedConfig:seed.config,legacy,katalogDir:null});
 const productionKinds=new Set(),previewHashes=createHash('sha256');
 const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64');
 for(const head of heads){
  const old=a.repository.get(head.id),next=b.repository.get(head.id);
  assert.deepEqual(next,old,'native API record');report.heads++;
  assert.deepEqual(prepareShopProduct(next),prepareShopProduct(old),'commerce, options and prices');
  for(const design of old.document.config.profile.designs){
   const x=a.editorPreview(old.document,design.id),y=b.editorPreview(next.document,design.id);
   assert.deepEqual({...y,svg:undefined},{...x,svg:undefined},'native preview quote and metadata');
   if(comparisonSvg(x.svg)!==comparisonSvg(y.svg)){
    let offset=0;while(offset<Math.min(x.svg.length,y.svg.length)&&x.svg[offset]===y.svg[offset])offset++;
    fs.writeFileSync(path.join(out,'mismatch-preview-before.svg'),x.svg);fs.writeFileSync(path.join(out,'mismatch-preview-after.svg'),y.svg);
    throw Error('Native preview differs '+head.id+'/'+design.id+' at '+offset+': '+JSON.stringify([x.svg.slice(Math.max(0,offset-60),offset+160),y.svg.slice(Math.max(0,offset-60),offset+160)]));
   }
   if(x.svg!==y.svg)report.previewLocalIdDifferences=(report.previewLocalIdDifferences||0)+1;
   const sha=hash(comparisonSvg(x.svg));previewHashes.update(JSON.stringify([head.id,design.id,sha])+'\n');report.previews++;
   const p=old.document.config.profile,group=p.material.kind+'-'+p.geometry.shape+(p.material.kind==='slate'?'-'+p.geometry.width+'x'+p.geometry.height:'');
   if(!report.examples.some(e=>e.group===group)&&report.examples.length<8){
    const name='example-'+report.examples.length;fs.writeFileSync(path.join(out,name+'-before.svg'),x.svg);fs.writeFileSync(path.join(out,name+'-after.svg'),y.svg);
    report.examples.push({group,name,productId:head.id,designId:design.id,comparisonSha256:sha,beforeSha256:hash(x.svg),afterSha256:hash(y.svg)});
   }
   const productionGroup=group+(design.objects.some(o=>o.type==='photoSlot')?'-example-photo':'');
   if(design.objects.some(o=>o.uxUploadId||o.type==='photoSlot'&&o.required)){
    (report.productionSkipped??=[]).push({productId:head.id,designId:design.id,reason:'Requires customer photo input; original sources and masks are covered by document/asset/preview parity.'});
   }else if(!productionKinds.has(productionGroup)){
    const render=async (record,workshop)=>{
     const c=workshop.model(record.id,record.revision).universal;
     const original=c.profile.designs.find(d=>d.id===design.id);
     // Checkout requires customers to replace required template text. Use the
     // same deterministic input in both copies, retaining the original glyphs.
     // This temporary input is never written into a product or design revision.
     const objects=structuredClone(original.objects);
     for(const o of objects)if(o.type==='text'&&o.required){const reversed=[...o.text].reverse().join('');o.text=reversed===o.text?o.text+' '+o.text:reversed;}
     const frozen=await prepareAcrylicReview({record,config:c,assets:workshop.assets,input:{productId:record.id,productRevision:record.revision,designId:design.id,objects,options:{},quantity:1,media:[],preview:'isolated-resource-parity'},preparePhoto:async()=>({preview:pixel,width:1,height:1})});
     return acrylicArtwork(frozen.package,frozen.manifest.packageSha256,{engraving:true});
    };
    const x=await render(old,a),y=await render(next,b);assert.equal(y.svg,x.svg,'manufacturing SVG');assert.deepEqual(y.geometry,x.geometry,'manufacturing geometry');
    (report.productionCases??=[]).push({group:productionGroup,productId:head.id,designId:design.id,requiredCustomerInput:'same reversed template text, no stored changes',svgSha256:hash(x.svg),geometrySha256:hash(JSON.stringify(x.geometry))});
    productionKinds.add(productionGroup);report.production++;
   }
  }
  process.stdout.write(JSON.stringify({head:report.heads,total:heads.length,previews:report.previews})+'\n');
 }
 report.previewSha256=previewHashes.digest('hex');report.result='PASS';
 const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="de"><meta charset="utf-8"><title>Grundplatten und Schriften · Erhaltungsprüfung</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;background:#f4f6f5;color:#20312b;max-width:1200px;margin:24px auto;padding:0 16px}h1{font-size:26px}section{background:white;border:1px solid #c6d4cd;border-radius:14px;padding:18px;margin:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%;max-height:440px}figure{margin:0}figcaption{font-weight:650;margin-bottom:12px}@media(max-width:600px){.pair{grid-template-columns:1fr}}</style><h1>Designs unverändert erhalten</h1><p>Isolierte lokale Kopien · '+report.revisions+' vollständige Revisionen und '+report.previews+' native Vorschauen identisch. Kein Live-Shop.</p>'+report.examples.map(e=>'<section><h2>'+esc(e.group)+'</h2><div class="pair"><figure><figcaption>Vorher</figcaption><img src="'+e.name+'-before.svg" alt="Originalzustand"></figure><figure><figcaption>Gemeinsame Ablage</figcaption><img src="'+e.name+'-after.svg" alt="Identische Vorschau nach Umstellung"></figure></div></section>').join(''));
}catch(error){report.result='FAIL';report.error={name:error.name,message:error.message};throw error;}
finally{a?.close();b?.close();try{left.close();}catch{}try{right.close();}catch{}report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'parity.json'),JSON.stringify(report,null,2));}

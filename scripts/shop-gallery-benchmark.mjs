// Local copy only. Source stays read-only; optional cache uses a separate SQLite file.
// No network, source migrations or customer-table reads.
import {createShopGalleryCache} from '../app/workshop/shop-gallery-cache.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createShopProductBindingStore} from '../app/workshop/shop-product-binding-store.mjs';
import {createShopDesignGallery} from '../app/workshop/shop-design-gallery.mjs';
import {shopGalleryModel} from '../app/workshop/shop-gallery-model.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
function fileHash(filename){const fd=fs.openSync(filename,'r'),digest=createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024);try{let size;while((size=fs.readSync(fd,buffer,0,buffer.length,null)))digest.update(buffer.subarray(0,size));return digest.digest('hex');}finally{fs.closeSync(fd);}}
export async function benchmarkGalleryCopy({filename,tenantId,storeId,shopDomain,legacySingleStore=false,doorbellLiveOrders=false,cacheFilename,onMeasure=()=>{}}){
 if(cacheFilename&&fs.existsSync(cacheFilename)){const sourceStat=fs.statSync(filename),cacheStat=fs.statSync(cacheFilename);if(sourceStat.dev===cacheStat.dev&&sourceStat.ino===cacheStat.ino)fail('cache_must_be_separate_from_source');}
 const db=new DatabaseSync(filename,{readOnly:true}),measurements=[];let cacheDb;
 try{
  cacheDb=cacheFilename?new DatabaseSync(cacheFilename):null;
  const scope={tenantId,storeId,shopDomain},tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
  const source=(id,revision)=>legacySingleStore?db.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=?').get(id,revision):db.prepare('SELECT document FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get(tenantId,id,revision);
  const get=(id,revision)=>{const row=source(id,revision);if(!row)fail('missing_fixed_product');return {id,revision,document:JSON.parse(row.document)};};
  const noWrite=()=>fail('benchmark_read_only');
  const baseRegistry=createShopProductBindingStore({database:db,orderIntake:{tenantId,bindVariants:noWrite,bindings:noWrite},adapter:{...scope,getCurrentProduct:noWrite},...scope,legacySingleStore,readOnly:true,logger:()=>{}});
  let revisionMs=0,revisionReads=0;
  const registry={...baseRegistry,...(cacheDb?{galleryCache:createShopGalleryCache({database:cacheDb,...scope})}:{}),galleryRevision(){const at=performance.now();try{return baseRegistry.galleryRevision();}finally{revisionMs+=performance.now()-at;revisionReads++;}}};
  // Read only the fixed identity for the source request. Do not build gallery first.
  const first=db.prepare('SELECT r.product_gid,r.variant_gid FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE h.tenant_id=? AND h.shop=? AND r.store_id=? LIMIT 1').get(tenantId,shopDomain,storeId);
  if(!first)fail('no_active_bindings_in_copy');
  const identity={shopifyProductId:first.product_gid,shopifyVariantId:first.variant_gid};
  const store={storeId,registry,workshop:{tenantId}};let cardReads=0;const approvalHashes=new Map();
  // The benchmark mirrors only the persisted read checks. It creates no release
  // and never interprets an absent ledger/flag as permission.
  function checkBinding(_store,b,model){
   if(tables.has('konfi_status')&&db.prepare('SELECT status FROM konfi_status WHERE tenant_id=? AND product_id=?').get(tenantId,b.productId)?.status==='paused')throw Object.assign(Error('paused'),{status:423});
   if(model.universal.doorbell?.schema!=='gravuru-doorbell/v1')return;
   if(!doorbellLiveOrders||!tables.has('doorbell_live_order_approvals'))throw Object.assign(Error('unapproved'),{status:404});
   const row=db.prepare('SELECT * FROM doorbell_live_order_approvals WHERE tenant_id=? AND shop=? AND product_gid=? AND cfg_id=? AND cfg_revision=?').get(tenantId,shopDomain,b.shopifyProductId,b.productId,b.productRevision);
   if(!row?.approval_id||!JSON.parse(row.variants_json).includes(b.shopifyVariantId.split('/').at(-1)))throw Object.assign(Error('unapproved'),{status:404});
   const key=b.productId+':'+b.productRevision;if(!approvalHashes.has(key))approvalHashes.set(key,hash(source(b.productId,b.productRevision).document));
   if(approvalHashes.get(key)!==row.document_sha256)throw Object.assign(Error('changed'),{status:409});
  }
  const gallery=createShopDesignGallery({secret:'local-benchmark-not-a-shop-session',resolve:ids=>({store,binding:registry.resolve(ids)}),cardFor:(_store,b)=>{cardReads++;return shopGalleryModel(get(b.productId,b.productRevision));},modelFor:()=>fail('full_model_read_in_gallery'),allowedAssets:()=>fail('asset_read_in_gallery'),onMeasure:entry=>{measurements.push(entry);onMeasure(entry);},checkBinding});
  async function measure(){
   approvalHashes.clear();const start=performance.now(),binding=registry.resolve(identity),context={store,binding,session:{sid:'local-copy-benchmark'}};
   const sourceModel=shopGalleryModel(get(binding.productId,binding.productRevision));checkBinding(store,binding,sourceModel);
   const result=await gallery.list(context,{sourceModel});registry.resolve(identity);
   return {ms:+(performance.now()-start).toFixed(2),status:result.status||'ready',cards:result.total,firstPage:result.items.length};
  }
  const started=performance.now(),cold=await measure();await gallery.warm({store,binding:{shopDomain}});const preparationMs=+(performance.now()-started).toFixed(2),warm=await measure();
  return {cold,warm,preparationMs,measurements,revisionMs,revisionReads,peakRssMiB:+(process.resourceUsage().maxRSS/1024).toFixed(2),lightweightProductReads:cardReads,fullModelReads:0,assetReads:0,activeBindings:db.prepare('SELECT count(*) AS n FROM shop_product_binding_heads WHERE tenant_id=? AND shop=?').get(tenantId,shopDomain).n,readOnly:true};
 }finally{db.close();cacheDb?.close();}
}
function args(argv){
 const out={};for(let i=0;i<argv.length;i++){
  const k=argv[i];if(['--local-copy','--legacy-single-store','--doorbell-live-orders','--restart-child'].includes(k))out[k]=true;
  else if(['--cache-db','--db','--tenant','--store','--shop','--source-label'].includes(k)&&argv[i+1]&&!argv[i+1].startsWith('--'))out[k]=argv[++i];else fail('unknown_or_incomplete_argument');
 }
 if(!out['--local-copy']||!out['--db']||!out['--tenant']||!out['--store']||!out['--shop']||!out['--source-label'])fail('requires_local_copy_db_tenant_store_shop_source_label');return out;
}
async function main(){
 const a=args(process.argv.slice(2)),filename=path.resolve(a['--db']);
 const onMeasure=a['--restart-child']?entry=>{
  const report={event:entry.event,storeId:entry.storeId,rss:process.memoryUsage().rss};
  for(const key of ['ms','totalMs','activeRowsMs','documentReadMs','documentParseMs','documentHashMs','bindingReadMs','registryMs','modelMs','profileMs','selectionMs','products','bindings','models','cards'])if(Number.isFinite(entry[key]))report[key]=entry[key];
  fs.writeSync(2,JSON.stringify(report)+'\n');
 }:undefined;
 const hashes=()=>Object.fromEntries(['','-wal'].filter(s=>fs.existsSync(filename+s)&&(!s||fs.statSync(filename+s).size>0)).map(s=>[s||'db',fileHash(filename+s)]));
 const before=hashes(),result=await benchmarkGalleryCopy({filename,tenantId:a['--tenant'],storeId:a['--store'],shopDomain:a['--shop'],legacySingleStore:!!a['--legacy-single-store'],doorbellLiveOrders:!!a['--doorbell-live-orders'],cacheFilename:a['--cache-db'],onMeasure});
 if(JSON.stringify(before)!==JSON.stringify(hashes()))fail('copy_changed_during_benchmark');
 if(a['--restart-child']){console.log(JSON.stringify(result));return;}
 const restarted=JSON.parse(execFileSync(process.execPath,[...process.execArgv,fileURLToPath(import.meta.url),...process.argv.slice(2),'--restart-child'],{encoding:'utf8',timeout:900000,maxBuffer:1024*1024,windowsHide:true,stdio:['ignore','pipe','pipe']}));
 console.log(JSON.stringify({schema:'gravuru-gallery-copy-benchmark/v1',sourceLabel:a['--source-label'],measurement:'local gallery plus exact source-binding checks; no live HTTP/proxy proof',sha256:before,...result,afterProcessRestart:restarted,copyUnchanged:true},null,2));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(JSON.stringify({error:error.code||'benchmark_failed',message:error.message}));process.exitCode=1;});

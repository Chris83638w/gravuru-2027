// Size/coverage audit of completed immutable packages. No database is opened.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const bytes=v=>Buffer.byteLength(JSON.stringify(v));
const hash=b=>createHash('sha256').update(b).digest('hex');
export function expandedNativeDocumentBytes(document,fontSizes){
 const current=document.config.localResources.fonts;
 const objectBytes=2+fontSizes.reduce((n,f)=>n+bytes(f.name)+1+f.jsonBytes,0)+Math.max(0,fontSizes.length-1);
 return bytes(document)-bytes(current)+objectBytes;
}
export function auditPreparedReviewSet(root){
 root=path.resolve(root);const progress=read(path.join(root,'progress.json')),plan=read(path.join(root,'plan.json'));
 if(!progress.complete||progress.failures.length||progress.completed.length!==plan.counts.batches)throw Error('Preparation is not complete.');
 const parts=[...progress.completed.flatMap(b=>b.parts),...(progress.supplementalPackages||[])],fontCache=new Map(),products=new Set(),originals=new Map(),blanks=new Map(),reusedTargets=new Map();
 let packageBytes=0,productFileBytes=0,expandedNativeBytes=0,expandedNativeFileSizeUpperEstimate=0,maxExpandedProductBytes=0,preparedTargets=0,openTargets=0;
 const rows=[];
 for(const part of parts){
  const packRoot=path.resolve(part.root),pack=read(path.join(packRoot,'manifest.json')),inventory=read(path.join(packRoot,'files-sha256.json')),indexed=new Map(inventory.map(f=>[f.file,f]));
  packageBytes+=inventory.reduce((n,f)=>n+f.bytes,0)+fs.statSync(path.join(packRoot,'files-sha256.json')).size;
  const productSizes=[];
  for(const product of pack.products){
   if(products.has(product.key))throw Error('Duplicate product key');products.add(product.key);
   const filename=path.join(packRoot,product.file),payload=read(filename),docJson=JSON.stringify(payload.document);
   if(hash(docJson)!==product.documentHash)throw Error('Document hash differs: '+product.key);
   const fontSizes=payload.fontRefs.map(name=>{const file=pack.fontFiles[name],entry=indexed.get(file);if(!entry)throw Error('Unindexed font');let cached=fontCache.get(entry.sha256);if(!cached){const font=read(path.join(packRoot,file));cached={jsonBytes:bytes(font),fileBytes:entry.bytes};fontCache.set(entry.sha256,cached);}return {name,...cached};});
   const native=expandedNativeDocumentBytes(payload.document,fontSizes),fileBytes=indexed.get(product.file).bytes;
   expandedNativeBytes+=native;productFileBytes+=fileBytes;expandedNativeFileSizeUpperEstimate+=fileBytes+fontSizes.reduce((n,f)=>n+f.fileBytes,0);maxExpandedProductBytes=Math.max(maxExpandedProductBytes,native);productSizes.push({key:product.key,expandedNativeBytes:native});
  }
  for(const row of pack.originals){const prior=originals.get(row.id)||{prepared:false,sourcePreview:false};prior.prepared||=row.targets?.some(t=>t.status==='prepared')||row.reusedTargetRefs?.length>0;prior.sourcePreview||=Boolean(row.reviewSourcePreview);originals.set(row.id,prior);preparedTargets+=(row.targets||[]).filter(t=>t.status==='prepared').length;openTargets+=(row.targets||[]).filter(t=>t.status!=='prepared').length;for(const t of row.reusedTargetRefs||[])reusedTargets.set(JSON.stringify([row.id,t.familyId,t.sizeKey,t.productKey]),t);}
  for(const blank of pack.blanks||[])blanks.set(JSON.stringify([blank.materialKey,blank.familyId,blank.key]),blank);
  rows.push({root:packRoot,originalRows:pack.originals.length,products:pack.products.length,blanks:pack.blanks?.length||0,referenceOnly:!pack.originals.length&&!pack.products.length&&!pack.blanks?.length,expandedNativeBytes:productSizes.reduce((n,p)=>n+p.expandedNativeBytes,0)});
 }
 if(originals.size!==plan.counts.originals)throw Error('Original coverage differs from pinned plan.');
 return {schema:'gravuru-prepared-review-set-audit/v1',auditedAt:new Date().toISOString(),deliveryCommit:plan.deliveryCommit,readOnly:true,counts:{batches:progress.completed.length,packages:parts.length,referenceOnlyPackages:rows.filter(r=>r.referenceOnly).length,originals:originals.size,preparedOriginals:[...originals.values()].filter(r=>r.prepared).length,openOriginals:[...originals.values()].filter(r=>!r.prepared).length,sourcePreviewOriginals:[...originals.values()].filter(r=>r.sourcePreview).length,products:products.size,preparedTargets,openTargets,reusedExistingTargets:reusedTargets.size,uniqueBlankTriples:blanks.size,uniqueFontPayloads:fontCache.size},sizes:{packageBytes,productFileBytes,expandedNativeBytes,expandedNativeFileSizeUpperEstimate,maxExpandedProductBytes,formula:'Exact UTF-8 bytes of JSON.stringify(document) after replacing localResources.fonts with the full referenced JSON font objects. File-size upper estimate additionally sums referenced on-disk font bytes per product. No glyph reduction or compression.',notMeasured:['SQLite file growth and WAL','runtime heap/RSS','additional revisions or backups'],scope:'All 219 source batch packages plus central blank supplement, before deduplication against the existing online gallery. Reused existing pilot targets remain in the base gallery and are not new products.'},parts:rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i++)o[args[i].replace(/^--/,'')]=args[++i];const r=auditPreparedReviewSet(o.root);fs.writeFileSync(path.resolve(o.out),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({counts:r.counts,sizes:r.sizes}));}

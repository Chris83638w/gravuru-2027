// Chris, 06.11.2026: add the stainless-steel pilot to the private design gallery.
// Append-only, offline operation. Existing products and review databases are never updated.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readSlatePackage,mergeSlatePackages,privateReviewPath,reviewPackageFile} from './extend-slate-original-review.mjs';
import {validateSlateReviewMapping} from '../ops/plesk/slate-review-runtime.mjs';
import {validatedDesignReviewTargets,designReviewMaterialMatches} from './lib/design-review-targets.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(message);};
export const DEFAULT_DESIGN_IMPORT_BATCH_BYTES=16*1024*1024;

// Serialized hydrated bytes are known before any transaction is built. Native
// validation makes additional copies, so keep this budget deliberately small.
// A single larger native document remains exact and is processed alone.
export function planDesignImportBatches(plan,maxBytes=DEFAULT_DESIGN_IMPORT_BATCH_BYTES){
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1)fail('Positive import batch byte budget required');
  const batches=[];let current=[],bytes=0;
  for(const entry of plan){
    if(!Number.isSafeInteger(entry.bytes)||entry.bytes<1)fail('Invalid hydrated document size');
    if(current.length&&(current.length===100||bytes+entry.bytes>maxBytes)){batches.push(current);current=[];bytes=0;}
    current.push(entry);bytes+=entry.bytes;
  }
  if(current.length)batches.push(current);
  return batches;
}

export async function extendDesignReview({baseRoot,addonRoot,data,galleryOut,maxBatchBytes=DEFAULT_DESIGN_IMPORT_BATCH_BYTES,onProgress=()=>{}}){
  planDesignImportBatches([],maxBatchBytes);
  if(typeof onProgress!=='function')fail('Synchronous import progress callback required');
  const base=readSlatePackage(baseRoot),addon=readSlatePackage(addonRoot);
  if(addon.pack.schema!=='gravuru-design-original-review/v1')fail('Versioned material review package required');
  data=privateReviewPath(data);
  const mappingFile=reviewPackageFile(data,'local-review-import.json');
  for(const name of ['workshop.sqlite','design-assets.sqlite','profiles.sqlite','review-comments.sqlite']){
    if(!fs.statSync(reviewPackageFile(data,name)).isFile())fail('Existing review database required: '+name);
  }
  const mappingBytes=fs.readFileSync(mappingFile),prior=JSON.parse(mappingBytes);
  validateSlateReviewMapping(base.pack,prior);
  const alreadyIncluded=base.pack.sourcePackages?.some(source=>source.manifestSha256===addon.hash);
  if(alreadyIncluded){
    const sourceIndex=read(reviewPackageFile(base.root,'source-packages/'+addon.hash+'/files-sha256.json'));
    const canonical=rows=>rows.map(({file,bytes,sha256})=>({file,bytes,sha256})).sort((a,b)=>a.file.localeCompare(b.file));
    assert.deepEqual(canonical(addon.checksums),canonical(sourceIndex),'Repeated package resources differ from the recorded delivery');
    // The immutable imported baseline is compared, never the user's edited head.
    for(const product of addon.pack.products){
      const baseline=base.pack.products.find(row=>row.key===product.key),mapped=prior.products.find(row=>row.key===product.key);
      if(!baseline||!mapped||baseline.documentHash!==product.documentHash||mapped.documentHash!==product.documentHash)fail('Repeated package conflicts with the recorded import');
      assert.deepEqual(baseline.designIds,product.designIds);
    }
    const repository=createProductRepository({filename:reviewPackageFile(data,'workshop.sqlite'),validateDocument:validateProductDocument});
    try{for(const product of prior.products)repository.head(product.productId);}finally{repository.close();}
    return {localOnly:true,published:false,shopifyWrites:0,alreadyPresent:true,newProducts:0,newOriginals:0,gallery:base.root,counts:base.pack.counts};
  }
  const targets=validatedDesignReviewTargets(addon.pack,{localOnly:true,published:false,shopifyWrites:0,products:addon.pack.products});
  const originals=new Map(addon.pack.originals.map(row=>[row.id,row]));
  const checksums=new Map(addon.checksums.map(row=>[row.file,row]));
  const verifiedJson=relative=>{
    const expected=checksums.get(relative),bytes=fs.readFileSync(reviewPackageFile(addon.root,relative));
    if(!expected||bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)fail('Prepared package resource changed during import');
    return JSON.parse(bytes.toString('utf8'));
  };
  const hydrate=product=>{
    const {document,fontRefs}=verifiedJson(product.file);
    if(sha(JSON.stringify(document))!==product.documentHash)fail('Extension document checksum mismatch');
    document.config.localResources.fonts=Object.fromEntries(fontRefs.map(name=>[name,verifiedJson(addon.pack.fontFiles[name])]));
    const serialized=JSON.stringify(document);
    return {document,fingerprint:sha(serialized),bytes:Buffer.byteLength(serialized)};
  };
  const journalKeys=new Set();
  // Full native prevalidation is streaming: retain only small immutable plans,
  // not every group's glyphs, images and hydrated document simultaneously.
  const plan=addon.pack.products.map(product=>{
    const {document,fingerprint,bytes}=hydrate(product);
    const expected=targets.filter(target=>target.productKey===product.key);
    if(expected.length!==product.designIds.length)fail('Every original requires one explicit native target');
    assert.deepEqual(document.config.profile.designs.map(d=>d.id).sort(),expected.map(t=>t.designId).sort());
    for(const target of expected){
      const original=originals.get(target.originalId),design=document.config.profile.designs.find(d=>d.id===target.designId);
      if(document.config.reviewOnly!==true||!designReviewMaterialMatches(document.config.profile.material,target.material)||design.katalog?.designId!==original.id||design.katalog?.target?.released!==false||target.familyId&&design.katalog?.target?.familyId!==target.familyId)fail('Invalid material, source identity, family or release state');
      const geometry=document.config.profile.geometry;
      if(geometry.width!==target.mm[0]||geometry.height!==target.mm[1])fail('Target dimensions differ from the native product');
    }
    assert.deepEqual(validateProductDocument(document),document,'Prepared document must already be in its canonical native form');
    const key='design-review-extension:'+fingerprint;
    if(journalKeys.has(key))fail('Duplicate native import journal identity');journalKeys.add(key);
    return {product,key,fingerprint,bytes};
  });
  const batches=planDesignImportBatches(plan,maxBatchBytes);
  const hydratePlanned=entry=>{
    const loaded=hydrate(entry.product);
    if(loaded.fingerprint!==entry.fingerprint||loaded.bytes!==entry.bytes)fail('Hydrated document changed after prevalidation');
    return loaded.document;
  };
  onProgress({phase:'prevalidated',products:plan.length,batches:batches.length,maxBatchBytes});
  const lockFile=data+'.design-extension.lock';let lock,repo,assets,temp;
  try{
    lock=fs.openSync(lockFile,'wx',0o600);fs.writeSync(lock,'Offline private gallery extension\n');
    if(!fs.readFileSync(mappingFile).equals(mappingBytes))fail('Review mapping changed concurrently; inspect before retrying');
    // Checks all ID/path/font/asset collisions before any database writes.
    const merged=mergeSlatePackages({baseRoot,addonRoot,out:galleryOut,materialExtension:true});
    assets=createDesignAssetStore({filename:reviewPackageFile(data,'design-assets.sqlite')});
    repo=createProductRepository({filename:reviewPackageFile(data,'workshop.sqlite'),validateDocument:validateProductDocument});
    for(const product of prior.products)repo.head(product.productId);
    for(const asset of addon.pack.assets){
      let existing;try{existing=assets.get(asset.id);}catch(error){if(error.status!==404)throw error;}
      if(!existing){const imported=await assets.import({name:'Original.svg',bytes:fs.readFileSync(reviewPackageFile(addon.root,asset.source)).toString('base64')});assert.equal(imported.assetId,asset.id);}
      assert.equal(sha(assets.read(asset.id,true)),asset.metadata.sourceSha256);assert.equal(sha(assets.read(asset.id)),asset.metadata.previewSha256);
    }
    // Check every resource and every partial retry before writing any native
    // product. These checks also retain only one hydrated document at a time.
    const mappedIds=new Set(prior.products.map(row=>row.productId));
    for(const entry of plan){
      const document=hydratePlanned(entry);
      assets.validateDocument(document);
      const earlier=repo.importItem(entry.key);
      if(earlier){
        if(mappedIds.has(earlier.id))fail('Extension journal points at an existing mapped product');
        assert.equal(earlier.fingerprint,entry.fingerprint);
        assert.deepEqual(repo.get(earlier.id).document,document,'Unmapped earlier import was edited; inspect before retrying');
      }
    }
    // Larger deliveries consist only of new product groups. Each native batch
    // is atomic; its journal allows a checked retry after interruption. Publish
    // the combined mapping only after every batch and readback succeeded.
    const added=[];
    for(const [index,batch] of batches.entries()){
      const entries=batch.map(entry=>({key:entry.key,fingerprint:entry.fingerprint,document:hydratePlanned(entry)}));
      const saved=repo.importBatch(entries);
      for(const [position,item] of saved.entries()){
        const readback=repo.get(item.id);assert.deepEqual(readback.document,entries[position].document);assets.validateDocument(readback.document);
        added.push({...batch[position].product,productId:item.id,revision:readback.revision,created:item.created});
      }
      // Observers may stop between completed transactions. The mapping is still
      // unpublished; a retry verifies/reuses the exact journaled product IDs.
      onProgress({phase:'batch-committed',batch:index+1,batches:batches.length,products:batch.length,hydratedBytes:batch.reduce((sum,entry)=>sum+entry.bytes,0)});
    }
    const result={...prior,products:[...prior.products,...added]};
    validateSlateReviewMapping(read(path.join(merged.out,'manifest.json')),result);
    temp=mappingFile+'.'+randomUUID()+'.tmp';
    const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(result,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    if(!fs.readFileSync(mappingFile).equals(mappingBytes))fail('Review mapping changed concurrently; inspect before retrying');
    fs.renameSync(temp,mappingFile);temp=null;
    const priorIds=new Set(base.pack.originals.map(row=>row.id));
    return {localOnly:true,published:false,shopifyWrites:0,alreadyPresent:false,oldProducts:prior.products.length,newProducts:added.length,newOriginals:addon.pack.originals.filter(row=>!priorIds.has(row.id)).length,
      extendedOriginals:addon.pack.originals.filter(row=>priorIds.has(row.id)).length,importBatches:batches.length,maxBatchBytes,gallery:merged.out,counts:merged.counts};
  }finally{
    repo?.close();assets?.close();
    if(temp&&fs.existsSync(temp))fs.unlinkSync(temp);
    if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(lockFile);}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
  for(const key of ['--base','--addon','--data','--gallery-out'])if(!args.includes(key)||!value(key))fail(key+' required');
  console.log(JSON.stringify(await extendDesignReview({baseRoot:value('--base'),addonRoot:value('--addon'),data:value('--data'),galleryOut:value('--gallery-out')})));
}

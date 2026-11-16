// Offline draft review only. No remote import route, credentials or Shopify call.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of ['--package','--out'])if(!args.includes(k))throw Error(k+' required');
const root=path.resolve(arg('--package')),out=path.resolve(arg('--out'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const file=relative=>{const p=path.resolve(root,relative);if(!p.startsWith(root+path.sep))throw Error('Invalid package path');return p;};
const pack=read(file('manifest.json'));
if(pack.schema!=='gravuru-slate-original-review/v1'||pack.reviewOnly!==true||pack.released!==false)throw Error('Expected an unreleased local review package');
for(const f of read(file('files-sha256.json')))if(sha(fs.readFileSync(file(f.file)))!==f.sha256)throw Error('Package checksum mismatch: '+f.file);
const assets=createDesignAssetStore({filename:path.join(out,'design-assets.sqlite')}),repo=createProductRepository({filename:path.join(out,'workshop.sqlite'),validateDocument:validateProductDocument});
try{
 const mapped=new Map();
 for(const a of pack.assets){
  let existing;try{existing=assets.get(a.id);}catch(e){if(e.status!==404)throw e;}
  if(existing){assert.equal(sha(assets.read(a.id,true)),a.metadata.sourceSha256);assert.equal(sha(assets.read(a.id)),a.metadata.previewSha256);mapped.set(a.id,a.id);continue;}
  const imported=await assets.import({name:'Original.svg',bytes:fs.readFileSync(file(a.source)).toString('base64')});mapped.set(a.id,imported.assetId);
 }
 const products=[];
 for(const p of pack.products){
  const {document:d,fontRefs}=read(file(p.file));
  if(sha(JSON.stringify(d))!==p.documentHash)throw Error('Document checksum mismatch');
  d.config.localResources.fonts=Object.fromEntries(fontRefs.map(n=>[n,read(file(pack.fontFiles[n]))]));
  for(const e of d.config.localResources.photoExamples||[])e.assetId=mapped.get(e.assetId)||e.assetId;
  for(const design of d.config.profile.designs){if(design.katalog?.target?.released!==false)throw Error('Unexpected released design');for(const o of design.objects)if(o.photoMaskAssetId)o.photoMaskAssetId=mapped.get(o.photoMaskAssetId)||o.photoMaskAssetId;}
  validateProductDocument(d);assets.validateDocument(d);
  const fingerprint=sha(JSON.stringify(d)),[saved]=repo.importBatch([{key:'slate-original-review:'+fingerprint,fingerprint,document:d}]);
  const readback=repo.get(saved.id);assert.deepEqual(readback.document.config,d.config);assets.validateDocument(readback.document);
  products.push({...p,productId:saved.id,revision:readback.revision,created:saved.created});
 }
 const result={localOnly:true,shopifyWrites:0,published:false,products};
 fs.writeFileSync(path.join(out,'local-review-import.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({products:products.length,created:products.filter(p=>p.created).length,assets:mapped.size,localOnly:true}));
}finally{assets.close();repo.close();}

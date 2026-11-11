// Bounded synthetic cold/write and separate readonly reopen; no source data or network.
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,mode,countArg='100000',phase,filename]=process.argv.slice(2),count=Number(countArg);
if(!['cold','reopen'].includes(phase)||!filename||!filename.endsWith('.synthetic.sqlite'))throw Error('Explicit synthetic DB and cold|reopen required');
if(!root||!['old','new'].includes(mode))throw Error('root and old|new required');
if(!Number.isSafeInteger(count)||count<1||count>250000)throw Error('Bounded synthetic card count required');
const file=mode==='old'?'app/workshop/test-fixtures/gallery-snapshot-v3-reference.mjs':'app/workshop/shop-gallery-snapshot.mjs';
const {gallerySnapshotCodec}=await import(pathToFileURL(path.join(root,file)));
const {createShopGalleryCache}=await import(pathToFileURL(path.join(root,'app/workshop/shop-gallery-cache.mjs')));
const context={store:{storeId:'acryl',workshop:{tenantId:'gravuru'}},binding:{shopDomain:'synthetic.myshopify.com'}};
if(phase==='reopen'){
 const before=process.memoryUsage(),started=performance.now(),db=new DatabaseSync(filename,{readOnly:true});
 const saved=createShopGalleryCache({database:db,tenantId:'gravuru',storeId:'acryl',shopDomain:context.binding.shopDomain,readOnly:true}).read('revision');
 const afterRead=process.memoryUsage(),restored=gallerySnapshotCodec('synthetic-memory-secret').decode(context,'revision',saved);
 if(!restored)throw Error('Synthetic reopen rejected');
 const decodeMs=performance.now()-started,afterDecode=process.memoryUsage(),decodeMaxRssMiB=process.resourceUsage().maxRSS/1024;
 // Stream a logical hash, never recreate a full v3 JSON string to verify v4.
 const digest=createHash('sha256');let cards=0;
 for(const [key,rows] of restored.scopes){digest.update(JSON.stringify(key)+'\n');for(const row of rows){digest.update(JSON.stringify(row)+'\n');cards++;}}
 for(const pair of restored.sources)digest.update(JSON.stringify(pair)+'\n');
 if(cards!==count)throw Error('Synthetic card count differs');db.close();
 console.log(JSON.stringify({mode,phase,cards,bindings:restored.sources.size,payloadBytes:Buffer.byteLength(saved.payload),logicalSHA256:digest.digest('hex'),decodeMs:+decodeMs.toFixed(2),before,afterRead,afterDecode,decodeMaxRssMiB,maxRssMiB:process.resourceUsage().maxRSS/1024}));process.exit(0);
}
if(fs.existsSync(filename))throw Error('Refusing to overwrite synthetic file');
const rows=[],sources=new Map(),scope={key:'line:synthetic',lineId:'synthetic',familyId:'synthetic'},processKey='["steel",null,"engraving"]';
let binding;
for(let i=0;i<count;i++){
 if(i%12===0){const b=i/12;binding={storeId:'acryl',tenantId:'gravuru',shopDomain:'synthetic.myshopify.com',shopifyProductId:'gid://shopify/Product/'+(b+1),shopifyVariantId:'gid://shopify/ProductVariant/'+(100000+b),productId:'cfg_'+b,productRevision:3,bindingId:'binding_'+b,assignmentRevision:1,options:{mounting:'K00',size:'120x80'},unitCents:1999};sources.set(binding.bindingId,{scope,process:processKey,theme:'family'});}
 const designId='template-'+i;
 rows.push({binding,scope,process:processKey,design:{katalog:{}},availability:{universal:{doorbell:{}}},designId,dedupe:JSON.stringify([binding.productId,designId,120,80,'rect']),search:{text:('haus familie motiv original '+i+' ').repeat(5),number:String(i),rank:i%3,unnamedMotifs:0},card:{productId:binding.productId,productRevision:3,designId,productName:'Synthetic door sign',designName:'Synthetic design '+i,themes:['family'],widthMm:120,heightMm:80,shape:'rect',unitCents:1999,currency:'EUR',shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId}});
}
const snapshot={scopes:new Map([[scope.key,rows]]),sources};
// Both fresh processes use the same pre-encode cleanup; never force GC during encoding.
global.gc?.();const before=process.memoryUsage(),started=performance.now();
const encoded=gallerySnapshotCodec('synthetic-memory-secret').encode(context,'revision',snapshot);
const encodeMs=performance.now()-started,afterEncode=process.memoryUsage(),encodeMaxRssMiB=process.resourceUsage().maxRSS/1024;
const db=new DatabaseSync(filename);
try{const cache=createShopGalleryCache({database:db,tenantId:'gravuru',storeId:'acryl',shopDomain:context.binding.shopDomain});cache.write('revision',encoded);}finally{db.close();}
console.log(JSON.stringify({mode,phase,cards:rows.length,bindings:sources.size,payloadBytes:Buffer.byteLength(encoded.payload),payloadSHA256:createHash('sha256').update(encoded.payload).digest('hex'),mac:encoded.mac,encodeMs:+encodeMs.toFixed(2),before,afterEncode,encodeMaxRssMiB,afterWrite:process.memoryUsage(),maxRssMiB:process.resourceUsage().maxRSS/1024}));

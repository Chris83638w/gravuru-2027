// Local integration proof: preserve an existing 48-product store, import the
// approved monogram pilot, and repeat without new IDs/revisions/resources.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync,backup} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {readStoredDocumentText} from '../app/workshop/product-document-resources.mjs';
import {importBundle,digest} from './slate-group-import.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of ['--source','--target','--bundle','--out'])assert(args.includes(k),k+' required');
const source=fs.realpathSync(arg('--source')),target=path.resolve(arg('--target'));
assert(!fs.existsSync(target),'Proof requires a new local target; no existing store may be replaced.');
fs.mkdirSync(target,{recursive:true});
for(const file of ['workshop.sqlite','design-assets.sqlite']){
 const db=new DatabaseSync(path.join(source,file),{readOnly:true});
 try{await backup(db,path.join(target,file));}finally{db.close();}
}
function products(){const db=new DatabaseSync(path.join(target,'workshop.sqlite'),{readOnly:true});try{return db.prepare('SELECT p.id,p.revision,p.tenant_id,r.document FROM products p JOIN product_revisions r ON p.id=r.product_id AND p.tenant_id=r.tenant_id AND p.revision=r.revision ORDER BY p.id').all().map(r=>({id:r.id,revision:r.revision,hash:digest(readStoredDocumentText(db,r.document,{tenantId:r.tenant_id}))}));}finally{db.close();}}
const before=products();assert.equal(before.length,48);
const bundle=JSON.parse(gunzipSync(fs.readFileSync(arg('--bundle'))));
assert.deepEqual(bundle.products.map(p=>p.sourceDesignId),['MG-S-22x14-D1']);
const runtime=path.resolve('.');
const planned=await importBundle(bundle,target,{runtime});
const first=await importBundle(bundle,target,{runtime,apply:true});
const after=products();assert.equal(after.length,before.length+1);
assert.deepEqual(after.filter(p=>before.some(b=>b.id===p.id)),before);
const repeated=await importBundle(bundle,target,{runtime,apply:true});
assert.deepEqual(products(),after);
assert(repeated.products.every(p=>p.action==='unchanged'));
assert(Object.values(repeated.assetAdditions).every(n=>n===0));
const report={schema:'gravuru-slate-import-integration-proof/v1',localOnly:true,existingProducts:48,
 existingUnchanged:48,created:1,variants:bundle.products[0].variants.length,
 galleryDesigns:bundle.products[0].designIds.length,sourceDesignId:'MG-S-22x14-D1',
 planned,first,repeated,shopifyWrites:0,activeStoreWrites:0};
fs.writeFileSync(arg('--out'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({existingUnchanged:48,created:1,variants:report.variants,galleryDesigns:report.galleryDesigns,repeatedCreates:0,shopifyWrites:0,activeStoreWrites:0}));

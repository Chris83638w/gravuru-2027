import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {prepareShopProduct} from './shop-preparation.mjs';
import {createGalleryShopSync} from './gallery-shop-sync.mjs';
import {createGallerySyncShopifyTransport} from './gallery-shop-sync-transport.mjs';
import {syncHash,nativeSource,ensureNativeAssets,composeNativeTarget} from './gallery-shop-sync-native.mjs';
import {galleryTestPng,galleryEditorDocument} from '../../scripts/fixtures/gallery-editor.mjs';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from './gallery-shop-sync-test-fixture.mjs';
async function fixture(t,options={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-sync-'));
 const f=await createGallerySyncTestFixture({directory:dir,transportOptions:options.transport,serviceOptions:options.service});
 t.after(()=>{f.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'gallery-sync-')));fs.rmSync(dir,{recursive:true,force:true});});
 return f;
}
const execute=(f,p)=>f.service.execute({planId:p.planId,planSha256:p.planSha256});
const result=r=>r.operations[0];
function syntheticPaidOrder(f){
 const store=f.targetWorkshop.customerDrafts,orders=f.targetWorkshop.orderIntake,v=f.variants[0],draft=store.create(f.target,f.mapping.target.designId,{synthetic:true});
 const bytes=Buffer.from('isolated historical customer archive'),manifest={schema:'gravuru-native-review/v1',id:'proof_'+randomUUID(),createdAt:new Date().toISOString(),source:{draftId:draft.id,draftRevision:1,designId:draft.designId},product:{id:f.target.id,revision:1,basePriceCents:v.priceCents,currency:'EUR'},selection:{options:v.options,price:{unitCents:v.priceCents,quantity:1}},packageSha256:createHash('sha256').update(bytes).digest('hex'),blockers:[],warnings:[],photos:[]};
 store.capture(draft.id,draft.token,1,{manifest,preview:Buffer.from('<svg/>'),contourPdf:bytes,package:bytes,photos:bytes});
 const binding=f.registry.resolve({shopifyProductId:PRODUCT,shopifyVariantId:v.id}),offer=orders.offer({bindingId:binding.bindingId,snapshotId:manifest.id,quantity:1});
 const payload={id:168500,test:false,financial_status:'paid',currency:'EUR',line_items:[{id:168501,product_id:168001,variant_id:Number(v.id.split('/').at(-1)),quantity:1,price:(v.priceCents/100).toFixed(2),properties:[offer.property]}]},raw=Buffer.from(JSON.stringify(payload)),secret='isolated-synthetic-secret-only';
 const paid=orders.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'synthetic-gallery-sync-paid'}, {shopDomain,secret,apiVersion:'2026-07',mode:'catalog-live-approved'});
 assert.equal(paid.lines.length,1,JSON.stringify(paid));return {line:paid.lines[0],manifest,bytes};
}

test('real repositories + binding registry: native edit, explicit media, revision switch; immutable historical contracts and commercial values',async t=>{
 const f=await fixture(t),paid=syntheticPaidOrder(f),oldBindings=f.targetWorkshop.orderIntake.bindings(),before=structuredClone(f.target),oldApproval=f.targetWorkshop.orderIntake.catalogLiveApproval({shopDomain,shopifyProductId:PRODUCT,shopifyVariantId:f.variants[0].id,productId:f.target.id,productRevision:1});
 const p=await f.service.plan({targetIds:[f.mapping.id]});assert.equal(p.ready,true,JSON.stringify(p.entries[0].issues));assert.match(p.entries[0].beforeSvg,/<svg/);assert.notEqual(p.entries[0].beforeSvg,p.entries[0].afterSvg);
 assert.deepEqual(f.targetWorkshop.repository.get(f.target.id),before,'preview creates no target revision');
 assert.equal(result(await execute(f,p)).state,'completed');
 const after=f.targetWorkshop.repository.get(f.target.id);assert.equal(after.revision,2);assert.equal(after.publishedRevision,before.publishedRevision);
 assert.equal(after.document.config.profile.designs[0].objects[0].text,'Neu aus Galerie');
 const a=prepareShopProduct(after),b=prepareShopProduct(before);for(const field of ['variants','seo','extras','title'])assert.deepEqual(a[field],b[field],field);
 assert.deepEqual(f.targetWorkshop.repository.get(f.target.id,{revision:1}),before);
 assert.deepEqual(f.targetWorkshop.orderIntake.bindings().filter(x=>oldBindings.some(b=>b.id===x.id)),oldBindings);
 assert.deepEqual(f.targetWorkshop.orderIntake.catalogLiveApproval({shopDomain,shopifyProductId:PRODUCT,shopifyVariantId:f.variants[0].id,productId:f.target.id,productRevision:1}),oldApproval);
 assert.equal(f.activation.capture(f.mapping).boundRevision,2);assert.equal(f.activation.capture(f.mapping).approved,true);
 assert.equal(f.transport.writes.length,1);assert.equal(result(await execute(f,p)).state,'completed');assert.equal(f.transport.writes.length,1);
 // A process can stop after the durable completion record, before lock cleanup.
 const completed=f.service.status().operations[0];for(const key of ['config:'+f.target.id,PRODUCT])f.journal.prepare('INSERT INTO gallery_shop_sync_target_owners(scope,target_key,operation_id) VALUES(?,?,?)').run('gravuru|'+shopDomain,key,completed.id);
 const unchanged=await f.service.plan({targetIds:[f.mapping.id]});assert.equal(unchanged.ready,true,JSON.stringify(unchanged.entries[0].issues));assert.equal(result(await execute(f,unchanged)).state,'completed');assert.equal(f.transport.writes.length,1);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,2);
 assert.deepEqual(f.targetWorkshop.orderIntake.get(paid.line.id),paid.line);assert.deepEqual(f.targetWorkshop.customerDrafts.review(paid.manifest.id).manifest,paid.manifest);assert.deepEqual(f.targetWorkshop.customerDrafts.downloadSnapshot(paid.manifest.id,'package'),paid.bytes);
 assert.throws(()=>f.journal.exec("UPDATE gallery_shop_sync_plans SET sha='tampered'"),/immutable/);
});

test('photo and mask transfer between separate native asset stores retains originals, edit recipe, crop and rendering',async t=>{
 const f=await fixture(t),source=f.sourceWorkshop,target=f.targetWorkshop,document=galleryEditorDocument();
 const mask=await source.assets.import({name:'Maske.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="60mm" viewBox="0 0 40 60"><ellipse cx="20" cy="30" rx="20" ry="30" fill="white"/></svg>').toString('base64')});
 const photo={original:galleryTestPng,processed:galleryTestPng,editSource:galleryTestPng,widthMm:40,heightMm:60,edited:true,color:'original',editSourceColor:'original',photoEdit:{angle:90,flip:-1,zoom:1.2,x:.2,y:-.3,shape:'heart',color:'original'},crop:{zoom:1.3,x:.1,y:.2,angle:7},photoShape:'template',photoMaskAssetId:mask.assetId};
 const media=await source.assets.galleryPhotos.import(photo),slot={id:'photo',type:'photoSlot',fieldKey:'photo-main',required:false,x:60,y:75,w:40,h:60,rotation:12,photoShape:'template',photoMaskAssetId:mask.assetId,customerEditable:true,templateOrigin:true};
 document.config.profile.designs[0].objects.push(slot);document.elementRights['source-a'].photo={content:false,color:false,replace:true,move:true,scale:true,delete:true};
 document.config.localResources.photoExamples=[{designId:'source-a',slotId:'photo',assetId:media.assetId}];
 const sourceRecord=source.repository.create(document),identity={productId:sourceRecord.id,designId:'source-a',originalId:'TRE-V2A-8x3,5-D1'},native=nativeSource(source,identity);
 assert.throws(()=>target.assets.get(mask.assetId),e=>e.status===404);await ensureNativeAssets(source,target,native);
 for(const part of ['original','processed','editSource'])assert.deepEqual(target.assets.galleryPhotos.read(media.assetId,part),source.assets.galleryPhotos.read(media.assetId,part));
 assert.deepEqual(target.assets.galleryPhotos.metadata(media.assetId),source.assets.galleryPhotos.metadata(media.assetId));assert.deepEqual(target.assets.read(mask.assetId),source.assets.read(mask.assetId));
 const targetRecord=target.repository.create(document),updated=structuredClone(document);updated.config.profile.designs[0].objects.find(o=>o.id==='photo').x+=5;
 source.repository.save(sourceRecord.id,updated,1);const changed=nativeSource(source,identity),proposed=composeNativeTarget(changed,targetRecord,{designId:'source-a'});
 assert.equal(proposed.config.profile.designs[0].objects.find(o=>o.id==='photo').x,65);
 assert.equal(target.editorPreview(proposed,'source-a').svg,source.editorPreview(updated,'source-a').svg);
 assert.deepEqual(proposed.config.localResources.photoExamples,updated.config.localResources.photoExamples);
});

test('approval failure rolls real bindings back atomically on createWorkshop connection',async t=>{
 const f=await fixture(t),p=await f.service.plan({targetIds:[f.mapping.id]}),old=f.activation.capture(f.mapping),approve=f.targetWorkshop.orderIntake.approveCatalogLiveProducts;
 f.targetWorkshop.orderIntake.approveCatalogLiveProducts=()=>{throw Error('synthetic late approval failure');};
 assert.equal(result(await execute(f,p)).state,'conflict');assert.deepEqual(f.activation.capture(f.mapping),old);assert.equal(f.registry.history({shopifyProductId:PRODUCT,shopifyVariantId:f.variants[0].id}).length,1);
 f.targetWorkshop.orderIntake.approveCatalogLiveProducts=approve;assert.equal(result(await execute(f,p)).state,'completed');assert.equal(f.transport.writes.length,1);
});

test('parallel shop edit after planning never switches the local binding',async t=>{
 const f=await fixture(t),p=await f.service.plan({targetIds:[f.mapping.id]});f.transport.changeForTest(PRODUCT,p=>p.commerce.seo.title='Shop parallel');
 const r=result(await execute(f,p));assert.equal(r.error.code,'gallery_sync_remote_commerce_changed');assert.equal(f.activation.capture(f.mapping).boundRevision,1);assert.equal(f.transport.writes.length,0);
});

test('original IDs on both rendered target and format-bank must match; matching dimensions never imply identity',async t=>{
 const f=await fixture(t),source=nativeSource(f.sourceWorkshop,f.mapping.source),before=structuredClone(f.target);
 for(const mutate of [d=>d.config.profile.designs[0].katalog.designId='OTHER-ORIGINAL',d=>d.config.familyFormats.designs[0].katalog.designId='OTHER-ORIGINAL']){
  const wrong=structuredClone(f.target);mutate(wrong.document);assert.throws(()=>composeNativeTarget(source,wrong,f.mapping.target),e=>e.code==='gallery_sync_original_identity');
 }
 const wrongSize=structuredClone(f.target);wrongSize.document.config.profile.geometry.width+=1;assert.throws(()=>composeNativeTarget(source,wrongSize,f.mapping.target),e=>e.code==='gallery_sync_geometry');
 const wrongMaterial=structuredClone(f.target);wrongMaterial.document.config.profile.material.kind='slate';assert.throws(()=>composeNativeTarget(source,wrongMaterial,f.mapping.target),e=>e.code==='gallery_sync_material');
 const wrongDefault=structuredClone(f.target);wrongDefault.document.config.profile.defaultDesignId='other-start-design';assert.throws(()=>composeNativeTarget(source,wrongDefault,f.mapping.target),e=>e.code==='gallery_sync_start_design');
 const wrongCut=structuredClone(f.target);wrongCut.document.config.familyFormats.source.shopProduct.defaultDesignId='OTHER-ORIGINAL';assert.throws(()=>composeNativeTarget(source,wrongCut,f.mapping.target),e=>e.code==='gallery_sync_start_design');
 assert.deepEqual(f.targetWorkshop.repository.get(f.target.id),before);assert.equal(f.transport.writes.length,0);
});

test('defaults are disabled; source approval, exact geometry and missing image link are explicit blockers',async t=>{
 const f=await fixture(t),s=createGalleryShopSync({...f.args,executionEnabled:false}),p=await s.plan({targetIds:[f.mapping.id]});
 await assert.rejects(()=>s.execute({planId:p.planId,planSha256:p.planSha256}),e=>e.code==='gallery_sync_disabled');
 const unapproved=createGalleryShopSync({...f.args,sourceApproval:()=>({approved:false,reason:'Sichtprüfung fehlt'})});assert.equal((await unapproved.plan({targetIds:[f.mapping.id]})).ready,false);
 const missing=createGalleryShopSync({...f.args,targets:[{...f.mapping,media:[]}]});assert.equal((await missing.plan({targetIds:[f.mapping.id]})).entries[0].issues[0].code,'gallery_sync_media_mapping');
 const mediaDisabled=createGalleryShopSync({...f.args,transport:{...f.transport,canWriteImages:false}});assert.equal((await mediaDisabled.plan({targetIds:[f.mapping.id]})).entries[0].issues[0].code,'gallery_sync_media_disabled');
 assert.equal(f.transport.writes.length,0);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);
});

test('source, target, mapping and remote conflicts do not overwrite a concurrent edit',async t=>{
 const f=await fixture(t),p=await f.service.plan({targetIds:[f.mapping.id]});
 const doc=structuredClone(f.source.document);doc.name='Parallel';f.sourceWorkshop.repository.save(f.source.id,doc,1);
 const r=result(await execute(f,p));assert.equal(r.error.code,'gallery_sync_source_changed');assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);assert.equal(f.transport.writes.length,0);
 const fresh=await f.service.plan({targetIds:[f.mapping.id]});const targetDoc=structuredClone(f.target.document);targetDoc.seo.title='Parallel im Ziel';f.targetWorkshop.repository.save(f.target.id,targetDoc,1);
 assert.equal(result(await execute(f,fresh)).error.code,'gallery_sync_target_changed');assert.equal(f.transport.writes.length,0);
});

test('after a saved draft, restart resumes the exact revision without appending again',async t=>{
 let broken=true;const f=await fixture(t,{service:{checkpoint(event){if(event==='after-draft'&&broken){broken=false;throw Error('simulated process loss');}}}}),p=await f.service.plan({targetIds:[f.mapping.id]});
 assert.equal(result(await execute(f,p)).state,'conflict');assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,2);assert.equal(f.activation.capture(f.mapping).boundRevision,1);
 const restarted=createGalleryShopSync({...f.args,checkpoint:()=>{}}),reopened=restarted.openPlan({planId:p.planId});assert.deepEqual(reopened,p);
 assert.throws(()=>restarted.openPlan({planId:'unknown'}),e=>e.status===404);
 const r=await restarted.execute({planId:reopened.planId,planSha256:reopened.planSha256});assert.equal(result(r).state,'completed');assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,2);assert.equal(f.transport.writes.length,1);
});

test('lost Shopify reply is read back and never retried; binding remains old until verified',async t=>{
 const f=await fixture(t,{transport:{afterWrite(){throw Error('lost reply after committed write');}}}),p=await f.service.plan({targetIds:[f.mapping.id]});
 const first=result(await execute(f,p));assert.equal(first.state,'reconciliation-needed');assert.equal(f.activation.capture(f.mapping).boundRevision,1);
 const reconciled=result(await f.service.reconcile({operationId:first.id}));assert.equal(reconciled.state,'completed');assert.equal(f.transport.writes.length,1);assert.equal(f.activation.capture(f.mapping).boundRevision,2);
});

test('uncertain outbound request that still reads old is not automatically repeated',async t=>{
 const f=await fixture(t,{transport:{beforeWrite(){throw Error('transport interrupted');}}}),p=await f.service.plan({targetIds:[f.mapping.id]});
 const first=result(await execute(f,p));assert.equal(first.state,'reconciliation-needed');const second=result(await execute(f,p));assert.equal(second.state,'reconciliation-needed');assert.equal(second.error.code,'gallery_sync_remote_unknown');assert.equal(f.activation.capture(f.mapping).boundRevision,1);assert.equal(f.transport.writes.length,0);
});

test('two identical pre-created plans cannot send concurrently; unknown writes retain target ownership beyond leases',async t=>{
 let started,release;const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 const f=await fixture(t,{transport:{async beforeWrite(){started();await gate;throw Error('uncertain interrupted response');}}}),a=await f.service.plan({targetIds:[f.mapping.id]}),b=await f.service.plan({targetIds:[f.mapping.id]});
 const first=execute(f,a);await entered;
 assert.equal(result(await execute(f,b)).error.code,'gallery_sync_target_busy');assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,2);
 release();const failed=result(await first);assert.equal(failed.state,'reconciliation-needed');
 const future=createGalleryShopSync({...f.args,clock:()=>Date.now()+86400000});
 assert.equal(result(await future.execute({planId:b.planId,planSha256:b.planSha256})).error.code,'gallery_sync_target_busy');
 assert.equal(f.transport.writes.length,0);assert.equal(f.activation.capture(f.mapping).boundRevision,1);
 // The original operation is the sole owner allowed to inspect its unknown result.
 assert.equal(result(await future.reconcile({operationId:failed.id})).state,'reconciliation-needed');
});

test('failure after atomic activation recovers without duplicate assignments or approval changes',async t=>{
 let broken=true;const f=await fixture(t,{service:{checkpoint(event){if(event==='after-activation'&&broken){broken=false;throw Error('journal interruption');}}}}),p=await f.service.plan({targetIds:[f.mapping.id]});
 const first=result(await execute(f,p));assert.equal(first.state,'conflict');assert.equal(f.activation.capture(f.mapping).boundRevision,2);
 const count=f.targetWorkshop.orderIntake.bindings().length;assert.equal(result(await execute(f,p)).state,'completed');assert.equal(f.targetWorkshop.orderIntake.bindings().length,count);assert.equal(f.transport.writes.length,1);
});

test('shop transport never writes by default and emits only compare-and-set release metadata',async()=>{
 let requests=[];const product={id:PRODUCT,title:'t',handle:'t',status:'ACTIVE',descriptionHtml:'',seo:{title:'t',description:''},options:[],variants:{nodes:[{id:'gid://shopify/ProductVariant/1',price:'19.99',compareAtPrice:null,sku:'same',selectedOptions:[],inventoryItem:{id:'inventory',tracked:true}}],pageInfo:{hasNextPage:false}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:null};
 const graphql=async(query,variables)=>{requests.push({query,variables});if(query.startsWith('query'))return {data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product}};product.metafield={value:variables.metafields[0].value,compareDigest:'fresh'};return {data:{metafieldsSet:{metafields:[product.metafield],userErrors:[]}}};};
 const disabled=createGallerySyncShopifyTransport({shopDomain,graphql}),mapping={shopifyProductId:PRODUCT},baseline=await disabled.inspect(mapping),desired={release:'{"source":1}',images:[]};
 await assert.rejects(()=>disabled.apply({mapping,baseline,desired}),e=>e.code==='gallery_sync_live_disabled');assert.equal(requests.length,1);
 const enabled=createGallerySyncShopifyTransport({shopDomain,graphql,writesEnabled:true});await enabled.apply({mapping,baseline,desired});
 const writes=requests.filter(x=>x.query.startsWith('mutation'));assert.equal(writes.length,1);assert.deepEqual(writes[0].variables,{metafields:[{ownerId:PRODUCT,namespace:'gravuru',key:'gallery_release',type:'json',value:desired.release,compareDigest:null}]});assert(!writes[0].query.includes('productUpdate'));
});

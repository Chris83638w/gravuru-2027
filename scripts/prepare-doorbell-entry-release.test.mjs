import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDoorbellEntryRelease,parseArgs,SHOP,PUBLICATION,PILOT} from './prepare-doorbell-entry-release.mjs';
function fixture(){
 const catalog=[],products=[];
 for(let model=0;model<42;model++)for(const [i,format] of ['16x28','24x20','35x18'].entries()){
  const index=model*3+i,id=index===0?PILOT:'gid://shopify/Product/'+(1000+index),cfg='cfg_00000000-0000-0000-0000-'+String(index).padStart(12,'0'),handle='model-'+index;
  catalog.push({productId:id,handle,model:'model '+model,format,configProduct:cfg,configRevision:1,variants:120,matchingBindings:120,importMatches:true,defaultMatches:true,variantDeviations:[],documentSha256:'a'.repeat(64),bindingDocumentSha256:'b'.repeat(64)});
  products.push({id,handle,status:'ACTIVE',templateSuffix:'',updatedAt:'2026-10-29T12:00:00Z',publishedOnPublication:i===0,metafield:i===0?null:{id:'gid://shopify/Metafield/'+index,namespace:'custom',key:'customization_id',type:'single_line_text_field',value:cfg,compareDigest:'c'.repeat(64)}});
 }
 return {catalog,snapshot:{schema:'doorbell-entry-snapshot/v1',readAt:'2026-10-29T12:00:00Z',shopDomain:SHOP,publicationId:PUBLICATION,publication:{id:PUBLICATION,catalog:{title:'Channel for Online Store'}},products},theme:{schema:'doorbell-entry-theme/v1',theme:{role:'MAIN',id:'theme',files:{nodes:[{filename:'layout/theme.liquid',includesFooterGroup:true},{filename:'sections/footer-group.json',sectionInOrder:true,section:{settings:{custom_liquid:'product.metafields.custom.customization_id.value != blank id="gravuru-konfi" /apps/konfigurator/shop-embed.mjs'}}}]}},templates:[{file:'templates/product.json',blocks:[{type:'buy_buttons',activeInOrder:true,disabled:false}]}]}};
}
test('complete plan preserves 126 products, stages one pilot, then 2 + 82 publications',()=>{
 const input=fixture(),before=structuredClone(input),plan=prepareDoorbellEntryRelease(input);assert.deepEqual(input,before);
 assert.deepEqual(plan.counts,{models:42,products:126,variantsPreserved:15120,createMarkers:42,keepMarkers:84,publish:84,keepPublished:42});
 assert.deepEqual(plan.stages.map(s=>s.publishRequests.length),[0,2,82]);assert.deepEqual(plan.stages.map(s=>s.markerRequests.flatMap(r=>r.metafields).length),[1,0,41]);
 assert.ok(plan.stages.flatMap(s=>s.markerRequests).every(r=>r.metafields.length<=25&&r.metafields.every(m=>m.compareDigest===null)));
 assert.equal(plan.readyForLive,false);assert.equal(plan.liveWrites,0);assert.equal(plan.theme.themeWrites,0);
});
test('already completed changes produce no writes and no rollback candidates',()=>{
 const input=fixture();for(let i=0;i<126;i++){const p=input.snapshot.products[i];p.publishedOnPublication=true;p.metafield={namespace:'custom',key:'customization_id',type:'single_line_text_field',value:input.catalog[i].configProduct};}
 const p=prepareDoorbellEntryRelease(input);assert.equal(p.counts.createMarkers,0);assert.equal(p.counts.publish,0);assert.equal(p.rollback.removeMarkerCandidates.length,0);assert.equal(p.rollback.unpublishCandidates.length,0);
});
test('missing sibling marker is planned before its publication',()=>{const x=fixture();x.snapshot.products[1].metafield=null;const p=prepareDoorbellEntryRelease(x);assert.equal(p.stages[1].markerRequests[0].metafields[0].ownerId,x.catalog[1].productId);assert.equal(p.stages[2].markerRequests.flatMap(r=>r.metafields).length,41);});
test('foreign nonempty and empty existing markers are not overwritten',()=>{for(const value of ['4100000','']){const x=fixture();x.snapshot.products[0].metafield={namespace:'custom',key:'customization_id',type:'single_line_text_field',value};assert.throws(()=>prepareDoorbellEntryRelease(x),/Conflicting/);}});
test('missing, duplicate and extra scope rows fail closed',()=>{for(const mutate of [x=>x.catalog.pop(),x=>x.snapshot.products[0]=x.snapshot.products[1],x=>x.catalog[1].format='16x28',x=>x.catalog[1].productId='gid://shopify/Product/999999',x=>x.catalog[1].configProduct=x.catalog[0].configProduct]){const x=fixture();mutate(x);assert.throws(()=>prepareDoorbellEntryRelease(x));}});
test('wrong shop, publication and incomplete binding evidence stop preparation',()=>{for(const mutate of [x=>x.snapshot.shopDomain='other.myshopify.com',x=>x.snapshot.publicationId='gid://shopify/Publication/1',x=>x.catalog[0].matchingBindings=119,x=>x.catalog[0].variantDeviations.push('price'),x=>x.snapshot.products[0].status='DRAFT']){const x=fixture();mutate(x);assert.throws(()=>prepareDoorbellEntryRelease(x));}});
test('disabled footer, missing layout and unknown product templates stop preparation',()=>{for(const mutate of [x=>x.theme.theme.files.nodes[1].section.disabled=true,x=>x.theme.theme.files.nodes[0].includesFooterGroup=false,x=>x.snapshot.products[0].templateSuffix='unverified']){const x=fixture();mutate(x);assert.throws(()=>prepareDoorbellEntryRelease(x));}});
test('CLI refuses apply, extra flags, duplicate flags and missing arguments',()=>{
 const args=['--catalog','c','--snapshot','s','--theme','t','--out','o'];assert.equal(parseArgs(args).out,'o');
 for(const bad of [[...args,'--apply'],[...args,'--out','x'],args.slice(0,-1),[...args,'--token','secret']])assert.throws(()=>parseArgs(bad));
});


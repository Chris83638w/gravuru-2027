import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createShopGalleryCache} from './shop-gallery-cache.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {quote} from '../configurator/variant-m/contract.mjs';
import {createShopDesignGallery} from './shop-design-gallery.mjs';

// Synthetic immutable-model transport only. Real quote, geometry, signing and
// preview code run here; no Shopify connection or production data is opened.
function fixture(){
 const bindings=new Map(),models=new Map(),scope={storeId:'test-store',tenantId:'test-tenant',shopDomain:'synthetic.myshopify.com'};
 const store={storeId:scope.storeId,workshop:{tenantId:scope.tenantId,assets:{read(){throw Error('Unexpected asset read');}}},registry:{listActive:()=>structuredClone([...bindings.values()])}};
 const add=(n,{price=1999,options={},designs=[{id:'d1',name:'Design '+n,objects:[]}]}={})=>{
  const b={...scope,shopifyProductId:'gid://shopify/Product/'+n,shopifyVariantId:'gid://shopify/ProductVariant/'+(100+n),productId:'cfg_'+n,productRevision:3,bindingId:'binding_'+n,assignmentRevision:2,options,unitCents:price};
  bindings.set(b.shopifyVariantId,b);models.set(b.productId,{key:'acryl',galleryCategoryIds:['linie-edelstahl-tuerschilder','familie-fixture'],name:'Product '+n,configuration:{id:b.productId,revision:3},universal:{basePriceCents:price,extraMotifCents:169,motifCharge:'additional',photo:{},profile:{kind:'universal-product',id:'profile-'+n,geometry:{shape:'rect',width:120,height:80,holes:[]},material:{kind:'steel'},processing:{method:'engraving'},optionGroups:[],defaultDesignId:designs[0]?.id,designs},localResources:{fonts:{},motifs:[],photoExamples:[]}}});return b;
 };
 const current=add(1),context={store,binding:structuredClone(current),session:{sid:'source-session'}};
 const resolve=ids=>{const binding=bindings.get(ids.shopifyVariantId);if(!binding||binding.shopifyProductId!==ids.shopifyProductId)throw Object.assign(Error('Inactive'),{status:404});return {store,binding:structuredClone(binding)};};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve,modelFor:(_store,b)=>structuredClone(models.get(b.productId)),allowedAssets:()=>new Set()});
 return {bindings,models,store,context,add,gallery};
}

test('gallery cards and signed target resolve the exact product, variant, options, geometry and price',async()=>{
 const f=fixture(),b=f.add(2,{price:2499}),card=(await f.gallery.list(f.context)).items.find(i=>i.productId===b.productId);
 assert.equal(card.unitCents,2499);assert.equal(card.currency,'EUR');assert.equal(card.widthMm,120);assert.equal(card.heightMm,80);assert.equal(card.shape,'rect');assert.equal(card.current,false);
 const target=f.gallery.target(f.context,card.target);assert.deepEqual(target.binding,b);assert.equal(target.price.unitCents,2499);assert.equal(target.design.id,'d1');assert.equal(target.model.configuration.id,b.productId);
});

test('signed targets cannot be forged, borrowed from another session or switched to a different store',async()=>{
 const f=fixture(),token=(await f.gallery.list(f.context)).items[0].target,parts=token.split('.');
 const forged=JSON.parse(Buffer.from(parts[1],'base64url'));forged.designId='hidden';
 for(const candidate of ['',token+'x','x'+token,'sgt1.bad.bad',parts[0]+'.'+Buffer.from(JSON.stringify(forged)).toString('base64url')+'.'+parts[2],'x'.repeat(4097)])assert.throws(()=>f.gallery.target(f.context,candidate),{code:'shop_gallery_changed'});
 assert.throws(()=>f.gallery.target({...f.context,session:{sid:'another-session'}},token),{code:'shop_gallery_changed'});
 assert.throws(()=>f.gallery.target({...f.context,store:{...f.store,storeId:'foreign'}},token),{code:'shop_gallery_changed'});
 assert.throws(()=>f.gallery.target({...f.context,store:{...f.store}},token),{code:'shop_gallery_changed'},'a same-named different store object is not the original configured store');
});

test('targets are re-resolved and reject changed assignments, revisions, identities or scope',async()=>{
 for(const change of [{assignmentRevision:3},{productRevision:4},{bindingId:'new-binding'},{productId:'other-product'},{shopifyProductId:'gid://shopify/Product/999'},{tenantId:'foreign'},{shopDomain:'foreign.myshopify.com'},{storeId:'foreign'}]){
  const f=fixture(),b=f.add(2),token=(await f.gallery.list(f.context)).items.find(i=>i.productId===b.productId).target;
  Object.assign(b,change);assert.throws(()=>f.gallery.target(f.context,token),e=>[404,409].includes(e.status),JSON.stringify(change));
 }
 const f=fixture(),b=f.add(2),token=(await f.gallery.list(f.context)).items[1].target;f.bindings.delete(b.shopifyVariantId);assert.throws(()=>f.gallery.target(f.context,token),e=>e.status===404);
});

test('gallery omits foreign, inactive and stale candidate bindings and unavailable designs',async()=>{
 const f=fixture();f.add(2,{designs:[{id:'ok',objects:[]},{id:'hidden',hidden:true,objects:[]},{id:'unreleased',released:false,objects:[]},{id:'misfit',katalog:{fit:'passt nicht'},objects:[]}]});
 f.add(3).tenantId='foreign';f.add(4).shopDomain='foreign.myshopify.com';f.add(5).storeId='foreign';
 const stale=structuredClone(f.add(6));stale.assignmentRevision--;
 f.store.registry.listActive=()=>structuredClone([...f.bindings.values()].filter(b=>b.productId!=='cfg_6').concat(stale,{...stale,shopifyVariantId:'gid://shopify/ProductVariant/999'}));
 assert.deepEqual((await f.gallery.list(f.context)).items.map(i=>[i.productId,i.designId]),[['cfg_1','d1'],['cfg_2','ok']]);
});

test('price is recalculated; a forged base price or unknown selected option never becomes a card or target',async()=>{
 const f=fixture(),b=f.add(2),token=(await f.gallery.list(f.context)).items[1].target;b.unitCents=1;
 assert.deepEqual((await f.gallery.list(f.context)).items.map(i=>i.productId),['cfg_1']);assert.throws(()=>f.gallery.target(f.context,token),{code:'shop_gallery_changed'});
 b.unitCents=1999;b.options={missing:'unknown'};await assert.rejects(()=>f.gallery.list(f.context),/Unbekannte Optionsgruppe/);assert.throws(()=>f.gallery.target(f.context,token),/Unbekannte Optionsgruppe/);
});

test('legacy all-motif pricing validates the base binding but presents the complete template price',async()=>{
 const f=fixture(),model=f.models.get('cfg_1');model.universal.motifCharge='all';model.universal.profile.designs[0].objects=[{id:'template-motif',type:'motif',motif:'house'}];
 const cards=(await f.gallery.list(f.context)).items;assert.equal(cards.length,1);assert.equal(cards[0].unitCents,2168);assert.equal(f.context.binding.unitCents,1999);
 const target=f.gallery.target(f.context,cards[0].target);assert.equal(target.binding.unitCents,1999);assert.equal(target.price.unitCents,2168);
 f.bindings.get(f.context.binding.shopifyVariantId).unitCents=2168;assert.equal((await f.gallery.list(f.context)).items.length,0,'template surcharge must not disguise a mismatching base binding');
});

test('equal design/shape/size cards prefer the current variant; other products use the cheapest bound combination',async()=>{
 const f=fixture(),m=f.models.get('cfg_1').universal;m.profile.optionGroups=[{id:'mount',defaultValueId:'none',values:[{id:'none',priceCents:0},{id:'holes',priceCents:249}]}];
 const b=f.bindings.get(f.context.binding.shopifyVariantId);b.options={mount:'holes'};b.unitCents=2248;f.context.binding=structuredClone(b);
 f.bindings.set('gid://shopify/ProductVariant/102',{...b,shopifyVariantId:'gid://shopify/ProductVariant/102',bindingId:'cheaper-binding',options:{mount:'none'},unitCents:1999});
 let cards=(await f.gallery.list(f.context)).items;assert.equal(cards.length,1);assert.equal(cards[0].shopifyVariantId,b.shopifyVariantId);assert.equal(cards[0].unitCents,2248);
 f.context.binding={...f.context.binding,shopifyVariantId:'gid://shopify/ProductVariant/999'};cards=(await f.gallery.list(f.context)).items;assert.equal(cards.length,1);assert.equal(cards[0].shopifyVariantId,'gid://shopify/ProductVariant/102');assert.equal(cards[0].unitCents,1999);
});

test('pagination visits each approved design once with a fixed page size and validates page input',async()=>{
 const f=fixture();f.models.get('cfg_1').universal.profile.designs=Array.from({length:85},(_,i)=>({id:'d'+i,objects:[]}));
 const pages=await Promise.all([0,1,2].map(page=>f.gallery.list(f.context,{page})));assert.deepEqual(pages.map(p=>[p.items.length,p.nextPage,p.total]),[[40,1,85],[40,2,85],[5,null,85]]);
 assert.equal(new Set(pages.flatMap(p=>p.items.map(i=>i.designId))).size,85);assert.deepEqual(await f.gallery.list(f.context,{page:3}),{items:[],nextPage:null,total:85});
 for(const page of [-1,1.5,'1',10001,NaN])await assert.rejects(()=>f.gallery.list(f.context,{page}),{code:'shop_gallery_page'});
});

test('signed targets are still rejected when the design becomes hidden or its physical geometry is invalid',async()=>{
 const f=fixture(),token=(await f.gallery.list(f.context)).items[0].target,model=f.models.get('cfg_1');
 model.universal.profile.designs[0].hidden=true;assert.throws(()=>f.gallery.target(f.context,token),{code:'shop_gallery_changed'});
 delete model.universal.profile.designs[0].hidden;model.universal.profile.geometry.width=0;assert.throws(()=>f.gallery.target(f.context,token),{code:'shop_gallery_changed'});assert.equal((await f.gallery.list(f.context)).total,0);
});

test('preview renders the actual selected plate, refuses unapproved private assets and leaves source unchanged',async()=>{
 const f=fixture(),model=f.models.get('cfg_1'),before=structuredClone(model),token=(await f.gallery.list(f.context)).items[0].target;
 const svg=f.gallery.preview(f.context,token);assert.match(svg,/<svg/);assert.match(svg,/120/);assert.deepEqual(model,before);
 model.universal.localResources.photoExamples=[{designId:'d1',slotId:'photo',assetId:'a'.repeat(64)}];
 assert.throws(()=>f.gallery.preview(f.context,token),{code:'shop_gallery_changed'});
});

test('revision cache shares the cold build across sessions, keeps tokens private and invalidates immediately',async()=>{
 const f=fixture();for(let i=2;i<=151;i++)f.add(i);
 let revision='r1',reads=0,resolveCalls=0;
 f.store.registry.galleryRevision=()=>revision;
 f.store.registry.listActiveForGallery=async()=>{reads++;return f.store.registry.listActive();};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:()=>{resolveCalls++;throw Error('No duplicate resolve in listing');},modelFor:(_store,b)=>structuredClone(f.models.get(b.productId)),allowedAssets:()=>new Set()});
 const [first,other]=await Promise.all([gallery.list(f.context),gallery.list({...f.context,session:{sid:'other'}})]);
 assert.equal(first.total,151);assert.equal(reads,1);assert.equal(resolveCalls,0);assert.notEqual(first.items[0].target,other.items[0].target);
 assert.equal((await gallery.list(f.context,{page:1})).items.length,40);assert.equal(reads,1);
 f.bindings.delete('gid://shopify/ProductVariant/102');revision='r2';
 assert.equal((await gallery.list(f.context)).total,150);assert.equal(reads,2);
});
test('cached lists survive elapsed time and changed heads during construction never return stale cards',async()=>{
 const f=fixture();let time=0,revision='r1',reads=0;
 f.store.registry.galleryRevision=()=>revision;
 f.store.registry.listActiveForGallery=async()=>{reads++;const rows=f.store.registry.listActive();if(reads===1){revision='r2';f.add(2);}return rows;};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:()=>{throw Error('duplicate resolve');},modelFor:(_store,b)=>f.models.get(b.productId),allowedAssets:()=>new Set(),clock:()=>time});
 assert.equal((await gallery.list(f.context)).total,2);assert.equal(reads,2);
 time=9999;await gallery.list(f.context);assert.equal(reads,2);
 time=86400000;await gallery.list(f.context);assert.equal(reads,2);
 revision='r3';await gallery.list(f.context);assert.equal(reads,3);
});


test('model reuse still checks approval for every variant and the exact target again',async()=>{
 const f=fixture(),b=f.bindings.get(f.context.binding.shopifyVariantId),m=f.models.get(b.productId);
 m.universal.profile.optionGroups=[{id:'mount',defaultValueId:'none',values:[{id:'none',priceCents:0},{id:'holes',priceCents:249}]}];
 const second={...b,shopifyVariantId:'gid://shopify/ProductVariant/102',bindingId:'second-binding',options:{mount:'holes'},unitCents:2248};f.bindings.set(second.shopifyVariantId,second);
 const approved=new Set([second.shopifyVariantId]),checks=[];let models=0;
 f.store.registry.galleryRevision=()=> 'r1';f.store.registry.listActiveForGallery=async()=>f.store.registry.listActive();
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:ids=>({store:f.store,binding:f.bindings.get(ids.shopifyVariantId)}),modelFor:()=>{models++;return m;},allowedAssets:()=>new Set(),checkBinding:(_store,binding)=>{checks.push(binding.shopifyVariantId);if(!approved.has(binding.shopifyVariantId))throw Object.assign(Error('Not approved'),{status:404});}});
 const cards=(await gallery.list(f.context)).items;assert.equal(models,1);assert.deepEqual(checks,[b.shopifyVariantId,second.shopifyVariantId]);assert.equal(cards.length,1);assert.equal(cards[0].shopifyVariantId,second.shopifyVariantId);assert.equal(cards[0].unitCents,2248);
 approved.clear();assert.throws(()=>gallery.target(f.context,cards[0].target),/Not approved/);
});


test('cold deadline returns preparation status, shares the job and retry uses the finished cards',async t=>{
 const f=fixture();let release,reads=0,models=0,cards=0;
 const gate=new Promise(resolve=>{release=resolve;});
 f.store.registry.galleryRevision=()=> 'fixed';
 f.store.registry.listActiveForGallery=async()=>{reads++;await gate;return f.store.registry.listActive();};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:()=>{throw Error('no target lookup');},modelFor:()=>{models++;throw Error('full model forbidden for cards');},cardFor:(_s,b)=>{cards++;return f.models.get(b.productId);},allowedAssets:()=>new Set()});
 t.mock.timers.enable({apis:['setTimeout']});
 const warming=gallery.warm({store:f.store,binding:{shopDomain:f.context.binding.shopDomain}});
 let answered=false;const first=gallery.list(f.context).then(r=>{answered=true;return r;});
 await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(3999);await Promise.resolve();assert.equal(answered,false);
 t.mock.timers.tick(1);const pending=await first;
 assert.equal(pending.status,'preparing');assert.equal(pending.nextPage,0);assert.equal(pending.total,null);assert.deepEqual(pending.items,[]);assert.match(pending.message,/Designs werden vorbereitet/);assert.equal(reads,1);
 release();await warming;t.mock.timers.reset();
 const ready=await gallery.list(f.context);assert.equal(ready.total,1);assert.equal(reads,1);assert.equal(cards,1);assert.equal(models,0);assert.ok(ready.items[0].target);
});

test('failed background build is handled and the next request retries without poisoning the cache',async()=>{
 const f=fixture();let reads=0;
 f.store.registry.galleryRevision=()=> 'fixed';f.store.registry.listActiveForGallery=async()=>{if(++reads===1)throw Error('temporary');return f.store.registry.listActive();};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:()=>{},modelFor:()=>{throw Error('full model');},cardFor:(_s,b)=>f.models.get(b.productId),allowedAssets:()=>new Set()});
 await assert.rejects(gallery.warm(f.context),/temporary/);assert.equal((await gallery.list(f.context)).total,1);assert.equal(reads,2);
});

test('warm cards recheck revocation and resume per variant without rebuilding or losing a previously paused design',async()=>{
 const f=fixture();let approved=false,reads=0;
 f.store.registry.galleryRevision=()=> 'fixed';f.store.registry.listActiveForGallery=async()=>{reads++;return f.store.registry.listActive();};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:()=>{},modelFor:()=>{throw Error('full model');},cardFor:(_s,b)=>f.models.get(b.productId),allowedAssets:()=>new Set(),checkBinding:()=>{if(!approved)throw Object.assign(Error('paused'),{status:423});}});
 await gallery.warm(f.context);assert.equal((await gallery.list(f.context)).total,0);
 approved=true;assert.equal((await gallery.list(f.context)).total,1);
 approved=false;assert.equal((await gallery.list(f.context)).total,0);assert.equal(reads,1);
});

function setBell(f,n,modelKey,format='16x28'){
 const m=f.models.get('cfg_'+n),b=f.bindings.get('gid://shopify/ProductVariant/'+(100+n));m.universal=doorbellFixture();m.universal.doorbell.modelKey=modelKey;b.options={format};b.unitCents=quote(m.universal,[],'example',b.options).unitCents;
 if(n===1)f.context.binding=structuredClone(b);
}

test('mixed store caches separate catalogue lines and doorbell models, with all formats of one model',async()=>{
 const f=fixture();for(let n=2;n<=7;n++)f.add(n);
 f.models.get('cfg_3').galleryCategoryIds=['linie-hausnummern'];
 for(const n of [4,5,6,7]){
  const m=f.models.get('cfg_'+n);m.galleryCategoryIds=['linie-funkklingeln'];
  setBell(f,n,n<6?'model-a':'model-b',n%2?'24x20':'16x28');
 }
 // Real layered-doorbell selection and geometry, with two formats per model.
 let reads=0;f.store.registry.galleryRevision=()=> 'mixed-r1';f.store.registry.listActiveForGallery=async()=>{reads++;return f.store.registry.listActive();};
 const by=n=>({...f.context,binding:structuredClone(f.bindings.get('gid://shopify/ProductVariant/'+(100+n)))});
 const ids=async n=>(await f.gallery.list(by(n))).items.map(c=>c.productId);
 assert.deepEqual(await ids(1),['cfg_1','cfg_2']);assert.deepEqual(await ids(3),['cfg_3']);
 assert.deepEqual(await ids(4),['cfg_4','cfg_5']);assert.deepEqual(await ids(6),['cfg_6','cfg_7']);
 assert.equal(reads,1,'one lightweight warm build, separate line/model cache partitions');
});

test('signed scope cannot be changed, reused with another source, or bypassed by a freshly resolved foreign line/model',async()=>{
 const f=fixture(),b=f.add(2),card=(await f.gallery.list(f.context)).items.find(c=>c.productId===b.productId);
 const parts=card.target.split('.'),payload=JSON.parse(Buffer.from(parts[1],'base64url'));
 assert.equal(payload.scope,JSON.stringify(['line','edelstahl-tuerschilder']));
 payload.scope=JSON.stringify(['line','hausnummern']);
 assert.throws(()=>f.gallery.target(f.context,parts[0]+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+parts[2]),{code:'shop_gallery_changed'});
 assert.throws(()=>f.gallery.target({...f.context,binding:b},card.target),{code:'shop_gallery_changed'});
 for(const side of ['cfg_1','cfg_2']){
  const model=f.models.get(side),before=model.galleryCategoryIds;model.galleryCategoryIds=['linie-hausnummern'];
  assert.throws(()=>f.gallery.target(f.context,card.target),{code:'shop_gallery_changed'});model.galleryCategoryIds=before;
 }
 for(const n of [1,2])setBell(f,n,'one');
 const bell=(await f.gallery.list(f.context)).items.find(c=>c.productId===b.productId);
 f.models.get(b.productId).universal.doorbell.modelKey='other';
 assert.throws(()=>f.gallery.target(f.context,bell.target),{code:'shop_gallery_changed'});
});

test('missing or ambiguous catalogue line never expands to other products or borrows a doorbell model',async()=>{
 const f=fixture();f.add(2);for(const m of f.models.values())m.galleryCategoryIds=[];
 assert.deepEqual((await f.gallery.list(f.context)).items.map(c=>c.productId),['cfg_1']);
 for(const m of f.models.values())m.galleryCategoryIds=['linie-one','linie-two'];
 assert.deepEqual((await f.gallery.list(f.context)).items.map(c=>c.productId),['cfg_1']);
 for(const n of [1,2]){setBell(f,n,'one');delete f.models.get('cfg_'+n).universal.doorbell.modelKey;}
 assert.deepEqual((await f.gallery.list(f.context)).items.map(c=>c.productId),['cfg_1']);
});

test('cross-material/process cards require an explicitly approved Paket-M target in this line and destination family',async()=>{
 const f=fixture(),b=f.add(2),m=f.models.get(b.productId),d=m.universal.profile.designs[0];
 m.universal.profile.material.kind='acrylic';m.universal.profile.processing.method='print';
 const listed=async()=>(await f.gallery.list(f.context)).items.find(c=>c.productId===b.productId);
 assert.equal(await listed(),undefined);
 d.katalog={target:{lineId:'edelstahl-tuerschilder',familyId:'fixture',explicit:true,released:true}};
 const card=await listed();assert.ok(card);assert.equal(f.gallery.target(f.context,card.target).binding.productId,b.productId);
 for(const change of [{lineId:'hausnummern'},{familyId:'other'},{explicit:false},{released:false}]){
  const original=structuredClone(d.katalog.target);Object.assign(d.katalog.target,change);
  assert.equal(await listed(),undefined);assert.throws(()=>f.gallery.target(f.context,card.target),{code:'shop_gallery_changed'});d.katalog.target=original;
 }
});

test('current topic ranks across pagination; Alle Themen retains every same-line design and stable catalogue order',async()=>{
 const f=fixture();f.models.get('cfg_1').universal.profile.themeId='hunde';
 f.models.get('cfg_1').universal.profile.designs=Array.from({length:45},(_,n)=>({id:'d'+n,name:'Design '+n,objects:[],themes:n===44?['hunde']:['hochzeit']}));
 const first=await f.gallery.list(f.context),next=await f.gallery.list(f.context,{page:1});
 assert.equal(first.hasTheme,true);assert.equal(first.items[0].designId,'d44');assert.equal(first.total,45);assert.equal(next.items.length,5);
 assert.equal(new Set([...first.items,...next.items].map(c=>c.designId)).size,45);
 const all=await f.gallery.list(f.context,{theme:'all'});assert.equal(all.items[0].designId,'d0');assert.equal(all.total,45);
 await assert.rejects(f.gallery.list(f.context,{theme:'foreign-line'}),{code:'shop_gallery_theme'});
});


test('persisted SQLite snapshot survives reopening, partitions scope, rechecks availability and issues only fresh session tokens',async t=>{
 const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-persist-gallery-')),filename=path.join(dir,'cache.sqlite');
 let db=new DatabaseSync(filename),revision='r1',reads=0,allowed=true;
 t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 const scope={tenantId:'test-tenant',storeId:'test-store',shopDomain:'synthetic.myshopify.com'};
 const connect=()=>{f.store.registry.galleryCache=createShopGalleryCache({database:db,...scope});};connect();
 f.store.registry.galleryRevision=()=>revision;
 f.store.registry.listActiveForGallery=async()=>{reads++;return f.store.registry.listActive();};
 // A future accidental private field on a binding must not enter the cache.
 f.bindings.values().next().value.customerDraft='PRIVATE_CUSTOMER_MARKER';
 f.add(2);f.models.get('cfg_2').galleryCategoryIds=['linie-other'];
 const options={secret:'synthetic-persist-secret',resolve:ids=>({store:f.store,binding:f.bindings.get(ids.shopifyVariantId)}),modelFor:(_s,b)=>f.models.get(b.productId),allowedAssets:()=>new Set(),checkBinding:()=>{if(!allowed)throw Object.assign(Error('paused'),{status:423});}};
 const first=await createShopDesignGallery(options).list(f.context);assert.equal(first.total,1);assert.equal(reads,1);
 const saved=db.prepare('SELECT * FROM shop_gallery_cache').get();
 for(const privateValue of ['PRIVATE_CUSTOMER_MARKER','source-session','sgt1.','synthetic-persist-secret'])assert.ok(!saved.payload.includes(privateValue),privateValue);
 assert.equal(createShopGalleryCache({database:db,...scope,storeId:'foreign'}).read(revision),null);
 assert.equal(createShopGalleryCache({database:db,...scope,tenantId:'foreign'}).read(revision),null);
 assert.equal(createShopGalleryCache({database:db,...scope,shopDomain:'foreign.myshopify.com'}).read(revision),null);
 db.close();db=new DatabaseSync(filename);connect();
 const gallery=createShopDesignGallery({...options,cardFor:()=>{throw Error('Cache hit must not read product models');}});
 const context={...f.context,session:{sid:'new-session'}},restarted=await gallery.list(context);
 assert.equal(reads,1);assert.equal(restarted.total,1);assert.notEqual(restarted.items[0].target,first.items[0].target);
 allowed=false;assert.equal((await gallery.list(context)).total,0);allowed=true;assert.equal((await gallery.list(context)).total,1);
 revision='r2';const next=await createShopDesignGallery(options).list(context);assert.equal(reads,2);assert.equal(next.total,1);
 assert.equal(db.prepare('SELECT count(*) n FROM shop_gallery_cache WHERE store_id=?').get(scope.storeId).n,1);
 assert.equal(f.store.registry.galleryCache.read('r1'),null);assert.ok(f.store.registry.galleryCache.read('r2'));
});

test('invalid signature, changed secret, wrong scope and cache I/O failures rebuild without using stale cards',async()=>{
 for(const scenario of ['tampered','secret','scope','read-error','write-error']){
  const f=fixture();let saved,reads=0;
  f.store.registry.galleryRevision=()=> 'r1';f.store.registry.listActiveForGallery=async()=>{reads++;return f.store.registry.listActive();};
  f.store.registry.galleryCache={read:()=>saved,write:(_r,value)=>{saved=value;}};
  const options={secret:'cache-secret',resolve:()=>{},modelFor:(_s,b)=>f.models.get(b.productId),allowedAssets:()=>new Set()};
  await createShopDesignGallery(options).list(f.context);assert.equal(reads,1);
  if(scenario==='tampered')saved.payload=saved.payload.replace('Design 1','Forged design');
  if(scenario==='secret')options.secret='rotated-secret';
  if(scenario==='scope')f.store.storeId='another-store';
  if(scenario==='read-error')f.store.registry.galleryCache.read=()=>{throw Error('storage unavailable');};
  if(scenario==='write-error'){saved=null;f.store.registry.galleryCache.write=()=>{throw Error('read-only storage');};}
  const result=await createShopDesignGallery(options).list(f.context);assert.equal(reads,2,scenario);assert.equal(result.total,scenario==='scope'?0:1);
  assert.ok(result.items.every(i=>i.designName!=='Forged design'));
 }
});

test('a revision changed during build is never persisted under the previous revision',async()=>{
 const f=fixture();let revision='r1',reads=0;const writes=[];
 f.store.registry.galleryRevision=()=>revision;f.store.registry.galleryCache={read:()=>null,write:(r,s)=>writes.push(r)};
 f.store.registry.listActiveForGallery=async()=>{reads++;if(reads===1){revision='r2';f.add(2);}return f.store.registry.listActive();};
 const options={secret:'cache-secret',resolve:()=>{},modelFor:(_s,b)=>f.models.get(b.productId),allowedAssets:()=>new Set()};
 assert.equal((await createShopDesignGallery(options).list(f.context)).total,2);assert.deepEqual(writes,['r2']);
});

test('read-only storage without a cache table leaves the database unchanged',()=>{
 const db=new DatabaseSync(':memory:');try{
  const cache=createShopGalleryCache({database:db,tenantId:'tenant',storeId:'store',shopDomain:'shop.myshopify.com',readOnly:true});
  assert.equal(cache.read('revision'),null);cache.write('revision',{payload:'{}',mac:'a'.repeat(64)});
  assert.deepEqual(db.prepare('SELECT name FROM sqlite_master').all(),[]);
 }finally{db.close();}
});

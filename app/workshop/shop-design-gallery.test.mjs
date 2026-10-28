import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopDesignGallery} from './shop-design-gallery.mjs';

// Synthetic immutable-model transport only. Real quote, geometry, signing and
// preview code run here; no Shopify connection or production data is opened.
function fixture(){
 const bindings=new Map(),models=new Map(),scope={storeId:'test-store',tenantId:'test-tenant',shopDomain:'synthetic.myshopify.com'};
 const store={storeId:scope.storeId,workshop:{tenantId:scope.tenantId,assets:{read(){throw Error('Unexpected asset read');}}},registry:{listActive:()=>structuredClone([...bindings.values()])}};
 const add=(n,{price=1999,options={},designs=[{id:'d1',name:'Design '+n,objects:[]}]}={})=>{
  const b={...scope,shopifyProductId:'gid://shopify/Product/'+n,shopifyVariantId:'gid://shopify/ProductVariant/'+(100+n),productId:'cfg_'+n,productRevision:3,bindingId:'binding_'+n,assignmentRevision:2,options,unitCents:price};
  bindings.set(b.shopifyVariantId,b);models.set(b.productId,{key:'acryl',name:'Product '+n,configuration:{id:b.productId,revision:3},universal:{basePriceCents:price,extraMotifCents:169,motifCharge:'additional',photo:{},profile:{kind:'universal-product',id:'profile-'+n,geometry:{shape:'rect',width:120,height:80,holes:[]},material:{kind:'steel'},processing:{method:'engraving'},optionGroups:[],defaultDesignId:designs[0]?.id,designs},localResources:{fonts:{},motifs:[],photoExamples:[]}}});return b;
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
test('cached lists expire and changed heads during construction never return stale cards',async()=>{
 const f=fixture();let time=0,revision='r1',reads=0;
 f.store.registry.galleryRevision=()=>revision;
 f.store.registry.listActiveForGallery=async()=>{reads++;const rows=f.store.registry.listActive();if(reads===1){revision='r2';f.add(2);}return rows;};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve:()=>{throw Error('duplicate resolve');},modelFor:(_store,b)=>f.models.get(b.productId),allowedAssets:()=>new Set(),clock:()=>time});
 assert.equal((await gallery.list(f.context)).total,2);assert.equal(reads,2);
 time=9999;await gallery.list(f.context);assert.equal(reads,2);
 time=10000;await gallery.list(f.context);assert.equal(reads,3);
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

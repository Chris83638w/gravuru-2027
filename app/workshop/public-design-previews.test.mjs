import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createPublicDesignPreviewCache,publicPreviewRendererFingerprint} from './public-design-preview-cache.mjs';
import {createPublicDesignPreviews} from './public-design-previews.mjs';
import {createShopDesignGallery} from './shop-design-gallery.mjs';
import {MODULE_PROFILE_SCHEMA} from '../configurator/variant-m/module-profile.mjs';

const secret='synthetic-public-template-secret',url=h=>'/konfigurator/shop/vorschauen/'+h+'.svg';
function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'public-template-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const binding={storeId:'acryl',tenantId:'tenant1',shopDomain:'synthetic.myshopify.com',shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/101',productId:'cfg_1',productRevision:4,bindingId:'binding_1',assignmentRevision:1,options:{},unitCents:1999};
 const model={key:'acryl',galleryCategoryIds:['linie-edelstahl','familie-test'],name:'Synthetic',configuration:{id:'cfg_1',revision:4},universal:{basePriceCents:1999,extraMotifCents:169,motifCharge:'additional',photo:{},familyFormats:{fixedSize:'120x80'},profile:{kind:'universal-product',id:'profile',geometry:{shape:'rect',width:120,height:80,holes:[]},material:{kind:'steel'},processing:{method:'engraving'},optionGroups:[],defaultDesignId:'d1',designs:[{id:'hidden',hidden:true,objects:[]},...Array.from({length:5},(_,i)=>({id:'d'+(i+1),name:'D'+i,objects:[]}))]},localResources:{fonts:{},motifs:[],photoExamples:[]}}};
 const store={storeId:'acryl',workshop:{tenantId:'tenant1',assets:{read(){throw Error('Unexpected private asset read');}}},registry:{listActive:()=>[structuredClone(binding)]}};
 let allowed=true,active=true,renders=0;
 const resolve=ids=>{assert.deepEqual(Object.keys(ids).sort(),['shopifyProductId','shopifyVariantId'],'native registry accepts only the two Shopify identifiers');if(!active||ids.shopifyProductId!==binding.shopifyProductId||ids.shopifyVariantId!==binding.shopifyVariantId)throw Object.assign(Error('Not active'),{status:404});return {store,binding:structuredClone(binding)};};
 const modelFor=()=>structuredClone(model),checkBinding=()=>{if(!allowed)throw Object.assign(Error('Approval revoked'),{status:423});};
 const create=(rendererFingerprint='a'.repeat(64))=>{const cache=createPublicDesignPreviewCache({directory,secret,rendererFingerprint}),gallery=createShopDesignGallery({secret,resolve,modelFor,checkBinding,allowedAssets:()=>new Set(),previewUrl:url}),native=gallery.preview;gallery.preview=(...args)=>{renders++;return native(...args);};const previews=createPublicDesignPreviews({cache,resolve,modelFor,checkBinding,gallery,renderTemplate:(context,id)=>{const fresh=createShopDesignGallery({secret,resolve,modelFor,checkBinding,allowedAssets:()=>new Set()});renders++;return fresh.preview(context,fresh.start(context,context.model,id).target);},previewUrl:url});return {cache,previews,gallery};};
 return {directory,binding,model,store,create,get renders(){return renders;},revoke:()=>{allowed=false;},deactivate:()=>{active=false;}};
}
const hash=url=>url.split('/').at(-1).slice(0,-4);

test('strict native resolver supports prepare, full-binding warm lookup and direct read without trusting claimed binding fields',async t=>{
 const f=fixture(t),p=f.create().previews,ids={shopifyProductId:f.binding.shopifyProductId,shopifyVariantId:f.binding.shopifyVariantId};
 const prepared=await p.prepare(ids);assert.equal(prepared.prepared,3);
 const urls=p.urls(f.binding);assert.deepEqual(urls,prepared.items.map(item=>item.url));
 for(const value of urls)assert.match(p.read(hash(value)).toString(),/<svg/);
 assert.deepEqual(p.urls({...f.binding,tenantId:'foreign-tenant'}),[]);
 assert.deepEqual(p.urls({...f.binding,assignmentRevision:99}),[]);
 const original=structuredClone(f.binding);f.binding.unitCents++;
 assert.deepEqual(p.urls(original),[]);assert.equal(p.read(hash(urls[0])),null);
 assert.equal(f.renders,3);
});

test('exact first three own templates persist over restart; lookups never render or write product data',async t=>{
 const f=fixture(t),before=JSON.stringify([f.binding,f.model]),one=f.create();assert.deepEqual(one.previews.urls(f.binding),[]);assert.equal(f.renders,0);
 const result=await one.previews.prepare(f.binding);assert.equal(result.prepared,3);assert.deepEqual(result.items.map(x=>x.designId),['d1','d2','d3']);assert.equal(f.renders,3);assert.equal(fs.readdirSync(f.directory).length,3);
 const restarted=f.create(),urls=restarted.previews.urls(f.binding);assert.deepEqual(urls,result.items.map(x=>x.url));assert.ok(restarted.previews.read(hash(urls[0])).toString().includes('<svg'));assert.equal(f.renders,3);
 const again=await restarted.previews.prepare(f.binding);assert.ok(again.items.every(x=>x.cached));assert.equal(f.renders,3);assert.equal(JSON.stringify([f.binding,f.model]),before);
 const context={store:f.store,binding:f.binding,session:{sid:'other-customer'}};
 const cards=await restarted.gallery.list(context,{sourceModel:f.model}),attached=restarted.previews.attach(cards);
 assert.deepEqual(attached.items.slice(0,3).map(x=>x.previewUrl),urls);assert.ok(attached.items.slice(3).every(x=>!x.previewUrl));
});

test('revoked approval and inactive binding reject direct public bytes as well as warm URLs',async t=>{
 for(const mode of ['revoke','deactivate']){const f=fixture(t),p=f.create().previews,result=await p.prepare(f.binding),id=hash(result.items[0].url);f[mode]();assert.equal(p.read(id),null);assert.deepEqual(p.urls(f.binding),[]);await assert.rejects(()=>p.prepare(f.binding));}
});

test('model, renderer, revision, options, assignment, tenant and shop changes cannot revive a stale public URL',async t=>{
 for(const change of ['renderer','model','revision','options','assignment','tenant','shop']){const f=fixture(t),first=f.create(),result=await first.previews.prepare(f.binding),id=hash(result.items[0].url);
  if(change==='renderer'){assert.equal(f.create('b'.repeat(64)).previews.read(id),null);continue;}
  if(change==='model')f.model.universal.profile.designs[1].name='Changed original';
  if(change==='revision'){f.binding.productRevision++;f.model.configuration.revision++;}
  if(change==='options')f.binding.options={unknown:'other'};
  if(change==='assignment')f.binding.assignmentRevision++;
  if(change==='tenant'){f.binding.tenantId='tenant2';f.store.workshop.tenantId='tenant2';}
  if(change==='shop')f.binding.shopDomain='foreign.myshopify.com';
  assert.equal(first.previews.read(id),null,change);assert.deepEqual(first.previews.urls(f.binding),[],change);
 }
});

test('identical bytes receive distinct tenant URLs and revocation cannot borrow another tenant association',async t=>{
 const f=fixture(t),p=f.create().previews,first=await p.prepare(f.binding),oldId=hash(first.items[0].url),body=p.read(oldId);
 f.binding.tenantId='tenant2';f.store.workshop.tenantId='tenant2';const second=await p.prepare(f.binding),newId=hash(second.items[0].url);
 assert.notEqual(oldId,newId);assert.deepEqual(p.read(newId),body);assert.equal(p.read(oldId),null);
});

test('tampered signed metadata/body, secret rotation and unsupported renderer retain the private fallback',async t=>{
 const f=fixture(t),{previews}=f.create(),prepared=await previews.prepare(f.binding),filename=path.join(f.directory,hash(prepared.items[0].url)+'.json');
 const original=fs.readFileSync(filename,'utf8'),value=JSON.parse(original);value.payload.identity.binding.tenantId='attacker';fs.writeFileSync(filename,JSON.stringify(value));assert.equal(previews.read(hash(prepared.items[0].url)),null);
 fs.writeFileSync(filename,original.replace('bodyHash','tamperedHash'));assert.equal(previews.read(hash(prepared.items[0].url)),null);
 fs.writeFileSync(filename,original);assert.equal(createPublicDesignPreviewCache({directory:f.directory,secret:secret+'rotated',rendererFingerprint:'a'.repeat(64)}).read(hash(prepared.items[0].url)),null);
 f.model.universal.doorbell={schema:'shared-renderer'};assert.deepEqual(previews.urls(f.binding),[]);
});

test('customer media never becomes a prepared public template; actual private preview remains available',async t=>{
 for(const marker of [{media:{mediaId:'private-customer',revisionId:'1'}},{uploadId:'private-customer'},{customerUploadId:'private-customer'},{uxUploadId:'private-customer'},{uxVectorLogo:{id:'private-customer'}}]){
  const f=fixture(t);f.model.universal.profile.designs[1].objects=[{id:'customer',type:'photoSlot',...marker}];
  const {previews,gallery}=f.create(),result=await previews.prepare(f.binding);assert.deepEqual(result.items.map(x=>x.designId),['d2','d3','d4']);
  const token=gallery.start({store:f.store,binding:f.binding,session:{sid:'test'}},f.model,'d2').target;assert.match(gallery.preview({store:f.store,binding:f.binding,session:{sid:'test'}},token),/<svg/);
  for(const file of fs.readdirSync(f.directory))assert.ok(!fs.readFileSync(path.join(f.directory,file),'utf8').includes('private-customer'));
 }
});

test('binding changes across preparation yield are rejected before any persistent write',async t=>{
 const f=fixture(t),p=f.create().previews,pending=p.prepare(f.binding);f.binding.assignmentRevision++;await assert.rejects(pending,{code:'public_preview_changed'});assert.deepEqual(fs.readdirSync(f.directory),[]);
});

test('cache is bounded, tamper resistant and fingerprint covers the actual renderer graph',t=>{
 const f=fixture(t);assert.match(publicPreviewRendererFingerprint(),/^[a-f0-9]{64}$/);
 const cache=createPublicDesignPreviewCache({directory:f.directory,secret,rendererFingerprint:'a'.repeat(64),maxBytes:1024}),identity={renderer:'a'.repeat(64),tenant:'one'};
 const first=cache.put(identity,Buffer.from('<svg/>'));assert.throws(()=>cache.put(identity,Buffer.from('<svg>changed</svg>')),/abweichenden/);
 assert.throws(()=>cache.put({...identity,tenant:'two'},Buffer.alloc(2048)),/voll/);assert.equal(cache.read('../private'),null);assert.equal(cache.read(first.hash).body.toString(),'<svg/>');
});

test('repreparing changed model bytes uses a fresh native renderer instead of the old gallery memory cache',async t=>{
 const f=fixture(t),{previews,gallery}=f.create(),context={store:f.store,binding:f.binding,session:{sid:'existing-gallery'}};
 // Fill the old cache under the existing revision first.
 const before=gallery.preview(context,gallery.start(context,f.model,'d1').target);
 const first=await previews.prepare(f.binding),firstBytes=previews.read(hash(first.items[0].url));
 f.model.universal.profile.geometry.width=140;
 const second=await previews.prepare(f.binding),secondBytes=previews.read(hash(second.items[0].url));
 assert.notEqual(first.items[0].url,second.items[0].url);assert.notDeepEqual(firstBytes,secondBytes);assert.notEqual(secondBytes.toString(),before);
});

test('combined module/cache gate retires existing public URLs and prepares nothing when design choice is disabled',async t=>{
 const f=fixture(t),profile={schema:MODULE_PROFILE_SCHEMA,id:'combined-review',revision:1,modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo:false,colors:false}};
 f.model.universal.moduleProfile=profile;
 const original=JSON.stringify(f.model.universal.profile),{previews,gallery}=f.create(),prepared=await previews.prepare(f.binding);
 assert.equal(prepared.prepared,3);const oldUrl=prepared.items[0].url;assert.ok(previews.read(hash(oldUrl)));
 const context={store:f.store,binding:f.binding,session:{sid:'combined-review'}};
 profile.modules.designs=false;profile.revision++;
 assert.equal(previews.read(hash(oldUrl)),null);assert.deepEqual(previews.urls(f.binding),[]);
 assert.deepEqual(await previews.prepare(f.binding),{prepared:0,items:[]});assert.equal(f.renders,3);
 assert.equal(gallery.start(context,f.model,'d1',{cardModel:f.model}),null,'optional checked cardModel does not bypass the module gate');
 await assert.rejects(()=>gallery.list(context,{sourceModel:f.model}),{status:403,code:'shop_gallery_disabled'});
 assert.equal(JSON.stringify(f.model.universal.profile),original,'original designs and geometry remain exact');
 delete profile.modules.designs;
 assert.equal(previews.read(hash(oldUrl)),null);assert.deepEqual(previews.urls(f.binding),[]);
 assert.throws(()=>gallery.start(context,f.model,'d1',{cardModel:f.model}),{code:'module_profile_invalid'});
 // Optional speculative preparation deliberately omits rejected templates.
 assert.deepEqual(await previews.prepare(f.binding),{prepared:0,items:[]});assert.equal(f.renders,3);
});

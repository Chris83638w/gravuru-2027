import test from 'node:test';
import assert from 'node:assert/strict';
import {shopifyUpload,legacyLine,snapshotPhotos,verifiedReplacement,replaceLegacyLine} from '../../../ops/shopify/theme-block/assets/gravuru-legacy-cart.js';
import {legacyCartDraft,legacyPhotoMappings} from './legacy-cart-restore.mjs';
import {patchMemorialCartIndex,patchMemorialCartUX} from '../../../legacy-patches/memorial-cart-edit-compat.mjs';
const root='https://cdn.shopify.com/s/files/1/0920/5550/3228/uploads/',url=ext=>root+'a'.repeat(32)+'.'+ext,id='11111111-1111-4111-8111-111111111111';
const fixture=()=>{
 const old={key:'123:'+ 'a'.repeat(32),product_id:456,variant_id:123,quantity:1,properties:{'_Gravuru Vorgang':id,Entwurf:url('png'),'Bearbeitbarer Entwurf':url('json'),'Originalbild 1':url('jpg')}};
 const other={...structuredClone(old),key:'123:'+'b'.repeat(32),properties:{note:'unchanged'}};
 const message={productId:'gid://shopify/Product/456',variantId:'123',quantity:1,priceCents:3467,properties:{'_Gravuru Vorgang':'22222222-2222-4222-8222-222222222222'},assets:[{property:'Entwurf'}]};
 const added={...structuredClone(old),key:'123:'+'c'.repeat(32),final_line_price:3467,properties:{...message.properties,Entwurf:url('png')}};
 const snapshot={schema:'gravuru-shopify-design/v1',productId:'gid://shopify/Product/456',profileId:'P-1',revision:30,price:{variantId:'123'},design:{id:'D1',objects:[{id:'photo',uxUploadId:id,x:20,y:30,w:40,h:50,photoShape:'heart',uxPhotoCrop:{scale:2}}]},options:{mounting:'none'},uploads:[{uploadId:id,original:'bild-1-original.jpg'}]};
 return {old,other,message,added,snapshot};
};
test('only Shopify upload files, never arbitrary origins, credentials or alternate shops',()=>{
 assert.equal(shopifyUpload(url('png')),url('png'));
 for(const bad of ['javascript:alert(1)','https://evil.test/a.png',url('png')+'?url=https://evil.test',url('png').replace('https:','http:'),url('png').replace('cdn.shopify.com','cdn.shopify.com.evil.test')])assert.throws(()=>shopifyUpload(bad));
 assert.throws(()=>shopifyUpload(url('png'),'https://cdn.shopify.com/s/files/1/0000/0000/uploads/'));
});
test('edit identifies the exact current cart line and product, not another variant sibling',()=>{
 const f=fixture();assert.equal(legacyLine({items:[f.old,f.other]},f.old.key,456).item,f.old);
 for(const [key,product] of [[f.old.key,999],['123',456],[f.other.key,456]])assert.throws(()=>legacyLine({items:[f.old,f.other]},key,product));
});
test('photo mapping preserves upload id and maps original plus edited file by exact index',()=>{
 const f=fixture();let p=snapshotPhotos(f.snapshot,f.old,root);assert.equal(p[0].uploadId,id);assert.equal(p[0].originalUrl,url('jpg'));
 f.snapshot.uploads[0].edited='bild-1-bearbeitet.png';f.old.properties['Bearbeitetes Bild 1']=url('png');
 p=snapshotPhotos(f.snapshot,f.old,root);assert.equal(p[0].editedUrl,url('png'));
 assert.throws(()=>snapshotPhotos({...f.snapshot,productId:'gid://shopify/Product/999'},f.old,root));
 assert.throws(()=>snapshotPhotos({...f.snapshot,uploads:[f.snapshot.uploads[0],f.snapshot.uploads[0]]},f.old,root));
 assert.throws(()=>snapshotPhotos({...f.snapshot,uploads:[{...f.snapshot.uploads[0],original:'../../secret.jpg'}]},f.old,root));
});
test('draft restore preserves every geometric, mask and crop field and original revision',()=>{
 const f=fixture(),before=structuredClone(f.snapshot),draft=legacyCartDraft({profile:{id:'P-1',revision:30,binding:{productId:'P-internal'}}},f.snapshot,'gid://shopify/Product/456');
 assert.equal(draft.profileRevision,30);assert.deepEqual(draft.design,f.snapshot.design);assert.deepEqual(f.snapshot,before);
 assert.throws(()=>legacyCartDraft({},{}));
 const photo={uploadId:id,originalName:'bild-1-original.jpg',original:new Blob(['jpeg'],{type:'image/jpeg'})};
 assert.equal(legacyPhotoMappings(f.snapshot,[photo])[0],photo);
 assert.throws(()=>legacyPhotoMappings(f.snapshot,[]));
 assert.throws(()=>legacyPhotoMappings(f.snapshot,[{...photo,uploadId:'wrong'}]));
 assert.throws(()=>legacyPhotoMappings(f.snapshot,[{...photo,original:new Blob(['html'],{type:'text/html'})}]));
});
test('replacement is confirmed only for exact product, variant, quantity, price and properties',()=>{
 const f=fixture();assert.equal(verifiedReplacement({items:[f.added]},f.message),f.added);
 for(const changes of [{final_line_price:2299},{product_id:999},{variant_id:999},{quantity:2},{properties:{...f.added.properties,Entwurf:'https://evil.test/x'}}])
 assert.throws(()=>verifiedReplacement({items:[{...f.added,...changes}]},f.message));
 assert.throws(()=>verifiedReplacement({items:[f.added,f.added]},f.message));
});
function mockCart(f,{failAdd=false,lostAdd=false,failRemove=false,wrongPrice=false,changedOld=false}={}){
 let items=[structuredClone(f.old),structuredClone(f.other)];const writes=[];
 if(changedOld)items[0].quantity=2;
 return {writes,get items(){return items;},request:async(path,opt={})=>{
  if(path==='cart.js')return {ok:true,json:async()=>({items:structuredClone(items)})};
  writes.push({path,body:opt.body});
  if(path==='cart/add.js'){
   if(failAdd)return {ok:false,json:async()=>({description:'Preisprüfung abgelehnt'})};
   const added=structuredClone(f.added);if(wrongPrice)added.final_line_price=1;items.push(added);
   if(lostAdd)throw Error('network');return {ok:true};
  }
  if(path==='cart/change.js'){
   if(failRemove)return {ok:false};
   const data=JSON.parse(opt.body);assert.equal(data.id,f.old.key);assert.equal(data.quantity,0);items=items.filter(i=>i.key!==data.id);return {ok:true};
  }
  throw Error(path);
 }};
}
test('successful replace removes only the selected old design after confirmed upload and retains sibling',async()=>{
 const f=fixture(),m=mockCart(f);await replaceLegacyLine({request:m.request,original:f.old,message:f.message,body:'files'});
 assert.deepEqual(m.items,[f.other,f.added]);assert.deepEqual(m.writes.map(w=>w.path),['cart/add.js','cart/change.js']);
});
test('a lost add response is reconciled without adding twice',async()=>{
 const f=fixture(),m=mockCart(f,{lostAdd:true});await replaceLegacyLine({request:m.request,original:f.old,message:f.message,body:'files'});
 assert.equal(m.items.length,2);assert.equal(m.writes.filter(w=>w.path==='cart/add.js').length,1);
});
test('price rejection and mismatched read-back never delete the existing design',async()=>{
 for(const mode of [{failAdd:true},{wrongPrice:true}]){
  const f=fixture(),m=mockCart(f,mode);await assert.rejects(()=>replaceLegacyLine({request:m.request,original:f.old,message:f.message,body:'files'}));
  assert.deepEqual(m.items.find(i=>i.key===f.old.key),f.old);assert.equal(m.writes.some(w=>w.path==='cart/change.js'),false);
 }
});
test('concurrent change is rejected before any write; failed removal retains both designs',async()=>{
 const f=fixture(),m=mockCart(f,{changedOld:true});await assert.rejects(()=>replaceLegacyLine({request:m.request,original:f.old,message:f.message,body:'files'}));assert.equal(m.writes.length,0);
 const n=mockCart(f,{failRemove:true});await assert.rejects(()=>replaceLegacyLine({request:n.request,original:f.old,message:f.message,body:'files'}));assert.equal(n.items.length,3);assert.deepEqual(n.items[1],f.other);
});
test('compatibility patches retain exact origin/source/session checks and reject unknown sources',()=>{
 const ux="  window.parent.postMessage({type:'gravuru-ux-ready'},location.origin);";
 assert.match(patchMemorialCartUX(ux),/installLegacyCartRestore/);assert.throws(()=>patchMemorialCartUX(''));
 const source="window.addEventListener('message',event=>{\nif(event.data?.type==='gravuru-ux-ready')document.getElementById('status')?.remove();\nif(window.GravuruCommerce&&event.data?.type==='gravuru-cart-submit'&&event.data.session===session)window.parent.postMessage(event.data,parentOrigin);";
 const out=patchMemorialCartIndex(source);
 assert.match(out,/event.origin===parentOrigin&&event.source===window.parent&&event.data\?\.session===session/);
 assert.match(out,/'gravuru-cart-restored'/);assert.throws(()=>patchMemorialCartIndex(out));
});

test('legacy commerce id maps to the bound internal product only after exact shop, profile and revision match',()=>{
 const f=fixture(),config={profile:{id:'P-1',revision:30,binding:{productId:'P-internal'}}};
 assert.equal(legacyCartDraft(config,f.snapshot,'gid://shopify/Product/456').productId,'P-internal');
 for(const patch of [{productId:'gid://shopify/Product/999'},{profileId:'P-2'},{revision:31},{revision:'30'}])assert.throws(()=>legacyCartDraft(config,{...f.snapshot,...patch},'gid://shopify/Product/456'));
});

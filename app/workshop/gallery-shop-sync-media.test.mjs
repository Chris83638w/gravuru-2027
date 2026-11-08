import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createGallerySyncImagePreparation,createGallerySyncBrowserRasterizer,createGallerySyncShopifyMedia} from './gallery-shop-sync-media.mjs';
import {galleryTestPng,galleryEditorDocument} from '../../scripts/fixtures/gallery-editor.mjs';
import {productPreview} from './product-preview.mjs';

const SHOP='isolated-gallery.myshopify.com',P='gid://shopify/Product/168',OTHER='gid://shopify/Product/169',I='gid://shopify/MediaImage/180',J='gid://shopify/MediaImage/181';
const hash=value=>createHash('sha256').update(value).digest('hex'),png=Buffer.from(galleryTestPng,'base64'),nextPng=Buffer.concat([png,Buffer.from('isolated-next-image')]);
const mapping={shopifyProductId:P,target:{designId:'source-a'},media:[{id:I}]},document=galleryEditorDocument();
const base={tenantId:'gravuru',shopDomain:SHOP,origin:'https://images.example.test',secret:'synthetic-test-key-with-at-least-32-bytes',renderPng:async()=>png};
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140"><path d="M0 0H220V140H0Z" fill="black"/></svg>';
function staging(t,options={}){const s=createGallerySyncImagePreparation({...base,filename:':memory:',...options});t.after(()=>s.close());return s;}
function remote(t,{shared=false,nested=false,delayed=false,neverReady=false,graphqlError=false,partial=false,badPage=false,originUrl,afterMutation}={}){
 const s=staging(t,{renderPng:async()=>nextPng}),calls=[],mutations=[],records=new Map([[I,{bytes:png,version:1}],[J,{bytes:Buffer.from('unrelated-original-image'),version:7}]]);let ticket=0,pending=false,poll=0;
 const product={id:P,media:{nodes:[{id:I,status:'READY',image:{url:'https://cdn.shopify.com/i.png?v=1'}},{id:J,status:'READY',image:{url:'https://cdn.shopify.com/j.png?v=7'}},{id:'gid://shopify/Video/1',status:'READY'}],pageInfo:{hasNextPage:false}}};
 function file(id){const row=records.get(id);return {id,__typename:'MediaImage',fileStatus:'READY',status:'READY',mimeType:'image/png',originalSource:{url:originUrl||`https://cdn.shopify.com/source/${id.split('/').at(-1)}?ticket=${++ticket}`,fileSize:row.bytes.length},image:{url:`https://cdn.shopify.com/${id===I?'i':'j'}.png?v=${row.version}`}};}
 async function graphql(query,v){
  calls.push({query,variables:structuredClone(v)});if(graphqlError)return {errors:[{message:'isolated schema/transport error'}]};
  if(query.includes('query GallerySyncImageFiles')){
   if(pending){poll++;if(!neverReady&&(!delayed||poll>=3)){pending=false;records.set(I,{bytes:nextPng,version:2});}}
   const nodes=v.ids.map(file);if(pending&&delayed&&poll===2)for(const n of nodes)if(n.id===I)n.fileStatus=n.status='PROCESSING';
   return {data:{shop:{myshopifyDomain:SHOP},nodes}};
  }
  if(query.includes('query GallerySyncImageOwners')){
   const pageInfo={hasNextPage:!v.after,endCursor:v.after?'done':'products-2'};
   const entry=v.after?{id:OTHER,media:{nodes:shared&&!nested?[{id:I}]:[],pageInfo:{hasNextPage:shared&&nested,endCursor:'media-2'}}}:{id:P,media:{nodes:[{id:I},{id:J}],pageInfo:{hasNextPage:false}}};
   if(badPage)pageInfo.endCursor=null;
   return {shop:{myshopifyDomain:SHOP},products:{nodes:[entry],pageInfo}};
  }
  if(query.includes('query GallerySyncImageOwnerMedia'))return {product:{id:OTHER,media:{nodes:[{id:I}],pageInfo:{hasNextPage:false,endCursor:'media-end'}}}};
  if(query.includes('mutation GallerySyncImageUpdate')){
   mutations.push(structuredClone(v));pending=true;poll=0;afterMutation?.(records);
   return {data:{fileUpdate:{files:partial?[]:v.files.map(f=>({id:f.id})),userErrors:[]}}};
  }
  throw Error('Unexpected GraphQL operation');
 }
 const fetchCalls=[];
 async function fetchImpl(url,options){fetchCalls.push({url,options});const id=url.includes('/source/180')?I:J;return new Response(records.get(id).bytes,{status:200,headers:{'Content-Length':String(records.get(id).bytes.length),'Content-Type':'image/png'}});}
 const adapter=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql,staging:s,writesEnabled:true,dedicatedProductFiles:true,fetchImpl,wait:async()=>{},pollAttempts:4});
 const baseline=async()=>({id:P,shopDomain:SHOP,media:await adapter.inspect(product)});
 return {s,product,calls,mutations,fetchCalls,records,graphql,fetchImpl,adapter,baseline,images:()=>s.prepareImage({mapping,document,afterSvg:svg})};
}

test('native preview staging is immutable, capability-scoped and durable; no original photo/SVG route exists',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gallery-image-stage-')),handles=[];t.after(()=>{for(const h of handles)h.close();const rel=relative(resolve(tmpdir()),resolve(dir));assert.ok(!isAbsolute(rel)&&/^gallery-image-stage-[^\\/]+$/.test(rel));rmSync(dir,{recursive:true,force:true});});const filename=join(dir,'images.sqlite');
 let rendered;const store=createGallerySyncImagePreparation({...base,filename,renderPng:async value=>{rendered=value;return png;}});
 const images=await store.prepareImage({mapping,document,afterSvg:svg});assert.equal(rendered,svg);assert.equal(images[0].id,I);assert.equal(images[0].sha256,hash(png));
 const pathname=new URL(images[0].url).pathname;assert.equal(store.matches(pathname),true);assert.deepEqual(store.read(pathname),png);assert.deepEqual(store.verify(images[0]),png);
 assert.equal((await store.prepareImage({mapping,document,afterSvg:svg}))[0].url,images[0].url);
 for(const invalid of [pathname.replace(/.$/,'x'),'/api/workshop/design-assets/anything/original',pathname+'/../original.svg'])assert.throws(()=>store.read(invalid),e=>e.status===404);
 assert.throws(()=>store.verify({...images[0],url:'https://evil.example.test'+pathname}),e=>e.code==='gallery_media_staging_mismatch');
 store.close();const reopened=createGallerySyncImagePreparation({...base,filename});handles.push(reopened);assert.deepEqual(reopened.read(pathname),png);
 const other=createGallerySyncImagePreparation({...base,filename,tenantId:'another-tenant'}),otherShop=createGallerySyncImagePreparation({...base,filename,shopDomain:'another-shop.myshopify.com'});handles.push(other,otherShop);assert.throws(()=>other.read(pathname),e=>e.status===404);assert.throws(()=>otherShop.read(pathname),e=>e.status===404);
 const db=new DatabaseSync(filename);handles.push(db);assert.throws(()=>db.exec("UPDATE gallery_sync_product_images SET png=X'00'"),/immutable/);
 const row=db.prepare('SELECT * FROM gallery_sync_product_images').get();assert.deepEqual(Object.keys(row),['scope','sha256','png']);assert.deepEqual(Buffer.from(row.png),png);
});

test('staging refuses invalid mapping, missing native design, unconfigured origins and malformed PNG',async t=>{
 const s=staging(t);await assert.rejects(s.prepareImage({mapping:{...mapping,media:[{id:'unassigned'}]},document,afterSvg:svg}),e=>e.code==='gallery_media_mapping');
 await assert.rejects(s.prepareImage({mapping,document:{config:{profile:{designs:[]}}},afterSvg:svg}),e=>e.code==='gallery_media_source');
 const invalid=staging(t,{renderPng:async()=>Buffer.from('<svg/>')});await assert.rejects(invalid.prepareImage({mapping,document,afterSvg:svg}),e=>e.code==='gallery_media_png');
 for(const origin of ['http://images.example.test','https://images.example.test/path','https://u:p@images.example.test'])assert.throws(()=>createGallerySyncImagePreparation({...base,filename:':memory:',origin}),e=>e.code==='gallery_media_origin');
});

test('inspect proves original bytes, not transcoded CDN bytes; short-lived URLs never enter stable baseline',async t=>{
 const f=remote(t),a=await f.baseline(),b=await f.baseline();assert.deepEqual(a,b);assert.equal(a.media[0].sha256,hash(png));assert.equal(a.media[1].sha256,hash(Buffer.from('unrelated-original-image')));
 assert.deepEqual(a.media[2],{id:'gid://shopify/Video/1',status:'READY',url:null});assert.equal(f.fetchCalls.length,4);assert.notEqual(f.fetchCalls[0].url,f.fetchCalls[2].url);
 assert.equal(f.fetchCalls.every(c=>c.url.includes('/source/')&&c.options.redirect==='error'),true);assert.doesNotMatch(JSON.stringify(a),/ticket/);
});

test('default-off and non-dedicated file connections cannot write or scan',async t=>{
 const f=remote(t),images=await f.images();let calls=0;
 const disabled=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql:async()=>{calls++;},staging:f.s});
 await assert.rejects(disabled.apply({mapping,images}),e=>e.code==='gallery_media_live_disabled');assert.equal(calls,0);
 const unconfirmed=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql:async()=>{calls++;},staging:f.s,writesEnabled:true});
 await assert.rejects(unconfirmed.apply({mapping,images}),e=>e.code==='gallery_media_ownership_policy');assert.equal(calls,0);
});

test('specific existing ID update retains unrelated media, waits past stale READY, and verifies fresh original SHA',async t=>{
 const f=remote(t,{delayed:true}),baseline=await f.baseline(),images=await f.images(),unrelated={...f.records.get(J),bytes:Buffer.from(f.records.get(J).bytes)};
 const result=await f.adapter.apply({mapping,baseline,images});assert.equal(f.mutations.length,1);
 assert.deepEqual(f.mutations[0],{files:[{id:I,originalSource:images[0].url}]});assert.equal(result[0].sha256,images[0].sha256);assert.match(result[0].url,/v=2$/);
 assert.deepEqual(f.records.get(J),unrelated);assert.equal(f.calls.filter(c=>c.query.includes('query GallerySyncImageOwners')).length,4,'complete pagination before and after the write');
 const filesAfter=f.calls.slice(f.calls.findIndex(c=>c.query.includes('mutation'))+1).filter(c=>c.query.includes('query GallerySyncImageFiles'));assert.equal(filesAfter.length,3,'stale READY and PROCESSING do not count as a successful content update');
 const completed=await f.baseline();await f.adapter.apply({mapping,baseline:completed,images});assert.equal(f.mutations.length,1,'an already matching file is not written again');
});

test('shared file on a later product page and nested media page is blocked before mutation',async t=>{
 for(const nested of [false,true]){
  const f=remote(t,{shared:true,nested});await assert.rejects(f.adapter.apply({mapping,baseline:await f.baseline(),images:await f.images()}),e=>e.code==='gallery_media_shared');assert.equal(f.mutations.length,0);
  assert.equal(f.calls.some(c=>c.variables.after==='products-2'),true);if(nested)assert.equal(f.calls.some(c=>c.variables.after==='media-2'),true);
 }
});

test('incomplete ownership page and catalogue scan limit block before mutation',async t=>{
 const f=remote(t,{badPage:true});await assert.rejects(f.adapter.apply({mapping,baseline:await f.baseline(),images:await f.images()}),e=>e.code==='gallery_media_ownership_incomplete');assert.equal(f.mutations.length,0);
 const g=remote(t),small=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql:g.graphql,staging:g.s,writesEnabled:true,dedicatedProductFiles:true,fetchImpl:g.fetchImpl,maxProducts:1});
 await assert.rejects(small.apply({mapping,baseline:await g.baseline(),images:await g.images()}),e=>e.code==='gallery_media_scan_limit');assert.equal(g.mutations.length,0);
});

test('changed image, replaced staging URL and unassigned media IDs cannot bypass the fixed plan',async t=>{
 const f=remote(t),baseline=await f.baseline(),images=await f.images();f.records.get(I).bytes=Buffer.from('parallel edit');
 await assert.rejects(f.adapter.apply({mapping,baseline,images}),e=>e.code==='gallery_media_changed');assert.equal(f.mutations.length,0);
 await assert.rejects(f.adapter.apply({mapping,baseline,images:[{...images[0],id:J}]}),e=>e.code==='gallery_media_mapping');
 await assert.rejects(f.adapter.apply({mapping,baseline,images:[{...images[0],url:'https://other.example.test/replaced.png'}]}),e=>e.code==='gallery_media_staging_mismatch');assert.equal(f.mutations.length,0);
});

test('timeout and partial mutation remain unresolved; adapter never retries a write',async t=>{
 const f=remote(t,{neverReady:true});await assert.rejects(f.adapter.apply({mapping,baseline:await f.baseline(),images:await f.images()}),e=>e.code==='gallery_media_update_pending');assert.equal(f.mutations.length,1);
 const partial=remote(t,{partial:true});await assert.rejects(partial.adapter.apply({mapping,baseline:await partial.baseline(),images:await partial.images()}),e=>e.code==='gallery_media_update');assert.equal(partial.mutations.length,1);
});

test('GraphQL errors, unavailable/foreign originals and incomplete byte downloads fail closed',async t=>{
 const f=remote(t,{graphqlError:true});await assert.rejects(f.adapter.inspect(f.product),e=>e.code==='gallery_media_graphql');
 const foreign=remote(t,{originUrl:'https://unknown-storage.example.test/image.png'});await assert.rejects(foreign.adapter.inspect(foreign.product),e=>e.code==='gallery_media_original_origin');assert.equal(foreign.fetchCalls.length,0);
 const g=remote(t),short=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql:g.graphql,staging:g.s,fetchImpl:async()=>new Response('short',{status:200})});
 await assert.rejects(short.inspect(g.product),e=>e.code==='gallery_media_original_size');
 const expired=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql:g.graphql,staging:g.s,fetchImpl:async()=>new Response('expired',{status:403})});await assert.rejects(expired.inspect(g.product),e=>e.code==='gallery_media_original_read');
});

test('concurrent writes through one adapter are rejected while staging proof is pending',async t=>{
 const f=remote(t),baseline=await f.baseline(),images=await f.images();let release;const held=new Promise(r=>{release=r;});
 const adapter=createGallerySyncShopifyMedia({shopDomain:SHOP,graphql:f.graphql,staging:{verify:async image=>{await held;return f.s.verify(image);}},writesEnabled:true,dedicatedProductFiles:true,fetchImpl:f.fetchImpl,wait:async()=>{}});
 const first=adapter.apply({mapping,baseline,images});await assert.rejects(adapter.apply({mapping,baseline,images}),e=>e.code==='gallery_media_busy');release();await first;assert.equal(f.mutations.length,1);
});

// Explicit local opt-in for a real isolated browser. The production bootstrap
// supplies its own managed Chromium; neither test nor factory uses user tabs.
test('real offline Chromium rasterizes native text/plate/photos and rejects external SVG resources', {skip:!process.env.GRAVURU_PLAYWRIGHT_MODULE},async t=>{
 const {chromium}=await import(pathToFileURL(process.env.GRAVURU_PLAYWRIGHT_MODULE).href),browser=await chromium.launch({headless:true,...(process.env.GRAVURU_CHROMIUM_EXECUTABLE?{executablePath:process.env.GRAVURU_CHROMIUM_EXECUTABLE}:{})});t.after(()=>browser.close());
 const raster=createGallerySyncBrowserRasterizer({browser,maxSide:440}),preview=productPreview({universal:document.config},{designId:'source-a'}),native=await raster(preview);
 assert.equal(native.readUInt32BE(16),440);assert.ok(native.length>1000,'native text glyphs and material gradient are rasterized');
 const photo=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140"><defs><clipPath id="oval"><ellipse cx="110" cy="70" rx="45" ry="60"/></clipPath></defs><rect width="220" height="140" fill="#323232"/><image href="data:image/png;base64,${galleryTestPng}" x="60" y="10" width="100" height="120" preserveAspectRatio="xMidYMid meet" clip-path="url('#oval')"/></svg>`;
 const photoPng=await raster(photo);assert.equal(photoPng.readUInt32BE(16),440);assert.equal(photoPng.readUInt32BE(20),280);assert.notEqual(hash(photoPng),hash(native));
 const withGuide=photo.replace('</svg>','<g data-m-design-area="true"><rect width="220" height="140" fill="red"/></g></svg>');assert.deepEqual(await raster(withGuide),photoPng,'editor-only limit cannot cover product image');
 await assert.rejects(raster(photo.replace('data:image/png;base64,'+galleryTestPng,'https://external.example.test/private-photo.png')),e=>e.code==='gallery_media_render');
 const nested=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://external.example.test/hidden.png"/></svg>').toString('base64');await assert.rejects(raster(photo.replace('data:image/png;base64,'+galleryTestPng,'data:image/svg+xml;base64,'+nested)),e=>e.code==='gallery_media_render');
});

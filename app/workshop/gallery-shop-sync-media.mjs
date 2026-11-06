import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {requireTenant,SHOP_DOMAIN} from './tenant.mjs';
import {queueGalleryPreview} from './shop-gallery-preview-queue.mjs';

const BASE='/galerie-produktbilder/',IMAGE=/^gid:\/\/shopify\/MediaImage\/[1-9][0-9]*$/,PRODUCT=/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/,SHA=/^[a-f0-9]{64}$/;
const MAX_BYTES=20*1024*1024,PNG=Buffer.from([137,80,78,71,13,10,26,10]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(code,message,status=422)=>{throw Object.assign(Error(message),{code,status});};
function origin(value){
 let url;try{url=new URL(value);}catch{};
 if(!url||url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)fail('gallery_media_origin','Eine feste öffentliche HTTPS-Adresse für die Produktbilder fehlt.');
 return url.origin;
}
function pngBytes(value){
 const bytes=Buffer.from(value);
 if(bytes.length<33||bytes.length>MAX_BYTES||!bytes.subarray(0,8).equals(PNG)||bytes.toString('ascii',12,16)!=='IHDR')fail('gallery_media_png','Die gerenderte Produktvorschau ist kein gültiges PNG bis 20 MB.');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
 if(!w||!h||w>4096||h>4096||w*h>16777216)fail('gallery_media_png','Die Produktvorschau überschreitet die zulässige Bildgröße.');
 return bytes;
}
function mediaIds(mapping){
 const ids=mapping?.media?.map(m=>m?.id);
 if(!PRODUCT.test(mapping?.shopifyProductId||'')||!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>!IMAGE.test(id))||new Set(ids).size!==ids.length)
  fail('gallery_media_mapping','Eindeutig zugeordnete bestehende Shopify-Produktbilder fehlen.');
 return ids;
}

/** Only the native, already resolved product-preview SVG is rasterized. No
 * second plate/layout/font renderer and no customer-editor changes. The existing
 * browser exports (commerce-export.mjs/shop-cart.mjs) use the same Image→Canvas
 * path. No exported server raster function exists; a server-owned Chromium
 * browser must be supplied explicitly. No user browser/profile is attached.
 */
export function createGallerySyncBrowserRasterizer({browser,maxSide=1800,timeoutMs=20000}={}){
 if(typeof browser?.newContext!=='function'||!Number.isInteger(maxSide)||maxSide<128||maxSide>4096||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)
  fail('gallery_media_renderer','Ein isolierter serverseitiger Browser für die Produktvorschau fehlt.',503);
 return svg=>queueGalleryPreview(async()=>{
  if(typeof svg!=='string'||!svg.length||Buffer.byteLength(svg)>30*1024*1024)fail('gallery_media_svg','Die native Produktvorschau fehlt oder ist zu groß.');
  const context=await browser.newContext({offline:true,serviceWorkers:'block'});let timer;
  try{
   await context.route('**/*',route=>route.abort());const page=await context.newPage();
   const work=page.evaluate(async({svg,maxSide})=>{
    const externalCss=value=>/@import/i.test(value)||[...value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)].some(m=>!(m[1]??m[2]??m[3]).trim().startsWith('#'));
    function read(source,depth=0){
     if(depth>8||/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('Nicht unterstützte SVG-Ressource.');
     const doc=new DOMParser().parseFromString(source,'image/svg+xml');
     if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Ungültige SVG-Vorschau.');
     for(const node of doc.querySelectorAll('*')){
      if(['script','foreignObject','iframe','object','embed','animate','animateTransform','animateMotion','set'].includes(node.localName))throw Error('Aktive Vorschau ist nicht erlaubt.');
      for(const a of node.attributes){
       if(/^on/i.test(a.name))throw Error('Aktive Vorschau ist nicht erlaubt.');
       if(['href','src'].includes(a.localName)){
        if(a.value.startsWith('#'))continue;
        const image=/^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(a.value);
        if(!image)throw Error('Eine Bildressource ist nicht vollständig eingebettet.');
        if(image[1]==='svg+xml')read(new TextDecoder().decode(Uint8Array.from(atob(image[2]),c=>c.charCodeAt(0))),depth+1);
       }
       if(externalCss(a.value))throw Error('Externe SVG-Ressource ist nicht erlaubt.');
      }
      if(node.localName==='style'&&externalCss(node.textContent))throw Error('Externe SVG-Ressource ist nicht erlaubt.');
     }
     return doc;
    }
    const doc=read(svg),root=doc.documentElement,box=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
    if(box.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0)throw Error('Maßhaltige Produktvorschau fehlt.');
    // Editor-only dashed limits never become a product image. Hardware, the
    // material, photo masks and actual design guide objects stay untouched.
    for(const node of root.querySelectorAll('[data-m-design-area],[data-m-keepout]'))node.remove();
    const scale=maxSide/Math.max(box[2],box[3]),width=Math.max(1,Math.round(box[2]*scale)),height=Math.max(1,Math.round(box[3]*scale));
    root.setAttribute('width',String(width));root.setAttribute('height',String(height));
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));
    try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0,width,height);return canvas.toDataURL('image/png').split(',')[1];}
    finally{URL.revokeObjectURL(url);}
   },{svg,maxSide});
   const encoded=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Die Bildvorschau dauert zu lange.'),{code:'gallery_media_render_timeout',status:503})),timeoutMs);})]);
   return pngBytes(Buffer.from(encoded,'base64'));
  }catch(error){if(error.code)throw error;fail('gallery_media_render','Die native Produktvorschau konnte nicht vollständig gerendert werden.',422);}
  finally{clearTimeout(timer);await context.close();}
 });
}

/** Same immutable PNG capability pattern as customer-design-image.mjs, but a
 * separate scope: only rendered native product previews enter this store. Never
 * expose original uploads, editable SVGs, review archives or customer snapshots.
 * Mount matches/read ONLY as GET/HEAD with image/png and nosniff; configuration
 * and prepareImage remain private. No Shopify mutation happens during prepare.
 */
export function createGallerySyncImagePreparation({filename,tenantId,shopDomain,origin:publicOrigin,secret,renderPng}={}){
 const tenant=requireTenant({tenantId}),baseOrigin=origin(publicOrigin);
 if(!SHOP_DOMAIN.test(shopDomain||'')||!filename||typeof renderPng!=='function'||!secret||Buffer.byteLength(secret)<32)fail('gallery_media_staging','Private Produktbild-Ablage, Renderer, Shop und Signierschlüssel müssen serverseitig eingerichtet sein.',503);
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename),scope=JSON.stringify([tenant,shopDomain]);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS gallery_sync_product_images(scope TEXT NOT NULL,sha256 TEXT NOT NULL,png BLOB NOT NULL,PRIMARY KEY(scope,sha256));
 CREATE TRIGGER IF NOT EXISTS gallery_sync_product_images_immutable BEFORE UPDATE ON gallery_sync_product_images BEGIN SELECT RAISE(ABORT,'immutable product preview');END;`);
 const tag=sha=>createHmac('sha256',secret).update(JSON.stringify(['gravuru-gallery-product-image/v1',tenant,shopDomain,sha])).digest('hex');
 const path=sha=>BASE+tenant+'/'+sha+'/'+tag(sha)+'.png';
 function read(pathname){
  const m=typeof pathname==='string'&&/^\/galerie-produktbilder\/([a-z0-9][a-z0-9-]{0,39})\/([a-f0-9]{64})\/([a-f0-9]{64})\.png$/.exec(pathname);
  if(!m||m[1]!==tenant||!timingSafeEqual(Buffer.from(m[3]),Buffer.from(tag(m[2]))))fail('gallery_media_missing','Produktbild nicht gefunden.',404);
  const row=db.prepare('SELECT png FROM gallery_sync_product_images WHERE scope=? AND sha256=?').get(scope,m[2]);
  if(!row)fail('gallery_media_missing','Produktbild nicht gefunden.',404);const png=pngBytes(row.png);
  if(hash(png)!==m[2])fail('gallery_media_integrity','Die gesicherte Produktvorschau hat eine abweichende Prüfsumme.',409);
  return png;
 }
 function verify(image){
  let url;try{url=new URL(image?.url);}catch{}
  if(!SHA.test(image?.sha256||'')||!url||url.origin!==baseOrigin||url.username||url.password||url.search||url.hash||url.pathname!==path(image.sha256))fail('gallery_media_staging_mismatch','Das Produktbild gehört nicht zur gesicherten serverseitigen Vorschau.',409);
  return read(url.pathname);
 }
 async function prepareImage({mapping,document,afterSvg}={}){
  const ids=mediaIds(mapping);
  if(!document?.config?.profile?.designs?.some(d=>d.id===mapping.target?.designId)||typeof afterSvg!=='string')fail('gallery_media_source','Die zugeordnete native Produktvorlage fehlt.');
  const png=pngBytes(await renderPng(afterSvg)),sha256=hash(png);
  db.prepare('INSERT OR IGNORE INTO gallery_sync_product_images(scope,sha256,png) VALUES(?,?,?)').run(scope,sha256,png);
  const url=baseOrigin+path(sha256);return ids.map(id=>({id,sha256,url}));
 }
 return Object.freeze({prepareImage,read,verify,matches:pathname=>typeof pathname==='string'&&pathname.startsWith(BASE+tenant+'/'),close:()=>db.close()});
}

const FILE_FIELDS='id __typename ... on MediaImage {fileStatus status mimeType originalSource{url fileSize} image{url}}';
const FILES_QUERY=`query GallerySyncImageFiles($ids:[ID!]!){shop{myshopifyDomain}nodes(ids:$ids){${FILE_FIELDS}}}`;
const OWNERS_QUERY=`query GallerySyncImageOwners($after:String){shop{myshopifyDomain}products(first:20,after:$after){nodes{id media(first:20){nodes{id}pageInfo{hasNextPage endCursor}}}pageInfo{hasNextPage endCursor}}}`;
const MORE_MEDIA_QUERY=`query GallerySyncImageOwnerMedia($id:ID!,$after:String){product(id:$id){id media(first:100,after:$after){nodes{id}pageInfo{hasNextPage endCursor}}}}`;
const UPDATE_MUTATION=`mutation GallerySyncImageUpdate($files:[FileUpdateInput!]!){fileUpdate(files:$files){files{id}userErrors{field code message}}}`;

/** Admin 2026-07: fileUpdate replaces a global File's bytes. Therefore a full
 * product/media ownership scan precedes the mutation. Shared IDs, incomplete
 * reads, missing originals and changed baselines fail closed. No media-list,
 * references, filenames, alt texts or variant assignments are ever rewritten.
 *
 * Shopify has no compareDigest for fileUpdate or inverse product-reference field.
 * The scan is not an atomic lock against OTHER apps adding a reference; deployment
 * must serialize managed-file writes and use dedicated product images. References
 * in descriptions/themes/external pages cannot be discovered by Product.media.
 * A deliberate server-side dedicatedProductFiles=true attests that prerequisite.
 * Docs: https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileUpdate
 * https://shopify.dev/docs/api/admin-graphql/2026-07/objects/MediaImageOriginalSource
 */
export function createGallerySyncShopifyMedia({shopDomain,graphql,staging,writesEnabled=false,dedicatedProductFiles=false,
 fetchImpl=fetch,originalSourceOrigins=['https://cdn.shopify.com'],wait=delay,maxProducts=10000,maxMediaPages=1000,pollAttempts=12,pollMs=750}={}){
 if(!SHOP_DOMAIN.test(shopDomain||'')||typeof graphql!=='function'||typeof staging?.verify!=='function'||typeof fetchImpl!=='function'||!Array.isArray(originalSourceOrigins)||!originalSourceOrigins.length)
  fail('gallery_media_configuration','Der private Shopify-Bildanschluss ist unvollständig.',503);
 const allowed=new Set(originalSourceOrigins.map(origin));let writing=false;
 if(![maxProducts,maxMediaPages,pollAttempts].every(v=>Number.isInteger(v)&&v>0)||pollAttempts>60||!Number.isInteger(pollMs)||pollMs<0||pollMs>5000)fail('gallery_media_limits','Die technischen Grenzen des Bildanschlusses sind ungültig.');
 async function call(query,variables){const response=await graphql(query,variables);if(response?.errors?.length)fail('gallery_media_graphql','Shopify hat die vollständige Bildprüfung nicht bestätigt.',502);const data=response?.data??response;if(!data||typeof data!=='object')fail('gallery_media_graphql','Die Shopify-Bildantwort fehlt.',502);return data;}
 function shop(data){if(data.shop?.myshopifyDomain!==shopDomain)fail('gallery_media_shop','Die Bilder gehören nicht zum fest zugeordneten Shop.',409);}
 async function originalBytes(file){
  let url;try{url=new URL(file.originalSource?.url);}catch{}
  if(!url||!allowed.has(url.origin)||url.protocol!=='https:'||url.username||url.password||url.hash)fail('gallery_media_original_origin','Die Originalbild-Adresse benötigt eine geprüfte serverseitige Freigabe.',503);
  const expected=file.originalSource.fileSize;if(!Number.isSafeInteger(expected)||expected<1||expected>MAX_BYTES)fail('gallery_media_original_size','Die Originaldatei fehlt oder überschreitet 20 MB.');
  const response=await fetchImpl(url.href,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'image/*','Cache-Control':'no-cache'}});
  if(!response.ok||!response.body||response.redirected)fail('gallery_media_original_read','Die aktuelle Shopify-Originaldatei konnte nicht gelesen werden.',502);
  const declared=response.headers.get('content-length');if(declared!==null&&Number(declared)>MAX_BYTES)fail('gallery_media_original_size','Die Originaldatei überschreitet 20 MB.');
  const reader=response.body.getReader(),parts=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES)fail('gallery_media_original_size','Die Originaldatei überschreitet 20 MB.');parts.push(Buffer.from(value));}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  if(length!==expected)fail('gallery_media_original_size','Die Originaldatei stimmt nicht mit dem vollständigen Shopify-Beleg überein.',409);
  return Buffer.concat(parts);
 }
 async function files(ids){
  const data=await call(FILES_QUERY,{ids});shop(data);
  if(!Array.isArray(data.nodes)||data.nodes.length!==ids.length||data.nodes.some((f,i)=>f?.id!==ids[i]||f.__typename!=='MediaImage'))fail('gallery_media_files','Ein zugeordnetes Shopify-Bild fehlt oder hat einen anderen Typ.',409);
  return data.nodes;
 }
 async function proof(file){
  if(file.fileStatus!=='READY'||file.status!=='READY'||!file.image?.url)fail('gallery_media_pending','Shopify verarbeitet ein Produktbild noch.',409);
  let imageUrl;try{imageUrl=new URL(file.image.url);}catch{}
  if(!imageUrl||imageUrl.protocol!=='https:'||imageUrl.username||imageUrl.password)fail('gallery_media_url','Die aktuelle Shopify-Bildadresse fehlt.',409);
  return {id:file.id,status:file.status,sha256:hash(await originalBytes(file)),url:imageUrl.href};
 }
 async function inspect(product){
  if(!PRODUCT.test(product?.id||'')||!Array.isArray(product.media?.nodes)||product.media?.pageInfo?.hasNextPage)fail('gallery_media_product','Die vollständige Produkt-Medienliste fehlt.',409);
  const ids=product.media.nodes.filter(m=>IMAGE.test(m.id)).map(m=>m.id);
  if(new Set(ids).size!==ids.length||ids.length>100)fail('gallery_media_files','Die Bildliste ist doppelt oder zu groß.',409);
  const inspected=new Map();if(ids.length)for(const file of await files(ids))inspected.set(file.id,await proof(file));
  return product.media.nodes.map(m=>inspected.get(m.id)||{id:m.id,status:m.status,url:m.image?.url??null});
 }
 function page(connection,seen){
  if(!Array.isArray(connection?.nodes)||typeof connection.pageInfo?.hasNextPage!=='boolean')fail('gallery_media_ownership_incomplete','Shopify hat die Bildzuordnungen nicht vollständig geliefert.',409);
  const {hasNextPage,endCursor}=connection.pageInfo;
  if(hasNextPage&&(typeof endCursor!=='string'||!endCursor||seen.has(endCursor)))fail('gallery_media_ownership_incomplete','Die Bildzuordnungen konnten nicht vollständig durchlaufen werden.',409);
  if(hasNextPage)seen.add(endCursor);return hasNextPage?endCursor:null;
 }
 async function assertExclusive(mapping,ids){
  const owners=new Map(ids.map(id=>[id,new Set()])),products=new Set(),cursors=new Set();let after=null,mediaPages=0;
  function record(p){if(!PRODUCT.test(p.id))fail('gallery_media_ownership_incomplete','Eine Produktzuordnung ist ungültig.',409);for(const m of p.media.nodes)owners.get(m.id)?.add(p.id);}
  do{
   const data=await call(OWNERS_QUERY,{after});shop(data);const next=page(data.products,cursors);
   for(const p of data.products.nodes){
    if(products.has(p.id)||products.size>=maxProducts)fail('gallery_media_scan_limit','Der vollständige Produktbild-Abgleich überschreitet seine technische Grenze.',409);products.add(p.id);
    const seen=new Set();let more=page(p.media,seen);record(p);
    while(more){if(++mediaPages>maxMediaPages)fail('gallery_media_scan_limit','Der vollständige Produktbild-Abgleich überschreitet seine technische Grenze.',409);const d=await call(MORE_MEDIA_QUERY,{id:p.id,after:more});if(d.product?.id!==p.id)fail('gallery_media_ownership_incomplete','Eine Produktzuordnung fehlt.',409);more=page(d.product.media,seen);record(d.product);}
   }
   after=next;
  }while(after);
  for(const set of owners.values())if(set.size!==1||!set.has(mapping.shopifyProductId))fail('gallery_media_shared','Ein zugeordnetes Bild wird von einem anderen Produkt verwendet oder ist nicht mehr eindeutig zugeordnet.',409);
 }
 async function apply({mapping,baseline,images}={}){
  if(!writesEnabled)fail('gallery_media_live_disabled','Shopify-Bildänderungen sind für diesen Anschluss deaktiviert.',403);
  if(!dedicatedProductFiles)fail('gallery_media_ownership_policy','Für diesen Anschluss müssen ausschließlich eigene, nicht anderweitig eingebundene Produktdateien bestätigt sein.',503);
  if(writing)fail('gallery_media_busy','Eine Bildänderung wird gerade geprüft.',409);
  const ids=mediaIds(mapping);
  if(baseline?.id!==mapping.shopifyProductId||baseline.shopDomain!==shopDomain||!Array.isArray(images)||images.length!==ids.length||new Set(images.map(i=>i.id)).size!==ids.length||images.some(i=>!ids.includes(i.id)||!SHA.test(i.sha256||'')))fail('gallery_media_mapping','Bildplan und feste Shopify-Zuordnung widersprechen sich.');
  writing=true;
  try{
   for(const image of images)if(hash(await staging.verify(image))!==image.sha256)fail('gallery_media_staging_mismatch','Die gesicherte Bildfassung stimmt nicht mit dem bestätigten Plan überein.',409);
   await assertExclusive(mapping,ids);
   const current=[];for(const f of await files(ids))current.push(await proof(f));
   if(current.some(f=>{const before=baseline.media?.find(m=>m.id===f.id);return !before||before.sha256!==f.sha256||before.url!==f.url||before.status!==f.status;}))fail('gallery_media_changed','Ein Produktbild wurde seit der bestätigten Vorschau verändert.',409);
   const changed=images.filter(i=>current.find(f=>f.id===i.id).sha256!==i.sha256);
   if(!changed.length)return current;
   // Never retry a mutation: caller journals the operation as unknown before
   // entering here and reconciles exact bytes after a timeout/partial response.
   const data=await call(UPDATE_MUTATION,{files:changed.map(i=>({id:i.id,originalSource:i.url}))});
   if(!data.fileUpdate||!Array.isArray(data.fileUpdate.userErrors)||data.fileUpdate.userErrors.length||!Array.isArray(data.fileUpdate.files)||changed.some(i=>!data.fileUpdate.files.some(f=>f.id===i.id)))fail('gallery_media_update','Shopify hat die gezielte Bildänderung nicht vollständig bestätigt.',502);
   for(let attempt=0;attempt<pollAttempts;attempt++){
    const result=[];let pending=false;
    for(const file of await files(ids)){
     if(file.fileStatus==='FAILED'||file.status==='FAILED')fail('gallery_media_update','Shopify konnte das neue Produktbild nicht verarbeiten.',502);
     if(file.fileStatus!=='READY'||file.status!=='READY'){pending=true;continue;}
     const p=await proof(file);result.push(p);if(p.sha256!==images.find(i=>i.id===p.id).sha256)pending=true;
    }
    if(!pending&&result.length===ids.length){await assertExclusive(mapping,ids);return result;}
    if(attempt+1<pollAttempts)await wait(pollMs);
   }
   fail('gallery_media_update_pending','Die neue Bildfassung ist noch nicht vollständig nachgewiesen. Den offenen Abgleich prüfen, nicht erneut hochladen.',409);
  }finally{writing=false;}
 }
 return Object.freeze({inspect,apply,canWrite:writesEnabled&&dedicatedProductFiles});
}

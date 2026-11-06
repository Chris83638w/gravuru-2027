// Read-only reconciliation of validated native slate groups with a Shopify export.
// No network, product writes, publication, or checkout activation in this command.
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {digest,validateBundle} from './slate-group-import.mjs';
import {slateVariantSku} from './slate-draft-plan.mjs';
import {compareProduct,indexExport,money,OPTION_NAME,SHOP_DOMAIN} from './shop-sync.mjs';

export const PLAN_SCHEMA='gravuru-slate-group-shop-plan/v1';
export const ALL_STATUSES=['ACTIVE','ARCHIVED','DRAFT','UNLISTED'];
export const PRODUCT_SET_OPERATION='mutation SlateGroupDraft($input:ProductSetInput!,$identifier:ProductSetIdentifiers){productSet(synchronous:true,input:$input,identifier:$identifier){product{id status} userErrors{field message}}}';
const fail=message=>{throw Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const optionKey=options=>JSON.stringify(Object.entries(options).sort(([a],[b])=>a.localeCompare(b)));
const gid=value=>typeof value==='string'&&/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(value);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));

// Resolve from the target database, never from a preparation's local cfg-ID.
export function readNativeRecords(bundle,filename){
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  if(db.prepare('PRAGMA user_version').get().user_version!==4)fail('Werkstatt-Schema 4 erforderlich.');
  const records={};
  for(const p of bundle.products){
   const journal=db.prepare('SELECT product_id FROM import_items WHERE tenant_id=? AND import_key=?').get(bundle.tenantId,p.key);
   if(!journal)continue;
   const row=db.prepare('SELECT p.id,p.revision,p.archived,r.document FROM products p JOIN product_revisions r ON p.id=r.product_id AND p.tenant_id=r.tenant_id AND p.revision=r.revision WHERE p.id=? AND p.tenant_id=?').get(journal.product_id,bundle.tenantId);
   if(!row||row.archived)fail('Importiertes Produkt fehlt oder ist archiviert: '+p.sourceDesignId);
   const document=JSON.parse(row.document);
   if(document.config.profile.id!==p.document.config.profile.id||digest(document)!==p.fingerprint)fail('Importierte Produktgruppe wurde verändert: '+p.sourceDesignId);
   records[p.key]={id:row.id,revision:row.revision,fingerprint:p.fingerprint};
  }
  return records;
 }finally{db.close();}
}

function fullInventory(doc){
 return doc.complete===true&&doc.coverage?.kind==='full-shop'&&same([...(doc.coverage.statuses??[])].sort(),ALL_STATUSES);
}
function normalizeInventory(doc){
 if(doc.shopDomain!==SHOP_DOMAIN||doc.currency!=='EUR')fail('Shopify-Export muss den gravuru-Shop und EUR belegen.');
 const seen=new Set();
 for(const p of doc.products??[]){
  if(!gid(p.id)||seen.has(p.id))fail('Produkt-ID im Export fehlt oder ist doppelt.');seen.add(p.id);
  if(p.variants?.pageInfo?.hasNextPage)fail('Variantenexport ist unvollständig: '+p.id);
 }
 return indexExport({...doc,products:(doc.products??[]).map(p=>({...p,options:(p.options??[]).map(o=>({...o,values:o.values??o.optionValues?.map(v=>v.name)??[]})),metafield:p.metafield??p.customizationId??null}))});
}
function mappedVariants(p,mapping){
 const groups=p.document.config.profile.optionGroups.map(g=>g.id);
 const explicit=new Map((mapping.variants??[]).map(v=>[optionKey(v.options),v.sku]));
 if(explicit.size!==(mapping.variants??[]).length)fail('Doppelte Optionszuordnung in der SKU-Karte.');
 return p.variants.map(v=>{
  const options=Object.fromEntries(groups.filter(g=>Object.hasOwn(v.options,g)).map(g=>[g,v.options[g]]));
  const sku=explicit.get(optionKey(options))??(mapping.skuBase?slateVariantSku(mapping.skuBase,options):null);
  if(sku!==null&&(typeof sku!=='string'||!sku.trim()||sku.trim()!==sku||sku.length>255))fail('Ungültige Artikelnummer in der Zuordnung.');
  return {...v,options,sku,mountingKey:options.mounting};
 });
}

export function planSlateShop(bundle,inventory,{mapping={},records={},generatedAt=new Date().toISOString()}={}){
 validateBundle(bundle);
 const ex=normalizeInventory(inventory),mapped=bundle.products.map(p=>({p,map:mapping[p.key]??{},variants:mappedVariants(p,mapping[p.key]??{})}));
 const plannedSkus=new Map();
 for(const {p,variants}of mapped)for(const v of variants)if(v.sku){const hits=plannedSkus.get(v.sku)??[];hits.push(p.key);plannedSkus.set(v.sku,hits);}
 const entries=mapped.map(({p,map,variants})=>{
  const conflicts=[],pending=[],bindingPending=[],changes=[],native=records[p.key]??null;
  if(!map.source||variants.some(v=>!v.sku))pending.push('Artikelnummern benötigen eine vollständige Zuordnung mit Quellenangabe.');
  if(new Set(variants.map(v=>v.label)).size!==variants.length)conflicts.push('Optionsbezeichnungen sind nicht eindeutig.');
  for(const v of variants){
   if(v.sku&&(plannedSkus.get(v.sku)?.length??0)>1)conflicts.push('Artikelnummer mehrfach im Importplan: '+v.sku);
   if(v.sku&&(ex.bySku.get(v.sku)?.length??0)>1)conflicts.push('Artikelnummer mehrfach im Shopify-Bestand: '+v.sku);
  }
  if(native&&(!/^cfg_[-a-zA-Z0-9]+$/.test(native.id)||!Number.isInteger(native.revision)||native.revision<1||native.fingerprint!==p.fingerprint))fail('Nativer Importnachweis passt nicht: '+p.sourceDesignId);
  if(!native)bindingPending.push('Konfi-Verknüpfung erst nach Import in die tatsächliche Werkstatt; der Shopify-Entwurf kann vorab angelegt werden.');
  const ids=new Set(variants.flatMap(v=>(ex.bySku.get(v.sku)??[]).map(h=>h.product.id)));
  for(const item of ex.products){
   if(item.handle===p.handle)ids.add(item.id);
   if(native&&[item.metafield?.value,item.konfiId?.value].includes(native.id))ids.add(item.id);
  }
  const expectedId=map.shopifyProductId??null;
  if(expectedId){if(!gid(expectedId))fail('Shopify-Produkt-ID in der Zuordnung ungültig.');ids.add(expectedId);}
  if(ids.size>1)conflicts.push('Produktkennung, Artikelnummern und Zuordnung zeigen auf mehrere Shopprodukte.');
  const shop=ids.size===1?ex.byId.get([...ids][0]):null;
  if(ids.size===1&&!shop)pending.push('Zugeordnetes Shopprodukt fehlt im Export; keine Ersatzanlage.');
  if(shop&&shop.status!=='DRAFT')conflicts.push('Bestehendes Produkt ist kein Entwurf: '+shop.status);
  if(shop&&native&&[shop.metafield?.value,shop.konfiId?.value].filter(Boolean).some(id=>id!==native.id))conflicts.push('Shopprodukt ist bereits mit einem anderen Konfigurator verbunden.');
  let rows=variants.map(v=>({...v,shopifyVariantId:null})),action=shop?'unchanged':'create';
  if(shop&&variants.every(v=>v.sku)){
   const cmp=compareProduct({variants,skuBase:map.skuBase??variants[0].sku,customizationId:null,designSha256:null},shop);
   conflicts.push(...cmp.conflicts);changes.push(...cmp.changes);
   rows=variants.map((v,i)=>({...v,shopifyVariantId:cmp.rows[i].shopifyVariantId}));
   action=changes.length?'update':'unchanged';
  }
  if(!shop&&!ids.size&&!fullInventory(inventory))pending.push('Neuanlage erst nach vollständigem Bestandsabgleich aller Produktstatus.');
  if(conflicts.length)action='conflict';else if(pending.length)action='pending';
  let operation=null;
  if(['create','update'].includes(action)){
   const existing=shop?.options.find(o=>o.name===OPTION_NAME);
   const input={...(!shop?{title:map.title??p.title,handle:p.handle,status:'DRAFT'}:{}),productOptions:[{...(existing?.id?{id:existing.id}:{}),name:OPTION_NAME,position:1,values:rows.map(v=>({name:v.label}))}],variants:rows.map((v,i)=>({...(v.shopifyVariantId?{id:v.shopifyVariantId}:{}),sku:v.sku,price:money(v.priceCents),position:i+1,optionValues:[{optionName:OPTION_NAME,name:v.label}],inventoryItem:{tracked:false,...(!v.shopifyVariantId?{requiresShipping:true}:{})}}))};
   // Metafields/media/collections are omitted: productSet replaces list fields.
   operation={query:PRODUCT_SET_OPERATION,variables:{input,...(shop?{identifier:{id:shop.id}}:{})}};
  }
  return {key:p.key,sourceDesignId:p.sourceDesignId,profileId:p.document.config.profile.id,sourceFingerprint:p.fingerprint,defaultDesignId:p.defaultDesignId,designCount:p.designIds.length,mainImage:p.mainImage,skuSource:map.source??null,native,shopify:shop?{id:shop.id,handle:shop.handle,status:shop.status}:null,action,conflicts:[...new Set(conflicts)],pending,bindingPending,changes,variants:rows,operation};
 });
 return {schema:PLAN_SCHEMA,mode:'read-only',shopDomain:SHOP_DOMAIN,currency:'EUR',generatedAt,bundleSha256:digest(bundle),inventory:{exportedAt:inventory.exportedAt??null,complete:fullInventory(inventory),products:ex.products.length},counts:Object.fromEntries(['create','update','unchanged','conflict','pending'].map(a=>[a,entries.filter(e=>e.action===a).length])),entries,shopifyWrites:0};
}

// Feed these selections into the existing checkSelections/applyChecks path only
// after a fresh Shopify read. Colours remain part of the native options object.
export function slateBindingSelections(plan){
 if(plan?.schema!==PLAN_SCHEMA)fail('Kein Schiefer-Shopabgleich.');
 return plan.entries.filter(e=>e.action==='unchanged'&&e.native&&e.shopify&&!e.conflicts.length&&!e.pending.length).flatMap(e=>e.variants.map(v=>{
  if(!/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/.test(v.shopifyVariantId??''))fail('Shopify-Varianten-ID fehlt.');
  return {konfiProductId:e.profileId,importKey:e.key,productId:e.native.id,productRevision:e.native.revision,shopifyProductId:e.shopify.id,shopifyVariantId:v.shopifyVariantId,sku:v.sku,options:structuredClone(v.options),expectedUnitCents:v.priceCents};
 }));
}
export function run(argv){
 if(argv.includes('--apply'))fail('Dieser Befehl plant nur; kein Shopify-Schreibzugriff.');
 const get=k=>{const i=argv.indexOf(k);return i<0?undefined:argv[i+1];};
 for(const k of ['--bundle','--export','--mapping','--out'])if(!get(k))fail(k+' fehlt.');
 const bundle=validateBundle(JSON.parse(gunzipSync(fs.readFileSync(get('--bundle'))))),records=get('--db')?readNativeRecords(bundle,get('--db')):{};
 const plan=planSlateShop(bundle,read(get('--export')),{mapping:read(get('--mapping')),records});
 fs.writeFileSync(get('--out'),JSON.stringify({...plan,bindingSelections:slateBindingSelections(plan)},null,2)+'\n',{mode:0o600});
 return {counts:plan.counts,shopifyWrites:0,out:get('--out')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)try{console.log(JSON.stringify(run(process.argv.slice(2))));}catch(e){console.error(e.message);process.exitCode=1;}

// Dedicated Funkklingel adapter. It preserves the mounting-only catalog scripts.
// Plan input is explicit; default CLI is read-only. Writes require --apply --live.
// The existing acryl store and existing immutable binding registry remain the source.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {parseStoredDocument} from '../app/workshop/product-document-resources.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {openWorkshopDb,checkSelections,applyChecks,priceMismatches} from './shop-bind.mjs';
import {readCredentials,createShopifyClient} from './shop-export.mjs';
export const DOORBELL_BIND_SCHEMA='gravuru-doorbell-shop-bind/v1';
const groups=['color','format','frame','mounting'],formats=['16x28','24x20','35x18'];
const fail=(message,code='doorbell_bind')=>{throw Object.assign(Error(message),{code});};
const key=o=>JSON.stringify(Object.entries(o||{}).sort(([a],[b])=>a.localeCompare(b,'en')));
const labels=o=>JSON.stringify((o||[]).map(v=>[v.name,v.value]).sort(([a],[b])=>a.localeCompare(b,'en')));
const productGid=/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
const variantGid=/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const cfgId=/^cfg_[a-f0-9-]{36}$/;
const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
function money(v){if(typeof v!=='string'||!/^\d+\.\d{2}$/.test(v))fail('Shopify-Preis ist nicht in ganzen Eurocent auswertbar.');const [a,b]=v.split('.');const n=Number(a)*100+Number(b);if(!cents(n))fail('Ungültiger Shopify-Preis.');return n;}
function validLabels(values){return Array.isArray(values)&&values.length===3&&new Set(values.map(v=>v?.name)).size===3&&values.every(v=>typeof v?.name==='string'&&v.name.length>0&&v.name.length<=255&&typeof v.value==='string'&&v.value.length>0&&v.value.length<=255);}
export function validateDoorbellManifest(doc,{expectedModels=42,expectedProducts=126}={}){
 if(doc?.schema!==DOORBELL_BIND_SCHEMA||doc.shopDomain!=='gravuru-design.myshopify.com'||!Array.isArray(doc.products)||doc.products.length!==expectedProducts)fail('Der Funkklingelplan muss den festen Shop und alle '+expectedProducts+' Hauptprodukte enthalten.');
 const cfgs=new Set(),shopIds=new Set(),variantIds=new Set(),skus=new Set(),models=new Map(),selections=[];
 for(const p of doc.products){
  if(!cfgId.test(p.productId||'')||!productGid.test(p.shopifyProductId||'')||!Number.isSafeInteger(p.productRevision)||p.productRevision<1||typeof p.modelKey!=='string'||!p.modelKey||!formats.includes(p.formatKey)||cfgs.has(p.productId)||shopIds.has(p.shopifyProductId))fail('Konfigurator-/Shopify-Produkte oder modellbezogene Einstiegsformate sind nicht eindeutig.');
  cfgs.add(p.productId);shopIds.add(p.shopifyProductId);
  if(!models.has(p.modelKey))models.set(p.modelKey,new Set());const pageFormats=models.get(p.modelKey);
  if(pageFormats.has(p.formatKey))fail('Doppeltes Hauptformat desselben Klingelmodells.');pageFormats.add(p.formatKey);
  if(!Array.isArray(p.variants)||p.variants.length!==120)fail('Jedes Funkklingel-Hauptprodukt benötigt genau 120 Varianten.');
  const combinations=new Set(),values=Object.fromEntries(groups.map(g=>[g,new Set()]));
  for(const v of p.variants){
   if(!variantGid.test(v.shopifyVariantId||'')||variantIds.has(v.shopifyVariantId)||typeof v.sku!=='string'||!v.sku.trim()||v.sku!==v.sku.trim()||skus.has(v.sku)||!cents(v.priceCents)||!v.options||Object.keys(v.options).sort().join(',')!==groups.join(',')||groups.some(g=>typeof v.options[g]!=='string'||!v.options[g])||!validLabels(v.selectedOptions))fail('Varianten benötigen eindeutige IDs/SKUs, Centpreise, drei Shopify-Optionen und genau vier interne Ausführungsgruppen.');
   variantIds.add(v.shopifyVariantId);skus.add(v.sku);
   const choice=key(v.options);if(combinations.has(choice))fail('Eine Funkklingel-Ausführung ist doppelt.');combinations.add(choice);
   for(const g of groups)values[g].add(v.options[g]);
   selections.push({konfiProductId:p.productId,productId:p.productId,productRevision:p.productRevision,shopifyProductId:p.shopifyProductId,shopifyVariantId:v.shopifyVariantId,sku:v.sku,options:structuredClone(v.options),selectedOptions:structuredClone(v.selectedOptions),expectedUnitCents:v.priceCents});
  }
  if([...values.format].sort().join(',')!==formats.join(',')||values.color.size!==2||values.frame.size!==4||values.mounting.size!==5)fail('Format, Farbe, Rahmen und Befestigung bilden nicht die vollständigen 3 × 2 × 4 × 5 Ausführungen.');
 }
 if(models.size!==expectedModels||[...models.values()].some(s=>s.size!==3))fail('Jedes der '+expectedModels+' Modelle braucht drei eigenständige Hauptprodukte.');
 return selections;
}
export function validateDoorbellExport(doc,manifest){
 if(doc?.schema!=='gravuru-shop-export/v1'||doc.shopDomain!==manifest.shopDomain||doc.complete!==true||!Array.isArray(doc.products))fail('Ein vollständiger Export des festen Shopify-Shops ist erforderlich.');
 const byId=new Map(),skus=new Map();
 for(const p of doc.products){
  if(byId.has(p.id)||!Array.isArray(p.variants?.nodes))fail('Shopify-Export enthält doppelte oder unvollständige Produkte.');
  byId.set(p.id,p);
  for(const v of p.variants.nodes)if(v.sku){if(!skus.has(v.sku))skus.set(v.sku,[]);skus.get(v.sku).push(v.id);}
 }
 for(const p of manifest.products){
  const shop=byId.get(p.shopifyProductId);
  if(!shop||!['ACTIVE','DRAFT','UNLISTED'].includes(shop.status)||shop.variants.nodes.length!==120||shop.variants.pageInfo?.hasNextPage)fail('Shopify-Produkt fehlt, ist archiviert oder besitzt nicht genau 120 vollständig exportierte Varianten.');
  const ids=new Map(shop.variants.nodes.map(v=>[v.id,v]));if(ids.size!==120)fail('Doppelte Varianten im Shopify-Export.');
  for(const v of p.variants){const actual=ids.get(v.shopifyVariantId);
   if(!actual||actual.sku!==v.sku||skus.get(v.sku)?.length!==1||money(actual.price)!==v.priceCents||labels(actual.selectedOptions)!==labels(v.selectedOptions))fail('Shopify-ID, SKU, Preis oder die vorhandenen Optionen weichen vom Funkklingelplan ab.');
  }
 }
 return {products:manifest.products.length,variants:manifest.products.length*120,exportedAt:doc.exportedAt??null};
}
export function validateDoorbellRecords(manifest,getRecord){
 const records=[];
 for(const p of manifest.products){
  const r=getRecord(p.productId),c=r?.document?.config;
  if(!r||r.id!==p.productId||r.revision!==p.productRevision||r.status==='archived'||r.document?.kind!=='product'||c?.doorbell?.schema!=='gravuru-doorbell/v1'||c.doorbell.modelKey!==p.modelKey||c.doorbell.defaultFormatKey!==p.formatKey)fail('Der gespeicherte native Funkklingelstand passt nicht zum Modell und Einstiegsformat.');
  const prepared=prepareShopProduct(r);
  if(!prepared.sourceReady||prepared.variants.length!==120)fail('Funkklingel-Grundlagen oder 120 native Ausführungen sind unvollständig.');
  const native=new Map(prepared.variants.map(v=>[key(v.options),v]));
  for(const v of p.variants){const n=native.get(key(v.options));if(!n||n.priceCents!==v.priceCents)fail('Eine native Ausführung oder ihr Preis stimmt nicht mit Shopify überein.');}
  records.push(r);
 }
 return records;
}
export function readDoorbellRecords(filename,manifest,{tenantId='gravuru'}={}){
 if(!fs.existsSync(filename))fail('Der vorhandene Acryl-Speicher fehlt.');
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  if(![4,5].includes(db.prepare('PRAGMA user_version').get().user_version))fail('Nur der vorhandene Acryl-Speicher mit Schema v4 oder v5 ist zulässig; Legacy wird niemals migriert.');
  return validateDoorbellRecords(manifest,id=>{
   const row=db.prepare('SELECT p.id,p.revision,p.archived,p.kind,r.document,r.status FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id AND r.revision=p.revision WHERE p.tenant_id=? AND p.id=?').get(tenantId,id);
   return row&&!row.archived&&row.kind==='product'?{id:row.id,revision:row.revision,status:row.status,document:parseStoredDocument(db,row.document,{tenantId})}:null;
  });
 }finally{db.close();}
}
const QUERY='query GravuruDoorbellBindingEvidence($ids:[ID!]!){shop{myshopifyDomain currencyCode} nodes(ids:$ids){... on ProductVariant{id sku price selectedOptions{name value} product{id status variantsCount{count}}}}}';
export function createDoorbellLiveReader(client,selections){
 const expected=new Map(selections.map(s=>[s.shopifyVariantId,s]));
 return {async inspectVariants(ids){
  if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>!expected.has(id)))fail('Nur die ausdrücklich geplanten Funkklingel-IDs dürfen geprüft werden.');
  const {data}=await client.graphql(QUERY,{ids});
  if(data.shop?.myshopifyDomain!=='gravuru-design.myshopify.com'||data.shop.currencyCode!=='EUR'||!Array.isArray(data.nodes)||data.nodes.length!==ids.length)fail('Shopify-Shop, Währung oder Antwortumfang stimmen nicht überein.');
  const variants=data.nodes.map((v,i)=>{
   const e=expected.get(ids[i]);
   if(v?.id!==ids[i]||v.product?.id!==e.shopifyProductId||v.product.variantsCount?.count!==120||v.sku!==e.sku||money(v.price)!==e.expectedUnitCents||labels(v.selectedOptions)!==labels(e.selectedOptions))fail('Aktuelle Shopify-Ausführung, SKU, Preis oder Optionen weichen ab.');
   return {id:v.id,found:true,productId:v.product.id,status:v.product.status,priceCents:money(v.price),options:v.selectedOptions};
  });
  return {installation:{shopDomain:data.shop.myshopifyDomain,currency:data.shop.currencyCode,scope:'admin-readonly'},variants};
 }};
}
export async function applyDoorbellBindings({manifest,selections,workshop,reader,approvalId=null,onProgress=()=>{}}){
 validateDoorbellRecords(manifest,id=>workshop.repository.get(id));
 const results=[];
 // Each fresh evidence block is committed before the next network call; plans
 // must never age while all 15,120 variants are being inspected.
 for(let i=0;i<selections.length;i+=100){
  const block=(await checkSelections(selections.slice(i,i+100),{adapter:workshop.adapter,reader}))[0];
  if(block.error)throw Object.assign(Error(block.error.message),{code:block.error.code});
  if(block.result?.status!=='id-plan-ready'||priceMismatches(block).length)fail('Die aktuelle Variantenbindung ist nicht bereit.');
  const applied=applyChecks([block],{orderIntake:workshop.orderIntake,storeId:'acryl',shopDomain:manifest.shopDomain,adapter:workshop.adapter})[0];
  if(!applied.written&&applied.reason)fail(applied.reason);
  const row={from:i,count:block.count,createdBindings:applied.createdBindings??0,changedAssignments:applied.changedAssignments??0};
  results.push(row);await onProgress(row);
 }
 let release=null;
 if(approvalId){
  const registry=workshop.orderIntake.idBindings({storeId:'acryl',shopDomain:manifest.shopDomain,adapter:workshop.adapter});
  release=workshop.orderIntake.approveDoorbellLiveProducts({shopDomain:manifest.shopDomain,approvalId,registry,products:manifest.products.map(p=>({productId:p.productId,productRevision:p.productRevision,shopifyProductId:p.shopifyProductId}))});
 }
 return {blocks:results,liveRelease:release,productionReady:false};
}
export async function run(argv,{env=process.env,stdout=process.stdout}={}){
 const value=n=>{const i=argv.indexOf('--'+n);return i>=0?argv[i+1]:null;},flag=n=>argv.includes('--'+n);
 const file=value('manifest'),exportFile=value('export'),filename=value('db'),out=value('out'),apply=flag('apply'),approve=flag('approve-live'),approvalId=value('approval-id');
 if(!file||!exportFile||!filename||!out)fail('Aufruf: node scripts/doorbell-shop-bind.mjs --manifest <plan.json> --export <products.json> --db <bestehende-acryl-workshop.sqlite> --out <bericht.json> [--live --apply [--approve-live --approval-id <freigabe>]]');
 if(apply&&!flag('live'))fail('Schreiben benötigt --live und frische Shopify-Belege.');
 if(approve&&(!apply||!approvalId))fail('Live-Freigabe benötigt --apply, --live und eine ausdrückliche --approval-id.');
 const manifest=JSON.parse(fs.readFileSync(file,'utf8')),selections=validateDoorbellManifest(manifest);
 const exported=validateDoorbellExport(JSON.parse(fs.readFileSync(exportFile,'utf8')),manifest);
 readDoorbellRecords(path.resolve(filename),manifest);
 const report={schema:'gravuru-doorbell-bind-report/v1',generatedAt:new Date().toISOString(),mode:apply?'apply':'dry-run',products:manifest.products.length,variants:selections.length,export:exported,written:false,liveRelease:null,blocks:[],productionReady:false};
 const save=()=>{fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
 let workshop=null;
 try{
  let reader=null;if(flag('live'))reader=createDoorbellLiveReader(createShopifyClient({credentials:readCredentials(env)}),selections);
  if(apply){
   workshop=openWorkshopDb(path.resolve(filename),{tenantId:'gravuru',storeId:'acryl',shopDomain:manifest.shopDomain});
   const result=await applyDoorbellBindings({manifest,selections,workshop,reader,approvalId:approve?approvalId:null,onProgress:row=>{report.blocks.push(row);save();}});
   report.liveRelease=result.liveRelease;report.written=true;
  }else if(reader){for(let i=0;i<selections.length;i+=100)await reader.inspectVariants(selections.slice(i,i+100).map(s=>s.shopifyVariantId));report.shopVerified=true;}
  save();stdout.write(JSON.stringify({mode:report.mode,products:report.products,variants:report.variants,written:report.written,liveRelease:report.liveRelease,productionReady:false})+'\n');return report;
 }catch(e){report.error={code:e.code??'doorbell_bind',message:e.message};save();throw e;}finally{workshop?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(e=>{process.stderr.write((e.code?'['+e.code+'] ':'')+e.message+'\n');process.exitCode=1;});


// Attach imported slate groups to existing Shopify variants through the shared
// registry. No Shopify writes, product creation, publication or production release.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync,backup} from 'node:sqlite';
import {validateBundle} from './slate-group-import.mjs';
import {planSlateShop,readNativeRecords,slateBindingSelections} from './slate-group-shop-plan.mjs';
import {openWorkshopDb,checkSelections,applyChecks,priceMismatches} from './shop-bind.mjs';
import {readCredentials,createShopifyClient,SHOP_DOMAIN} from './shop-export.mjs';
export const EVIDENCE_QUERY='query SlateGroupBindingEvidence($ids:[ID!]!){shop{myshopifyDomain currencyCode} nodes(ids:$ids){... on ProductVariant{id sku price selectedOptions{name value} product{id status variantsCount{count}}}}}';
const fail=message=>{throw Error(message);};
const cents=value=>{if(!/^\d+\.\d{2}$/.test(String(value)))fail('Ungültiger Shopify-Preis.');return Number(String(value).replace('.',''));};
const labels=value=>JSON.stringify(value.map(o=>[o.name,o.value]).sort());
export function createSlateLiveReader(client,plan){
 const expected=new Map(plan.entries.flatMap(e=>e.variants.map(v=>[v.shopifyVariantId,{...v,productId:e.shopify.id,count:e.variants.length}])));
 return {async inspectVariants(ids){
  if(!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!expected.has(id)))fail('Ungeplante Schiefer-Varianten.');
  const {data}=await client.graphql(EVIDENCE_QUERY,{ids});
  if(data.shop?.myshopifyDomain!==SHOP_DOMAIN||data.shop.currencyCode!=='EUR'||data.nodes?.length!==ids.length)fail('Shopify-Shop, Währung oder Antwortumfang weichen ab.');
  const variants=data.nodes.map((v,i)=>{
   const e=expected.get(ids[i]);
   if(v?.id!==ids[i]||v.product?.id!==e.productId||v.product.status!=='DRAFT'||v.product.variantsCount?.count!==e.count||v.sku!==e.sku||cents(v.price)!==e.priceCents||labels(v.selectedOptions)!==labels([{name:'Befestigung',value:e.label}]))fail('Aktuelle Shopify-ID, SKU, Optionen, Status oder Preis weichen vom geprüften Entwurf ab.');
   return {id:v.id,found:true,productId:v.product.id,status:v.product.status,priceCents:cents(v.price),options:v.selectedOptions};
  });
  return {installation:{shopDomain:SHOP_DOMAIN,currency:'EUR',scope:'admin-readonly'},variants};
 }};
}
export async function bindSlatePlan(plan,{workshop,reader,apply=false}){
 if(!plan.entries.length||plan.entries.some(e=>e.action!=='unchanged'||!e.native||!e.shopify||e.conflicts.length||e.pending.length))fail('Alle Produktgruppen müssen importiert und unverändert mit Shopify abgeglichen sein.');
 const selections=slateBindingSelections(plan),expected=plan.entries.reduce((n,e)=>n+e.variants.length,0);
 if(selections.length!==expected)fail('Nicht alle Schiefer-Ausführungen sind eindeutig zugeordnet.');
 const results=[];
 for(let i=0;i<selections.length;i+=100){
  const block=(await checkSelections(selections.slice(i,i+100),{adapter:workshop.adapter,reader}))[0];
  if(block.error||block.result?.status!=='id-plan-ready'||priceMismatches(block).length)fail(block.error?.message||'Native Auswahl, Shopify-Preis oder Bindung sind nicht bereit.');
  const saved=apply?applyChecks([block],{orderIntake:workshop.orderIntake,storeId:'acryl',shopDomain:SHOP_DOMAIN,adapter:workshop.adapter})[0]:null;
  if(saved?.reason)fail(saved.reason);
  results.push({from:i,count:block.count,status:block.result.status,productionStatus:block.result.productionStatus,saved});
 }
 return {schema:'gravuru-slate-group-binding/v1',at:new Date().toISOString(),mode:apply?'apply':'check',products:plan.entries.length,variants:selections.length,blocks:results,shopifyWrites:0,productionReady:false};
}
export async function run(argv){
 const get=k=>{const i=argv.indexOf(k);return i<0?null:argv[i+1];};
 for(const k of ['--bundle','--export','--mapping','--db','--out'])if(!get(k))fail(k+' fehlt.');
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),bundle=validateBundle(JSON.parse(gunzipSync(fs.readFileSync(get('--bundle'))))),filename=path.resolve(get('--db'));
 const plan=planSlateShop(bundle,read(get('--export')),{mapping:read(get('--mapping')),records:readNativeRecords(bundle,filename)});
 const client=createShopifyClient({credentials:readCredentials()}),reader=createSlateLiveReader(client,plan),apply=argv.includes('--apply');
 let backupFile=null,workshop;
 try{
  if(apply){backupFile=path.join(path.dirname(filename),'slate-binding-backups',Date.now()+'.sqlite');fs.mkdirSync(path.dirname(backupFile),{recursive:true,mode:0o700});const source=new DatabaseSync(filename,{readOnly:true});try{await backup(source,backupFile);}finally{source.close();}fs.chmodSync(backupFile,0o600);}
  workshop=openWorkshopDb(filename,{storeId:'acryl',tenantId:bundle.tenantId,shopDomain:SHOP_DOMAIN});
  const result={...await bindSlatePlan(plan,{workshop,reader,apply}),backupFile,entries:plan.entries.map(e=>({key:e.key,sourceDesignId:e.sourceDesignId,native:e.native,shopify:e.shopify,defaultDesignId:e.defaultDesignId,designCount:e.designCount}))};
  fs.writeFileSync(get('--out'),JSON.stringify(result,null,2)+'\n',{mode:0o600});return result;
 }finally{workshop?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});

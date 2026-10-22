// Binding-Plan: jede Shopify-Variante eines abgeglichenen Hauptprodukts → Konfi-Produkt (`katalog-…`) + Ausführung
// {mounting:<Schlüssel>}. Quelle ist ein shop-sync-Plan (nur Einträge „unverändert“ = Shop entspricht dem Soll) oder
// Katalog + Export. Mit --db wird das Konfi-Produkt in der Werkstatt-DB aufgelöst (cfg-ID, fester Stand) und über
// shop-product-binding-check geprüft; --apply schreibt über den bestehenden Store (orderIntake.idBindings). Standard: Dry-run.
// Aufruf: node scripts/shop-bind.mjs (--plan <sync-plan.json> | --katalog <pfad> --linie <id> --export <products.json>) --out <bind.json>
//         [--db <workshop.sqlite> --store-id <kennung> [--tenant gravuru] [--live | --trust-export] [--apply]]
// Spezifikation: scripts/SHOP-SYNC.txt.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createOrderIntake} from '../app/workshop/order-intake.mjs';
import {createProductionProfiles} from '../app/workshop/production-profiles.mjs';
import {createShopBindingReadAdapter} from '../app/workshop/shop-product-binding-adapter.mjs';
import {createShopProductBindingCheck} from '../app/workshop/shop-product-binding-check.mjs';
import {createShopifyAdminReadonly} from '../app/workshop/shopify-admin-readonly.mjs';
import {targetsForLine,planShopSync,indexExport,toCents,PLAN_SCHEMA as SYNC_SCHEMA,SHOP_DOMAIN} from './shop-sync.mjs';
import {readCredentials} from './shop-export.mjs';

export const BIND_SCHEMA='gravuru-shop-bind-plan/v1';
export const OPTION_GROUP='mounting';// Werkstatt-Optionsgruppe der Familienprodukte (familyProductConfig)
const fail=(message,code)=>{throw Object.assign(Error(message),code?{code}:{});};
const PRODUCT_GID=/^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/,VARIANT_GID=/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;

// Aus dem shop-sync-Plan: nur Produkte, deren Shop-Stand dem Soll entspricht (jede Variante hat eine ID und den Soll-Preis).
export function bindSelections(syncPlan){
 if(syncPlan?.schema!==SYNC_SCHEMA)fail('Kein shop-sync-Plan (erwartet '+SYNC_SCHEMA+').','plan_schema');
 const selections=[],pending=[],seen=new Set();
 for(const e of syncPlan.entries){
  if(e.action!=='unverändert'){pending.push({konfiProductId:e.konfiProductId,action:e.action,reason:e.action==='offen'||e.action==='konflikt'?(e.reasons||[]).join(' · ')||e.action:'Shop entspricht noch nicht dem Soll – erst shop-sync --apply, dann Export erneuern.'});continue;}
  for(const v of e.variants){
   if(!PRODUCT_GID.test(e.shopify?.productId||'')||!VARIANT_GID.test(v.shopifyVariantId||''))fail(e.konfiProductId+': Variante '+v.sku+' ohne gültige Shopify-IDs.','ids');
   if(seen.has(v.shopifyVariantId))fail('Variante '+v.shopifyVariantId+' mehrfach im Plan.','ids');seen.add(v.shopifyVariantId);
   if(!Number.isSafeInteger(v.priceCents))fail(e.konfiProductId+': Preis offen für '+v.sku+'.','price');
   selections.push({konfiProductId:e.konfiProductId,importKey:e.importKey,shopifyProductId:e.shopify.productId,shopifyVariantId:v.shopifyVariantId,sku:v.sku,mountingKey:v.mountingKey,label:v.label,options:{[OPTION_GROUP]:v.mountingKey},expectedUnitCents:v.priceCents});
  }
 }
 return {shopDomain:syncPlan.shopDomain,line:syncPlan.line,selections,pending};
}

// Konfi-Produkt in der Werkstatt-DB: Import-Journal (katalog-import) zuerst, sonst genau ein Produkt mit dieser profile.id.
export function resolveRecords(selections,repository){
 const cache=new Map();
 const lookup=s=>{
  if(cache.has(s.konfiProductId))return cache.get(s.konfiProductId);
  let result;
  const journal=s.importKey?repository.importItem(s.importKey):null;
  if(journal){const record=repository.get(journal.id);result={productId:record.id,productRevision:record.revision,status:record.status,resolution:'import-journal'};}
  else{
   const hits=repository.list({includeArchived:false}).filter(r=>r.document?.config?.profile?.id===s.konfiProductId);
   if(hits.length===1)result={productId:hits[0].id,productRevision:hits[0].revision,status:hits[0].status,resolution:'profile-id'};
   else result={productId:null,productRevision:null,status:null,resolution:null,open:hits.length?'Mehrere Werkstatt-Produkte mit profile.id '+s.konfiProductId+' ('+hits.map(h=>h.id).join(', ')+').':'Konfi-Produkt '+s.konfiProductId+' ist nicht in der Werkstatt-DB (katalog-import --commit zuerst).'};
  }
  cache.set(s.konfiProductId,result);return result;
 };
 return selections.map(s=>({...s,...lookup(s)}));
}

// Offline-Leser aus dem Export: ersetzt Shopify nur für den Dry-run (Quelle wird im Ergebnis genannt).
export function exportReader(exportDoc,{shopDomain=SHOP_DOMAIN}={}){
 const ex=indexExport(exportDoc);
 if(ex.shopDomain&&ex.shopDomain!==shopDomain)fail('Export stammt von '+ex.shopDomain+'.','shop_mismatch');
 const variants=new Map();
 for(const p of ex.products)for(const v of p.variants.nodes)variants.set(v.id,{id:v.id,found:true,productId:p.id,status:p.status,priceCents:toCents(v.price),options:(v.selectedOptions||[]).map(o=>({name:o.name,value:o.value}))});
 return Object.freeze({source:'export',exportedAt:ex.exportedAt,async inspectVariants(ids){return {installation:{shopDomain,appId:null,apiVersion:ex.apiVersion??null,currency:'EUR',scope:'admin-readonly',source:'export',exportedAt:ex.exportedAt},variants:ids.map(id=>variants.get(id)||{id,found:false})};}});
}

// Werkstatt-DB öffnen (bestehende Module, keine Migration): Repository, Bestelleingang, Fertigungsprofile, Leseadapter.
export function openWorkshopDb(filename,{tenantId='gravuru',shopDomain=SHOP_DOMAIN,storeId,clock=Date.now}={}){
 if(typeof storeId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(storeId))fail('--store-id fehlt oder ist ungültig (interne Kennung des privaten Datenspeichers, muss der Serverkonfiguration entsprechen).','store_id');
 if(!fs.existsSync(filename))fail('Werkstatt-DB '+filename+' nicht gefunden.','db_missing');
 const repository=createProductRepository({filename,tenantId}),db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;');
 const orderIntake=createOrderIntake({database:db,tenantId,clock,snapshot:()=>fail('shop-bind verwendet keine Kunden-Prüfstände.','snapshot')});
 const profilesFile=path.join(path.dirname(filename),'profiles.sqlite');
 const productionProfiles=fs.existsSync(profilesFile)?createProductionProfiles({filename:profilesFile,tenantId}):{resolve(){fail('Kein Fertigungsprofilspeicher ('+profilesFile+').','production_profile_invalid');}};
 const workshop={tenantId,repository,orderIntake,productionProfiles,sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}});
 return {repository,db,orderIntake,productionProfiles,adapter,tenantId,shopDomain,storeId,close(){try{repository.close();}catch{}try{productionProfiles.close?.();}catch{}try{db.close();}catch{}}};
}

// Prüfung in Blöcken ≤ 100 über shop-product-binding-check; Rückgabe je Block Ergebnis + (intern markierter) Plan.
export async function checkSelections(selections,{adapter,reader,clock=Date.now,maxEvidenceAgeMs=60000}){
 const ready=selections.filter(s=>s.productId);
 const check=createShopProductBindingCheck({adapter,reader,clock,maxEvidenceAgeMs}),blocks=[];
 for(let i=0;i<ready.length;i+=100){
  const slice=ready.slice(i,i+100);
  let result,error=null;
  try{result=await check.check({selections:slice.map(s=>({shopifyProductId:s.shopifyProductId,shopifyVariantId:s.shopifyVariantId,productId:s.productId,productRevision:s.productRevision,options:s.options}))});}
  catch(e){error={code:e.code??null,message:e.message};}
  blocks.push({from:i,count:slice.length,result:result??null,error,selections:slice});
 }
 return blocks;
}
// Preisabgleich Soll (Katalog) ↔ Werkstatt (Prüfergebnis baseUnitCents) – beide müssen dem Shop-Preis entsprechen.
export function priceMismatches(block){
 if(!block.result)return [];
 return block.result.entries.flatMap((e,i)=>{const s=block.selections[i];return e.baseUnitCents!==s.expectedUnitCents?[{shopifyVariantId:s.shopifyVariantId,sku:s.sku,katalogCents:s.expectedUnitCents,werkstattCents:e.baseUnitCents}]:[];});
}

// Aktivierung über den bestehenden Store; erwartete Köpfe aus dem aktuellen Stand (null = erste Zuordnung).
export function applyChecks(blocks,{orderIntake,storeId,shopDomain,adapter}){
 const registry=orderIntake.idBindings({storeId,shopDomain,adapter}),results=[];
 for(const block of blocks){
  if(!block.result?.plan){results.push({from:block.from,count:block.count,written:false,reason:block.error?.message||'Prüfung nicht bereit ('+(block.result?.status??'fehlt')+').'});continue;}
  if(priceMismatches(block).length){results.push({from:block.from,count:block.count,written:false,reason:'Katalogpreis und Werkstattpreis weichen ab.'});continue;}
  const expectedHeads=block.result.plan.entries.map(e=>{try{return {shopifyVariantId:e.shopifyVariantId,revision:registry.resolve({shopifyProductId:e.shopifyProductId,shopifyVariantId:e.shopifyVariantId}).assignmentRevision};}catch(error){if(error.code!=='shop_binding_active_not_found')throw error;return {shopifyVariantId:e.shopifyVariantId,revision:null};}});
  const saved=registry.persist({plan:block.result.plan,expectedHeads});
  results.push({from:block.from,count:block.count,written:saved.written,createdBindings:saved.createdBindings,changedAssignments:saved.changedAssignments,assignments:saved.assignments.map(a=>({shopifyProductId:a.shopifyProductId,shopifyVariantId:a.shopifyVariantId,bindingId:a.bindingId,productId:a.productId,productRevision:a.productRevision,options:a.options,unitCents:a.unitCents,assignmentRevision:a.assignmentRevision,productionStatus:a.productionStatus}))});
 }
 return results;
}

export function formatBind(doc){
 const lines=[`Binding-Plan ${doc.shopDomain}: ${doc.selections.length} Varianten aus ${new Set(doc.selections.map(s=>s.konfiProductId)).size} Konfi-Produkten, ${doc.pending.length} ausstehend`];
 for(const s of doc.selections)lines.push(`${s.shopifyVariantId.split('/').at(-1).padEnd(15)} ${s.sku.padEnd(24)} ${s.konfiProductId} {${OPTION_GROUP}:${s.mountingKey}} ${(s.expectedUnitCents/100).toFixed(2).replace('.',',')} €${s.productId?'  → '+s.productId+' r'+s.productRevision+' ('+s.resolution+')':s.open?'  · '+s.open:''}`);
 for(const p of doc.pending)lines.push(`ausstehend  ${p.konfiProductId} [${p.action}] ${p.reason}`);
 if(doc.check)for(const b of doc.check)lines.push(`Prüfung Block ${b.from}+${b.count}: ${b.error?'Fehler '+(b.error.code||'')+' '+b.error.message:b.result.status+(b.priceMismatches?.length?' – Preisabweichungen '+b.priceMismatches.length:'')}`);
 if(doc.applied)for(const r of doc.applied)lines.push(`Aktivierung Block ${r.from}+${r.count}: ${r.written?'geschrieben (neu '+r.createdBindings+', geändert '+r.changedAssignments+')':r.reason||'unverändert'}`);
 return lines.join('\n');
}

export function parseArgs(argv){
 const value=name=>{const i=argv.indexOf('--'+name);return i>=0&&!String(argv[i+1]??'').startsWith('--')?argv[i+1]:undefined;};
 const list=name=>value(name)?value(name).split(',').map(v=>v.trim()).filter(Boolean):null;
 const only=(list('unterkategorie')||list('groesse')||list('hauptprodukt'))?{subcategories:list('unterkategorie'),sizes:list('groesse'),mainProducts:list('hauptprodukt')}:null;
 return {plan:value('plan'),katalog:value('katalog')||process.env.GRAVURU_KATALOG,line:value('linie'),exportFile:value('export'),out:value('out'),db:value('db'),storeId:value('store-id'),tenant:value('tenant')||'gravuru',only,apply:argv.includes('--apply'),live:argv.includes('--live'),trustExport:argv.includes('--trust-export'),quiet:argv.includes('--quiet')};
}
export async function run(argv,{env=process.env,fetchImpl=globalThis.fetch,stdout=process.stdout,stderr=process.stderr,clock=Date.now}={}){
 const args=parseArgs(argv);
 if(!args.out||!(args.plan||(args.katalog&&args.line&&args.exportFile)))fail('Aufruf: node scripts/shop-bind.mjs (--plan <sync-plan.json> | --katalog <pfad> --linie <id> --export <products.json>) --out <bind.json> [--db <workshop.sqlite> --store-id <kennung> [--tenant gravuru] [--live | --trust-export] [--apply]]');
 if(args.apply&&!args.db)fail('--apply braucht --db (Werkstatt-DB) und --store-id.');
 const log=m=>{if(!args.quiet)stderr.write(m+'\n');};
 if(args.apply)log('Aktivierung über Werkstatt-DB '+args.db+' (Store '+args.storeId+').');
 let syncPlan,exportDoc=null;
 if(args.plan){syncPlan=JSON.parse(fs.readFileSync(args.plan,'utf8'));if(args.exportFile)exportDoc=JSON.parse(fs.readFileSync(args.exportFile,'utf8'));}
 else{exportDoc=JSON.parse(fs.readFileSync(args.exportFile,'utf8'));syncPlan=planShopSync(targetsForLine(openKatalog(args.katalog),args.line,{only:args.only}),exportDoc);}
 const base=bindSelections(syncPlan);
 const doc={schema:BIND_SCHEMA,shopDomain:base.shopDomain,generatedAt:new Date(clock()).toISOString(),source:args.plan?{syncPlan:path.resolve(args.plan)}:{katalog:path.resolve(args.katalog),line:args.line,export:path.resolve(args.exportFile)},line:base.line,optionGroup:OPTION_GROUP,mode:'dry-run',selections:base.selections,pending:base.pending,check:null,applied:null};
 let ws=null;
 try{
  if(args.db){
   ws=openWorkshopDb(path.resolve(args.db),{tenantId:args.tenant,shopDomain:base.shopDomain,storeId:args.storeId,clock});
   doc.store={db:path.resolve(args.db),tenantId:ws.tenantId,storeId:ws.storeId};
   doc.selections=resolveRecords(base.selections,ws.repository);
   let reader;
   if(args.live){const credentials=readCredentials(env);if(credentials.kind!=='client_credentials')fail('--live braucht das Client-Geheimnis (GRAVURU_SHOPIFY_CLIENT_SECRET_FILE/GRAVURU_SHOPIFY_CLIENT_SECRET).','credentials');reader=createShopifyAdminReadonly({readSecret:async()=>credentials.secret},{fetchImpl});doc.evidence='shopify-live';}
   else{if(!exportDoc)fail('Ohne --live wird der Export als Beleg gebraucht (--export).');reader=exportReader(exportDoc,{shopDomain:base.shopDomain});doc.evidence='export:'+(reader.exportedAt??'?');}
   if(args.apply&&!args.live&&!args.trustExport)fail('--apply braucht eine frische Shopify-Bestätigung (--live) oder ausdrücklich --trust-export.');
   const blocks=await checkSelections(doc.selections,{adapter:ws.adapter,reader,clock});
   doc.check=blocks.map(b=>({from:b.from,count:b.count,error:b.error,priceMismatches:priceMismatches(b),result:b.result?{status:b.result.status,checkedAt:b.result.checkedAt,productionStatus:b.result.productionStatus,entries:b.result.entries.map(e=>({shopifyVariantId:e.shopifyVariantId,productId:e.productId,productRevision:e.productRevision,options:e.options,baseUnitCents:e.baseUnitCents,shopifyStatus:e.shopifyStatus,readiness:{sourceReady:e.readiness.sourceReady,productionStatus:e.readiness.productionStatus,bindingBlockers:e.readiness.bindingBlockers,productionPending:e.readiness.productionPending}}))}:null}));
   if(args.apply){doc.mode='apply';doc.applied=applyChecks(blocks,{orderIntake:ws.orderIntake,storeId:ws.storeId,shopDomain:base.shopDomain,adapter:ws.adapter});}
  }
  fs.mkdirSync(path.dirname(path.resolve(args.out)),{recursive:true});
  fs.writeFileSync(args.out,JSON.stringify(doc,null,1)+'\n');
  stdout.write(formatBind(doc)+'\nAusgabe: '+args.out+'\n'+(doc.mode==='dry-run'?'Dry-run: nichts geschrieben.\n':''));
  return doc;
 }finally{ws?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(e=>{process.stderr.write((e.code?'['+e.code+'] ':'')+e.message+'\n');process.exitCode=1;});

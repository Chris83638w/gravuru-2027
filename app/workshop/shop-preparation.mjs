import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {isDeepStrictEqual} from 'node:util';
import {isFormProduct,formReadiness} from './form-product.mjs';
import {validateProductDocument,resolveProduct} from './product-model.mjs';
import {quote,variantCombinations} from '../configurator/variant-m/contract.mjs';
import {variantKey} from '../configurator/variant-m/commerce-model.mjs';
import {isFamilyFormats} from '../configurator/variant-m/family-formats.mjs';
import {isScalableSizes} from '../configurator/variant-m/scalable-sizes.mjs';
import {moduleEnabled} from '../configurator/variant-m/module-profile.mjs';
// Explicit private batch scope only. Database/head/profile/Shopify evidence is
// still read by the original callers on every check; only this pure preparation
// can be reused for an exactly equal record. Nothing survives the completed run.
const preparationRuns=new AsyncLocalStorage(),RUN_PREPARATION_LIMIT=2;
export async function withShopPreparationCache(work){
 if(typeof work!=='function'||preparationRuns.getStore()?.active)throw Error('A preparation cache needs one explicit, non-nested run.');
 const run={active:true,entries:new Map()};
 try{return await preparationRuns.run(run,work);}
 finally{run.active=false;run.entries.clear();}
}
// Read-only preparation. No Shopify credentials, IDs, writes or publication are fabricated.
// Cache only an exact previously validated source and return isolated results.
// Changed documents, metadata or status must pass validation again. Deep equality
// also distinguishes input changes omitted by JSON serialization.
const doorbellPreparations=new Map(),DOORBELL_PREPARATION_LIMIT=32;
const familyPreparations=new Map(),FAMILY_PREPARATION_LIMIT=2;
const slatePreparations=new Map(),SLATE_PREPARATION_LIMIT=2;
export function prepareShopProduct(record){
 const run=preparationRuns.getStore(),config=record.document?.config;
 if(run?.active&&isScalableSizes(config)&&!config.acrylic&&config.profile?.material?.kind==='acrylic'&&config.profile?.processing?.profileId==='color-print'){
  const key=createHash('sha256').update(JSON.stringify(record)).digest('hex'),cached=run.entries.get(key);
  if(cached&&isDeepStrictEqual(record,cached.source)){
   run.entries.delete(key);run.entries.set(key,cached);
   return structuredClone(cached.result);
  }
  const result=prepareValidated(record,validateProductDocument(record.document));
  run.entries.set(key,{source:structuredClone(record),result:structuredClone(result)});
  if(run.entries.size>RUN_PREPARATION_LIMIT)run.entries.delete(run.entries.keys().next().value);
  return result;
 }
 const family=isFamilyFormats(record.document?.config),slate=record.document?.config?.profile?.material?.kind==='slate';
 const cache=slate?slatePreparations:family?familyPreparations:doorbellPreparations,limit=slate?SLATE_PREPARATION_LIMIT:family?FAMILY_PREPARATION_LIMIT:DOORBELL_PREPARATION_LIMIT;
 if(!family&&!slate&&record.document?.config?.doorbell?.schema!=='gravuru-doorbell/v1')return prepareValidated(record,validateProductDocument(record.document));
 const source={document:record.document,id:record.id,revision:record.revision,status:record.status,productionProfile:record.metadata?.productionProfile??null};
 const cacheKey=createHash('sha256').update(JSON.stringify(source)).digest('hex'),cached=cache.get(cacheKey);
 if(cached&&isDeepStrictEqual(source,cached.source)){
  cache.delete(cacheKey);cache.set(cacheKey,cached);
  return structuredClone(cached.result);
 }
 const d=validateProductDocument(record.document),result=prepareValidated(record,d);
 cache.set(cacheKey,{source:structuredClone(source),result:structuredClone(result)});
 if(cache.size>limit)cache.delete(cache.keys().next().value);
 return result;
}
function prepareValidated(record,d){
 const form=isFormProduct(d),checks=[],variants=[];
 const check=(id,ok,message)=>checks.push({id,status:ok?'ready':'open',message});
 check('availability',record.status!=='archived',record.status==='archived'?'Produkt ist archiviert.':'Gespeicherter Produktstand verfügbar.');
 check('kind',d.kind==='product',d.kind==='product'?'Eigenes Produkt.':'Master zuerst als eigenes Produkt kopieren.');
 const designs=form?(d.designs||[]):d.config.profile.designs;
 check('designs',designs.length>0,designs.length?designs.length+' Design'+(designs.length===1?'':'s')+' zugeordnet.':'Design und Kundenfelder fehlen.');
 if(form){
  check('material',Boolean(d.material.id)&&d.material.thicknessMm!==null,'Material und tatsächliche Stärke'+(d.material.id&&d.material.thicknessMm!==null?' sind hinterlegt.':' fehlen noch.'));
  check('method',Boolean(d.processingMethod),d.processingMethod?'Verfahren '+(d.processingMethod==='print'?'Druck':'Gravur')+' ist hinterlegt.':'Druck oder Gravur noch festlegen.');
  check('price',d.basePriceCents!==null,d.basePriceCents!==null?'Preis aus dem gespeicherten Produktstand.':'Grundpreis noch festlegen.');
  if(d.basePriceCents!==null)variants.push({key:variantKey({}),title:'Standard',options:{},priceCents:d.basePriceCents,widthMm:d.form.geometry.widthMm,heightMm:d.form.geometry.heightMm});
 }else{
  // K14 / Ü12.1: unsichtbare Gruppen (visibleIf) entfallen, gleiche Ausführungen nur einmal.
  const groups=d.config.profile.optionGroups,options=variantCombinations(validateProductDocument(d).config);
  for(const option of options){const resolved=resolveProduct(d,{options:option}),price=quote(resolved.config,[],resolved.designId,option);variants.push({key:variantKey(option),title:groups.filter(g=>option[g.id]!==undefined).map(g=>g.values.find(v=>v.id===option[g.id]).label||option[g.id]).join(' · '),options:option,priceCents:price.unitCents,widthMm:resolved.physical.widthMm,heightMm:resolved.physical.heightMm});}
  check('variants',true,variants.length+' gültige Ausführungen aus derselben Preis-/Variantenprüfung wie im Konfigurator.');
 }
 check('seo',Boolean(d.seo?.title?.trim()&&d.seo?.description?.trim()),'Titel und Beschreibung für die Produktseite'+(d.seo?.title?.trim()&&d.seo?.description?.trim()?' sind vorbereitet.':' noch ergänzen.'));
 const extras=form?{motifCents:0,photoCents:0}:{motifCents:d.config.extraMotifCents||0,photoCents:d.config.photo?.extraPriceCents||0,...(d.config.logo?.vectorUpload===true?{logoCents:d.config.logo.extraPriceCents}:{})};
 if(!form&&d.config.moduleProfile){
  if(!moduleEnabled(d.config,'motifs')&&d.config.motifCharge!=='all')extras.motifCents=0;
  // The legacy price is shared by photos and raster logos; hiding photos must
  // not hide the required surcharge binding of a still-allowed raster logo.
  if(!moduleEnabled(d.config,'photo')&&!(moduleEnabled(d.config,'logo')&&d.config.logo?.enabled!==false&&d.config.logo?.vectorUpload!==true))extras.photoCents=0;
  if(!moduleEnabled(d.config,'logo'))delete extras.logoCents;
 }
 check('pricingConnection',false,extras.logoCents?'Eigene Vektorlogos kosten 12,99 € je Logo und benötigen den geprüften V2-Preisvertrag samt passender Shopify-Preisfunktion. Die Tabelle enthält nur die Grundausführungen.':extras.motifCents||extras.photoCents?'Zusätzliche Motive/Fotos benötigen eine serverseitig geprüfte Shopify-Aufpreisbindung. Die Tabelle enthält nur die Grundausführungen.':'Shopify-Varianten und Preise müssen noch mit den gespeicherten Ausführungen verbunden werden.');
 check('store',false,'Der Entwurfsanschluss wird unten für diesen Shop geprüft. Eine öffentliche Produktfreigabe mit Konfigurator ist ein eigener Schritt.');
 check('orders',false,'Bestelleingang, Zahlung, unveränderliche Position und Kundenkonto-Download müssen noch durchgängig angebunden werden.');
 check('production',false,'Technische Ausgaben ersetzen keine Material-/RIP-/Maschinenabnahme.');
 const profile=record.metadata?.productionProfile;
 const value={schema:'gravuru-shop-preparation/v1',configuration:{id:record.id,revision:record.revision,status:record.status},title:d.name,seo:d.seo,currency:'EUR',variants,extras,designs:designs.map(v=>({id:v.id,name:v.name})),productionProfile:profile?{id:profile.id,revision:profile.revision,sha256:profile.sha256}:null,checks,sourceReady:checks.filter(v=>['availability','kind','designs','material','method','price','variants'].includes(v.id)).every(v=>v.status==='ready'),shopReady:false,productionReady:false,shopifyProductId:null,scope:'preparation-only',formChecklist:form?formReadiness(d):[]};
 return {...value,sha256:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
}

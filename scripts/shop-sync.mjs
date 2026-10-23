// Shop-Abgleich je Katalog-Linie: Soll-Daten der Hauptprodukte (Familie, Unterkategorie, Größe) gegen den
// Shopify-Export (scripts/shop-export.mjs) → Plan mit productSet-Eingaben (update / create / konflikt / offen / unverändert).
// Aufruf: node scripts/shop-sync.mjs --katalog <pfad> --linie <id> --export <products.json> --out <plan.json>
//         [--unterkategorie a,b] [--groesse k1,k2] [--hauptprodukt id] [--sku-map <json>] [--alle-designs] [--daten-aktualisieren] [--apply [--create] [--journal <ordner>]]
// Nur Hauptprodukte mit freigegebenem Startdesign (Design-Dashboard) werden geplant (--alle-designs hebt das für Probeläufe auf).
// Bestehende Shop-Produkte werden nur angefasst, wenn sich das Design geändert hat (Metafeld custom.design_sha256); --daten-aktualisieren erzwingt Datenupdates.
// Ohne --apply wird nur geplant. --apply braucht GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN oder das Client-Geheimnis
// (Datei/Umgebung, siehe shop-export.mjs) und schreibt je Produkt ein Journal. Spezifikation: scripts/SHOP-SYNC.txt.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {applyPriceOverrides,priceGaps} from '../app/workshop/katalog-convert.mjs';
import {readCredentials,createShopifyClient,SHOP_DOMAIN,API_VERSION} from './shop-export.mjs';

export {SHOP_DOMAIN,API_VERSION};
export const PLAN_SCHEMA='gravuru-shop-sync-plan/v1';
export const OPTION_NAME='Befestigung';
export const METAFIELD=Object.freeze({namespace:'custom',key:'customization_id',type:'single_line_text_field'});
// Design-Stand im Shop (Chris 23.10.2026: „Alte werden nur geupdatet, wenn wir das Design ändern“): SHA-256 über
// design.svg + design.json (ohne freigabe/hidden) des Startdesigns, als Metafeld am Shop-Produkt. Gleicher Wert
// im Export → Produkt bleibt unverändert, auch wenn Daten abweichen (nur --daten-aktualisieren greift).
export const DESIGN_METAFIELD=Object.freeze({namespace:'custom',key:'design_sha256',type:'single_line_text_field'});
export function designFingerprint(master){
 if(!master)return null;
 const json={...(master.json||{})};delete json.freigabe;delete json.hidden;
 return createHash('sha256').update(master.svg()).update('\n').update(JSON.stringify(json)).digest('hex');
}
export const ACTIONS=Object.freeze(['unverändert','update','create','konflikt','offen']);
const PRODUCT_FIELDS=`id handle title status options{id name position optionValues{id name}} metafield(namespace:"${METAFIELD.namespace}",key:"${METAFIELD.key}"){value} variants(first:100){nodes{id sku price inventoryItem{tracked} selectedOptions{name value}} pageInfo{hasNextPage}}`;
export const PRODUCT_READ_QUERY=`query GravuruShopSyncRead($id:ID!){shop{myshopifyDomain currencyCode} product(id:$id){${PRODUCT_FIELDS}}}`;
export const PRODUCT_SET_MUTATION=`mutation GravuruShopSync($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{${PRODUCT_FIELDS}} userErrors{field code message}}}`;

const fail=(message,code)=>{throw Object.assign(Error(message),code?{code}:{});};
export const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export const money=cents=>(cents/100).toFixed(2);
export const euro=cents=>cents===null?'offen':money(cents).replace('.',',')+' €';
// Preis-String aus Shopify ("8.99", "8.9", "19") → Cent; ungültig → null.
export const toCents=v=>{if(v===null||v===undefined)return null;const m=String(v).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);return m?Number(m[1])*100+Number((m[2]||'').padEnd(2,'0')):null;};
// Identisch mit katalog-convert.mjs (cleanId) – Produktkennung der Werkstatt je Linie, Unterkategorie, Größe, Hauptprodukt.
export const cleanId=v=>String(v).toLowerCase().replace(/[^a-z0-9._:-]+/g,'-').replace(/^-+|-+$/g,'');
export const konfiProductId=(lineId,subId,sizeKey,mainId)=>cleanId('katalog-'+lineId+'-'+subId+'-'+sizeKey+'-'+mainId);
// Import-Journal-Schlüssel wie katalog-import.mjs: importKey(line,sub,size)+':'+hauptprodukt.
export const importKeyFor=(lineId,subId,sizeKey,mainId)=>'katalog:'+lineId+':'+subId+':'+sizeKey+':'+mainId;

// Befestigungswerte einer Größe – Spiegel von product-families.mjs `familyProductConfig`
// (K00 „Ohne Bohrung“ zuerst, wenn die Familie es anbietet; dann die Regeln der Größe in Katalogfolge, Kennung = SKU-Endung).
export function mountingValues(family,size){
 const values=[];
 if(family.withoutMounting)values.push({key:'K00',label:'Ohne Bohrung',priceCents:0,ruleId:null,skuSuffix:null});
 for(const rid of size.mounting){
  const r=family.mountingRules.find(r=>r.id===rid);if(!r)fail(size.key+': Befestigungsregel „'+rid+'“ fehlt in der Familie.');
  values.push({key:r.skuSuffix,label:r.label,priceCents:r.priceCents,ruleId:r.id,skuSuffix:r.skuSuffix});
 }
 if(new Set(values.map(v=>v.key)).size!==values.length)fail(size.key+': zwei Befestigungen mit gleicher SKU-Endung.');
 return values;
}
// Basis-SKU eines Hauptprodukts je Größe: ausdrückliche Zuordnung (--sku-map) > externalIds.sku-<größe> >
// externalIds.sku (nur bei genau einer Größe) > Startdesign-Kennung (nur bei genau einer Größe; so bei Edelstahl 7x2:
// Design-Kennung = Bestands-SKU). Sonst offen – nichts wird erfunden.
export function skuBaseFor(main,size,{sizesCount,skuMap={},konfiId}={}){
 if(konfiId&&typeof skuMap[konfiId]==='string'&&skuMap[konfiId].trim())return {sku:skuMap[konfiId].trim(),source:'sku-map'};
 const ext=main.externalIds||{},perSize=ext['sku-'+size.key.toLowerCase()];
 if(typeof perSize==='string'&&perSize)return {sku:perSize,source:'externalIds.sku-'+size.key.toLowerCase()};
 if(typeof ext.sku==='string'&&ext.sku){if(sizesCount===1)return {sku:ext.sku,source:'externalIds.sku'};return {sku:null,reason:'externalIds.sku gilt nur bei genau einer Größe; je Größe externalIds.sku-<größe> oder --sku-map angeben.'};}
 if(sizesCount===1)return {sku:main.startDesign,source:'startDesign'};
 return {sku:null,reason:'Basis-SKU je Größe fehlt (externalIds.sku-<größe> oder --sku-map).'};
}
const stripFamily=f=>{const {_file,_material,...rest}=f;return structuredClone(rest);};

// Soll je Hauptprodukt × Größe einer Linie. `only`: {subcategories, sizes, mainProducts} wie katalog-import.
export function targetsForLine(katalog,lineId,{only=null,skuMap={},allDesigns=false}={}){
 const line=katalog.lines.get(lineId);if(!line)fail('Linie „'+lineId+'“ ist im Katalog nicht vorhanden ('+[...katalog.lines.keys()].join(', ')+').','line_missing');
 const targets=[],notes=[];
 if(!line.families.length)notes.push('Linie „'+line.id+'“ hat noch keine Familie.');
 for(const familyId of line.families){
  const doc=stripFamily(katalog.families.get(familyId));
  for(const sub of line.subcategories){
   if(only?.subcategories&&!only.subcategories.includes(sub.id))continue;
   const mains=Array.isArray(sub.mainProducts)?sub.mainProducts:[];
   if(!mains.length){notes.push('Unterkategorie „'+sub.id+'“ ohne Hauptprodukte – kein Shop-Abgleich.');continue;}
   let priced;try{priced=applyPriceOverrides(doc,sub);}catch(e){notes.push('Unterkategorie „'+sub.id+'“: '+e.message);continue;}
   for(const main of mains){
    if(only?.mainProducts&&!only.mainProducts.includes(main.id))continue;
    const offeredKeys=main.sizesOffered??sub.sizesOffered;
    const offered=Array.isArray(offeredKeys)?priced.sizes.filter(s=>offeredKeys.includes(s.key)):priced.sizes;
    for(const size of offered.filter(s=>!only?.sizes||only.sizes.includes(s.key))){
     const id=konfiProductId(line.id,sub.id,size.key,main.id),open=[...priceGaps(priced,size)];
     const base=skuBaseFor(main,size,{sizesCount:offered.length,skuMap,konfiId:id});
     if(!base.sku)open.push('Basis-SKU offen: '+base.reason);
     let values=[];try{values=mountingValues(priced,size);}catch(e){open.push(e.message);}
     const variants=values.map(v=>({mountingKey:v.key,ruleId:v.ruleId,label:v.label,sku:base.sku?(v.key==='K00'?base.sku:base.sku+'-'+v.skuSuffix):null,surchargeCents:v.priceCents,priceCents:size.baseCents===null||v.priceCents===null?null:size.baseCents+v.priceCents}));
     if(!variants.length)open.push('Keine Befestigung für '+size.label+' (Familie ohne „Ohne Bohrung“ und ohne Regeln).');
     const customizationId=typeof main.externalIds?.customizationId==='string'?main.externalIds.customizationId:null;
     const master=katalog.designs.masters.find(d=>d.id===main.startDesign)??null;
     if(!master){if(!allDesigns)open.push('Startdesign „'+main.startDesign+'“ nicht im Katalog (Lieferform 2) – keine Freigabe möglich.');}
     else if(!master.released&&!allDesigns)open.push('Startdesign „'+main.startDesign+'“ nicht freigegeben (Design-Dashboard).');
     const designSha256=master?designFingerprint(master):null;
     targets.push({konfiProductId:id,importKey:importKeyFor(line.id,sub.id,size.key,main.id),line:line.id,subcategory:sub.id,family:familyId,sizeKey:size.key,sizeLabel:size.label,
      mainProductId:main.id,startDesign:main.startDesign,designSha256,designReleased:master?.released===true,name:main.name??null,customizationId,skuBase:base.sku,skuSource:base.source??null,basePriceCents:size.baseCents,variants,open});
    }
   }
  }
 }
 return {line:{id:line.id,name:line.name},targets,notes};
}

// Export (products.json von shop-export oder Liste) → Indizes.
export function indexExport(doc){
 const products=Array.isArray(doc)?doc:doc?.products;
 if(!Array.isArray(products))fail('Export: products[] fehlt.','export_format');
 const byId=new Map(),bySku=new Map();
 for(const p of products){
  if(!p?.id||!Array.isArray(p.variants?.nodes))fail('Export: Produkt ohne id oder variants.nodes.','export_format');
  byId.set(p.id,p);
  for(const v of p.variants.nodes){const sku=typeof v.sku==='string'?v.sku.trim():'';if(!sku)continue;if(!bySku.has(sku))bySku.set(sku,[]);bySku.get(sku).push({product:p,variant:v});}
 }
 return {products,byId,bySku,exportedAt:Array.isArray(doc)?null:doc.exportedAt??null,complete:Array.isArray(doc)?false:doc.complete===true,shopDomain:Array.isArray(doc)?null:doc.shopDomain??null};
}
const isDefaultOnly=p=>p.options.length===1&&p.options[0].name==='Title'&&p.variants.nodes.length===1;
const optionValue=v=>(v.selectedOptions||[]).find(o=>o.name===OPTION_NAME)?.value??null;

// Soll ↔ Shop-Produkt: Varianten zuordnen (SKU; Standardvariante → erste Soll-Variante), Änderungen auflisten.
export function compareProduct(target,shop){
 const changes=[],conflicts=[],soll=new Set(target.variants.map(v=>v.sku));
 const befestigung=shop.options.find(o=>o.name===OPTION_NAME),foreign=shop.options.filter(o=>o.name!==OPTION_NAME&&o.name!=='Title');
 if(foreign.length)conflicts.push('Shop-Produkt hat weitere Optionen ('+foreign.map(o=>o.name).join(', ')+') – kein automatischer Abgleich.');
 if(shop.options.length>1)conflicts.push('Shop-Produkt hat mehrere Optionen – kein automatischer Abgleich.');
 const defaultOnly=isDefaultOnly(shop),rows=[];
 for(const [i,v] of target.variants.entries()){
  let hit=shop.variants.nodes.find(s=>(s.sku||'').trim()===v.sku)||null;
  if(!hit&&i===0&&defaultOnly){const d=shop.variants.nodes[0];if(!d.sku||d.sku.trim()===target.skuBase)hit=d;}
  const row={mountingKey:v.mountingKey,label:v.label,sku:v.sku,priceCents:v.priceCents,shopifyVariantId:hit?.id??null,state:hit?'vorhanden':'neu'};
  if(!hit)changes.push('Variante neu: '+v.sku+' „'+v.label+'“ '+euro(v.priceCents));
  else{
   const before=changes.length,price=toCents(hit.price);
   if(price!==v.priceCents)changes.push('Preis '+v.sku+': '+(price===null?'?':euro(price))+' → '+euro(v.priceCents));
   if((hit.sku||'').trim()!==v.sku)changes.push('SKU '+(hit.sku||'(leer)')+' → '+v.sku);
   if(optionValue(hit)!==v.label)changes.push('Optionswert '+v.sku+': '+(optionValue(hit)??'(Standard)')+' → „'+v.label+'“');
   if(hit.inventoryItem?.tracked!==false)changes.push('Bestandsverfolgung aus: '+v.sku);
   if(changes.length>before)row.state='ändern';
  }
  rows.push(row);
 }
 for(const s of shop.variants.nodes){
  const sku=(s.sku||'').trim();
  if(rows.some(r=>r.shopifyVariantId===s.id))continue;
  conflicts.push('Shop-Variante '+(sku||s.id)+' hat keine Soll-Entsprechung und würde durch productSet gelöscht.');
 }
 const sollValues=target.variants.map(v=>v.label);
 if(!befestigung)changes.push('Option „'+OPTION_NAME+'“ anlegen ('+sollValues.length+' Werte)'+(defaultOnly?' – ersetzt „Title/Default Title“':''));
 else if(JSON.stringify(befestigung.values)!==JSON.stringify(sollValues))changes.push('Optionswerte „'+OPTION_NAME+'“: ['+befestigung.values.join(' | ')+'] → ['+sollValues.join(' | ')+']');
 if(target.customizationId!==null){if(shop.metafield?.value!==target.customizationId)changes.push('Metafeld '+METAFIELD.namespace+'.'+METAFIELD.key+': '+(shop.metafield?.value??'(leer)')+' → '+target.customizationId);}
 else if(shop.metafield?.value)changes.push('Hinweis: Shop trägt '+METAFIELD.namespace+'.'+METAFIELD.key+'='+shop.metafield.value+', Katalog nennt keine CustomizationID (bleibt unverändert).');
 if(target.designSha256&&(shop.designSha256??null)!==target.designSha256)changes.push('Metafeld '+DESIGN_METAFIELD.namespace+'.'+DESIGN_METAFIELD.key+': '+(shop.designSha256?shop.designSha256.slice(0,12)+'…':'(leer)')+' → '+target.designSha256.slice(0,12)+'… (Design geändert oder erster Abgleich)');
 // Alle Soll-SKUs im Shop vorhanden, aber doppelt → Konflikt (nie stiller Erster-Treffer).
 for(const sku of soll){const n=shop.variants.nodes.filter(s=>(s.sku||'').trim()===sku).length;if(n>1)conflicts.push('SKU '+sku+' kommt im Shop-Produkt '+n+'× vor.');}
 return {rows,changes:changes.filter(c=>!c.startsWith('Hinweis:')),notes:changes.filter(c=>c.startsWith('Hinweis:')),conflicts,optionId:befestigung?.id??null};
}

export function productSetInput(target,shop,rows){
 // Bestehende Option „Befestigung“ über ihre ID ansprechen (Vollexport); „Title/Default Title“ wird ohne ID durch die neue Option ersetzt.
 const existing=shop?.options.find(o=>o.name===OPTION_NAME);
 const options=[{...(existing?.id?{id:existing.id}:{}),name:OPTION_NAME,position:1,values:target.variants.map(v=>({name:v.label}))}];
 const variants=target.variants.map((v,i)=>{const id=rows?.[i]?.shopifyVariantId;return {...(id?{id}:{}),price:money(v.priceCents),sku:v.sku,position:i+1,optionValues:[{optionName:OPTION_NAME,name:v.label}],inventoryItem:{tracked:false}};});
 const list=[...(target.customizationId===null?[]:[{namespace:METAFIELD.namespace,key:METAFIELD.key,type:METAFIELD.type,value:target.customizationId}]),...(target.designSha256?[{namespace:DESIGN_METAFIELD.namespace,key:DESIGN_METAFIELD.key,type:DESIGN_METAFIELD.type,value:target.designSha256}]:[])];
 const metafields=list.length?{metafields:list}:{};
 if(shop)return {id:shop.id,productOptions:options,variants,...metafields};
 return {title:target.name,status:'DRAFT',productOptions:options,variants,...metafields};
}

export function planShopSync(soll,exportDoc,{shopDomain=SHOP_DOMAIN,generatedAt=new Date().toISOString(),katalogRoot=null,updateData=false}={}){
 const ex=indexExport(exportDoc);
 if(ex.shopDomain&&ex.shopDomain!==shopDomain)fail('Export stammt von '+ex.shopDomain+', Plan ist für '+shopDomain+'.','shop_mismatch');
 const entries=soll.targets.map(target=>{
  const base={konfiProductId:target.konfiProductId,importKey:target.importKey,line:target.line,subcategory:target.subcategory,sizeKey:target.sizeKey,sizeLabel:target.sizeLabel,mainProductId:target.mainProductId,startDesign:target.startDesign,name:target.name,customizationId:target.customizationId,skuBase:target.skuBase,skuSource:target.skuSource,basePriceCents:target.basePriceCents};
  const variants=target.variants.map(v=>({mountingKey:v.mountingKey,label:v.label,sku:v.sku,priceCents:v.priceCents,shopifyVariantId:null,state:'offen'}));
  if(target.open.length)return {...base,action:'offen',reasons:[...target.open],shopify:null,variants,changes:[],input:null,sourceSha256:null};
  const lookup=[...new Set([target.skuBase,...target.variants.map(v=>v.sku)])],hits=lookup.flatMap(sku=>(ex.bySku.get(sku)||[]).map(h=>({sku,...h})));
  const reasons=[];
  for(const sku of lookup){const h=ex.bySku.get(sku)||[];if(h.length>1)reasons.push('SKU '+sku+' doppelt im Shop: '+h.map(x=>x.product.id+' ('+x.product.handle+')').join(', '));}
  const productIds=[...new Set(hits.map(h=>h.product.id))];
  if(productIds.length>1)reasons.push('Soll-SKUs verteilen sich auf mehrere Shop-Produkte: '+productIds.join(', '));
  if(reasons.length)return {...base,action:'konflikt',reasons,shopify:null,variants,changes:[],input:null,sourceSha256:null};
  if(!productIds.length){
   if(!ex.complete)return {...base,action:'offen',reasons:['Kein Treffer im Teilexport – Neuanlage erst nach vollständigem Export planen.'],shopify:null,variants,changes:[],input:null,sourceSha256:null};
   if(!target.name)return {...base,action:'offen',reasons:['Kein Shop-Produkt und kein Name im Katalog (mainProducts[].name) – Neuanlage braucht einen Titel.'],shopify:null,variants,changes:[],input:null,sourceSha256:null};
   const input=productSetInput(target,null,null);
   return {...base,action:'create',reasons:['Kein Shop-Produkt mit diesen SKUs; Anlage als DRAFT ohne Texte/Bilder (nachzupflegen).'],shopify:null,variants:variants.map(v=>({...v,state:'neu'})),changes:['Produkt neu (DRAFT): '+target.name,...target.variants.map(v=>'Variante neu: '+v.sku+' „'+v.label+'“ '+euro(v.priceCents))],input,sourceSha256:sha(input)};
  }
  const shop=ex.byId.get(productIds[0]),cmp=compareProduct(target,shop);
  const shopify={productId:shop.id,handle:shop.handle,title:shop.title,status:shop.status,optionId:cmp.optionId};
  if(cmp.conflicts.length)return {...base,action:'konflikt',reasons:cmp.conflicts,shopify,variants:cmp.rows,changes:cmp.changes,input:null,sourceSha256:null};
  if(!cmp.changes.length)return {...base,action:'unverändert',reasons:cmp.notes,shopify,variants:cmp.rows,changes:[],input:null,sourceSha256:null};
  if(target.designSha256&&shop.designSha256===target.designSha256&&!updateData)return {...base,action:'unverändert',reasons:[...cmp.notes,'Design unverändert (Metafeld '+DESIGN_METAFIELD.key+' gleich) – '+cmp.changes.length+' Datenabweichung(en) bleiben, bis --daten-aktualisieren gesetzt ist.'],shopify,variants:cmp.rows,changes:cmp.changes,dataChangesSkipped:true,input:null,sourceSha256:null};
  const input=productSetInput(target,shop,cmp.rows);
  return {...base,action:'update',reasons:cmp.notes,shopify,variants:cmp.rows,changes:cmp.changes,input,sourceSha256:sha(input),
   expectedShop:{variants:shop.variants.nodes.map(v=>({id:v.id,sku:v.sku??null,price:v.price})),options:shop.options.map(o=>o.name),metafield:shop.metafield?.value??null,designSha256:shop.designSha256??null}};
 });
 const counts=Object.fromEntries(ACTIONS.map(a=>[a,entries.filter(e=>e.action===a).length]));
 return {schema:PLAN_SCHEMA,shopDomain,apiVersion:API_VERSION,generatedAt,katalog:katalogRoot,line:soll.line,export:{exportedAt:ex.exportedAt,complete:ex.complete,products:ex.products.length},notes:soll.notes,counts,entries};
}

export function formatPlan(plan){
 const lines=[`Linie ${plan.line.id} – ${plan.line.name}: ${plan.entries.length} Hauptprodukt-Größen gegen Export (${plan.export.products} Produkte, ${plan.export.complete?'vollständig':'TEILEXPORT'}${plan.export.exportedAt?', '+plan.export.exportedAt:''})`];
 for(const e of plan.entries){
  lines.push(`${e.action.padEnd(11)} ${e.konfiProductId}  Basis-SKU ${e.skuBase??'offen'}${e.skuSource?' ('+e.skuSource+')':''}${e.shopify?'  → '+e.shopify.productId+' '+e.shopify.handle+' ['+e.shopify.status+']':''}`);
  for(const r of e.reasons||[])lines.push('             · '+r);
  for(const c of e.changes||[])lines.push('             + '+c);
 }
 lines.push('Summe: '+ACTIONS.map(a=>a+' '+plan.counts[a]).join(', '));
 for(const n of plan.notes)lines.push('  Hinweis: '+n);
 return lines.join('\n');
}

// ---- Anwenden (productSet je Produkt, Journal wie scripts/gt22x14-serienimport) ----
const read=(record,soll)=>{
 if(!record)fail('Produkt nicht gefunden.');
 if(record.variants.pageInfo?.hasNextPage)fail('Produkt hat mehr als 100 Varianten.');
 return {id:record.id,handle:record.handle,status:record.status,options:record.options.map(o=>({id:o.id??null,name:o.name,values:Array.isArray(o.optionValues)?o.optionValues.map(v=>v.name):o.values})),metafield:record.metafield?.value??null,
  variants:record.variants.nodes.map(v=>({id:v.id,sku:v.sku??null,price:v.price,tracked:v.inventoryItem?.tracked,option:(v.selectedOptions||[]).find(o=>o.name===OPTION_NAME)?.value??null}))};
};
export function verifyApplied(record,entry){
 const r=read(record);
 if(r.options.length!==1||r.options[0].name!==OPTION_NAME||JSON.stringify(r.options[0].values)!==JSON.stringify(entry.variants.map(v=>v.label)))fail(entry.konfiProductId+': Option „'+OPTION_NAME+'“ nach dem Schreiben nicht wie geplant.');
 if(r.variants.length!==entry.variants.length)fail(entry.konfiProductId+': Variantenanzahl nach dem Schreiben '+r.variants.length+' statt '+entry.variants.length+'.');
 for(const v of entry.variants){
  const s=r.variants.find(x=>x.sku===v.sku);
  if(!s||toCents(s.price)!==v.priceCents||s.option!==v.label||s.tracked!==false)fail(entry.konfiProductId+': Variante '+v.sku+' nach dem Schreiben nicht wie geplant.');
  if(v.shopifyVariantId&&s.id!==v.shopifyVariantId)fail(entry.konfiProductId+': Varianten-ID '+v.sku+' hat sich geändert ('+v.shopifyVariantId+' → '+s.id+').');
 }
 if(entry.customizationId!==null&&r.metafield!==entry.customizationId)fail(entry.konfiProductId+': Metafeld nach dem Schreiben nicht gesetzt.');
 return {id:r.id,handle:r.handle,status:r.status,variants:r.variants.map(v=>({id:v.id,sku:v.sku,price:v.price}))};
}
function expectUnchanged(record,entry){
 const r=read(record),e=entry.expectedShop;
 const same=JSON.stringify(r.variants.map(v=>({id:v.id,sku:v.sku,price:toCents(v.price)})))===JSON.stringify(e.variants.map(v=>({id:v.id,sku:v.sku,price:toCents(v.price)})))&&JSON.stringify(r.options.map(o=>o.name))===JSON.stringify(e.options)&&r.metafield===e.metafield;
 if(!same)fail(entry.konfiProductId+': Shop-Stand weicht vom Export ab – Export erneuern und neu planen.');
}
async function atomic(file,value){const temp=file+'.new';await fsp.writeFile(temp,JSON.stringify(value,null,2));await fsp.rename(temp,file);}
export async function applyPlan(plan,{transport,journalDir,shopDomain=SHOP_DOMAIN,includeCreate=false,log=()=>{}}){
 if(plan?.schema!==PLAN_SCHEMA)fail('Kein shop-sync-Plan.');
 if(plan.shopDomain!==shopDomain)fail('Plan ist für '+plan.shopDomain+', nicht für '+shopDomain+'.');
 await fsp.mkdir(journalDir,{recursive:true});
 const lock=path.join(journalDir,'writer.lock');let handle;
 try{handle=await fsp.open(lock,'wx');}catch{fail('Ein anderer Lauf läuft oder sein Sperrstand ('+lock+') muss geprüft werden.');}
 const results=[];
 try{
  for(const entry of plan.entries){
   if(!(entry.action==='update'||(includeCreate&&entry.action==='create'))){results.push({konfiProductId:entry.konfiProductId,action:entry.action,state:'übersprungen'});continue;}
   const file=path.join(journalDir,entry.konfiProductId+'.json');
   let old=null;try{old=JSON.parse(await fsp.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(old?.state==='completed'&&old.sourceSha256===entry.sourceSha256){results.push({konfiProductId:entry.konfiProductId,action:entry.action,state:'bereits erledigt',productId:old.productId});continue;}
   if(old&&old.state!=='completed')fail(entry.konfiProductId+': früherer Lauf unbestätigt (Journal '+old.state+') – Shop prüfen, Journal von Hand auflösen.');
   if(old&&old.sourceSha256!==entry.sourceSha256)log(entry.konfiProductId+': geänderter Plan seit letztem Lauf – wird neu geschrieben.');
   if(entry.action==='update'){
    const before=await transport(PRODUCT_READ_QUERY,{id:entry.shopify.productId});
    if(before.shop?.myshopifyDomain!==shopDomain||before.shop.currencyCode!=='EUR')fail('Shop oder Währung stimmen nicht.');
    expectUnchanged(before.product,entry);
   }
   await atomic(file,{state:'started',action:entry.action,sourceSha256:entry.sourceSha256,productId:entry.shopify?.productId??null,at:new Date().toISOString()});
   let result;
   try{result=await transport(PRODUCT_SET_MUTATION,{input:entry.input});}
   catch(e){await atomic(file,{state:'unknown',action:entry.action,sourceSha256:entry.sourceSha256,productId:entry.shopify?.productId??null,error:e.message,at:new Date().toISOString()});throw e;}
   const set=result.productSet;
   if(set?.userErrors?.length||!set?.product?.id){await atomic(file,{state:'rejected',action:entry.action,sourceSha256:entry.sourceSha256,productId:entry.shopify?.productId??null,userErrors:set?.userErrors??null,at:new Date().toISOString()});fail(entry.konfiProductId+': Shopify hat die Änderung abgelehnt: '+JSON.stringify(set?.userErrors??'keine Antwort'));}
   let verified;
   try{verified=verifyApplied(set.product,entry);}
   catch(e){await atomic(file,{state:'unknown',action:entry.action,sourceSha256:entry.sourceSha256,productId:set.product.id,error:e.message,at:new Date().toISOString()});throw e;}
   await atomic(file,{state:'completed',action:entry.action,sourceSha256:entry.sourceSha256,productId:verified.id,handle:verified.handle,status:verified.status,variants:verified.variants,at:new Date().toISOString()});
   log(entry.konfiProductId+': '+entry.action+' → '+verified.id+' ('+verified.variants.length+' Varianten)');
   results.push({konfiProductId:entry.konfiProductId,action:entry.action,state:'geschrieben',productId:verified.id,variants:verified.variants.length});
  }
  return results;
 }finally{await handle?.close();await fsp.unlink(lock).catch(()=>{});}
}
export function clientTransport(client){return async(query,variables)=>(await client.graphql(query,variables)).data;}

export function parseArgs(argv){
 const value=name=>{const i=argv.indexOf('--'+name);return i>=0&&!String(argv[i+1]??'').startsWith('--')?argv[i+1]:undefined;};
 const list=name=>value(name)?value(name).split(',').map(v=>v.trim()).filter(Boolean):null;
 const only=(list('unterkategorie')||list('groesse')||list('hauptprodukt'))?{subcategories:list('unterkategorie'),sizes:list('groesse'),mainProducts:list('hauptprodukt')}:null;
 return {katalog:value('katalog')||process.env.GRAVURU_KATALOG,line:value('linie'),exportFile:value('export'),out:value('out'),skuMap:value('sku-map'),journal:value('journal'),only,apply:argv.includes('--apply'),create:argv.includes('--create'),allDesigns:argv.includes('--alle-designs'),updateData:argv.includes('--daten-aktualisieren'),quiet:argv.includes('--quiet')};
}
export async function run(argv,{env=process.env,fetchImpl=globalThis.fetch,stdout=process.stdout,stderr=process.stderr}={}){
 const args=parseArgs(argv);
 if(!args.katalog||!args.line||!args.exportFile||!args.out)fail('Aufruf: node scripts/shop-sync.mjs --katalog <pfad> --linie <id> --export <products.json> --out <plan.json> [--unterkategorie a,b] [--groesse k1,k2] [--hauptprodukt id] [--sku-map <json>] [--apply [--create] [--journal <ordner>]]');
 const log=m=>{if(!args.quiet)stderr.write(m+'\n');};
 const katalog=openKatalog(args.katalog),skuMap=args.skuMap?JSON.parse(fs.readFileSync(args.skuMap,'utf8')):{};
 const soll=targetsForLine(katalog,args.line,{only:args.only,skuMap,allDesigns:args.allDesigns});
 const exportDoc=JSON.parse(fs.readFileSync(args.exportFile,'utf8'));
 const plan=planShopSync(soll,exportDoc,{katalogRoot:katalog.root,updateData:args.updateData});
 fs.mkdirSync(path.dirname(path.resolve(args.out)),{recursive:true});
 fs.writeFileSync(args.out,JSON.stringify(plan,null,1)+'\n');
 stdout.write(formatPlan(plan)+'\nPlan: '+args.out+'\n');
 if(!args.apply){stdout.write('Dry-run: nichts geschrieben. Mit --apply werden '+plan.counts.update+' Produkte aktualisiert'+(args.create?' und '+plan.counts.create+' angelegt':' (Neuanlagen nur mit --create)')+'.\n');return {plan,results:null};}
 const credentials=readCredentials(env);log('Zugang: '+credentials.source+' ('+credentials.kind+')');
 const client=createShopifyClient({credentials,fetchImpl,log});
 const results=await applyPlan(plan,{transport:clientTransport(client),journalDir:path.resolve(args.journal||path.join(path.dirname(path.resolve(args.out)),'.shop-sync-journal')),includeCreate:args.create,log});
 stdout.write(JSON.stringify({written:results.filter(r=>r.state==='geschrieben').length,alreadyDone:results.filter(r=>r.state==='bereits erledigt').length,skipped:results.filter(r=>r.state==='übersprungen').length,results},null,1)+'\n');
 return {plan,results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(e=>{process.stderr.write((e.code?'['+e.code+'] ':'')+e.message+'\n');process.exitCode=1;});

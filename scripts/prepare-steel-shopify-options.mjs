// Read-only bridge from the pinned catalogue to a reviewable product-group plan.
// The existing family/quote contract owns geometry, combinations and prices.
// No credentials, database writes, Shopify mutations or confirmation shortcuts.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateFamily,familyProductConfig} from '../app/workshop/product-families.mjs';
import {quote,variantCombinations} from '../app/configurator/variant-m/contract.mjs';

export const FAMILY_PATH='familien/edelstahl/steel-door-signs.json';
export const STEEL_FORMS=Object.freeze({RE:27,AB:10,QU:7,OV:10,EL:7,R:5,RT1:7,RT2:7});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=value=>hash(JSON.stringify(value));
const fail=message=>{throw Error(message);};
const money=cents=>(cents/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';

export function prepareSteelOptions(bytes,{commit,blob}={}){
 if(!Buffer.isBuffer(bytes)||!/^[a-f0-9]{40}$/.test(commit||'')||!/^[a-f0-9]{40}$/.test(blob||''))fail('Gepinnte Katalogquelle erforderlich.');
 const actualBlob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(actualBlob!==blob)fail('Katalogdatei stimmt nicht mit dem bestätigten Git-Stand überein.');
 const family=validateFamily(JSON.parse(bytes.toString('utf8')));
 if(family.id!=='steel-door-signs'||family.material.kind!=='steel')fail('Keine Edelstahl-Türschild-Familie.');
 if(family.groups.length!==Object.keys(STEEL_FORMS).length)fail('Vollständige acht Formen erforderlich.');
 for(const [key,count] of Object.entries(STEEL_FORMS)){
  if(family.groups.filter(g=>g.key===key).length!==1||family.sizes.filter(s=>s.groupKey===key).length!==count)fail('Form/Größenbestand abweichend: '+key);
 }
 const rows=family.sizes.map(size=>{
  const view={...family,groups:family.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};
  // Native scaffolding is used only in memory to validate options; it is never
  // saved or substituted for a real catalogue design in a customer product.
  const config=familyProductConfig(view,size,1,{previewOnly:true}),p=config.profile;
  if(p.optionGroups.length!==1||p.optionGroups[0].id!=='mounting'||p.optionFields?.length)fail('Neue Optionsgruppen oder Zusatzfelder benötigen eine eigene Prüfung: '+size.key);
  const variants=variantCombinations(config).map(options=>{
   const choice=p.optionGroups[0].values.find(v=>v.id===options.mounting);
   const price=quote(config,[],p.defaultDesignId,options).unitCents;
   if(!Number.isSafeInteger(price)||price!==size.baseCents+choice.priceCents)fail('Native Preisprüfung abweichend: '+size.key);
   return {key:size.key+':'+choice.id,mountingId:choice.id,label:choice.label,extraPriceCents:choice.priceCents,unitPriceCents:price,
    holes:structuredClone(choice.holes||[]),...(choice.mountingRule?{mountingRule:structuredClone(choice.mountingRule)}:{})};
  });
  return {sizeKey:size.key,formKey:size.groupKey,label:size.label,widthMm:size.widthMm,heightMm:size.heightMm,
   basePriceCents:size.baseCents,geometry:structuredClone(p.geometry),variants};
 });
 const body={schema:'gravuru-steel-shopify-options/v1',source:{repository:'Chris83638w/gravuru-katalog.',commit,path:FAMILY_PATH,blob,sha256:hash(bytes)},
  scope:'options-review-only',confirmation:{status:'pending',authority:'product-group-templates',requiredBeforeProductCreation:true},
  shopifyWrites:0,productsCreated:0,published:false,layoutChanges:false,currency:'EUR',material:structuredClone(family.material),
  navigation:['Form','Größe','Befestigung'],forms:family.groups.map(g=>({key:g.key,name:g.name,sizes:rows.filter(r=>r.formKey===g.key).length})),
  counts:{forms:family.groups.length,sizes:rows.length,combinations:rows.reduce((n,r)=>n+r.variants.length,0)},rows};
 return {...body,reviewSha256:digest(body)};
}

// Re-read the source before turning a reviewed inventory into the existing
// product-group creation plan. A JSON boolean is never an approval token.
export function verifySteelOptions(plan,bytes){
 const current=prepareSteelOptions(bytes,plan?.source),{reviewSha256,...body}=plan||{};
 if(reviewSha256!==digest(body)||current.reviewSha256!==reviewSha256)fail('Optionsübersicht oder Katalog wurde geändert; erneut anzeigen und bestätigen.');
 return current;
}

// A complete readback of ONE existing product is enough to compare that product,
// never to justify creating another one. Identity and prefix are explicit inputs.
export function compareSteelShopProduct(plan,product,{productId,skuPrefix,shopDomain,currency}={}){
 const {reviewSha256,...body}=plan||{};
 if(reviewSha256!==digest(body)||plan.schema!=='gravuru-steel-shopify-options/v1')fail('Optionsübersicht ungültig.');
 if(shopDomain!=='gravuru-design.myshopify.com'||currency!=='EUR')fail('Shop und Euro-Währung müssen bestätigt sein.');
 if(!/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(productId||'')||product?.id!==productId||!skuPrefix||!/^[A-Za-z0-9-]+$/.test(skuPrefix))fail('Bestehendes Produkt und SKU-Präfix müssen eindeutig sein.');
 if(!Array.isArray(product.variants?.nodes)||product.variants.pageInfo?.hasNextPage!==false)fail('Alle Varianten dieses Produkts müssen gelesen sein.');
 const expected=new Map(plan.rows.flatMap(row=>row.variants.map(v=>[skuPrefix+row.sizeKey+'-'+v.mountingId,{...v,sizeKey:row.sizeKey,formKey:row.formKey}])));
 const seen=new Set(),ids=new Set(),matched=[],changes=[],issues=[];
 for(const v of product.variants.nodes){
  if(seen.has(v.sku)||ids.has(v.id)||!/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/.test(v.id||''))fail('Doppelte oder ungültige Variantenkennung.');
  seen.add(v.sku);ids.add(v.id);const e=expected.get(v.sku);
  if(!e){issues.push({code:'unexpected_variant',sku:v.sku,variantId:v.id});continue;}
  const priceMatch=typeof v.price==='string'&&v.price.match(/^(\d+)\.(\d{1,2})$/);
  const price=priceMatch?Number(priceMatch[1])*100+Number(priceMatch[2].padEnd(2,'0')):NaN;
  if(!Number.isSafeInteger(price))fail('Ungültiger Shopify-Preis.');
  const row={sizeKey:e.sizeKey,formKey:e.formKey,mountingId:e.mountingId,shopifyVariantId:v.id,sku:v.sku,priceCents:price,expectedPriceCents:e.unitPriceCents};
  matched.push(row);if(price!==e.unitPriceCents)changes.push({...row,code:'price_difference'});
 }
 for(const [sku,e] of expected)if(!seen.has(sku))issues.push({code:'missing_variant',sku,sizeKey:e.sizeKey,mountingId:e.mountingId});
 return {schema:'gravuru-steel-shopify-comparison/v1',reviewSha256,shopDomain,shopifyProductId:product.id,status:product.status,
  scope:'read-only-existing-product',creationAllowed:false,writesAllowed:false,shopifyWrites:0,
  mappingBasis:'exact-sku-and-variant-id',customerOptionLabelsApproved:false,nativeSessionBindingVerified:false,
  mappingComplete:issues.length===0&&matched.length===expected.size,pricesMatch:changes.length===0&&issues.length===0,
  expectedVariants:expected.size,readVariants:product.variants.nodes.length,matched,changes,issues};
}

export function renderSteelOptions(plan){
 const lines=['# Edelstahl-Türschilder – Optionen vor der Anlage','',
  '**Noch nicht bestätigt. Kein Produkt angelegt, kein Shop geändert.**','',
  `Quelle: [Katalog ${plan.source.commit.slice(0,8)}](https://github.com/${plan.source.repository}/blob/${plan.source.commit}/${FAMILY_PATH}).`,
  `Prüfsumme dieser Übersicht: \`${plan.reviewSha256}\`.`,
  '',`${plan.material.label}, ${plan.material.thicknessMm.toLocaleString('de-DE')} mm. Reiter: **Form → Größe → Befestigung**.`,
  `${plan.counts.forms} Formen, ${plan.counts.sizes} Größen, ${plan.counts.combinations} gültige Grundausführungen. Die Beträge stammen aus der bestehenden Konfi-Preisberechnung.`,
  '', 'Die Liste ist eine vollständige Katalogübersicht. Designfreigaben, Hauptbilder, Foto-/Logorechte und vorhandene Shopify-Zuordnungen werden vor einer Anlage gesondert gebunden. Das ist kein Veröffentlichungsplan.',
  '', 'Maße rechts sind die tatsächlichen Produktionsmaße. Abweichende gerundete Katalogbezeichnungen bleiben hier sichtbar, bis ihre Benennung bestätigt ist.'];
 for(const form of plan.forms){
  lines.push('',`## ${form.name} (${form.sizes} Größen)`,'','| Kataloggröße | Tatsächliche Maße | Grundpreis | Verfügbare Befestigungen: Aufpreis → Gesamt |','|---|---|---:|---|');
  for(const r of plan.rows.filter(r=>r.formKey===form.key))lines.push(`| ${r.label} | ${r.widthMm} × ${r.heightMm} mm | ${money(r.basePriceCents)} | ${r.variants.map(v=>`${v.label}: +${money(v.extraPriceCents)} → ${money(v.unitPriceCents)}`).join('; ')} |`);
 }
 return lines.join('\n')+'\n';
}

export function runSteelOptions({catalogue,commit,output}){
 if(!catalogue||!/^[a-f0-9]{40}$/.test(commit||'')||!output)fail('Katalogpfad, vollständiger Commit und neuer Ausgabeordner erforderlich.');
 const git=args=>execFileSync('git',['-C',path.resolve(catalogue),...args],{maxBuffer:8*1024*1024});
 const bytes=git(['show',commit+':'+FAMILY_PATH]),blob=git(['rev-parse',commit+':'+FAMILY_PATH]).toString().trim();
 const plan=prepareSteelOptions(bytes,{commit,blob});
 const out=path.resolve(output);fs.mkdirSync(out,{recursive:false});
 fs.writeFileSync(path.join(out,'options-plan.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(out,'options-review.md'),renderSteelOptions(plan),{flag:'wx'});
 return {output:out,reviewSha256:plan.reviewSha256,...plan.counts,shopifyWrites:0};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const args=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
 if(Object.keys(args).some(k=>!['--catalogue','--commit','--output'].includes(k)))fail('Unbekannte Option.');
 console.log(JSON.stringify(runSteelOptions({catalogue:args['--catalogue'],commit:args['--commit'],output:args['--output']})));
}

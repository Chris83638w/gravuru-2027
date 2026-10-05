import {createHash} from 'node:crypto';
import {isFormProduct,formReadiness} from './form-product.mjs';
import {validateProductDocument,resolveProduct} from './product-model.mjs';
import {quote} from '../configurator/variant-m/contract.mjs';
import {variantKey} from '../configurator/variant-m/commerce-model.mjs';
// Read-only preparation. No Shopify credentials, IDs, writes or publication are fabricated.
export function prepareShopProduct(record){
 const d=validateProductDocument(record.document),form=isFormProduct(d),checks=[],variants=[];
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
  const groups=d.config.profile.optionGroups;let options=[{}];for(const group of groups)options=options.flatMap(o=>group.values.map(v=>({...o,[group.id]:v.id})));
  for(const option of options){const resolved=resolveProduct(d,{options:option}),price=quote(resolved.config,[],resolved.designId,option);variants.push({key:variantKey(option),title:groups.map(g=>g.values.find(v=>v.id===option[g.id]).label||option[g.id]).join(' · '),options:option,priceCents:price.unitCents,widthMm:resolved.physical.widthMm,heightMm:resolved.physical.heightMm});}
  check('variants',true,variants.length+' gültige Ausführungen aus derselben Preis-/Variantenprüfung wie im Konfigurator.');
 }
 check('seo',Boolean(d.seo?.title?.trim()&&d.seo?.description?.trim()),'Titel und Beschreibung für die Produktseite'+(d.seo?.title?.trim()&&d.seo?.description?.trim()?' sind vorbereitet.':' noch ergänzen.'));
 const extras=form?{motifCents:0,photoCents:0}:{motifCents:d.config.extraMotifCents||0,photoCents:d.config.photo?.extraPriceCents||0};
 check('pricingConnection',false,extras.motifCents||extras.photoCents?'Zusätzliche Motive/Fotos benötigen eine serverseitig geprüfte Shopify-Aufpreisbindung. Die Tabelle enthält nur die Grundausführungen.':'Shopify-Varianten und Preise müssen noch mit den gespeicherten Ausführungen verbunden werden.');
 check('store',false,'Entwicklungsstore und App-Anbindung sind in dieser Anwendung noch nicht eingerichtet.');
 check('orders',false,'Bestelleingang, Zahlung, unveränderliche Position und Kundenkonto-Download müssen noch durchgängig angebunden werden.');
 check('production',false,'Technische Ausgaben ersetzen keine Material-/RIP-/Maschinenabnahme.');
 const profile=record.metadata?.productionProfile;
 const value={schema:'gravuru-shop-preparation/v1',configuration:{id:record.id,revision:record.revision,status:record.status},title:d.name,seo:d.seo,currency:'EUR',variants,extras,designs:designs.map(v=>({id:v.id,name:v.name})),productionProfile:profile?{id:profile.id,revision:profile.revision,sha256:profile.sha256}:null,checks,sourceReady:checks.filter(v=>['availability','kind','designs','material','method','price','variants'].includes(v.id)).every(v=>v.status==='ready'),shopReady:false,productionReady:false,shopifyProductId:null,scope:'preparation-only',formChecklist:form?formReadiness(d):[]};
 return {...value,sha256:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
}

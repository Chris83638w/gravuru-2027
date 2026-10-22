import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {buildBatch,holes,variantMatrix,verifyRead,applyBatch,CREATE_QUERY,ownedUpdateInput} from './serienimport.mjs';
const plan=JSON.parse(await fs.readFile(new URL('./produktplan.fixture.json',import.meta.url),'utf8'));
const media=Object.fromEntries(plan.products.map((p,i)=>[p.id,[{id:'gid://shopify/MediaImage/'+(i+101),alt:'Hunde-Gedenktafel '+p.contentOutline.motif}]]));
const batch=buildBatch(plan,{mediaByProduct:media});
function remote(p){return {id:'gid://shopify/Product/12345',handle:p.handle,title:p.input.title,status:'DRAFT',descriptionHtml:p.input.descriptionHtml,tags:p.input.tags,seo:p.input.seo,metafields:{nodes:p.input.metafields},variants:{nodes:p.variants.map((v,i)=>({id:'gid://shopify/ProductVariant/'+(1000+i),sku:v.sku,price:(v.priceCents/100).toFixed(2),selectedOptions:v.options.map(x=>({name:x.optionName,value:x.name}))})),pageInfo:{hasNextPage:false}},media:{nodes:p.images.map(x=>({...x,image:{url:'https://cdn.shopify.com/test.png'}})),pageInfo:{hasNextPage:false}}};}
const resultFor=nodes=>({shop:{myshopifyDomain:'gravuru-design.myshopify.com',currencyCode:'EUR'},products:{nodes,pageInfo:{hasNextPage:false}}});
test('Vier Produkte erhalten dieselben 16 Hunde-Designs und jeweils ihr Hauptdesign',()=>{assert.equal(batch.length,4);for(const p of batch){assert.equal(p.configuration.designIds.length,16);assert.ok(p.configuration.designIds.includes(p.configuration.startDesign));assert.equal(p.input.status,'DRAFT');assert.deepEqual(p.configuration.designIds,batch[0].configuration.designIds);}});
test('Bohrungen liegen 19 mm vom Rand; Halterkopf beeinflusst sie nicht',()=>{assert.deepEqual(holes(plan.geometry,2),[{x:19,y:70,diameter:4},{x:201,y:70,diameter:4}]);assert.deepEqual(holes(plan.geometry,4),[{x:19,y:19,diameter:4},{x:201,y:19,diameter:4},{x:19,y:121,diameter:4},{x:201,y:121,diameter:4} ]);assert.deepEqual(batch[0].configuration.holePatterns.standoffs,[{x:19,y:70,diameter:8},{x:201,y:70,diameter:8}]);});
test('Zubehör ist kombinierbar und einzeln exakt bepreist',()=>{const m=variantMatrix(plan.prices,'TEST');assert.equal(m.length,48);assert.equal(new Set(m.map(x=>x.key)).size,48);assert.equal(m.find(x=>x.key==='K00-S0-SI0').priceCents,2599);assert.equal(m.find(x=>x.key==='B02-S0-SI0').priceCents,2908);assert.equal(m.find(x=>x.key==='B04S-SK-SI40').priceCents,4846);assert.equal(m.find(x=>x.key==='AH02-SKSS-SI40').priceCents,6395);});
test('Falsche Tierart und offene Preise sperren die Anlage',()=>{const a=structuredClone(plan);a.products[0].designIds[0]='GT-S-22x14-D229';assert.throws(()=>buildBatch(a),/Tierart/);const b=structuredClone(plan);b.prices.extraPhotoCents=null;assert.throws(()=>buildBatch(b),/Preis offen/);});
test('Rücklesen erkennt falsche Preise, SEO und Galerie',()=>{const p=batch[0],r=remote(p);assert.equal(verifyRead(r,p).variants,48);const wrong=structuredClone(r);wrong.variants.nodes[1].price='0.01';assert.throws(()=>verifyRead(wrong,p),/Preis/);const wrongSeo=structuredClone(r);wrongSeo.seo.title='falsch';assert.throws(()=>verifyRead(wrongSeo,p),/Produktinhalt/);const wrongGallery=structuredClone(r);wrongGallery.metafields.nodes=wrongGallery.metafields.nodes.map(x=>x.key==='design_ids'?{...x,value:'[]'}:x);assert.throws(()=>verifyRead(wrongGallery,p),/Metafeld/);});
test('Wiederholung eines bestätigten Imports erzeugt kein zweites Produkt',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'gravuru-journal-test-'));let writes=0,created=false;const p=batch[0];const transport=async(q)=>{if(q===CREATE_QUERY){writes++;created=true;return {productSet:{product:{id:'gid://shopify/Product/12345'},userErrors:[]}};}return resultFor(created?[remote(p)]:[]);};await applyBatch([p],{transport,journalDir:dir,shopDomain:'gravuru-design.myshopify.com'});await applyBatch([p],{transport,journalDir:dir,shopDomain:'gravuru-design.myshopify.com'});assert.equal(writes,1);});
test('Unklare Shopify-Antwort führt nicht zur blinden Neuanlage',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'gravuru-journal-unknown-'));let writes=0;const transport=async(q)=>{if(q===CREATE_QUERY){writes++;throw Error('timeout');}return resultFor([]);};const p=batch[0];await assert.rejects(applyBatch([p],{transport,journalDir:dir,shopDomain:'gravuru-design.myshopify.com'}),/timeout/);await assert.rejects(applyBatch([p],{transport,journalDir:dir,shopDomain:'gravuru-design.myshopify.com'}),/keine automatische zweite Anlage/);assert.equal(writes,1);});
test('Fremder Entwurf wird nicht überschrieben',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'gravuru-journal-conflict-'));const r=remote(batch[0]);r.title='Fremdes Produkt';let writes=0;const transport=async(q)=>{if(q===CREATE_QUERY)writes++;return resultFor([r]);};await assert.rejects(applyBatch([batch[0]],{transport,journalDir:dir,shopDomain:'gravuru-design.myshopify.com'}));assert.equal(writes,0);});

test('Eigene Korrektur erhält Produkt- und Varianten-IDs und aktualisiert nur den bestätigten Entwurf',()=>{
 const before=batch[0],record=remote(before),next=structuredClone(plan);next.prices.holes2OnlyCents=319;
 const after=buildBatch(next,{mediaByProduct:media})[0],input=ownedUpdateInput(record,before,after);
 assert.equal(input.id,record.id);assert.equal(input.status,'DRAFT');
 assert.deepEqual(input.variants.map(v=>v.id),record.variants.nodes.map(v=>v.id));
 assert.equal(input.variants.find(v=>v.sku.endsWith('B02-S0-SI0')).price,'29.18');
 const html=structuredClone(record);html.descriptionHtml=html.descriptionHtml.replaceAll('><','>\n<');assert.equal(verifyRead(html,before).variants,48);
});
test('Korrektur sperrt Fremdprodukt, neue Identität und Veröffentlichung',()=>{
 const before=batch[0],after=structuredClone(before),record=remote(before);
 const foreign=structuredClone(record);foreign.title='Fremd';assert.throws(()=>ownedUpdateInput(foreign,before,after));
 after.identity='anderes';assert.throws(()=>ownedUpdateInput(record,before,after),/identität/i);
 const active=structuredClone(before);active.input.status='ACTIVE';assert.throws(()=>ownedUpdateInput(record,before,active),/identität/i);
});

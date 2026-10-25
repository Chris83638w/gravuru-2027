import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {applyPriceOverrides} from '../app/workshop/katalog-convert.mjs';
import {designFingerprint,DESIGN_METAFIELD,mountingValues,skuBaseFor,konfiProductId,importKeyFor,targetsForLine,prepareTargetsForLine,planShopSync,compareProduct,productSetInput,formatPlan,applyPlan,verifyApplied,toCents,run,PRODUCT_READ_QUERY,PRODUCT_SET_MUTATION,PLAN_SCHEMA} from './shop-sync.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/shop-sync/',import.meta.url));
const KATALOG=path.join(FIXTURE,'katalog'),EXPORT=path.join(FIXTURE,'export-7x2.json');
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ')].map(c=>[c,{a:400,d:'M0 0 L300 0 L300 600 L0 600 Z'}]))}},FONTS={Montserrat:FONT};
const HANDOFF=JSON.parse(fs.readFileSync(new URL('../docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json',import.meta.url),'utf8'));
const exportDoc=()=>JSON.parse(fs.readFileSync(EXPORT,'utf8'));
// Fixture-Katalog ohne Lieferform-2-Designs: Mechanik-Tests laufen mit allDesigns (Freigabe-/Design-Regel: eigener Test unten).
const plan=(doc=exportDoc(),only=null)=>planShopSync(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{only,allDesigns:true}),doc,{generatedAt:'2026-10-23T12:00:00.000Z'});
const byMain=(p,id,size='GR-ES-RE-70X23P3-T15')=>p.entries.find(e=>e.mainProductId===id&&e.sizeKey===size);

test('Befestigungswerte entsprechen exakt der Werkstatt (familyProductConfig): Kennung, Label, Aufpreis, Reihenfolge',()=>{
 const k=openKatalog(KATALOG),line=k.lines.get('edelstahl-tuerschilder'),{_file,_material,...doc}=k.families.get('steel-door-signs');
 for(const sub of line.subcategories.filter(s=>s.mainProducts)){
  const f=applyPriceOverrides(doc,sub);
  for(const s of f.sizes){
   const view={...f,sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))};
   const werkstatt=familyProductConfig(view,s,1).profile.optionGroups.find(g=>g.id==='mounting');
   assert.equal(werkstatt.name,'Befestigung');
   assert.deepEqual(mountingValues(f,s).map(v=>[v.key,v.label,v.priceCents]),werkstatt.values.map(v=>[v.id,v.label,v.priceCents]),sub.id+' '+s.key);
  }
 }
 assert.throws(()=>mountingValues({withoutMounting:true,mountingRules:[{id:'A',skuSuffix:'X',label:'a',priceCents:1},{id:'B',skuSuffix:'X',label:'b',priceCents:2}]},{key:'S',mounting:['A','B']}),/gleicher SKU-Endung/);
});

test('Soll je Hauptprodukt × Größe: Kennungen wie Handoff, Basis-SKU-Quelle, Preisüberschreibung, offene Punkte',()=>{
 const soll=targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true});
 assert.deepEqual(soll.notes,['Unterkategorie „namensschilder“ ohne Hauptprodukte – kein Shop-Abgleich.']);
 assert.equal(soll.targets.length,7);
 for(const h of HANDOFF.products){
  const t=soll.targets.find(t=>t.mainProductId===h.mainProductId);
  assert.equal(t.konfiProductId,h.konfiProductId);assert.equal(t.importKey,'katalog:edelstahl-tuerschilder:familienschilder:GR-ES-RE-70X23P3-T15:'+h.mainProductId);
  assert.equal(t.skuBase,h.skuBase);assert.equal(t.skuSource,'startDesign');assert.equal(t.customizationId,h.customizationId);assert.deepEqual(t.open,[]);
  assert.deepEqual(t.variants.map(v=>[v.mountingKey,v.label,v.sku,v.priceCents]),h.variants.map(v=>[v.mountingKey,v.optionValue,v.sku,v.priceCents]));
 }
 assert.equal(konfiProductId('edelstahl-tuerschilder','familienschilder','GR-ES-RE-70X23P3-T15','3100000'),HANDOFF.products[0].konfiProductId);
 assert.equal(importKeyFor('l','s','K','m'),'katalog:l:s:K:m');
 const two=soll.targets.filter(t=>t.mainProductId==='9900000');
 assert.deepEqual(two.map(t=>[t.sizeKey,t.skuBase,t.skuSource,t.open]),[['GR-ES-RE-80X20-T15','TRE-V2A-8x2-D1','externalIds.sku-gr-es-re-80x20-t15',[]],['GR-ES-RE-120X80-T15',null,null,['Basis-SKU offen: Basis-SKU je Größe fehlt (externalIds.sku-<größe> oder --sku-map).']]]);
 const haus=soll.targets.find(t=>t.mainProductId==='9920000');
 assert.equal(haus.skuSource,'externalIds.sku');assert.equal(haus.basePriceCents,2499,'Preis der Unterkategorie');
 assert.deepEqual(haus.variants.map(v=>[v.sku,v.priceCents]),[['TRH-V2A-12x8-D3',2499],['TRH-V2A-12x8-D3-KGL',2848],['TRH-V2A-12x8-D3-KRA',2898],['TRH-V2A-12x8-D3-B02',2748],['TRH-V2A-12x8-D3-B02S',2768]],'Aufpreis KGL aus priceOverrides.mounting');
 // --sku-map hat Vorrang und schließt die offene Größe.
 const mapped=targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true,skuMap:{'katalog-edelstahl-tuerschilder-familienschilder-gr-es-re-120x80-t15-9900000':'TRE-V2A-12x8-D1'}}).targets.find(t=>t.mainProductId==='9900000'&&t.sizeKey==='GR-ES-RE-120X80-T15');
 assert.deepEqual([mapped.skuBase,mapped.skuSource,mapped.open],['TRE-V2A-12x8-D1','sku-map',[]]);
 assert.deepEqual(skuBaseFor({startDesign:'D1',externalIds:{sku:'X'}},{key:'A'},{sizesCount:2}).sku,null);
 // Filter wie katalog-import.
 assert.deepEqual(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true,only:{subcategories:['hausnummern'],sizes:null,mainProducts:null}}).targets.map(t=>t.mainProductId),['9920000']);
 assert.deepEqual(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true,only:{subcategories:null,sizes:null,mainProducts:['3200000']}}).targets.map(t=>t.konfiProductId),[HANDOFF.products[1].konfiProductId]);
 assert.throws(()=>targetsForLine(openKatalog(KATALOG),'fremd'),{code:'line_missing'});
 // Offener Preis sperrt nur diese Größe.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-sync-katalog-'));fs.cpSync(KATALOG,dir,{recursive:true});
 try{
  const file=path.join(dir,'familien/edelstahl/steel-door-signs.json'),fam=JSON.parse(fs.readFileSync(file,'utf8'));fam.sizes.find(s=>s.key==='GR-ES-RE-70X23P3-T15').baseCents=null;fs.writeFileSync(file,JSON.stringify(fam));
  const t=targetsForLine(openKatalog(dir),'edelstahl-tuerschilder',{allDesigns:true}).targets;
  assert.deepEqual(t.find(x=>x.mainProductId==='3100000').open,['Preis offen: 7 × 2 cm']);assert.deepEqual(t.find(x=>x.mainProductId==='9920000').open,[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Regression Edelstahl 7x2: die drei Hauptprodukte ergeben „unverändert“ mit den Varianten-IDs des Handoffs',()=>{
 const p=plan();
 assert.equal(p.schema,PLAN_SCHEMA);assert.equal(p.shopDomain,HANDOFF.shopDomain);assert.equal(p.export.complete,false);
 for(const h of HANDOFF.products){
  const e=byMain(p,h.mainProductId);
  assert.equal(e.action,'unverändert',h.skuBase);assert.deepEqual(e.changes,[]);assert.deepEqual(e.reasons,[]);assert.equal(e.input,null);
  assert.equal(e.shopify.productId,h.shopifyProductId);assert.equal(e.shopify.handle,h.handle);assert.equal(e.shopify.status,'ACTIVE');
  assert.deepEqual(e.variants.map(v=>[v.mountingKey,v.label,v.sku,v.priceCents,v.shopifyVariantId,v.state]),h.variants.map(v=>[v.mountingKey,v.optionValue,v.sku,v.priceCents,v.shopifyVariantId,'vorhanden']));
 }
 assert.deepEqual(p.counts,{'unverändert':3,update:1,create:0,konflikt:1,offen:2});
 const text=formatPlan(p);assert.match(text,/unverändert 3, update 1, create 0, konflikt 1, offen 2/);assert.match(text,/TEILEXPORT/);
});

test('Update: Standardvariante wird „Ohne Bohrung“ (ID bleibt), vier neue Varianten ohne ID, Option ohne ID, Metafeld, Bestand aus',()=>{
 const e=byMain(plan(),'9900000','GR-ES-RE-80X20-T15');
 assert.equal(e.action,'update');assert.equal(e.shopify.productId,'gid://shopify/Product/16099000000001');
 assert.deepEqual(e.variants.map(v=>[v.sku,v.shopifyVariantId,v.state]),[['TRE-V2A-8x2-D1','gid://shopify/ProductVariant/57299000000001','ändern'],['TRE-V2A-8x2-D1-KGL',null,'neu'],['TRE-V2A-8x2-D1-KRA',null,'neu'],['TRE-V2A-8x2-D1-B02',null,'neu'],['TRE-V2A-8x2-D1-B02S',null,'neu']]);
 assert.deepEqual(e.changes,['Preis TRE-V2A-8x2-D1: 19,90 € → 8,99 €','Optionswert TRE-V2A-8x2-D1: (Standard) → „Ohne Bohrung“','Bestandsverfolgung aus: TRE-V2A-8x2-D1','Variante neu: TRE-V2A-8x2-D1-KGL „Selbstklebend – glatte Flächen“ 11,98 €','Variante neu: TRE-V2A-8x2-D1-KRA „Selbstklebend – raue Flächen“ 12,98 €','Variante neu: TRE-V2A-8x2-D1-B02 „Mit 2 Bohrlöchern“ 11,48 €','Variante neu: TRE-V2A-8x2-D1-B02S „Mit 2 Schrauben“ 11,68 €','Option „Befestigung“ anlegen (5 Werte) – ersetzt „Title/Default Title“','Metafeld custom.customization_id: (leer) → 9900000']);
 const i=e.input;
 assert.equal(i.id,'gid://shopify/Product/16099000000001');assert.equal(i.status,undefined,'Status bleibt unverändert');assert.equal(i.title,undefined);
 assert.deepEqual(i.productOptions,[{name:'Befestigung',position:1,values:['Ohne Bohrung','Selbstklebend – glatte Flächen','Selbstklebend – raue Flächen','Mit 2 Bohrlöchern','Mit 2 Schrauben'].map(name=>({name}))}]);
 assert.deepEqual(i.variants[0],{id:'gid://shopify/ProductVariant/57299000000001',price:'8.99',sku:'TRE-V2A-8x2-D1',position:1,optionValues:[{optionName:'Befestigung',name:'Ohne Bohrung'}],inventoryItem:{tracked:false}});
 assert.deepEqual(i.variants[1],{price:'11.98',sku:'TRE-V2A-8x2-D1-KGL',position:2,optionValues:[{optionName:'Befestigung',name:'Selbstklebend – glatte Flächen'}],inventoryItem:{tracked:false}});
 assert.deepEqual(i.metafields,[{namespace:'custom',key:'customization_id',type:'single_line_text_field',value:'9900000'}]);
 assert.match(e.sourceSha256,/^[a-f0-9]{64}$/);assert.deepEqual(e.expectedShop.variants,[{id:'gid://shopify/ProductVariant/57299000000001',sku:'TRE-V2A-8x2-D1',price:'19.90'}]);
 // Bestehende Option „Befestigung“ mit ID (Vollexport) wird über die ID angesprochen.
 const doc=exportDoc(),p=doc.products.find(x=>x.id===HANDOFF.products[0].shopifyProductId);p.options[0].id='gid://shopify/ProductOption/1';p.variants.nodes[1].price='9.99';
 const changed=byMain(planShopSync(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true}),doc),'3100000');
 assert.equal(changed.action,'update');assert.deepEqual(changed.changes,['Preis TRE-V2A-7x2-D5-KGL: 9,99 € → 11,98 €']);
 assert.deepEqual(changed.variants.map(v=>v.state),['vorhanden','ändern','vorhanden','vorhanden','vorhanden']);
 assert.equal(changed.input.productOptions[0].id,'gid://shopify/ProductOption/1');assert.equal(changed.shopify.optionId,'gid://shopify/ProductOption/1');
 assert.deepEqual(changed.input.variants.map(v=>v.id),HANDOFF.products[0].variants.map(v=>v.shopifyVariantId));
 assert.equal(toCents('8.9'),890);assert.equal(toCents('19'),1900);assert.equal(toCents('x'),null);
});

test('Konflikt, offen und create: Fremdoption, doppelte SKU, überzählige Shop-Variante, Teilexport, fehlender Name, falscher Shop',()=>{
 const p=plan();
 const haus=byMain(p,'9920000','GR-ES-RE-120X80-T15');
 assert.equal(haus.action,'konflikt');assert.deepEqual(haus.reasons,['Shop-Produkt hat weitere Optionen (Größe) – kein automatischer Abgleich.']);assert.equal(haus.input,null);
 assert.deepEqual(byMain(p,'9900000','GR-ES-RE-120X80-T15').action,'offen');
 assert.deepEqual(byMain(p,'9910000').reasons,['Kein Treffer im Teilexport – Neuanlage erst nach vollständigem Export planen.']);
 // Doppelte Basis-SKU → Konflikt mit beiden Produkten.
 const dup=exportDoc();dup.products.find(x=>x.handle==='tuerschild-edelstahl-v2a-personalisiert-8x2-fixture').variants.nodes[0].sku='TRE-V2A-7x2-D5';
 const d=byMain(plan(dup),'3100000');assert.equal(d.action,'konflikt');assert.match(d.reasons[0],/SKU TRE-V2A-7x2-D5 doppelt im Shop: gid:\/\/shopify\/Product\/16077793821052 .* gid:\/\/shopify\/Product\/16099000000001/);
 // Überzählige Shop-Variante würde gelöscht → Konflikt, kein Input.
 const extra=exportDoc(),prod=extra.products.find(x=>x.id===HANDOFF.products[1].shopifyProductId);
 prod.variants.nodes.push({id:'gid://shopify/ProductVariant/1',sku:'TRE-V2A-7x2-D26-B04',title:'Mit 4 Bohrlöchern',price:'11.88',inventoryItem:{tracked:false},selectedOptions:[{name:'Befestigung',value:'Mit 4 Bohrlöchern'}]});prod.options[0].values.push('Mit 4 Bohrlöchern');
 const x=byMain(plan(extra),'3200000');assert.equal(x.action,'konflikt');assert.deepEqual(x.reasons,['Shop-Variante TRE-V2A-7x2-D26-B04 hat keine Soll-Entsprechung und würde durch productSet gelöscht.']);
 // Vollexport ohne Treffer → create (DRAFT) mit Name; ohne Name → offen.
 const full=exportDoc();full.complete=true;
 const c=byMain(plan(full),'9910000');assert.equal(c.action,'offen');assert.match(c.reasons[0],/kein Name im Katalog/);
 const full2=exportDoc();full2.complete=true;full2.products=full2.products.filter(x=>x.handle!=='tuerschild-edelstahl-v2a-personalisiert-8x2-fixture');
 const n=byMain(plan(full2),'9900000','GR-ES-RE-80X20-T15');assert.equal(n.action,'create');
 assert.equal(n.input.id,undefined);assert.equal(n.input.status,'DRAFT');assert.equal(n.input.title,'Türschild Edelstahl – Fixture zwei Größen');assert.equal(n.input.variants.length,5);assert.ok(n.input.variants.every(v=>v.id===undefined));
 assert.throws(()=>planShopSync(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true}),{...exportDoc(),shopDomain:'fremd.myshopify.com'}),{code:'shop_mismatch'});
 assert.throws(()=>planShopSync(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true}),{}),{code:'export_format'});
 // Katalog ohne CustomizationID: Shop-Metafeld bleibt (Hinweis), kein Änderungsbedarf.
 const soll=targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true});const t=soll.targets.find(t=>t.mainProductId==='3300000');t.customizationId=null;
 const noId=byMain(planShopSync(soll,exportDoc()),'3300000');assert.equal(noId.action,'unverändert');assert.match(noId.reasons[0],/^Hinweis: Shop trägt custom\.customization_id=3300000/);
 assert.equal(productSetInput(t,null,null).metafields,undefined);
 assert.deepEqual(compareProduct(t,exportDoc().products.find(x=>x.id===HANDOFF.products[2].shopifyProductId)).changes,[]);
});

test('Anwenden: Lesen vor Schreiben, productSet je Produkt, Rücklesen, Journal, Wiederholung ohne zweites Schreiben, Neuanlage nur mit --create',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-sync-journal-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const full=exportDoc();full.complete=true;
 // Apply mechanics use approved synthetic masters, never a diagnostic bypass.
 const katalog=openKatalog(KATALOG),firstTargets=new Map(targetsForLine(katalog,'edelstahl-tuerschilder',{allDesigns:true}).targets.map(target=>[target.startDesign,target]));
 for(const target of firstTargets.values()){
  const preferred=target.mainProductId==='9900000'?'GR-ES-RE-80X20-T15':target.sizeKey,size=katalog.families.get(target.family).sizes.find(s=>s.key===preferred),plateMm=[size.widthMm,size.heightMm];
  const json={id:target.startDesign,plateMm,sizes:[size.key],material:'Edelstahl',process:'Gravur',form:'Rechteck',themes:['familienschilder'],ziele:[{familie:target.family,freigabe:{status:'freigegeben',von:'synthetic test'}}]};
  katalog.designs.masters.push({id:json.id,name:json.id,plateMm,themes:json.themes,json,svg:()=>'<svg viewBox="0 0 '+plateMm.join(' ')+'"><g id="motiv-1"><path d="M30 8 L34 8 L34 12 L30 12 Z"/></g></svg>'});
 }
 for(const h of HANDOFF.products)full.products.find(p=>p.id===h.shopifyProductId).designSha256=designFingerprint(katalog.designs.masters.find(m=>m.id===h.skuBase));
 const sollMitName=()=>{const s=targetsForLine(katalog,'edelstahl-tuerschilder');s.targets.find(t=>t.mainProductId==='9910000').name='Türschild Edelstahl 7 × 2 cm – Fixture Neuanlage';return s;};
 const p=planShopSync(sollMitName(),full,{generatedAt:'2026-10-23T12:00:00.000Z'});
 assert.equal(byMain(p,'9910000').action,'create');
 const shop=new Map(full.products.map(x=>[x.id,structuredClone(x)]));
 const record=x=>({id:x.id,handle:x.handle,title:x.title,status:x.status,options:x.options.map(o=>({id:o.id??null,name:o.name,position:1,values:o.values})),metafield:x.metafield,variants:{nodes:x.variants.nodes.map(v=>({id:v.id,sku:v.sku,price:v.price,inventoryItem:v.inventoryItem,selectedOptions:v.selectedOptions})),pageInfo:{hasNextPage:false}}});
 const calls=[];let nextId=900;
 const transport=async(query,variables)=>{
  calls.push(query===PRODUCT_READ_QUERY?'read':query===PRODUCT_SET_MUTATION?'set':'?');
  if(query===PRODUCT_READ_QUERY)return {shop:{myshopifyDomain:'gravuru-design.myshopify.com',currencyCode:'EUR'},product:shop.has(variables.id)?record(shop.get(variables.id)):null};
  const i=variables.input,id=i.id||'gid://shopify/Product/'+(++nextId),old=shop.get(id);
  const product={id,handle:old?.handle||'neu-'+nextId,title:i.title||old.title,status:i.status||old.status,options:i.productOptions.map(o=>({id:o.id??'gid://shopify/ProductOption/'+(++nextId),name:o.name,values:o.values.map(v=>v.name)})),metafield:i.metafields?{value:i.metafields[0].value}:old?.metafield??null,
   variants:{nodes:i.variants.map(v=>({id:v.id||'gid://shopify/ProductVariant/'+(++nextId),sku:v.sku,price:v.price,inventoryItem:{tracked:v.inventoryItem.tracked},selectedOptions:v.optionValues.map(o=>({name:o.optionName,value:o.name}))}))}};
  shop.set(id,product);return {productSet:{product:record(product),userErrors:[]}};
 };
 const results=await applyPlan(p,{transport,journalDir:dir});
 assert.deepEqual(results.map(r=>[r.action,r.state]),[['unverändert','übersprungen'],['unverändert','übersprungen'],['unverändert','übersprungen'],['update','geschrieben'],['offen','übersprungen'],['create','übersprungen'],['konflikt','übersprungen']]);
 assert.deepEqual(calls,['read','set']);
 const written=shop.get('gid://shopify/Product/16099000000001');
 assert.deepEqual(written.variants.nodes.map(v=>[v.sku,v.price,v.inventoryItem.tracked]),[['TRE-V2A-8x2-D1','8.99',false],['TRE-V2A-8x2-D1-KGL','11.98',false],['TRE-V2A-8x2-D1-KRA','12.98',false],['TRE-V2A-8x2-D1-B02','11.48',false],['TRE-V2A-8x2-D1-B02S','11.68',false]]);
 assert.equal(written.variants.nodes[0].id,'gid://shopify/ProductVariant/57299000000001','Original-Variante bleibt');assert.equal(written.status,'ACTIVE');
 const good=record(structuredClone(written));
 const journal=JSON.parse(fs.readFileSync(path.join(dir,'katalog-edelstahl-tuerschilder-familienschilder-gr-es-re-80x20-t15-9900000.json'),'utf8'));
 assert.equal(journal.state,'completed');assert.equal(journal.sourceSha256,byMain(p,'9900000','GR-ES-RE-80X20-T15').sourceSha256);assert.equal(journal.variants.length,5);
 assert.ok(!fs.existsSync(path.join(dir,'writer.lock')));
 // Zweiter Lauf desselben Plans: Journal erledigt, kein weiteres Schreiben; Export inzwischen veraltet, aber nicht nötig.
 calls.length=0;const again=await applyPlan(p,{transport,journalDir:dir,includeCreate:true});
 assert.deepEqual(again.filter(r=>r.state!=='übersprungen').map(r=>[r.action,r.state]),[['update','bereits erledigt'],['create','geschrieben']]);
 assert.deepEqual(calls,['set'],'Neuanlage ohne Vorablesen (kein Produkt vorhanden)');
 const created=JSON.parse(fs.readFileSync(path.join(dir,'katalog-edelstahl-tuerschilder-familienschilder-gr-es-re-70x23p3-t15-9910000.json'),'utf8'));
 assert.equal(created.state,'completed');assert.equal(created.status,'DRAFT');assert.match(created.productId,/^gid:\/\/shopify\/Product\/\d+$/);
 // Shop hat sich seit dem Export geändert → Abbruch vor dem Schreiben, Journal unberührt.
 const p2=planShopSync(sollMitName(),full);const target=shop.get('gid://shopify/Product/16099000000001');target.variants.nodes[0].price='7.77';shop.set(target.id,{...target,variants:{nodes:[target.variants.nodes[0]]},options:[{name:'Title',values:['Default Title']}],metafield:null});
 const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-sync-journal2-'));t.after(()=>fs.rmSync(dir2,{recursive:true,force:true}));
 calls.length=0;await assert.rejects(applyPlan(p2,{transport,journalDir:dir2}),/Shop-Stand weicht vom Export ab/);
 assert.deepEqual(calls,['read']);assert.deepEqual(fs.readdirSync(dir2),[]);
 // Ablehnung durch Shopify → Journal „rejected“, Fehler; unbestätigter Lauf blockiert den nächsten.
 const rejecting=async(query,variables)=>query===PRODUCT_READ_QUERY?transport(query,variables):{productSet:{product:null,userErrors:[{field:['variants'],code:'INVALID',message:'nein'}]}};
 shop.set(target.id,structuredClone(full.products.find(x=>x.id===target.id)));
 await assert.rejects(applyPlan(p2,{transport:rejecting,journalDir:dir2}),/abgelehnt/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir2,'katalog-edelstahl-tuerschilder-familienschilder-gr-es-re-80x20-t15-9900000.json'),'utf8')).state,'rejected');
 await assert.rejects(applyPlan(p2,{transport,journalDir:dir2}),/früherer Lauf unbestätigt/);
 // Rücklesen erkennt Abweichungen.
 const e=byMain(p,'9900000','GR-ES-RE-80X20-T15');
 assert.equal(verifyApplied(good,e).variants.length,5);
 const wrongPrice=structuredClone(good);wrongPrice.variants.nodes[2].price='1.00';assert.throws(()=>verifyApplied(wrongPrice,e),/nicht wie geplant/);
 const wrongId=structuredClone(good);wrongId.variants.nodes[0].id='gid://shopify/ProductVariant/2';assert.throws(()=>verifyApplied(wrongId,e),/Varianten-ID/);
 const noMeta=structuredClone(good);noMeta.metafield=null;assert.throws(()=>verifyApplied(noMeta,e),/Metafeld/);
 await assert.rejects(applyPlan({schema:'x'},{transport,journalDir:dir2}),/Kein shop-sync-Plan/);
 await assert.rejects(applyPlan(p,{transport,journalDir:dir2,shopDomain:'anderer.myshopify.com'}),/nicht für anderer/);
});

test('run(): Dry-run schreibt den Plan und nichts sonst; --apply ohne Zugang bricht ohne Geheimnis ab',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-sync-run-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let out='';const {plan:p,results}=await run(['--katalog',KATALOG,'--linie','edelstahl-tuerschilder','--export',EXPORT,'--out',path.join(dir,'plan.json'),'--hauptprodukt','3100000,3300000','--alle-designs'],{stdout:{write:s=>out+=s},stderr:{write(){}}});
 assert.equal(results,null);assert.deepEqual(p.entries.map(e=>e.mainProductId),['3100000','3300000']);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8')).counts['unverändert'],2);assert.match(out,/Dry-run: nichts geschrieben/);
 await assert.rejects(run(['--katalog',KATALOG,'--linie','edelstahl-tuerschilder','--export',EXPORT,'--out',path.join(dir,'plan2.json'),'--apply'],{env:{},stdout:{write(){}},stderr:{write(){}}}),{code:'credentials_missing'});
 await assert.rejects(run([],{stdout:{write(){}}}),/Aufruf/);
});

const REAL_KATALOG='/home/claude/gravuru-katalog.',REAL_EXPORT=fileURLToPath(new URL('../.local-data/shopify-products-partial.json',import.meta.url));
test('Echter Katalog + Teilexport (lokal, wenn vorhanden): drei 7x2-Produkte unverändert',{skip:!(fs.existsSync(REAL_KATALOG)&&fs.existsSync(REAL_EXPORT))},async()=>{
 const p=planShopSync(await prepareTargetsForLine(openKatalog(REAL_KATALOG),'edelstahl-tuerschilder'),JSON.parse(fs.readFileSync(REAL_EXPORT,'utf8')));
 assert.deepEqual(p.entries.map(e=>[e.mainProductId,e.action]),[['3100000','unverändert'],['3200000','unverändert'],['3300000','unverändert']]);
 for(const h of HANDOFF.products)assert.deepEqual(byMain(p,h.mainProductId).variants.map(v=>v.shopifyVariantId),h.variants.map(v=>v.shopifyVariantId));
});

test('Freigabe und Design-Stand (Chris 23.10.2026): ohne Freigabe offen; erster Abgleich schreibt custom.design_sha256; gleicher Stand → unverändert trotz Datenabweichung, --daten-aktualisieren erzwingt',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shop-sync-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(KATALOG,dir,{recursive:true});
 const ddir=path.join(dir,'designs','edelstahl-gravur-70x23','TRE-V2A-7x2-D5');fs.mkdirSync(ddir,{recursive:true});
 fs.writeFileSync(path.join(ddir,'design.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 23.3"><text id="text-1" x="35" y="12" font-size="5" font-family="Montserrat">Familie</text></svg>');
 const json={id:'TRE-V2A-7x2-D5',name:'Zwei Zeilen mit Zierlinien',plateMm:[70,23.3],material:'Edelstahl',themes:['familienschilder']};
 fs.writeFileSync(path.join(ddir,'design.json'),JSON.stringify(json));
 const sollFor=()=>targetsForLine(openKatalog(dir),'edelstahl-tuerschilder',{only:{subcategories:null,sizes:null,mainProducts:['3100000']},fonts:FONTS});
 // 1) nicht freigegeben → offen
 let e=planShopSync(sollFor(),exportDoc()).entries[0];
 assert.equal(e.action,'offen');assert.match(e.reasons[0],/nicht freigegeben \(Design-Dashboard\)/);
 // 2) freigegeben, Shop ohne Design-Metafeld → update nur mit dem Metafeld; Fingerabdruck ignoriert freigabe/hidden
 fs.writeFileSync(path.join(ddir,'design.json'),JSON.stringify({...json,freigabe:{status:'freigegeben',am:'2026-10-23T11:00:00.000Z',von:'test'},hidden:false}));
 const k=openKatalog(dir),master=k.designs.masters.find(d=>d.id==='TRE-V2A-7x2-D5'),sha=designFingerprint(master);
 assert.match(sha,/^[0-9a-f]{64}$/);assert.equal(sha,designFingerprint({...master,json:{...master.json,freigabe:null,hidden:true}}));
 e=planShopSync(sollFor(),exportDoc()).entries[0];
 assert.equal(e.action,'update');assert.deepEqual(e.changes.map(c=>c.split(':')[0]),['Metafeld '+DESIGN_METAFIELD.namespace+'.'+DESIGN_METAFIELD.key]);
 assert.deepEqual(e.input.metafields.map(m=>[m.key,m.value]),[['customization_id','3100000'],['design_sha256',sha]]);assert.equal(e.expectedShop.designSha256,null);
 // 3) Shop kennt denselben Stand → unverändert, auch wenn ein Preis abweicht; --daten-aktualisieren → update
 const same=exportDoc();const prod=same.products.find(p=>p.id==='gid://shopify/Product/16077793821052');prod.designSha256=sha;
 e=planShopSync(sollFor(),same).entries[0];assert.equal(e.action,'unverändert');assert.equal(e.dataChangesSkipped,undefined);
 prod.variants.nodes[0].price='9.99';
 e=planShopSync(sollFor(),same).entries[0];assert.equal(e.action,'unverändert');assert.equal(e.dataChangesSkipped,true);assert.match(e.reasons.at(-1),/Design unverändert/);assert.match(e.changes[0],/^Preis TRE-V2A-7x2-D5/);
 e=planShopSync(sollFor(),same,{updateData:true}).entries[0];assert.equal(e.action,'update');assert.match(e.changes[0],/^Preis TRE-V2A-7x2-D5/);
 // 4) Design geändert → update
 fs.writeFileSync(path.join(ddir,'design.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 23.3"><text id="text-1" x="35" y="14" font-size="5" font-family="Montserrat">Familie</text></svg>');
 prod.variants.nodes[0].price='8.99';
 e=planShopSync(sollFor(),same).entries[0];assert.equal(e.action,'update');assert.match(e.changes[0],/design_sha256/);
});


test('shop targets use only their own approval; empty targets and incompatible shapes/formats never yield an applicable entry',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shop-targets-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.cpSync(KATALOG,dir,{recursive:true});
 const k=openKatalog(dir),sourceFamily=k.families.values().next().value,familyPath=k.files.get('familie:'+sourceFamily.id),other={...sourceFamily,id:'other'};delete other._file;delete other._material;
 const otherFile=path.join(path.dirname(familyPath),'other.json');fs.writeFileSync(otherFile,JSON.stringify(other));
 const sourceLine=k.lines.get('edelstahl-tuerschilder');fs.writeFileSync(path.join(dir,'linien/other.json'),JSON.stringify({...sourceLine,id:'other',families:['other']}));
 const folder=path.join(dir,'designs/edelstahl-gravur-70x23/TRE-V2A-7x2-D5');fs.mkdirSync(folder,{recursive:true});
 const json={id:'TRE-V2A-7x2-D5',plateMm:[70,23.3],material:'Edelstahl',process:'Gravur',form:'Rechteck',themes:['familienschilder'],freigabe:{status:'freigegeben',von:'legacy'},ziele:[{familie:sourceFamily.id,freigabe:{status:'freigegeben',von:'A'}},{familie:'other',freigabe:null}]};
 fs.writeFileSync(path.join(folder,'design.svg'),'<svg viewBox="0 0 70 23.3"><text id="text-1" font-family="Montserrat" font-size="5" x="35" y="12">Test</text></svg>');const save=()=>fs.writeFileSync(path.join(folder,'design.json'),JSON.stringify(json));save();
 const target=line=>targetsForLine(openKatalog(dir),line,{only:{mainProducts:['3100000']},fonts:FONTS}).targets[0];
 assert.deepEqual(target('edelstahl-tuerschilder').open,[]);assert.equal(target('other').designReleased,false);assert.match(target('other').open.join(' '),/nicht freigegeben/);
 const originalHash=target('edelstahl-tuerschilder').designSha256;json.ziele[1].freigabe={status:'freigegeben',von:'B'};save();assert.deepEqual(target('other').open,[]);assert.equal(target('other').designSha256,originalHash,'target metadata does not trigger a design change');
 other.groups=other.groups.map(g=>({...g,shape:'ellipse'}));fs.writeFileSync(otherFile,JSON.stringify(other));let blocked=target('other');assert.match(blocked.open.join(' '),/Andere Form.*Variante/);let planned=planShopSync({line:{id:'other'},targets:[blocked],notes:[]},exportDoc()).entries[0];assert.equal(planned.action,'offen');assert.equal(planned.input,null);
 other.groups=structuredClone(sourceFamily.groups);other.sizes=other.sizes.map(s=>s.key===blocked.sizeKey?{...s,heightMm:35}:s);fs.writeFileSync(otherFile,JSON.stringify(other));blocked=target('other');assert.match(blocked.open.join(' '),/Seitenverhältnis.*Variante/);
 json.ziele=[];save();assert.equal(target('edelstahl-tuerschilder').designReleased,false);assert.match(target('edelstahl-tuerschilder').open.join(' '),/nicht freigegeben/);assert.equal(target('edelstahl-tuerschilder').designSha256,originalHash);
});

test('shop CLI rejects diagnostic --alle-designs with --apply before output, credentials or transport',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-sync-guard-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 await assert.rejects(run(['--katalog',KATALOG,'--linie','edelstahl-tuerschilder','--export',EXPORT,'--out',path.join(dir,'plan.json'),'--alle-designs','--apply'],{env:{},stdout:{write(){}},stderr:{write(){}}}),{code:'unapproved_diagnostic_plan'});
 assert.deepEqual(fs.readdirSync(dir),[],'guard runs before writing a plan or journal');
});


test('shop planning validates current geometry and raw material rules even after historical approval, and never substitutes a missing font',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shop-fit-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.cpSync(KATALOG,dir,{recursive:true});
 const folder=path.join(dir,'designs/test/TRE-V2A-7x2-D5');fs.mkdirSync(folder,{recursive:true});
 const json={id:'TRE-V2A-7x2-D5',plateMm:[70,23.3],material:'Edelstahl',process:'Gravur',form:'Rechteck',themes:['familienschilder'],ziele:[{familie:'steel-door-signs',freigabe:{status:'freigegeben',von:'synthetic history'}}]};
 fs.writeFileSync(path.join(folder,'design.json'),JSON.stringify(json)+'\n');
 const source=content=>'<svg viewBox="0 0 70 23.3">'+content+'</svg>',write=content=>fs.writeFileSync(path.join(folder,'design.svg'),source(content));
 const text='<text id="text-1" font-family="Montserrat" font-size="5" text-anchor="middle" x="35" y="12">Test</text>',only={mainProducts:['3100000']};
 const planFor=async options=>planShopSync(await prepareTargetsForLine(openKatalog(dir),'edelstahl-tuerschilder',{only,available:FONTS,...options}),exportDoc()).entries[0];
 write(text);let entry=await planFor();assert.equal(entry.action,'update');assert.ok(entry.input);
 const normal=fs.readFileSync(path.join(folder,'design.svg'),'utf8'),jsonBefore=fs.readFileSync(path.join(folder,'design.json'),'utf8');
 for(const [content,reason]of [
  [text.replace('x="35"','x="1000"'),/Gestaltungsfläche/],
  ['<g id="motiv-1"><path d="M1000 10 L1005 10 L1005 15 L1000 15 Z"/></g>',/Gestaltungsfläche/],
  [text.replace('font-size="5"','font-size="5" fill="#ff0000"'),/Farbige/],
  [text.replace('Montserrat','Missing'),/Schrift fehlt: Missing/]
 ]){write(content);entry=await planFor();assert.equal(entry.action,'offen');assert.equal(entry.input,null);assert.match(entry.reasons.join(' '),reason);const diagnostic=await planFor({allDesigns:true});assert.equal(diagnostic.action,'offen','diagnostic approval bypass does not bypass fit');assert.equal(diagnostic.input,null);}
 // Fotogravur ist Produktwissen (Claude 25.10.): Ein Fotofeld auf Edelstahl-Gravur ist „prüfen“, keine Sperre.
 write('<g id="foto-1"><rect x="10" y="5" width="10" height="10"/></g>');entry=await planFor();assert.equal(entry.action,'update');
 fs.writeFileSync(path.join(folder,'design.svg'),normal);const withoutFonts=targetsForLine(openKatalog(dir),'edelstahl-tuerschilder',{only}).targets[0];assert.match(withoutFonts.open.join(' '),/Schrift fehlt/);
 entry=await planFor({available:{}});assert.equal(entry.action,'offen');assert.match(entry.reasons.join(' '),/Schrift fehlt/);
 // A compiler failure is a named blocker, not an approximation or a partial product plan.
 const registry=path.join(dir,'schriften/schriften.json');fs.mkdirSync(path.dirname(registry),{recursive:true});fs.writeFileSync(registry,JSON.stringify({schema:'gravuru-fonts/v1',fonts:JSON.parse(fs.readFileSync(path.join(dir,'schriften/sets.json'),'utf8')).sets.flatMap(set=>set.fonts).map(name=>name==='Montserrat'?{name,file:'schriften/synthetic.ttf'}:{name,inPlatform:true})}));fs.writeFileSync(path.join(dir,'schriften/synthetic.ttf'),'synthetic font bytes');
 entry=await planFor({available:{},converter:async()=>{throw Error('font compiler unavailable');}});assert.equal(entry.action,'offen');assert.match(entry.reasons.join(' '),/font compiler unavailable/);
 const out=path.join(dir,'plan.json');const runResult=await run(['--katalog',dir,'--linie','edelstahl-tuerschilder','--hauptprodukt','3100000','--export',EXPORT,'--out',out],{available:FONTS,stdout:{write(){}},stderr:{write(){}}});assert.equal(runResult.plan.entries[0].action,'update','CLI resolves fonts before the same check');
 assert.equal(fs.readFileSync(path.join(folder,'design.json'),'utf8'),jsonBefore);assert.equal(fs.readFileSync(path.join(folder,'design.svg'),'utf8'),normal);assert.equal(fs.existsSync(path.join(dir,'designs/test/_aenderungen.jsonl')),false);
});


test('public applyPlan rejects diagnostic plans before creating a journal or calling transport',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shop-diagnostic-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const soll=targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true}),plan=planShopSync(soll,exportDoc());assert.equal(soll.diagnosticOnly,true);assert.equal(plan.diagnosticOnly,true);assert.ok(plan.entries.some(e=>e.action==='update'));
 let calls=0;await assert.rejects(applyPlan(plan,{journalDir:path.join(dir,'journal'),transport:async()=>{calls++;throw Error('unexpected transport');}}),{code:'unapproved_diagnostic_plan'});assert.equal(calls,0);assert.deepEqual(fs.readdirSync(dir),[]);
});

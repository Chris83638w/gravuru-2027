// K14 / Ü11.1: Mengenstaffel – Familie, Größe, Unterkategorie, Vorgaben, Preis, Warenkorb.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openKatalog,validateLine} from './katalog-source.mjs';
import {katalogFamilyToProduct,applyPriceOverrides,defaultQuantityTiers,quantityTierDefaults,validateQuantityTierDefaults} from './katalog-convert.mjs';
import {validateFamily,familyBriefing,quantityTierGaps,familyGaps} from './product-families.mjs';
import {resolveProduct,validateProductDocument} from './product-model.mjs';
import {validateAcrylicReview} from './acrylic-review.mjs';
import {tierDiscount,tierUnitCents} from './cart-personalization.mjs';
import {workshopResources} from './catalog.mjs';
import {quote,applyQuantityTier,quantityTierFor,quantityTierLabels,quantityTiersIssue,activeQuantityTiers} from '../configurator/variant-m/contract.mjs';
import {commercePrice,selectCommerceVariant} from '../configurator/variant-m/commerce-model.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const k=openKatalog(FIXTURE),family=k.families.get('test-schilder'),line=k.lines.get('test-linie'),[namen,hunde]=line.subcategories;
const fonts=()=>workshopResources().fonts;
const KNOWN=[{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15},{minQuantity:25,percentOff:20}];
const OPEN=[{minQuantity:5,percentOff:null},{minQuantity:10,percentOff:null},{minQuantity:25,percentOff:null}];
// Produkt der Test-Familie (Unterkategorie „Namensschilder“: 11,99 € + Befestigung B02 1,99 € = 13,98 €).
const product=(sub=namen,f=family,extra={})=>katalogFamilyToProduct(f,line,sub,{size:f.sizes[0],fonts:fonts(),...extra}).document;
const withTiers=(tiers,target='family')=>{const f=structuredClone(family);if(target==='family')f.quantityTiers=tiers;else f.sizes[0].quantityTiers=tiers;return validateFamily(f);};

test('Grenzwerte 4/5/9/10/25: Staffel auf den Stückpreis inkl. Option, ganze Cent kaufmännisch gerundet',()=>{
 const d=product(namen,withTiers(KNOWN)),c=d.config,design=c.profile.defaultDesignId,o={mounting:'B02'};
 assert.deepEqual(c.quantityTiers,KNOWN);
 const unit=q=>quote(c,[],design,o,q);
 // 13,98 € Liste; −10 % = 1258,2 → 1258; −15 % = 1188,3 → 1188; −20 % = 1118,4 → 1118.
 assert.deepEqual([1,4,5,9,10,24,25,99].map(q=>unit(q).unitCents),[1398,1398,1258,1258,1188,1188,1118,1118]);
 assert.equal(unit(4).quantityTier,null);assert.equal(unit(4).quantityTierDiscountCents,0);
 assert.deepEqual(unit(5).quantityTier,{minQuantity:5,percentOff:10});assert.equal(unit(5).listUnitCents,1398);assert.equal(unit(5).quantityTierDiscountCents,140);
 assert.equal(unit(10).totalCents,11880);assert.equal(unit(25).totalCents,25*1118);
 assert.throws(()=>unit(100),/Menge: 1 bis 99/);assert.throws(()=>unit(0),/Menge: 1 bis 99/);
 // Rundung: halbe Cent nach oben, rein ganzzahlig.
 assert.equal(applyQuantityTier(1990,{minQuantity:5,percentOff:5}),1891,'1890,5 → 1891');
 assert.equal(applyQuantityTier(1001,{minQuantity:5,percentOff:50}),501,'500,5 → 501');
 assert.equal(applyQuantityTier(999,{minQuantity:5,percentOff:12.5}),874,'874,125 → 874');
 assert.equal(applyQuantityTier(1999,{minQuantity:5,percentOff:7.25}),1854,'1854,0725 → 1854');
 assert.deepEqual(quantityTierLabels(c),['ab 5 Stück −10 %','ab 10 Stück −15 %','ab 25 Stück −20 %']);
 // Gleiche Rechnung im Server-Pfad (resolveProduct = Bindung/Variante) für Menge 1: Listenpreis.
 assert.equal(resolveProduct(d,{options:o}).price.unitCents,1398);
});

test('Offene Staffel (percentOff null) = keine Staffel: kein Abschlag, keine Anzeige, Familie bleibt erzeugbar',()=>{
 const f=withTiers(OPEN),c=product(namen,f).config;
 assert.equal(activeQuantityTiers(c),null);assert.deepEqual(quantityTierLabels(c),[]);
 const q=quote(c,[],c.profile.defaultDesignId,{mounting:'B02'},25);
 assert.equal(q.unitCents,1398);assert.equal(q.quantityTier,null);assert.equal(q.totalCents,25*1398);
 // Eine offene Stufe macht die ganze Staffel offen – keine Teilstaffel.
 const partial=product(namen,withTiers([{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:null}])).config;
 assert.equal(quote(partial,[],partial.profile.defaultDesignId,{mounting:'B02'},5).unitCents,1398);
 // Offen sperrt die Erzeugung nicht, wird aber im Briefing genannt.
 assert.deepEqual(quantityTierGaps(f),['Mengenstaffel (Prozentwerte offen)']);assert.ok(!familyGaps(f).some(g=>/Staffel/.test(g)));
 assert.match(familyBriefing(f,1),/- Mengenstaffel \(Prozentwerte offen\)/);
 // Ohne Angabe trägt das Produkt keine Staffelfelder (bestehende Preisstände unverändert).
 const plain=product(hunde);assert.equal(plain.config.quantityTiers,undefined);
 assert.deepEqual(Object.keys(quote(plain.config,[],plain.config.profile.defaultDesignId,{},5)).sort(),['additionalMotifs','currency','options','quantity','totalCents','unitCents']);
});

test('Stückpreis-Stufe ersetzt den Grundpreis, Option kommt dazu; Größe überschreibt Familie',()=>{
 const f=structuredClone(family);f.quantityTiers=KNOWN;f.sizes[0].quantityTiers=[{minQuantity:10,unitCents:999}];
 const c=product(namen,validateFamily(f)).config;
 assert.deepEqual(c.quantityTiers,[{minQuantity:10,unitCents:999}],'Größe vor Familie');
 const q=quote(c,[],c.profile.defaultDesignId,{mounting:'B02'},10);
 assert.equal(q.unitCents,999+199);assert.equal(q.quantityTierDiscountCents,1398-1198);
 assert.equal(quote(c,[],c.profile.defaultDesignId,{mounting:'B02'},9).unitCents,1398);
 assert.deepEqual(quantityTierLabels(c),['ab 10 Stück je 9,99 € Grundpreis']);
});

test('Schema: Stufen aufsteigend, genau ein Wert, Prozent 0–100, höchstens zwei Nachkommastellen',()=>{
 for(const [tiers,re] of [
  [[{minQuantity:10,percentOff:5},{minQuantity:5,percentOff:10}],/aufsteigend/],
  [[{minQuantity:1,percentOff:5}],/2 bis 99/],[[{minQuantity:100,percentOff:5}],/2 bis 99/],
  [[{minQuantity:5,percentOff:5,unitCents:100}],/entweder percentOff oder unitCents/],[[{minQuantity:5}],/entweder/],
  [[{minQuantity:5,percentOff:100}],/unter 100/],[[{minQuantity:5,percentOff:0}],/über 0/],[[{minQuantity:5,percentOff:2.555}],/zwei Nachkommastellen/],
  [[{minQuantity:5,unitCents:9.5}],/ganzen Cent/],[[{minQuantity:5,percentOff:5,rabatt:1}],/Stufe aus/],[{},/Liste/]])
  assert.throws(()=>withTiers(tiers),re,JSON.stringify(tiers));
 assert.equal(quantityTiersIssue([]),null,'[] = ausdrücklich keine Staffel');
 assert.equal(quantityTiersIssue([{minQuantity:5,unitCents:100}],{allowUnitCents:false}),'Mengenstaffel: Stückpreise nur bei Produkten mit festem Grundpreis, sonst Prozent.');
 assert.throws(()=>withTiers([{minQuantity:5,percentOff:-1}],'size'),/Größe TS-RE-90X60: .*über 0/);
});

test('Überschreibung je Unterkategorie (Liste und je Größe) schlägt Familie und Vorgabe',()=>{
 const f=withTiers(KNOWN);
 const sub=structuredClone(namen);sub.priceOverrides.quantityTiers=[{minQuantity:3,percentOff:5}];
 validateLine({...structuredClone(line),subcategories:[sub]},{file:'linien/test-linie.json'});
 assert.deepEqual(product(sub,f).config.quantityTiers,[{minQuantity:3,percentOff:5}]);
 assert.equal(quote(product(sub,f).config,[],'start',{mounting:'B02'},3).unitCents,1328,'1398 × 0,95 = 1328,1');
 const sized=structuredClone(namen);sized.priceOverrides.quantityTiers={sizes:{'TS-RE-90X60':[]}};
 assert.deepEqual(product(sized,f).config.quantityTiers,[],'Unterkategorie schaltet die Staffel für eine Größe ab');
 assert.equal(quote(product(sized,f).config,[],'start',{mounting:'B02'},25).unitCents,1398);
 assert.deepEqual(applyPriceOverrides(f,{id:'x',priceOverrides:{quantityTiers:{family:OPEN}}}).quantityTiers,OPEN);
 assert.throws(()=>applyPriceOverrides(f,{id:'x',priceOverrides:{quantityTiers:{sizes:{FREMD:[]}}}}),/Staffel für unbekannte Größe „FREMD“/);
 assert.throws(()=>validateLine({...structuredClone(line),subcategories:[{...sub,priceOverrides:{quantityTiers:[{minQuantity:5,percentOff:150}]}}]},{file:'l.json'}),/l.json: Unterkategorie „namensschilder“: .*unter 100/);
 assert.equal(f.quantityTiers.length,3,'Familie selbst bleibt unverändert');
});

test('Vorgaben als Daten: fünf entschiedene Linien mit 5/10/25 offen, Türschilder/Hausnummern/Gedenktafeln ohne',()=>{
 const defaults=quantityTierDefaults();
 for(const [lineId,themeId] of [['brettchen','namensschilder'],['schluesselanhaenger','hundeschilder'],['pferdeschilder','pferdeschilder'],['edelstahl-tuerschilder','firmenschilder'],['acryl-tuerschilder','hinweisschilder']]){
  const hit=defaultQuantityTiers({id:lineId},{themeId},defaults);
  assert.deepEqual(hit.tiers,OPEN,lineId+'/'+themeId);assert.equal(hit.ruleId,'entscheidung-20261019-nr4');
 }
 for(const [lineId,themeId] of [['edelstahl-tuerschilder','namensschilder'],['edelstahl-tuerschilder','hausnummern'],['gedenktafeln-30x20','gedenktafeln'],['acryl-tuerschilder','familienschilder']])
  assert.equal(defaultQuantityTiers({id:lineId},{themeId},defaults),null,lineId+'/'+themeId);
 // Vorgabe greift nur ohne eigene Angabe – und ist ohne Codeänderung austauschbar (z. B. Shop-Bestand 3/5/10).
 const shop=validateQuantityTierDefaults({schema:'gravuru-quantity-tier-defaults/v1',rules:[{id:'shop',themeIds:['namensschilder'],tiers:[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}]}]});
 const c=product(namen,family,{tierDefaults:shop}).config;
 assert.deepEqual(quote(c,[],'start',{mounting:'B02'},3).quantityTier,{minQuantity:3,percentOff:5});
 assert.deepEqual(product(namen,withTiers(KNOWN),{tierDefaults:shop}).config.quantityTiers,KNOWN,'Familie vor Vorgabe');
 assert.throws(()=>validateQuantityTierDefaults({schema:'gravuru-quantity-tier-defaults/v1',rules:[{id:'x',tiers:[{minQuantity:5}]}]}),/Staffel-Vorgaben „x“/);
});

test('Warenkorb-Update (K8): neuer Prüfstand rechnet die Staffel bei Mengenänderung serverseitig neu',()=>{
 const d=validateProductDocument(product(namen,withTiers(KNOWN))),record={id:'p_tier',revision:1,document:d},config=d.config;
 const objects=structuredClone(config.profile.designs[0].objects).map(o=>o.type==='text'?{...o,text:'Familie Koch'}:o);
 const review=quantity=>validateAcrylicReview(record,config,{productId:'p_tier',productRevision:1,designId:config.profile.defaultDesignId,objects,options:{mounting:'B02'},quantity,media:[],preview:''}).price;
 const four=review(4),ten=review(10);
 assert.equal(four.unitCents,1398);assert.equal(four.totalCents,5592);
 assert.equal(ten.unitCents,1188);assert.equal(ten.totalCents,11880);assert.deepEqual(ten.quantityTier,{minQuantity:10,percentOff:15});
 // Angebot prüft den Staffelpreis gegen den gebundenen Listenpreis (13,98 €) nach.
 const manifest=p=>({selection:{price:p}});
 assert.equal(tierUnitCents(1398,manifest(ten)),1188);assert.equal(tierUnitCents(1398,manifest(four)),1398);
 assert.throws(()=>tierDiscount(1398,{...ten,quantityTierDiscountCents:300}),/Aufpreisbindung/);
 assert.throws(()=>tierDiscount(1398,{...ten,quantity:4}),/Aufpreisbindung/);
 // Fester Variantenpreis kann keine Staffel abbilden: Übergabe wird gesperrt statt falsch berechnet.
 const state={objects,designId:config.profile.defaultDesignId,mOptions:{mounting:'B02'}};
 assert.equal(commercePrice(config,state,10).listUnitCents,1398);
 const binding={variants:[{id:'1',key:commercePrice(config,state,1).key,priceCents:1398}],priceMode:'base-only'};
 assert.throws(()=>selectCommerceVariant(config,binding,state,10),/Mengenstaffel ist im Shop-Warenkorb noch nicht freigeschaltet/);
 assert.equal(selectCommerceVariant(config,binding,state,4).unitCents,1398);
});

test('Excel-Rundlauf: Blatt „Staffel“ je Familie und Größe, leerer Rabatt bleibt offen',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-staffel-'));
 try{
  const f=JSON.parse(fs.readFileSync(path.join(root,'app/designs/gedenktafeln-30x20/schiefer-natur.json')));
  f.quantityTiers=[{minQuantity:5,percentOff:null},{minQuantity:10,percentOff:7.5},{minQuantity:25,unitCents:1999}];
  f.sizes[0].quantityTiers=[];validateFamily(f);
  const src=path.join(dir,'familie.json'),xlsx=path.join(dir,'stamm.xlsx');fs.writeFileSync(src,JSON.stringify(f));
  execFileSync('python3',[path.join(root,'scripts/family-excel.py'),'export','--out',xlsx,src],{cwd:root});
  const rows=execFileSync('python3',['-c',"import sys;from openpyxl import load_workbook;ws=load_workbook(sys.argv[1])['Staffel'];print('\\n'.join('|'.join('' if c.value is None else str(c.value) for c in r) for r in ws.iter_rows()))",xlsx]).toString().trim().split('\n');
  assert.equal(rows[0],'Familie|SKU|ab Stück|Rabatt %|Stückpreis €');assert.equal(rows.length,5);
  execFileSync('python3',[path.join(root,'scripts/family-excel.py'),'import','--xlsx',xlsx,'--out',path.join(dir,'out')],{cwd:root});
  const back=validateFamily(JSON.parse(fs.readFileSync(path.join(dir,'out',f.id+'.json'))));
  assert.deepEqual(back.quantityTiers,f.quantityTiers);assert.deepEqual(back.sizes[0].quantityTiers,[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

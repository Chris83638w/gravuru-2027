import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planFamilyFormats} from './katalog-family-formats.mjs';
import {workshopResources} from './catalog.mjs';
import {resolvedOptions,selectedProfile,variantCombinations,quote,prepareConfig} from '../configurator/variant-m/contract.mjs';
import {galleryOrder} from '../configurator/variant-m/design-gallery-model.mjs';
import {familyChoicesMarkup} from '../configurator/variant-m/family-formats-ui.mjs';
import {validateCommerce,variantKey} from '../configurator/variant-m/commerce-model.mjs';
import {capturePersonalization} from './cart-personalization.mjs';

function source({approved=false,hidden=false}={}){
 const family=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),size=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
 const master={id:'TEST-AB-D1',name:'Test',hidden,themes:['familie'],fonts:['Montserrat'],plateMm:[120,80],fields:{},json:{form:'Rechteck abgerundete Ecken',sizes:[size.key],ziele:[{familie:family.id,freigabe:approved?{status:'freigegeben',von:'Test',am:'2026-11-01'}:null}]},svg:()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><text id="text-1" x="60" y="40" text-anchor="middle" font-family="Montserrat" font-size="8">Name</text></svg>'};
 const fonts=workshopResources().fonts;
 return {families:new Map([[family.id,family]]),lines:new Map([['test',{id:'test',name:'Test',families:[family.id],subcategories:[{id:'familie',name:'Familie',themeId:'familie'}]}]]),designs:{masters:[master]},theme:()=>null,fontResources:async()=>({fonts:{Montserrat:fonts.Montserrat},missing:[]})};
}
test('planner never promotes an open target; explicit review copy remains non-orderable and does not mutate sources',async()=>{
 const k=source(),before=JSON.stringify(k.designs.masters[0].json),strict=await planFamilyFormats(k,'test','familie');
 assert.equal(strict.config,null);assert.equal(strict.report.shopify.plannedVariants,404);assert.equal(strict.report.shopify.variantIdsCreated,0);
 const review=await planFamilyFormats(k,'test','familie',{reviewUnreleased:true});assert(review.config);assert.equal(review.config.reviewOnly,true);assert.equal(review.config.profile.features.orderEnabled,false);assert.equal(JSON.stringify(k.designs.masters[0].json),before);assert.equal(review.config.familyFormats.source.reviewUnreleased,true);
 assert.equal(new Set(review.report.shopify.variants.map(v=>JSON.stringify(v.optionValues))).size,404);assert(review.report.shopify.variants.every(v=>v.shopifyVariantId===null));
});
test('only approved, visible, theme-matching master supplies a native target and stable size/price',async()=>{
 const k=source({approved:true}),r=await planFamilyFormats(k,'test','familie'),master=k.designs.masters[0];assert(r.config);assert.equal(r.config.familyFormats.designs[0].katalog.designId,master.id);assert.equal(r.report.shopify.availableVariants,5);
 assert.equal(r.config.familyFormats.formats.find(f=>f.key===master.json.sizes[0]).variants[0].basePriceCents,1999);
 master.hidden=true;assert.equal((await planFamilyFormats(k,'test','familie',{reviewUnreleased:true})).config,null);
 master.hidden=false;master.themes=['other'];assert.equal((await planFamilyFormats(k,'test','familie')).config,null);
});
test('no default AB target means no invented starter or design ID',async()=>{
 const k=source({approved:true});k.designs.masters[0].json.sizes=[];
 const r=await planFamilyFormats(k,'test','familie');assert.equal(r.config,null);assert(r.report.blocked.some(b=>b.reason.includes('kein Ersatz-Startdesign')));assert.equal(r.report.shopify.variantIdsCreated,0);
});

test('review shows unapproved targets explicitly and never imports a design without a family target',async()=>{
 const k=source(),review=await planFamilyFormats(k,'test','familie',{reviewUnreleased:true}),id=review.config.familyFormats.designs[0].id;
 assert(review.config.familyFormats.formats.find(f=>f.variants[0].designIds.includes(id)).variants[0].unapprovedDesignIds.includes(id));
 k.designs.masters[0].json.ziele=[];assert.equal((await planFamilyFormats(k,'test','familie',{reviewUnreleased:true})).config,null);
});

test('139: fixed shop product uses its starter, shows other approved themes and refuses a foreign size',async()=>{
 const k=source({approved:true}),master=k.designs.masters[0],sizeKey=master.json.sizes[0];
 k.designs.masters.push({...master,id:'TEST-AB-D2',themes:['tiere']},{...master,id:'TEST-AB-D3',json:{...master.json,ziele:[{familie:'steel-door-signs',freigabe:null}]}});
 const r=await planFamilyFormats(k,'test','familie',{shopProduct:{sizeKey,themeId:'familie',defaultDesignId:master.id}}),c=r.config;
 assert(c);assert.equal(c.familyFormats.formats.length,1);assert.equal(c.familyFormats.designs.length,2);
 assert.equal(c.profile.defaultDesignId,'katalog-TEST-AB-D1');assert.equal(c.profile.themeId,'familie');
 assert.deepEqual(galleryOrder(c.profile.designs,c.profile.themeId),{theme:'familie',primary:['katalog-TEST-AB-D1'],more:['katalog-TEST-AB-D2']});
 const o=resolvedOptions(c),markup=familyChoicesMarkup(c,o);assert.doesNotMatch(markup,/data-family-group="(?:form|size)"/);assert.match(markup,/data-family-group="mounting"/);
 assert.throws(()=>resolvedOptions(c,{size:'another'}),/Größe.*fest/);assert.equal(c.photo.enabled,false);assert.deepEqual(c.logo,{...c.logo,enabled:true,vectorUpload:true,extraPriceCents:1299});
 const combinations=variantCombinations(c);assert.equal(combinations.length,5);
 assert(combinations.every(o=>!Object.hasOwn(o,'size')&&Object.keys(o).every(key=>c.profile.optionGroups.some(g=>g.id===key))),'binding registry accepts only real variant options');
 const binding={schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/1',profileId:c.profile.id,revision:c.profile.revision,currency:'EUR',priceMode:'base-only',designIds:c.familyFormats.designs.map(d=>d.id),variants:combinations.map((o,i)=>({id:String(i+1),key:variantKey(o),priceCents:quote(c,[],selectedProfile(c,o).defaultDesignId,o).unitCents}))};
 assert.equal(validateCommerce(c,binding),binding);binding.designIds.pop();assert.throws(()=>validateCommerce(c,binding),/Designumfang/);
});

test('139: missing/unapproved starter cannot silently fall back, motif-only masters stay out',async()=>{
 const k=source({approved:true}),master=k.designs.masters[0],shopProduct={sizeKey:master.json.sizes[0],themeId:'familie',defaultDesignId:master.id};
 k.designs.masters.push({...master,id:'motif-only',svg:()=>'<svg viewBox="0 0 120 80"><path id="motiv-1" d="M40 30 L50 30 L50 40 Z"/></svg>'});
 assert.equal((await planFamilyFormats(k,'test','familie',{shopProduct})).config.familyFormats.designs.length,1);
 await assert.rejects(planFamilyFormats(k,'test','familie',{shopProduct:{...shopProduct,defaultDesignId:'missing'}}),/Startdesign/);
 await assert.rejects(planFamilyFormats(k,'test','familie',{shopProduct,reviewUnreleased:true}),/Prüffreigaben/);
});

test('139: all 101 approved catalog designs survive validation; a changed bound starter is rejected',async()=>{
 const k=source({approved:true}),master=k.designs.masters[0],shopProduct={sizeKey:master.json.sizes[0],themeId:'familie',defaultDesignId:master.id};
 for(let i=2;i<=101;i++)k.designs.masters.push({...master,id:'TEST-AB-D'+i});
 const {config}=await planFamilyFormats(k,'test','familie',{shopProduct});
 assert.equal(config.profile.designs.length,101);
 assert.equal(config.familyFormats.designs.length,101);
 const altered=structuredClone(config);altered.profile.defaultDesignId='katalog-TEST-AB-D2';
 assert.throws(()=>prepareConfig(altered),/fester Shop-Produktschnitt/);
});

test('139: fixed door signs keep only their own mounting options; bell and memorial families cannot enter this planner',async()=>{
 const k=source({approved:true}),master=k.designs.masters[0],shopProduct={sizeKey:master.json.sizes[0],themeId:'familie',defaultDesignId:master.id};
 const {config:c}=await planFamilyFormats(k,'test','familie',{shopProduct});
 assert.deepEqual(c.profile.optionGroups.map(g=>g.id),['mounting']);
 for(const other of [{frame:'flush'},{position:'opposite'},{format:'bell'},{backing:'steel'}])assert.throws(()=>resolvedOptions(c,other),/Unbekannte/);
 assert.equal(c.doorbell,undefined);assert.equal(c.acrylic,undefined);assert.equal(c.familyAcrylic,undefined);
 for(const familyId of ['funkklingeln','ae-gedenktafeln','gedenktafel-30x20-schiefer-natur']){
  k.lines.get('test').families=[familyId];
  await assert.rejects(planFamilyFormats(k,'test','familie',{shopProduct}),/Keine freigegebene Türschild-Familienart/);
 }
});

test('fixed product preserves the confirmed catalog tier precedence and matching checkout contract',async()=>{
 const k=source({approved:true}),line=k.lines.get('test'),sub=line.subcategories[0],master=k.designs.masters[0];line.id='edelstahl-tuerschilder';
 const shopProduct={sizeKey:master.json.sizes[0],themeId:'familie',defaultDesignId:master.id};
 const {config:c}=await planFamilyFormats(k,'test','familie',{shopProduct}),o=resolvedOptions(c);
 assert.deepEqual(c.quantityTiers,[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}]);
 assert.equal(c.quantityTierScope,'complete-unit');assert.equal(quote(c,[],c.profile.defaultDesignId,o,3).unitCents,1899);
 const pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:'gid://shopify/Product/1',revision:2,currency:'EUR',variants:{1:1999},extraMotifCents:c.extraMotifCents,extraPhotoCents:0,extraLogoCents:1299,quantityTiers:c.quantityTiers,quantityTierScope:'complete-unit'};
 assert.equal(capturePersonalization(pricing,{variantId:'1',baseCents:1999,document:{config:c}}).quantityTiers.length,3);
 sub.priceOverrides={quantityTiers:[]};const {config:none}=await planFamilyFormats(k,'test','familie',{shopProduct});
 assert.deepEqual(none.quantityTiers,[]);assert.equal(quote(none,[],none.profile.defaultDesignId,resolvedOptions(none),3).unitCents,1999);
});

test('subcategory material choice filters the format planner without expanding its technical support',async()=>{
 const k=source({approved:true}),sub=k.lines.get('test').subcategories[0];
 const inherited=await planFamilyFormats(k,'test','familie');
 sub.familyIdsOffered=['steel-door-signs'];const explicit=await planFamilyFormats(k,'test','familie');
 assert.deepEqual(explicit.config,inherited.config);assert.deepEqual(explicit.report.shopify,inherited.report.shopify);
 sub.familyIdsOffered=[];await assert.rejects(planFamilyFormats(k,'test','familie'),/Keine freigegebene Türschild-Familienart/);
 for(const name of ['aa','as']){const family=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-standoff-signs/'+name+'.json',import.meta.url)));k.families.set(family.id,family);sub.familyIdsOffered=['steel-door-signs',family.id];await assert.rejects(planFamilyFormats(k,'test','familie'),e=>e.message.includes(family.id)&&/noch nicht.*angeschlossen/.test(e.message));}
 sub.familyIdsOffered=null;assert.deepEqual((await planFamilyFormats(k,'test','familie')).config,inherited.config);
});

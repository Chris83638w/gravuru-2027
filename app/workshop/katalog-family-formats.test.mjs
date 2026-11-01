import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planFamilyFormats} from './katalog-family-formats.mjs';
import {workshopResources} from './catalog.mjs';
import {familyDesignReviewNote} from '../configurator/variant-m/family-formats.mjs';

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

test('size expansion is explicit, local, proportional, same-form and leaves source approvals untouched',async()=>{
 const k=source({approved:true}),before=JSON.stringify(k.designs.masters[0].json);
 await assert.rejects(planFamilyFormats(k,'test','familie',{reviewExpandedSizes:true}),/lokale Prüfvorlagen/);
 const r=await planFamilyFormats(k,'test','familie',{reviewUnreleased:true,reviewExpandedSizes:true});
 const extended=r.config.familyFormats.formats.filter(f=>Object.values(f.variants[0].reviewDiagnostics).some(d=>d.transferred));
 assert(extended.length>0);assert(extended.every(f=>f.form==='AB'&&Math.abs(f.geometry.width/f.geometry.height-1.5)<.015));
 const f=extended[0],id=f.variants[0].designIds[0];assert.match(familyDesignReviewNote(r.config,{size:f.key},id),/übertragen, noch nicht geprüft/);
 assert.equal(JSON.stringify(k.designs.masters[0].json),before);
 const strict=await planFamilyFormats(k,'test','familie');assert.equal(strict.report.shopify.availableVariants,5);
});

test('renderable contour/edge failures are shown with their reason only in explicit local review',async()=>{
 const k=source({approved:true}),m=k.designs.masters[0],size=k.families.get('steel-door-signs').sizes.find(s=>s.groupKey==='OV'&&s.widthMm===90&&s.heightMm===60);
 const bad={...m,id:'TEST-OV-D2',plateMm:[90,60],json:{...m.json,form:'Oval',sizes:[size.key]},svg:()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><text id="text-1" x="89" y="30" text-anchor="middle" font-family="Montserrat" font-size="8">Außerhalb</text></svg>'};k.designs.masters.push(bad);
 const strict=await planFamilyFormats(k,'test','familie');assert.equal(strict.config.familyFormats.formats.find(f=>f.key===size.key).variants[0].designIds.length,0);
 const r=await planFamilyFormats(k,'test','familie',{reviewUnreleased:true,reviewFlagged:true});assert(r.config);assert(r.report.excluded.every(e=>e.shownForReview));
 const id=r.config.familyFormats.designs.find(d=>d.katalog.designId===bad.id).id;assert.match(familyDesignReviewNote(r.config,{size:size.key},id),/prüfen: .*ragt/);
 assert.equal(r.config.profile.features.orderEnabled,false);
});

test('a scaled text over 100 mm remains visible and flagged in local review without changing font limits',async()=>{
 const k=source({approved:true}),m=k.designs.masters[0],f=k.families.get('steel-door-signs');
 const big=f.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===450&&s.heightMm===300);assert(big);m.json.sizes.push(big.key);
 m.svg=()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><text id="text-1" x="60" y="40" text-anchor="middle" font-family="Montserrat" font-size="30">A</text></svg>';
 const strict=await planFamilyFormats(k,'test','familie');assert.equal(strict.config.familyFormats.formats.find(f=>f.key===big.key).variants[0].designIds.length,0);
 const r=await planFamilyFormats(k,'test','familie',{reviewUnreleased:true,reviewFlagged:true}),id=r.config.familyFormats.designs[0].id;
 assert.match(familyDesignReviewNote(r.config,{size:big.key},id),/prüfen: Schriftgröße: 1 bis 100 mm/);
 assert.equal(m.json.freigabe,undefined);
});

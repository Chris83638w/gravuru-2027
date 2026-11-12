// Main R2 (12.11.2026): pricing every template of a large family variant (gallery) must stay
// linear when a module profile is set, and must return exactly the same quotes as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {familyProductConfig} from '../../workshop/product-families.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {prepareConfig,resolvedOptions,selectedProfile,quote} from './contract.mjs';
import {FAMILY_FORMATS_SCHEMA} from './family-formats.mjs';
import {MODULE_PROFILE_SCHEMA} from './module-profile.mjs';
const clone=v=>structuredClone(v);
function fixture(count,{modules=true}={}){
 const f=JSON.parse(fs.readFileSync(new URL('../../workshop/test-fixtures/acryl3-rear/steel.json',import.meta.url))),formats=[],designs=[];let c;
 const chosen=f.sizes.filter((s,i,list)=>['AB','RT2'].includes(s.groupKey)&&s.widthMm===120&&s.heightMm===80||list.findIndex(a=>a.groupKey===s.groupKey)===i);
 for(const s of chosen){const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(s.groupKey==='AB'&&s.widthMm===120)c=n;
  const ids=[];
  for(let k=0;k<(s.groupKey==='R'?0:count);k++){const d=clone(p.designs[0]);d.id='bench-'+s.key+'-'+k;d.katalog={designId:'BENCH-'+s.groupKey+'-D'+k,plateMm:[s.widthMm,s.heightMm]};
   const o=d.objects[0];Object.assign(o,{text:'Name '+k,fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);designs.push(d);ids.push(d.id);}
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:clone(p.geometry),variants:[{color:'steel',familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:ids}]});
 }
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:formats.find(s=>s.form==='AB'&&s.geometry.width===120).key,defaultColor:'steel',colors:[{id:'steel',label:'steel'}],formats,designs};
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:c.familyFormats.defaultSize,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[...new Map(formats.flatMap(s=>s.variants[0].mounting.map(m=>[m.id,{id:m.id,label:m.label,priceCents:0,currency:'EUR'}]))).values()]}];
 delete c.familyAcrylic;
 if(modules)c.moduleProfile={schema:MODULE_PROFILE_SCHEMA,id:'cmp_gallery_test',revision:1,modules:{colors:false,designs:true,logo:false,motifs:true,options:true,photo:false,text:true}};
 return prepareConfig(c);
}
// Same two quotes per template as shop-design-gallery selection().
function galleryQuotes(c,options){return selectedProfile(c,options).designs.map(d=>[d.id,quote(c,[],d.id,options).unitCents,quote(c,d.objects,d.id,options).unitCents]);}
function median(c){const opts=resolvedOptions(c),runs=[];for(let i=0;i<3;i++){const t=performance.now();galleryQuotes(c,opts);runs.push(performance.now()-t);}return runs.sort((a,b)=>a-b)[1];}

test('gallery quotes with a module profile stay linear in the number of family templates',()=>{
 const small=fixture(40),large=fixture(240);
 galleryQuotes(small,resolvedOptions(small));galleryQuotes(large,resolvedOptions(large));
 const ratio=median(large)/Math.max(median(small),0.5);
 // 6× more templates: linear ≈ 6, the former quadratic module check ≈ 36.
 assert.ok(ratio<15,'Verhältnis 240/40 Vorlagen: '+ratio.toFixed(1));
});
test('module-checked quotes equal the quotes of fresh, uncached configurations',()=>{
 const c=fixture(30),opts=resolvedOptions(c),cached=galleryQuotes(c,opts),again=galleryQuotes(c,opts);
 assert.deepEqual(again,cached);
 const fresh=selectedProfile(fixture(30),opts).designs.map(d=>{const f=fixture(30);return [d.id,quote(f,[],d.id,opts).unitCents,quote(f,d.objects,d.id,opts).unitCents];});
 assert.deepEqual(cached,fresh);
});
test('the module check still rejects a foreign ink when colours are switched off',()=>{
 const c=fixture(3),opts=resolvedOptions(c),d=selectedProfile(c,opts).designs[0];
 quote(c,d.objects,d.id,opts);
 const recoloured=clone(d.objects);recoloured[0].color='#ff0000';
 assert.throws(()=>quote(c,recoloured,d.id,opts),/Farbwahl ist bei diesem Produkt ausgeschaltet/);
});
test('a default design set later on the same model is honoured when the design choice is switched off',()=>{
 const c=fixture(3),opts=resolvedOptions(c),[a,b]=selectedProfile(c,opts).designs;
 c.moduleProfile={...c.moduleProfile,modules:{...c.moduleProfile.modules,designs:false}};
 c.profile.defaultDesignId=a.id;
 // Empty object lists are template quotes and skip the module check, so quote with the design objects.
 quote(c,a.objects,a.id,opts);assert.throws(()=>quote(c,b.objects,b.id,opts),/Designauswahl ist bei diesem Produkt ausgeschaltet/);
 c.profile.defaultDesignId=b.id;
 quote(c,b.objects,b.id,opts);assert.throws(()=>quote(c,a.objects,a.id,opts),/Designauswahl ist bei diesem Produkt ausgeschaltet/);
});
test('different executions on the same model keep their own quotes',()=>{
 const c=fixture(4),sizes=c.familyFormats.formats.filter(f=>f.variants[0].designIds.length).map(f=>f.key),mountings=['K00','B02'];
 const all=[];for(const size of sizes)for(const mounting of mountings){let opts;try{opts=resolvedOptions(c,{size,mounting});}catch{continue;}
  const f=fixture(4),d=selectedProfile(f,opts).designs[0];
  const fresh=quote(f,d.objects,d.id,opts),viaShared=quote(c,d.objects,d.id,opts);assert.deepEqual(viaShared,fresh);all.push(fresh.unitCents);}
 assert.ok(all.length>=2);
});

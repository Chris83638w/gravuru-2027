import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFamily,familyProductConfig,geometryOf} from './product-families.mjs';
import {makeProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {selectedProfile,prepareConfig,customerLayoutIssue} from '../configurator/variant-m/contract.mjs';
import {workshopResources} from './catalog.mjs';
import {assignSeries,scaleTemplate,katalogDesignToTemplate,templateFit,sourceContourSizes} from './katalog-convert.mjs';

const drawings=JSON.parse(fs.readFileSync(new URL('./test-fixtures/retro-contours.json',import.meta.url))).rows;
const samples=JSON.parse(fs.readFileSync(new URL('./test-fixtures/retro-designs.json',import.meta.url))).samples;
const fonts={...workshopResources().fonts,...JSON.parse(fs.readFileSync(new URL('../designs/aosu-labrador/assets/michroma-vectors.json',import.meta.url)))};
function family(){
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url)));
 f.groups=['RT1','RT2'].map(key=>({key,name:key,shape:'contour',cornerRadiusMm:0}));
 f.designArea={marginMm:0,keepoutMm:1};f.withoutMounting=true;
 f.mountingRules=[{id:'B02-KONTUR',label:'Feste Zeichnungsbohrungen',layout:'left-right',count:2,diameterMm:4,edgeMm:null,priceCents:249,skuSuffix:'B02'}];
 f.sizes=drawings.map(r=>({key:'GR-ES-RT'+r.id[3]+'-'+r.widthMm+'X'+r.heightMm+'-T15',groupKey:'RT'+r.id[3],label:r.widthMm+' × '+r.heightMm+' mm',widthMm:r.widthMm,heightMm:r.heightMm,baseCents:r.widthMm===90?1499:null,mounting:['B02-KONTUR'],outlinePath:r.outline,holesMm:r.holes.map(h=>({x:h.x,y:h.y,diameterMm:h.diameter}))}));
 return validateFamily(f);
}
test('family -> product document -> chosen profile preserves original contour, fixed holes and price',()=>{
 const f=family();
 for(const size of f.sizes.filter(s=>s.widthMm===90)){
  const view={...f,groups:f.groups.filter(g=>g.key===size.groupKey),sizes:[size]},before=JSON.stringify(size);
  const c=familyProductConfig(view,size,7),doc=makeProductDocument(c),p=resolveProduct(doc,{options:{mounting:'B02'}});
  assert.equal(p.profile.geometry.shape,'contour');assert.equal(p.profile.geometry.outlinePath,size.outlinePath);
  assert.deepEqual(p.profile.geometry.holes,size.holesMm.map(h=>({x:h.x,y:h.y,diameter:h.diameterMm})));
  assert.equal(p.profile.geometry.holeKeepoutMm,1);assert.equal(p.price.unitCents,1748);
  assert.equal(p.config.reviewOnly,true);assert.equal(p.profile.features.orderEnabled,false);
  assert.deepEqual(selectedProfile(c,{mounting:'K00'}).geometry.holes,[]);
  const draft=structuredClone(p.design);draft.objects[0].x=size.holesMm[0].x;draft.objects[0].y=size.holesMm[0].y;
  assert.throws(()=>validateProductDesign(doc,draft,{options:{mounting:'B02'},template:true}),/Schutzzone|Gestaltungsfläche/);
  assert.equal(JSON.stringify(size),before);
  const bad=structuredClone(c);bad.profile.optionGroups[0].values.find(v=>v.id==='B02').holes[0].x=-1;
  assert.throws(()=>prepareConfig(bad),/Bohrloch/);
 }
 assert.ok(f.sizes.filter(s=>s.widthMm===300).every(s=>s.baseCents===null),'large prices remain open');
});
test('source Retro sheet names resolve only existing drawn contour sizes; other old dimensions stay open',()=>{
 const f=family();
 for(const sample of samples){
  const d={id:sample.json.id,name:sample.json.name,source:'lieferform2',plateMm:sample.json.plateMm,json:sample.json,themes:sample.json.themes,svg:()=>sample.svg};
  const assignment=assignSeries(f,[d])[0];
  assert.equal(assignment.oldSize,false);assert.equal(assignment.sizes.length,1);
  assert.ok(assignment.sizes[0].includes(d.id.startsWith('TR1')?'RT1':'RT2'));
  assert.ok(assignment.sizes[0].includes('90X60'),'30x20 is not a green source sheet size');
  assert.equal(sourceContourSizes(f,{json:{sizesOpen:['TR2-V2A-31x21']}}).length,0);
  const size=f.sizes.find(s=>s.key===assignment.sizes[0]),converted=katalogDesignToTemplate(d,f,null,{fonts}),before=JSON.stringify(converted.template);
  const transferred=scaleTemplate(converted.template,d.plateMm,[90,60],fonts,{contain:true}),fit=templateFit(transferred,f,size,fonts);
  assert.notEqual(fit.status,'passt nicht',sample.json.id+': '+fit.issues.join('; '));
  assert.equal(JSON.stringify(converted.template),before);
  if(d.id.startsWith('TR2')){
   assert.equal(transferred.katalog.scale,60/61.3);assert.equal(transferred.katalog.fitMode,'proportional-contain');
   assert.deepEqual(transferred.katalog.sourceMm,[90.6,61.3]);assert.ok(transferred.katalog.offsetMm[0]>0);assert.equal(transferred.katalog.offsetMm[1],0);
   assert.equal(fit.status,'prüfen');assert.throws(()=>scaleTemplate(converted.template,d.plateMm,[90,60],fonts),/Formatreihe/);
  }
  assert.equal(geometryOf(f,size).outlinePath,size.outlinePath);
 }
 const unknown={id:'old',plateMm:[90.6,61.3],json:{sizes:[],sizesOpen:['OTHER-9x6']}};
 assert.equal(assignSeries(f,[unknown])[0].oldSize,true);
});
test('customer artwork may cross drill holes for basic and contour shapes',()=>{
 const o={type:'motif',x:20,y:20,w:5,h:5,rotation:0};
 const base={width:90,height:60,shape:'rect',safeMarginMm:0,holeKeepoutMm:3,holes:[{x:20,y:20,diameter:4}]};
 assert.equal(customerLayoutIssue(o,{geometry:base}),'');
 assert.equal(customerLayoutIssue(o,{geometry:{...base,shape:'contour',outlinePath:'M0 0H90V60H0Z'}}),'');
 assert.match(customerLayoutIssue({...o,x:-5},{geometry:{...base,shape:'contour',outlinePath:'M0 0H90V60H0Z'}}),/hinaus/);
 assert.deepEqual(base.holes,[{x:20,y:20,diameter:4}]);
});

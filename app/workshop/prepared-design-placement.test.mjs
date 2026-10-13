import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDesignAssetStore} from './design-assets.mjs';
import {steelSpecimen} from './specimen-product.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {planPreparedDesign,applyPreparedDesign,preparedPlacement} from './prepared-design.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {objectIssue} from '../platform/sources/app/shared/models/design-content.mjs';

const svg=(w,h)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><path d="M5 5H${w-5}" fill="none" stroke="#000000"/></svg>`).toString('base64');
const pkg=(w,h,font)=>({schema:'gravuru-prepared-design/v1',designId:'plugin-test',name:'Plugin-Test',widthMm:w,heightMm:h,sourceSha256:'c'.repeat(64),layers:[
 {id:'deko-1',type:'artwork',name:'deko-1.svg',bytes:svg(w,h)},
 {id:'customer-names',type:'text',fieldKey:'names',label:'Namen',x:w/2,y:h/2,text:'Familie Müller',font,size:6,letterSpacing:.2,color:'#000000',allowColor:false}
]});
function stores(t){
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const repository=createProductRepository({filename:':memory:',validateDocument:d=>assets.validateDocument(validateProductDocument(d))});t.after(()=>repository.close());
 return {assets,repository};
}
const inside=(design,profile)=>{for(const o of design.objects.filter(o=>o.type!=='text'))assert.equal(objectIssue(o,profile),'',o.id);};

test('steel package in plate size is placed 1:1 (user flow: plugin design for 90 × 60)',async t=>{
 const {assets,repository}=stores(t),record=repository.create(makeProductDocument(await steelSpecimen(assets)));
 const plan=await planPreparedDesign(repository,assets,record.id,{expectedRevision:1,package:pkg(90,60,'Montserrat')});
 assert.equal(plan.fit,'original');assert.equal(plan.scale,1);assert.match(plan.warnings[0],/1:1/);
 const d=plan.document.config.profile.designs.find(d=>d.id==='plugin-test'),art=d.objects.find(o=>o.id==='deko-1'),text=d.objects.find(o=>o.id==='customer-names');
 assert.deepEqual([art.x,art.y,art.w,art.h],[45,30,90,60]);assert.deepEqual([text.x,text.y,text.size,text.letterSpacing],[45,30,6,.2]);
 inside(d,plan.document.config.profile);
 const saved=await applyPreparedDesign(repository,assets,record.id,{expectedRevision:1,package:pkg(90,60,'Montserrat'),token:plan.token});
 assert.equal(saved.revision,2);assert.equal(repository.get(record.id,{revision:1}).revision,1);
});

test('steel no longer uses the acrylic area: a 150 × 200 package fits the 90 × 60 plate instead of failing (P1-4)',async t=>{
 const {assets,repository}=stores(t),record=repository.create(makeProductDocument(await steelSpecimen(assets)));
 const plan=await planPreparedDesign(repository,assets,record.id,{expectedRevision:1,package:pkg(150,200,'Montserrat')});
 assert.equal(plan.fit,'contain');assert.ok(Math.abs(plan.scale-.3)<1e-6,plan.scale);assert.match(plan.warnings[0],/30 %/);
 const d=plan.document.config.profile.designs.find(d=>d.id==='plugin-test'),art=d.objects.find(o=>o.id==='deko-1');
 assert.ok(Math.abs(art.x-45)<1e-6&&Math.abs(art.y-30)<1e-6);inside(d,plan.document.config.profile);
});

test('steel with a legacy 2 mm margin falls back to contour fitting instead of placing over the margin',async t=>{
 const {assets,repository}=stores(t),doc=makeProductDocument(await steelSpecimen(assets));doc.config.profile.geometry.safeMarginMm=2;
 const record=repository.create(doc),plan=await planPreparedDesign(repository,assets,record.id,{expectedRevision:1,package:pkg(90,60,'Montserrat')});
 assert.equal(plan.fit,'contain');assert.ok(plan.scale<1);inside(plan.document.config.profile.designs.find(d=>d.id==='plugin-test'),plan.document.config.profile);
});

test('acrylic 150 × 200 package uses the full plate 1:1 instead of the former 93 %',async t=>{
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const {assets,repository}=stores(t),config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'b'.repeat(64));
 const record=repository.create(makeProductDocument(config));
 const plan=await planPreparedDesign(repository,assets,record.id,{expectedRevision:1,package:pkg(150,200,'Garamond Acryl')});
 assert.equal(plan.fit,'original');assert.equal(plan.scale,1);
 const art=plan.document.config.profile.designs.find(d=>d.id==='plugin-test').objects.find(o=>o.id==='deko-1');
 assert.deepEqual([art.x,art.y,art.w,art.h],[75,100,150,200]);
});

test('oval plate accepts a plate-size fixed canvas 1:1; customer content is still checked against the oval',()=>{
 const profile={kind:'universal-product',geometry:{width:90,height:60,shape:'ellipse',cornerRadiusMm:0,safeMarginMm:0,holes:[]}};
 const placed=preparedPlacement({profile},{widthMm:90,heightMm:60});assert.equal(placed.fit,'original');assert.equal(placed.scale,1);
 const art={type:'motif',acrylicFixed:true,templateOrigin:true,x:45,y:30,w:90,h:60,rotation:0};
 assert.equal(objectIssue(art,profile),'');
 assert.match(objectIssue({...art,templateOrigin:false},profile),/oval/);
 assert.match(objectIssue({...art,w:89},profile),/oval/);
 assert.match(objectIssue({type:'text',x:3,y:3,w:4,h:4,rotation:0},profile),/oval/);
 assert.match(objectIssue(art,{...profile,geometry:{...profile.geometry,safeMarginMm:1}}),/ragt/);
});

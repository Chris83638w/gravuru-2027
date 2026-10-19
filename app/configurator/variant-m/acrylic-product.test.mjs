import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ACRYLIC_PRICING,acrylicSelection,containAcrylicObject,makeAcrylicConfig} from './acrylic-product.mjs';
import {quote,prepareConfig,validateDesign,saveDraft,readDraft} from './contract.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
// Expected commercial values are independent of the production constants.
const confirmedBases={none:0,buche:899,eiche:999,nussbaum:1099,klar:399,satiniert:499,'holz-flach':599};
const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const fixture=()=>{
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},{fonts:resources.fonts,motifs:resources.motifs},'a'.repeat(64));
  for(const o of config.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
  return prepareConfig(config);
};
test('both sizes and all independent base/wall combinations use confirmed prices',()=>{
  const config=fixture(),design=config.profile.designs[0];let combinations=0;
  for(const size of ['small','large'])for(const [base,priceCents] of Object.entries(confirmedBases))for(const wall of ['none','wall']){
    const options={size,base,wall},result=acrylicSelection(options,config.acrylic.pricing);
    const expected=(size==='small'?1499:1999)+priceCents+(size==='large'&&base!=='none'?100:0)+(wall==='wall'?599:0);
    assert.equal(result.totalCents,expected,JSON.stringify(options));
    assert.equal(result.wallCents,wall==='wall'?599:0);
    assert.equal(quote(config,design.objects,design.id,options).unitCents,expected);
    assert.equal(quote(config,design.objects,design.id,options,2).totalCents,expected*2);
    combinations++;
  }
  assert.equal(combinations,28);
  assert.equal(acrylicSelection({size:'large',base:'eiche',wall:'wall'}).totalCents,3697);
  assert.throws(()=>acrylicSelection({base:'unknown'}));
});
test('price resolution uses the persisted revision, not a second set of hardcoded UI prices',()=>{
  const config=fixture(),design=config.profile.designs[0];
  config.acrylic.pricing.sizes.large=2499;config.acrylic.pricing.bases.eiche=1199;
  config.acrylic.pricing.largeBaseExtraCents=200;config.acrylic.pricing.wallCents=699;
  const options={size:'large',base:'eiche',wall:'wall'};
  assert.equal(acrylicSelection(options,config.acrylic.pricing).totalCents,4597);
  assert.equal(quote(config,design.objects,design.id,options).unitCents,4597);
  assert.equal(acrylicSelection({size:'large'},config.acrylic.pricing).baseCents,0);
  assert.equal(ACRYLIC_PRICING.sizes.large,1999);
});
test('malformed options and invalid monetary rules fail closed',()=>{
  for(const options of [null,[],{size:''},{size:'constructor'},{wall:'yes'},{base:'constructor'},{other:'x'}])assert.throws(()=>acrylicSelection(options),/Ausführung/);
  for(const change of [p=>{p.bases.none=100;},p=>{p.wallCents=5.99;},p=>{p.sizes.small=-1;},p=>{delete p.bases.eiche;},p=>{p.schema='other';},p=>{p.sizes.large=Number.MAX_SAFE_INTEGER;}]){
    const prices=structuredClone(ACRYLIC_PRICING);change(prices);
    assert.throws(()=>acrylicSelection({size:'large',base:'eiche'},prices),/preise|Gesamtpreis/);
  }
});
test('design remains above maximum insertion and clearance, including rotated customer elements',()=>{
  for(const rotation of [0,30,90,135]){
    const o=containAcrylicObject({type:'text',x:170,y:210,w:80,h:12,size:8,rotation});
    const a=rotation*Math.PI/180,h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a));
    assert(o.y+h/2<=190.00001);
  }
  const config=makeAcrylicConfig({profile:{}},{fonts:[],motifs:[]},'test');
  for(const o of config.profile.designs[0].objects)assert(o.y+o.h/2<=190, o.id);
});
test('fixed template objects reject moving, hiding, deletion and changed slot semantics',()=>{
  const config=fixture(),source=config.profile.designs[0];
  for(const id of ['photo-main','photo-frame','location-pin','heart'])for(const change of [
    (d,o)=>{o.x+=1;},(d,o)=>{o.w+=1;},(d,o)=>{o.rotation=10;},(d,o)=>{o.uxHidden=true;},
    (d,o)=>{o.acrylicFixed=false;},(d,o)=>{d.objects=d.objects.filter(x=>x.id!==o.id);},
    (d,o)=>{o.fieldKey='different-meaning';}
  ]){
    const design=structuredClone(source),object=design.objects.find(o=>o.id===id);change(design,object);
    assert.throws(()=>validateDesign(config,design,{},resources.fonts,resources.motifs));
  }
});
test('fixed elements still accept colour and photo replacement and editable text survives a draft',()=>{
  const config=fixture(),source=config.profile.designs[0],objects=structuredClone(source.objects);
  const photo=objects.find(o=>o.id==='photo-main');
  Object.assign(photo,{uxUploadId:'test-original',uxUploadKind:'photo',uxPhotoBackground:'keep'});
  // K10: Farbwahl nur aus der UV-Profilpalette (Rot #c93232).
  objects.find(o=>o.id==='location-pin').color='#c93232';
  objects.find(o=>o.id==='heart').color='#c93232';
  objects.find(o=>o.id==='photo-frame').color='#c93232';
  objects.find(o=>o.id==='place').text='Am See';
  const saved=saveDraft(config,{designId:source.id,objects},{},resources.fonts,resources.motifs);
  const loaded=readDraft(config,saved,resources.fonts,resources.motifs);
  assert.equal(loaded.design.objects.find(o=>o.id==='photo-main').uxUploadId,'test-original');
  assert.equal(loaded.design.objects.find(o=>o.id==='place').text,'Am See');
  assert.equal(loaded.design.objects.find(o=>o.id==='heart').color,'#c93232');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from '../../workshop/test-fixtures/doorbell-config.mjs';
import {doorbellChoiceGroups,doorbellChoicePreview} from './doorbell-presentation.mjs';
import {customerRightsTemplate} from './customer-rights.mjs';
import {restoreElementRights,designElementRights} from './element-rights.mjs';
import {doorbellOptionState} from './doorbell-ui.mjs';
import {selectedDoorbellProfile} from './doorbell-selection.mjs';
import {quote} from './contract.mjs';
import {installProductDesignGallery} from './product-design-gallery.mjs';

function decoratedFixture(){
 const c=doorbellFixture();
 c.localResources={motifs:[]};
 for(const f of c.doorbell.formats){
  const motif='artwork-'+f.key;c.localResources.motifs.push({key:motif,embeddedOnly:true});
  f.profile.designs[0].objects=[
   {id:'name',type:'text',text:'Mustermann',font:'Montserrat',size:10,x:40,y:40,w:50,h:12,rotation:0,templateOrigin:true},
   {id:'line',type:'motif',motif,x:40,y:60,w:50,h:1,rotation:0,templateOrigin:true,customerEditable:false,uxDecoration:true}
  ];
 }
 c.profile.designs=structuredClone(c.doorbell.formats[0].profile.designs);return c;
}

test('picture groups retain all choices and put position immediately after format',()=>{
 const c=doorbellFixture(),before=structuredClone(c);
 for(const f of c.doorbell.formats){
  const groups=doorbellChoiceGroups(c,{format:f.key});
  assert.deepEqual(groups.map(g=>g.id),['format','position','frame','color','mounting']);
  assert.deepEqual(groups.map(g=>g.values.length),[3,2,4,2,5]);
  assert.deepEqual(groups[1].values.map(v=>v.label),f.profile.geometry.width>f.profile.geometry.height?['Klingel rechts','Klingel links']:['Klingel unten','Klingel oben']);
 }
 assert.deepEqual(c,before);
});
test('each format, frame, color and position has a different geometry-derived picture',()=>{
 const c=doorbellFixture(),before=structuredClone(c);
 for(const f of c.doorbell.formats){
  const options={format:f.key,frame:c.profile.optionGroups.find(g=>g.id==='frame').defaultValueId,color:'schwarz',mounting:'K00',position:'standard'};
  for(const g of doorbellChoiceGroups(c,options).filter(g=>g.id!=='mounting')){
   const pictures=g.values.map(v=>doorbellChoicePreview(c,options,g.id,v));
   assert.equal(new Set(pictures.map(s=>s.replace(/choice-[\w-]+/g,'choice'))).size,g.values.length,g.id);
   for(const svg of pictures){assert.match(svg,/<svg /);assert.doesNotMatch(svg,/rotate\(180/);}
  }
 }
 assert.deepEqual(c,before);
});
test('rights repair uses the selected format and position without reverting decorative artwork',()=>{
 const c=decoratedFixture();
 for(const f of c.doorbell.formats)for(const position of ['standard','opposite']){
  const options={format:f.key,position};const p=selectedDoorbellProfile(c,options),d=p.designs[0];
  const state={designId:d.id,mOptions:options,objects:structuredClone(d.objects)};
  const source=customerRightsTemplate(c,state),rights=designElementRights(c,d.id,source.objects);
  assert.deepEqual(source,d);
  assert.deepEqual(restoreElementRights(source.objects,state.objects,rights).objects,state.objects);
 }
});
test('format selection plus rights repair retains custom text and the correct price',()=>{
 const c=decoratedFixture(),start=selectedDoorbellProfile(c),d=start.designs[0];
 let state={designId:d.id,mOptions:{format:c.doorbell.defaultFormatKey},objects:structuredClone(d.objects)};
 const name=state.objects.find(o=>o.type==='text');name.text='Müller';
 for(const f of c.doorbell.formats){
  state=doorbellOptionState(c,state,{format:f.key});const source=customerRightsTemplate(c,state);
  const rights=designElementRights(c,state.designId,source.objects);
  state.objects=restoreElementRights(source.objects,state.objects,rights).objects;
  assert.equal(state.objects.find(o=>o.id===name.id).text,'Müller');
  assert.equal(quote(c,state.objects,state.designId,state.mOptions).unitCents,f.basePriceCents);
 }
});
test('doorbells use their complete local gallery instead of requesting repeated cross-product cards',async()=>{
 await installProductDesignGallery({config:doorbellFixture()}); // no parent API or DOM needed
});


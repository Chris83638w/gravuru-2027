import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from '../app/workshop/test-fixtures/doorbell-config.mjs';
import {prepareDoorbellDesignRepair} from './prepare-doorbell-design-repair.mjs';
import {selectedDoorbellProfile,doorbellLayoutIssue} from '../app/configurator/variant-m/doorbell-selection.mjs';
import {switchDoorbellDesign,validateDoorbellDefinition} from '../app/configurator/variant-m/doorbell-selection.mjs';
import {restoreElementRights,designElementRights,templateRightsIssue} from '../app/configurator/variant-m/element-rights.mjs';
test('all source motifs and fonts survive format adaptation with one uniform scale',()=>{
 const c=doorbellFixture();
 for(const f of c.doorbell.formats)f.profile.designs[0].objects=[
  {id:'name',type:'text',text:'Müller',font:'Montserrat',size:10,x:80,y:35,w:50,h:12,rotation:0,templateOrigin:true},
  {id:'motif',type:'motif',motif:f.key==='16x28'?'original-circle':'wrong-line',x:80,y:65,w:30,h:30,rotation:0,templateOrigin:true,uxDecoration:true,customerEditable:false}
 ];
 c.profile.designs=structuredClone(c.doorbell.formats[0].profile.designs);const before=structuredClone(c);
 const {input:repaired,mappings}=prepareDoorbellDesignRepair(c);
 assert.deepEqual(c,before);
 assert.deepEqual(repaired.doorbell.formats[0].profile.designs[0].objects.map(({customerEditable,...o})=>o),c.doorbell.formats[0].profile.designs[0].objects.map(({customerEditable,...o})=>o));
 for(const [index,f] of repaired.doorbell.formats.entries()){
  assert.deepEqual(f.profile.geometry,c.doorbell.formats[index].profile.geometry);
  assert.deepEqual(f.profile.frames,c.doorbell.formats[index].profile.frames);
  assert.equal(f.basePriceCents,c.doorbell.formats[index].basePriceCents);
  const d=f.profile.designs[0],motif=d.objects.find(o=>o.id==='motif'),name=d.objects.find(o=>o.id==='name');
  assert.equal(motif.motif,'original-circle');assert.equal(motif.w,motif.h);assert.equal(name.font,'Montserrat');assert.equal(name.text,'Müller');
  if(index)for(const position of ['standard','opposite']){
   const p=selectedDoorbellProfile(repaired,{format:f.key,position});for(const o of p.designs[0].objects)assert.equal(doorbellLayoutIssue(o,p),'');
  }
 }
 assert.ok(mappings.every(m=>m.mode==='Referenz'&&m.freigabe===null));
});

test('editable native decorations can move/delete and stay deleted after every format/position switch',()=>{
 const c=doorbellFixture();c.workshopElementRights={};
 for(const f of c.doorbell.formats)for(const d of f.profile.designs){
  Object.assign(d.objects.find(o=>o.id==='mark-0'),{x:60,y:70,w:30,h:1});
  c.workshopElementRights[d.id]={'mark-0':{content:false,color:false,replace:false,move:false,scale:false,delete:false}};
 }
 c.profile.designs=structuredClone(c.doorbell.formats[0].profile.designs);
 const {input:r}=prepareDoorbellDesignRepair(c);validateDoorbellDefinition(r);
 for(const f of r.doorbell.formats)for(const position of ['standard','opposite']){
  const options={format:f.key,position},d=selectedDoorbellProfile(r,options).designs[0],rights=designElementRights(r,d.id,d.objects);
  assert.equal(rights['mark-0'].move,true);assert.equal(rights['mark-0'].delete,true);
  const moved=structuredClone(d.objects);moved.find(o=>o.id==='mark-0').x+=1;
  assert.deepEqual(restoreElementRights(d.objects,moved,rights).blockedIds,[]);
  assert.equal(templateRightsIssue(r,d,d,moved),null);
  const deleted={...d,objects:d.objects.filter(o=>o.id!=='mark-0')};
  assert.equal(templateRightsIssue(r,d,d,deleted.objects),null);
  for(const target of r.doorbell.formats)for(const targetPosition of ['standard','opposite']){
   const switched=switchDoorbellDesign(r,deleted,options,{format:target.key,position:targetPosition});
   assert.ok(!switched.objects.some(o=>o.id==='mark-0'));
  }
 }
});


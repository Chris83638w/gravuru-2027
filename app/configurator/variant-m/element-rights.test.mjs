import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditElement,restoreElementRights,rightForProperty} from './element-rights.mjs';
import fs from 'node:fs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {makeProductDocument,validateProductDesign} from '../../workshop/product-model.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
const text={id:'name',type:'text',fieldKey:'name',text:'Anna',font:'Source',bold:false,size:8,w:40,h:10,x:60,y:150,rotation:0,color:'#112233',customerEditable:true};
const photo={id:'photo',type:'photoSlot',fieldKey:'photo',w:100,h:90,x:75,y:60,rotation:0,acrylicFixed:true};
const none={content:false,color:false,replace:false,move:false,scale:false,delete:false};

test('independent content/color rights preserve permitted changes but restore font size and position',()=>{
  const current={...text,text:'Daria',font:'Other',bold:true,w:48,color:'#abcdef',x:3,size:24};
  const result=restoreElementRights([text],[current],{name:{...none,content:true,color:true}});
  assert.deepEqual(result.blockedIds,['name']);
  assert.deepEqual(result.objects[0],{...text,text:'Daria',font:'Other',bold:true,w:48,color:'#abcdef'});
  assert.equal(current.x,3);assert.equal(text.text,'Anna');
});
test('move and scale remain usable when content/color are locked',()=>{
  const result=restoreElementRights([text],[{...text,text:'Forbidden',font:'Other',color:'#abcdef',size:12,w:60,h:15,x:80,y:155,rotation:45}],{name:{...none,move:true,scale:true}});
  assert.deepEqual(result.objects[0],{...text,size:12,w:60,h:15,x:80,y:155,rotation:45});
});
test('fixed photo permits replacement without allowing geometry/identity changes',()=>{
  const changed={...photo,uxUploadId:'upload',uxUploadKind:'photo',uxPhotoBackground:'keep',x:0,w:1,fieldKey:'changed',acrylicFixed:false};
  assert.deepEqual(restoreElementRights([photo],[changed],{photo:{...none,replace:true}}).objects,[{...photo,uxUploadId:'upload',uxUploadKind:'photo',uxPhotoBackground:'keep'}]);
  assert.deepEqual(restoreElementRights([photo],[changed],{photo:none}).objects,[photo]);
});
test('forbidden deletion/hiding/transparency restores previous allowed edits and prevents duplicate ids',()=>{
  const accepted={...text,text:'Accepted',color:'#abcdef',opacity:.5};
  const rights={name:{...none,content:true,color:true}};
  assert.deepEqual(restoreElementRights([text],[],rights,[accepted]).objects,[accepted]);
  const result=restoreElementRights([text],[{...accepted,uxHidden:true,opacity:0},{...accepted}],rights,[accepted]);
  assert.deepEqual(result.objects,[accepted]);
  assert.deepEqual(restoreElementRights([text],[],{name:{...none,delete:true}},[accepted]).objects,[]);
});
test('rights follow current design and unknown/missing permissions fail closed for source elements',()=>{
  const config={profile:{designs:[{id:'first',objects:[text]},{id:'second',objects:[text]}]},workshopElementRights:{first:{name:{...none,content:true}},second:{name:{...none,color:true}}}};
  assert.equal(canEditElement(config,'first',text,'content'),true);
  assert.equal(canEditElement(config,'second',text,'content'),false);
  assert.equal(canEditElement(config,'second',text,'color'),true);
  assert.equal(canEditElement({...config,workshopElementRights:{}},'first',text,'move'),false);
  assert.equal(canEditElement(config,'first',{id:'customer-new'},'move'),true);
  assert.equal(canEditElement({...config,workbench:{embedded:true}},'first',text,'move'),true);
  assert.equal(rightForProperty('size'),'scale');assert.equal(rightForProperty('font'),'content');
});

test('client repair agrees with server validation for the real acrylic design',()=>{
  const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const object of config.profile.designs[0].objects.filter(object=>object.type==='text')){
    measureText(object,resources.fonts);if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}
  }
  const document=makeProductDocument(config),source=document.config.profile.designs[0],rights=document.elementRights[source.id];
  Object.assign(rights.names,{content:false,move:false,scale:false,delete:false,color:true});
  rights['photo-main'].replace=false;
  const changed=structuredClone(source);
  Object.assign(changed.objects.find(object=>object.id==='names'),{text:'Wrong',x:0,size:30,color:'#abcdef'});
  changed.objects.find(object=>object.id==='photo-main').uxUploadId='forbidden-upload';
  assert.throws(()=>validateProductDesign(document,changed));
  const repaired=restoreElementRights(source.objects,changed.objects,rights);
  const validated=validateProductDesign(document,{...source,objects:repaired.objects});
  assert.equal(validated.objects.find(object=>object.id==='names').color,'#abcdef');
  assert.equal(validated.objects.find(object=>object.id==='photo-main').uxUploadId,undefined);
});

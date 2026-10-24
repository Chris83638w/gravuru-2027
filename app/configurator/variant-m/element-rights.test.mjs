import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditElement,restoreElementRights,rightForProperty,templateRightsIssue,legacyElementRights,customerAdditionPolicy,validateCustomerAdditions} from './element-rights.mjs';
import fs from 'node:fs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {makeProductDocument,validateProductDesign} from '../../workshop/product-model.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
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

test('template layer order is restored and added elements always end up above the template',()=>{
  const motif={id:'leaf',type:'motif',motif:'branch',x:20,y:20,w:10,h:10,rotation:0,color:'#000000',customerEditable:true};
  const own={id:'own',type:'text',text:'Eigen',font:'Source',size:6,w:20,h:8,x:50,y:50,rotation:0,color:'#000000',customerEditable:true,templateOrigin:false};
  const full={name:{...none,move:true},leaf:{...none,move:true}};
  const reordered=restoreElementRights([text,motif],[motif,text],full);
  assert.deepEqual(reordered.objects,[text,motif]);assert.deepEqual(reordered.blockedIds.sort(),['leaf','name']);
  const below=restoreElementRights([text,motif],[own,text,motif],full);
  assert.deepEqual(below.objects,[text,motif,own]);assert.deepEqual(below.blockedIds.sort(),['leaf','name','own']);
  assert.deepEqual(restoreElementRights([text,motif],[text,motif,own],full).blockedIds,[]);
  assert.deepEqual(restoreElementRights([text,motif],[motif,own],{name:{...none,delete:true},leaf:none}).objects,[motif,own]);
  assert.equal(canEditElement({profile:{designs:[{id:'d',objects:[text]}]}},'d',text,'order'),false);
  assert.equal(canEditElement({profile:{designs:[{id:'d',objects:[text]}]}},'d',own,'order'),true);
  assert.equal(canEditElement({profile:{designs:[{id:'d',objects:[text]}]},workbench:{embedded:true}},'d',text,'order'),true);
});

test('server gate: forbidden deletion, change, addition and reorder are rejected with German messages; permitted versions pass',()=>{
  const design={id:'d',objects:[text,photo],marks:[]};
  const config=rights=>({profile:{designs:[design]},workshopElementRights:{d:rights}});
  const own={id:'own',type:'text',text:'Eigen',font:'Source',size:6,w:20,h:8,x:50,y:50,rotation:0,color:'#000000',customerEditable:true,templateOrigin:false};
  const strict=config({name:none,photo:none}),open=config({name:{...none,content:true,color:true,move:true,scale:true,delete:true},photo:{...none,replace:true,delete:true}});
  const issue=(c,objects)=>templateRightsIssue(c,design,design,objects);
  // (a) delete / hide
  assert.match(issue(strict,[photo]),/„name“ darf nicht entfernt oder ausgeblendet/);
  assert.match(issue(strict,[{...text,uxHidden:true},photo]),/nicht entfernt oder ausgeblendet/);
  assert.match(issue(strict,[{...text,opacity:0},photo]),/nicht entfernt oder ausgeblendet/);
  assert.equal(issue(open,[photo]),null);assert.equal(issue(open,[{...text,uxHidden:true},photo]),null);
  // (b) change without right; structural never
  assert.match(issue(strict,[{...text,text:'Daria'},photo]),/„name“ darf nicht verändert werden \(Recht content fehlt\)/);
  assert.match(issue(strict,[{...text,x:1},photo]),/Recht move fehlt/);
  assert.match(issue(strict,[text,{...photo,uxUploadId:'u',uxUploadKind:'photo'}]),/„photo“ darf nicht verändert werden \(Recht replace fehlt\)/);
  assert.match(issue(open,[{...text,fieldKey:'other'},photo]),/Vorlageneigenschaften nicht ändern/);
  assert.match(issue(open,[text,{...photo,acrylicFixed:false}]),/Vorlageneigenschaften nicht ändern/);
  assert.equal(issue(open,[{...text,text:'Daria',w:70,h:12,x:1,color:'#abcdef'},{...photo,uxUploadId:'u',uxUploadKind:'photo'}]),null);
  // text width/height follow permitted content, size does not
  const contentOnly=config({name:{...none,content:true},photo:none});
  assert.equal(issue(contentOnly,[{...text,text:'Daria',w:70,h:12},photo]),null);
  assert.match(issue(contentOnly,[{...text,text:'Daria',size:12},photo]),/Recht scale fehlt/);
  // (c) additions
  assert.equal(issue(strict,[text,photo,own]),null);
  assert.match(issue({...strict,customerAdditions:{text:false,motifs:true,maxElements:5}},[text,photo,own]),/Eigener Text ist bei diesem Produkt nicht vorgesehen/);
  assert.match(issue({...strict,customerAdditions:{text:true,motifs:false,maxElements:5}},[text,photo,{...own,id:'m',type:'motif',motif:'branch'}]),/Eigene Motive sind bei diesem Produkt nicht vorgesehen/);
  assert.match(issue({...strict,customerAdditions:{text:true,motifs:true,maxElements:1}},[text,photo,own,{...own,id:'own2'}]),/höchstens 1 zusätzliche Elemente/);
  assert.equal(issue({...strict,customerAdditions:{text:true,motifs:true,maxElements:1}},[text,photo,own]),null);
  assert.match(issue(open,[text,photo,{...photo,id:'photo2',fieldKey:'photo-2'}]),/nicht zum freien Hinzufügen/);
  assert.equal(issue(strict,[text,photo,{id:'logo',type:'image',uxUploadKind:'logo',uxUploadId:'l',x:1,y:1,w:5,h:5,rotation:0}]),null);
  // (d) order
  assert.match(issue(open,[photo,text]),/Ebenenreihenfolge der Vorlagenelemente/);
  assert.match(issue(open,[text,own,photo]),/oberhalb der Vorlagenelemente/);
  assert.match(issue(open,[own,text,photo]),/oberhalb der Vorlagenelemente/);
  assert.equal(issue(open,[text,photo,own,{...own,id:'own2'}]),null);
  // legacy flags without a rights document
  const legacy={profile:{designs:[design]}};
  assert.equal(issue(legacy,[{...text,text:'Daria',x:1},photo]),null);
  assert.match(issue(legacy,[text,{...photo,x:1}]),/Recht move fehlt/);
  assert.match(issue(legacy,[text]),/nicht entfernt/);
  const fixed={...design,objects:[{...text,customerEditable:false},photo]};
  assert.match(templateRightsIssue({profile:{designs:[fixed]}},fixed,fixed,[{...text,customerEditable:false,text:'Daria'},photo]),/Recht content fehlt/);
  assert.deepEqual(legacyElementRights(text),{content:true,color:true,replace:false,move:true,scale:true,delete:true});
  assert.deepEqual(legacyElementRights(photo),{content:false,color:false,replace:true,move:false,scale:false,delete:false});
  assert.deepEqual(customerAdditionPolicy({}),{text:true,motifs:true,maxElements:19});
  for(const bad of [null,{text:true},{text:'yes',motifs:true,maxElements:1},{text:true,motifs:true,maxElements:20},{text:true,motifs:true,maxElements:1,extra:1}])assert.throws(()=>validateCustomerAdditions({customerAdditions:bad}),/Kundenfreigaben/);
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
  Object.assign(changed.objects.find(object=>object.id==='names'),{text:'Wrong',x:0,size:30,color:'#c93232'}); // K10: Farbe aus der UV-Profilpalette
  changed.objects.find(object=>object.id==='photo-main').uxUploadId='forbidden-upload';
  assert.throws(()=>validateProductDesign(document,changed));
  const repaired=restoreElementRights(source.objects,changed.objects,rights);
  const validated=validateProductDesign(document,{...source,objects:repaired.objects});
  assert.equal(validated.objects.find(object=>object.id==='names').color,'#c93232');
  assert.equal(validated.objects.find(object=>object.id==='photo-main').uxUploadId,undefined);
});

test('template alignment and line spacing cannot bypass customer rights',()=>{
  const original={...text,text:'Alpha\nBeta',textAnchor:'middle',lineHeight:9.6};
  const source={id:'d',objects:[original]};
  for(const permission of [none,Object.fromEntries(Object.keys(none).map(key=>[key,true]))]){
    const config={profile:{designs:[source]},workshopElementRights:{d:{name:permission}}};
    for(const change of [{textAnchor:'start'},{lineHeight:30},{textAnchor:undefined},{lineHeight:undefined}]){
      const changed={...original,...change};
      assert.match(templateRightsIssue(config,source,source,[changed]),/Vorlageneigenschaften nicht ändern/);
      const repaired=restoreElementRights([original],[changed],{name:permission});
      assert.deepEqual(repaired.objects,[original]);
      assert.deepEqual(repaired.blockedIds,['name']);
      assert.equal(templateRightsIssue(config,source,source,repaired.objects),null);
    }
  }
  for(const change of [{textAnchor:'start'},{lineHeight:30}]){
    const legacySource={id:'legacy',objects:[text]};
    const config={profile:{designs:[legacySource]}};
    assert.match(templateRightsIssue(config,legacySource,legacySource,[{...text,...change}]),/Vorlageneigenschaften nicht ändern/);
    assert.deepEqual(restoreElementRights([text],[{...text,...change}],{name:Object.fromEntries(Object.keys(none).map(key=>[key,true]))}).objects,[text]);
  }
});

test('scale permission keeps source line spacing proportional without granting independent leading changes',()=>{
 const original={...text,text:'Alpha\nBeta',size:5.29,lineHeight:6.81},source={id:'d',objects:[original]},rights={name:{...none,scale:true}},config={profile:{designs:[source]},workshopElementRights:{d:rights}};
 const scaled={...original};for(const size of [8.13,3.71,7.03])setTextSize(scaled,size);
 assert.ok(Math.abs(scaled.lineHeight-original.lineHeight*scaled.size/original.size)<1e-12);
 assert.equal(templateRightsIssue(config,source,source,[scaled]),null);
 assert.deepEqual(restoreElementRights([original],[scaled],rights).objects,[scaled]);
 assert.deepEqual(restoreElementRights([original],[scaled],rights).blockedIds,[]);
 for(const lineHeight of [original.lineHeight,scaled.lineHeight+0.01,undefined,NaN]){
  const forged={...scaled,lineHeight};assert.match(templateRightsIssue(config,source,source,[forged]),/Vorlageneigenschaften nicht ändern/);
  const repaired=restoreElementRights([original],[forged],rights);assert.equal(repaired.objects[0].lineHeight,original.lineHeight*(scaled.size/original.size));assert.equal(templateRightsIssue(config,source,source,repaired.objects),null);
 }
 const fixed={...config,workshopElementRights:{d:{name:none}}};assert.ok(templateRightsIssue(fixed,source,source,[scaled]));assert.deepEqual(restoreElementRights([original],[scaled],{name:none}).objects,[original]);
});

test('photo colour is an explicit replacement right without granting other geometry changes',()=>{
 const changed={...photo,uxUploadId:'upload',uxUploadKind:'photo',uxPhotoColor:'original',x:2};
 assert.equal(rightForProperty('uxPhotoColor'),'replace');
 assert.deepEqual(restoreElementRights([photo],[changed],{photo:{...none,replace:true}}).objects,[{...photo,uxUploadId:'upload',uxUploadKind:'photo',uxPhotoColor:'original'}]);
 assert.deepEqual(restoreElementRights([photo],[changed],{photo:none}).objects,[photo]);
});

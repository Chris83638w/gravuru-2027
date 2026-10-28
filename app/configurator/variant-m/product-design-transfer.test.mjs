import test from 'node:test';
import assert from 'node:assert/strict';
import {captureProductTexts,transferProductTexts} from './product-design-transfer.mjs';
const text=(id,fieldKey,value,extra={})=>({id,type:'text',fieldKey,text:value,font:'target-font',size:5,x:40,y:20,w:20,h:5,...extra});
const setup=objects=>({design:{id:'target',objects:structuredClone(objects)},objects:structuredClone(objects),config:{profile:{themeId:'namensschilder'}}});

test('product transfer captures only actual edited text, never artwork, media, geometry or sample text',()=>{
 const design={objects:[text('name','name','Mustername'),text('date','daten','2000'),text('saying','spruch','Musterspruch')]};
 const objects=structuredClone(design.objects);objects[0].text='Anna & Ben';objects[2].text='Unser eigener Spruch';objects.push({id:'photo',type:'photoSlot',uxUploadId:'private-photo'},text('hidden','other','Secret',{uxHidden:true}));
 assert.deepEqual(captureProductTexts(objects,design),[{fieldKey:'name',text:'Anna & Ben'},{fieldKey:'spruch',text:'Unser eigener Spruch'}]);
});
test('matching field gets complete text while target geometry, font and rights remain unchanged',()=>{
 const f=setup([text('new-name','name','Zielvorlage'),text('slogan','spruch','Designspruch')]),before=structuredClone(f.objects);
 const result=transferProductTexts([{fieldKey:'name',text:'Anna & Ben'}],f.objects,f.design,f.config);
 assert.deepEqual(result,{transferred:['name'],remaining:[]});assert.deepEqual(f.objects[0],{...before[0],text:'Anna & Ben',uxCustomerText:true});assert.deepEqual(f.objects[1],before[1]);
});
test('ambiguous keys, missing fields, locked targets and explicit rights do not silently receive text',()=>{
 for(const objects of [[text('a','name','A'),text('b','name','B')],[text('a','name','A',{locked:true})],[text('a','other','A')]]){
  const f=setup(objects),before=structuredClone(f.objects),result=transferProductTexts([{fieldKey:'name',text:'Kundentext'}],f.objects,f.design,f.config);assert.equal(result.remaining.length,1);assert.deepEqual(f.objects,before);
 }
 const f=setup([text('a','name','A')]);f.config.workshopElementRights={target:{a:{content:false}}};assert.equal(transferProductTexts([{fieldKey:'name',text:'Kundentext'}],f.objects,f.design,f.config).remaining.length,1);
 delete f.config.workshopElementRights;assert.equal(transferProductTexts([{fieldKey:'name',text:'Eins'},{fieldKey:'name',text:'Zwei'}],f.objects,f.design,f.config).remaining.length,2);
});
test('text limits fail visibly without truncation; original text and source remain intact',()=>{
 const f=setup([text('a','name','ABC',{maxLength:5,maxLines:1})]),source=[{fieldKey:'name',text:'Anna und Ben'}],before=structuredClone(source);
 const result=transferProductTexts(source,f.objects,f.design,f.config);assert.equal(result.transferred.length,0);assert.equal(result.remaining[0].text,'Anna und Ben');assert.match(result.remaining[0].reason,/höchstens 5/);assert.deepEqual(source,before);assert.equal(f.objects[0].text,'ABC');
});

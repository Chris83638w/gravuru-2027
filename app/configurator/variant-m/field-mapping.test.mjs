import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPersonalObjects,carryPersonalObjects} from './field-mapping.mjs';

const slot=(id,fieldKey,extra={})=>({id,type:'photoSlot',fieldKey,x:25,y:30,w:40,h:35,rotation:0,photoShape:'rect',...extra});
test('new semantic photo field never consumes an unrelated upload or a floating copy',()=>{
  const previous=[slot('old','wedding-photo',{uxUploadId:'original',uxUploadKind:'photo'})];
  const next=[slot('new','baby-photo')],before=structuredClone({previous,next});
  const result=mapPersonalObjects(previous,next);
  assert.deepEqual(result.objects,next);
  assert.deepEqual(result.unmappedUploads,[{objectId:'old',fieldKey:'wedding-photo',uploadId:'original',reason:'unmatched-field-key'}]);
  assert.deepEqual({previous,next},before);
});
test('same unique semantic field carries file treatment into the new template geometry',()=>{
  const previous=[slot('old','portrait',{uxUploadId:'original',uxUploadKind:'photo',uxPhotoBackground:'keep',uxHidden:true,x:100,y:200})];
  const next=[slot('new','portrait',{photoShape:'ellipse',rotation:10,acrylicFixed:true})];
  const result=mapPersonalObjects(previous,next),photo=result.objects[0];
  assert.deepEqual(result.unmappedUploads,[]);
  assert.deepEqual(photo,{...next[0],uxUploadId:'original',uxUploadKind:'photo',uxPhotoBackground:'keep',uxHidden:true});
  assert.notEqual(photo,next[0]);
});
test('missing and ambiguous keys never auto-assign photos, including an empty duplicate source',()=>{
  const source=slot('old','portrait',{uxUploadId:'original'});
  for(const [previous,next,reason] of [
    [[{...source,fieldKey:undefined}],[slot('new',undefined)],'missing-field-key'],
    [[source,slot('empty','portrait')],[slot('new','portrait')],'ambiguous-field-key'],
    [[source],[slot('new','portrait'),slot('duplicate','portrait')],'ambiguous-field-key']
  ]){
    const result=mapPersonalObjects(previous,next);
    assert.deepEqual(result.objects,next);
    assert.equal(result.unmappedUploads[0].reason,reason);
  }
});
test('an occupied or read-only target is preserved and reported for reassignment',()=>{
  const previous=[slot('old','portrait',{uxUploadId:'original'})];
  for(const [extra,reason] of [[{uxUploadId:'other'},'occupied-field'],[{customerEditable:false},'read-only-field'],[{technicalLocked:true},'read-only-field']]){
    const next=[slot('new','portrait',extra)],result=mapPersonalObjects(previous,next);
    assert.deepEqual(result.objects,next);assert.equal(result.unmappedUploads[0].reason,reason);
  }
});
test('one source photo may serve multiple explicit semantic fields without accidental deduplication',()=>{
  const previous=[slot('one','first',{uxUploadId:'original'}),slot('two','second',{uxUploadId:'original'})];
  const result=mapPersonalObjects(previous,[slot('new-first','first'),slot('new-second','second')]);
  assert.deepEqual(result.objects.map(o=>o.uxUploadId),['original','original']);
  assert.deepEqual(result.unmappedUploads,[]);
});
test('explicitly personal elements survive without converting unmatched template photos',()=>{
  const previous=[slot('free','portrait',{uxUploadId:'personal',uxPersonal:true}),{id:'label',type:'text',text:'Mein Text',uxPersonal:true}];
  const next=[slot('template','portrait'),slot('collision','photo-free')];
  const result=carryPersonalObjects(previous,next);
  assert.equal(result.length,4);
  assert.equal(result.find(o=>o.id==='free').fieldKey,'photo-free-1');
  assert.equal(result.find(o=>o.id==='label').text,'Mein Text');
  assert.equal(result[0].uxUploadId,undefined);
  assert.deepEqual(carryPersonalObjects(previous,result),result);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNativeReview,NATIVE_INPUT_KEYS} from './native-review-adapter.mjs';
import {customerDraft} from './legacy-source/configurator/variant-m/ux-model.mjs';

// Deliberately synthetic fixture: no real customer, production design, product
// UUID, font outline, media or approved geometry is copied into this test.
const ID='cfg_11111111-1111-4111-8111-111111111111';
const OTHER='cfg_22222222-2222-4222-8222-222222222222';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0E8AAAAASUVORK5CYII=';
const EDITED_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const bytes=Buffer.from(PNG,'base64');
const copy=value=>structuredClone(value);
function fixture() {
  const objects=[{id:'name',type:'text',text:'Test ÄÖÜ',font:'fixture-font',size:8,x:110,y:25,color:'#eee',customerEditable:true},
    {id:'motif',type:'motif',motif:'fixture-heart',x:30,y:80,w:10,h:10,color:'#eee'}];
  const p={id:ID,revision:ID+':5',kind:'universal-product',binding:{kind:'local-review',productId:ID},
    material:{kind:'slate'},processing:{profileId:'slate-engraving'},geometry:{shape:'rect',width:220,height:140,holes:[]},
    optionGroups:[{id:'mounting',defaultValueId:'K00',values:[{id:'K00',holes:[]},{id:'B02',holes:[{x:10,y:70,diameter:4},{x:210,y:70,diameter:4}]}]}],
    designs:[{id:'synthetic-design',objects:copy(objects),marks:[]}]};
  const model={key:'acryl',configuration:{id:ID,revision:5,publishedRevision:null},universal:{profile:p,photo:{enabled:true,includedCount:0,extraPriceCents:999}}};
  const state={designId:'synthetic-design',width:220,height:140,objects,mOptions:{mounting:'B02'},selected:'name',showHero:false};
  return {model,draft:customerDraft(state,p),quantity:2,files:new Map(),preview:PNG};
}
function withPhoto({edited=false,hidden=false}={}) {
  const f=fixture(),o={id:'photo',type:'photoSlot',x:110,y:80,w:30,h:30,rotation:0,photoShape:'circle',required:true,
    uxUploadId:'synthetic-upload',uxUploadKind:'photo',uxPhotoBackground:'keep',...(hidden?{uxHidden:true}:{})};
  f.model.universal.profile.designs[0].objects.push({...o});f.draft.state.objects.push({...o});
  const asset={file:new Blob([bytes],{type:'image/png'}),url:'blob:original'};
  if(edited)Object.assign(asset,{blob:new Blob([Buffer.from(EDITED_PNG,'base64')],{type:'image/png'}),edited:true,url:'blob:edited',originalUrl:'blob:original',editSourceUrl:'blob:original',
    photoEdit:{angle:90,flip:-1,zoom:1.5,x:.1,y:-.2,shape:'square',color:'sepia'},width:1,height:1});
  f.files.set(o.uxUploadId,asset);return f;
}
const rejects=(f,code)=>assert.rejects(()=>prepareNativeReview(f),e=>e.code===code);

test('September customerDraft is translated without scaling, repricing or rewriting objects',async()=>{
  const f=fixture(),before=copy({model:f.model,draft:f.draft});
  const result=await prepareNativeReview(f);
  assert.deepEqual(Object.keys(result.input).sort(),[...NATIVE_INPUT_KEYS].sort());
  assert.equal(result.input.productId,ID);assert.equal(result.input.productRevision,5);
  assert.deepEqual(result.input.objects,f.draft.state.objects);assert.deepEqual(result.input.options,{mounting:'B02'});
  assert.equal(result.input.quantity,2);assert.deepEqual(result.body,{input:result.input});
  assert.equal('geometry' in result.input,false);assert.equal('price' in result.input,false);
  assert.deepEqual({model:f.model,draft:f.draft},before);
  assert.equal(result.gates.nativeSendAllowed,true);assert.equal(result.gates.serverValidationRequired,true);
  assert.equal(result.gates.requiresAuthenticatedTestTransport,true);assert.equal(result.gates.checkoutAllowed,false);assert.equal(result.gates.productionAllowed,false);
});
test('native profile/UUID/revision must agree: no historical or other-product reinterpretation',async()=>{
  for(const mutate of [f=>f.draft.productId=OTHER,f=>f.draft.profileRevision=ID+':4',f=>f.model.configuration.revision=6,
    f=>f.model.universal.profile.binding.productId=OTHER,f=>f.model.configuration.id='local-slate']) {
    const f=fixture();mutate(f);await assert.rejects(()=>prepareNativeReview(f),/Produkt|Profil|cfg_/);
  }
});
test('300×200 cannot be imported into the 220×140 fixture and model geometry stays unchanged',async()=>{
  const f=fixture();f.draft.state.width=300;f.draft.state.height=200;
  await rejects(f,'draft_geometry');assert.equal(f.model.universal.profile.geometry.width,220);
});
test('AOSU, steel, demos and unsupported extra surfaces are rejected',async()=>{
  for(const mutate of [f=>f.model.universal.doorbell={},f=>f.model.universal.profile.material.kind='steel',
    f=>f.model.universal.demo=true,f=>f.model.universal.profile.surfaces=[{id:'front'},{id:'back'}]]) {
    const f=fixture();mutate(f);await assert.rejects(()=>prepareNativeReview(f),e=>['unsupported_product','unsupported_features'].includes(e.code));
  }
});
test('foreign designs and option groups are rejected; defaults come only from the loaded product',async()=>{
  const a=fixture();a.draft.state.designId='other-design';await rejects(a,'design_binding');
  const b=fixture();b.draft.state.mOptions={frame:'full'};await rejects(b,'options');
  const c=fixture();c.draft.state.mOptions={mounting:'wrong'};await rejects(c,'options');
  const d=fixture();d.draft.state.mOptions={};assert.deepEqual((await prepareNativeReview(d)).input.options,{mounting:'K00'});
});
test('universal v1 draft preserves content and rejects changed fixed marks',async()=>{
  const f=fixture();f.draft={schema:'gravuru-universal-customer-draft/v1',profileId:ID,profileRevision:ID+':5',productId:ID,
    design:{...copy(f.model.universal.profile.designs[0]),objects:copy(f.draft.state.objects)},options:{mounting:'K00'}};
  assert.deepEqual((await prepareNativeReview(f)).input.objects,f.draft.design.objects);
  f.draft.design.marks=[{path:'M0 0L10 10'}];await rejects(f,'fixed_marks');
});
test('objects are never silently filtered, rounded or dropped',async()=>{
  const f=fixture();f.draft.state.objects[0].x=12.3456;assert.equal((await prepareNativeReview(f)).input.objects[0].x,12.3456);
  f.draft.state.objects[0].futureUnknown='would-be-lost';await rejects(f,'object_contract');
  const b=fixture();b.draft.state.objects.push(copy(b.draft.state.objects[0]));await rejects(b,'objects');
});
test('required photo, original and explicit background instructions cannot be missing',async()=>{
  const a=withPhoto();a.files.clear();await rejects(a,'missing_original');
  const b=withPhoto();delete b.draft.state.objects.at(-1).uxPhotoBackground;await rejects(b,'photo_background');
  const c=withPhoto();delete c.draft.state.objects.at(-1).uxUploadId;delete c.draft.state.objects.at(-1).uxPhotoBackground;await rejects(c,'required_photo');
});
test('original and edited bytes plus keep/remove survive; photoEdit stays separate with a send blocker',async()=>{
  const f=withPhoto({edited:true}),result=await prepareNativeReview(f);
  assert.deepEqual(result.input.media,[{id:'synthetic-upload',original:PNG,edited:EDITED_PNG}]);
  assert.equal(result.input.objects.at(-1).uxPhotoBackground,'keep');
  assert.deepEqual(result.reopening.media[0].photoEdit,f.files.get('synthetic-upload').photoEdit);
  assert.equal(result.reopening.media[0].editSource,'original');assert.equal(result.reopening.media[0].width,1);
  assert.equal('photoEdit' in result.input.media[0],false);assert.equal('reopening' in result.body,false);
  assert.equal(result.gates.reopeningPersistenceComplete,false);assert.equal(result.gates.nativeSendAllowed,false);
  assert.ok(result.gates.blockers.some(b=>b.code==='photo_edit_not_persisted'));
  f.draft.state.objects.at(-1).uxPhotoBackground='remove';assert.equal((await prepareNativeReview(f)).input.objects.at(-1).uxPhotoBackground,'remove');
});
test('hidden photo is retained in reopening but not illegally added to native media',async()=>{
  const f=withPhoto({hidden:true}),result=await prepareNativeReview(f);
  assert.deepEqual(result.input.media,[]);assert.equal(result.input.objects.at(-1).uxHidden,true);
  assert.equal(result.reopening.media[0].original,PNG);assert.ok(result.gates.blockers.some(b=>b.code==='hidden_photo_not_persisted'));
});
test('duplicate uses of one image produce one native media entry and retain object references',async()=>{
  const f=withPhoto();f.draft.state.objects.push({...copy(f.draft.state.objects.at(-1)),id:'photo-copy',x:160});
  const result=await prepareNativeReview(f);assert.equal(result.input.media.length,1);
  assert.deepEqual(result.reopening.media[0].objectIds,['photo','photo-copy']);
});
test('missing edited bytes, missing parameters and ambiguous source cannot claim complete reopening',async()=>{
  const a=withPhoto({edited:true});delete a.files.get('synthetic-upload').blob;await rejects(a,'missing_edited');
  const b=withPhoto({edited:true});delete b.files.get('synthetic-upload').photoEdit;
  assert.ok((await prepareNativeReview(b)).gates.blockers.some(x=>x.code==='photo_edit_metadata_missing'));
  const c=withPhoto({edited:true});c.files.get('synthetic-upload').editSourceUrl='blob:lost-source';
  const result=await prepareNativeReview(c);assert.ok(result.gates.blockers.some(x=>x.code==='photo_edit_source_unresolved'));
  assert.equal(JSON.stringify(result).includes('blob:'),false);
});
test('inert inherited AOSU shell state is kept outside the native contract, never used as mounting',async()=>{
  const f=fixture();Object.assign(f.draft.state,{fkMounting:'B04S',fkFrame:'full',fkColor:'anthrazit'});
  const result=await prepareNativeReview(f);assert.equal(result.input.options.mounting,'B02');
  assert.equal(result.reopening.editorOnly.fkMounting,'B04S');assert.equal('fkMounting' in result.input,false);
});
test('a native mask or layer role lost by the old serializer blocks sending and stays recoverable',async()=>{
  const f=withPhoto();Object.assign(f.model.universal.profile.designs[0].objects.at(-1),{photoMaskAssetId:'synthetic-mask',role:'artwork'});
  const result=await prepareNativeReview(f);
  assert.equal(result.gates.nativeSendAllowed,false);
  assert.ok(result.gates.blockers.some(b=>b.code==='native_template_fields_missing'));
  assert.deepEqual(result.reopening.templateFields,[{objectId:'photo',fields:{photoMaskAssetId:'synthetic-mask',role:'artwork'}}]);
  assert.equal('photoMaskAssetId' in result.input.objects.at(-1),false);
});
test('quantity and preview contracts reject invalid values, URLs and excessive encoded preview',async()=>{
  for(const quantity of [0,100,1.5])await rejects({...fixture(),quantity},'quantity');
  await rejects({...fixture(),preview:'data:image/png;base64,'+PNG},'image_encoding');
  await rejects({...fixture(),preview:'A'.repeat(3*1024*1024+4)},'preview_size');
});
test('a concurrent model/draft mutation cannot switch the product bound before encoding',async()=>{
  const f=withPhoto(),start=prepareNativeReview(f);f.model.configuration.id=OTHER;f.draft.state.objects[0].text='changed later';
  const result=await start;assert.equal(result.input.productId,ID);assert.equal(result.input.objects[0].text,'Test ÄÖÜ');
});

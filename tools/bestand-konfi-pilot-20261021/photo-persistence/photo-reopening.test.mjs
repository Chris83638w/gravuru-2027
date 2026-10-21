import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePhotoReopening,validatePhotoReopening,restorePhotoReopening,PHOTO_REOPENING_SCHEMA,PHOTO_REOPENING_LIMITS} from './photo-reopening.mjs';
import {customerDraft} from '../adapter/legacy-source/configurator/variant-m/ux-model.mjs';

// Synthetic one-pixel fixtures, arbitrary cfg UUID and text. No real customer files.
const ID='cfg_11111111-1111-4111-8111-111111111111';
const ORIGINAL='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0E8AAAAASUVORK5CYII=';
const EDITED='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const image=text=>new Blob([Buffer.from(text,'base64')],{type:'image/png'});
const edit={angle:270,flip:-1,zoom:2.35,x:-.42,y:.36,shape:'circle',color:'sepia'};
function fixture(){
  const objects=[{id:'text',type:'text',text:'Synthetisch ÄÖÜ',x:110,y:20,size:8,font:'fixture',color:'#eee'},
    {id:'photo',type:'photoSlot',x:110,y:80,w:40,h:40,photoShape:'circle',uxUploadId:'photo-1',uxUploadKind:'photo',uxPhotoBackground:'keep',
      photoMaskAssetId:'fixture-mask',role:'artwork',surfaceId:'front',futureNative:{mode:'test',values:[1,2,3]}}];
  const profile={id:ID,revision:ID+':5',binding:{productId:ID},geometry:{width:220,height:140},designs:[{id:'fixture-design',objects:structuredClone(objects)}]};
  const model={configuration:{id:ID,revision:5},universal:{profile}};
  const editorState={designId:'fixture-design',width:220,height:140,objects,mOptions:{mounting:'K00'},selected:'photo',showHero:true,extraEditor:{selection:['photo']}};
  const original=new File([image(ORIGINAL)],'Synthetisch-Ä.png',{type:'image/png',lastModified:123456789});
  const files=new Map([['photo-1',{file:original,blob:image(EDITED),url:'blob:old-edited',originalUrl:'blob:old-original',editSourceUrl:'blob:old-original',
    photoEdit:structuredClone(edit),edited:true,width:1,height:1}]]);
  return {model,editorState,draft:customerDraft(editorState,profile),files};
}
function urls(){let seq=0;const active=new Map(),revoked=[];return {active,revoked,createObjectURL(blob){const url='blob:restored-'+(++seq);active.set(url,blob);return url;},revokeObjectURL(url){active.delete(url);revoked.push(url);}};}
const hash=async bytes=>Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
async function resign(packet){const {integrity,...body}=packet;packet.integrity={algorithm:'sha256',sha256:await hash(new TextEncoder().encode(canonical(body)))};return packet;}
async function pack(f=fixture()){return (await capturePhotoReopening(f)).packet;}
async function restore(packet,f=fixture(),u=urls(),extra={}){return restorePhotoReopening({packet,model:f.model,...u,...extra});}
async function bytes(blob){return Buffer.from(await blob.arrayBuffer());}
const rejects=(fn,code)=>assert.rejects(fn,e=>e.code===code);

test('JSON roundtrip retains actual serializer draft, unknown native fields, exact original/edited bytes and photoEdit',async()=>{
  const f=fixture(),before=structuredClone({model:f.model,draft:f.draft,state:f.editorState});
  assert.equal(f.draft.state.objects[1].futureNative,undefined); // Actual September whitelist drops it.
  const captured=await capturePhotoReopening(f),packet=JSON.parse(JSON.stringify(captured.packet)),u=urls();
  const out=await restore(packet,f,u);
  assert.equal(packet.schema,PHOTO_REOPENING_SCHEMA);assert.deepEqual(out.draft,f.draft);
  assert.deepEqual(out.candidateEditorState,f.editorState);assert.deepEqual(out.templateObjects,f.model.universal.profile.designs[0].objects);
  const recovered=out.files.get('photo-1');
  assert.deepEqual(await bytes(recovered.file),Buffer.from(ORIGINAL,'base64'));assert.deepEqual(await bytes(recovered.blob),Buffer.from(EDITED,'base64'));
  assert.deepEqual(recovered.photoEdit,edit);assert.equal(recovered.file.name,'Synthetisch-Ä.png');assert.equal(recovered.file.lastModified,123456789);
  assert.equal(recovered.editSourceUrl,recovered.originalUrl);assert.notEqual(recovered.url,recovered.originalUrl);
  assert.equal(recovered.width,1);assert.equal(recovered.height,1);
  assert.equal(JSON.stringify(packet).includes('blob:'),false);
  assert.deepEqual({model:f.model,draft:f.draft,state:f.editorState},before);
  const recaptured=await capturePhotoReopening({...f,draft:out.draft,editorState:out.candidateEditorState,files:out.files});
  assert.deepEqual(recaptured.packet,packet);
  out.dispose();out.dispose();assert.equal(u.active.size,0);assert.equal(u.revoked.length,2);
});
test('hidden and guide photos, shared image references and keep/remove choices are retained without activating them',async()=>{
  const f=fixture();f.editorState.objects[1].uxHidden=true;
  f.editorState.objects.push({...structuredClone(f.editorState.objects[1]),id:'duplicate',uxHidden:false,role:'guide',uxPhotoBackground:'remove'});
  f.draft=customerDraft(f.editorState,f.model.universal.profile);
  const packet=await pack(f),out=await restore(packet,f);
  assert.equal(packet.media.length,1);assert.deepEqual(packet.media[0].objectIds,['photo','duplicate']);
  assert.equal(out.candidateEditorState.objects[1].uxHidden,true);assert.equal(out.candidateEditorState.objects[2].role,'guide');
  assert.equal(out.candidateEditorState.objects[1].uxPhotoBackground,'keep');assert.equal(out.candidateEditorState.objects[2].uxPhotoBackground,'remove');out.dispose();
});
test('second editing source may be a historical intermediate file; restore retains source distinct from original and current result',async()=>{
  const f=fixture(),asset=f.files.get('photo-1');
  // A third synthetic byte sequence tests exact preservation, not image quality/decoding.
  const intermediate=new Blob([Buffer.from('synthetic-prior-edit')],{type:'image/png'});
  f.files.set('prior-version',{file:asset.file,blob:intermediate,url:'blob:prior-result'});asset.editSourceUrl='blob:prior-result';
  const packet=await pack(f),out=await restore(packet,f),recovered=out.files.get('photo-1');
  assert.equal(Object.keys(packet.blobs).length,3);assert.equal(packet.media.length,1);
  assert.notEqual(recovered.editSourceUrl,recovered.originalUrl);assert.notEqual(recovered.editSourceUrl,recovered.url);
  assert.deepEqual(await bytes(recovered.editSourceBlob),await bytes(intermediate));
  assert.deepEqual((await capturePhotoReopening({...f,files:out.files})).packet,packet);out.dispose();
});
test('explicit editSourceBlob supports exact source when old URL history is no longer retained',async()=>{
  const f=fixture(),asset=f.files.get('photo-1');asset.editSourceUrl='blob:expired';asset.editSourceBlob=image(ORIGINAL);
  const out=await restore(await pack(f),f);assert.deepEqual(await bytes(out.files.get('photo-1').editSourceBlob),Buffer.from(ORIGINAL,'base64'));out.dispose();
});
test('missing and conflicting source bytes, missing original and missing photoEdit fail without any network fallback',async()=>{
  const cases=[['missing_edit_source',f=>f.files.get('photo-1').editSourceUrl='https://example.invalid/private.jpg'],
    ['ambiguous_edit_source',f=>f.files.set('conflict',{file:image(EDITED),url:'blob:old-original'})],
    ['missing_original',f=>delete f.files.get('photo-1').file],
    ['missing_photo_edit',f=>delete f.files.get('photo-1').photoEdit],
    ['missing_edited',f=>delete f.files.get('photo-1').blob]];
  for(const [code,mutate] of cases){const f=fixture();mutate(f);await rejects(()=>pack(f),code);}
});
test('unedited file does not manufacture editing parameters and deduplicates all byte references',async()=>{
  const f=fixture();f.files.set('photo-1',{file:f.files.get('photo-1').file,url:'blob:original'});
  const packet=await pack(f),out=await restore(packet,f),asset=out.files.get('photo-1');
  assert.equal(Object.keys(packet.blobs).length,1);assert.equal(asset.photoEdit,undefined);assert.equal(asset.blob,undefined);
  assert.equal(asset.url,asset.originalUrl);assert.equal(asset.url,asset.editSourceUrl);out.dispose();
});
test('cross-product/revision/template/geometry mismatch never reopens into the target product',async()=>{
  const packet=await pack();
  for(const mutate of [f=>f.model.configuration.revision=6,f=>f.model.universal.profile.geometry.width=300,
    f=>f.model.universal.profile.designs[0].objects[1].photoMaskAssetId='other-mask']){
    const f=fixture();mutate(f);await assert.rejects(()=>restore(packet,f),e=>['product_binding','geometry','template_mismatch'].includes(e.code));
  }
  const f=fixture();f.draft.state.objects[0].text='different';await rejects(()=>pack(f),'draft_state_mismatch');
});
test('native input hash binds exact input including options, quantity, photos and preview',async()=>{
  const f=fixture(),nativeInput={productId:ID,productRevision:5,designId:'fixture-design',objects:f.draft.state.objects,options:{mounting:'K00'},quantity:2,media:[{id:'photo-1',original:ORIGINAL,edited:EDITED}],preview:ORIGINAL};
  const packet=(await capturePhotoReopening({...f,nativeInput})).packet;
  await rejects(()=>restore(packet,f),'native_input_required');
  await rejects(()=>restore(packet,f,urls(),{nativeInput:{...nativeInput,quantity:3}}),'native_input_mismatch');
  const out=await restore(packet,f,urls(),{nativeInput});out.dispose();
});
test('tampering is detected before creating URLs, including independently re-signed modified image bytes',async()=>{
  const f=fixture(),packet=await pack(f),u=urls();packet.documents.editorState.selected='text';
  await rejects(()=>restore(packet,f,u),'integrity');assert.equal(u.active.size,0);
  const second=await pack(f),blob=Object.values(second.blobs)[0];blob.base64=blob.base64.replace(/^i/,'j');await resign(second);
  await rejects(()=>restore(second,f,u),'blob_integrity');assert.equal(u.active.size,0);
});
test('malformed schema, unsafe keys, excessive metadata, corrupt base64 and orphan files are rejected',async()=>{
  const f=fixture();
  const wrong=await pack(f);wrong.schema='future/v2';await rejects(()=>restore(wrong,f),'schema');
  const unsafe=await pack(f);unsafe.documents.editorState.extraEditor=JSON.parse('{"__proto__":{"polluted":true}}');await rejects(()=>restore(unsafe,f),'unsafe_key');
  const huge=fixture();huge.editorState.extraEditor='x'.repeat(PHOTO_REOPENING_LIMITS.maxMetadataBytes+1);await rejects(()=>pack(huge),'metadata_size');
  const invalid=await pack(f);Object.values(invalid.blobs)[0].base64='https://example.invalid/a';await resign(invalid);await rejects(()=>restore(invalid,f),'base64');
  const orphan=await pack(f);orphan.media[0].edited.blobId=orphan.media[0].original.blobId;await resign(orphan);await rejects(()=>restore(orphan,f),'media_binding');
});
test('oversized photo, blob declaration, missing media and invalid editing controls cannot claim complete package',async()=>{
  const f=fixture();f.files.get('photo-1').file=new Blob([new Uint8Array(PHOTO_REOPENING_LIMITS.maxBlobBytes+1)],{type:'image/png'});
  await rejects(()=>pack(f),'image_file');
  const over=await pack();Object.values(over.blobs)[0].bytes=PHOTO_REOPENING_LIMITS.maxBlobBytes+1;await rejects(()=>restore(over),'blob_record');
  const missing=await pack();missing.media=[];await resign(missing);await rejects(()=>restore(missing),'media_binding');
  const bad=fixture();bad.files.get('photo-1').photoEdit.zoom=9;await rejects(()=>pack(bad),'photo_edit');
});
test('state is a candidate only; permissions cannot be elevated by payload or a claimed capability',async()=>{
  const f=fixture();f.model.universal.profile.designs[0].objects[1].customerEditable=false;
  f.editorState.objects[1].customerEditable=true;f.draft=customerDraft(f.editorState,f.model.universal.profile);
  const {packet,gates}=await capturePhotoReopening({...f,serverCapability:{supported:true}}),out=await restore(packet,f);
  for(const result of [gates,out.gates]){
    assert.equal(result.nativeSendAllowed,false);assert.equal(result.serverPersistenceSupported,false);assert.equal(result.checkoutAllowed,false);
    assert.equal(result.stateApplicationAllowed,false);assert.equal(result.requiresServerObjectRightsValidation,true);
    assert.ok(result.blockers.some(b=>b.code==='protected_template_field_changed'&&b.field==='customerEditable'));
  }
  assert.equal(out.templateObjects[1].customerEditable,false);assert.equal(out.candidateEditorState.objects[1].customerEditable,true);out.dispose();
});
test('partial URL creation is revoked on error and validation allocates no URLs',async()=>{
  const packet=await pack(),u=urls();let count=0;
  await assert.rejects(()=>restore(packet,fixture(),{...u,createObjectURL(blob){if(++count===2)throw Error('synthetic allocation failure');return u.createObjectURL(blob);}}),/synthetic allocation failure/);
  assert.equal(u.active.size,0);assert.equal(u.revoked.length,1);
});
test('model, editor metadata and byte relations are snapshotted before asynchronous encoding',async()=>{
  const f=fixture(),start=capturePhotoReopening(f);
  f.editorState.objects[0].text='mutated';f.files.get('photo-1').photoEdit.color='grayscale';f.model.configuration.revision=6;
  const {packet}=await start;
  assert.equal(packet.binding.productRevision,5);assert.equal(packet.documents.editorState.objects[0].text,'Synthetisch ÄÖÜ');assert.equal(packet.media[0].metadata.photoEdit.color,'sepia');
});
test('server-side structural validator needs no browser URLs and still grants no state or order authority',async()=>{
  const f=fixture(),packet=await pack(f),checked=await validatePhotoReopening({packet,model:f.model});
  assert.equal(checked.blobs.size,2);assert.equal(checked.packetSha256,packet.integrity.sha256);
  assert.equal(checked.gates.stateApplicationAllowed,false);assert.equal(checked.gates.productionAllowed,false);
  assert.deepEqual(checked.candidateEditorState,f.editorState);
});
test('native request with same product but different customer objects cannot be bound to this sidecar',async()=>{
  const f=fixture(),nativeInput={productId:ID,productRevision:5,designId:'fixture-design',objects:structuredClone(f.draft.state.objects),options:{mounting:'K00'}};
  nativeInput.objects[0].text='Other customer contents';await rejects(()=>capturePhotoReopening({...f,nativeInput}),'native_state_mismatch');
  nativeInput.objects=f.draft.state.objects;nativeInput.options.mounting='different';await rejects(()=>capturePhotoReopening({...f,nativeInput}),'native_state_mismatch');
});
test('undeclared huge image strings are rejected by length before digest or decoding',async()=>{
  const f=fixture(),packet=await pack(f);Object.values(packet.blobs)[0].base64='A'.repeat(2*1024*1024);
  await rejects(()=>validatePhotoReopening({packet,model:f.model}),'base64');
});
test('native request cannot point at different pixels from the same upload ID in the sidecar',async()=>{
  const f=fixture(),nativeInput={productId:ID,productRevision:5,designId:'fixture-design',objects:f.draft.state.objects,options:{mounting:'K00'},media:[{id:'photo-1',original:EDITED,edited:EDITED}]};
  await rejects(()=>capturePhotoReopening({...f,nativeInput}),'native_media_mismatch');
  nativeInput.media=[];await rejects(()=>capturePhotoReopening({...f,nativeInput}),'native_media_mismatch');
});

import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {deflateSync,inflateSync,crc32} from 'node:zlib';
import {patchAcrylicDraftStore} from './patch-acrylic-draft-store.mjs';
import {snapshotNativeInput} from './native-input-binding.mjs';
import {capturePhotoReopening,restorePhotoReopening} from '../photo-reopening.mjs';
import {encodePhotoReopeningTransport,hydratePhotoReopeningTransport} from '../photo-reopening-transport.mjs';

const root=dirname(fileURLToPath(import.meta.url)),temporary=mkdtempSync(join(tmpdir(),'gravuru-photo-store-test-'));
const app=join(temporary,'app','workshop');mkdirSync(join(app,'photo-persistence','server'),{recursive:true});
for(const name of ['tenant.mjs','native-review-schema.mjs'])copyFileSync(join(root,'upstream','app','workshop',name),join(app,name));
copyFileSync(join(root,'native-photo-reopening-store.mjs'),join(app,'photo-persistence','server','native-photo-reopening-store.mjs'));
copyFileSync(join(root,'native-input-binding.mjs'),join(app,'photo-persistence','server','native-input-binding.mjs'));
copyFileSync(join(root,'..','photo-reopening.mjs'),join(app,'photo-persistence','photo-reopening.mjs'));
writeFileSync(join(app,'acrylic-draft-store.mjs'),patchAcrylicDraftStore(readFileSync(join(root,'upstream','app','workshop','acrylic-draft-store.mjs'),'utf8')));
const {createAcrylicDraftStore}=await import(pathToFileURL(join(app,'acrylic-draft-store.mjs')));
after(()=>{const target=resolve(temporary),base=resolve(tmpdir());if(dirname(target)!==base||!target.split(/[\\/]/).at(-1).startsWith('gravuru-photo-store-test-'))throw Error('Unsafe cleanup path');rmSync(target,{recursive:true,force:true});});

const sha=b=>createHash('sha256').update(b).digest('hex'),ID='cfg_11111111-1111-4111-8111-111111111111';
function png(red){
  const chunk=(name,data)=>{const type=Buffer.from(name),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([size,type,data,crc]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,red,20,30,255]))),chunk('IEND',Buffer.alloc(0))]);
}
const original=png(100),edited=png(200);
// Narrow test decoder: validates and inflates our actual one-pixel PNG fixtures.
// Production must inject existing prepareCustomerPhoto (Python/Pillow), not this fixture decoder.
async function testDecoder(value){
  const b=Buffer.from(value,'base64');if(b.readUInt32BE(0)!==0x89504e47)throw Error('Invalid synthetic PNG');
  let cursor=8,width,height,idat=[];
  while(cursor<b.length){const length=b.readUInt32BE(cursor),kind=b.subarray(cursor+4,cursor+8),data=b.subarray(cursor+8,cursor+8+length);
    if(crc32(Buffer.concat([kind,data]))!==b.readUInt32BE(cursor+8+length))throw Error('PNG CRC mismatch');
    if(kind.toString()==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);}if(kind.toString()==='IDAT')idat.push(data);cursor+=12+length;
  }
  if(inflateSync(Buffer.concat(idat)).length!==5||width!==1||height!==1)throw Error('Invalid synthetic pixel stream');
  return {original:b,width,height,preview:b};
}
function fixture(text='synthetic'){
  const objects=[{id:'text',type:'text',text,x:20,y:20},{id:'photo',type:'photoSlot',x:50,y:50,w:30,h:30,uxUploadId:'upload',uxUploadKind:'photo',uxPhotoBackground:'remove'}];
  const profile={id:ID,revision:ID+':5',binding:{productId:ID},geometry:{width:220,height:140},designs:[{id:'synthetic-design',objects:structuredClone(objects)}]};
  const model={configuration:{id:ID,revision:5},universal:{profile}},editorState={designId:'synthetic-design',width:220,height:140,objects,mOptions:{mounting:'K00'}};
  const draft={schema:'gravuru-customer-design/v2',productId:ID,profileId:ID,profileRevision:ID+':5',state:structuredClone(editorState)};
  const files=new Map([['upload',{file:new File([original],'synthetic.png',{type:'image/png',lastModified:1}),blob:new Blob([edited],{type:'image/png'}),
    url:'blob:edited',originalUrl:'blob:original',editSourceUrl:'blob:original',edited:true,photoEdit:{angle:90,flip:-1,zoom:1.2,x:0,y:0,shape:'circle',color:'sepia'},width:1,height:1}]]);
  const input={productId:ID,productRevision:5,designId:'synthetic-design',objects:structuredClone(objects),options:{mounting:'K00'},quantity:2,media:[{id:'upload',original:original.toString('base64'),edited:edited.toString('base64')}],preview:original.toString('base64')};
  const archive=Buffer.from('SYNTHETIC NATIVE ARCHIVE '+randomUUID()),manifest={schema:'gravuru-native-review/v1',id:'proof_'+randomUUID(),product:{id:ID,revision:5},source:{designId:'synthetic-design',draftId:'synthetic_'+randomUUID(),draftRevision:1,nativeInputSha256:snapshotNativeInput(input).sha256},packageSha256:sha(archive)};
  const bundle={manifest,package:archive,preview:Buffer.from('synthetic preview'),contourPdf:Buffer.alloc(0),photos:Buffer.alloc(0)};
  return {model,draft,editorState,files,input,bundle};
}
function open(filename=':memory:',tenantId='gravuru',captureFailure=false){
  const db=new DatabaseSync(filename);db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS form_review_snapshots(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,draft_revision INTEGER NOT NULL,manifest TEXT NOT NULL,preview BLOB NOT NULL,contour_pdf BLOB NOT NULL,package BLOB NOT NULL,photos BLOB NOT NULL,tenant_id TEXT NOT NULL,UNIQUE(draft_id,draft_revision));`);
  const store=createAcrylicDraftStore({database:db,tenantId,capture(bundle){
    const m=bundle.manifest;db.prepare('INSERT INTO form_review_snapshots(id,draft_id,draft_revision,manifest,preview,contour_pdf,package,photos,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(m.id,m.source.draftId,m.source.draftRevision,JSON.stringify(m),bundle.preview,bundle.contourPdf,bundle.package,bundle.photos,tenantId);
    if(captureFailure)throw Error('Injected native archive failure');
  }});
  return {db,store,close:()=>db.close()};
}
async function prepared(store,f=fixture(),decoder=testDecoder){
  const {packet}=await capturePhotoReopening({...f,nativeInput:f.input});
  return {f,packet,ticket:await store.preparePhotoReopening({packet,model:f.model,input:f.input,bundle:f.bundle,preparePhoto:decoder})};
}
const count=(db,table)=>db.prepare('SELECT count(*) AS n FROM '+table).get().n;

test('actual patched native store atomically persists bundle, revision and photo packet, survives DB close/reopen',async()=>{
  const file=join(temporary,'roundtrip.sqlite'),first=open(file),{f,packet,ticket}=await prepared(first.store);
  const saved=first.store.create(f.bundle,ticket);assert.equal(saved.revision,1);assert.equal(count(first.db,'native_photo_reopening'),1);first.close();
  const second=open(file);try{
    const reopened=second.store.reopening(saved.id,saved.token);assert.deepEqual(reopened.packet,packet);assert.deepEqual(reopened.input,f.input);
    assert.equal(reopened.snapshotId,saved.snapshotId);assert.equal(reopened.persistedCapability.storedAtomically,true);assert.equal(reopened.persistedCapability.active,false);
    let i=0;const restored=await restorePhotoReopening({packet:reopened.packet,model:f.model,nativeInput:reopened.input,createObjectURL:()=>`blob:sqlite-${++i}`,revokeObjectURL:()=>{}});
    assert.deepEqual(Buffer.from(await restored.files.get('upload').file.arrayBuffer()),original);
    assert.deepEqual(Buffer.from(await restored.files.get('upload').blob.arrayBuffer()),edited);
    assert.deepEqual(restored.files.get('upload').photoEdit,f.files.get('upload').photoEdit);restored.dispose();
  }finally{second.close();}
});
test('failed photo insert rolls native archive, draft head and revision back together',async()=>{
  const x=open();try{
    x.db.exec("CREATE TRIGGER injected_failure BEFORE INSERT ON native_photo_reopening BEGIN SELECT RAISE(ABORT,'injected photo failure'); END;");
    const p=await prepared(x.store);assert.throws(()=>x.store.create(p.f.bundle,p.ticket),/injected photo failure/);
    for(const table of ['form_review_snapshots','acrylic_customer_drafts','acrylic_customer_revisions','native_photo_reopening'])assert.equal(count(x.db,table),0);
    assert.equal(x.db.isTransaction,false);
  }finally{x.close();}
});
test('native archive failure also leaves no photo data or draft rows',async()=>{
  const x=open(':memory:','gravuru',true);try{const p=await prepared(x.store);assert.throws(()=>x.store.create(p.f.bundle,p.ticket),/archive failure/);
    assert.equal(count(x.db,'form_review_snapshots'),0);assert.equal(count(x.db,'native_photo_reopening'),0);assert.equal(count(x.db,'acrylic_customer_drafts'),0);
  }finally{x.close();}
});
test('save appends immutable history; failure and stale expectedRevision retain previous complete revision',async()=>{
  const x=open();try{
    const p=await prepared(x.store),saved=x.store.create(p.f.bundle,p.ticket),next=await prepared(x.store,fixture('new text'));
    x.db.exec("CREATE TRIGGER injected_save_failure BEFORE INSERT ON native_photo_reopening WHEN NEW.revision=2 BEGIN SELECT RAISE(ABORT,'save blocked'); END;");
    assert.throws(()=>x.store.save(saved.id,saved.token,1,next.f.bundle,next.ticket),/save blocked/);
    assert.equal(x.store.get(saved.id,saved.token).revision,1);assert.equal(count(x.db,'form_review_snapshots'),1);assert.deepEqual(x.store.reopening(saved.id,saved.token).packet,p.packet);
    x.db.exec('DROP TRIGGER injected_save_failure');const updated=x.store.save(saved.id,saved.token,1,next.f.bundle,next.ticket);
    assert.equal(updated.revision,2);assert.deepEqual(x.store.reopening(saved.id,saved.token,1).packet,p.packet);assert.deepEqual(x.store.reopening(saved.id,saved.token).packet,next.packet);
    const stale=await prepared(x.store,fixture('stale'));assert.throws(()=>x.store.save(saved.id,saved.token,1,stale.f.bundle,stale.ticket),e=>e.status===409);
    assert.equal(count(x.db,'native_photo_reopening'),2);assert.equal(count(x.db,'form_review_snapshots'),2);
    assert.throws(()=>x.db.exec("UPDATE native_photo_reopening SET packet_json='{}'"),/immutable/);
  }finally{x.close();}
});
test('two real SQLite connections reject competing stale writer without partial snapshots',async()=>{
  const file=join(temporary,'concurrency.sqlite'),a=open(file),b=open(file);try{
    const p=await prepared(a.store),saved=a.store.create(p.f.bundle,p.ticket),pa=await prepared(a.store,fixture('writer A')),pb=await prepared(b.store,fixture('writer B'));
    a.store.save(saved.id,saved.token,1,pa.f.bundle,pa.ticket);
    assert.throws(()=>b.store.save(saved.id,saved.token,1,pb.f.bundle,pb.ticket),e=>e.status===409);
    assert.equal(b.store.get(saved.id,saved.token).revision,2);assert.equal(count(b.db,'native_photo_reopening'),2);assert.equal(count(b.db,'form_review_snapshots'),2);
  }finally{b.close();a.close();}
});
test('wrong token, other tenant, nonexistent revision and forged serialized ticket cannot access or attach data',async()=>{
  const file=join(temporary,'tenants.sqlite'),a=open(file),b=open(file,'other-tenant');try{
    const p=await prepared(a.store),saved=a.store.create(p.f.bundle,p.ticket);
    assert.throws(()=>a.store.reopening(saved.id,'0'.repeat(64)),e=>e.status===404);
    assert.throws(()=>b.store.reopening(saved.id,saved.token),e=>e.status===404);
    assert.throws(()=>a.store.reopening(saved.id,saved.token,2),e=>e.status===404);
    assert.throws(()=>a.store.create(p.f.bundle,JSON.parse(JSON.stringify(p.ticket))),e=>e.code==='photo_ticket');
    assert.throws(()=>b.store.create(p.f.bundle,p.ticket),e=>e.code==='photo_ticket');
    assert.equal(count(a.db,'native_photo_reopening'),1);
  }finally{b.close();a.close();}
});
test('legacy drafts remain supported; existing photo-persistent draft cannot silently downgrade',async()=>{
  const x=open();try{
    const old=fixture(),legacy=x.store.create(old.bundle);assert.throws(()=>x.store.reopening(legacy.id,legacy.token),e=>e.status===404);
    const oldNext=fixture('legacy next');assert.equal(x.store.save(legacy.id,legacy.token,1,oldNext.bundle).revision,2);
    const p=await prepared(x.store),saved=x.store.create(p.f.bundle,p.ticket),next=fixture('would lose photos');
    assert.throws(()=>x.store.save(saved.id,saved.token,1,next.bundle),/Fotowiederöffnung/);assert.equal(x.store.get(saved.id,saved.token).revision,1);
  }finally{x.close();}
});
test('all referenced bytes pass explicit decoder before a write; missing decoder, corrupt image and mismatched dimensions are blocked',async()=>{
  const x=open();try{
    const f=fixture(),{packet}=await capturePhotoReopening({...f,nativeInput:f.input});
    await assert.rejects(()=>x.store.preparePhotoReopening({packet,model:f.model,input:f.input,bundle:f.bundle}),e=>e.code==='photo_decoder_required');
    let calls=0;await prepared(x.store,fixture(),async value=>{calls++;return testDecoder(value);});assert.equal(calls,2);
    await assert.rejects(()=>prepared(x.store,fixture(),async()=>{throw Error('Production decoder rejected pixels');}),/rejected pixels/);
    await assert.rejects(()=>prepared(x.store,fixture(),async value=>({...await testDecoder(value),width:2})),e=>e.code==='photo_dimensions');
    assert.equal(count(x.db,'acrylic_customer_drafts'),0);assert.equal(count(x.db,'native_photo_reopening'),0);
  }finally{x.close();}
});
test('ticket remains tied to exact native snapshot/archive and strict upstream patch refuses newer source',async()=>{
  const x=open();try{
    const p=await prepared(x.store),other=fixture();assert.throws(()=>x.store.create(other.bundle,p.ticket),e=>e.code==='photo_ticket');
    p.f.bundle.package=Buffer.from('changed after prepare');assert.throws(()=>x.store.create(p.f.bundle,p.ticket),/Prüfstand|Acrylstand/);
    assert.throws(()=>patchAcrylicDraftStore(readFileSync(join(root,'upstream','app','workshop','acrylic-draft-store.mjs'),'utf8')+'\n'),/Unrecognized/);
    assert.equal(count(x.db,'native_photo_reopening'),0);
  }finally{x.close();}
});
test('review A cannot receive sidecar/input B with different text but identical product/design/revision',async()=>{
  const x=open();try{
    const a=fixture('Text A'),b=fixture('Text B'),{packet}=await capturePhotoReopening({...b,nativeInput:b.input});
    await assert.rejects(()=>x.store.preparePhotoReopening({packet,model:b.model,input:b.input,bundle:a.bundle,preparePhoto:testDecoder}),e=>e.code==='photo_review_input_mismatch');
    assert.equal(count(x.db,'acrylic_customer_drafts'),0);assert.equal(count(x.db,'native_photo_reopening'),0);
  }finally{x.close();}
});
test('mutation after native review cannot switch the content associated with its frozen digest',async()=>{
  const x=open();try{
    const f=fixture('Before review');f.input.objects[0].text='Mutated after review';f.editorState.objects[0].text='Mutated after review';f.draft.state.objects[0].text='Mutated after review';
    const {packet}=await capturePhotoReopening({...f,nativeInput:f.input});
    await assert.rejects(()=>x.store.preparePhotoReopening({packet,model:f.model,input:f.input,bundle:f.bundle,preparePhoto:testDecoder}),e=>e.code==='photo_review_input_mismatch');
    const old=fixture();delete old.bundle.manifest.source.nativeInputSha256;
    const oldPacket=(await capturePhotoReopening({...old,nativeInput:old.input})).packet;
    await assert.rejects(()=>x.store.preparePhotoReopening({packet:oldPacket,model:old.model,input:old.input,bundle:old.bundle,preparePhoto:testDecoder}),e=>e.code==='photo_bundle');
  }finally{x.close();}
});
test('deduplicated wire request hydrates into the exact packet and commits with the existing native draft',async()=>{
  const x=open();try{
    const f=fixture(),{packet}=await capturePhotoReopening({...f,nativeInput:f.input});
    const body=JSON.parse(encodePhotoReopeningTransport({packet,input:f.input}).serializedBody),hydrated=hydratePhotoReopeningTransport({reopening:body.reopening,input:body.input});
    const ticket=await x.store.preparePhotoReopening({packet:hydrated,model:f.model,input:body.input,bundle:f.bundle,preparePhoto:testDecoder});
    const saved=x.store.create(f.bundle,ticket);assert.deepEqual(x.store.reopening(saved.id,saved.token).packet,packet);
  }finally{x.close();}
});

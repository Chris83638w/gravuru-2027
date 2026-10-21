import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePhotoReopeningTransport,hydratePhotoReopeningTransport,EXISTING_NATIVE_REQUEST_LIMIT} from './photo-reopening-transport.mjs';
import {PHOTO_REOPENING_SCHEMA} from './photo-reopening.mjs';
const fixture=()=>{
  const sha='1'.repeat(64),extra='2'.repeat(64),packet={schema:PHOTO_REOPENING_SCHEMA,binding:{},documents:{},media:[],integrity:{algorithm:'sha256',sha256:'0'.repeat(64)},
    blobs:{['sha256:'+sha]:{sha256:sha,mimeType:'image/png',bytes:3,base64:'AQID'},['sha256:'+extra]:{sha256:extra,mimeType:'image/png',bytes:3,base64:'BAUG'}}};
  return {packet,input:{media:[{id:'visible',original:'AQID'}]}};
};
test('wire packet deduplicates native bytes while separately transporting hidden/intermediate sources; hydration is exact',()=>{
  const f=fixture(),encoded=encodePhotoReopeningTransport({...f,expectedRevision:7}),body=JSON.parse(encoded.serializedBody);
  const entries=Object.values(body.reopening.packet.blobs);
  assert.deepEqual(entries[0].nativeRef,{mediaIndex:0,field:'original'});assert.equal(entries[0].base64,undefined);
  assert.equal(entries[1].base64,'BAUG');assert.equal(entries[1].nativeRef,undefined);
  assert.equal(body.expectedRevision,7);assert.deepEqual(hydratePhotoReopeningTransport({reopening:body.reopening,input:body.input}),f.packet);
  assert.equal(encoded.gates.nativeSendAllowed,false);
});
test('four maximum 15 MiB originals stay below existing 100 MiB body limit, with no duplicate Base64 in sidecar',()=>{
  // Boundary payload only, not claimed to be a decodable image or valid customer design.
  const bytes=15*1024*1024,encodedSize=bytes/3*4,input={media:[]},packet={schema:PHOTO_REOPENING_SCHEMA,binding:{},documents:{},media:[],integrity:{algorithm:'sha256',sha256:'0'.repeat(64)},blobs:{}};
  for(let i=0;i<4;i++){
    const sha=String(i+1).repeat(64),base64='A'.repeat(encodedSize-4)+['AAAA','AAAB','AAAC','AAAD'][i];
    input.media.push({id:'fixture-'+i,original:base64});packet.blobs['sha256:'+sha]={sha256:sha,mimeType:'image/png',bytes,base64};
  }
  const encoded=encodePhotoReopeningTransport({packet,input});
  assert.ok(encoded.byteLength>80*1024*1024);assert.ok(encoded.byteLength<EXISTING_NATIVE_REQUEST_LIMIT);
  assert.equal((encoded.serializedBody.match(/"nativeRef"/g)||[]).length,4);
  assert.equal((encoded.serializedBody.match(/"base64"/g)||[]).length,0);
});
test('exact request-size boundary is checked before send and caller cannot raise server limit',()=>{
  const f=fixture(),result=encodePhotoReopeningTransport(f);
  assert.equal(encodePhotoReopeningTransport({...f,maxRequestBytes:result.byteLength}).byteLength,result.byteLength);
  assert.throws(()=>encodePhotoReopeningTransport({...f,maxRequestBytes:result.byteLength-1}),e=>e.code==='photo_transport_size');
  assert.throws(()=>encodePhotoReopeningTransport({...f,maxRequestBytes:EXISTING_NATIVE_REQUEST_LIMIT+1}),e=>e.code==='photo_transport_limit');
});
test('invalid reference indexes, arbitrary property names, double source and missing bytes cannot hydrate',()=>{
  for(const mutate of [r=>Object.values(r.packet.blobs)[0].nativeRef.mediaIndex=9,
    r=>Object.values(r.packet.blobs)[0].nativeRef.field='__proto__',
    r=>Object.values(r.packet.blobs)[0].base64='AQID']){
    const f=fixture(),body=JSON.parse(encodePhotoReopeningTransport(f).serializedBody);mutate(body.reopening);
    assert.throws(()=>hydratePhotoReopeningTransport({reopening:body.reopening,input:body.input}),e=>['photo_transport_reference','photo_transport_contract'].includes(e.code));
  }
  const f=fixture(),body=JSON.parse(encodePhotoReopeningTransport(f).serializedBody);body.input.media[0].original='';
  assert.throws(()=>hydratePhotoReopeningTransport({reopening:body.reopening,input:body.input}),e=>e.code==='photo_transport_reference');
});
test('encoded body is immutable even if caller changes the source afterward',()=>{
  const f=fixture(),encoded=encodePhotoReopeningTransport(f);f.input.media[0].original='Changed';
  assert.equal(JSON.parse(encoded.serializedBody).input.media[0].original,'AQID');
});

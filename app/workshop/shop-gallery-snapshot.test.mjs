import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {gallerySnapshotCodec} from './shop-gallery-snapshot.mjs';
// Frozen source from e49659f, before the one-row projection optimization.
import {gallerySnapshotCodec as referenceCodec} from './test-fixtures/gallery-snapshot-v3-reference.mjs';

const secret='synthetic-snapshot-test-secret',context={store:{storeId:'acryl',workshop:{tenantId:'gravuru'}},binding:{shopDomain:'synthetic.myshopify.com'}};
const privateMarker='PRIVATE_SESSION_CUSTOMER_ARTWORK_MUST_NOT_PERSIST';
function row(i=0){
 const scope={key:'line:one',lineId:'one',familyId:null,private:privateMarker};
 return {binding:{storeId:'acryl',tenantId:'gravuru',shopDomain:'synthetic.myshopify.com',shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(100+i),productId:'cfg_one',productRevision:3,bindingId:'binding_'+i,assignmentRevision:2,options:{mounting:'K00',size:'120x80'},unitCents:1999,token:privateMarker},scope,process:'["steel",null,"engraving"]',design:{katalog:{target:i%2?{lineId:'one',familyId:'fixture',explicit:true,released:true,private:privateMarker}:undefined},objects:[{private:privateMarker}]},availability:{universal:{doorbell:{schema:i%2?'gravuru-doorbell/v1':undefined,private:privateMarker},private:privateMarker}},designId:'d'+i,dedupe:'dedupe'+i,search:{text:'Haus äöß 🐾 '+i,number:String(i),rank:i%3,unnamedMotifs:0,private:privateMarker},card:{productId:'cfg_one',productRevision:3,designId:'d'+i,productName:'Schild',designName:'Haus '+i,themes:['family','犬'],widthMm:120,heightMm:80,shape:'rect',unitCents:1999,currency:'EUR',shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(100+i),private:privateMarker},private:privateMarker};
}
const snapshot=rows=>({scopes:new Map([['line:one',rows],['empty',[]]]),sources:new Map([['binding_0',{scope:rows[0]?.scope||{},process:'steel',theme:null,private:privateMarker}]])});

test('v4 preserves every projected v3 row across blocks, privacy, ordering and input identity',()=>{
 const data=snapshot(Array.from({length:777},(_,i)=>row(i))),before=structuredClone(data),old=referenceCodec(secret),current=gallerySnapshotCodec(secret);
 const expected=old.encode(context,'revision-1',data),actual=current.encode(context,'revision-1',data);
 const restored=current.decode(context,'revision-1',actual);
 assert.deepEqual(restored,old.decode(context,'revision-1',expected));assert.deepEqual(data,before);
 assert.ok(!JSON.stringify([...restored.scopes]).includes(privateMarker));
 assert.deepEqual(old.encode(context,'revision-1',restored),expected);
 const envelope=JSON.parse(actual.payload);assert.equal(envelope.schema,'gravuru-shop-gallery-cache/v4');assert.deepEqual(envelope.scopes[0][1].map(b=>b.rows),[256,256,256,9]);
});

test('empty/shared/sparse scope arrays and optional values retain the old v3 representation',()=>{
 const shared=[row(1),row(2)],sparse=[];sparse[2]=row(3);
 for(const data of [{scopes:new Map(),sources:new Map()},{scopes:new Map([['a',shared],['b',shared],['sparse',sparse]]),sources:new Map()}]){
  const old=referenceCodec(secret),current=gallerySnapshotCodec(secret),expected=old.decode(context,'r',old.encode(context,'r',data)),actual=current.decode(context,'r',current.encode(context,'r',data));assert.deepEqual(actual,expected);
 }
});

test('projection uses the actual parent row and cannot serialize a replacement toJSON body',()=>{
 const original=row(4);original.toJSON=()=>({customer:privateMarker});
 const data=snapshot([original]),codec=gallerySnapshotCodec(secret),actual=codec.decode(context,'r',codec.encode(context,'r',data)),old=referenceCodec(secret);
 assert.deepEqual(actual,old.decode(context,'r',old.encode(context,'r',data)));
 assert.ok(!JSON.stringify([...actual.scopes]).includes(privateMarker));
});

test('v4 authentication rejects tampering, secret, revision, store and tenant before accepting cached rows',()=>{
  const saved=gallerySnapshotCodec(secret).encode(context,'r',snapshot([row()])),codec=gallerySnapshotCodec(secret);
  assert.ok(codec.decode(context,'r',saved));
  assert.equal(codec.decode(context,'r',{...saved,payload:saved.payload+' '}),null);
  assert.equal(gallerySnapshotCodec('other-synthetic-secret').decode(context,'r',saved),null);
  assert.equal(codec.decode(context,'other',saved),null);
  assert.equal(codec.decode({...context,store:{...context.store,storeId:'other'}},'r',saved),null);
  assert.equal(codec.decode({...context,store:{...context.store,workshop:{tenantId:'other'}}},'r',saved),null);
});

const signed=(data,domain='gravuru-shop-gallery-cache/v4')=>{const payload=JSON.stringify(data);return {payload,mac:createHmac('sha256',secret).update(domain+'\0').update(payload).digest('hex')};};
test('old v3 and wrong-domain envelopes are cache misses without a legacy full-payload parse',()=>{
 const codec=gallerySnapshotCodec(secret),data=snapshot([row()]);assert.equal(codec.decode(context,'r',referenceCodec(secret).encode(context,'r',data)),null);
 const envelope=JSON.parse(codec.encode(context,'r',data).payload);assert.equal(codec.decode(context,'r',signed(envelope,'gravuru-shop-gallery-cache/v3')),null);
});

test('UTF8 byte limits split rows and sources; source order and optional fields match v3',()=>{
 const data=snapshot([row(1),row(2),row(3)]);for(const r of data.scopes.get('line:one'))r.search.text='犬'.repeat(180000);
 data.sources=new Map(Array.from({length:700},(_,i)=>['source'+i,{scope:{key:'k',lineId:'x'},process:'steel',theme:i%2?null:undefined}]));
 const codec=gallerySnapshotCodec(secret),saved=codec.encode(context,'r',data),envelope=JSON.parse(saved.payload);
 assert.deepEqual(envelope.scopes[0][1].map(b=>b.rows),[1,1,1]);assert.deepEqual(envelope.sources.map(b=>b.rows),[256,256,188]);
 const old=referenceCodec(secret);assert.deepEqual(codec.decode(context,'r',saved),old.decode(context,'r',old.encode(context,'r',data)));
 data.scopes.get('line:one')[0].search.text='犬'.repeat(350000);assert.throws(()=>codec.encode(context,'r',data),/cache limits/);
});

test('a near-limit high-entropy block roundtrips without recursive base64 regex validation',()=>{
 const data=snapshot([row()]);data.scopes.get('line:one')[0].search.text=randomBytes(780000).toString('base64');
 const codec=gallerySnapshotCodec(secret),saved=codec.encode(context,'r',data),envelope=JSON.parse(saved.payload),block=envelope.scopes[0][1][0];
 assert.ok(block.bytes>1024*1024*0.99);assert.ok(block.data.length>1000000);
 const old=referenceCodec(secret);assert.deepEqual(codec.decode(context,'r',saved),old.decode(context,'r',old.encode(context,'r',data)));
});

test('signed malformed blocks, byte/count totals and decompression overflow fail as a complete cache miss',()=>{
 const codec=gallerySnapshotCodec(secret),base=JSON.parse(codec.encode(context,'r',snapshot([row()])).payload);
 const mutate=fn=>{const data=structuredClone(base);fn(data);assert.equal(codec.decode(context,'r',signed(data)),null);};
 mutate(d=>d.cards++);mutate(d=>d.sourceCount++);mutate(d=>d.bytes++);
 mutate(d=>d.scopes[0][1][0].rows=257);mutate(d=>d.scopes[0][1][0].bytes=1024*1024+1);
 mutate(d=>d.scopes[0][1][0].data='not-base64!');
 mutate(d=>d.scopes[0][1][0].data=Buffer.from('not-deflate').toString('base64'));
 mutate(d=>{const b=d.scopes[0][1][0];b.data=deflateRawSync('x'.repeat(2*1024*1024)).toString('base64');});
 mutate(d=>{const b=d.scopes[0][1][0];b.data=deflateRawSync('[]').toString('base64');d.bytes+=2-b.bytes;b.bytes=2;});
 mutate(d=>{const b=d.scopes[0][1][0];b.data=deflateRawSync('{"not":"array"}').toString('base64');d.bytes+=15-b.bytes;b.bytes=15;});
 mutate(d=>{d.scopes=[['k',Array.from({length:513},()=>({rows:1,bytes:1024*1024,data:'eA=='}))]];d.cards=513;d.bytes=513*1024*1024;});
 mutate(d=>d.sources[0].rows++);
 mutate(d=>{d.scopes.push(d.scopes[0]);d.cards*=2;d.bytes+=d.scopes[0][1].reduce((n,b)=>n+b.bytes,0);});
 mutate(d=>d.scopes[0][0]=7);
 for(const pairs of [[['same',{}],['same',{}]],[[3,{}]],[{0:'k',1:{}}],[['k',null]]])mutate(d=>{
  const json=JSON.stringify(pairs),bytes=Buffer.byteLength(json),oldBytes=d.sources.reduce((n,b)=>n+b.bytes,0);
  d.sources=[{rows:pairs.length,bytes,data:deflateRawSync(json).toString('base64')}];d.sourceCount=pairs.length;d.bytes+=bytes-oldBytes;
 });
 const oversized={payload:' '.repeat(64*1024*1024+1),mac:'0'.repeat(64)};assert.equal(codec.decode(context,'r',oversized),null);
});

// Audit 17.11.2026: Treffer entpacken nur den angefragten Bereich (Live: 44 Bereiche, 245.830 Karten, ~3 s je Treffer).
function manyScopes(scopeCount,rowsPerScope){
 const scopes=new Map();
 for(let s=0;s<scopeCount;s++)scopes.set('line:'+s,Array.from({length:rowsPerScope},(_,i)=>{const r=row(s*rowsPerScope+i);r.scope={...r.scope,key:'line:'+s,lineId:String(s)};return r;}));
 return {scopes,sources:new Map([['binding_0',{scope:{key:'line:0',lineId:'0',familyId:null},process:'steel',theme:null}]])};
}
test('decodeLazy yields exactly the eager rows per scope, but inflates only requested scopes',()=>{
 const codec=gallerySnapshotCodec(secret),data=manyScopes(5,300),saved=codec.encode(context,'r',data);
 const eager=codec.decode(context,'r',saved),lazy=codec.decodeLazy(context,'r',saved);
 assert.deepEqual(lazy.sources,eager.sources);assert.equal(lazy.scopes.size,5);assert.equal(lazy.scopes.inflated,0);
 assert.deepEqual(lazy.scopes.get('line:3'),eager.scopes.get('line:3'));assert.equal(lazy.scopes.inflated,1);
 assert.equal(lazy.scopes.get('line:3'),lazy.scopes.get('line:3'),'Bereich wird nur einmal entpackt');
 assert.equal(lazy.scopes.get('fehlt'),undefined);assert.equal(lazy.scopes.has('line:4'),true);assert.equal(lazy.scopes.has('fehlt'),false);
 for(const key of eager.scopes.keys())assert.deepEqual(lazy.scopes.get(key),eager.scopes.get(key));
 assert.deepEqual([...lazy.scopes.keys()],[...eager.scopes.keys()]);
});
test('decodeLazy rejects exactly what decode rejects before inflating anything',()=>{
 const codec=gallerySnapshotCodec(secret),saved=codec.encode(context,'r',manyScopes(2,10));
 for(const bad of [null,{...saved,payload:saved.payload+' '},{...saved,mac:'0'.repeat(64)}])assert.equal(codec.decodeLazy(context,'r',bad),null);
 assert.equal(codec.decodeLazy(context,'other',saved),null);assert.equal(gallerySnapshotCodec('other-synthetic-secret').decodeLazy(context,'r',saved),null);
 const data=JSON.parse(saved.payload);data.cards++;const payload=JSON.stringify(data);
 assert.equal(codec.decodeLazy(context,'r',{payload,mac:createHmac('sha256',secret).update('gravuru-shop-gallery-cache/v4\0').update(payload).digest('hex')}),null);
});
test('a lazy cache hit for one scope is much cheaper than eager decoding of all scopes',()=>{
 const codec=gallerySnapshotCodec(secret),saved=codec.encode(context,'r',manyScopes(20,600));
 const time=fn=>{const at=performance.now();fn();return performance.now()-at;};
 const eager=Math.min(...[0,1,2].map(()=>time(()=>codec.decode(context,'r',saved))));
 const lazy=Math.min(...[0,1,2].map(()=>time(()=>codec.decodeLazy(context,'r',saved).scopes.get('line:7'))));
 assert(lazy*4<eager,`lazy ${lazy.toFixed(1)} ms vs eager ${eager.toFixed(1)} ms`);
});

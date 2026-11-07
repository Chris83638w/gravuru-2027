import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const sha=value=>createHash('sha256').update(value).digest('hex');
const token='a1'.repeat(16),prefix='/originale/editor/ressourcen/'+token;
const body=value=>JSON.stringify(value);
const urlFor=(kind,value,base=prefix)=>base+'/'+kind+'/'+sha(body(value))+'.json';
let serial=0;
const fresh=()=>import('./browser-model-resources.mjs?test-'+(++serial));
const surface='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
const font={label:'Unverändert Ä',regular:{units:1000,glyphs:{A:{a:563.125,d:'M1 2Q3 4 5 6Z'},'ä':{a:467,d:'M7 8H9Z'},'🐶':{a:800,d:'M10 11V12Z'}}},bold:{units:1000,glyphs:{A:{a:600,d:'M13 14L15 16Z'}}},metadata:{source:'original-file'}};

test('private browser resource paths require exact token, kind and SHA while existing URLs are not claimed',async()=>{
  const {isBrowserResourceUrl,fetchResourceJSON}=await fresh();
  for(const base of [prefix,'/browser-ressourcen/'+token])for(const kind of ['schriften','grundplatten'])assert.equal(isBrowserResourceUrl(urlFor(kind,font,base)),true);
  for(const url of [null,'https://outside.test'+urlFor('schriften',font),'/konfigurator/shop/schriften/'+sha(body(font))+'.json',
    urlFor('schriften',font)+'?other=1',urlFor('schriften',font).replace(token,'a'),urlFor('schriften',font).replace('/schriften/','/../'),
    urlFor('schriften',font).replace('/schriften/','/motive/'),urlFor('schriften',font).replace(token,'g'.repeat(32))]){
    assert.equal(isBrowserResourceUrl(url),false);
    await assert.rejects(fetchResourceJSON(url,{fetcher:()=>{throw Error('must not fetch');}}),e=>e.code==='browser_resource_url');
  }
});

test('concurrent requests share one verified promise including aliases, credentials and priority',async()=>{
  const {fetchResourceJSON}=await fresh(),url=urlFor('schriften',font),calls=[];
  let release;const ready=new Promise(resolve=>{release=resolve;});
  const fetcher=async(...args)=>{calls.push(args);await ready;return new Response(body(font));};
  const first=fetchResourceJSON(url,{fetcher,priority:'low'}),second=fetchResourceJSON(url,{fetcher});
  assert.equal(first,second);assert.equal(calls.length,1);assert.deepEqual(calls[0],[url,{credentials:'same-origin',priority:'low'}]);
  release();assert.deepEqual(await first,font);assert.deepEqual(await second,font);
  assert.deepEqual(await fetchResourceJSON(url,{fetcher}),font);assert.equal(calls.length,1);
});

test('successful resource cache is bounded by recent use without evicting an in-flight request',async()=>{
  const {fetchResourceJSON}=await fresh(),responses=new Map(),calls=[];
  const add=value=>{const url=urlFor('schriften',value);responses.set(url,body(value));return url;};
  const urls=Array.from({length:129},(_,id)=>add({id,regular:{units:1000,glyphs:{}}})),waiting=add({id:'pending',regular:{units:1000,glyphs:{}}});
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const fetcher=async url=>{calls.push(url);if(url===waiting)await gate;return new Response(responses.get(url));};
  const inFlight=fetchResourceJSON(waiting,{fetcher});
  for(const url of urls.slice(0,128))await fetchResourceJSON(url,{fetcher});
  await fetchResourceJSON(urls[0],{fetcher});await fetchResourceJSON(urls[128],{fetcher});
  assert.equal(fetchResourceJSON(waiting,{fetcher}),inFlight);
  await fetchResourceJSON(urls[0],{fetcher});assert.equal(calls.filter(url=>url===urls[0]).length,1);
  await fetchResourceJSON(urls[1],{fetcher});assert.equal(calls.filter(url=>url===urls[1]).length,2);
  release();await inFlight;assert.equal(calls.filter(url=>url===waiting).length,1);
});

test('the complete real font payload survives transport with every glyph, face and metadata entry',async()=>{
  const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
  const {fetchResourceJSON}=await fresh();let calls=0;
  for(const [name,original]of Object.entries(resources.fonts)){
    const value=await fetchResourceJSON(urlFor('schriften',original),{fetcher:async()=>{calls++;return new Response(body(original));}});
    assert.deepEqual(value,original,name);assert.equal(sha(body(value)),sha(body(original)),name);
    for(const [face,data]of Object.entries(original))if(data?.glyphs)assert.deepEqual(Object.keys(value[face].glyphs),Object.keys(data.glyphs),name+' '+face);
  }
  assert.ok(calls>0);
});

test('network and integrity failures are evicted and the same original can be retried',async()=>{
  const {fetchResourceJSON}=await fresh(),url=urlFor('schriften',font);let calls=0;
  const fetcher=async()=>{calls++;if(calls===1)return new Response('not found',{status:404});if(calls===2)return new Response(body({...font,label:'wrong'}));return new Response(body(font));};
  await assert.rejects(fetchResourceJSON(url,{fetcher}),e=>e.code==='browser_resource_load');
  await assert.rejects(fetchResourceJSON(url,{fetcher}),e=>e.code==='browser_resource_integrity');
  assert.deepEqual(await fetchResourceJSON(url,{fetcher}),font);assert.equal(calls,3);
});

test('integrity is checked on response bytes, not on reserialized JSON, and requires WebCrypto',async()=>{
  const {fetchResourceJSON}=await fresh(),url=urlFor('schriften',font);let calls=0;
  const fetcher=async()=>{calls++;return new Response(body(font));};
  await assert.rejects(fetchResourceJSON(url,{fetcher,subtle:null}),e=>e.code==='browser_resource_integrity_unavailable');assert.equal(calls,0);
  await assert.rejects(fetchResourceJSON(url,{fetcher:async()=>new Response(' '+body(font))}),e=>e.code==='browser_resource_integrity');
  assert.deepEqual(await fetchResourceJSON(url,{fetcher}),font);assert.equal(calls,1);
});

test('valid SHA cannot disguise invalid JSON or the wrong kind of payload',async()=>{
  const {fetchResourceJSON}=await fresh(),invalid='{invalid-json';
  await assert.rejects(fetchResourceJSON(prefix+'/schriften/'+sha(invalid)+'.json',{fetcher:async()=>new Response(invalid)}),e=>e.code==='browser_resource_json');
  for(const [kind,value]of [['grundplatten',font],['grundplatten','https://external.test/image.png'],['schriften',surface],['schriften',[]]]){
    await assert.rejects(fetchResourceJSON(urlFor(kind,value),{fetcher:async()=>new Response(body(value))}),e=>e.code==='browser_resource_type');
  }
});

test('material hydration restores the exact image once before model use, without touching designs',async t=>{
  const loader=await fresh(),url=urlFor('grundplatten',surface),calls=[];
  t.mock.method(globalThis,'fetch',async(...args)=>{calls.push(args);return new Response(body(surface));});
  const config={profile:{designs:[{id:'original',objects:[{id:'name',text:'Unverändert',x:12.345}]}]},localResources:{fonts:{},lazyMaterialSurface:{url},photoExamples:[{assetId:'same-photo'}]}};
  const other=structuredClone(config),expected=structuredClone(config);expected.materialSurface=surface;delete expected.localResources.lazyMaterialSurface;
  await Promise.all([loader.hydrateMaterialSurface(config),loader.hydrateMaterialSurface(other)]);
  assert.deepEqual(config,expected);assert.deepEqual(other,expected);assert.equal(calls.length,1);
  await loader.hydrateMaterialSurface(config);assert.equal(calls.length,1);
  assert.equal(sha(body(config.materialSurface)),sha(body(surface)));
});

test('failed material hydration leaves the transport model intact and supports retry',async t=>{
  const loader=await fresh(),url=urlFor('grundplatten',surface);let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(body(calls===1?'data:image/png;base64,WRONG':surface));});
  const config={localResources:{fonts:{},lazyMaterialSurface:{url}}},before=structuredClone(config);
  await assert.rejects(loader.hydrateMaterialSurface(config),e=>e.code==='browser_resource_integrity');assert.deepEqual(config,before);
  await loader.hydrateMaterialSurface(config);assert.equal(config.materialSurface,surface);assert.equal(config.localResources.lazyMaterialSurface,undefined);assert.equal(calls,2);
});

test('ordinary inline material is untouched and invalid lazy markers never issue requests',async()=>{
  const {hydrateMaterialSurface}=await fresh(),get=()=>{throw Error('must not request');};
  const inline={materialSurface:surface,localResources:{fonts:{}}};await hydrateMaterialSurface(inline,{get});assert.equal(inline.materialSurface,surface);
  for(const marker of [null,[],{}, {url:urlFor('schriften',font)}, {url:'/other/image.json'}]){
    const config={localResources:{lazyMaterialSurface:marker}};
    await assert.rejects(hydrateMaterialSurface(config,{get}),e=>e.code==='browser_resource_material');assert.equal(config.localResources.lazyMaterialSurface,marker);
  }
});

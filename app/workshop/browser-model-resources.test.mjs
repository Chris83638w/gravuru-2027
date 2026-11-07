import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {createBrowserModelResources} from './browser-model-resources.mjs';
import {productFontIndex} from '../configurator/variant-m/lazy-resources-model.mjs';
import {fetchResourceJSON,hydrateMaterialSurface,isBrowserResourceUrl} from '../configurator/variant-m/browser-model-resources.mjs';

const prefix='/originale/editor/ressourcen';
const sha=value=>createHash('sha256').update(value).digest('hex');
const bytes=value=>Buffer.from(JSON.stringify(value));
const font=(label='A')=>({label,category:'serif',regular:{unitsPerEm:1000,glyphs:{'Ä':{advance:700,path:'M 0 0 L 3.25 5 Z'},'ß':{advance:502,path:'M 4 5 Z'}},kerning:{'Äß':-12}},bold:{glyphs:{'Ä':{path:'M 1 1 Z'}}},italic:{glyphs:{'Ä':{path:'M 2 3 Z'}}},boldItalic:{glyphs:{'ä':{path:'M 5 7 Z'}}},metadata:{license:'L 2026',range:[0,255],sample:'Schöne Grüße'}});
const config=(fonts={Example:font()})=>({id:'cfg_test',materialSurface:'data:image/png;base64,AP8AAEFC',profile:{designs:[{id:'native_1',objects:[{type:'text',text:'Äß',font:Object.keys(fonts)[0]}]}]},localResources:{fonts,motifs:[{key:'unchanged'}]}});
const withoutImage=fonts=>{const model=config(fonts);delete model.materialSurface;return model;};
const actualConfig=model=>model.universal??model;
const urlFor=(model,name)=>actualConfig(model).localResources.lazyFonts.find(entry=>entry.name===name).url;
const legacyUrl='/legacy/schriften/'+sha('legacy')+'.json';

test('transport clones all glyph/style payloads and material bytes without changing native model',()=>{
  const source={product:{revision:7},universal:config({Example:font(),Other:font('B')})};
  const original=structuredClone(source),store=createBrowserModelResources({prefix});
  const transported=store.prepare(source),cfg=transported.universal;
  assert.deepEqual(source,original);assert.notEqual(transported,source);
  assert.deepEqual(cfg.localResources.fonts,{});assert.equal(cfg.materialSurface,undefined);
  for(const entry of cfg.localResources.lazyFonts){
    assert.match(entry.url,/\/ressourcen\/[a-f0-9]{32}\/schriften\/[a-f0-9]{64}\.json$/);
    const response=store.read(entry.url),expected=bytes(source.universal.localResources.fonts[entry.name]);
    assert.deepEqual(response.body,expected);assert.equal(response.hash,sha(expected));
    assert.equal(response.contentType,'application/json; charset=utf-8');
    assert.equal(entry.label,source.universal.localResources.fonts[entry.name].label);
    assert.equal(entry.category,'serif');
    cfg.localResources.fonts[entry.name]=JSON.parse(response.body);
  }
  delete cfg.localResources.lazyFonts;
  const material=store.read(cfg.localResources.lazyMaterialSurface.url);
  assert.deepEqual(material.body,bytes(source.universal.materialSurface));
  cfg.materialSurface=JSON.parse(material.body);delete cfg.localResources.lazyMaterialSurface;
  assert.deepEqual(transported,source);
});

test('full font hashing deduplicates products and aliases but distinguishes italic-only changes',()=>{
  const store=createBrowserModelResources({prefix}),a=font(),b=structuredClone(a);
  const first=store.prepare(withoutImage({First:a,Alias:a}));
  const second=store.prepare(withoutImage({Across:b}));
  assert.equal(urlFor(first,'First'),urlFor(first,'Alias'));
  assert.equal(urlFor(first,'First'),urlFor(second,'Across'));
  b.italic.glyphs['Ä'].path='M 9 9 Z';
  const different=store.prepare(withoutImage({Across:b}));
  assert.notEqual(urlFor(first,'First'),urlFor(different,'Across'));
  assert.deepEqual(JSON.parse(store.read(urlFor(first,'First')).body),a);
});

test('PNG/JPEG/WebP use exact dataURL JSON and other material sources stay unchanged',()=>{
  const store=createBrowserModelResources({prefix});
  for(const kind of ['png','jpeg','webp']){
    const model=config({});model.materialSurface='data:image/'+kind+';base64,AA+/==';
    const prepared=store.prepare(model),response=store.read(prepared.localResources.lazyMaterialSurface.url);
    assert.deepEqual(response.body,bytes(model.materialSurface));assert.equal(JSON.parse(response.body),model.materialSurface);
  }
  for(const value of ['/material/slate.png','https://example.invalid/plate.png','data:image/svg+xml;base64,PHN2Zz4=']){
    const model=config({});model.materialSurface=value;
    assert.deepEqual(store.prepare(model),model);
  }
});

test('existing lazy metadata is retained and same-name inline font replaces only its lazy URL',()=>{
  const store=createBrowserModelResources({prefix}),model=withoutImage({Example:font()});
  model.localResources.lazyFonts=[{name:'Keep',url:legacyUrl,label:'Existing',category:'script',custom:'retained'},{name:'Example',url:legacyUrl,label:'Old',custom:'same-name'}];
  model.localResources.lazyMaterialSurface={url:'/unchanged/material.json'};
  const prepared=store.prepare(model),entries=prepared.localResources.lazyFonts;
  assert.deepEqual(entries[0],model.localResources.lazyFonts[0]);
  assert.equal(entries[1].custom,'same-name');assert.equal(entries[1].label,'A');assert.notEqual(entries[1].url,legacyUrl);
  assert.deepEqual(prepared.localResources.lazyMaterialSurface,model.localResources.lazyMaterialSurface);
  assert.deepEqual(model.localResources.fonts,{Example:font()});
});

test('more than 64 fonts and unsupported lazy names stay inline without model rejection',()=>{
  const fonts=Object.fromEntries(Array.from({length:68},(_,i)=>['Font '+i,font('F'+i)]));
  fonts['x'.repeat(121)]=font('Long');fonts['   ']=font('Blank');
  const store=createBrowserModelResources({prefix}),model=withoutImage(fonts),prepared=store.prepare(model);
  assert.equal(productFontIndex(prepared).length,64);
  assert.deepEqual(Object.keys(prepared.localResources.fonts),['Font 64','Font 65','Font 66','Font 67','x'.repeat(121),'   ']);
  for(const [name,value] of Object.entries(prepared.localResources.fonts))assert.deepEqual(value,fonts[name]);
  assert.equal(Object.keys(model.localResources.fonts).length,70);
});

test('existing lazy entries count toward 64 while inline collisions reuse their slot',()=>{
  const store=createBrowserModelResources({prefix}),model=withoutImage({Existing0:font('updated'),New1:font('new1'),New2:font('new2')});
  model.localResources.lazyFonts=Array.from({length:63},(_,i)=>({name:'Existing'+i,url:legacyUrl}));
  const prepared=store.prepare(model);
  assert.equal(productFontIndex(prepared).length,64);
  assert.deepEqual(prepared.localResources.fonts,{New2:model.localResources.fonts.New2});
  assert.notEqual(urlFor(prepared,'Existing0'),legacyUrl);assert.ok(urlFor(prepared,'New1'));
});

test('existing invalid lazy URLs fail before cache admission instead of becoming a remote resource',()=>{
  const store=createBrowserModelResources({prefix}),model=withoutImage({Example:font()});
  model.localResources.lazyFonts=[{name:'Remote',url:'https://example.invalid/font.json'}];
  assert.throws(()=>store.prepare(model),/Produktschrift/);
  assert.equal(model.localResources.fonts.Example.label,'A');
});

test('byte-bounded LRU recovers emitted resources from one pinned callback',()=>{
  const model=withoutImage({A:font('A'),B:font('B')}),limit=bytes(model.localResources.fonts.A).length;
  let calls=0;const source=()=>{calls++;return structuredClone(model);};
  const store=createBrowserModelResources({prefix,maxBytes:limit,maxEntries:4});
  const prepared=store.prepare(model,{source});assert.equal(calls,1);calls=0;
  const a=urlFor(prepared,'A'),b=urlFor(prepared,'B');
  assert.ok(store.read(b));assert.equal(calls,0);
  assert.deepEqual(store.read(a).body,bytes(model.localResources.fonts.A));assert.equal(calls,1);
  assert.ok(store.read(a));assert.equal(calls,1);
  assert.ok(store.read(b));assert.equal(calls,2);
});

test('a single oversized body is served transiently and never retained above maxBytes',()=>{
  const model=withoutImage({A:font()}),store=createBrowserModelResources({prefix,maxBytes:1});let calls=0;
  const prepared=store.prepare(model,{source:()=>{calls++;return model;}});assert.equal(calls,1);calls=0;
  const url=urlFor(prepared,'A');
  assert.deepEqual(store.read(url).body,bytes(model.localResources.fonts.A));
  assert.deepEqual(store.read(url).body,bytes(model.localResources.fonts.A));
  assert.equal(calls,2);
});

test('metadata is entry-bounded LRU and unknown or evicted URLs never call a source',()=>{
  const store=createBrowserModelResources({prefix,maxEntries:2});let calls=0;
  const prepare=label=>{const model=withoutImage({Font:font(label)});return store.prepare(model,{source:()=>{calls++;return model;}});};
  const a=urlFor(prepare('A'),'Font'),b=urlFor(prepare('B'),'Font');
  assert.ok(store.read(a));
  const c=urlFor(prepare('C'),'Font');calls=0;
  assert.equal(store.read(b),null);assert.equal(calls,0);
  assert.ok(store.read(a));assert.ok(store.read(c));assert.equal(calls,0);
  const unknown=a.replace(/[a-f0-9]{64}\.json$/,'f'.repeat(64)+'.json');
  assert.equal(store.read(unknown),null);assert.equal(calls,0);
});

test('no-source capacity failures happen before admission and leave existing resources intact',()=>{
  const one=withoutImage({A:font('A')}),limit=bytes(one.localResources.fonts.A).length;
  const store=createBrowserModelResources({prefix,maxBytes:limit,maxEntries:2});
  const first=store.prepare(one),firstUrl=urlFor(first,'A');
  assert.throws(()=>store.prepare(withoutImage({A:font('B'),B:font('C')})),{code:'browser_resources_capacity'});
  assert.ok(store.read(firstUrl));
  assert.throws(()=>store.prepare(withoutImage({A:font('B'),B:font('C'),C:font('D')}),{source:()=>withoutImage({A:font('B'),B:font('C'),C:font('D')})}),{code:'browser_resources_capacity'});
  assert.ok(store.read(firstUrl));
});

test('a changed or missing pinned source leaves non-reconstructable values inline during prepare',()=>{
  const model=config({Matching:font('A'),Missing:font('B'),Changed:font('C')});
  const pinned=config({Matching:font('A'),Changed:font('different')});pinned.materialSurface='data:image/png;base64,different';
  const store=createBrowserModelResources({prefix,maxBytes:1});let calls=0;
  const prepared=store.prepare(model,{source:()=>{calls++;return pinned;}});
  assert.equal(calls,1);assert.equal(prepared.localResources.lazyFonts.length,1);
  assert.equal(prepared.localResources.lazyFonts[0].name,'Matching');
  assert.deepEqual(prepared.localResources.fonts,{Missing:model.localResources.fonts.Missing,Changed:model.localResources.fonts.Changed});
  assert.equal(prepared.materialSurface,model.materialSurface);assert.equal(prepared.localResources.lazyMaterialSurface,undefined);
  assert.deepEqual(store.read(urlFor(prepared,'Matching')).body,bytes(model.localResources.fonts.Matching));
  assert.deepEqual(store.prepare(model,{source:()=>{throw Error('unavailable');}}),model);
});

test('source mismatch after preparation fails closed for fonts and images, then allows an exact retry',()=>{
  const model=config({A:font('A')}),store=createBrowserModelResources({prefix,maxBytes:1});let current=structuredClone(model);
  const prepared=store.prepare(model,{source:()=>current});
  const fontUrl=urlFor(prepared,'A'),imageUrl=prepared.localResources.lazyMaterialSurface.url;
  current.localResources.fonts.A.boldItalic.glyphs['ä'].path='M 9 9 Z';
  current.materialSurface='data:image/png;base64,bmV3';
  assert.equal(store.read(fontUrl),null);assert.equal(store.read(imageUrl),null);
  current={localResources:{fonts:{}}};assert.equal(store.read(fontUrl),null);assert.equal(store.read(imageUrl),null);
  current=structuredClone(model);
  assert.deepEqual(store.read(fontUrl).body,bytes(model.localResources.fonts.A));
  assert.deepEqual(store.read(imageUrl).body,bytes(model.materialSurface));
});

test('deduplication preserves the source font selector when a later alias has no callback',()=>{
  const model=withoutImage({Original:font('A')}),limit=bytes(model.localResources.fonts.Original).length;
  const store=createBrowserModelResources({prefix,maxBytes:limit});let calls=0;
  const first=store.prepare(model,{source:()=>{calls++;return model;}});
  const alias=store.prepare(withoutImage({Alias:font('A')}));
  store.prepare(withoutImage({Other:font('B')}));calls=0;
  assert.equal(urlFor(first,'Original'),urlFor(alias,'Alias'));
  assert.deepEqual(store.read(urlFor(alias,'Alias')).body,bytes(model.localResources.fonts.Original));assert.equal(calls,1);
});

test('private tokens and path validation do not authorize unknown source reads',()=>{
  const model=withoutImage({A:font()}),one=createBrowserModelResources({prefix}),two=createBrowserModelResources({prefix});let calls=0;
  const a=urlFor(one.prepare(model,{source:()=>{calls++;return model;}}),'A'),b=urlFor(two.prepare(model),'A');calls=0;
  assert.notEqual(a,b);assert.equal(one.read(b),null);assert.equal(two.read(a),null);
  for(const path of [a+'?x=1',a+'/extra',a.replace('/schriften/','/../schriften/'),a.replace('.json','.png'),'https://host.invalid'+a,null,42]){
    assert.equal(one.matches(path),false);assert.equal(one.read(path),null);
  }
  const unknown=a.replace(/[a-f0-9]{64}\.json$/,'0'.repeat(64)+'.json');
  assert.equal(one.matches(unknown),true);assert.equal(one.read(unknown),null);assert.equal(calls,0);
});

test('caller mutation cannot modify the cached bytes or another prepared model',()=>{
  const model=withoutImage({A:font()}),store=createBrowserModelResources({prefix});
  const a=store.prepare(model),b=store.prepare(model),url=urlFor(a,'A'),expected=bytes(model.localResources.fonts.A);
  store.read(url).body.fill(0);assert.deepEqual(store.read(url).body,expected);
  a.localResources.lazyFonts[0].label='changed';assert.equal(b.localResources.lazyFonts[0].label,'A');
  assert.equal(model.localResources.fonts.A.label,'A');
});

test('synchronous contract safely keeps async/unavailable sources inline',async()=>{
  const model=config(),store=createBrowserModelResources({prefix,maxBytes:1});
  assert.deepEqual(store.prepare(model,{source:async()=>{throw Error('async unavailable');}}),model);
  await new Promise(resolve=>setImmediate(resolve));
  assert.throws(()=>store.prepare(model,{source:5}),/callback/);
  for(const settings of [{prefix:'https://remote.invalid'},{prefix:'/local/'},{prefix,maxBytes:0},{prefix,maxEntries:Infinity}])
    assert.throws(()=>createBrowserModelResources(settings),TypeError);
});

test('actual browser loader verifies and hydrates prepared full font/material payloads',async()=>{
  const model=config({Example:font()}),store=createBrowserModelResources({prefix}),prepared=store.prepare(model);
  const get=url=>fetchResourceJSON(url,{subtle:webcrypto.subtle,fetcher:async path=>{
    const response=store.read(path);assert.ok(response);
    return {ok:true,arrayBuffer:async()=>Uint8Array.from(response.body).buffer};
  }});
  for(const entry of productFontIndex(prepared)){
    assert.equal(isBrowserResourceUrl(entry.url),true);
    prepared.localResources.fonts[entry.name]=await get(entry.url);
  }
  delete prepared.localResources.lazyFonts;
  assert.equal(isBrowserResourceUrl(prepared.localResources.lazyMaterialSurface.url),true);
  await hydrateMaterialSurface(prepared,{get});
  assert.deepEqual(prepared,model);
});

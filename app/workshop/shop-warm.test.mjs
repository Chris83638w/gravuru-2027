import test from 'node:test';
import assert from 'node:assert/strict';
import {shopWarmManifest} from './shop-warm-manifest.mjs';
import {validWarmManifest,warmShopAssets,warmAssetPaths,currentEditorBundle,currentEditorBundles} from './ui/shop-warm.mjs';
const hash='a'.repeat(64),key='import-'+'b'.repeat(24),bundle='/_acryl-bundle/editor-'+ 'c'.repeat(16)+'.mjs';
const manifest={schema:'gravuru-shop-warm/v1',editorPath:'/_merchant-acryl-editor.html',catalogPath:'/_acryl-runtime/lazy/katalog-kern.json',fonts:[{name:'Native',url:'/konfigurator/shop/schriften/'+hash+'.json'},{name:'Allura'}],motifs:[key]};
test('manifest derives exact selected template resources without changing or exporting designs/prices/uploads',()=>{
 const c={profile:{defaultDesignId:'start',designs:[{id:'other',objects:[{type:'text',font:'Unused'}]},{id:'start',objects:[{type:'text',font:'Native',text:'PRIVATE CUSTOMER NAME'},{type:'photoSlot',src:'blob:private'}]}]},basePriceCents:1999,localResources:{lazyFonts:[{name:'Native',url:manifest.fonts[0].url}]},motifTheme:'home'};
 const before=structuredClone(c),m=shopWarmManifest(c,{editorPath:manifest.editorPath});assert.deepEqual(c,before);assert.equal(m.fonts.length,1);assert.equal(m.fonts[0].url,manifest.fonts[0].url);assert.equal(m.motifs.length,6);assert.doesNotMatch(JSON.stringify(m),/PRIVATE|blob:|1999|Unused/);assert.ok(validWarmManifest(m));
 c.moduleProfile={modules:{motifs:false}};assert.deepEqual(shopWarmManifest(c,{editorPath:manifest.editorPath}).motifs,[]);
 assert.equal(shopWarmManifest(c,{editorPath:'/_merchant-editor.html'}),null);
 assert.equal(shopWarmManifest(c,{editorPath:manifest.editorPath,pagePath:'/other/shop/'}),null);
 delete c.moduleProfile;delete c.motifTheme;assert.equal(shopWarmManifest(c,{editorPath:manifest.editorPath}).motifs.length,6);
 c.workshopProfiles={selections:{motifs:[]}};assert.deepEqual(shopWarmManifest(c,{editorPath:manifest.editorPath}).motifs,[]);
 c.workshopProfiles={selections:{bestsellers:[]}};assert.deepEqual(shopWarmManifest(c,{editorPath:manifest.editorPath}).motifs,[]);
});
test('only current link bundle, allowlisted public resources; no arbitrary URLs or historical bundles',()=>{
 assert.equal(currentEditorBundle('<script>const obsolete="/_acryl-bundle/editor-0000000000000000.mjs"</script><link rel="modulepreload" href="'+bundle+'">'),bundle);
 assert.deepEqual(warmAssetPaths(manifest,{font_index:[{name:'Allura',file:'allura.json'}],motif_index:[{key}]}),[manifest.fonts[0].url,'/_acryl-runtime/lazy/schriften/allura.json','/_acryl-runtime/lazy/motive/'+key+'.json']);
 for(const url of ['https://evil/font.json','/api/shop-entry/model','/konfigurator/shop/schriften/../model','/konfigurator/shop/schriften/'+hash+'.json?secret=1'])assert.equal(validWarmManifest({...manifest,fonts:[{name:'x',url}]}),false);
 assert.equal(validWarmManifest({...manifest,motifs:Array(7).fill(key)}),false);
});
test('only the current core and explicitly marked R15 chunk are warmed, with unchanged budgets and two workers',async()=>{
 const r15=bundle.replace('c'.repeat(16),'d'.repeat(16)),device=bundle.replace('c'.repeat(16),'e'.repeat(16)),other=bundle.replace('c'.repeat(16),'f'.repeat(16));
 const html='<script>const old=\'<link rel="modulepreload" href="'+other+'">\';</script>'+[
  `<link rel="modulepreload" href="${device}" data-gravuru-bundle="device">`,
  `<link rel="modulepreload" href="${bundle}">`,
  `<link rel="modulepreload" href="${r15}" data-gravuru-bundle="prio-r15">`,
  `<link rel="modulepreload" href="${device}" data-gravuru-bundle="device">`,
  `<link rel="modulepreload" href="${other}" data-gravuru-bundle="prio-r15">`,
  `<link rel="modulepreload" href="https://foreign.example${r15}" data-gravuru-bundle="prio-r15">`
 ].join('');
 assert.deepEqual(currentEditorBundles(html),[bundle,r15]);assert.equal(currentEditorBundle(html),bundle);
 assert.deepEqual(currentEditorBundles(`<link rel="modulepreload" href="${bundle}?token=private">`),[]);
 let active=0,max=0;const calls=[];
 const result=await warmShopAssets(manifest,{fetchImpl:async(path,options)=>{calls.push(path);active++;max=Math.max(max,active);await new Promise(r=>setImmediate(r));active--;assert.equal(options.priority,'low');return new Response(path===manifest.catalogPath?'{}':path===manifest.editorPath?html:'asset');}});
 assert.equal(max,2);assert.deepEqual(result.requests.filter(p=>p.includes('/_acryl-bundle/')),[bundle,r15]);
 assert.equal(calls.filter(p=>p===r15).length,1);assert.ok(!calls.includes(device));assert.ok(!calls.includes(other));
});
test('warmup fetches bounded assets at low priority, never initializes editor/model or full library',async()=>{
 const calls=[],core={font_index:[{name:'Allura',file:'allura.json'}],motif_index:[{key}]};
 let active=0,max=0;
 const result=await warmShopAssets(manifest,{fetchImpl:async(path,options)=>{calls.push([path,options]);active++;max=Math.max(max,active);await new Promise(r=>setImmediate(r));active--;return new Response(path===manifest.catalogPath?JSON.stringify(core):path===manifest.editorPath?'<link rel="modulepreload" href="'+bundle+'">':'data');}});
 assert.equal(max,2);assert.equal(result.requests.length,6);assert.ok(calls.every(([,o])=>o.priority==='low'&&o.redirect==='error'));
 assert.ok(!calls.some(([p])=>/motive-alle|api\/|model|draft/.test(p)));assert.equal(calls.filter(([p])=>p===bundle).length,1);
});
test('Save-Data, 2g and invalid manifests make zero requests; failures stay optional',async()=>{
 for(const connection of [{saveData:true},{effectiveType:'2g'},{effectiveType:'slow-2g'}])assert.equal((await warmShopAssets(manifest,{connection,fetchImpl:()=>{throw Error('must not fetch');}})).skipped,true);
 assert.equal((await warmShopAssets({}, {fetchImpl:()=>{throw Error('must not fetch');}})).skipped,true);
 const result=await warmShopAssets(manifest,{fetchImpl:async()=>{throw Error('offline');}});assert.equal(result.skipped,false);
});
test('oversized responses are cancelled; speculative decoded byte budget is bounded',async()=>{
 let cancelled=0;const result=await warmShopAssets(manifest,{fetchImpl:async()=>new Response(new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(2*1024*1024));},cancel(){cancelled++;}}))});
 assert.ok(cancelled>=2&&cancelled<=3);assert.ok(result.requests.length<=3);
});

test('public template warmup accepts at most three exact public hash URLs within the existing worker budget',async()=>{
 const previews=['a','b','c'].map(c=>'/konfigurator/shop/vorschauen/'+c.repeat(64)+'.svg'),m={...manifest,previews};
 assert.ok(validWarmManifest(m));assert.deepEqual(warmAssetPaths(m,{}).slice(-3),previews);
 for(const bad of [['/api/shop-entry/private'],[previews[0]+'?token=secret'],['https://foreign.example/a.svg'],[...previews,previews[0]]])assert.equal(validWarmManifest({...manifest,previews:bad}),false);
 const config={profile:{designs:[]},workshopProfiles:{selections:{motifs:[]}}};assert.deepEqual(shopWarmManifest(config,{editorPath:manifest.editorPath,previews:[...previews,'/api/private']}).previews,previews);
 let active=0,max=0;const result=await warmShopAssets(m,{fetchImpl:async(p,o)=>{assert.equal(o.priority,'low');active++;max=Math.max(max,active);await new Promise(r=>setImmediate(r));active--;return new Response(p===manifest.catalogPath?'{}':p===manifest.editorPath?'<link rel="modulepreload" href="'+bundle+'">':'<svg/>');}});
 assert.equal(max,2);assert.deepEqual(result.requests.filter(p=>p.includes('/vorschauen/')),previews);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {build,LAZY,ROOT,HERE} from './build.mjs';
import {createPreviewServer,acceptsGzip} from './server.mjs';
import {fontFileName,startNeeds,draftNeeds,resourceNeeds,lazyUrls,libraryEntries,LAZY_BASE,productFontIndex} from './lazy-resources-model.mjs';
import {localFontIds} from './local-pilot.mjs';
import {readRuntimeBundles,splitRuntimeBundles,patchEditorLoading,BASE_FONT_CATEGORIES} from './lazy-resources-build.mjs';
test('contour validation hydrates actual outlines for every switchable size and reuses the font cache',async()=>{
 const loader=await import('./lazy-resources.mjs?contour-validation'),url='/konfigurator/shop/schriften/'+'a'.repeat(64)+'.json',font={regular:{units:1000,glyphs:{A:{a:500,d:'M0 0H500V700H0Z'}}}};
 const c={profile:{geometry:{shape:'contour'},designs:[]},familyFormats:{designs:[{objects:[{type:'text',font:'ContourFont'}]}]},localResources:{fonts:{},lazyFonts:[{name:'ContourFont',url}]}};
 let calls=0;const get=async u=>{assert.equal(u,url);calls++;return font;};
 await loader.hydrateContourFonts(c,{get});assert.deepEqual(c.localResources.fonts.ContourFont,font);
 c.localResources.fonts={};await loader.hydrateContourFonts(c,{get});assert.equal(calls,1);
 const rect=structuredClone(c);rect.profile.geometry.shape='rect';rect.localResources.fonts={};await loader.hydrateContourFonts(rect,{get:()=>{throw Error('rect must not preload contour fonts');}});
});
// Jeder Test lädt eine eigene Modulinstanz (eigene Zwischenspeicher für Schriften/Bibliothek).
const freshLoader=name=>import('./lazy-resources.mjs?'+name);

test('an editor can extend a shared catalog without changing the objects handed to another editor',async()=>{
 const loader=await freshLoader('shared-catalog');
 const url='/konfigurator/shop/schriften/'+'a'.repeat(64)+'.json';
 const raw={font_index:[],fonts:{},motifs:{},motif_index:[]};
 const font={regular:{units:1000,glyphs:{}}};
 const get=async path=>path===url?font:raw;
 const profile={designs:[{objects:[{type:'text',font:'Eigene'}]}]};
 const first=await loader.loadStart({profile,localResources:{lazyFonts:[{name:'Eigene',url}]}},{get});
 const second=await loader.loadStart({profile:{designs:[]}},{get});
 assert.deepEqual(first.catalog.fonts,{Eigene:font});
 assert.deepEqual(first.catalog.font_index,[{name:'Eigene',url}]);
 assert.deepEqual(raw,{font_index:[],fonts:{},motifs:{},motif_index:[]});
 assert.deepEqual(second.catalog,raw);
});

const runtime=path.join(ROOT,'designs/aosu-labrador/runtime');
const editorSource=()=>fs.readFileSync(path.join(ROOT,'references/aosu-upgrade-2026-09-21/verification/editor-source.html'),'utf8');
const sourceUrls=()=>JSON.parse(editorSource().match(/<script[^>]*id="preview-urls"[^>]*>([\s\S]*?)<\/script>/)[1]);
const acrylModel=()=>{build();return JSON.parse(fs.readFileSync(path.join(HERE,'.preview/models.json'),'utf8'))[0].universal;};

test('Startregel: nur Schriften/Bibliotheksmotive aus Designs des Produkts; Acryl braucht keine Katalogschrift',()=>{
  const acryl=acrylModel();
  assert.deepEqual(startNeeds(acryl,{baseMotifs:['heart']}),{fonts:[],motifs:[]});
  const config={localResources:{fonts:{'Garamond Acryl':{}},motifs:[{key:'acryl-pin'}]},profile:{designs:[
    {objects:[{type:'text',font:'Garamond Acryl'},{type:'text',font:'Lora'},{type:'motif',motif:'acryl-pin'},{type:'motif',motif:'heart'}]},
    {objects:[{type:'text',font:'Lora'},{type:'text',font:'Great Vibes'},{type:'motif',motif:'import-abc'},{type:'motif',motif:'ux-line-x-0'},{type:'photoSlot'}]}]}};
  assert.deepEqual(startNeeds(config,{baseMotifs:['heart']}),{fonts:['Lora','Great Vibes'],motifs:['import-abc']});
  assert.deepEqual(draftNeeds({design:{objects:[{type:'text',font:'Caveat'},{type:'motif',motif:'import-x'}]}},{localFonts:['Lora']}),{fonts:['Caveat'],motifs:['import-x']});
  assert.deepEqual(draftNeeds(null),{fonts:[],motifs:[]});
  assert.deepEqual(resourceNeeds([{type:'text',font:42},{type:'motif',motif:null}]),{fonts:[],motifs:[]});
});

test('Nachlade-URLs nur für bekannte Namen; Dateinamen stabil; Bibliotheksreihenfolge bleibt',()=>{
  assert.equal(fontFileName('Lora Italic'),'lora-italic.json');
  assert.equal(fontFileName('Source Code Pro'),'source-code-pro.json');
  assert.throws(()=>fontFileName('***'),/Ungültiger Schriftname/);
  const urls=lazyUrls({fonts:['Lora','Unbekannt'],motifs:['import-a','../x','import-z']},{fontIndex:[{name:'Lora',file:'lora.json'}],motifIndex:[{key:'import-a'},{key:'../x'}]});
  assert.deepEqual(urls,{fonts:[{name:'Lora',url:LAZY_BASE+'schriften/lora.json'}],motifs:[{key:'import-a',url:LAZY_BASE+'motive/import-a.json'}]});
  const entries=libraryEntries([{key:'a',name:'A',category:'K'},{key:'b',name:'B',category:'K'}],[{key:'b',name:'B',category:'K',svgFragment:'<path/>',bounds:[0,0,1,1]}]);
  assert.deepEqual(entries.map(e=>[e.key,typeof e.svgFragment]),[['a','undefined'],['b','string']]);
});

test('Zerlegung der geprüften Pakete: 30 Schriften mit Kategorie, 703 Motive, Kern ohne Konturen und Vorschaubilder',()=>{
  const bundles=readRuntimeBundles(runtime,sourceUrls()),parts=splitRuntimeBundles(bundles);
  assert.equal(parts.core.font_index.length,30);assert.equal(parts.motifs.length,703);assert.equal(parts.core.motif_index.length,703);
  assert.deepEqual(parts.core.fonts,{});
  assert.ok(parts.core.designs.length>0&&parts.core.designs.every(d=>d.preview===undefined&&Array.isArray(d.objects)));
  assert.equal(Object.keys(parts.core.motifs).length,18);
  for(const [name,category] of Object.entries(BASE_FONT_CATEGORIES))assert.equal(parts.core.font_index.find(f=>f.name===name).category,category);
  assert.ok(parts.core.font_index.every(f=>f.category&&f.file.endsWith('.json')));
  // Inhalt identisch zu den Paketen: Konturen und Motive werden nur umverpackt.
  assert.deepEqual(parts.fonts.Nunito,bundles.extraFonts.Nunito);
  assert.deepEqual(parts.fonts.Lora.regular,bundles.catalog.fonts.Lora.regular);
  assert.deepEqual(parts.motifs[5],bundles.motifs[5]);
  assert.ok(JSON.stringify(parts.core).length<1_300_000);
});

test('Build schreibt die Teile mit Stempel und baut die Editor-Anpassungen genau einmal ein',()=>{
  const result=build();assert.deepEqual(result.lazyResources,{fonts:30,motifs:703});
  const stamp=JSON.parse(fs.readFileSync(path.join(LAZY,'stempel.json'),'utf8'));assert.equal(stamp.format,'gravuru-lazy-runtime/v1');
  for(const file of ['katalog-kern.json','motive-alle.json','schriften/lora.json','schriften/great-vibes.json','motive/import-59b5854feb26a2bf2754a477.json'])assert.ok(fs.statSync(path.join(LAZY,file)).size>100,file);
  const editor=fs.readFileSync(path.join(HERE,'.preview/editor.html'),'utf8');
  assert.match(editor,/import\('\/configurator\/variant-m\/lazy-resources\.mjs'\)/);
  assert.match(editor,/if\(!window\.parent\.UniversalConfig\)await ensureScrew\(\);/);
  assert.match(editor,/schraubenkopf-fotorealistisch\.webp/);assert.doesNotMatch(editor,/\/_runtime\/images\/gravuru-schraubenkopf-fotorealistisch\.png/);
  assert.match(editor,/edelstahl-feine-maserung-vorschau\.webp/);assert.doesNotMatch(editor,/edelstahl-feine-maserung-vorschau\.png/);
  assert.match(editor,/!this\.materialData&&!window\.parent\.UniversalConfig\)try\{/);
  assert.match(editor,/el\.uxLibraryRefresh=\(\)=>\{renderBestsellers\(\);render\(\);\};/);
  assert.match(editor,/el\.uxFontChoicesRefresh=choices;/);
  // Der Altpfad (ohne Produktkonfiguration) lädt weiterhin alle Pakete.
  assert.match(editor,/\}else\{const base=JSON\.parse\(await fetchText\(urls\.catalog\)\);/);
  assert.throws(()=>patchEditorLoading('<html></html>'),/Ladezeit-Block nicht eindeutig/);
});

test('Server: Nachladeteile, WebP-Routen und gzip nur auf Anfrage; Pfadausbruch bleibt gesperrt',async()=>{
  build();
  const server=createPreviewServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;
  const request=(url,headers={})=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:url,headers},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});
  try{
    const plain=await request('/_runtime/lazy/katalog-kern.json');assert.equal(plain.status,200);assert.equal(plain.headers['content-encoding'],undefined);
    const core=JSON.parse(plain.body);assert.equal(core.font_index.length,30);
    const packed=await request('/_runtime/lazy/katalog-kern.json',{'Accept-Encoding':'gzip, deflate, br'});
    assert.equal(packed.headers['content-encoding'],'gzip');assert.equal(packed.headers.vary,'Accept-Encoding');
    assert.equal(Number(packed.headers['content-length']),packed.body.length);assert.ok(packed.body.length<plain.body.length/3);
    assert.deepEqual(zlib.gunzipSync(packed.body),plain.body);
    assert.equal((await request('/_runtime/lazy/schriften/lora.json')).status,200);
    assert.equal((await request('/_runtime/lazy/motive/import-59b5854feb26a2bf2754a477.json')).status,200);
    for(const name of ['scene-empty-v2','reference','base-buche-v2','base-klar-v2']){const r=await request('/acrylic-assets/'+name+'.webp',{'Accept-Encoding':'gzip'});assert.equal(r.status,200,name);assert.equal(r.headers['content-type'],'image/webp');assert.equal(r.headers['content-encoding'],undefined);}
    assert.equal((await request('/_runtime/images/gravuru-schraubenkopf-fotorealistisch.webp')).status,200);
    assert.equal((await request('/acrylic-assets/reference.png')).status,200);
    for(const route of ['/_runtime/lazy/%2e%2e/models.json','/_runtime/lazy/../editor.html','/_runtime/lazy/.hidden','/acrylic-assets/reference.gif'])assert.equal((await request(route)).status,404,route);
    const editor=await request('/editor.html',{'Accept-Encoding':'gzip;q=0'});assert.equal(editor.headers['content-encoding'],undefined);
  }finally{server.close();await once(server,'close');}
  assert.equal(acceptsGzip('gzip'),true);assert.equal(acceptsGzip('br, GZIP;q=0.5'),true);assert.equal(acceptsGzip('*'),true);
  assert.equal(acceptsGzip('gzip;q=0'),false);assert.equal(acceptsGzip('identity'),false);assert.equal(acceptsGzip(undefined),false);
});

test('Kundenbilder: WebP neben unveränderten PNG-Originalen, Szene/Sockel/Beispielfoto laden WebP',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(HERE,'customer-images.json'),'utf8')),repo=path.resolve(ROOT,'..');
  const sha=file=>createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex');
  assert.equal(manifest.files.length,10);
  for(const entry of manifest.files){
    assert.equal(sha(entry.source),entry.sourceSha256,entry.source);assert.equal(sha(entry.output),entry.sha256,entry.output);
    assert.equal(path.dirname(entry.output),path.dirname(entry.source));assert.ok(entry.output.endsWith('.webp'));
    assert.ok(entry.bytes<entry.sourceBytes/4,entry.output);
    assert.deepEqual([...fs.readFileSync(path.join(repo,entry.output)).subarray(8,12)].map(c=>String.fromCharCode(c)).join(''),'WEBP');
  }
  const scene=fs.readFileSync(path.join(HERE,'acrylic-scene.mjs'),'utf8');
  assert.match(scene,/ROOT\+'scene-empty-v2\.webp'/);assert.match(scene,/ROOT\+'reference\.webp'/);assert.match(scene,/replace\('\.png','-v2\.webp'\)/);
  for(const base of ['buche','eiche','nussbaum','klar','satiniert','holz-flach'])assert.ok(manifest.files.some(f=>f.output.endsWith('base-'+base+'-v2.webp')),base);
});

test('Prüfansicht/Miniatur: Größenregeln treffen nur das äußere Vorschau-SVG, nicht verschachtelte Motiv-SVGs',()=>{
  const css=['completion.css','workflow.css','usability.css','refinements.css'].map(f=>fs.readFileSync(path.join(HERE,f),'utf8')).join('\n');
  assert.doesNotMatch(css,/\[data-review-art\] svg\{/);assert.doesNotMatch(css,/\[data-design-preview-art\] svg\{/);assert.doesNotMatch(css,/\[data-mini-art\] svg\{/);
  assert.match(css,/\[data-review-art\]>svg\{height:100%!important;width:100%!important/);
});

function fakeEditor({attach}){
  const el={fontData:{'Garamond Acryl':{regular:{glyphs:{}}}},fontList:['Garamond Acryl'],motifs:{heart:'<path/>'},catalog:{motifs:{heart:'<path/>'},motif_bounds:{heart:[0,0,100,100]}},labels:{},dataset:{},events:[],
    shadowRoot:{querySelector:selector=>selector==='style[data-lazy-library-style]'?{}:null,append(){}},dispatchEvent(e){this.events.push(e.type);}};
  const catalog={fonts:{},font_index:[{name:'Lora',file:'lora.json'},{name:'Caveat',file:'caveat.json'}],motif_index:[{key:'import-a',name:'A',category:'K'},{key:'import-b',name:'B',category:'K'}]};
  const entries=libraryEntries(catalog.motif_index,[]);
  const requests=[];
  const get=async url=>{requests.push(url);await new Promise(r=>setTimeout(r,2));
    if(url.endsWith('/schriften/lora.json'))return {label:'Lora',category:'Klassisch & elegant',regular:{glyphs:{a:{d:'',a:1}}}};
    if(url.endsWith('/schriften/caveat.json'))return {label:'Caveat',regular:{glyphs:{}}};
    if(url.endsWith('/motive/import-a.json'))return {key:'import-a',name:'A',category:'K',svgFragment:'<circle/>',bounds:[0,0,100,100]};
    if(url.endsWith('/motive-alle.json'))return [{key:'import-a',name:'A',category:'K',svgFragment:'<circle/>',bounds:[0,0,100,100]},{key:'import-b',name:'B',category:'K',svgFragment:'<rect/>',bounds:[0,0,100,100]}];
    throw Error('unerwartet '+url);};
  const prepare=list=>{for(const m of list)m.bounds=[1,2,3,4];};
  attach(el,{catalog,entries,prepare,get,base:'/l/'});
  return {el,catalog,entries,requests};
}

test('Nachlader: Schriften einmal laden und in Editor + gemeinsamen Katalog eintragen; Entwurf lädt genau seine Ressourcen',async()=>{
  const {el,catalog,entries,requests}=fakeEditor(await freshLoader('schriften'));
  let refreshed=0;el.uxFontChoicesRefresh=()=>refreshed++;
  await Promise.all([el.uxEnsureFonts(['Lora','Unbekannt','Garamond Acryl']),el.uxEnsureFonts(['Lora'])]);
  assert.deepEqual(requests,['/l/schriften/lora.json']);assert.equal(el.fontData.Lora,catalog.fonts.Lora);assert.ok(el.fontList.includes('Lora'));assert.ok(refreshed>=1);
  assert.deepEqual(el.uxKnownFonts().sort(),['Caveat','Garamond Acryl','Lora']);
  await el.uxEnsureDraftResources({design:{objects:[{type:'text',font:'Lora'},{type:'text',font:'Caveat'},{type:'motif',motif:'import-a'},{type:'motif',motif:'heart'}]}});
  assert.deepEqual(requests,['/l/schriften/lora.json','/l/schriften/caveat.json','/l/motive/import-a.json']);
  assert.equal(el.motifs['import-a'],'<circle/>');assert.deepEqual(el.catalog.motif_bounds['import-a'],[1,2,3,4]);
  assert.equal(entries[0].svgFragment,'<circle/>');assert.equal(entries[1].svgFragment,undefined);
  assert.equal(el.uxMotifLibraryLoaded(),false);
});

test('Nachlader: Motivbibliothek einmal laden, Liste auffrischen, Fehler erlaubt neuen Versuch',async()=>{
  const {el,entries,requests}=fakeEditor(await freshLoader('bibliothek'));
  let refreshed=0;el.uxLibraryRefresh=()=>refreshed++;
  await Promise.all([el.uxEnsureMotifLibrary(),el.uxEnsureMotifLibrary()]);
  assert.deepEqual(requests,['/l/motive-alle.json']);assert.equal(refreshed,1);assert.equal(el.dataset.lazyLibrary,'ready');assert.deepEqual(el.events,['gravuru-motif-library']);
  assert.ok(entries.every(e=>typeof e.svgFragment==='string'));assert.equal(el.motifs['import-b'],'<rect/>');assert.equal(el.uxMotifLibraryLoaded(),true);
  await el.uxEnsureMotifLibrary();assert.equal(requests.length,1);
});

test('Nachlader: gescheiterter Bibliotheksabruf meldet „failed“ und erlaubt einen neuen Versuch',async()=>{
  // Eigene Modulinstanz, damit der Bibliothekszwischenspeicher des vorigen Tests nicht greift.
  const fresh=await freshLoader('fehlerfall');
  const {el,catalog,entries}=fakeEditor(fresh);let calls=0;
  fresh.attach(el,{catalog,entries,prepare:()=>{},base:'/l/',get:async()=>{calls++;if(calls===1)throw Error('Netz');return [{key:'import-a',name:'A',category:'K',svgFragment:'<g/>',bounds:[0,0,1,1]},{key:'import-b',name:'B',category:'K',svgFragment:'<g/>',bounds:[0,0,1,1]}];}});
  await assert.rejects(el.uxEnsureMotifLibrary(),/Netz/);assert.equal(el.dataset.lazyLibrary,'failed');
  await el.uxEnsureMotifLibrary();assert.equal(el.dataset.lazyLibrary,'ready');assert.equal(calls,2);
});

test('Startladen: Kern + benötigte Schriften parallel, unbekannte Schriftnamen werden nicht zum Fehler',async()=>{
  const requests=[];
  const get=async url=>{requests.push(url);
    if(url.endsWith('katalog-kern.json'))return {fonts:{},motifs:{heart:'<path/>'},motif_bounds:{},font_index:[{name:'Lora',file:'lora.json'}],motif_index:[{key:'import-a',name:'A',category:'K'},{key:'import-b',name:'B',category:'K'}]};
    if(url.endsWith('schriften/lora.json'))return {label:'Lora',regular:{glyphs:{}}};
    if(url.endsWith('motive/import-b.json'))return {key:'import-b',name:'B',category:'K',svgFragment:'<g/>',bounds:[0,0,100,100]};
    throw Error('404');};
  const config={profile:{designs:[{objects:[{type:'text',font:'Lora'},{type:'text',font:'Phantasie'},{type:'motif',motif:'import-b'},{type:'motif',motif:'heart'}]}]}};
  const {catalog,entries}=await (await freshLoader('start')).loadStart(config,{get,base:'/l/'});
  assert.deepEqual(Object.keys(catalog.fonts),['Lora']);
  assert.deepEqual(entries.map(e=>[e.key,!!e.svgFragment]),[['import-a',false],['import-b',true]]);
  // Die Schrift wird vor dem Kern angefragt (parallel), das Bibliotheksmotiv erst nach dem Kern.
  assert.ok(requests.indexOf('/l/schriften/lora.json')<requests.indexOf('/l/katalog-kern.json'));
  assert.ok(requests.indexOf('/l/motive/import-b.json')>requests.indexOf('/l/katalog-kern.json'));
  assert.ok(requests.includes('/l/schriften/phantasie.json'));
  assert.ok(!requests.some(u=>u.includes('heart')));
});

test('Kundenansicht verdrahtet: Reiter/Schritt Motive, Schriftauswahl, Text hinzufügen, Entwürfe und Export laden vorher',()=>{
  const read=f=>fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),f),'utf8');
  const ux=read('ux.mjs').replaceAll('\r\n','\n');
  assert.match(ux,/new MutationObserver\(\(\)=>\{if\(!panel\.hidden\)el\.uxEnsureVisibleMotifs\(\)/);
  assert.match(ux,/async function openFonts\(\)\{[\s\S]*?renderFontPage\(\);fontRows\?\.refresh\(\{retry:true\}\)/);
  assert.doesNotMatch(ux,/await el\.uxEnsureFonts\(selectionIds\(el\.uxKnownFonts/);
  assert.match(ux,/if\(action==='add-text'\)\{if\(!additions\.text\)return say\('[^']+'\);const font=[^;]+;try\{await el\.uxEnsureFonts\?\./);
  assert.match(ux,/await el\.uxEnsureDraftResources\(stored\.draft\);[\s\S]*?const savedSession=[^;]+;\n  const missingUploads=savedSession\?await sessionUploads\?\.restore\(savedSession\.uploads\|\|\[\]\):\[\];\n  if\(sessionGuard&&!config\?\.workbench\)\{/);
  assert.match(read('account-drafts.mjs'),/await el\.uxEnsureDraftResources\?\.\(draft\);\n\s*restoreDraft\(draft\);/);
  assert.match(read('adapter.mjs'),/await this\.uxEnsureDraftResources\?\.\(input\);this\.restoreDraft\(input\);/);
  assert.match(read('print-export.mjs'),/await el\.uxEnsureDraftResources\?\.\(\{design:\{objects:el\.state\.objects\}\}\);\n\s*const fingerprint=/);
});

test('Sitzungsstart wartet auf Ressourcen vor Wiederherstellung; ausstehende Designübernahme lädt keine alten Sitzungsressourcen',async()=>{
  const ux=fs.readFileSync(new URL('./ux.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
  const start=ux.indexOf('  const pendingDesignTransfer='),end=ux.indexOf('  }else sessionGuard=null;',start);
  assert.ok(start>=0&&end>start,'echter Sitzungsstart ist eindeutig vorhanden');
  const code=ux.slice(start,end+'  }else sessionGuard=null;'.length);
  for(const pending of [false,true]){
    const events=[],draft={design:{id:'saved',objects:[]}},banner={hidden:true},quantity={value:'1',dispatched:[],dispatchEvent(event){this.dispatched.push(event.type);}};let finishLoad;
    const loaded=new Promise(resolve=>{finishLoad=resolve;});
    const env={config:{},initialDraft:null,$:selector=>selector==='[data-fk-quantity]'?quantity:banner,say(){},cartEditParams:()=>null,location:{search:''},Event:class{constructor(type){this.type=type;}},sessionUploads:{restore:async()=>{events.push('uploads');return [];},prune:()=>events.push('prune')},
      window:{parent:{GravuruShopEntry:{designGallery:{hasPendingTransfer:()=>pending}}},addEventListener(){}},
      sessionGuard:{read(){events.push('read');return {draft};},recover(){events.push('recover');return {uploads:[],quantity:3};},arm(){events.push('arm');}},
      el:{state:{selected:'old'},draftPayload:()=>draft,sync(){events.push('sync');},async uxEnsureDraftResources(value){assert.equal(value,draft);events.push('load-start');await loaded;events.push('load-ready');}}};
    const running=vm.runInNewContext('(async()=>{'+code+'})()',env);
    if(!pending){assert.deepEqual(events,['read','load-start'],'keine Wiederherstellung solange Schriften/Motive fehlen');finishLoad();}
    await running;
    assert.deepEqual(events,pending?['arm','prune']:['read','load-start','load-ready','read','uploads','recover','sync','arm','prune']);
    assert.equal(banner.hidden,pending);assert.equal(env.el.state.selected,pending?'old':null);
    // Mengenkorrektur (Astra aea809f): die gesicherte Menge kommt mit der Sitzung zurück und löst die Preisberechnung aus.
    assert.equal(quantity.value,pending?'1':'3');assert.deepEqual(quantity.dispatched,pending?[]:['input']);
  }
});

test('Produktschriften: eigener Nachlade-Index mit inhaltsadressierter URL; Schriftauswahl und Entwürfe laden sie nach',async()=>{
  const hash='a'.repeat(64),url='/konfigurator/shop/schriften/'+hash+'.json';
  assert.deepEqual(productFontIndex({}),[]);
  assert.deepEqual(productFontIndex({localResources:{lazyFonts:[{name:'Lato Regular · c3d3',url,label:'Lato',category:'Schlicht'}]}}),[{name:'Lato Regular · c3d3',url,label:'Lato',category:'Schlicht'}]);
  for(const bad of ['x',[{name:'',url}],[{name:'A',url:'https://fremd.example/schriften/'+hash+'.json'}],[{name:'A',url:'/konfigurator/shop/schriften/../x.json'}],[{name:'A',url:'/k/schriften/abc.json'}]])
    assert.throws(()=>productFontIndex({localResources:{lazyFonts:bad}}),/Produktschrift/);
  // Nachlade-URLs: Produktschrift über ihre URL, Katalogschrift wie bisher.
  const urls=lazyUrls({fonts:['Lato','Lora']},{fontIndex:[{name:'Lato',url},{name:'Lora',file:'lora.json'},{name:'Böse',url:'/../x'}]},'/l/');
  assert.deepEqual(urls.fonts,[{name:'Lato',url},{name:'Lora',url:'/l/schriften/lora.json'}]);
  assert.deepEqual(lazyUrls({fonts:['Böse']},{fontIndex:[{name:'Böse',url:'/../x'}]},'/l/').fonts,[]);
  // Start: Produktschriften im gemeinsamen Index, aber nicht geladen.
  const requests=[];
  const get=async u=>{requests.push(u);if(u.endsWith('katalog-kern.json'))return {fonts:{},motifs:{},motif_bounds:{},font_index:[{name:'Lora',file:'lora.json'}],motif_index:[]};if(u===url)return {label:'Lato',regular:{units:1000,glyphs:{}}};throw Error('404');};
  const loader=await freshLoader('produktschriften');
  const config={localResources:{fonts:{},lazyFonts:[{name:'Lato',url,category:'Schlicht'},{name:'Lora',url}]},profile:{designs:[{objects:[]}]}};
  const {catalog,entries}=await loader.loadStart(config,{get,base:'/l/'});
  assert.deepEqual(catalog.font_index.map(f=>f.name),['Lato','Lora'],'Feste Produktschrift gewinnt bei gleichem Namen');
  assert.deepEqual(requests,['/l/katalog-kern.json']);
  const el={fontData:{},fontList:[],motifs:{},catalog:{motifs:{},motif_bounds:{}},labels:{},dataset:{},shadowRoot:null,dispatchEvent(){}};
  loader.attach(el,{catalog,entries,prepare:()=>{},get,base:'/l/'});
  assert.deepEqual(el.uxKnownFonts().sort(),['Lato','Lora']);
  await el.uxEnsureDraftResources({design:{objects:[{type:'text',font:'Lato'}]}});
  assert.deepEqual(requests,['/l/katalog-kern.json',url]);assert.equal(el.fontData.Lato.label,'Lato');assert.ok(el.fontList.includes('Lato'));
});

test('Produktschriften zählen in der Editor-Prüfung als bekannte Schriften (ohne Konturen im Modell)',()=>{
  const hash='b'.repeat(64);
  const config={reviewOnly:true,profile:{binding:{kind:'local-review'},features:{orderEnabled:false}},localResources:{scope:'local-review-only',motifs:[],
    fonts:{Ashley:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L1 1Z'}}}}},lazyFonts:[{name:'Lato',url:'/konfigurator/shop/schriften/'+hash+'.json'},{name:'Ashley',url:'/konfigurator/shop/schriften/'+hash+'.json'}]}};
  assert.deepEqual(localFontIds(config),['Ashley','Lato']);
  assert.throws(()=>localFontIds({...config,localResources:{...config.localResources,lazyFonts:[{name:'X',url:'/fremd'}]}}),/Produktschrift/);
});

test('fixed product fonts load by hash even when the shared catalogue uses the same name',async()=>{
 const loader=await freshLoader('fixed-font-collision'),url='/konfigurator/shop/schriften/'+'c'.repeat(64)+'.json',seen=[];
 const own={regular:{units:1000,glyphs:{A:{d:'own'}}}},wrong={regular:{units:1000,glyphs:{A:{d:'wrong'}}}};
 const config={profile:{designs:[{objects:[{type:'text',font:'Lora'}]}]},localResources:{fonts:{},lazyFonts:[{name:'Lora',url}]}};
 const get=async p=>{seen.push(p);if(p.endsWith('katalog-kern.json'))return {fonts:{Lora:wrong},motifs:{},font_index:[{name:'Lora',file:'lora.json'}],motif_index:[]};if(p===url)return own;throw Error('Unexpected '+p);};
 const {catalog}=await loader.loadStart(config,{get,base:'/l/'});
 assert.deepEqual(catalog.fonts.Lora,own);assert.equal(seen.filter(p=>p===url).length,1);assert.ok(!seen.includes('/l/schriften/lora.json'));
});

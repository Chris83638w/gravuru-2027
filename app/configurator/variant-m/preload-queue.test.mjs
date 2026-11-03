import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPreloadQueue,saveDataActive,idleScheduler} from './preload-queue.mjs';
import {optionImageUrls,installBackgroundLoading,PANEL_TASKS} from './background-loading.mjs';
import {ACRYLIC_BASES,acrylicBaseImageUrl} from './acrylic-product.mjs';
import {libraryEntries} from './lazy-resources-model.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));

// Leerlauf von Hand: jeder Aufruf wartet, bis der Test `tick()` ruft.
function manualIdle(){const waiting=[];const idle=cb=>waiting.push(cb);idle.tick=async()=>{const cb=waiting.shift();if(cb)cb();await new Promise(r=>setTimeout(r,0));return !!cb;};idle.pending=()=>waiting.length;return idle;}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=()=>new Promise(r=>setTimeout(r,0));

test('Warteschlange: startet erst auf start(), dann Bilder → Schriften → Motive nacheinander im Leerlauf',async()=>{
  const idle=manualIdle(),calls=[],events=[],gates={images:deferred(),fonts:deferred(),motifs:deferred()};
  const q=createPreloadQueue({idle,onEvent:e=>events.push(e.type+':'+(e.key||''))});
  for(const key of ['images','fonts','motifs'])q.add(key,{background:()=>{calls.push(key);return gates[key].promise;}});
  assert.equal(idle.pending(),0,'vor start() wird nichts eingeplant');
  q.start();assert.equal(idle.pending(),1);
  await idle.tick();assert.deepEqual(calls,['images']);assert.equal(q.state('images'),'background');
  assert.equal(idle.pending(),0,'nächste Aufgabe erst nach Abschluss der laufenden');
  gates.images.resolve();await flush();await idle.tick();assert.deepEqual(calls,['images','fonts']);
  gates.fonts.resolve();await flush();await idle.tick();assert.deepEqual(calls,['images','fonts','motifs']);
  gates.motifs.resolve();await flush();await idle.tick();
  assert.deepEqual(['images','fonts','motifs'].map(k=>q.state(k)),['done','done','done']);
  assert.deepEqual(events,['started:','start:images','done:images','start:fonts','done:fonts','start:motifs','done:motifs','idle:']);
});

test('Warteschlange: Vorziehen lädt sofort, der Hintergrund überspringt die Aufgabe, nichts läuft doppelt',async()=>{
  const idle=manualIdle(),calls=[];
  const q=createPreloadQueue({idle});
  for(const key of ['images','fonts','motifs'])q.add(key,{background:async()=>{calls.push(key+':hintergrund');},now:async()=>{calls.push(key+':sofort');}});
  // Kunde öffnet die Schriftauswahl, bevor die Warteschlange überhaupt startet.
  await Promise.all([q.request('fonts'),q.request('fonts')]);
  assert.deepEqual(calls,['fonts:sofort']);
  q.start();while(await idle.tick());
  assert.deepEqual(calls,['fonts:sofort','images:hintergrund','motifs:hintergrund']);
  // Erledigte Aufgaben werden auf erneute Anforderung nicht neu geladen.
  await q.request('images');await q.request('fonts');assert.equal(calls.length,3);
});

test('Warteschlange: Vorziehen während des Hintergrundladens ruft den Sofortlader (er übernimmt laufende Anfragen)',async()=>{
  const idle=manualIdle(),gate=deferred(),calls=[],events=[];
  const q=createPreloadQueue({idle,onEvent:e=>events.push(e)});
  q.add('motifs',{background:()=>{calls.push('hintergrund');return gate.promise;},now:async()=>{calls.push('sofort');}});
  q.start();await idle.tick();
  await q.request('motifs');
  assert.deepEqual(calls,['hintergrund','sofort']);
  assert.ok(events.some(e=>e.type==='start'&&e.mode==='request'&&e.promoted===true));
  await q.request('motifs');assert.deepEqual(calls,['hintergrund','sofort']);
  gate.resolve();await flush();
});

test('Datensparmodus/2G: Motive nicht im Hintergrund, aber bei Bedarf; fehlgeschlagene Aufgabe lädt beim Öffnen neu',async()=>{
  assert.equal(saveDataActive({saveData:true}),true);
  assert.equal(saveDataActive({effectiveType:'2g'}),true);assert.equal(saveDataActive({effectiveType:'slow-2g'}),true);
  assert.equal(saveDataActive({effectiveType:'3g',saveData:false}),false);assert.equal(saveDataActive(null),false);
  const idle=manualIdle(),calls=[];
  const q=createPreloadQueue({idle,connection:{saveData:true}});
  q.add('images',{background:async()=>{calls.push('images');throw Error('Netz');}});
  q.add('motifs',{background:async()=>{calls.push('motifs:hintergrund');},now:async()=>{calls.push('motifs:sofort');},saveData:'skip'});
  q.start();while(await idle.tick());
  assert.deepEqual(calls,['images']);assert.equal(q.state('images'),'failed');assert.equal(q.state('motifs'),'skipped');
  await q.request('motifs');assert.deepEqual(calls,['images','motifs:sofort']);
  await assert.rejects(q.request('images'),/Netz/);assert.equal(calls.length,3);
  assert.throws(()=>q.add('motifs',{background(){}}),/doppelt/);
});

test('Leerlauf: requestIdleCallback mit Höchstwartezeit, sonst setTimeout',()=>{
  const seen=[];
  idleScheduler({requestIdleCallback:(cb,options)=>{seen.push(['idle',options.timeout]);cb();}})(()=>seen.push('lauf'));
  idleScheduler({setTimeout:(cb,ms)=>{seen.push(['timeout',ms]);cb();}})(()=>seen.push('lauf'));
  assert.deepEqual(seen,[['idle',2000],'lauf',['timeout',50],'lauf']);
});

test('Optionsbilder: alle Sockelansichten des Acrylprodukts, dieselben URLs wie die Szene',()=>{
  const urls=optionImageUrls({acrylic:{},profile:{optionGroups:[{values:[{image:'/workshop-ui/x.webp'},{imageUrl:'https://fremd.example/x.png'},{media:{url:'/a/b.txt'}}]}]}});
  const bases=ACRYLIC_BASES.filter(b=>b.asset).map(b=>acrylicBaseImageUrl(b.asset));
  assert.equal(bases.length,6);assert.deepEqual(urls,[...bases,'/workshop-ui/x.webp']);
  assert.ok(bases.every(u=>/^\/acrylic-assets\/base-[a-z-]+-v2\.webp$/.test(u)));
  // Szene: ROOT+b.asset.replace('.png','-v2.webp') mit ROOT='/acrylic-assets/' – dieselben URLs.
  const scene=fs.readFileSync(path.join(HERE,'acrylic-scene.mjs'),'utf8');
  assert.match(scene,/const ROOT='\/acrylic-assets\/';/);assert.match(scene,/const src=ROOT\+b\.asset\.replace\('\.png','-v2\.webp'\);/);
  assert.deepEqual(bases,ACRYLIC_BASES.filter(b=>b.asset).map(b=>'/acrylic-assets/'+b.asset.replace('.png','-v2.webp')));
  assert.deepEqual(optionImageUrls(null),[]);
});

// Attrappe des montierten Editors mit den echten Nachladern (lazy-resources.mjs) und gezählten Abrufen.
async function fakeEditor(name){
  const {attach}=await import('./lazy-resources.mjs?'+name);
  const requests=[],listeners={};
  const panels=Object.fromEntries(PANEL_TASKS.map(([selector])=>[selector,{hidden:true,offsetParent:null}]));
  const r={querySelector:selector=>panels[selector]||(selector==='style[data-lazy-library-style]'?{}:null),append(){},addEventListener(type,fn){(listeners[type]||=[]).push(fn);}};
  const el={fontData:{},fontList:[],motifs:{},catalog:{motifs:{},motif_bounds:{}},labels:{},dataset:{},shadowRoot:r,dispatchEvent(){}};
  const catalog={fonts:{},font_index:['Lora','Caveat','Montserrat'].map(n=>({name:n,file:n.toLowerCase()+'.json'})),motif_index:[{key:'import-a',name:'A',category:'K'}]};
  const entries=libraryEntries(catalog.motif_index,[]);
  const get=async(url,options={})=>{requests.push({url,priority:options.priority||null});await new Promise(r=>setTimeout(r,3));
    if(url.includes('/schriften/'))return {regular:{glyphs:{}}};
    if(url.endsWith('motive-alle.json'))return [{key:'import-a',name:'A',category:'K',svgFragment:'<g/>',bounds:[0,0,1,1]}];
    throw Error(url);};
  attach(el,{catalog,entries,prepare:()=>{},get,base:'/l/'});
  const images=[];
  class FakeImage{constructor(){images.push(this);}set src(url){this.url=url;setTimeout(()=>this.onload?.(),2);}}
  const timers=[];
  const win={Image:FakeImage,navigator:{connection:null},performance:{now:()=>0},setTimeout:(cb)=>{timers.push(cb);return timers.length;},requestIdleCallback:cb=>{timers.push(cb);return timers.length;}};
  // Leerlauf abarbeiten, bis die Warteschlange „idle“ meldet (höchstens 2 s).
  const run=async()=>{for(let i=0;i<400&&!(el.uxPreloadLog||[]).some(e=>e.type==='idle');i++){if(timers.length)timers.shift()();await new Promise(r=>setTimeout(r,5));}};
  return {el,r,win,requests,images,panels,listeners,run};
}

test('Hintergrund: Schriften einzeln mit niedriger Priorität, Schriftauswahl übernimmt laufende Abrufe – keine Doppel-Downloads',async()=>{
  const f=await fakeEditor('vorladen-schriften');
  const queue=installBackgroundLoading({el:f.el,r:f.r,config:{acrylic:{},profile:{optionGroups:[]}},win:f.win});
  // Bilder laufen zuerst (6 Sockel, nacheinander, niedrige Priorität).
  await f.run();
  assert.deepEqual(f.images.map(i=>i.url),optionImageUrls({acrylic:{}}));assert.ok(f.images.every(i=>i.fetchPriority==='low'));
  assert.equal(queue.state('motifs'),'done');
  const fontRequests=f.requests.filter(r=>r.url.includes('/schriften/'));
  assert.deepEqual(fontRequests.map(r=>r.url),['/l/schriften/lora.json','/l/schriften/caveat.json','/l/schriften/montserrat.json']);
  assert.ok(f.requests.every(r=>r.priority==='low'),JSON.stringify(f.requests));
  // Alles geladen: Schriftauswahl und Motivbereich laden nichts erneut.
  await f.el.uxEnsureAllFonts();await f.el.uxEnsureMotifLibrary();
  assert.equal(f.requests.length,4);
  assert.deepEqual(f.requests.map(r=>r.url).filter((u,i,a)=>a.indexOf(u)!==i),[]);
});

test('Vorziehen: Motivbereich geöffnet, während Schriften im Hintergrund laden → Motive sofort, je Datei ein Abruf',async()=>{
  const f=await fakeEditor('vorladen-vorziehen');
  installBackgroundLoading({el:f.el,r:f.r,config:{profile:{optionGroups:[]}},win:f.win});
  // Kunde öffnet den Motivbereich (bestehender Aufrufer ruft el.uxEnsureMotifLibrary()).
  const library=f.el.uxEnsureMotifLibrary();
  // Gleichzeitig öffnet er die Schriftauswahl.
  const fonts=f.el.uxEnsureAllFonts();
  await Promise.all([library,fonts,f.run()]);
  const urls=f.requests.map(r=>r.url);
  assert.equal(urls[0],'/l/motive-alle.json');assert.equal(f.requests[0].priority,null,'sofort, nicht niedrig');
  assert.deepEqual([...new Set(urls)].length,urls.length,'kein Abruf doppelt: '+urls.join(', '));
  assert.equal(urls.filter(u=>u.includes('/schriften/')).length,3);
  assert.equal(f.el.dataset.lazyLibrary,'ready');
});

test('Datensparmodus im Editor: Motive werden nicht vorgeladen, aber beim Öffnen des Motivbereichs',async()=>{
  const f=await fakeEditor('vorladen-sparen');
  f.win.navigator.connection={saveData:true};
  const queue=installBackgroundLoading({el:f.el,r:f.r,config:{profile:{optionGroups:[]}},win:f.win});
  await f.run();
  assert.equal(queue.state('motifs'),'skipped');assert.ok(!f.requests.some(r=>r.url.endsWith('motive-alle.json')));
  await f.el.uxEnsureMotifLibrary();
  assert.equal(f.requests.filter(r=>r.url.endsWith('motive-alle.json')).length,1);
});

test('Kundenoberfläche startet die Ladefolge erst am Ende von installUX',()=>{
  const ux=fs.readFileSync(path.join(HERE,'ux.mjs'),'utf8');
  const ready=ux.indexOf("window.parent.postMessage({type:'gravuru-ux-ready'},location.origin);"),install=ux.indexOf('const background=config?installBackgroundLoading({el,r,config}):null;');
  assert.ok(ready>0&&install>ready,'nach der fertigen Oberfläche');
  assert.ok(ux.indexOf("r.host.dataset.uxNeutral=")<install);
});

// Entscheidung 20.10.2026: Handy mit Mobilfunk lädt im Hintergrund nur die empfohlenen Schriften,
// alle Schriften und die Motivbibliothek erst auf Anforderung; WLAN/Desktop alles.
import {preloadScope,RECOMMENDED_FONTS} from './background-loading.mjs';
test('Vorlade-Umfang: WLAN/Desktop voll, Handy/Mobilfunk leicht',()=>{
  const win=(type,coarse)=>({navigator:{connection:type?{type}:undefined},matchMedia:()=>({matches:coarse})});
  assert.equal(preloadScope(win('wifi',true)),'full');
  assert.equal(preloadScope(win('ethernet',false)),'full');
  assert.equal(preloadScope(win('cellular',true)),'light');
  assert.equal(preloadScope(win(undefined,true)),'light','iOS ohne Angabe');
  assert.equal(preloadScope(win(undefined,false)),'full','Desktop ohne Angabe');
  assert.deepEqual([...RECOMMENDED_FONTS],['Montserrat','Nunito','Lora','Caveat','Allura','Dancing Script']);
});
test('saveData never: läuft nie im Hintergrund, aber auf Anforderung',async()=>{
  const ran=[];const q=createPreloadQueue({idle:cb=>cb()});
  q.add('a',{background:async()=>ran.push('a')});
  q.add('b',{background:async()=>ran.push('b-bg'),now:async()=>ran.push('b-now'),saveData:'never'});
  q.start();await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(ran,['a']);assert.equal(q.state('b'),'skipped');
  await q.request('b');assert.deepEqual(ran,['a','b-now']);assert.equal(q.state('b'),'done');
});

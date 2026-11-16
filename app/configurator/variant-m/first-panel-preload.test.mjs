import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createGalleryPager} from './gallery-pager.mjs';
import {saveDataActive,idleScheduler} from './preload-queue.mjs';
import {installDesignSearchControl} from './design-search-control.mjs';
import {initialMotifChoices,NATIVE_STARTER_MOTIFS,motifChoices} from './profile-selection.mjs';
import {shopWarmManifest} from '../../workshop/shop-warm-manifest.mjs';
import {scheduleProductWarmup} from '../../workshop/ui/shop-embed.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
test('warm manifest and editor share native initial six; curated/empty restrictions remain authoritative',()=>{
 const entries=NATIVE_STARTER_MOTIFS.map(key=>({key}));
 for(const selections of [undefined,{motifs:entries.map(m=>m.key).slice(2)},{bestsellers:[]},{bestsellers:entries.slice(2,5).map(m=>m.key)}]){
  const config={workshopProfiles:{selections}},allowed=motifChoices(entries,selections?.motifs);
  const expected=initialMotifChoices(allowed,[],config).map(m=>m.key).filter(k=>k.startsWith('import-')).slice(0,6);
  assert.deepEqual(shopWarmManifest(config,{editorPath:'/_merchant-acryl-editor.html'}).motifs,expected);
 }
 const ranked=[{key:entries[3].key},{key:entries[2].key}];assert.deepEqual(initialMotifChoices(entries,ranked,{}),ranked);
});
test('six hidden initial motifs use two workers and same existing per-item cache on opening',async()=>{
 const {attach}=await import('./lazy-resources.mjs?initial-six');
 const keys=Array.from({length:12},(_,i)=>'import-test'+i),entries=keys.map(key=>({key,name:key,category:'Test'}));let active=0,max=0;const calls=[];
 const el={fontData:{},motifs:{},catalog:{motifs:{},motif_bounds:{}},labels:{},uxInitialMotifKeys:keys,uxLibraryRefresh(){}};
 attach(el,{catalog:{fonts:{},font_index:[],motif_index:entries},entries,prepare(){},base:'/test/',get:async(url,options)=>{calls.push([url,options]);active++;max=Math.max(max,active);await tick();active--;return {key:url.split('/').pop().replace('.json',''),svgFragment:'<path/>',bounds:[0,0,1,1]};}});
 await el.uxPrefetchInitialMotifs();assert.equal(calls.length,6);assert.equal(max,2);assert.ok(calls.every(([,o])=>o.priority==='low'));assert.equal(Object.keys(el.motifs).length,6);
 await el.uxEnsureMotifs(keys.slice(0,6));assert.equal(calls.length,6);assert.equal(el.motifs[keys[6]],undefined);
});
async function gallery({saving=false,preview,allSizes=false,initiallyActive=true}={}){
 const idle=[],observers=[],calls=[],nodes={},signals=[],created=[],listeners={},loads=[];let page=0,activityListener,searchControl;
 class Node{constructor(tag=''){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;this.value=tag==='input'?'':'preferred';this.listeners={};}append(...xs){this.children.push(...xs);}prepend(x){this.children.unshift(x);}replaceChildren(...xs){this.children=xs;}before(){}setAttribute(){}querySelector(s){return nodes[s]??=(new Node(s==='input'?'input':''));}querySelectorAll(){return [];}set innerHTML(v){}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}dispatch(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}focus(){}}
 const grid=nodes['.ux-product-grid']=new Node(),r=new Node();
 const api={canGoBack:()=>false,takeTransfer:()=>null,onPreviewActivity:fn=>{activityListener=fn;fn(initiallyActive);return ()=>{activityListener=null;};},load:async(pageNo,theme,options,query)=>{loads.push({page:pageNo,theme,options,query});return {status:'ready',items:Array.from({length:query?1:40},(_,i)=>({target:'token-'+page+'-'+i+(query?'-'+query:''),designName:query||'Design '+i})),total:query?1:40,nextPage:null};},preview:async(target,url,signal)=>{calls.push(target);signals.push(signal);if(preview)return preview(target,signal);await tick();return new Blob(['svg']);}};
 const win={parent:{GravuruShopEntry:{designGallery:api}},navigator:{connection:{saveData:saving}},requestIdleCallback:fn=>idle.push(fn),addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const doc={createElement:tag=>new Node(tag)};
 const context={createGalleryPager,saveDataActive,idleScheduler,createPhotoDropConfirm:()=>async()=>false,isPhotoUnsupported:()=>false,installDesignSearchControl:options=>(searchControl=installDesignSearchControl({...options,document:doc})),isLayeredDoorbell:()=>false,isFamilyFormats:()=>false,isAllSizesFamily:()=>allSizes,designGalleryCount:String,window:win,document:doc,fetch:async()=>({ok:true,text:async()=>''}),URL:{createObjectURL:blob=>{created.push(blob);return 'blob:test';},revokeObjectURL(){}},IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}unobserve(){}disconnect(){}},AbortController,setTimeout,clearTimeout,structuredClone,Intl,console};
 const source=fs.readFileSync(new URL('./product-design-gallery.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');vm.createContext(context);vm.runInContext(source+'\nthis.install=installProductDesignGallery;',context);
 const el={state:{designId:'x',mOptions:{size:'small'}},sync(){}};
 await context.install({el,r,config:{profile:{designs:[]}},files:new Map(),say(){},dialog(){},esc:x=>x});await tick();
 return {calls,idle,signals,created,loads,el,search(value){searchControl.input.value=value;searchControl.input.dispatch('input');searchControl.input.dispatch('keydown',{key:'Enter',preventDefault(){}});},activity:value=>activityListener?.(value),hide:()=>listeners.pagehide(),options:()=>{page++;el.state.mOptions.size='size-'+page;el.sync();},images:()=>grid.children.map(c=>c.children[0].children[0]),show:images=>observers[0].fn(images.map(target=>({target,isIntersecting:true}))),reset:()=>{page++;nodes['.ux-product-themes'].querySelector('select').onchange();}};
}

test('search invalidation aborts obsolete previews and preserves activity pause, query and cleanup',async()=>{
 const pending=[],g=await gallery({preview:(target,signal)=>new Promise(resolve=>pending.push({target,signal,resolve}))});
 g.idle.shift()();await tick();assert.equal(pending.length,2);const old=g.images();
 g.search('Haus');assert.ok(pending.every(p=>p.signal.aborted));await tick();
 assert.equal(g.loads.at(-1).query,'Haus');assert.equal(g.images().length,1);
 g.idle.shift()();await tick();assert.equal(pending.length,3);assert.match(pending[2].target,/-Haus$/);
 g.activity(false);assert.equal(pending[2].signal.aborted,true);
 g.search('D23');await tick();assert.equal(g.loads.at(-1).query,'D23');assert.equal(pending.length,3,'search may load its list while thumbnails remain paused');
 for(const p of pending)p.resolve(new Blob(['old']));await tick();assert.equal(g.created.length,0);assert.ok(old.every(img=>!img.src));
 g.activity(true);g.idle.shift()();await tick();assert.equal(pending.length,4);assert.match(pending[3].target,/-D23$/);
 g.search('');assert.equal(pending[3].signal.aborted,true);await tick();assert.equal(g.loads.at(-1).query,'');assert.equal(g.images().length,40);
 g.hide();pending[3].resolve(new Blob(['late']));await tick();assert.equal(g.created.length,0);
});
test('authenticated gallery warms only three before tab; same images are reused when made visible',async()=>{
 const g=await gallery();assert.equal(g.calls.length,0);g.idle.shift()();await tick();await tick();await tick();assert.equal(g.calls.length,3);assert.ok(g.images().slice(0,3).every(i=>i.src==='blob:test'));
 g.show(g.images().slice(0,3));await tick();assert.equal(g.calls.length,3);g.show([g.images()[3]]);await tick();assert.equal(g.calls.length,4);
});
test('gallery Save-Data skips speculative previews and option change cancels stale warm callback',async()=>{
 const saving=await gallery({saving:true});assert.equal(saving.idle.length,0);saving.show(saving.images().slice(0,1));await tick();assert.equal(saving.calls.length,1);
 const g=await gallery();const stale=g.idle.shift();g.reset();await tick();stale();await tick();assert.equal(g.calls.length,0);g.idle.shift()();await tick();await tick();assert.ok(g.calls.every(x=>x.startsWith('token-1-')));
});

test('actual option change aborts both old previews and immediately frees slots; late completions cannot free current slots',async()=>{
 const pending=[],g=await gallery({allSizes:true,preview:(target,signal)=>new Promise((resolve,reject)=>pending.push({target,signal,resolve,reject}))});
 g.idle.shift()();await tick();assert.equal(pending.length,2);const old=g.images();
 g.el.sync();assert.ok(pending.every(p=>!p.signal.aborted),'unchanged selection does not cancel');
 g.options();assert.ok(pending.every(p=>p.signal.aborted));await tick();g.idle.shift()();await tick();
 assert.equal(pending.length,4,'new previews start without waiting for old fetch settlement');
 pending[0].resolve(new Blob(['old']));pending[1].reject(Error('aborted old request'));await tick();
 assert.equal(pending.length,4,'old finally callbacks do not release current concurrency slots');assert.equal(g.created.length,0);assert.ok(old.every(img=>!img.src));
 pending[2].resolve(new Blob(['new']));await tick();assert.equal(pending.length,5);assert.ok(pending.slice(2).every(p=>p.target.startsWith('token-1-')));
 pending[3].resolve(new Blob(['new']));pending[4].resolve(new Blob(['new']));await tick();
 assert.equal(g.created.length,3);assert.equal(pending.length,5,'only three current first images warmed');assert.ok(g.images().slice(0,3).every(img=>img.src==='blob:test'));
});

test('pagehide aborts active previews and drops queued work without publishing late blobs',async()=>{
 const pending=[],g=await gallery({preview:(_target,signal)=>new Promise(resolve=>pending.push({signal,resolve}))});
 g.show(g.images().slice(0,6));await tick();assert.equal(pending.length,2);g.hide();assert.ok(pending.every(p=>p.signal.aborted));
 for(const item of pending)item.resolve(new Blob(['late']));await tick();assert.equal(pending.length,2);assert.equal(g.created.length,0);
});
test('switch pause cancels pending previews and old idle/observer work; resume retains finished images and two current slots',async()=>{
 const pending=[],g=await gallery({preview:(target,signal)=>new Promise((resolve,reject)=>pending.push({target,signal,resolve,reject}))});
 const staleIdle=g.idle.shift();staleIdle();await tick();assert.equal(pending.length,2);
 pending[0].resolve(new Blob(['finished']));await tick();assert.equal(pending.length,3);const completed=g.images()[0],url=completed.src;
 g.show(g.images().slice(3,8));g.activity(false);assert.ok(pending.slice(1).every(p=>p.signal.aborted));
 staleIdle();g.show(g.images().slice(3,8));await tick();assert.equal(pending.length,3,'no observer/idle work starts while switching');
 g.activity(true);g.idle.shift()();await tick();assert.equal(pending.length,5);assert.equal(completed.src,url);assert.equal(g.created.length,1);
 pending[1].resolve(new Blob(['old late']));pending[2].reject(Error('old abort'));await tick();assert.equal(pending.length,5);assert.equal(g.created.length,1,'old generation cannot paint or free new slots');
 pending[3].resolve(new Blob(['current']));pending[4].resolve(new Blob(['current']));await tick();assert.equal(pending.length,5,'only unfinished initial three warmed');
 assert.ok(g.images().slice(0,3).every(i=>i.src));assert.equal(g.calls.filter(x=>x==='token-0-0').length,1,'finished image never fetched again');
 g.show([g.images()[3]]);await tick();assert.equal(pending.length,6,'visible additional card can load after resume');g.hide();g.activity(true);await tick();assert.equal(pending.length,6,'removed frame unsubscribes from activity');
});
test('candidate gallery may populate while inactive but starts thumbnails only after ready; Save-Data still prevents warmup',async()=>{
 const g=await gallery({initiallyActive:false});assert.equal(g.images().length,40);g.show(g.images().slice(0,8));assert.equal(g.idle.length,0);await tick();assert.equal(g.calls.length,0);
 g.activity(true);assert.equal(g.idle.length,1);g.idle.shift()();await tick();await tick();await tick();assert.equal(g.calls.length,3);
 const saving=await gallery({saving:true,initiallyActive:false});saving.activity(true);assert.equal(saving.idle.length,0);await tick();assert.equal(saving.calls.length,0);saving.show([saving.images()[4]]);await tick();assert.equal(saving.calls.length,1);
});
test('product warmup starts after markup and paint, without waiting for window load',()=>{
 const paints=[],idles=[],events=[];let count=0,ready;
 const doc={readyState:'loading',visibilityState:'visible',addEventListener:(name,fn)=>{events.push(name);ready=fn;}},win={requestAnimationFrame:fn=>paints.push(fn),requestIdleCallback:(fn,o)=>{assert.equal(o.timeout,600);idles.push(fn);}};
 scheduleProductWarmup(doc,win,()=>count++);assert.deepEqual(events,['DOMContentLoaded']);ready();paints.shift()();paints.shift()();assert.equal(count,0);idles.shift()();assert.equal(count,1);
});

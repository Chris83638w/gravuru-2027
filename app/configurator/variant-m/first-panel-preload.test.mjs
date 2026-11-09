import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createGalleryPager} from './gallery-pager.mjs';
import {saveDataActive,idleScheduler} from './preload-queue.mjs';
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
async function gallery({saving=false,preview,allSizes=false}={}){
 const idle=[],observers=[],calls=[],nodes={},signals=[],created=[],listeners={};let page=0;
 class Node{constructor(tag=''){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;this.value='preferred';}append(...xs){this.children.push(...xs);}prepend(x){this.children.unshift(x);}replaceChildren(...xs){this.children=xs;}setAttribute(){}querySelector(s){return nodes[s]??=(new Node());}querySelectorAll(){return [];}set innerHTML(v){}}
 const grid=nodes['.ux-product-grid']=new Node(),r=new Node();
 const api={canGoBack:()=>false,takeTransfer:()=>null,load:async()=>({status:'ready',items:Array.from({length:40},(_,i)=>({target:'token-'+page+'-'+i,designName:'Design '+i})),total:40,nextPage:null}),preview:async(target,url,signal)=>{calls.push(target);signals.push(signal);if(preview)return preview(target,signal);await tick();return new Blob(['svg']);}};
 const win={parent:{GravuruShopEntry:{designGallery:api}},navigator:{connection:{saveData:saving}},requestIdleCallback:fn=>idle.push(fn),addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const context={createGalleryPager,saveDataActive,idleScheduler,isLayeredDoorbell:()=>false,isFamilyFormats:()=>false,isAllSizesFamily:()=>allSizes,designGalleryCount:String,window:win,document:{createElement:tag=>new Node(tag)},fetch:async()=>({ok:true,text:async()=>''}),URL:{createObjectURL:blob=>{created.push(blob);return 'blob:test';},revokeObjectURL(){}},IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}unobserve(){}disconnect(){}},AbortController,setTimeout,clearTimeout,structuredClone,Intl,console};
 const source=fs.readFileSync(new URL('./product-design-gallery.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');vm.createContext(context);vm.runInContext(source+'\nthis.install=installProductDesignGallery;',context);
 const el={state:{designId:'x',mOptions:{size:'small'}},sync(){}};
 await context.install({el,r,config:{profile:{designs:[]}},files:new Map(),say(){},dialog(){},esc:x=>x});await tick();
 return {calls,idle,signals,created,el,hide:()=>listeners.pagehide(),options:()=>{page++;el.state.mOptions.size='size-'+page;el.sync();},images:()=>grid.children.map(c=>c.children[0].children[0]),show:images=>observers[0].fn(images.map(target=>({target,isIntersecting:true}))),reset:()=>{page++;nodes['.ux-product-themes'].querySelector('select').onchange();}};
}
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
test('product warmup starts after markup and paint, without waiting for window load',()=>{
 const paints=[],idles=[],events=[];let count=0,ready;
 const doc={readyState:'loading',visibilityState:'visible',addEventListener:(name,fn)=>{events.push(name);ready=fn;}},win={requestAnimationFrame:fn=>paints.push(fn),requestIdleCallback:(fn,o)=>{assert.equal(o.timeout,600);idles.push(fn);}};
 scheduleProductWarmup(doc,win,()=>count++);assert.deepEqual(events,['DOMContentLoaded']);ready();paints.shift()();paints.shift()();assert.equal(count,0);idles.shift()();assert.equal(count,1);
});

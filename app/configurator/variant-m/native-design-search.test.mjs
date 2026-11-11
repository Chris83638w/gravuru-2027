import test from 'node:test';
import assert from 'node:assert/strict';
import {installNativeDesignSearch} from './native-design-search.mjs';
import {createMotifSearchReporter} from './motif-search-analytics.mjs';
import fs from 'node:fs';

test('returning to a cancelled native search reports its completed result and never exposes excluded cards',async t=>{
 const original={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};t.after(()=>Object.assign(globalThis,original));
 const basic=()=>({hidden:false,attrs:new Map(),handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},toggleAttribute(k,on){if(on)this.attrs.set(k,'');else this.attrs.delete(k);},after(){},before(){},focus(){}}),input={...basic(),value:''},clear=basic();
 const control={...basic(),querySelector:s=>s==='input'?input:clear};
 globalThis.document={createElement:tag=>tag==='div'?control:basic()};globalThis.window={addEventListener(){}};globalThis.fetch=async()=>({ok:true,text:async()=>''});
 const designs=[{id:'a',name:'Haus',objects:[]},{id:'b',name:'Haus',hidden:true,objects:[]},{id:'c',name:'Haus',released:false,objects:[]},{id:'d',name:'Familie',objects:[]}],cards=designs.map(d=>({...basic(),dataset:{cDesign:d.id}}));
 const gallery={...basic(),id:'',children:[...cards],querySelectorAll:s=>s==='[data-design-search-hidden]'?cards.filter(c=>c.attrs.has('data-design-search-hidden')):cards,append(card){this.children=this.children.filter(c=>c!==card);this.children.push(card);}},panel={querySelector:()=>null},more=basic();
 const r={append(){},querySelector:s=>s==='#ux-panel-design'?panel:s==='.c-gallery'?gallery:s==='[data-ux=more-designs]'?more:null,querySelectorAll:()=>[]};
 const sent=[],jobs=new Map();let seq=0;
 const reporter=createMotifSearchReporter({send:item=>sent.push(item),schedule:fn=>{jobs.set(++seq,fn);return seq;},cancel:id=>jobs.delete(id)});
 const config={profile:{designs}},el={state:{mOptions:{}},sync(){for(const c of cards)c.hidden=false;},uxReportDesignSearch:(q,total)=>reporter.observe(q,total)};
 await installNativeDesignSearch({el,r,config});
 input.value='Haus';input.handlers.search();assert.equal(jobs.size,1);assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.cDesign),['a']);
 assert.ok(cards.slice(1).every(c=>c.inert&&c.attrs.get('aria-hidden')==='true'&&c.attrs.has('data-design-search-hidden')));
 input.value='Hausx';input.handlers.input();assert.equal(jobs.size,0);
 input.value='Haus';input.handlers.search();assert.equal(jobs.size,1,'returning to the original query must reschedule the cancelled report');
 for(const fn of [...jobs.values()])fn();assert.deepEqual(sent,[{query:'haus',resultCount:1}]);assert.equal(more.hidden,true);
 input.value='';input.handlers.search();assert.equal(input.value,'');assert.equal(jobs.size,0);
 assert.ok(cards.every(c=>!c.inert&&!c.attrs.has('aria-hidden')&&!c.attrs.has('data-design-search-hidden')));
});
test('native search display rule outranks the real neutral-theme display:flex override',()=>{
 const search=fs.readFileSync(new URL('./product-design-gallery.css',import.meta.url),'utf8'),neutral=fs.readFileSync(new URL('./neutral-theme.css',import.meta.url),'utf8');
 assert.match(neutral,/:host\(\[data-ux-neutral\]\) \.ux-shell \.ux-design-reveal \.c-design-card\{[^}]*display:flex!important/);
 // A panel ID makes this more specific than the theme's class/attribute-only
 // selector, independently of stylesheet insertion order. Browser QA separately
 // checks computed display and the absence of the excluded button from focus.
 assert.match(search,/:host\(\[data-ux-modern\]\) #ux-panel-design \.c-gallery \[data-c-design\]\[data-design-search-hidden\]\{display:none!important\}/);
});

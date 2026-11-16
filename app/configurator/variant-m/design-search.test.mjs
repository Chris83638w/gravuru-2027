import test from 'node:test';
import assert from 'node:assert/strict';
import {designSearchQuery,designSearchMetadata,matchesDesignSearch,searchDesigns} from './design-search.mjs';
import {createDesignSearchInput,installDesignSearchControl} from './design-search-control.mjs';
import {createGalleryPager} from './gallery-pager.mjs';

test('names, German spelling, complete catalogue IDs and exact D numbers use original metadata',()=>{
 const d={id:'native-23',name:'Grüße mit weißem Haus',katalog:{designId:'TRE-V2A-5x2-D23'},objects:[{type:'text',text:'Privater Mustername'}]},m=designSearchMetadata(d);
 for(const q of ['GRÜSSE','gruesse','weißem Haus','TRE-V2A-5x2-D23','D23','d023'])assert.equal(matchesDesignSearch(m,q),true,q);
 for(const q of ['D2','D230','Privater Mustername'])assert.equal(matchesDesignSearch(m,q),false,q);
 const numbered=designSearchMetadata({id:'native-1234',designNo:23,name:'Haus'});assert.equal(matchesDesignSearch(numbered,'23'),true);assert.equal(matchesDesignSearch(numbered,'12'),false);assert.equal(matchesDesignSearch(m,'5'),false);
 assert.equal(designSearchQuery('  Haus   Familie  '),'Haus Familie');
 for(const q of ['a'.repeat(81),'a\nb',[],null])assert.throws(()=>designSearchQuery(q),{code:'shop_gallery_query'});
});
test('only explicit theme/motif names and keywords count; unlabelled paths remain a measurable data gap',()=>{
 const d={id:'d1',themes:['family'],objects:[{type:'motif',motif:'known'},{type:'motif',motif:'path-only'}]},c={themes:[{id:'family',name:'Familie'}],localResources:{motifs:[{key:'known',name:'Anker',tags:['Hafen'],svgFragment:'secret'},{key:'path-only',svgFragment:'Haus'}]}};
 const m=designSearchMetadata(d,c);assert.equal(m.unnamedMotifs,1);
 for(const q of ['Familie','family','Anker','Hafen'])assert.equal(matchesDesignSearch(m,q),true,q);
 for(const q of ['Haus','secret','path-only'])assert.equal(matchesDesignSearch(m,q),false,q);
});
test('native search excludes hidden, withdrawn and unfit designs, with stable originals before additions',()=>{
 const designs=[{id:'new1',name:'Haus',katalog:{prio:1}},{id:'hidden',name:'Haus',hidden:true},{id:'own1',name:'Haus',katalog:{source:'X-D1 (Bestand, Quelle.cdr)'}},{id:'revoked',name:'Haus',released:false},{id:'bad',name:'Haus',katalog:{fit:'passt nicht'}},{id:'own2',name:'Haus',herkunftRang:0},{id:'new2',name:'Haus'}];
 const before=JSON.stringify(designs);assert.deepEqual(searchDesigns(designs,'Haus').map(d=>d.id),['own1','own2','new1','new2']);assert.equal(JSON.stringify(designs),before);
});
function clock(){let n=0;const jobs=new Map();return {schedule:fn=>{jobs.set(++n,fn);return n;},cancel:id=>jobs.delete(id),flush(){for(const [id,fn]of [...jobs]){jobs.delete(id);fn();}},size:()=>jobs.size};}
test('rapid typing invalidates pending pages immediately and only the final settled query is loaded',async()=>{
 const time=clock(),calls=[];let oldResolve;
 const pager=createGalleryPager((page,q)=>{calls.push([page,q]);return q==='old'?new Promise(resolve=>oldResolve=resolve):Promise.resolve({items:[q],nextPage:null});});
 const old=pager.load('old');const input=createDesignSearchInput({...time,invalidate:()=>pager.reset(),change:q=>pager.load(q)});
 for(const q of ['H','Ha','Hau','Haus'])input.input(q);
 oldResolve({items:['stale'],nextPage:4});assert.equal(await old,null);assert.equal(time.size(),1);
 time.flush();await Promise.resolve();assert.deepEqual(calls,[[0,'old'],[0,'Haus']]);assert.equal(pager.next,null);
 input.input('Familie');input.input('');await Promise.resolve();assert.deepEqual(calls.at(-1),[0,'']);time.flush();assert.equal(calls.length,3);
});
test('composition waits for committed input; Enter flush and dispose cancel timers',()=>{
 const time=clock(),found=[],input=createDesignSearchInput({...time,change:q=>found.push(q)});
 input.compositionStart();input.input('Ha');time.flush();assert.deepEqual(found,[]);input.compositionEnd('Haus');input.flush();time.flush();assert.deepEqual(found,['Haus']);input.input('Familie');input.dispose();time.flush();assert.deepEqual(found,['Haus']);
});
test('real search control keeps focus, keyboard clearing, live label and mobile input properties',()=>{
 const node=()=>({value:'',hidden:false,handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},focus(){this.focused=true;}}),input=node(),clear=node(),form={querySelector:s=>s==='input'?input:clear},doc={createElement:()=>form},container={prepend(n){this.child=n;}},queries=[];
 const control=installDesignSearchControl({container,document:doc,onChange:q=>queries.push(q)});
 assert.match(form.innerHTML,/Design suchen/);assert.match(form.innerHTML,/type="search"/);assert.match(form.innerHTML,/maxlength="80"/);assert.match(form.innerHTML,/enterkeyhint="search"/);
 input.value='Haus';input.handlers.input();input.handlers.keydown({key:'Enter',preventDefault(){}});assert.deepEqual(queries,['Haus']);assert.equal(input.value,'Haus');
 clear.handlers.click();assert.deepEqual(queries,['Haus','']);assert.equal(input.focused,true);assert.equal(clear.hidden,true);
 input.value='D23';input.handlers.input();input.handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(input.value,'');assert.equal(queries.at(-1),'');control.dispose();
});

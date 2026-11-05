import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./ui/motif-searches.mjs',import.meta.url),'utf8').replace("import {merchantRequest} from './merchant-request.mjs';",'');
const shop='gravuru-design.myshopify.com',key='gravuru:motif-search-filters:v1:'+shop;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function page(storage=new Map(),options={}){
 const element=()=>({children:[],textContent:'',value:'',append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;this.value=nodes[0]?.value||'';}});
 const fields={days:{value:'30'},source:{value:'shop'},group:element()},button={disabled:false},events={},form={elements:fields,querySelector:()=>button,addEventListener:(name,fn)=>events[name]=fn};
 const nodes=Object.fromEntries(['#status','#searches','#missing','#top-terms','#missing-terms'].map(id=>[id,element()]));
 const requests=[];
 const context={URLSearchParams,location:{host:'app.example.com'},localStorage:{getItem:k=>{if(options.blocked)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>{if(options.blocked)throw Error('blocked');storage.set(k,v);}},FormData:class extends Map{constructor(f){super(Object.entries(f.elements).map(([k,v])=>[k,v.value]));}},Option:function(label,value){return {textContent:label,value};},document:{querySelector:selector=>selector==='#filters'?form:selector==='meta[name=shopify-shop]'?{content:options.shop||shop}:nodes[selector],createElement:element},merchantRequest:async path=>{
  const query=Object.fromEntries(new URLSearchParams(path.split('?')[1]));requests.push(query);
  const preview=query.source!=='shop',rows=preview?[{term:'kreuz',searches:1,withoutResults:0},{term:'giraffe mit hut',searches:1,withoutResults:1}]:[];
  return {ok:true,json:async()=>({groups:['Hunde-Gedenktafel'],totals:{searches:preview?2:0,withoutResults:preview?1:0},rows,missing:rows.filter(x=>x.withoutResults),from:'2026-10-07',to:'2026-11-05'})};
 }};
 vm.runInNewContext(source,context);return {fields,button,events,nodes,requests,storage};
}
test('chosen source, period and product group survive a fresh report page and still load the matching rows',async()=>{
 const storage=new Map(),first=page(storage);await settle();assert.equal(first.nodes['#searches'].textContent,'0');
 first.fields.source.value='preview';first.fields.days.value='90';first.fields.group.value='Hunde-Gedenktafel';await first.events.change();
 assert.equal(first.nodes['#searches'].textContent,'2');
 const reloaded=page(storage);await settle();
 assert.deepEqual(reloaded.requests,[{days:'90',source:'preview',group:'Hunde-Gedenktafel'}]);
 assert.equal(reloaded.fields.source.value,'preview');assert.equal(reloaded.fields.days.value,'90');assert.equal(reloaded.fields.group.value,'Hunde-Gedenktafel');
 assert.equal(reloaded.nodes['#searches'].textContent,'2');assert.equal(reloaded.nodes['#missing'].textContent,'1');assert.equal(reloaded.button.disabled,false);
 const otherShop=page(storage,{shop:'another-shop.myshopify.com'});await settle();assert.equal(otherShop.fields.source.value,'shop');assert.equal(otherShop.nodes['#searches'].textContent,'0');
 assert.deepEqual(Object.keys(JSON.parse(storage.get(key))).sort(),['days','group','source']);
});
test('corrupt or blocked preference storage keeps the report usable with defaults',async()=>{
 for(const raw of ['{bad','null','{"days":"999","source":"unknown","group":42}']){const p=page(new Map([[key,raw]]));await settle();assert.deepEqual(p.requests,[{days:'30',source:'shop',group:''}]);assert.equal(p.button.disabled,false);}
 const blocked=page(new Map(),{blocked:true});await settle();blocked.fields.source.value='preview';await blocked.events.change();assert.equal(blocked.nodes['#searches'].textContent,'2');assert.equal(blocked.button.disabled,false);
});
test('a removed saved product group falls back visibly to all groups instead of keeping a hidden filter',async()=>{
 const p=page(new Map([[key,JSON.stringify({days:'30',source:'preview',group:'Removed'})]]));await settle();
 assert.equal(p.requests.length,2);assert.equal(p.requests[1].group,'');assert.equal(p.fields.group.value,'');assert.equal(p.nodes['#searches'].textContent,'2');assert.equal(JSON.parse(p.storage.get(key)).group,'');assert.equal(p.button.disabled,false);
});

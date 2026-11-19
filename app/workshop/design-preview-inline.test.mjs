import test from 'node:test';
import assert from 'node:assert/strict';
import {inlineDesignPreviews} from './design-preview-inline.mjs';
import {createShopEntryClient} from './ui/shop-entry-client.mjs';

const hash=char=>char.repeat(64);
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');

test('only allowed graphics are inlined, and a foreign hash stays out',()=>{
 const allowed=hash('a');
 const foreign=hash('b');
 const universal={localResources:{motifs:[{key:'art',svgFragment:'<image href="/api/workshop/design-assets/'+allowed+'/preview.svg"/>'},{key:'other',svgFragment:'<image href="/api/workshop/design-assets/'+foreign+'/preview.svg"/>'}]}};
 const inline=inlineDesignPreviews(universal,new Set([allowed]),id=>{if(id!==allowed)throw Error('fehlt');return svg;});
 assert.deepEqual(Object.keys(inline),[allowed]);
 assert.equal(universal.localResources.inlinePreviews[allowed].startsWith('data:image/svg+xml;base64,'),true);
 assert.equal(universal.localResources.inlinePreviews[foreign],undefined);
});

test('eighteen graphics at the recorded round trip are slower than bytes already in the model',async()=>{
 const delay=170,count=18,width=6;let next=0;
 const started=performance.now();
 async function worker(){while(next<count){next++;await new Promise(resolve=>setTimeout(resolve,delay));}}
 await Promise.all(Array.from({length:width},()=>worker()));
 const separate=performance.now()-started;
 assert.ok(separate>400,String(separate));
 const token='gse1.'+'a'.repeat(8)+'.'+'b'.repeat(8);
 const allowed=hash('c');
 const universal={profile:{designs:[]},localResources:{inlinePreviews:{[allowed]:'data:image/svg+xml;base64,'+svg.toString('base64')},motifs:[{key:'art',svgFragment:'<image href="/api/workshop/design-assets/'+allowed+'/preview.svg"/>'}]}};
 let fetched=0;
 const client=createShopEntryClient({token,fetchImpl:async()=>{fetched++;return new Response(svg,{headers:{'Content-Type':'image/svg+xml'}});}});
 const resources=await client.loadResources(universal,async()=>'unused');
 assert.equal(fetched,0);
 assert.ok(resources['/api/workshop/design-assets/'+allowed+'/preview.svg']);
 const path='/api/workshop/design-assets/'+allowed+'/preview.svg';
 const doorbell={profile:{defaultDesignId:'a',designs:[{id:'a',objects:[]}],optionGroups:[{id:'format',defaultValueId:'small'}]},doorbell:{schema:'gravuru-doorbell/v1',formats:[{key:'small',profile:{designs:[{id:'a',objects:[{type:'motif',motif:'art'}]}]}}]},localResources:{inlinePreviews:{[allowed]:'data:image/svg+xml;base64,'+svg.toString('base64')},motifs:[{key:'art',svgFragment:'<image href="'+path+'"/>'}]}};
 let doorbellFetches=0;
 const door=createShopEntryClient({token,fetchImpl:async()=>{doorbellFetches++;return new Response(svg);}});
 const prepared=door.prepareDoorbellResources(doorbell,async()=>'unused');
 await prepared.loadRemaining();
 assert.equal(doorbellFetches,0);
 assert.ok(prepared.resources[path]);
});

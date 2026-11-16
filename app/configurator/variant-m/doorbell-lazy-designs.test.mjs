import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {startNeeds} from './lazy-resources-model.mjs';
import {installDoorbellDesignLoading,designResourcesReady} from './doorbell-lazy-designs.mjs';
const config={doorbell:{schema:'gravuru-doorbell/v1'},profile:{defaultDesignId:'a',designs:[{id:'a',objects:[{type:'text',font:'A'}]},{id:'b',objects:[{type:'text',font:'B'}]}]}};
test('native start needs only the confirmed default design; other products keep all design fonts',()=>{assert.deepEqual(startNeeds(config).fonts,['A']);assert.deepEqual(startNeeds({...config,doorbell:null}).fonts,['A','B']);assert.deepEqual(startNeeds({...config,localResources:{fonts:{A:{}}}}).fonts,[]);});
test('ready outlines are needed before choosing; pending resources leave current design intact',async()=>{
 let complete;const el={fontData:{A:{}},motifs:{},selected:'a',chooseDesign(id){this.selected=id;},uxEnsureDesignResources(){return new Promise(r=>{complete=()=>{el.fontData.B={};r();};});}};
 installDoorbellDesignLoading(el,config);const pending=el.chooseDesign('b');assert.equal(el.selected,'a');assert.equal(el.uxDesignResourcePending,true);complete();await pending;assert.equal(el.selected,'b');assert.equal(el.uxDesignResourcePending,false);
});
test('late asynchronous choice cannot override a newer ready choice',async()=>{
 let complete;const el={fontData:{A:{}},motifs:{},selected:'a',chooseDesign(id){this.selected=id;},uxEnsureDesignResources(){return new Promise(r=>{complete=()=>{el.fontData.B={};r();};});}};
 installDoorbellDesignLoading(el,config);const pending=el.chooseDesign('b');el.chooseDesign('a');complete();await pending;assert.equal(el.selected,'a');
});
test('failed resource request keeps customer design and provides retry message',async()=>{const notes=[],el={fontData:{A:{}},motifs:{},selected:'a',chooseDesign(id){this.selected=id;},uxEnsureDesignResources:async()=>{throw Error('offline');}};installDoorbellDesignLoading(el,config,m=>notes.push(m));await el.chooseDesign('b');assert.equal(el.selected,'a');assert.match(notes.at(-1),/erneut/);});
test('local decoration and customer text both need loaded resources',()=>{const d={objects:[{type:'text',font:'A'},{type:'motif',motif:'decor'}]};assert.equal(designResourcesReady(d,{A:{}},{}),false);assert.equal(designResourcesReady(d,{A:{}},{decor:'<path/>'}),true);});
test('background design resources load sequentially instead of competing with each other',async()=>{
 let active=0,peak=0,refreshes=0;const loaded=[];
 const el={chooseDesign(){},sync(){},uxRefreshThumbnails(){refreshes++;},async uxEnsureDesignResources(design){active++;peak=Math.max(peak,active);await new Promise(resolve=>setImmediate(resolve));loaded.push(design.id);active--;}};
 await installDoorbellDesignLoading(el,config)();
 assert.deepEqual(loaded,['a','b']);assert.equal(peak,1);assert.equal(refreshes,1);
});
test('the selected design takes priority and background template loads resume afterwards',async()=>{
 let finish;
 const calls=[],el={fontData:{A:{}},motifs:{},selected:'a',chooseDesign(id){this.selected=id;},sync(){},
  uxEnsureDesignResources(design,{priority}){
   calls.push([design.id,priority]);
   if(priority==='high')return new Promise(resolve=>{finish=()=>{this.fontData.B={};resolve();};});
   return Promise.resolve();
  }};
 const warm=installDoorbellDesignLoading(el,config),choice=el.chooseDesign('b'),background=warm();
 await Promise.resolve();
 assert.deepEqual(calls,[['b','high']]);
 assert.equal(el.selected,'a');
 finish();await Promise.all([choice,background]);
 assert.deepEqual(calls,[['b','high'],['a','low'],['b','low']]);
 assert.equal(el.selected,'b');
});
test('all126 true imported products load fewer start fonts without dropping available templates',()=>{const dir=path.resolve('..','import-dryrun','documents');if(!fs.existsSync(dir))return;const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json'));assert.equal(files.length,126);for(const file of files){const c=JSON.parse(fs.readFileSync(path.join(dir,file))).config;const all=startNeeds({...c,doorbell:null}).fonts;const initial=startNeeds(c).fonts;assert.ok(initial.length<all.length,file);assert.ok(initial.length>0);assert.equal(c.profile.designs.length,16);}});

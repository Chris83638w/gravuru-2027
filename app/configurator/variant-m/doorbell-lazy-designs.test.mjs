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
 const local={...config,profile:{...config.profile,designs:[...config.profile.designs,{id:'c',objects:[{type:'text',font:'C'}]}]}};
 const warm=installDoorbellDesignLoading(el,local),choice=el.chooseDesign('b'),background=warm();
 await Promise.resolve();
 assert.deepEqual(calls,[['b','high']]);
 assert.equal(el.selected,'a');
 finish();await Promise.all([choice,background]);
 assert.deepEqual(calls,[['b','high'],['c','low']]);
 assert.equal(el.selected,'b');
});
test('all126 true imported products load fewer start fonts without dropping available templates',()=>{const dir=path.resolve('..','import-dryrun','documents');if(!fs.existsSync(dir))return;const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json'));assert.equal(files.length,126);for(const file of files){const c=JSON.parse(fs.readFileSync(path.join(dir,file))).config;const all=startNeeds({...c,doorbell:null}).fonts;const initial=startNeeds(c).fonts;assert.ok(initial.length<all.length,file);assert.ok(initial.length>0);assert.equal(c.profile.designs.length,16);}});

test('data saving draws a visible card and does not load a hidden one', async () => {
 const visibleCard = {dataset:{cDesign:'same'}, isConnected:true};
 const hiddenCard = {dataset:{cDesign:'hidden'}, isConnected:true};
 let intersect, onHide, drawn=0, disconnects=0;
 const view = {
  navigator:{connection:{saveData:true}},
  IntersectionObserver:class {
   constructor(callback,options){intersect=callback;assert.equal(options.rootMargin,'0px');}
   observe(){} disconnect(){disconnects++;}
  },
  requestAnimationFrame:callback=>setImmediate(callback),
  addEventListener:(event,callback)=>{if(event==='pagehide')onHide=callback;}
 };
 const gallery={className:'c-gallery',ownerDocument:{defaultView:view},querySelectorAll:()=>[visibleCard,hiddenCard]};
 const calls=[];
 const el={
  state:{mOptions:{format:'small'}}, shadowRoot:{querySelector:selector=>selector==='.c-gallery'?gallery:null}, fontData:{},motifs:{},chooseDesign(){},
  uxRefreshThumbnails(){drawn++;},
  async uxEnsureDesignResources(design,{priority}){calls.push([design.objects[0].font,priority]);this.fontData[design.objects[0].font]={};}
 };
 const formats=['small','large'].map(format=>({key:format,profile:{designs:['same','hidden'].map(id=>({id,objects:[{type:'text',font:format+'-'+id}]}))}}));
 installDoorbellDesignLoading(el,{doorbell:{schema:'gravuru-doorbell/v1',defaultFormatKey:'small',formats},profile:formats[0].profile});
 const show=()=>intersect([{target:visibleCard,isIntersecting:true},{target:hiddenCard,isIntersecting:false}]);
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 show();await tick();await tick();
 assert.deepEqual(calls,[['small-same','low']]);
 assert.equal(drawn,1);
 onHide({persisted:true});
 el.state.mOptions.format='large';
 show();await tick();await tick();
 assert.deepEqual(calls,[['small-same','low'],['large-same','low']]);
 onHide({persisted:false});
 assert.equal(disconnects,1);
});
test('a visible card covered by the preview pack does not load the full font', async () => {
 const card={dataset:{cDesign:'same'},isConnected:true};
 let intersect;
 const view={IntersectionObserver:class{constructor(callback){intersect=callback;}observe(){}disconnect(){}},requestAnimationFrame:callback=>setImmediate(callback),addEventListener(){}};
 const gallery={className:'c-gallery',ownerDocument:{defaultView:view},querySelectorAll:()=>[card]};
 const calls=[];
 const el={
  state:{mOptions:{format:'small'}},shadowRoot:{querySelector:()=>gallery},fontData:{},motifs:{},chooseDesign(){},
  uxPreviewFonts:{Probe:{previewSubset:true,regular:{glyphs:{F:{},a:{},m:{},i:{},l:{},e:{}}}}},
  uxPreviewGlyphsReady:Promise.resolve(),
  uxEnsureDesignResources(design){calls.push(design.objects[0].text);return Promise.resolve();}
 };
 const design={id:'same',objects:[{type:'text',font:'Probe',text:'Familie'}]};
 installDoorbellDesignLoading(el,{doorbell:{schema:'gravuru-doorbell/v1',defaultFormatKey:'small',formats:[{key:'small',profile:{designs:[design]}}]},profile:{designs:[design]}});
 intersect([{target:card,isIntersecting:true}]);
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[]);
 design.objects[0].text='Koch';
 intersect([{target:card,isIntersecting:true}]);
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['Koch']);
});
test('every card whose customer text leaves the pack requests the full font',async()=>{
 const ids=['FK-D05','FK-D07','FK-D08','FK-D15','FK-D01','FK-D02','FK-D03','FK-D04','FK-D06'];
 const cards=ids.map(id=>({dataset:{cDesign:id},isConnected:true}));
 let intersect;
 const view={IntersectionObserver:class{constructor(callback){intersect=callback;}observe(){}disconnect(){}},requestAnimationFrame:callback=>setImmediate(callback),addEventListener(){}};
 const gallery={className:'c-gallery',ownerDocument:{defaultView:view},querySelectorAll:()=>cards};
 const calls=[];
 const el={
  state:{mOptions:{format:'small'}},shadowRoot:{querySelector:()=>gallery},fontData:{},motifs:{},chooseDesign(){},
  uxPreviewFonts:{Probe:{previewSubset:true,regular:{glyphs:{F:{},a:{},m:{},i:{},l:{},e:{}}}}},
  uxPreviewGlyphsReady:Promise.resolve(),
  uxThumbnailDesign(design){return {...design,objects:design.objects.map(object=>object.type==='text'?{...object,text:'Koch'}:object)};},
  uxEnsureDesignResources(design){calls.push(design.id);return Promise.resolve();}
 };
 const designs=ids.map(id=>({id,objects:[{type:'text',font:'Probe',text:'Familie'}]}));
 installDoorbellDesignLoading(el,{doorbell:{schema:'gravuru-doorbell/v1',defaultFormatKey:'small',formats:[{key:'small',profile:{designs}}]},profile:{designs}});
 intersect(cards.map(card=>({target:card,isIntersecting:true})));
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,ids);
});
test('outside data saving the full font is preloaded after the cards can paint',async()=>{
 const calls=[];
 const el={fontData:{},motifs:{},chooseDesign(){},sync(){},uxRefreshThumbnails(){},uxPreviewGlyphsReady:Promise.resolve(),uxPreviewFonts:{Probe:{previewSubset:true,regular:{glyphs:{F:{},a:{},m:{},i:{},l:{},e:{}}}}},async uxEnsureDesignResources(design){calls.push(design.id);this.fontData[design.objects[0].font]={};}};
 const design={id:'a',objects:[{type:'text',font:'Probe',text:'Familie'}]};
 const warm=installDoorbellDesignLoading(el,{doorbell:{schema:'gravuru-doorbell/v1'},profile:{designs:[design]}});
 await warm();
 assert.deepEqual(calls,['a']);
});

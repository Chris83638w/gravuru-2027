import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {measureText,setTextSize} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {katalogEditorRequest,katalogEditorBody,katalogTextChange,katalogTextAddition,katalogFitMarkup,katalogFitNeedsConfirmation,installKatalogEditor} from './ui/katalog-editor-ui.mjs';
import {cleanObject} from '../configurator/variant-m/contract.mjs';
const font={regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L1 1'},B:{a:700,d:'M0 0L1 1'}}}},fonts={Catalog:font,Wide:{regular:{units:1000,glyphs:{A:{a:800,d:'M0 0L1 1'},B:{a:900,d:'M0 0L1 1'}}}}};
const text={id:'name',type:'text',text:'AA',font:'Catalog',size:10,textAnchor:'start',letterSpacing:0,x:30,y:20,w:10,h:12};
test('catalogue entry and request keep exact identity and checksum without a product id',()=>{
 assert.equal(katalogEditorRequest('?configuration=cfg_demo'),null);
 assert.deepEqual(katalogEditorRequest('?katalogReihe=TRE-V2A-8x5&katalogDesign=TRE-V2A-8x5-D57'),{reihe:'TRE-V2A-8x5',id:'TRE-V2A-8x5-D57'});
 assert.deepEqual(katalogEditorRequest('?katalogReihe=R&katalogDesign=D&katalogLinie=edelstahl-gravur'),{reihe:'R',id:'D',linie:'edelstahl-gravur'});
 const document={config:{}},body=katalogEditorBody({katalogEditor:{reihe:'R',id:'D',checksum:'abc',linie:'edelstahl-gravur'},draft:document});
 assert.deepEqual(body,{reihe:'R',id:'D',checksum:'abc',document});
});
test('content/font/size changes use shared glyph measurements and retain the SVG anchor',()=>{
 for(const [key,value,width] of [['text','AB',12],['font','Wide',16],['size',20,20]]){
  const next=katalogTextChange(text,key,value,fonts);assert.equal(next.w,width);assert.equal(next.x-next.w/2,25);assert.deepEqual(text,{id:'name',type:'text',text:'AA',font:'Catalog',size:10,textAnchor:'start',letterSpacing:0,x:30,y:20,w:10,h:12});
 }
});
test('left/middle/right alignment and tracking keep explicit anchor position',()=>{
 for(const [anchor,x] of [['start',30],['middle',25],['end',20]])assert.equal(katalogTextChange(text,'textAnchor',anchor,fonts).x,x);
 assert.equal(katalogTextChange(text,'letterSpacing',2,fonts).w,12);
 assert.equal(katalogTextChange(text,'x',-7,fonts).x,-7);
 assert.equal(cleanObject({...text,textAnchor:'end'}).textAnchor,'end');
});
test('missing glyphs reject edits, and motif resizing preserves aspect ratio without clamping',()=>{
 assert.throws(()=>katalogTextChange(text,'text','AZ',fonts),/Zeichen/);
 const motif={type:'motif',x:100,y:50,w:60,h:20};
 assert.deepEqual(katalogTextChange(motif,'w',300,fonts),{...motif,w:300,h:100});
 assert.deepEqual(katalogTextChange(motif,'h',10,fonts),{...motif,w:30,h:10});
 assert.throws(()=>katalogTextChange(motif,'w',0,fonts),/größer/);
});
test('new editor text becomes a Lieferform 2 text layer with matching field and rights identity',()=>{
 const r={designId:'d',objectId:'element-uuid',document:{config:{profile:{designs:[{id:'d',objects:[{id:'existing',type:'motif'},{id:'element-uuid',fieldKey:'element-uuid',type:'text'}]}]}},elementRights:{d:{'element-uuid':{content:true}}}}};
 const next=katalogTextAddition(r),o=next.document.config.profile.designs[0].objects[1];
 assert.equal(next.objectId,'text-uuid');assert.equal(o.id,'text-uuid');assert.equal(o.fieldKey,'text-uuid');assert.equal(o.textAnchor,'middle');assert.deepEqual(next.document.elementRights.d,{'text-uuid':{content:true}});
 assert.equal(next.document.config.profile.designs[0].objects[0].id,'existing');
});
test('fit lists every target size, escapes source text and identifies explicit extra confirmation',()=>{
 const fit={sizes:[{label:'9 × 6 cm',status:'passt',issues:[]},{label:'12 × 8 cm',status:'prüfen',issues:['Text klein']},{label:'<img>',status:'passt nicht',issues:[{message:'<script>'}]}]};
 const html=katalogFitMarkup(fit);assert.match(html,/9 × 6 cm/);assert.match(html,/12 × 8 cm/);assert.match(html,/&lt;img&gt;/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img|<script/);
 assert.equal(katalogFitNeedsConfirmation(fit),true);assert.equal(katalogFitNeedsConfirmation({sizes:fit.sizes.slice(0,2)}),false);assert.throws(()=>katalogFitMarkup({sizes:[]}),/unvollständig/);
});
const doc=()=>({name:'D57',config:{profile:{geometry:{width:120,height:80},designs:[{id:'template',objects:[]}],defaultDesignId:'template'}}});
function harness(t,{fit={sizes:[{label:'12 × 8 cm',status:'passt',issues:[]}]},saveError,loadError,discard=true}={}){
 const map=new Map(),calls=[],messages=[];let dialog,historyResets=0;
 class Node extends EventTarget{
  constructor(id=''){super();this.id=id;this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.textContent='';this.dataset={};this.classList={add(){}};}
  setAttribute(){}after(node){if(node.id)map.set('#'+node.id,node);}
  insertAdjacentHTML(){for(const key of ['#katalog-discard','#katalog-fit'])map.set(key,new Node(key));}
  querySelectorAll(){return [];}reportValidity(){return true;}checkValidity(){return true;}focus(){}
  set innerHTML(value){this.html=value;this.ack=value.includes('id="katalog-fit-ack"')?new Node('ack'):null;this.save=value.includes('value="save"')?new Node('save'):null;if(this.save)this.save.disabled=!!this.ack;}
  get innerHTML(){return this.html||'';}
  querySelector(selector){if(selector==='#katalog-fit-ack')return this.ack;if(selector==='[value=save]')return this.save;return null;}
  showModal(){this.open=true;}close(value){if(value!==undefined)this.returnValue=value;this.open=false;this.dispatchEvent(new Event('close'));}
 }
 const selector=key=>{if(!map.has(key))map.set(key,new Node(key));return map.get(key);};
 globalThis.document={querySelector:selector,querySelectorAll:()=>[],body:{classList:{add(){}},append(node){dialog=node;}},createElement:()=>new Node()};
 globalThis.location={href:'https://example.test/werkstatt/?host=public&embedded=1'};
 globalThis.localStorage={setItem(){}};
 t.after(()=>{delete globalThis.document;delete globalThis.location;delete globalThis.localStorage;});
 const state={katalogEditor:{reihe:'TRE-V2A-8x5',id:'D57',linie:'edelstahl-gravur'},record:null,draft:null,dirty:false,busy:false};
 const api=async(path,options={})=>{calls.push({path,...options});if(path.endsWith('/fit'))return fit;if(options.method==='PUT'){if(saveError)throw saveError;return {document:structuredClone(state.draft),checksum:'new',changed:true,freigabeReset:true,fit};}if(loadError)throw loadError;return {document:doc(),checksum:'original',fonts:[],source:{},fit};};
 const ui=installKatalogEditor({state,api,productEditor:{render(){},resetHistory(){historyResets++;}},canDiscard:async()=>discard,setBusy:value=>{state.busy=value;},notify:(...args)=>messages.push(args)});
 return {state,ui,calls,messages,map,get historyResets(){return historyResets;},get dialog(){return dialog;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('loading and successful saving use only catalogue routes, review all sizes and advance checksum',async t=>{
 const h=harness(t);await h.ui.load();assert.equal(h.state.dirty,false);h.state.draft.name='Edited';h.state.dirty=true;
 const saving=h.ui.save();await tick();assert.equal(h.dialog.open,true);assert.equal(h.state.busy,true);assert.equal(h.calls.filter(c=>c.method==='PUT').length,0);h.dialog.close('save');await saving;
 assert.equal(h.state.katalogEditor.checksum,'new');assert.equal(h.state.dirty,false);assert.equal(h.state.busy,false);assert.equal(h.calls.filter(c=>c.method==='PUT').length,1);
 assert.ok(h.calls.every(c=>c.path.startsWith('/api/workshop/designs/editor')));assert.match(h.messages.at(-1)[0],/Designfreigabe wurde zurückgesetzt/);
});
test('out-of-fit save requires both explicit checkbox and confirmation, cancel retains edits',async t=>{
 const h=harness(t,{fit:{sizes:[{label:'9 × 6 cm',status:'passt nicht',issues:['Lochschutz']} ]}});await h.ui.load();h.state.dirty=true;
 const first=h.ui.save();await tick();assert.equal(h.dialog.save.disabled,true);assert.match(h.dialog.innerHTML,/formnovalidate/);h.dialog.close('save');await first;
 assert.equal(h.calls.some(c=>c.method==='PUT'),false);assert.equal(h.state.dirty,true);
 const second=h.ui.save();await tick();h.dialog.ack.checked=true;h.dialog.ack.dispatchEvent(new Event('change'));assert.equal(h.dialog.save.disabled,false);h.dialog.close('cancel');await second;
 assert.equal(h.calls.some(c=>c.method==='PUT'),false);assert.equal(h.state.dirty,true);
 const third=h.ui.save();await tick();h.dialog.ack.checked=true;h.dialog.ack.dispatchEvent(new Event('change'));h.dialog.close('save');await third;assert.equal(h.state.dirty,false);
});
test('conflict retains draft and old checksum and never retries a write',async t=>{
 const h=harness(t,{saveError:Object.assign(Error('Prüfsumme geändert'),{status:409})});await h.ui.load();h.state.draft.name='Unsaved';h.state.dirty=true;
 const saving=h.ui.save();await tick();h.dialog.close('save');await saving;
 assert.equal(h.state.draft.name,'Unsaved');assert.equal(h.state.dirty,true);assert.equal(h.state.katalogEditor.checksum,'original');assert.equal(h.map.get('#conflict-banner').hidden,false);assert.equal(h.calls.filter(c=>c.method==='PUT').length,1);
});
test('discard and dashboard return preserve the existing explicit decision and embedding context',async t=>{
 const h=harness(t);await h.ui.load();h.state.draft.name='Unsaved';h.state.dirty=true;
 h.map.get('#katalog-discard').dispatchEvent(new Event('click'));await tick();assert.equal(h.state.draft.name,'D57');assert.equal(h.state.dirty,false);assert.equal(h.historyResets,1);
 await h.ui.leave();const url=new URL(location.href);assert.equal(url.pathname,'/werkstatt/designs/');assert.equal(url.searchParams.get('reihe'),'TRE-V2A-8x5');assert.equal(url.searchParams.get('linie'),'edelstahl-gravur');assert.equal(url.searchParams.get('host'),'public');assert.equal(url.searchParams.get('embedded'),'1');
});
test('cancelled discard keeps the draft and current editor location',async t=>{
 const h=harness(t,{discard:false});await h.ui.load();h.state.draft.name='Unsaved';h.state.dirty=true;const before=location.href;
 h.map.get('#katalog-discard').dispatchEvent(new Event('click'));await tick();assert.equal(h.state.draft.name,'Unsaved');await h.ui.leave();assert.equal(location.href,before);assert.equal(h.state.dirty,true);
});
test('font and content retain source line spacing while size changes scale it proportionally',()=>{
 const original={...text,lineHeight:6.81};assert.equal(katalogTextChange(original,'font','Wide',fonts).lineHeight,6.81);
 assert.equal(katalogTextChange(original,'text','AB',fonts).lineHeight,6.81);
 assert.equal(katalogTextChange(original,'size',20,fonts).lineHeight,13.62);
 assert.equal(cleanObject(original).lineHeight,6.81);
});
test('a failed initial catalogue request keeps product creation hidden and offers a safe retry',async t=>{
 const h=harness(t,{loadError:Error('Schriftdatei fehlt')});
 assert.equal(h.map.get('.overview').hidden,true);assert.equal(h.map.get('.page-heading').hidden,true);assert.equal(h.map.get('#editor-section').hidden,false);
 await assert.rejects(h.ui.load(),/Schriftdatei fehlt/);h.ui.sync();
 assert.equal(h.map.get('#katalog-reload').hidden,false);assert.equal(h.map.get('#katalog-fit').disabled,true);assert.equal(h.state.record,null);
 assert.equal(h.calls.some(c=>c.path.startsWith('/api/workshop/products')),false);assert.match(h.map.get('#stage-status').textContent,/nicht geladen/);
 h.map.get('#katalog-reload').dispatchEvent(new Event('click'));await tick();assert.equal(h.calls.length,2);assert.match(h.messages.at(-1)[0],/Schriftdatei fehlt/);
 await h.ui.leave();assert.equal(new URL(location.href).pathname,'/werkstatt/designs/');
});
test('retry after a failed reload cannot discard a newly edited draft without confirmation',async t=>{
 const h=harness(t,{discard:false,loadError:Error('offline')});h.state.record={document:doc()};h.state.draft=doc();h.state.draft.name='Unsaved';h.state.dirty=true;
 h.map.get('#katalog-reload').dispatchEvent(new Event('click'));await tick();
 assert.equal(h.calls.length,0);assert.equal(h.state.draft.name,'Unsaved');assert.equal(h.state.dirty,true);
});
test('catalogue mode keeps existing editor, token helper and narrow controls instead of product writes',()=>{
 const app=fs.readFileSync(new URL('./ui/app.mjs',import.meta.url),'utf8'),editor=fs.readFileSync(new URL('./ui/product-editor-ui.mjs',import.meta.url),'utf8'),css=fs.readFileSync(new URL('./ui/editor.css',import.meta.url),'utf8');
 assert.match(app,/merchantRequest as fetch/);assert.match(app,/event.preventDefault\(\);if\(state.katalogEditor\|\|state.busy/);assert.match(app,/async function mutateRecord\(action,body\)\{\n if\(state.katalogEditor\)return;/);assert.match(app,/installProductEditor/);assert.match(app,/if\(state\.katalogEditor\)return katalogEditor\.save\(\)/);
 assert.match(app,/for\(const field of \$\$\('#product-form input/);
 assert.match(editor,/if\(!state\.katalogEditor\)fitPosition/);assert.match(editor,/state\.katalogEditor&&!\['text','remove'\]\.includes\(action\)/);
 assert.match(editor,/katalogTextChange\(o,key,value/);assert.match(css,/\.editing-katalog \[data-editor-action=motif\]/);assert.match(css,/max-width:760px/);
});

test('existing workshop size input and pointer resize preserve explicit source line spacing',()=>{
 const lines=fs.readFileSync(new URL('./ui/product-editor-ui.mjs',import.meta.url),'utf8').split('\n'),original={...text,text:'A\nA',lineHeight:6.81};
 const input=lines.find(line=>line.includes('try{next=state.katalogEditor?')),failure=lines[lines.indexOf(input)+1];
 const env={o:original,key:'size',value:20,state:{katalogEditor:null,draft:{config:{localResources:{fonts},profile:{geometry:{}}}}},n:{setCustomValidity(){},reportValidity(){throw Error('Invalid size');}},measureText,setTextSize,fitPosition(){}};
 const changed=vm.runInNewContext('(()=>{let next;'+input+failure+';return next;})()',env);assert.equal(changed.size,20);assert.equal(changed.lineHeight,13.62);assert.equal(original.lineHeight,6.81);
 const resize=lines.find(line=>line.includes("if(next.type==='text'){setTextSize(next,"));assert.ok(resize);
 for(const katalogEditor of [null,{}]){const next={...original};vm.runInNewContext(resize,{next,original,scale:2,state:{...env.state,katalogEditor},measureText,setTextSize});assert.equal(next.size,20);assert.equal(next.lineHeight,13.62);}
});

function overlayWindow(t){
 const messages=[],listeners=new Map(),origin='https://example.test',channel='12345678-abcd-4321-abcd-123456789012';
 const parent={location:{origin},postMessage(data,targetOrigin){messages.push({data,targetOrigin});}};
 const href=origin+'/werkstatt/designs/bearbeiten/?'+new URLSearchParams({katalogOverlay:channel,katalogReihe:'TRE-V2A-8x5',katalogDesign:'D57'});
 globalThis.window={parent,location:{origin,href},document:{querySelector(){return null;}},addEventListener(type,listener){listeners.set(type,listener);}};
 t.after(()=>{delete globalThis.window;});
 return {messages,origin};
}

test('embedded catalogue save reports its exact identity and return closes the overlay without navigation',async t=>{
 const w=overlayWindow(t),h=harness(t);await h.ui.load();
 const before=location.href;h.state.draft.name='Edited';h.state.dirty=true;h.ui.sync();
 assert.equal(w.messages.at(-1).data.dirty,true);
 const saving=h.ui.save();await tick();h.dialog.close('save');await saving;
 const saved=w.messages.find(message=>message.data.type==='gravuru-katalog-editor-saved');
 assert.deepEqual(saved.data,{type:'gravuru-katalog-editor-saved',channel:'12345678-abcd-4321-abcd-123456789012',reihe:'TRE-V2A-8x5',id:'D57',changed:true,checksum:'new'});
 await h.ui.leave();assert.equal(location.href,before);
 assert.equal(w.messages.at(-1).data.type,'gravuru-katalog-editor-closed');assert.equal(h.state.dirty,false);
 assert.ok(w.messages.every(message=>message.targetOrigin===w.origin));
});

test('embedded catalogue cancelled discard leaves the edited draft and its overlay open',async t=>{
 const w=overlayWindow(t),h=harness(t,{discard:false});await h.ui.load();
 h.state.draft.name='Unsaved';h.state.dirty=true;const before=location.href;
 await h.ui.leave();assert.equal(location.href,before);assert.equal(h.state.draft.name,'Unsaved');assert.equal(h.state.dirty,true);
 assert.equal(w.messages.at(-1).data.type,'gravuru-katalog-editor-close-cancelled');
 assert.equal(w.messages.some(message=>message.data.type==='gravuru-katalog-editor-closed'),false);
});

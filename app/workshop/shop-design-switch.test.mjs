import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesignSwitch,switchedEditorPath,switchedModel} from './ui/shop-design-switch.mjs';
import {copyProductSelection} from './ui/shop-selection-transfer.mjs';
import {preserveProductSelection} from '../configurator/variant-m/product-design-transfer.mjs';
const binding={productId:'synthetic-target',productRevision:2,shopifyProductId:'gid://shopify/Product/2',shopifyVariantId:'gid://shopify/ProductVariant/22'};
const data=()=>({editorPath:'/_merchant-editor.html',binding,model:{name:'Target',configuration:{id:binding.productId,revision:2},universal:{profile:{designs:[{id:'design-target'}]}},legacy:{}}});
const result=()=>({token:'gse1.new.signature',binding,designId:'design-target'});
test('new product never inherits previous cart edit IDs; legitimate embedded toolbar remains',()=>{
 assert.equal(switchedEditorPath(data(),new URLSearchParams('embed=1&leiste=b&config=old&rev=8&line=old-line')),'/_merchant-editor.html?leiste=b');
 assert.equal(switchedEditorPath(data(),new URLSearchParams('leiste=b&config=old')),'/_merchant-editor.html');
});
test('switch model must exactly match new session product, variant, revision and existing design',()=>{
 const original=data(),changed=switchedModel(original,result());assert.equal(changed.model.universal.profile.defaultDesignId,'design-target');assert.equal(original.model.universal.profile.defaultDesignId,undefined);
 for(const field of ['productId','productRevision','shopifyProductId','shopifyVariantId'])assert.throws(()=>switchedModel(data(),{...result(),binding:{...binding,[field]:'foreign'}}));
 assert.throws(()=>switchedModel(data(),{...result(),designId:'unknown'}));
});
function fixture({fail=false,transferFailure=false,readDuringActivation=false,model=data()}={}){
 const listeners=new Set(),frames=[],win={location:{origin:'https://test.example'},history:{replaceState(_s,_t,hash){win.hash=hash;}},addEventListener(_type,fn){listeners.add(fn);},removeEventListener(_type,fn){listeners.delete(fn);},setTimeout,clearTimeout};
 const makeFrame=()=>({style:{},contentWindow:{},remove(){this.removed=true;}}),old=makeFrame();old.photoFile={name:'customer-photo.png'};
 const initReads=[];
 const nextClient={loadDesignGallery:async()=>({items:['next-design']}),loadDesignPreview:async()=>new Blob(['preview']),loadModel:async()=>{if(fail)throw Error('target-load-failed');return model;},loadResources:async()=>({target:true})};
 const client={switchDesign:async()=>result(),loadDesignGallery:async()=>[],loadDesignPreview:async()=>new Blob()};
 let active,api;const backAtActivation=[];
 const coordinator=createDesignSwitch({initial:{client,data:{old:true},resources:{old:true},frame:old},fragment:new URLSearchParams('s=gse1.old.signature&config=old-config&rev=2&line=old-line'),container:{append(frame){frames.push(frame);queueMicrotask(()=>{for(const listen of listeners)listen({origin:win.location.origin,source:frame.contentWindow,data:transferFailure?{type:'gravuru-design-transfer-failed',message:'Foto passt nicht in die neue Vorlage'}:{type:'gravuru-ux-ready'}});});}},activate(entry,gallery){active=entry;api=gallery;backAtActivation.push(gallery.canGoBack());if(readDuringActivation&&entry.previous){initReads.push(gallery.load(0),gallery.preview('target'));assert.throws(()=>gallery.back(),/vollständig geladen/);}},toDataUrl:async()=>'',win,doc:{createElement:makeFrame},clientFactory:()=>nextClient,timeoutMs:100});
 return {old,frames,win,coordinator,backAtActivation,initReads,get api(){return api;},get active(){return active;}};
}
test('successful switch uses new gateway; original live frame/photo survive and Back restores exact cart IDs',async()=>{
 const f=fixture(),oldApi=f.api,photo=f.old.photoFile,transfer={texts:[{fieldKey:'name',text:'Anna'}]};await oldApi.choose('signed-target',transfer);
 assert.deepEqual(f.backAtActivation,[false,true],'Back is visible during the new editor initialization, before its ready message');
 assert.equal(f.old.hidden,true);assert.equal(f.old.style.display,'none');assert.equal(f.old.photoFile,photo);assert.notEqual(f.active.frame,f.old);assert.equal(f.api.hasPendingTransfer(),true);assert.deepEqual(f.api.takeTransfer(),transfer);assert.equal(f.api.hasPendingTransfer(),false);
 assert.ok(!f.win.hash.includes('config='));assert.equal(f.api.canGoBack(),true);assert.throws(()=>oldApi.load());
 const target=f.active.frame;assert.equal(f.api.back(),true);assert.equal(f.active.frame,f.old);assert.equal(f.old.hidden,false);assert.equal(f.old.photoFile,photo);assert.equal(target.removed,true);assert.match(f.win.hash,/config=old-config/);assert.match(f.win.hash,/line=old-line/);
});
test('failed target load leaves original frame, photo, gateway and cart context intact',async()=>{
 const f=fixture({fail:true}),photo=f.old.photoFile;await assert.rejects(f.api.choose('signed-target',{}),/target-load-failed/);assert.equal(f.active.frame,f.old);assert.equal(f.old.photoFile,photo);assert.equal(f.old.removed,undefined);assert.equal(f.api.canGoBack(),false);assert.equal(f.win.hash,undefined);
});

test('switch validates and transfers options and quantity before replacing the original editor',async()=>{
 const model=data();model.model.universal.profile.optionGroups=[{id:'mounting',defaultValueId:'K00',values:[{id:'K00',priceCents:0},{id:'B02S',priceCents:269}]}];
 const good=fixture({model}),selection={options:{mounting:'B02S'},quantity:3};await good.api.choose('signed-target',{texts:[],selection});
 assert.deepEqual(good.api.takeTransfer().selection,selection);
 const bad=fixture({model});await assert.rejects(bad.api.choose('signed-target',{selection:{options:{mounting:'unknown'},quantity:3}}));
 assert.equal(bad.active.frame,bad.old);assert.equal(bad.frames.length,0);assert.equal(bad.old.hidden,false);
});

test('entry transports raw choices; the receiving editor retains the full conditional validation',()=>{
 const config={profile:{optionGroups:[{id:'mounting',defaultValueId:'K00',values:[{id:'K00'},{id:'B02S'}]},{id:'color',visibleIf:{groupId:'mounting',valueIds:['B02S']},defaultValueId:'silver',values:[{id:'silver'},{id:'black'}]}],optionFields:[{id:'message',kind:'text',label:'Beschriftung'}]}};
 const source={quantity:2,options:{mounting:'B02S',color:'black',message:'Familie Müller'}};
 const copy=copyProductSelection(source,config);assert.deepEqual(copy,source);assert.notEqual(copy.options,source.options);
 assert.deepEqual(preserveProductSelection(copy,config),source);
 const hidden=copyProductSelection({quantity:2,options:{mounting:'K00',color:'black'}},config);
 assert.equal(hidden.options.color,'black','entry must not silently discard the chosen color');
 assert.throws(()=>preserveProductSelection(hidden,config),/bisherige Gestaltung bleibt erhalten/);
 for(const options of [[],{foreign:'x'},{mounting:'missing'}])assert.throws(()=>copyProductSelection({quantity:2,options},config));
 for(const quantity of [0,100,1.5,NaN])assert.throws(()=>copyProductSelection({quantity,options:{}},config));
 assert.equal(copyProductSelection(null,config),null);
 assert.deepEqual(copyProductSelection({quantity:1,options:{}},config),{quantity:1,options:{}},'entry does not invent defaults');
});

test('receiving editor rejects an incompatible photo immediately and restores the entire original frame',async()=>{
 const f=fixture({transferFailure:true}),photo=f.old.photoFile;
 await assert.rejects(f.api.choose('signed-target',{content:{texts:[],photos:[{uxUploadId:'p'}]}}),/Foto passt nicht/);
 assert.equal(f.active.frame,f.old);assert.equal(f.old.photoFile,photo);assert.equal(f.old.hidden,false);assert.equal(f.old.inert,false);assert.equal(f.api.canGoBack(),false);assert.equal(f.frames[0].removed,true);assert.equal(f.win.hash,undefined);
});
test('private transfer preserves photo bytes while the previous frame remains usable',async()=>{
 const f=fixture(),file=new Blob(['private original'],{type:'image/png'}),transfer={content:{texts:[],photos:[{uxUploadId:'p',uxUploadKind:'photo'}]},photoFiles:[{id:'p',asset:{file,width:600,height:400}}]};
 await f.api.choose('signed-target',transfer);const pending=f.api.takeTransfer();assert.equal(await pending.photoFiles[0].asset.file.text(),'private original');assert.equal(pending.content.photos[0].uxUploadId,'p');assert.equal(f.api.back(),true);assert.equal(f.active.frame,f.old);
});


test('the candidate can load gallery and thumbnails before ready, while mutations remain locked',async()=>{
 const f=fixture({readDuringActivation:true});await f.api.choose('signed-target',{});
 const [gallery,image]=await Promise.all(f.initReads);assert.deepEqual(gallery,{items:['next-design']});assert.equal(await image.text(),'preview');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {installGalleryWorkbench,retainedGalleryBlob} from './gallery-workbench.mjs';

test('retained source bytes survive repeated edits without fetching blob URLs',()=>{
 const original=new Blob(['original']),processed=new Blob(['processed']),previous=new Blob(['previous-edited-source']);
 const files=new Map([['first',{file:original,url:'blob:first'}],['previous',{file:original,blob:previous,url:'blob:previous'}],['now',{file:original,blob:processed,url:'blob:now',originalUrl:'blob:first',editSourceUrl:'blob:previous'}]]);
 assert.equal(retainedGalleryBlob(files,'blob:first'),original);assert.equal(retainedGalleryBlob(files,'blob:previous'),previous);assert.equal(retainedGalleryBlob(files,'blob:now'),processed);
 assert.throws(()=>retainedGalleryBlob(files,'blob:missing'),/Bearbeitungsquelle/);
});

function environment(t,{fetchFails=false}={}){
 const originals=new Map(['window','location','document','fetch','Image'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 t.after(()=>{for(const [k,value]of originals)value?Object.defineProperty(globalThis,k,value):delete globalThis[k];});
 const messages=[],listeners={},source={id:'photo',type:'photoSlot',w:40.12347,h:60.67891,x:80.12347,y:90.67891,photoShape:'rect'};
 const config={workbench:{gallery:true},profile:{material:{kind:'slate'},designs:[{id:'original',objects:[source]}]}};
 const parent={location:{origin:'http://127.0.0.1:8202'},postMessage:m=>messages.push(m),GravuruGalleryEditor:{context:{productId:'cfg',designId:'original',originalId:'SOURCE',revision:1},photos:[{objectId:'photo',assetId:'a'.repeat(64)}]}};
 Object.assign(globalThis,{window:{parent,addEventListener:(key,fn)=>listeners[key]=fn},location:{origin:parent.location.origin},document:{createElement:()=>({})},fetch:async url=>{assert.equal(String(url).startsWith('/originale/editor/media?'),true);return {ok:!fetchFails,blob:async()=>new Blob(['original'],{type:'image/png'})};},Image:class{naturalWidth=40;naturalHeight=60;async decode(){}}});
 const files=new Map(),el={shadowRoot:{append(){},querySelectorAll(){return[];}},state:{designId:'original',objects:[structuredClone(source)]},normalize(){for(const o of this.state.objects)for(const key of ['x','y','w','h'])o[key]=Math.round(o[key]*100)/100;},sync(){}};
 return {files,el,config,parent,messages,listeners,source};
}

test('legacy photo no-op restores source precision and reuses the immutable photo asset',async t=>{
 const f=environment(t);await installGalleryWorkbench({...f,say(){},pending:()=>false});
 assert.equal(f.el.state.objects[0].uxPhotoColor,'original');
 f.listeners.message({origin:f.parent.location.origin,source:f.parent,data:{type:'gravuru-gallery-snapshot-request',requestId:'one'}});
 const snapshot=f.messages.find(m=>m.type==='gravuru-gallery-snapshot');assert.ok(snapshot);
 for(const key of ['x','y','w','h'])assert.equal(snapshot.objects[0][key],f.source[key]);
 assert.deepEqual(snapshot.photos,[{objectId:'photo',assetId:'a'.repeat(64)}]);
 f.listeners.message({origin:'https://foreign.example',source:f.parent,data:{type:'gravuru-gallery-snapshot-request',requestId:'foreign'}});
 assert.equal(f.messages.some(m=>m.requestId==='foreign'),false);
});

test('existing user-edited photo retains saved colour, edit source and crop without replacing its immutable asset',async t=>{
 const f=environment(t),crop={zoom:1.3,x:.1,y:-.2,angle:90};
 Object.assign(f.parent.GravuruGalleryEditor.photos[0],{schema:'gravuru-gallery-photo/v1',edited:true,color:'sepia',editSourceColor:'grayscale',crop});
 await installGalleryWorkbench({...f,say(){},pending:()=>false});
 const object=f.el.state.objects[0],asset=f.files.get(object.uxUploadId);
 assert.equal(object.uxPhotoColor,'sepia');assert.equal(asset.edited,true);assert.equal(asset.editSourceColor,'grayscale');assert.deepEqual(object.uxPhotoCrop,crop);
 f.listeners.message({origin:f.parent.location.origin,source:f.parent,data:{type:'gravuru-gallery-snapshot-request',requestId:'edited'}});
 assert.deepEqual(f.messages.find(m=>m.type==='gravuru-gallery-snapshot').photos,[{objectId:'photo',assetId:'a'.repeat(64)}]);
});

test('missing stored photo leaves the full editor unsaveable and reports the resource error to its host',async t=>{
 const f=environment(t,{fetchFails:true});await assert.rejects(installGalleryWorkbench({...f,say(){},pending:()=>false}),/Originalfoto/);
 assert.equal(f.messages.some(m=>m.type==='gravuru-gallery-ready'),false);
 assert.match(f.messages.find(m=>m.type==='gravuru-gallery-start-error').message,/Originalfoto/);
});

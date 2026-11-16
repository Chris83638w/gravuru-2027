import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateVectorLogoFile,requestVectorLogoPreview,logoMediaPayload,logoPlacement,vectorLogoEnabled,vectorLogoPreviewFilter} from './logo-upload.mjs';
import {uploadTabVisible} from './ux-model.mjs';
const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><path fill="red" d="M0 0H20V10H0Z"/></svg>';
const black=source.replace('red','black'),hash=s=>createHash('sha256').update(s).digest('hex');
const file=()=>new File([source],'logo.svg',{type:'image/svg+xml'});
const binding={productId:'logo-test',productRevision:2};
const converted=()=>({version:'svg-black-v1',sourceSha256:hash(source),outputSha256:hash(black),width:20,height:10,svg:Buffer.from(black).toString('base64'),preview:Buffer.from(source).toString('base64'),warnings:['Farben prüfen.']});
test('acrylic vector preview adopts engraving ink while retaining alpha and source bytes',async()=>{
 const asset=await requestVectorLogoPreview(file(),{binding,request:async()=>({ok:true,json:async()=>converted()})});
 const before=await asset.blob.text(),matrix=vectorLogoPreviewFilter({material:{kind:'acrylic'},processing:{profileId:'acrylic-engraving'}}).match(/values="([^"]+)"/)[1].split(' ').map(Number);
 const transformed=[0,1,2,3].map(row=>matrix.slice(row*5,row*5+5).reduce((sum,n,i)=>sum+n*([0,0,0,.3,1][i]),0));
 assert.deepEqual(transformed,[225/255,228/255,229/255,.3]);
 assert.equal(vectorLogoPreviewFilter({material:{kind:'steel'},processing:{profileId:'steel-engraving'}}),'');
 assert.equal(vectorLogoPreviewFilter({material:{kind:'acrylic'},processing:{profileId:'acrylic-print'}}),'');
 assert.equal(await asset.blob.text(),before);assert.equal(hash(before),asset.vectorLogo.outputSha256);
});
test('vector upload is explicit and does not reveal legacy upload tabs',()=>{
 const config={photo:{enabled:false},logo:{enabled:true},profile:{designs:[]}};
 assert.equal(vectorLogoEnabled(config),false);assert.equal(uploadTabVisible(config,'none',{photoEnabled:false}),false);
 config.logo.vectorUpload=true;assert.equal(vectorLogoEnabled(config),true);assert.equal(uploadTabVisible(config,'none',{photoEnabled:false}),true);
});
test('SVG selection rejects photos, disguised file types, oversized files and fifth upload',()=>{
 assert.doesNotThrow(()=>validateVectorLogoFile(file()));
 for(const v of [{name:'a.png',type:'image/png',size:20},{name:'a.svg',type:'image/png',size:20},{name:'a.svg',type:'image/svg+xml',size:2*1024*1024+1}])assert.throws(()=>validateVectorLogoFile(v),/Vektorlogo/);
 const objects=Array.from({length:4},(_,i)=>({uxUploadId:String(i)}));assert.throws(()=>validateVectorLogoFile(file(),objects),/vier/);assert.doesNotThrow(()=>validateVectorLogoFile(file(),objects,'2'));
});
test('bound preview passes original bytes and rejects wrong source/output hashes',async()=>{
 let sent;
 const request=async(url,options)=>{sent={url,...options};return {ok:true,json:async()=>converted()};};
 const asset=await requestVectorLogoPreview(file(),{binding,request,csrfToken:'test'});
 assert.equal(sent.url,'/api/workshop/customer-vector-logo/preview');assert.equal(sent.headers['X-Gravuru-CSRF'],'test');
 assert.deepEqual(JSON.parse(sent.body),{...binding,name:'logo.svg',original:Buffer.from(source).toString('base64')});
 assert.equal(await asset.file.text(),source);assert.equal(await asset.blob.text(),black);assert.equal(await asset.preview.text(),source);
 for(const key of ['sourceSha256','outputSha256'])await assert.rejects(requestVectorLogoPreview(file(),{binding,request:async()=>({ok:true,json:async()=>({...converted(),[key]:'0'.repeat(64)})})}),/Prüfsumme/);
 await assert.rejects(requestVectorLogoPreview(file(),{request}),/Produktstand/);
});
test('server conversion rejection cannot become an accepted client asset',async()=>{
 await assert.rejects(requestVectorLogoPreview(file(),{binding,request:async()=>({ok:false,json:async()=>({error:{message:'Eingebettete Bilder nicht erlaubt.'}})})}),/Eingebettete/);
 await assert.rejects(requestVectorLogoPreview(file(),{binding,request:async()=>({ok:true,json:async()=>({...converted(),version:'unverified'})})}),/unvollständig/);
});
test('media payload preserves immutable original, confirmed vector and matching metadata',async()=>{
 const asset=await requestVectorLogoPreview(file(),{binding,request:async()=>({ok:true,json:async()=>converted()})});
 const payload=await logoMediaPayload(asset,'id-1');
 assert.equal(Buffer.from(payload.original,'base64').toString(),source);assert.equal(Buffer.from(payload.edited,'base64').toString(),black);
 assert.deepEqual(payload.vectorLogo,{version:'svg-black-v1',sourceSha256:hash(source),outputSha256:hash(black)});assert.equal(payload.name,'logo.svg');
 const photo=await logoMediaPayload({file:new File(['photo'],'image.png',{type:'image/png'})},'photo');assert.deepEqual(Object.keys(photo).sort(),['id','original']);
});
test('placement retains aspect ratio and replacement location/rotation',()=>{
 const placed=logoPlacement(120,80,{width:20,height:10});assert.deepEqual(placed,{x:60,y:28,w:36,h:18,rotation:0});
 assert.deepEqual(logoPlacement(120,80,{width:10,height:20},{x:40,y:30,w:30,h:20,rotation:15}),{x:40,y:30,w:10,h:20,rotation:15});
});

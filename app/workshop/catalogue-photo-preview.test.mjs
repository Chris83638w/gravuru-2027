import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {productPreview} from './product-preview.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {photoColorMode,photoColorFilter,photoEngravingPreviewFilter} from '../platform/sources/app/shared/models/photo-color.mjs';
import {photoClip,photoMaskURL} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {previewResourceURL} from '../configurator/variant-m/preview-resource.mjs';

const assetId='a'.repeat(64),maskId='b'.repeat(64);
const picture='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
function fixture(){
 const slot={id:'foto-1',type:'photoSlot',x:35,y:25,w:40,h:30,rotation:7,photoShape:'template',photoMaskAssetId:maskId};
 const design={id:'catalogue-photo',name:'Synthetic catalogue photo',objects:[slot]};
 return {profile:{kind:'universal-product',material:{kind:'slate',color:'#41494b'},processing:{profileId:'slate-engraving'},geometry:{width:100,height:70,shape:'contour',outlinePath:'M0 0H100V70H0Z',holes:[]},designs:[design],defaultDesignId:design.id},photo:{enabled:true,hints:[{designId:design.id,slotId:slot.id,enabled:false}]},localResources:{fonts:{},motifs:[]}};
}

test('catalogue photo preview keeps original pixels, mask and placement over slate including the outer contour',()=>{
 const config=fixture(),before=JSON.stringify(config),design=config.profile.designs[0];
 const svg=productPreview({universal:config},{designId:design.id,examples:[{designId:design.id,slotId:'foto-1',assetId,url:picture}]});
 assert.ok(svg.includes(picture));assert.ok(svg.includes('/'+maskId+'/preview.svg'));
 assert.match(svg,/data-template-photo-mask="true"/);assert.match(svg,/translate\(35 25\) rotate\(7\)/);
 assert.match(svg,/data-contour-artwork="true" clip-path=/);
 assert.doesNotMatch(svg,/mix-blend-mode|type="saturate"|photo-example-foto-1-gray/);
 assert.equal(JSON.stringify(config),before);
});

test('catalogue display flag cannot change native media rendering without an example callback',()=>{
 const config=fixture(),design=config.profile.designs[0];
 design.objects[0].media={mediaId:'customer',revisionId:'1'};
 const options={handles:false,media:[{mediaId:'customer',revisionId:'1',url:'blob:unchanged-photo',width:400,height:300}]};
 assert.equal(studioSvg(config.profile,design,{},options),studioSvg(config.profile,design,{},{...options,originalPhotoPreview:true}));
 // The old non-example callback path remains available and unchanged.
 assert.match(studioSvg(config.profile,design,{},{...options,photoExampleMarkup:()=>''}),/data-contour-artwork="true" style="mix-blend-mode:lighten"/);
});

function fullEditorPhoto({gallery,color='original',edited=false}){
 const source=fs.readFileSync(new URL('../configurator/variant-m/ux.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
 const start=source.indexOf('  el.uxObjectSVG=o=>{'),end=source.indexOf('\n  };',start);
 assert.ok(start>=0&&end>start);
 const profile=fixture().profile,el={state:{selected:null}},files=new Map([['photo',{url:'blob:original',width:400,height:300,edited}]]);
 const env={el,files,profile,config:{workbench:{gallery}},isPrint:false,esc:String,getProcessingProfile,photoColorMode,photoColorFilter,photoEngravingPreviewFilter,photoPlacement,photoClip,photoMaskURL,previewResourceURL};
 vm.runInNewContext(source.slice(start,end+5),env);
 return el.uxObjectSVG({...profile.designs[0].objects[0],uxUploadId:'photo',uxUploadKind:'photo',uxPhotoColor:color});
}

test('full gallery editor shows catalogue original without losing dark detail and retains explicit edited colours',()=>{
 const original=fullEditorPhoto({gallery:true});
 assert.match(original,/href="blob:original"/);assert.match(original,/data-template-photo-mask/);
 assert.doesNotMatch(original,/mix-blend-mode|saturate|data-photo-preview-treatment/);
 assert.match(fullEditorPhoto({gallery:true,color:'grayscale'}),/type="saturate" values="0"/);
 assert.doesNotMatch(fullEditorPhoto({gallery:true,color:'grayscale',edited:true}),/saturate/);
 assert.match(fullEditorPhoto({gallery:false,color:'grayscale'}),/data-photo-preview-treatment="engraving"/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {cleanObject,saveDraft,readDraft} from '../configurator/variant-m/contract.mjs';
import {restoreElementRights} from '../configurator/variant-m/element-rights.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {photoClip} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';
import {makeProductDocument,validateProductDesign} from './product-model.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const options={mounting:'none'},crop={zoom:1.5,x:.2,y:-.1,angle:12};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const python=process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3');
function fixture({move=true,replace=false,maskAssetId='a'.repeat(64)}={}){
 const config=syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64)));
 config.profile.designs[0].objects=[{id:'portrait',type:'photoSlot',fieldKey:'photo-portrait',x:60,y:70,w:40,h:40,rotation:0,
  photoShape:'template',photoMaskAssetId:maskAssetId,required:true,customerEditable:true,templateOrigin:true,
  uxUploadId:'own-photo',uxUploadKind:'photo',uxPhotoCrop:structuredClone(crop)}];
 const document=makeProductDocument(config),design=document.config.profile.designs[0];
 document.elementRights[design.id].portrait={content:false,color:false,replace,move,scale:false,delete:false};
 return {document,design,slot:design.objects[0],rights:document.elementRights[design.id]};
}

test('moving a native masked photo survives server validation and draft roundtrip without changing crop or mask',()=>{
 const {document,design,slot,rights}=fixture(),source=structuredClone(design);
 const moved={...structuredClone(slot),x:110,y:80};
 const restored=restoreElementRights(design.objects,[moved],rights);
 assert.deepEqual(restored.blockedIds,[]);
 assert.deepEqual(restored.objects,[moved]);
 const accepted=validateProductDesign(document,{...design,objects:restored.objects},{options});
 const config={...document.config,workshopElementRights:document.elementRights};
 const saved=saveDraft(config,{designId:design.id,objects:accepted.objects},options,config.localResources.fonts,config.localResources.motifs);
 const reopened=readDraft(config,JSON.parse(JSON.stringify(saved)),config.localResources.fonts,config.localResources.motifs).design.objects[0];
 assert.deepEqual(reopened,moved);
 assert.deepEqual(cleanObject(moved),moved);
 assert.deepEqual(reopened.uxPhotoCrop,slot.uxPhotoCrop);
 assert.equal(reopened.photoMaskAssetId,slot.photoMaskAssetId);
 assert.deepEqual(photoPlacement(reopened,{width:100,height:100}),photoPlacement(slot,{width:100,height:100}));
 assert.deepEqual(photoClip(reopened,'mask'),photoClip(slot,'mask'),'mask stays in object-local coordinates');
 assert.deepEqual(design,source,'customer movement does not mutate the template');
});

test('crop permission cannot move the masked field and move permission cannot change its crop',()=>{
 const {document,design,slot,rights}=fixture({move:false,replace:true});
 const changed={...structuredClone(slot),x:110,y:80,uxPhotoCrop:{zoom:2,x:-.25,y:.3,angle:25}};
 const restored=restoreElementRights(design.objects,[changed],rights);
 assert.deepEqual(restored.blockedIds,['portrait']);
 assert.equal(restored.objects[0].x,slot.x);assert.equal(restored.objects[0].y,slot.y);
 assert.deepEqual(restored.objects[0].uxPhotoCrop,changed.uxPhotoCrop);
 assert.equal(restored.objects[0].photoMaskAssetId,slot.photoMaskAssetId);
 assert.throws(()=>validateProductDesign(document,{...design,objects:[changed]},{options}),/Recht move fehlt/);
 assert.doesNotThrow(()=>validateProductDesign(document,{...design,objects:restored.objects},{options}));
 const movable=fixture();
 const wrongCrop={...structuredClone(movable.slot),x:110,uxPhotoCrop:changed.uxPhotoCrop};
 assert.throws(()=>validateProductDesign(movable.document,{...movable.design,objects:[wrongCrop]},{options}),/Recht replace fehlt/);
 const repaired=restoreElementRights(movable.design.objects,[wrongCrop],movable.rights).objects[0];
 assert.equal(repaired.x,110);assert.deepEqual(repaired.uxPhotoCrop,movable.slot.uxPhotoCrop);
});

test('moving rights never allow replacing or removing the original photo mask',()=>{
 const {document,design,slot,rights}=fixture();
 for(const mutate of [o=>o.photoShape='rect',o=>o.photoMaskAssetId='b'.repeat(64),o=>delete o.photoMaskAssetId]){
  const changed={...structuredClone(slot),x:110,y:80};mutate(changed);
  assert.throws(()=>validateProductDesign(document,{...design,objects:[changed]},{options}),/Fotomaske|Vorlageneigenschaften/);
  const repaired=restoreElementRights(design.objects,[changed],rights).objects[0];
  assert.equal(repaired.x,110);assert.equal(repaired.y,80);
  assert.equal(repaired.photoShape,'template');assert.equal(repaired.photoMaskAssetId,slot.photoMaskAssetId);
  assert.deepEqual(repaired.uxPhotoCrop,slot.uxPhotoCrop);
 }
});

test('review and production move the native heart mask with its photo while preserving original mask bytes',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const heart='M20 36C18 34 2 22 2 12C2 0 16 0 20 9C24 0 38 0 38 12C38 22 22 34 20 36Z';
 const source=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><path fill="#ffffff" d="'+heart+'"/></svg>');
 const asset=await assets.import({name:'Heart-mask.svg',bytes:source.toString('base64')});
 const original=Buffer.from(assets.read(asset.assetId,true)),mask=Buffer.from(assets.read(asset.assetId));
 const maskHashes={original:digest(original),preview:digest(mask)};
 const {document,design,slot}=fixture({maskAssetId:asset.assetId});
 const moved={...structuredClone(slot),x:110,y:80,rotation:90};
 const png=spawnSync(python,['-c',"from PIL import Image;import sys;Image.new('RGB',(100,100),'red').save(sys.stdout.buffer,format='PNG')"],{windowsHide:true});
 assert.equal(png.status,0,png.stderr.toString());
 const record={id:document.config.profile.id,revision:1,document};
 const input={productId:record.id,productRevision:1,designId:design.id,objects:[moved],options,quantity:1,
  media:[{id:'own-photo',original:png.stdout.toString('base64')}],preview:png.stdout.toString('base64')};
 const bundle=await prepareAcrylicReview({record,config:document.config,input,assets});
 const art=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256);
 const saved=JSON.parse(art.files.get('produkt-und-gestaltung.json')).state.design.objects[0];
 assert.deepEqual(saved,moved);
 assert.deepEqual(saved.uxPhotoCrop,slot.uxPhotoCrop);
 assert.deepEqual(art.files.get('quellen/'+asset.assetId+'-original.svg'),original);
 assert.deepEqual(art.files.get('quellen/'+asset.assetId+'-vorschau.svg'),mask);
 assert.equal(digest(assets.read(asset.assetId,true)),maskHashes.original);
 assert.equal(digest(assets.read(asset.assetId)),maskHashes.preview);
 assert.match(art.svg,/data-field="native-0" transform="translate\(0 0\) scale\(1\) translate\(110 80\) rotate\(90\)"/);
 assert.match(art.svg,/<mask[^>]+x="-20" y="-20" width="40" height="40"/);
 assert.ok(!art.svg.includes('/api/workshop/'),'export embeds its immutable mask');
 // Exercise the real mask rasterizer: new centre and heart point are opaque;
 // the translated cutout and the former photo position remain transparent.
 const worker=fileURLToPath(new URL('./form-print-worker.py',import.meta.url));
 const code=[
  'import sys,json,importlib.util',
  "spec=importlib.util.spec_from_file_location('worker',sys.argv[1]);p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)",
  'root=p.ET.fromstring(sys.stdin.buffer.read());p.template_photo_masks(root,300);im=p.raster(p.ET.tostring(root),2200,1400)',
  'points=[(110,80),(96,80),(92,62),(60,70),(128,80)]',
  'print(json.dumps([im.getpixel((round(x*10),round(y*10)))[3] for x,y in points]))'
 ].join('\n');
 const raster=spawnSync(python,['-c',code,worker],{input:art.svg,windowsHide:true});
 assert.equal(raster.status,0,raster.stderr.toString());
 assert.deepEqual(JSON.parse(raster.stdout.toString().trim()),[255,255,0,0,0]);
});

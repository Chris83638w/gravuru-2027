import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createDesignAssetStore} from './design-assets.mjs';
import {prepareEditableDesign} from './editable-design.mjs';
import {replaceDesignArtwork} from './design-import.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {photoClip} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';
import {authorDesign} from './ui/design-authoring.mjs';
import {workshopResources} from './catalog.mjs';
import {productPreview} from './product-preview.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const seed=()=>makeProductDocument(syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64))));
test('PDF separates existing text, masked image and motif; originals and prices survive text replacement',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const pdf=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import pymupdf,sys,io
from PIL import Image
d=pymupdf.open();p=d.new_page(width=300,height=200)
p.insert_text((125,55),'My name',fontsize=18)
p.draw_rect(pymupdf.Rect(125,85,250,110),color=(0,0,0))
f=io.BytesIO();Image.new('RGB',(90,120),'#648db4').save(f,format='PNG');p.insert_image(pymupdf.Rect(10,10,100,150),stream=f.getvalue())
sys.stdout.buffer.write(d.tobytes())`]);assert.equal(pdf.status,0);
 const a=await assets.import({name:'Design.pdf',bytes:pdf.stdout.toString('base64')});
 const original=replaceDesignArtwork(seed(),assets,{designId:'slate-test',assetId:a.assetId,originalName:'Design.pdf'}).document;
 const before=JSON.stringify(original),prepared=await prepareEditableDesign(original,assets,'slate-test'),d=prepared.document.config.profile.designs[0];
 assert.equal(JSON.stringify(original),before);assert.ok(assets.read(a.assetId,true).equals(pdf.stdout));
 assert.equal(d.objects.length,3);assert.deepEqual(prepared.parts.map(p=>p.kind).sort(),['motif','photo','text']);
 assert.equal(prepared.document.config.basePriceCents,original.config.basePriceCents);
 const text=prepared.parts.find(p=>p.kind==='text');assert.equal(text.text,'My name');
 prepared.document.config.localResources.fonts['Open Sans']=workshopResources().fonts['Open Sans'];
 const next=authorDesign(prepared.document,d.id,'textify',{objectId:text.id,font:'Open Sans',text:'Unser Name'}).document;
 const checked=validateProductDocument(next);assets.validateDocument(checked);
 assert.equal(checked.config.profile.designs[0].objects.find(o=>o.id===text.id).type,'text');
 const examples=checked.config.localResources.photoExamples.map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.read(e.assetId).toString('base64')}));
 const svg=productPreview({universal:checked.config},{examples});assert.match(svg.replace(/<[^>]*>/g,''),/Hier eigenes Foto hochladen/);assert.match(svg,/data:image\/svg\+xml;base64/);
 assert.ok(!JSON.stringify(checked).includes('data-editor-selection'));
 assert.throws(()=>authorDesign(prepared.document,d.id,'textify',{objectId:text.id,font:'Open Sans',text:'Unbekannt \uE058'}),/benötigten Zeichen/);
});

test('original photo mask survives replacement, customer rights and the self-contained production package',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const png=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGB',(100,100),'red').save(sys.stdout.buffer,format='PNG')"]);assert.equal(png.status,0);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100"><defs><clipPath id="cross"><path d="M30 0H70V30H100V70H70V100H30V70H0V30H30Z"/></clipPath></defs><g clip-path="url(#cross)"><image width="100" height="100" href="data:image/png;base64,${png.stdout.toString('base64')}"/></g></svg>`;
 const source=await assets.import({name:'Photo.svg',bytes:Buffer.from(svg).toString('base64')});
 const original=replaceDesignArtwork(seed(),assets,{designId:'slate-test',assetId:source.assetId,originalName:'Photo.svg'}).document;
 const {document}=await prepareEditableDesign(original,assets,'slate-test'),d=document.config.profile.designs[0],slot=d.objects[0];
 assert.equal(slot.photoShape,'template');assert.match(slot.photoMaskAssetId,/^[a-f0-9]{64}$/);
 const mask=assets.read(slot.photoMaskAssetId).toString();assert.match(mask,/M30 0H70V30H100V70H70V100H30V70H0V30H30Z/);
 assert.match(photoClip(slot,'test').defs,/<mask /);assert.match(photoClip(slot,'test').attribute,/^mask=/);
 for(const mutate of [o=>o.photoShape='rect',o=>o.photoMaskAssetId='a'.repeat(64),o=>delete o.photoMaskAssetId]){
  const changed=structuredClone(d);mutate(changed.objects[0]);assert.throws(()=>validateProductDesign(document,changed));
 }
 const objects=structuredClone(d.objects);Object.assign(objects[0],{uxUploadId:'own-photo',uxUploadKind:'photo'});
 const record={id:document.config.profile.id,revision:1,document},input={productId:record.id,productRevision:1,designId:d.id,objects,options:{mounting:'none'},quantity:1,media:[{id:'own-photo',original:png.stdout.toString('base64')}],preview:png.stdout.toString('base64')};
 const bundle=await prepareAcrylicReview({record,config:document.config,input,assets});
 const art=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256);
 assert.deepEqual(art.files.get('quellen/'+slot.photoMaskAssetId+'-vorschau.svg'),assets.read(slot.photoMaskAssetId));
 assert.ok(!art.svg.includes('/api/workshop/'));assert.match(art.svg,/<mask /);
 // The produced artwork must actually expose the cross, not just retain metadata.
 const raster=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import sys,json,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('worker','app/workshop/form-print-worker.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
root=p.ET.fromstring(sys.stdin.buffer.read());p.template_photo_masks(root,300);im=p.raster(p.ET.tostring(root),2200,1400)
x=${slot.x};y=${slot.y};w=${slot.w};h=${slot.h}
print(json.dumps([im.getpixel((round((x+dx*w)*10),round((y+dy*h)*10)))[3] for dx,dy in [(0,0),(.4,.4),(-.4,-.4),(.4,0)]]))`],{input:art.svg});
 assert.equal(raster.status,0,raster.stderr.toString());assert.deepEqual(JSON.parse(raster.stdout),[255,0,0,255]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {openKatalog} from './katalog-source.mjs';
import {parseDesignSvg,katalogDesignToTemplate} from './katalog-convert.mjs';
import {prepareKatalogPhotoAssets,katalogPhotoExampleSvg} from './katalog-photo-assets.mjs';
import {examplePhotoMarkup,emptyMaskedPhotoMarkup} from '../configurator/variant-m/photo-placeholder.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {scaledPhotoMarkup} from './design-variants.mjs';
import {validateDesignContent} from '../platform/sources/app/shared/models/design-content.mjs';

const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const aperture='M0 25 C0 0 35 0 35 25 C35 0 70 0 70 25 L35 65 Z';
const svg=`<svg viewBox="0 0 90 70"><g id="foto-1" data-upload-window="0 0 70 65" data-upload-hint="separate"><path d="${aperture}" fill="none"/><image x="-9" y="-4" width="90" height="80" href="data:image/png;base64,${png}"/></g><path id="motiv-1" d="M75 5H85V15H75Z M78 8V12H82V8Z" fill="none" stroke="#000" stroke-width="0.4" fill-rule="evenodd"/></svg>`;
const family=()=>openKatalog(fileURLToPath(new URL('./fixtures/katalog/',import.meta.url))).families.get('test-schilder');
const design={id:'photo-shape-test',name:'Originalfoto',plateMm:[90,70],themes:[],svg:()=>svg};
test('path mask beginning at M0, inline image, original placement and engraving strokes survive conversion',()=>{
 const parsed=parseDesignSvg(svg),photo=parsed.layers[0];assert.equal(photo.shape,'template');assert.deepEqual(photo.bounds,[0,0,70,65]);assert.match(photo.maskSvg,/M0 25 C0 0 35 0/);assert.equal(photo.exampleImage.href,'data:image/png;base64,'+png);assert.deepEqual(photo.exampleImage.bounds,[-9,-4,90,80]);assert.equal(photo.exampleImage.uploadHint,true);assert.equal(parsed.notes.length,0);
 const out=katalogDesignToTemplate(design,family(),null);assert.equal(out.template.objects[0].photoShape,'template');assert.match(out.template.objects[0].photoMaskAssetId,/^[a-f0-9]{64}$/);assert.match(out.motifs[0].svgFragment,/fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="0.4"/);
 const image=katalogPhotoExampleSvg(photo.exampleImage);assert.match(image,/x="-9" y="-4" width="90" height="80"/);assert.ok(image.includes(png));assert.ok(image.includes(aperture));
});
test('preview preparation embeds the same mask and bytes without writing, real import binds immutable assets',async()=>{
 const original=katalogDesignToTemplate(design,family(),null),before=JSON.stringify(original);
 const preview=await prepareKatalogPhotoAssets(original,design,{previewOnly:true});assert.equal(preview.examples.length,1);assert.equal(preview.examples[0].uploadHint,true);assert.ok(Buffer.from(preview.examples[0].url.split(',')[1],'base64').toString().includes(png));assert.ok(Buffer.from(preview.previewMaskUrls[0].url.split(',')[1],'base64').toString().includes(aperture));assert.equal(JSON.stringify(original),before);
 await assert.rejects(prepareKatalogPhotoAssets(original,design),/Ablage/);
 const plain=katalogDesignToTemplate({...design,svg:()=>svg.replace(`<path d="${aperture}" fill="none"/>`,'<rect width="70" height="65"/>').replace(' data-upload-window="0 0 70 65"','')},family(),null);
 await assert.rejects(prepareKatalogPhotoAssets(plain,design),/Originalfoto.*Ablage/);
 const imported=[];const assets={import:async arg=>{const raw=Buffer.from(arg.bytes,'base64');imported.push(raw.toString());return {assetId:createHash('sha256').update('stored:'+arg.bytes).digest('hex')}}};
 const result=await prepareKatalogPhotoAssets(original,design,{assets});assert.equal(imported.length,2);assert.notEqual(result.template.objects[0].photoMaskAssetId,original.template.objects[0].photoMaskAssetId);assert.ok(imported[1].includes(png));assert.equal(result.examples[0].uploadHint,true);
});
test('slate photo preview blends black canvas only in preview and keeps an independent upload hint',()=>{
 const slot={id:'photo',w:70,h:65,photoShape:'template',photoMaskAssetId:'a'.repeat(64)};
 const screen=examplePhotoMarkup(slot,'b'.repeat(64),{enabled:true},undefined,{blendMode:'screen'});assert.match(screen,/mix-blend-mode:screen/);assert.match(screen,/data-ux-photo-hint="true"/);assert.match(screen,/data-template-photo-mask/);assert.doesNotMatch(screen,/stroke="black"/);
 assert.doesNotMatch(examplePhotoMarkup(slot,'b'.repeat(64),{enabled:false}),/mix-blend-mode|data-ux-photo-hint/);
 assert.match(examplePhotoMarkup(slot,'b'.repeat(64),{enabled:true},undefined,{blendMode:'lighten'}),/mix-blend-mode:lighten/);
 const empty=emptyMaskedPhotoMarkup(slot,'#eeeeee','#334242');assert.match(empty,/Foto hochladen/);assert.match(empty,/data-template-photo-mask/);assert.match(empty,/data-ux-camera="true"/);assert.match(empty,/data-ux-photo-hint="true"/);assert.doesNotMatch(empty.split('</defs>')[1],/preserveAspectRatio="none"/);
});
test('rounded and elliptical apertures retain their actual shape, malformed upload windows fail',()=>{
 assert.equal(parseDesignSvg('<svg viewBox="0 0 50 60"><g id="foto-1"><ellipse cx="20" cy="25" rx="10" ry="15"/></g></svg>').layers[0].shape,'ellipse');
 const rounded=parseDesignSvg('<svg viewBox="0 0 50 60"><g id="foto-1"><rect x="5" y="6" width="30" height="40" rx="3"/></g></svg>').layers[0];assert.equal(rounded.shape,'template');assert.match(rounded.maskSvg,/A3 3/);
 assert.throws(()=>parseDesignSvg(svg.replace('0 0 70 65','0 0 NaN 65')),/Uploadfenster/);
 assert.throws(()=>katalogPhotoExampleSvg({...parseDesignSvg(svg).layers[0].exampleImage,href:'../photo.png'},'.'),/zugeordnet/);
 const oval={...design,plateMm:[50,60],svg:()=>'<svg viewBox="0 0 50 60"><g id="foto-1"><ellipse cx="20" cy="25" rx="10" ry="15"/></g></svg>'};
 assert.doesNotThrow(()=>validateDesignContent(katalogDesignToTemplate(oval,family(),null).template,{universal:true}));
});

test('slate examples render in grayscale without changing the immutable image or its mask',async()=>{
 const prepared=await prepareKatalogPhotoAssets(katalogDesignToTemplate(design,family(),null),design,{previewOnly:true});
 const slot=prepared.template.objects.find(o=>o.type==='photoSlot'),example=prepared.examples[0],before=example.url;
 const slate=examplePhotoMarkup(slot,example.assetId,{enabled:true},example.url,{grayscale:true,blendMode:'lighten'});
 assert.match(slate,/<feColorMatrix type="saturate" values="0"/);
 assert.match(slate,/<image[^>]*filter="url\(#photo-example-foto-1-gray\)"/);
 assert.ok(slate.includes(before));assert.equal(example.url,before);
 assert.ok(Buffer.from(before.split(',')[1],'base64').toString().includes(png));
 assert.match(slate,/data-template-photo-mask/);assert.match(slate,/data-ux-photo-hint/);
 assert.doesNotMatch(examplePhotoMarkup(slot,example.assetId,{enabled:true},example.url),/feColorMatrix|filter="url\(#photo-example/);
});

test('actual immutable resource store preserves embedded original photo bytes and mask paths',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const result=await prepareKatalogPhotoAssets(katalogDesignToTemplate(design,family(),null),design,{assets});
 const slot=result.template.objects[0],example=result.examples[0];
 assert.ok(assets.read(slot.photoMaskAssetId,true).toString().includes(aperture));
 assert.ok(assets.read(example.assetId,true).toString().includes(png));
 assert.ok(assets.read(example.assetId).toString().includes(png));
});

test('size variants transform aperture and image together without replacing the aperture or resampling',()=>{
 const layer=parseDesignSvg(svg).layers[0],markup=scaledPhotoMarkup(layer,2,10,15);
 const result=parseDesignSvg('<svg viewBox="0 0 200 160">'+markup+'</svg>').layers[0];
 assert.deepEqual(result.bounds,[10,15,140,130]);assert.deepEqual(result.exampleImage.bounds,[-8,7,180,160]);
 assert.equal(result.exampleImage.href,layer.exampleImage.href);assert.equal(result.exampleImage.uploadHint,true);
 assert.match(result.maskPath,/M\s*10 65/);assert.match(result.maskPath,/C/);assert.equal(result.shape,'template');
});

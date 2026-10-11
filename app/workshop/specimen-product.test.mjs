import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {build,OUTPUT} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {importSpecimens} from './specimen-import.mjs';
import {nativeSpecimenConfig} from './specimen-product.mjs';
import {validateProductDocument,resolveProduct} from './product-model.mjs';
import {validateAcrylicReview,prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {productPreview} from './product-preview.mjs';
import {authorDesign} from './ui/design-authoring.mjs';
import {importEnvironment} from './design-assets.mjs';
import {digest} from './review-package.mjs';

test('recovered specimens preserve geometry and originals, retain merchant edits on repeated import and save customer reviews',async t=>{
 build();const seed=JSON.parse(fs.readFileSync(OUTPUT+'/models.json'))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>w.close());
 const before=w.repository.get(w.defaultId),rows=await importSpecimens(w);
 assert.deepEqual(w.repository.get(w.defaultId),before);assert.equal(w.repository.list().length,5);
 const aosu=w.repository.get(rows[0].product.id),steel=w.repository.get(rows[1].product.id);
 assert.equal(aosu.document.config.profile.designs[0].objects.length,4);
 assert.deepEqual(aosu.document.config.profile.geometry.cutPaths,JSON.parse(fs.readFileSync(new URL('../references/aosu-upgrade-2026-09-21/verification/profile-source.json',import.meta.url))).geometry.cutPaths);
 assert.ok(aosu.document.config.profile.purchasing.variants.every(v=>v.variantId===null));
 const c=aosu.document.config,groups=c.profile.optionGroups;
 for(const frame of groups[0].values)for(const color of groups[1].values)for(const mounting of groups[2].values){
  const r=resolveProduct(aosu.document,{options:{frame:frame.id,color:color.id,mounting:mounting.id}});
  assert.equal(r.price.unitCents,4999+mounting.priceCents);
  const svg=productPreview({universal:c},{options:r.resolvedOptions});
  assert.equal((svg.match(/data-mounting-screw/g)||[]).length,mounting.id==='B04S'?4:0);
  assert.ok(svg.includes('width="'+c.profile.frames.find(f=>f.key===frame.id).acrylic.width+'"'));
 }
 const edited=structuredClone(aosu.document);edited.config.profile.designs[0].objects.find(o=>o.type==='text').text='Zuhause';
 w.repository.save(aosu.id,edited,1);
 const again=await importSpecimens(w);assert.ok(again.every(r=>!r.master.created&&!r.product.created));assert.equal(w.repository.get(aosu.id).revision,2);
 assert.equal(w.repository.get(aosu.id).document.config.profile.designs[0].objects.find(o=>o.type==='text').text,'Zuhause');
 for(const mutate of [c=>c.profile.geometry.width=170,c=>c.profile.features.orderEnabled=true,c=>c.profile.geometry.cutPaths=[],c=>c.profile.optionGroups[0].values[0].priceCents=-1,c=>c.localResources.fonts={},c=>c.profile.designs[0].objects[0].y=180]){
  const bad=structuredClone(c);mutate(bad);assert.throws(()=>nativeSpecimenConfig(bad));
 }
 const added=authorDesign(aosu.document,c.profile.defaultDesignId,'text',{font:'Michroma'});assert.equal(validateProductDocument(added.document).config.profile.designs[0].objects.length,5);
 const png=execFileSync('python3',['-c',"from PIL import Image;import io,sys;f=io.BytesIO();Image.new('RGB',(120,80),'#aaa').save(f,format='PNG');sys.stdout.buffer.write(f.getvalue())"],{env:importEnvironment()}).toString('base64');
 for(const record of [aosu,steel]){
  const config=w.model(record.id,record.revision).universal;
  for(const d of config.profile.designs){
   const input={productId:record.id,productRevision:record.revision,designId:d.id,objects:structuredClone(d.objects),options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:1,media:[],preview:png};
   input.objects.find(o=>o.type==='text').x+=.1;
   const review=validateAcrylicReview(record,config,input);assert.equal(review.price.unitCents,record===aosu?4999:1099);
   const bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});
   if(record===aosu){assert.equal(bundle.manifest.capabilities.engraving,false);await assert.rejects(acrylicArtwork(bundle.package,digest(bundle.package),{engraving:true}),/getrennte Fertigungsausgabe/);}
   else{const art=await acrylicArtwork(bundle.package,digest(bundle.package),{engraving:true});assert.equal(art.geometry.widthMm,90);assert.equal(art.geometry.heightMm,60);assert.ok(!art.svg.includes('steel-reference-v4'));}
  }
 }
});

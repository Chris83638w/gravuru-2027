import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign} from './product-model.mjs';
import {authorDesign,fitPosition} from './ui/design-authoring.mjs';
import {formMotifs} from './form-additions.mjs';
import {workshopResources} from './catalog.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
const seed=()=>{const d=makeProductDocument(syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url))),'a'.repeat(64))));d.config.localResources.fonts['Open Sans']=workshopResources().fonts['Open Sans'];return d;};
const check=d=>{d=validateProductDocument(d);for(const design of d.config.profile.designs)validateProductDesign(d,design);return d;};
test('merchant creates a separate design, edits native text/motif/photo, and preserves the original and prices',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 async function resource(key){const m=formMotifs().find(m=>m.key===key);const a=await assets.import({name:'Motiv.svg',bytes:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="${m.bounds.join(' ')}">${m.svgFragment}</svg>`).toString('base64')});return assets.resource(a.assetId);}
 const source=seed(),original=structuredClone(source),id=source.config.profile.defaultDesignId;
 let r=authorDesign(source,id,'new',{name:'Eigene Gestaltung',font:'Open Sans'});const added=r.designId;
 assert.deepEqual(source,original);assert.deepEqual(r.document.config.profile.designs[0],original.config.profile.designs[0]);
 r=authorDesign(r.document,added,'motif',{motif:await resource('heart')});const motifId=r.objectId;
 assert.deepEqual(r.document.elementRights[added][motifId],{content:false,color:false,replace:true,move:false,scale:false,delete:true});
 r=authorDesign(r.document,added,'replace',{objectId:motifId,motif:await resource('tree')});
 r=authorDesign(r.document,added,'photo');const photoId=r.objectId;
 const photo=r.document.config.profile.designs.find(d=>d.id===added).objects.find(o=>o.id===photoId);Object.assign(photo,{x:70,y:70,w:30,h:35});check(r.document);
 assert.equal(r.document.elementRights[added][photoId].move,false);assert.equal(r.document.elementRights[added][photoId].replace,true);
 r=authorDesign(r.document,added,'back',{objectId:photoId});assert.equal(r.document.config.profile.designs.find(d=>d.id===added).objects[0].id,photoId);
 r.document.config.localResources.photoExamples=[{designId:added,slotId:photoId,assetId:'a'.repeat(64)}];
 r=authorDesign(r.document,added,'remove',{objectId:photoId});assert.deepEqual(r.document.config.localResources.photoExamples,[]);check(r.document);
 assert.equal(r.document.config.basePriceCents,original.config.basePriceCents);assert.deepEqual(r.document.config.profile.optionGroups,original.config.profile.optionGroups);
});
test('merchant can remove fixed imported artwork after adding an element without relaxing customer locks',()=>{
 let d=seed(),id=d.config.profile.defaultDesignId,design=d.config.profile.designs[0],o=design.objects[1];
 Object.assign(o,{motif:'artwork-'+ 'a'.repeat(64),locked:true,acrylicFixed:true,customerEditable:false});design.importedSource={assetId:'a'.repeat(64)};
 d.elementRights[id][o.id]={content:false,color:false,replace:false,move:false,scale:false,delete:false};
 const next=authorDesign(d,id,'remove',{objectId:o.id}).document;assert.equal(next.config.profile.designs[0].importedSource,undefined);assert.ok(design.importedSource);check(next);
 assert.throws(()=>authorDesign(next,id,'remove',{objectId:next.config.profile.designs[0].objects[0].id}),/zuerst/);
});
test('merchant movement stays inside actual plate dimensions including rotation',()=>{
 const g={width:220,height:140,safeMarginMm:2},o={x:-50,y:200,w:40,h:20,rotation:90};fitPosition(o,g);assert.equal(o.x,12.000000000000002);assert.equal(o.y,118);
 assert.throws(()=>fitPosition({...o,w:500},g),/groß/);
});
test('only imported artwork receives tonal engraving; original vector paint and source stay unchanged',()=>{
 const d=seed(),p=d.config.profile,design=p.designs[0],m={...formMotifs()[0],key:'photo-art',artwork:{assetId:'a'.repeat(64)}};design.objects=[{id:'source',type:'motif',motif:m.key,x:80,y:70,w:40,h:40,rotation:0}];
 const svg=studioSvg(p,design,d.config.localResources.fonts,{motifs:[m],handles:false});assert.match(svg,/-0.2126 -0.7152 -0.0722 0 1/);assert.match(svg,/feComposite in2="SourceAlpha"/);
 delete m.artwork;assert.doesNotMatch(studioSvg(p,design,d.config.localResources.fonts,{motifs:[m],handles:false}),/-0.2126 -0.7152 -0.0722 0 1/);
});
test('photo examples accept WebP, keep the exact original privately and survive restart',async t=>{
 const {spawnSync}=await import('node:child_process'),{mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{DatabaseSync}=await import('node:sqlite');
 const dir=mkdtempSync(join(tmpdir(),'authoring-photo-')),file=join(dir,'assets.sqlite');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const result=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import io,sys;f=io.BytesIO();Image.new('RGB',(100,120),'#668899').save(f,format='WEBP');sys.stdout.buffer.write(f.getvalue())"]);assert.equal(result.status,0);
 let assets=createDesignAssetStore({filename:file});const input={bytes:result.stdout.toString('base64'),widthMm:40,heightMm:50};
 const a=await assets.importPhotoExample(input);assert.match(assets.read(a.assetId).toString(),/data:image\/png;base64/);assets.close();
 assets=createDesignAssetStore({filename:file});const b=await assets.importPhotoExample(input);assert.equal(a.assetId,b.assetId);
 const png=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import io,sys;im=Image.open(io.BytesIO(sys.stdin.buffer.read()));f=io.BytesIO();im.save(f,format='PNG');sys.stdout.buffer.write(f.getvalue())"],{input:result.stdout});assert.equal(png.status,0);
 const same=await assets.importPhotoExample({...input,bytes:png.stdout.toString('base64')});assert.equal(same.assetId,a.assetId);assets.close();
 const db=new DatabaseSync(file,{readOnly:true}),row=db.prepare('SELECT bytes FROM design_sources JOIN photo_example_sources ON source_sha256=sha256 WHERE asset_id=?').all(a.assetId);assert.equal(row.length,2);assert.ok(row.some(r=>Buffer.from(r.bytes).equals(result.stdout)));assert.ok(row.some(r=>Buffer.from(r.bytes).equals(png.stdout)));db.close();
});

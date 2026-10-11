import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createDesignAssetStore} from './design-assets.mjs';
import {prepareEditableDesign} from './editable-design.mjs';
import {replaceDesignArtwork} from './design-import.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
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

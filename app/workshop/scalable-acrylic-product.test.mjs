import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {makeAcrylicConfig,ACRYLIC_BASES} from '../configurator/variant-m/acrylic-product.mjs';
import {combineScalableSizes} from '../configurator/variant-m/scalable-sizes.mjs';
import {scalableSizeState} from '../configurator/variant-m/scalable-size-state.mjs';
import {selectedProfile,resolvedOptions,quote,variantCombinations,saveDraft,readDraft} from '../configurator/variant-m/contract.mjs';
import {makeProductDocument,validateProductDocument,validateProductDesign,resolveProduct} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {measureText} from '../platform/sources/app/shared/models/text-paths.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const sizes=[['10x14',100,140,1399],['15x20',150,200,1799],['20x27',200,270,2599],['40x54',400,540,4499]];
const option=(id,priceCents)=>({id,label:id,priceCents,currency:'EUR'});
function fixture(){
 const entries=sizes.map(([id,width,height,cents])=>{
  const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  delete c.acrylic;c.basePriceCents=cents;c.extraMotifCents=169;
  const p=c.profile,scale=Math.min(width/150,height/200),offset=[(width-150*scale)/2,(height-200*scale)/2];
  p.geometry={width,height,shape:'rect',cornerRadiusMm:2,safeMarginMm:0,holes:[]};
  p.designs[0].objects=p.designs[0].objects.filter(o=>['photo-main','heading','heart'].includes(o.id));
  for(const o of p.designs[0].objects){
   if(o.type==='text')o.text='Dein Name';if(o.type==='motif')o.acrylicFixed=false;
   o.x=o.x*scale+offset[0];o.y=o.y*scale+offset[1];
   for(const key of ['w','h','size','lineHeight','letterSpacing','strokeWidth'])if(Number.isFinite(o[key]))o[key]*=scale;
   if(o.type==='text')measureText(o,resources.fonts);
  }
  p.designs[0].katalog={scale,offsetMm:offset};
  const small={groupId:'size',valueIds:sizes.slice(0,3).map(x=>x[0])};
  p.optionGroups=[
   {id:'base',name:'Sockel',defaultValueId:'none',required:true,visibleIf:small,values:ACRYLIC_BASES.map(b=>option(b.id,b.priceCents+(id==='20x27'&&b.id!=='none'?100:0)))},
   {id:'wall-small',name:'Wandhalterung',defaultValueId:'none',required:true,visibleIf:small,values:[option('none',0),option('wall',599)]},
   {id:'wall-large',name:'Wandhalterung',defaultValueId:'wall',required:true,visibleIf:{groupId:'size',valueIds:['40x54']},values:[option('wall',599)]}
  ];
  return {id,label:id,config:c};
 });
 const c=combineScalableSizes(entries,'15x20');
 c.workshopElementRights=Object.fromEntries(c.profile.designs.map(d=>[d.id,Object.fromEntries(d.objects.map(o=>[o.id,{content:o.type==='text',color:false,replace:['motif','photoSlot'].includes(o.type),move:false,scale:false,delete:o.type==='motif'}]))]));
 const doc=makeProductDocument(c);doc.elementRights=structuredClone(c.workshopElementRights);return validateProductDocument(doc);
}
test('four-size acrylic document persists, reopens and reimports without losing 43 native prices',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-scalable-acrylic-')),filename=path.join(dir,'products.sqlite');
 let repo=createProductRepository({filename,validateDocument:validateProductDocument});
 t.after(()=>{repo.close();assert.ok(path.resolve(dir).startsWith(path.join(os.tmpdir(),'gravuru-scalable-acrylic-')));fs.rmSync(dir,{recursive:true,force:true});});
 const document=fixture(),entry={key:'acrylic-original-pilot-r1',fingerprint:createHash('sha256').update(JSON.stringify(document)).digest('hex'),document};
 const [created]=repo.importBatch([entry]);assert.equal(created.created,true);
 repo.close();repo=createProductRepository({filename,validateDocument:validateProductDocument});
 const record=repo.get(created.id),[repeated]=repo.importBatch([entry]);
 assert.equal(repeated.id,created.id);assert.equal(repeated.created,false);assert.equal(record.revision,1);
 assert.equal(record.status,'draft');assert.equal(record.publishedRevision,null);
 const config=record.document.config;assert.deepEqual(resolvedOptions(config),{size:'15x20',base:'none','wall-small':'none'});
 const combinations=variantCombinations(config);assert.equal(combinations.length,43);
 for(const values of combinations){
  const result=resolveProduct(record.document,{options:values});
  const size=sizes.find(s=>s[0]===values.size),stand=ACRYLIC_BASES.find(b=>b.id===values.base);
  const expected=size[3]+(stand?stand.priceCents+(values.size==='20x27'&&stand.id!=='none'?100:0):0)+(values['wall-small']==='wall'||values['wall-large']==='wall'?599:0);
  assert.equal(result.price.unitCents,expected);assert.equal(result.physical.widthMm,size[1]);assert.equal(result.physical.heightMm,size[2]);
 }
 assert.equal(resolveProduct(record.document).price.unitCents,1799);
 assert.equal(resolveProduct(record.document,{options:{size:'40x54'}}).price.unitCents,5098);
 assert.deepEqual(resolvedOptions(config,{size:'40x54',base:'eiche','wall-small':'wall'}),{size:'40x54','wall-large':'wall'});
});
test('edited text and photo crop survive all four sizes and save/reopen while geometry rights remain fixed',()=>{
 const doc=fixture(),c=doc.config,d=c.profile.designs[0];
 let state={designId:d.id,width:150,height:200,objects:structuredClone(d.objects),mOptions:resolvedOptions(c)};
 const text=state.objects.find(o=>o.type==='text');text.text='Mia & Leo';measureText(text,resources.fonts);
 const photo=state.objects.find(o=>o.type==='photoSlot');photo.uxUploadId='photo-test';photo.uxUploadKind='photo';photo.uxPhotoCrop={zoom:1.25,x:0.1,y:0.1,angle:0};
 for(const size of ['20x27','40x54','10x14','15x20']){
  state=scalableSizeState(c,state,{...state.mOptions,size},c.localResources);
  const p=selectedProfile(c,state.mOptions),source=p.designs[0];
  assert.equal(state.objects.find(o=>o.type==='text').text,'Mia & Leo');
  const uploaded=state.objects.find(o=>o.type==='photoSlot');assert.equal(uploaded.uxUploadId,'photo-test');assert.deepEqual(uploaded.uxPhotoCrop,photo.uxPhotoCrop);
  for(const key of ['x','y','w','h'])assert.equal(uploaded[key],source.objects.find(o=>o.type==='photoSlot')[key]);
  validateProductDesign(doc,{...source,objects:state.objects},{options:state.mOptions,draft:true});
  const draft=saveDraft(c,state,state.mOptions,resources.fonts,resources.motifs,{draft:true});
  readDraft(c,draft,resources.fonts,resources.motifs,{draft:true});
 }
 const invalid={...d,objects:structuredClone(state.objects)};invalid.objects.find(o=>o.type==='photoSlot').x+=1;
 assert.throws(()=>validateProductDesign(doc,invalid,{options:state.mOptions,draft:true}),/verändert|Geometrie|verschoben/);
});
test('original motifs are included, added/replaced motifs cost 169 cents per item',()=>{
 const doc=fixture(),c=doc.config,d=c.profile.designs[0],motif=d.objects.find(o=>o.type==='motif');
 assert.equal(quote(c,d.objects,d.id).unitCents,1799);
 const added=[...structuredClone(d.objects),{...motif,id:'customer-motif',templateOrigin:false,acrylicFixed:false}];
 assert.equal(quote(c,added,d.id).unitCents,1968);assert.equal(quote(c,added,d.id,{},3).totalCents,5904);
 const replaced=structuredClone(d.objects);replaced.find(o=>o.id===motif.id).motif='acryl-pin';
 assert.equal(quote(c,replaced,d.id).unitCents,1968);
});
test('invalid alternate sizes and other materials cannot enter the new native acrylic route',()=>{
 const original=fixture();
 for(const alter of [d=>d.config.scalableSizes.sizes[2].basePriceCents=-1,d=>d.config.scalableSizes.sizes[2].profile.material.thicknessMm=2,d=>d.config.scalableSizes.sizes[2].profile.geometry.holes=[{x:20,y:20,diameter:4}],d=>d.config.scalableSizes.sizes[2].profile.processing.profileId='acrylic-engraving',d=>d.config.scalableSizes.sizes[2].profile.defaultDesignId='missing']){
  const doc=structuredClone(original);alter(doc);assert.throws(()=>validateProductDocument(doc));
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {importEnvironment} from './design-assets.mjs';
import {productionSubject} from './production-profiles.mjs';
import {createHash} from 'node:crypto';
import {validateFamily,familyProductConfig,familyReady,geometryOf} from './product-families.mjs';
import {nativeFamilyAcrylicConfig} from './family-acrylic-product.mjs';
import {makeProductDocument,resolveProduct} from './product-model.mjs';
import {variantCombinations,selectedProfile,quote,resolvedOptions} from '../configurator/variant-m/contract.mjs';
import {universalPreviewViewport} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {productPreview} from './product-preview.mjs';
import {nativeContour,acrylicArtwork} from './acrylic-artwork.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {productionMirror,clientOutputSettings} from './output-orientation.mjs';
const load=k=>validateFamily(JSON.parse(fs.readFileSync(new URL('./test-fixtures/acrylic-families/'+k+'.json',import.meta.url))));
const expectedHoles=(s,r)=>{const w=s.widthMm,h=s.heightMm,e=r.edgeMm;return (r.layout==='left-right'?[[e,h/2],[w-e,h/2]]:r.layout==='top-bottom'?[[w/2,e],[w/2,h-e]]:[[e,e],[w-e,e],[e,h-e],[w-e,h-e]]).map(([x,y])=>({x,y,diameter:r.diameterMm}));};

test('catalogue snapshots have pinned provenance and LF; all 162 sizes and 630 price/colour/mounting combinations stay exact',()=>{
 const provenance=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acrylic-families/provenance.json',import.meta.url)));
 assert.equal(provenance.commit,'680f1744d0488137e5d7d3cf183788308070bef4');
 let sizes=0,combinations=0;
 for(const k of ['aa','as','ss']){
  const bytes=fs.readFileSync(new URL('./test-fixtures/acrylic-families/'+k+'.json',import.meta.url));
  assert.equal(bytes.includes(13),false);assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.files.find(p=>p.path.endsWith('-'+k+'-abstandshalter.json')).sha256);
  const f=load(k),before=JSON.stringify(f);assert.equal(familyReady(f).ready,true);assert.equal(f.sizes.length,54);
  assert.equal(f.sizes.filter(s=>s.key.endsWith('-H')).length,21);assert.equal(f.sizes.filter(s=>s.groupKey==='QU').length,4);assert.equal(f.groups.find(g=>g.key==='QU').name,'Quadrat');
  for(const s of f.sizes){
   sizes++;const c=familyProductConfig(f,s,1),doc=makeProductDocument(c),sg=f.groups.find(g=>g.key===s.groupKey);
   assert.equal(c.profile.geometry.width,s.widthMm);assert.equal(c.profile.geometry.height,s.heightMm);assert.ok(c.profile.name.includes(sg.name));
   assert.equal(c.profile.features.orderEnabled,false);assert.equal(c.profile.features.productionConfirmed,false);assert.equal(c.reviewOnly,true);
   assert.equal(productionSubject(doc).materialId,{aa:'acrylic-anthracite',as:'acrylic-black',ss:'acrylic-satin'}[k]);assert.equal(doc.config.familyAcrylic.sizeKey,s.key);assert.equal(doc.config.profile.geometry.outlinePath,c.profile.geometry.outlinePath);
   for(const o of variantCombinations(c)){
    combinations++;const r=f.mountingRules.find(r=>s.mounting.includes(r.id)&&r.skuSuffix===o.mounting),colour=f.options.find(g=>g.visibleIf.valueIds.includes(r.id)),choice=colour.choices.find(v=>(v.skuSuffix||v.id)===o[colour.id]),p=selectedProfile(c,o);
    assert.deepEqual(p.geometry.holes,expectedHoles(s,r),s.key+' / '+r.id);assert.equal(p.mountingPreview.spacers,true);assert.equal(p.mountingPreview.finish,{edelstahl:'silver',schwarz:'black',weiss:'white'}[choice.id]);
    assert.equal(quote(c,[],'start',o).unitCents,s.baseCents+r.priceCents+choice.priceCents);assert.equal(r.priceCents,r.count===2?199:399);assert.equal(choice.priceCents,choice.id==='edelstahl'?0:r.count===2?100:200);
    assert.deepEqual(Object.keys(resolvedOptions(c,o)),['mounting',colour.id]);
   }
  }
  assert.equal(JSON.stringify(f),before,'adapter never changes catalogue data');
 }
 assert.equal(sizes,162);assert.equal(combinations,630);
});

test('portrait is real top/bottom drilling; square remains square; concave front and backing retain drawing radii',()=>{
 for(const k of ['aa','as','ss']){
  const f=load(k),s=f.sizes.find(s=>s.key===k.toUpperCase()+'-RE-180X120-H'),c=familyProductConfig(f,s,1),p=selectedProfile(c,{mounting:'AH02'});
  assert.deepEqual(p.geometry.holes,[{x:60,y:10,diameter:8},{x:60,y:170,diameter:8}]);
  const square=f.sizes.find(s=>s.groupKey==='QU'),sc=familyProductConfig(f,square,1);assert.equal(sc.profile.geometry.width,sc.profile.geometry.height);assert.match(sc.profile.name,/Quadrat/);assert.equal(sc.profile.name.includes('Quadrat Quadrat'),false);
 }
 const f=load('ss'),s=f.sizes.find(s=>s.key==='SS-EE-180X120'),c=familyProductConfig(f,s,1),g=geometryOf(f,s);
 assert.equal(c.profile.geometry.outlinePath,nativeContour({...g,holes:[]}).contours[0].d);
 assert.match(c.profile.geometry.outlinePath,/M11.6 0H168.4A11.6 11.6 0 0 0 180 11.6/);
 assert.match(c.profile.backingPreview.geometry.outlinePath,/M12.9 0H187.1A12.9 12.9 0 0 0 200 12.9/);
 assert.deepEqual(universalPreviewViewport(c.profile),[-13.6,-13.6,207.2,147.2]);
 assert.equal(c.profile.backingPreview.geometry.width,200);assert.equal(c.profile.backingPreview.geometry.height,140);
});

test('AA/AS/SS preview is readable with actual drill centres, selected hardware colour and SS black backing only',()=>{
 const colours=new Set();
 for(const k of ['aa','as','ss']){
  const f=load(k),s=f.sizes.find(s=>s.key===k.toUpperCase()+'-RE-180X120'),c=familyProductConfig(f,s,1);colours.add(c.profile.material.color);
  for(const [choice,finish] of [['ES','silver'],['SW','black'],['WS','white']]){
   const options={mounting:'AH04','abstandshalter-farbe-ah04':choice},p=selectedProfile(c,options),svg=productPreview({universal:c},{options,keepout:false,designArea:false});
   assert.equal(p.mountingPreview.finish,finish);assert.match(svg,/data-m-spacers="true"/);for(const hole of p.geometry.holes)assert.ok(svg.includes('translate('+hole.x+' '+hole.y+')'));
   assert.equal(svg.includes('data-m-backing="true"'),k==='ss');assert.equal(svg.includes('scale(-1'),false,'front preview stays readable');assert.ok(svg.includes('data-object="text-1"'));
   assert.equal(svg.includes('data-m-keepout'),false,'no red drill conflict circles in product preview');
   if(k==='ss'){assert.ok(svg.includes('translate(-10 -10)'));assert.match(svg,/fill="#17191b"/);}
  }
 }
 assert.equal(colours.size,3);
});

test('unknown material, free order, mixed pilot, missing prices and inconsistent backing are rejected',()=>{
 const f=load('ss'),s=f.sizes[0],c=familyProductConfig(f,s,1);
 for(const mutate of [x=>x.profile.material.variant='klar',x=>x.profile.material.engravingSide='both',x=>x.profile.features.orderEnabled=true,x=>x.reviewOnly=false,x=>x.acrylic={},x=>x.basePriceCents=null,x=>x.profile.backingPreview.geometry.width++,x=>x.profile.backingPreview.geometry.holes=[{x:1,y:1,diameter:1}]]){const copy=structuredClone(c);mutate(copy);assert.throws(()=>nativeFamilyAcrylicConfig(copy));}
 const open=structuredClone(f);open.backing.thicknessMm=null;assert.equal(familyReady(open).ready,false);assert.throws(()=>familyProductConfig(open,open.sizes[0],1),/Materialstärke der Rückplatte/);
});

// The review package uses the same server validation and immutable source files as existing native products.
test('AA/AS rear and SS front survive review snapshot and native artwork; decorations never become engraving paths',async()=>{
 const preview=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 for(const k of ['aa','as','ss']){
  const f=load(k),s=f.sizes.find(s=>s.key===k.toUpperCase()+'-RE-180X120'),base=familyProductConfig(f,s,1),document=makeProductDocument(base),record={id:document.config.profile.id,revision:1,document},config=document.config,d=config.profile.designs[0];
  const result=await prepareAcrylicReview({record,config,input:{productId:record.id,productRevision:1,designId:d.id,objects:structuredClone(d.objects),options:{mounting:'AH04','abstandshalter-farbe-ah04':'WS'},quantity:1,media:[],preview}});
  assert.equal(result.manifest.product.engravingSide,k==='ss'?'front':'back');assert.equal(productionMirror(result.manifest).mirror,k!=='ss');assert.equal(clientOutputSettings(result.manifest,{mirror:k==='ss'}).settings.mirror,k!=='ss');assert.equal(result.manifest.productionReady,false);assert.equal(result.manifest.capabilities.cart,false);
  const art=await acrylicArtwork(result.package,result.manifest.packageSha256,{engraving:true});assert.equal(art.geometry.holeCount,4);assert.equal(art.geometry.widthMm,180);assert.equal(art.geometry.heightMm,120);assert.equal(art.textFields.length,1);assert.equal(art.svg.includes('data-m-backing'),false);assert.equal(art.svg.includes('data-m-spacers'),false);assert.match(art.svg,/<path/);
 }
});

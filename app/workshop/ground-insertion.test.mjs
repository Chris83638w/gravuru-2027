import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateFamily,familyProductConfig,geometryOf,familySyncTarget} from './product-families.mjs';
import {makeProductDocument,validateProductDesign} from './product-model.mjs';
import {validateGroundInsertion,groundArtworkBottom,GROUND_ISSUE} from '../platform/sources/app/shared/models/ground-insertion.mjs';
import {objectIssue,surfaceObjectIssue} from '../platform/sources/app/shared/models/design-content.mjs';
import {embeddedMotifFits} from '../platform/sources/app/shared/models/embedded-motif-fit.mjs';
import {textOutlineFits} from '../platform/sources/app/shared/models/text-outline-fit.mjs';
import {universalPreviewViewport} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {clampToContour} from '../configurator/variant-m/edge-clamp.mjs';
import {designArea} from '../configurator/variant-m/design-area.mjs';
import {productPreview} from './product-preview.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {clientOutputSettings} from './output-orientation.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {importEnvironment} from './design-assets.mjs';
const load=()=>validateFamily(JSON.parse(fs.readFileSync(new URL('./test-fixtures/grabkreuz-acryl-schwarz.json',import.meta.url))));
const box=(y=140)=>({id:'box',type:'graphic',shape:'rect',strokeWidth:.5,x:55,y,w:10,h:10,rotation:0,color:'#000000'});

test('catalogue ground dimensions propagate for all sizes without changing cut contour or prices; sync adds and removes the rule',()=>{
 const f=load();
 for(const s of f.sizes){
  const c=familyProductConfig(f,s,1),g=c.profile.geometry;
  assert.equal(g.height,s.heightMm);assert.equal(g.outlinePath,s.outlinePath);
  assert.equal(c.basePriceCents,s.baseCents);assert.equal(groundArtworkBottom(g),s.heightMm-55);
  assert.deepEqual(g.groundInsertion,{depthMm:50,clearanceMm:5});assert.equal(designArea(c).bottom,s.heightMm-55);
  const view=universalPreviewViewport(c.profile);assert.equal(view[3]+2*view[1],s.heightMm-50);
  const svg=productPreview({universal:c},{keepout:false});assert.ok(svg.includes('data-ground-visible-height="'+(s.heightMm-50)+'"'));
  assert.ok(svg.includes(s.outlinePath));assert.ok(svg.includes('-above-ground'));
 }
 const s=f.sizes[0],doc=makeProductDocument(familyProductConfig(f,s,1));
 delete doc.config.profile.geometry.groundInsertion;
 const next=familySyncTarget(doc,f,s,2);assert.equal(next.config.profile.geometry.groundInsertion.depthMm,50);
 delete f.groundInsertion;assert.equal(familySyncTarget(next,f,s,3).config.profile.geometry.groundInsertion,undefined);
 const plain=familyProductConfig(f,s,1);assert.ok(!productPreview({universal:plain}).includes('data-ground-visible-height'));
});

test('invalid or incomplete earth dimensions are rejected for every family size and native geometry',()=>{
 for(const rule of [null,{},[],{depthMm:50},{depthMm:-1,clearanceMm:5},{depthMm:50,clearanceMm:-1},{depthMm:195,clearanceMm:5},{depthMm:50,clearanceMm:5,extra:true}]){
  const f=load();f.groundInsertion=rule;assert.throws(()=>validateFamily(f),/Erdteil/);
  assert.throws(()=>validateGroundInsertion({height:200,groundInsertion:rule}),/Erdteil/);
 }
});

test('exact 5 mm gap is allowed; rotation, back face and drag clamp cannot cross it',()=>{
 const f=load(),g={...geometryOf(f,f.sizes[0]),safeMarginMm:0,holes:[]},p={kind:'universal-product',geometry:g};
 assert.equal(objectIssue(box(),p),'');assert.equal(objectIssue(box(140.01),p),GROUND_ISSUE);
 assert.equal(objectIssue({...box(),rotation:45},p),GROUND_ISSUE);
 assert.equal(surfaceObjectIssue({...box(151),surfaceId:'back'},p),GROUND_ISSUE);
 const o=box(180);assert.equal(clampToContour(o,g,null,{x:55,y:100}),true);assert.ok(o.y<=140+1e-8);assert.equal(objectIssue(o,p),'');
});

test('painted glyph and embedded motif fallbacks never bypass earth restriction, including cached fits',()=>{
 const f=load(),c=familyProductConfig(f,f.sizes[0],1),g=c.profile.geometry;
 const o={...c.profile.designs[0].objects[0],x:55,y:170};
 assert.equal(textOutlineFits(o,g,c.localResources.fonts),false);
 assert.notEqual(surfaceObjectIssue(o,c.profile,{fonts:c.localResources.fonts}),'');
 const motif={key:'square',embeddedOnly:true,bounds:[0,0,10,10],svgFragment:'<path d="M0 0H10V10H0Z" fill="currentColor" fill-rule="nonzero"/>'};
 const m={...box(170),type:'motif',motif:'square',templateOrigin:true};
 const plain={...g};delete plain.groundInsertion;
 assert.equal(embeddedMotifFits(m,plain,motif),true);assert.equal(embeddedMotifFits(m,g,motif),false);
 assert.equal(surfaceObjectIssue(m,c.profile,{motifs:[motif]}),GROUND_ISSUE);
});

test('server review and production retain full-size contour and mirror rear engraving once; invalid customer position is rejected',async()=>{
 const f=load(),c=familyProductConfig(f,f.sizes[0],1),document=makeProductDocument(c),record={id:document.config.profile.id,revision:1,document},config=document.config,d=config.profile.designs[0];
 const bad=structuredClone(d);bad.objects[0].y=180;
 assert.throws(()=>validateProductDesign(document,bad,{options:{mounting:'K00'}}),/Erdteil/);
 const preview=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 const input={productId:record.id,productRevision:1,designId:d.id,objects:structuredClone(d.objects),options:{mounting:'K00'},quantity:1,media:[],preview};
 await assert.rejects(()=>prepareAcrylicReview({record,config,input:{...input,objects:bad.objects}}),/Erdteil/);
 const review=await prepareAcrylicReview({record,config,input});
 const art=await acrylicArtwork(review.package,review.manifest.packageSha256,{engraving:true});
 assert.equal(art.geometry.widthMm,110);assert.equal(art.geometry.heightMm,200);assert.equal(art.geometry.contours[0].d,f.sizes[0].outlinePath);
 assert.match(art.svg,/viewBox="0 0 110 200"/);assert.ok(!art.svg.includes('above-ground'));
 const output=clientOutputSettings(review.manifest,{mode:'vector',mirror:false});assert.equal(output.settings.mirror,true);
 const proof=await createAcrylicEngravingProof(review.package,review.manifest.packageSha256,output.settings);
 const {files}=readReviewPackage(proof.archive,digest(proof.archive),NATIVE_REVIEW_SCHEMAS);
 const svg=files.get('gravur-fertigung.svg').toString();assert.equal((svg.match(/scale\(-1[ ,]+1\)/g)||[]).length,1);
 assert.equal(proof.metadata.settings.mirror,true);assert.ok(files.get('gravur-kontur-1zu1.pdf').subarray(0,5).equals(Buffer.from('%PDF-')));
});

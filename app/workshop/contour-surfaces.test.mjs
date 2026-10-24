import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFamily,familyProductConfig} from './product-families.mjs';
import {makeProductDocument,validateProductDesign} from './product-model.mjs';
import {prepareConfig,customerLayoutIssue,selectedProfile,validateDesign} from '../configurator/variant-m/contract.mjs';
import {surfaceGeometry} from '../configurator/variant-m/surfaces.mjs';
import {surfaceGeometry as sharedSurfaceGeometry} from '../platform/sources/app/shared/models/contour-geometry.mjs';
import {objectIssue,surfaceObjectIssue} from '../platform/sources/app/shared/models/design-content.mjs';
import {validateStudio} from '../platform/sources/app/shared/models/studio-products.mjs';
import {authorDesign} from './ui/design-authoring.mjs';
import {applyAiPlan} from './ai-design-plan.mjs';
import {validateAcrylicReview,prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {digest} from './review-package.mjs';

const geometry={width:90,height:60,shape:'contour',outlinePath:'M0 0H90V60H0V40Q16 30 0 20Z',holes:[],safeMarginMm:2,holeKeepoutMm:1};
const holes=[{x:20,y:12,diameter:4},{x:58,y:45,diameter:4}];
const object=(x=6,y=30,surfaceId='back')=>({id:'object',type:'graphic',shape:'rect',filled:true,strokeWidth:.1,color:'#000000',surfaceId,x,y,w:2,h:4,rotation:0,templateOrigin:true,customerEditable:true});
function config(){
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url)));
 f.groups=[{key:'ASYM',name:'Asymmetrische Testkontur',shape:'contour',cornerRadiusMm:0}];
 f.designArea={marginMm:2,keepoutMm:1};
 f.mountingRules=[{id:'fixed',label:'Feste Testbohrungen',layout:'left-right',count:2,diameterMm:4,edgeMm:null,priceCents:249,skuSuffix:'B02'}];
 f.sizes=[{key:'ASYM-90X60',groupKey:'ASYM',label:'Test 90 × 60 mm',widthMm:90,heightMm:60,baseCents:1499,mounting:['fixed'],outlinePath:geometry.outlinePath,holesMm:holes.map(h=>({x:h.x,y:h.y,diameterMm:h.diameter}))}];
 validateFamily(f);const c=familyProductConfig(f,f.sizes[0],1);
 c.profile.surfaces=[{id:'front'},{id:'back',priceCents:0}];
 c.profile.designs=[{id:'asymmetric',name:'Rückseiten-Test',marks:[],objects:[object()]}];c.profile.defaultDesignId='asymmetric';
 return c;
}

test('original-profile validation mirrors back exactly once; oriented UI objectIssue stays raw',()=>{
 const p={kind:'universal-product',geometry},back=surfaceGeometry(geometry,'back'),before=JSON.stringify(p);
 assert.equal(surfaceGeometry,sharedSurfaceGeometry);assert.equal(surfaceGeometry(geometry,'front'),geometry);
 assert.equal(customerLayoutIssue(object(6),p),'');assert.match(customerLayoutIssue(object(84),p),/Kontur/);
 assert.equal(objectIssue(object(6),{...p,geometry:back}),'');assert.match(objectIssue(object(84),{...p,geometry:back}),/Kontur/);
 assert.match(customerLayoutIssue(object(6,30,'front'),p),/Kontur/);assert.equal(customerLayoutIssue(object(84,30,'front'),p),'');
 assert.equal(JSON.stringify(p),before,'no source geometry mutation');
});

test('fixed asymmetric holes use the object surface, without moving source holes',()=>{
 const p={kind:'universal-product',geometry:{...geometry,holes:structuredClone(holes)}},before=JSON.stringify(p);
 assert.match(surfaceObjectIssue(object(70,12),p),/Bohrloch/);assert.equal(surfaceObjectIssue(object(20,12),p),'');
 assert.match(surfaceObjectIssue(object(20,12,'front'),p),/Bohrloch/);assert.equal(surfaceObjectIssue(object(70,12,'front'),p),'');
 assert.deepEqual(surfaceGeometry(p.geometry,'back').holes,[{x:70,y:12,diameter:4},{x:32,y:45,diameter:4}]);
 assert.equal(JSON.stringify(p),before);
});

test('all front objects retain the exact old geometry policy',()=>{
 for(const shape of ['rect','ellipse','contour'])for(const surfaceId of [undefined,'front'])for(const [x,y] of [[6,30],[84,30],[20,12],[70,12],[45,30]]){
  const p={kind:'universal-product',geometry:{...geometry,shape,holes}},o=object(x,y,surfaceId);if(surfaceId===undefined)delete o.surfaceId;
  assert.equal(surfaceObjectIssue(o,p),objectIssue(o,p));
  const oldCustomerProfile=shape==='contour'?p:{...p,geometry:{...p.geometry,holes:[]}};
  assert.equal(customerLayoutIssue(o,p),objectIssue(o,oldCustomerProfile));
 }
});

test('studio and prepareConfig accept back x6, reject x84 and mirrored hole keepouts',()=>{
 const c=config(),p=selectedProfile(c,{mounting:'B02'});
 assert.doesNotThrow(()=>validateStudio(p,p));assert.doesNotThrow(()=>prepareConfig(c));
 for(const [x,y] of [[84,30],[70,12]]){
  const bad=structuredClone(p);Object.assign(bad.designs[0].objects[0],{x,y});
  assert.throws(()=>validateStudio(bad,bad),/Kontur|Bohrloch/);
 }
 const bad=structuredClone(c);bad.profile.designs[0].objects[0].x=84;assert.throws(()=>prepareConfig(bad),/Kontur/);
});

test('customer validation and frozen review preserve valid back geometry and reject invalid edits',async()=>{
 const document=makeProductDocument(config()),c=document.config,design=structuredClone(c.profile.designs[0]),options={mounting:'B02'};
 assert.doesNotThrow(()=>validateDesign(c,design,options,c.localResources.fonts,c.localResources.motifs));
 assert.doesNotThrow(()=>validateProductDesign(document,design,{options}));
 const record={id:c.profile.id,revision:1,document,metadata:{}},input={productId:c.profile.id,productRevision:1,designId:design.id,objects:design.objects,options,quantity:1,media:[],preview:'fixture'};
 assert.doesNotThrow(()=>validateAcrylicReview(record,c,input));
 for(const [x,y] of [[84,30],[70,12]]){
  const invalid=structuredClone(design);Object.assign(invalid.objects[0],{x,y});
  assert.throws(()=>validateProductDesign(document,invalid,{options}),/Kontur|Bohrloch/);
  assert.throws(()=>validateAcrylicReview(record,c,{...input,objects:invalid.objects}),/Kontur|Bohrloch/);
 }
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64');
 const frozen=await prepareAcrylicReview({record,config:c,input,preparePhoto:async()=>({preview:png,width:1,height:1})}),before=digest(frozen.package);
 const artwork=await acrylicArtwork(frozen.package,frozen.manifest.packageSha256,{engraving:true,surfaceId:'back'}),expected=surfaceGeometry(selectedProfile(c,options).geometry,'back');
 assert.equal(artwork.geometry.contours[0].d,expected.outlinePath);assert.equal(artwork.geometry.holeCount,2);assert.match(artwork.svg,/translate\(6 30\)/);
 assert.equal(digest(frozen.package),before);assert.equal(c.profile.geometry.outlinePath,geometry.outlinePath);
});

test('merchant and AI validation use each object surface with immutable source documents',()=>{
 const document=makeProductDocument(config()),id='asymmetric',before=JSON.stringify(document);
 assert.doesNotThrow(()=>authorDesign(document,id,'front',{objectId:'object'}));
 const bad=structuredClone(document);bad.config.profile.designs[0].objects[0].x=84;
 assert.throws(()=>authorDesign(bad,id,'front',{objectId:'object'}),/Kontur/);
 const operation=(x,y)=>({action:'move',objectId:'object',text:null,font:null,size:null,x,y,w:null,h:null,color:null,motifKey:null}),request={designId:id,preserveText:true,preservePhotos:true};
 assert.doesNotThrow(()=>applyAiPlan(document,request,{summary:'Rückseite verschieben',operations:[operation(7,30)]}));
 assert.throws(()=>applyAiPlan(document,request,{summary:'Ungültige Rückseite',operations:[operation(84,30)]}),/Kontur/);
 // AI/merchant validate the profile's fixed hole state, as selected for this draft.
 const drilled=structuredClone(document);drilled.config.profile.geometry.holes=structuredClone(holes);
 assert.throws(()=>applyAiPlan(drilled,request,{summary:'Bohrschutz',operations:[operation(70,12)]}),/Bohrloch/);
 const hole=structuredClone(drilled);Object.assign(hole.config.profile.designs[0].objects[0],{x:70,y:12});
 assert.throws(()=>authorDesign(hole,id,'front',{objectId:'object'}),/Bohrloch/);
 assert.equal(JSON.stringify(document),before);
});

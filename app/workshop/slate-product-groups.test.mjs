import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyProductConfig} from './product-families.mjs';
import {makeProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {quote} from '../configurator/variant-m/contract.mjs';
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {slateProductGroups,slateMainProducts,slateGroupDocument,slateGroupVariants,slateGroupMainImage,saveSlateGroup} from './slate-product-groups.mjs';
import {createProductRepository} from './repository.mjs';
import {validateProductDocument} from './product-model.mjs';
const familyId='schiefer-tafeln-natur',sizeKey='TEST-300X200';
function fixture(){
 const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
 family.id=familyId;family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 family.photo={includedCount:1,extraPriceCents:999};family.sizes=family.sizes.slice(0,1);Object.assign(family.sizes[0],{key:sizeKey,widthMm:300,heightMm:200,baseCents:1999,photoDesignCents:2999});
 const c=familyProductConfig(family,family.sizes[0],1),seed=c.profile.designs[0],masters=[];
 for(const [id,theme,audience,photo] of [['M2','gedenken','Menschen',false],['M1','gedenken','Menschen',false],['F1','gedenken','Menschen',true],['T1','gedenken','Tiere',false],['H1','hausnummern','Allgemein',false]]){
  const d={...structuredClone(seed),id:'katalog-'+id,name:id,themes:[theme],katalog:{designId:id,target:{familyId,explicit:true,released:true}}};
  if(photo)d.objects.push({id:'photo',type:'photoSlot',photoShape:'rect',fieldKey:'photo-main',required:false,x:45,y:30,w:20,h:20,rotation:0});c.profile.designs.push(d);
  masters.push({id,themes:[theme],json:{katalog:{zielgruppe:audience}}});
 }
 c.localResources.photoExamples=[{designId:'katalog-F1',slotId:'photo',assetId:'a'.repeat(64)}];
 const document=makeProductDocument(c),themes=[{id:'gedenken',name:'Andenken'},{id:'hausnummern',name:'Hausnummern'}];
 const context={familyId,sizeKey,masters,themes};
 return {document,context,groups:slateProductGroups(document,context).groups};
}
const human=groups=>groups.find(g=>g.audience==='menschen'&&g.photoDesigns==='ohne');
test('only the correct audience, theme and photo kind enter a product; no generic scaffold',()=>{
 const {document,groups}=fixture();assert.equal(groups.length,4);
 const d=slateGroupDocument(document,human(groups));assert.deepEqual(d.config.profile.designs.map(d=>d.id),['katalog-M1','katalog-M2']);
 assert.equal(d.config.profile.defaultDesignId,'katalog-M1');assert.deepEqual(d.config.localResources.photoExamples,[]);
 assert.deepEqual(Object.keys(d.elementRights),['katalog-M1','katalog-M2']);
 assert.equal(document.config.profile.designs.length,6,'source remains unchanged');
});
test('server rejects a foreign animal/photo/house-number template',()=>{
 const {document,groups}=fixture(),d=slateGroupDocument(document,human(groups));
 for(const id of ['katalog-T1','katalog-F1','katalog-H1','start']){
  assert.throws(()=>resolveProduct(d,{designId:id}),/gehört nicht/);
  assert.throws(()=>validateProductDesign(d,{id,objects:[]}),/keiner Produktvorlage/);
 }
});
test('explicit main-image starter is the real native default and cannot silently fall back',()=>{
 const {document,groups}=fixture(),group=human(groups),d=slateGroupDocument(document,group,{startDesign:'M2'});
 assert.equal(resolveProduct(d).designId,'katalog-M2');
 assert.equal(slateGroupMainImage(d).designId,'katalog-M2');assert.equal(slateGroupMainImage(d).sourceDesignId,'M2');
 assert.throws(()=>slateGroupDocument(document,group,{startDesign:'T1'}),/Hauptbild-Design fehlt/);
});
test('input ordering does not change group identities or initial starter',()=>{
 const {document,context,groups}=fixture();context.masters.reverse();document.config.profile.designs.reverse();
 assert.deepEqual(slateProductGroups(document,context).groups,groups);
});
test('photo kind uses native slots, keeps existing price and optional customer upload',()=>{
 const {document,groups}=fixture(),plain=slateGroupDocument(document,human(groups)),photo=slateGroupDocument(document,groups.find(g=>g.photoDesigns==='mit'));
 assert.equal(plain.config.photo.enabled,true);assert.equal(quote(plain.config,[],plain.config.profile.defaultDesignId).unitCents,1999);
 assert.equal(commercePrice(plain.config,{objects:[{id:'upload',type:'photoSlot',uxUploadId:'one',uxUploadKind:'photo'}],designId:plain.config.profile.defaultDesignId,mOptions:{mounting:'K00'}}).unitCents,2998);
 assert.equal(slateGroupVariants(photo)[0].priceCents,2999);
 assert.deepEqual(plain.config.profile.optionGroups,document.config.profile.optionGroups);
 assert.deepEqual(plain.config.profile.geometry,document.config.profile.geometry);
});
test('photo main image requires the original example for its selected slot',()=>{
 const {document,groups}=fixture(),photo=slateGroupDocument(document,groups.find(g=>g.photoDesigns==='mit'));
 assert.throws(()=>slateGroupMainImage(photo),/Musterfoto/);
 assert.throws(()=>slateGroupMainImage(photo,{examples:[{designId:'wrong',slotId:'photo',url:'data:image/svg+xml;base64,PHN2Zy8+'}]}),/Musterfoto/);
 const image=slateGroupMainImage(photo,{examples:[{designId:'katalog-F1',slotId:'photo',assetId:'a'.repeat(64),url:'data:image/svg+xml;base64,PHN2Zy8+'}]});
 assert.doesNotMatch(image.svg,/data-ux-photo-hint|Hier eigenes Foto/);
 assert.equal(image.designId,photo.config.profile.defaultDesignId);
});
test('unreleased targets and absent catalogue themes are reported, never broadened',()=>{
 const {document,context}=fixture();document.config.profile.designs.find(d=>d.id==='katalog-M1').katalog.target.released=false;
 context.masters.find(d=>d.id==='M2').themes=[];
 const {groups,excluded}=slateProductGroups(document,context);assert.equal(excluded.length,2);assert.equal(human(groups),undefined);
});
test('multiple explicit catalogue themes create separate selections, unknown audiences do not mix',()=>{
 const {document,context}=fixture();context.masters[0].themes.push('hausnummern');document.config.profile.designs.find(d=>d.id==='katalog-M2').themes.push('hausnummern');
 delete context.masters[1].json.katalog.zielgruppe;
 const {groups}=slateProductGroups(document,context);assert.ok(groups.some(g=>g.themeId==='hausnummern'&&g.audience==='menschen'));
 assert.deepEqual(human(groups).designs.map(d=>d.sourceId),['M2']);assert.ok(groups.some(g=>g.audience===null));
});
test('catalogue main products share their strict gallery and each retains its own main-image starter',()=>{
 const {document,groups}=fixture(),group=human(groups),lines=[{id:'andenken',families:[familyId],subcategories:[{id:'mensch',themeId:'gedenken',mainProducts:[{id:'rose',startDesign:'M2',name:'Rose'},{id:'baum',startDesign:'M1',name:'Baum'}]}]}];
 const products=slateMainProducts([group],{lines});assert.equal(products.length,2);assert.notEqual(products[0].key,products[1].key);
 assert.deepEqual(products.map(p=>resolveProduct(slateGroupDocument(document,p)).designId),['katalog-M2','katalog-M1']);
 assert.deepEqual(products[0].designs,products[1].designs);
 lines[0].subcategories[0].sizesOffered=['OTHER'];assert.deepEqual(slateMainProducts([group],{lines}),[group]);
});
test('repeated preparation reuses IDs; own updates append revisions and preserve outside edits',t=>{
 const repository=createProductRepository({filename:':memory:',validateDocument:validateProductDocument});t.after(()=>repository.close());
 const {document,groups}=fixture(),group=human(groups),d=slateGroupDocument(document,group),key=group.key;
 const first=saveSlateGroup(repository,{key,document:d});
 const again=saveSlateGroup(repository,{key,document:d,previous:first});assert.equal(again.id,first.id);assert.equal(again.revision,1);assert.equal(again.created,false);
 const changed=slateGroupDocument(document,group,{startDesign:'M2'}),second=saveSlateGroup(repository,{key,document:changed,previous:first});
 assert.equal(second.id,first.id);assert.equal(second.revision,2);assert.equal(repository.list().length,1);
 const restored=saveSlateGroup(repository,{key,document:d,previous:second});assert.equal(restored.revision,3);assert.equal(restored.id,first.id);
 const manual=structuredClone(d);manual.name='Manuell geändert';repository.save(first.id,manual,3);
 assert.throws(()=>saveSlateGroup(repository,{key,document:changed,previous:restored}),/außerhalb/);
 assert.equal(repository.get(first.id).document.name,'Manuell geändert');
});
test('a removed catalogue main-image design never becomes a new generic product',()=>{
 const {groups}=fixture(),group=human(groups),excluded=[];
 const lines=[{id:'andenken',families:[familyId],subcategories:[{id:'mensch',themeId:'gedenken',startDesign:'WITHDRAWN'}]}];
 assert.deepEqual(slateMainProducts([group],{lines,excluded}),[]);assert.equal(excluded.length,1);assert.match(excluded[0].reason,/Startdesign nicht vorbereitet/);
});

test('explicit disabled subcategory offers do not reappear through generic slate fallback',()=>{
 const {groups}=fixture(),group=human(groups),excluded=[];
 const sub={id:'mensch',themeId:'gedenken',familyIdsOffered:[],mainProducts:[{id:'rose',startDesign:'M2'}]},lines=[{id:'andenken',families:[familyId],subcategories:[sub]}];
 assert.deepEqual(slateMainProducts([group],{lines,excluded}),[]);assert.match(excluded[0].reason,/Materialfamilie nicht angeboten/);
 sub.familyIdsOffered=null;assert.equal(slateMainProducts([group],{lines})[0].catalogueMainProduct.main,'rose');
 // A known material can be offered by a different line without changing its source identity.
 lines[0].families=['another-source-family'];sub.familyIdsOffered=[familyId];
 assert.equal(slateMainProducts([group],{lines})[0].catalogueMainProduct.main,'rose');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {MODULE_PROFILE_SCHEMA,MODULE_KEYS,validateModuleProfile,moduleEnabled,nativeModuleAvailability,moduleProfileIssue,applyModuleProfile} from './module-profile.mjs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {makeProductDocument,validateProductDocument} from '../../workshop/product-model.mjs';
import {prepareConfig,quote} from './contract.mjs';

const source=()=>({
 basePriceCents:1999,extraMotifCents:169,
 photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:999},
 logo:{enabled:true,vectorUpload:true,extraPriceCents:1299},
 profile:{name:'Edelstahl',material:{kind:'steel'},processing:{profileId:'steel-engraving'},geometry:{width:120,height:80,holes:[]},
  optionGroups:[{id:'mounting',defaultValueId:'K00',values:[{id:'K00',priceCents:0},{id:'B02',priceCents:299}]}],
  defaultDesignId:'normal',designs:[{id:'normal',objects:[{id:'name',type:'text',text:'Familie Muster',font:'Allura',x:60,y:40,w:60,h:20},{id:'dog',type:'motif',motif:'dog',x:20,y:20,w:20,h:20}]}]},
 localResources:{fonts:{Allura:{marker:'unchanged'}},motifs:[{key:'dog',marker:'unchanged'}]},
});
const profile=(changes={})=>({schema:MODULE_PROFILE_SCHEMA,id:'steel-door-signs',revision:1,modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo:true,colors:false,...changes}});

test('parent-frame JSON module profiles retain strict validation across realms',()=>{
 const foreign=runInNewContext('JSON.parse(json)',{json:JSON.stringify(profile({logo:false}))});
 assert.notEqual(Object.getPrototypeOf(foreign),Object.prototype);
 assert.equal(validateModuleProfile(foreign),foreign);
 assert.equal(moduleEnabled({moduleProfile:foreign},'logo'),false);
 const projected=applyModuleProfile(source(),foreign);
 assert.equal(projected.logo.enabled,false);assert.equal(projected.moduleProfile.modules.logo,false);
 for(const expression of [
  'Object.assign(new (class Profile {})(),p)',
  'Object.assign(Object.create({}),p)',
  'Object.assign(new Date(),p)',
  '({...p,modules:{...p.modules,logo:"false"}})',
  '({...p,modules:{options:true}})',
  '({...p,extra:true})'
 ])assert.throws(()=>validateModuleProfile(runInNewContext('let p=JSON.parse(json);'+expression,{json:JSON.stringify(profile())})),expression);
});

test('legacy configuration has no new gates, mutation or profile injected',()=>{
 const original=source(),before=structuredClone(original),result=applyModuleProfile(original);
 for(const key of MODULE_KEYS)assert.equal(moduleEnabled(original,key),true);
 assert.deepEqual(result,before);assert.deepEqual(original,before);assert.notEqual(result,original);
 result.profile.designs[0].objects[0].text='Changed';assert.equal(original.profile.designs[0].objects[0].text,'Familie Muster');
 assert.throws(()=>moduleEnabled(original,'unknown'),/Unbekanntes/);
});

test('module documents require all explicit flags and a fixed valid identity',()=>{
 const p=profile();assert.equal(validateModuleProfile(p),p);
 for(const broken of [null,[],{}, {...p,schema:'old'}, {...p,id:''}, {...p,id:'../../profile'}, {...p,revision:0}, {...p,revision:1.2}, {...p,revision:Number.MAX_SAFE_INTEGER+1}, {...p,extra:true}, {...p,modules:{...p.modules,logo:'false'}}, {...p,modules:{...p.modules,unknown:true}}])assert.throws(()=>validateModuleProfile(broken));
 for(const key of MODULE_KEYS){const broken=structuredClone(p);delete broken.modules[key];assert.throws(()=>validateModuleProfile(broken));}
 assert.throws(()=>moduleEnabled({moduleProfile:null},'logo'));
});

test('same steel source produces logo on/off without copying or changing designs/options/prices',()=>{
 const original=source(),before=structuredClone(original),on=applyModuleProfile(original,profile()),off=applyModuleProfile(original,profile({logo:false}));
 assert.equal(on.logo.enabled,true);assert.equal(on.logo.vectorUpload,true);assert.equal(off.logo.enabled,false);assert.equal(off.logo.vectorUpload,false);
 assert.equal(moduleEnabled(on,'logo'),true);assert.equal(moduleEnabled(off,'logo'),false);
 assert.equal(on.logo.extraPriceCents,1299);assert.equal(off.logo.extraPriceCents,1299);
 for(const result of [on,off])for(const key of ['profile','localResources','basePriceCents','extraMotifCents'])assert.deepEqual(result[key],before[key]);
 assert.deepEqual(original,before);assert.deepEqual(applyModuleProfile(off),off);
 // Re-enabling always resolves the same saved source, never reconstructs a new permission.
 const restored=applyModuleProfile(original,profile());assert.deepEqual(restored,on);
 assert.throws(()=>applyModuleProfile(off,profile()),/Produktquelle gibt dieses Modul nicht frei/);
});

test('profile flags cannot grant photos, logos or print color beyond the native source',()=>{
 const original=source();assert.deepEqual(nativeModuleAvailability(original),profile().modules);
 assert.throws(()=>applyModuleProfile(original,profile({photo:true})),/Foto.*Produktquelle/);
 assert.throws(()=>applyModuleProfile(original,profile({colors:true})),/Farbwahl.*Produktquelle/);
 assert.throws(()=>applyModuleProfile({...original,logo:{enabled:false}},profile()),/Logo.*Produktquelle/);
 const print={...original,logo:{enabled:true},photo:{...original.photo,enabled:true},profile:{...original.profile,material:{kind:'acrylic'},processing:{profileId:'color-print'}}};
 const enabled=applyModuleProfile(print,profile({photo:true,colors:true}));assert.equal(enabled.photo.enabled,true);assert.equal(enabled.profile.processing.profileId,'color-print');
 const printBefore=structuredClone(print),restricted=applyModuleProfile(print,profile({photo:false,colors:false,logo:false}));
 assert.equal(restricted.photo.enabled,false);assert.equal(moduleEnabled(restricted,'colors'),false);assert.deepEqual(restricted.profile,printBefore.profile);assert.deepEqual(print,printBefore);
});

test('disabling text and motifs preserves originals and source addition limit',()=>{
 const original=source();original.customerAdditions={text:true,motifs:true,maxElements:7};
 const before=structuredClone(original),result=applyModuleProfile(original,profile({text:false,motifs:false,designs:false,options:false}));
 assert.deepEqual(result.customerAdditions,{text:false,motifs:false,maxElements:7});
 assert.deepEqual(result.profile,before.profile);assert.deepEqual(original,before);
 const restricted={...source(),customerAdditions:{text:false,motifs:false,maxElements:0}};
 const permitted=applyModuleProfile(restricted,profile());assert.deepEqual(permitted.customerAdditions,restricted.customerAdditions);
 const noAdditionsOrObjects={...restricted,profile:{...restricted.profile,designs:[{id:'empty',objects:[]}]}};
 assert.throws(()=>applyModuleProfile(noAdditionsOrObjects,profile()),/Text und Schriften.*Produktquelle/);
});

test('photo module cannot silently remove an original photo design, including non-default sizes',()=>{
 for(const location of ['profile','family','scalable','doorbell']){
  const original=source(),photoDesign={id:'photo-original',objects:[{id:'slot',type:'photoSlot',photoShape:'heart',photoMaskAssetId:'original-mask'}]};
  if(location==='profile')original.profile.designs.push(photoDesign);
  if(location==='family')original.familyFormats={designs:[photoDesign]};
  if(location==='scalable')original.scalableSizes={sizes:[{id:'other',profile:{designs:[photoDesign]}}]};
  if(location==='doorbell')original.doorbell={formats:[{profile:{designs:[photoDesign]}}]};
  const before=structuredClone(original);assert.match(moduleProfileIssue(original,profile()),/gespeicherte Designvorlage enthält einen Fotobereich/);
  assert.throws(()=>applyModuleProfile(original,profile()),/Vorlage bleibt unverändert/);assert.deepEqual(original,before);
 }
 const original=source();original.profile.designs[0].objects.push({id:'logo-original',type:'image',uxUploadKind:'logo'});
 const before=structuredClone(original);assert.throws(()=>applyModuleProfile(original,profile({logo:false})),/Logo-Upload-Element/);assert.deepEqual(original,before);
});

test('profile snapshots are detached and do not mutate the reusable library definition',()=>{
 const original=source(),p=profile(),result=applyModuleProfile(original,p);
 p.modules.logo=false;p.revision=2;assert.equal(result.moduleProfile.revision,1);assert.equal(result.moduleProfile.modules.logo,true);
 result.moduleProfile.modules.text=false;assert.equal(p.modules.text,true);
});

test('required personalized text rejects a hidden text editor before creating an unusable product',()=>{
 for(const location of ['profile','family','scalable','doorbell']){
  const original=source(),required={id:'personal',objects:[{id:'required-name',type:'text',required:true,text:'Mustername'}]};
  if(location==='profile')original.profile.designs.push(required);
  if(location==='family')original.familyFormats={designs:[required]};
  if(location==='scalable')original.scalableSizes={sizes:[{profile:{designs:[required]}}]};
  if(location==='doorbell')original.doorbell={formats:[{profile:{designs:[required]}}]};
  const before=structuredClone(original);assert.throws(()=>applyModuleProfile(original,profile({text:false})),/persönliche Pflichtangabe/);assert.deepEqual(original,before);
  assert.equal(moduleProfileIssue(original,profile()),null);
 }
});

function nativeSteel(){
 const resources=JSON.parse(readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete config.acrylic;
 const p=config.profile;p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:70,w:30,h:8,rotation:0,acrylicFixed:false});
 p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]},{id:'fixture-fastening',label:'Synthetische Prüfbefestigung',priceCents:299,currency:'EUR',holes:[]}]}];
 config.basePriceCents=2299;config.extraMotifCents=169;config.photo={enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:999};config.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 config.localResources.photoExamples=[];config.localResources.photoPlaceholders=[];
 // Use the saved native source, whose font geometry has already been measured.
 return makeProductDocument(prepareConfig(config)).config;
}

test('real native product document retains pinned modules, originals and native fastening prices on roundtrip',()=>{
 const native=nativeSteel(),before=structuredClone(native);
 for(const logo of [true,false]){
  const config=applyModuleProfile(native,profile({logo})),document=makeProductDocument(config),roundtrip=validateProductDocument(JSON.parse(JSON.stringify(document)));
  assert.deepEqual(roundtrip.config.moduleProfile,profile({logo}));assert.equal(moduleEnabled(roundtrip.config,'logo'),logo);
  assert.deepEqual(roundtrip.config.profile.designs,before.profile.designs);assert.deepEqual(roundtrip.config.profile.optionGroups,before.profile.optionGroups);
  const objects=roundtrip.config.profile.designs[0].objects;
  for(const mounting of ['none','fixture-fastening'])assert.deepEqual(quote(roundtrip.config,objects,'test',{mounting}),quote(native,objects,'test',{mounting}));
 }
 assert.deepEqual(native,before);
});

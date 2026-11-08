import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {prepareConfig,quote,saveDraft,readDraft,vectorLogoAllowed,newEditableObject,validateDesign} from './contract.mjs';
import {commercePrice} from './commerce-model.mjs';
import {uploadAllowed,uploadTabVisible,photoAvailableForDesign} from './ux-model.mjs';
import {vectorLogoEnabled} from './logo-upload.mjs';
import {canEditElement,customerAdditionPolicy,designElementRights} from './element-rights.mjs';
import {moduleTabs} from './module-runtime.mjs';
import {MODULE_PROFILE_SCHEMA} from './module-profile.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const modules=overrides=>({schema:MODULE_PROFILE_SCHEMA,id:'steel-door-modules',revision:1,modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo:true,colors:false,...overrides}});
function fixture(overrides){
 const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete c.acrylic;
 const p=c.profile;p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:70,w:30,h:8,rotation:0,acrylicFixed:false});
 const motif={id:'original-motif',type:'motif',motif:'acryl-heart',x:170,y:100,w:20,h:20,rotation:0,color:text.color,customerEditable:true};
 p.designs=[{id:'test',name:'Synthetic',objects:[text,motif]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]},{id:'hole',label:'Bohrung',priceCents:299,currency:'EUR',holes:[]}]}];
 c.basePriceCents=1999;c.extraMotifCents=169;c.photo={enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:999};c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
 if(overrides!==undefined)c.moduleProfile=modules(overrides);
 return c;
}
const logo=()=>({id:'own-logo',type:'image',x:110,y:110,w:20,h:20,rotation:0,uxUploadId:'upload-logo',uxUploadKind:'logo',uxVectorLogo:{version:'svg-black-v1',sourceSha256:'a'.repeat(64),outputSha256:'b'.repeat(64)}});
const state=config=>({designId:'test',objects:structuredClone(config.profile.designs[0].objects),mOptions:{mounting:'none'}});
const save=(config,s=state(config))=>saveDraft(config,s,s.mOptions,resources.fonts,resources.motifs);

test('same steel editor source with/without logo keeps original designs, geometry, native prices and source bytes',()=>{
 const source=fixture(),before=structuredClone(source);
 const enabled=prepareConfig({...source,moduleProfile:modules({})}),disabled=prepareConfig({...source,moduleProfile:modules({logo:false})});
 assert.deepEqual(source,before);assert.deepEqual(enabled.profile,disabled.profile);
 assert.deepEqual(enabled.profile.designs,source.profile.designs);assert.deepEqual(enabled.profile.geometry,source.profile.geometry);
 for(const c of [enabled,disabled]){assert.equal(commercePrice(c,state(c)).unitCents,1999);assert.equal(commercePrice(c,{...state(c),mOptions:{mounting:'hole'}}).unitCents,2298);assert.equal(c.logo.extraPriceCents,1299);}
});

test('one module profile controls upload tab and real upload gates on both devices',()=>{
 const enabled=prepareConfig(fixture({})),disabled=prepareConfig(fixture({logo:false}));
 assert.deepEqual(moduleTabs(enabled,{upload:true}),['options','design','text','motif','upload']);
 assert.deepEqual(moduleTabs(disabled,{upload:true}),['options','design','text','motif']);
 for(const c of [enabled,disabled]){assert.equal(uploadAllowed(c,'photo'),false);assert.equal(photoAvailableForDesign(c,'test'),false);}
 for(const fn of [vectorLogoAllowed,vectorLogoEnabled,c=>uploadAllowed(c,'logo'),c=>uploadTabVisible(c,'test',{photoEnabled:false,logoEnabled:true})]){assert.equal(fn(enabled),true);assert.equal(fn(disabled),false);}
});

test('logo surcharge and checked SVG roundtrip are accepted only when logo is enabled',()=>{
 const on=prepareConfig(fixture({})),off=prepareConfig(fixture({logo:false})),s=state(on);s.objects.push(logo());
 assert.equal(commercePrice(on,s).unitCents,3298);assert.equal(commercePrice(on,s,2).totalCents,6596);
 const saved=save(on,s);assert.deepEqual(readDraft(on,saved,resources.fonts,resources.motifs).design.objects.at(-1).uxVectorLogo,logo().uxVectorLogo);
 assert.throws(()=>save(off,s),/Logomodul/);assert.throws(()=>commercePrice(off,s),/Logomodul/);assert.throws(()=>readDraft(off,saved,resources.fonts,resources.motifs),/Logomodul/);
});

test('raw-config bypass cannot reactivate hidden logo with old native enabled flags',()=>{
 const raw=fixture({logo:false}),s=state(raw);s.objects.push(logo());assert.equal(raw.logo.enabled,true);
 assert.equal(vectorLogoAllowed(raw),false);assert.equal(uploadAllowed(raw,'logo'),false);
 assert.throws(()=>save(raw,s),/Logomodul/);assert.throws(()=>commercePrice(raw,s),/Logomodul/);
});

test('disabled text/motif modules preserve source elements and their movement/removal but reject additions or replacement',()=>{
 const c=prepareConfig(fixture({text:false,motifs:false})),s=state(c),before=structuredClone(c.profile.designs);
 assert.deepEqual(customerAdditionPolicy(c),{text:false,motifs:false,maxElements:19});
 assert.equal(canEditElement(c,'test',s.objects[0],'content'),false);assert.equal(canEditElement(c,'test',s.objects[0],'move'),true);assert.equal(canEditElement(c,'test',s.objects[1],'replace'),false);
 s.objects[0].x+=4;s.objects[1].y+=3;assert.doesNotThrow(()=>save(c,s));
 const renamed=structuredClone(s);renamed.objects[0].text='Changed';assert.throws(()=>save(c,renamed),/Textbearbeitung/);
 const added=structuredClone(s);added.objects.push({...s.objects[1],id:'added'});assert.throws(()=>save(c,added),/Motivauswahl/);assert.throws(()=>commercePrice(c,added),/Motivauswahl/);
 const replaced=structuredClone(s);replaced.objects[1].motif='other';assert.throws(()=>save(c,replaced),/Motivauswahl/);
 assert.throws(()=>newEditableObject(c,{type:'text',text:'Extra',font:'Allura',size:5},'extra',resources.fonts,resources.motifs),/Text/);
 s.objects.pop();assert.doesNotThrow(()=>save(c,s));assert.deepEqual(c.profile.designs,before);
 assert.deepEqual(moduleTabs(c,{upload:true}),['options','design','upload']);
});

test('disabled design choice keeps all source designs but refuses a customer switch',()=>{
 const c=fixture({designs:false});c.profile.designs.push({...structuredClone(c.profile.designs[0]),id:'other',name:'Other'});
 const ready=prepareConfig(c);assert.equal(ready.profile.designs.length,2);assert.doesNotThrow(()=>save(ready));
 const s=state(ready);s.designId='other';assert.throws(()=>save(ready,s),/Designauswahl/);assert.throws(()=>commercePrice(ready,s),/Designauswahl/);
 // Native catalog price checks carry no customer artwork and still cover all source variants.
 assert.doesNotThrow(()=>quote(ready,[],'other'));
});

test('fixed options reject customer changes while preserving native variant pricing for the connector',()=>{
 const c=prepareConfig(fixture({options:false})),s=state(c);assert.doesNotThrow(()=>save(c,s));s.mOptions.mounting='hole';
 assert.throws(()=>save(c,s),/Ausführung/);assert.throws(()=>commercePrice(c,s),/Ausführung/);
 assert.equal(quote(c,[],'test',{mounting:'hole'}).unitCents,2298);assert.equal(c.profile.optionGroups[0].values.length,2);
});

test('options cannot be hidden when a required additional field needs customer input',()=>{
 const c=fixture({options:false});c.profile.optionFields=[{id:'assembly-date',kind:'date',label:'Montagetermin',required:true}];
 assert.throws(()=>prepareConfig(c),/Pflicht-Zusatzfeld/);
 c.moduleProfile.modules.options=true;assert.doesNotThrow(()=>prepareConfig(c));
});

test('disabled photo module rejects a forged uploaded photo before saving or pricing',()=>{
 const c=prepareConfig(fixture({})),s=state(c);s.objects.push({id:'fake-photo',type:'photoSlot',x:110,y:110,w:20,h:20,rotation:0,uxUploadId:'photo-id',uxUploadKind:'photo'});
 assert.throws(()=>save(c,s),/Fotomodul/);assert.throws(()=>commercePrice(c,s),/Fotomodul/);
});

test('color module is an additional gate; existing template colors and original production profile remain exact',()=>{
 const c=fixture({colors:false});c.profile.material.kind='acrylic';c.profile.processing.profileId='color-print';c.logo.vectorUpload=false;
 const ready=prepareConfig(c),s=state(ready),before=structuredClone(ready.profile);
 assert.doesNotThrow(()=>save(ready,s));s.objects[0].color='#ff0000';assert.throws(()=>save(ready,s),/Farbwahl/);
 assert.equal(canEditElement(ready,'test',s.objects[0],'color'),false);assert.equal(designElementRights(ready,'test',ready.profile.designs[0].objects).name.color,false);
 assert.deepEqual(ready.profile,before);
});

test('unknown and incomplete profile flags fail closed; legacy config still has native behavior',()=>{
 const raw=fixture({});delete raw.moduleProfile.modules.logo;assert.throws(()=>prepareConfig(raw),/Modulprofil/);assert.throws(()=>commercePrice(raw,state(raw)),/Modulprofil/);
 const old=fixture(),ready=prepareConfig(old);assert.deepEqual(ready,old);assert.equal(vectorLogoEnabled(ready),true);assert.deepEqual(moduleTabs(ready,{upload:true}),['options','design','text','motif','upload']);
 const changed=state(ready);changed.objects[0].text='Legacy name';assert.doesNotThrow(()=>save(ready,changed));
});

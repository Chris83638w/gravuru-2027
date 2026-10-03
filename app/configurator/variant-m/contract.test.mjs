import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PROCESSING_PROFILES, getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {prepareConfig,quote,saveDraft,readDraft,selectedProfile,validatePhotoFile,MAX_PHOTO_BYTES,newEditableObject} from './contract.mjs';
// Historical generic profile retained as a test fixture, detached from Shopify.
// Tests need the editor's resource data, not its former product-pipeline runtime.
const native=JSON.parse(fs.readFileSync(new URL('./fixtures/native-profile.json',import.meta.url),'utf8'));
const unpack=(prefix,count)=>{
 const joined=Array.from({length:count},(_,i)=>fs.readFileSync(new URL('../../designs/aosu-labrador/runtime/'+prefix+String(i).padStart(2,'0')+'.txt',import.meta.url),'utf8')).join('');
 return JSON.parse(joined.startsWith('{')?joined:gunzipSync(Buffer.from(joined,'base64')).toString());
};
const catalog=unpack('gravuru-catalog-51fa7e857d52-part-',14);
const fonts={...catalog.fonts,...unpack('gravuru-entwurf-fonts-',16)};
const motifs=[...Object.entries(catalog.motifs).map(([key,svgFragment])=>({key,svgFragment,bounds:[0,0,100,100]})),...unpack('gravuru-entwurf-motive-',21)];
const config=prepareConfig({profile:native,basePriceCents:2999,extraMotifCents:169,photo:{enabled:true,mode:'upload-only'}});
const state=()=>({designId:config.profile.designs[0].id,objects:structuredClone(config.profile.designs[0].objects)});
const save=(s=state(),options={})=>saveDraft(config,s,options,fonts,motifs);

test('native geometry, revisions and input remain unchanged',()=>{
 assert.equal(config.profile.geometry.width,300);assert.equal(config.profile.geometry.height,200);
 assert.equal(config.profile.revision,native.revision);assert.equal(config.profile.material.thicknessMm,5);
 assert.deepEqual(config.profile,native);
});
test('five native processing profiles stay independent from photo setting',()=>{
 for(const processing of PROCESSING_PROFILES){
  const fixture=structuredClone(config);fixture.profile.processing.profileId=processing.id;
  fixture.profile.material.kind=processing.materialKind||'other';
  assert.equal(getProcessingProfile(prepareConfig(fixture).profile).id,processing.id);
 }
 assert.equal(getProcessingProfile({...config.profile,material:{kind:'steel'},processing:{profileId:'steel-engraving'}}).ink,'#191919');
});
test('photo disabled only exposes templates without photo slots',()=>{
 const mixed=structuredClone(config);mixed.profile.designs.push({...structuredClone(config.profile.designs[0]),id:'plain',objects:[structuredClone(config.profile.designs[0].objects.find(o=>o.type==='text'))]});
 mixed.photo.enabled=false;const plain=prepareConfig(mixed);
 assert.deepEqual(plain.profile.designs.map(d=>d.id),['plain']);assert.equal(mixed.profile.designs.length,11);
});
test('photo disabled does not silently publish mandatory-photo-only designs',()=>{
 assert.throws(()=>prepareConfig({...config,photo:{enabled:false,mode:'upload-only'}}),/keine passende Vorlage/);
});
test('all ten existing photo designs roundtrip with exact product binding',()=>{
 for(const d of config.profile.designs){const draft=save({designId:d.id,objects:d.objects});const loaded=readDraft(config,draft,fonts,motifs);assert.equal(loaded.design.id,d.id);assert.deepEqual(loaded.design.objects,draft.design.objects);}
});
test('modified text remains editable in saved draft',()=>{
 const s=state();s.objects.find(o=>o.type==='text').text='Luna';assert.equal(readDraft(config,save(s),fonts,motifs).design.objects.find(o=>o.type==='text').text,'Luna');
});
test('Local tinted logo keeps its upload reference without pretending to be published media',()=>{
 const s=state();s.objects.push({id:'local-logo',type:'image',x:150,y:100,w:20,h:20,rotation:0,color:'#edc4cf',uxUploadKind:'logo',uxUploadId:'local-upload',uxLogoTint:true});
 const restored=readDraft(config,save(s),fonts,motifs).design.objects.at(-1);
 assert.equal(restored.uxLogoTint,true);assert.equal(restored.uxUploadId,'local-upload');assert.equal(restored.media,undefined);
 s.objects.at(-1).uxUploadKind='photo';assert.throws(()=>save(s),/Medium|Logos/);
});
test('new elements use actual product dimensions and native fonts, never doorbell coordinates',()=>{
 const s=state(), key=motifs[0].key;
 const motif=newEditableObject(config,{type:'motif',motif:key,w:50,h:50},'new-motif',fonts,motifs,{mounting:'B04'});
 assert.equal(motif.x,150);assert.equal(motif.y,100);assert.ok(motif.w<=75&&motif.h<=50);
 const text=newEditableObject(config,{type:'text',text:'Dein Text',font:'Arial',size:14},'new-text',fonts,motifs);
 assert.equal(text.font,'Montserrat');assert.equal(text.color,'#e8e9e5');
 s.objects.push(motif,text);assert.doesNotThrow(()=>save(s,{mounting:'B04'}));
});
test('private data and transient UI state excluded from draft',()=>{
 const s=state();s.selected='private';s.photos=['blob:private'];s.objects[1].source='data:image/png;base64,private';s.objects[1].password='private';
 const draft=JSON.stringify(save(s));assert.ok(!draft.includes('private'));assert.ok(!draft.includes('data:image'));
});
test('foreign product, profile or revision fails closed',()=>{
 for(const [key,value] of [['profileId','other'],['profileRevision','other'],['productId','other']])assert.throws(()=>readDraft(config,{...save(),[key]:value},fonts,motifs),/anderen Produkt/);
});
test('customer photo placement may move or be deleted; technical geometry stays in profile',()=>{
 let s=state();s.objects[0].x+=1;assert.doesNotThrow(()=>save(s));
 s=state();s.objects.shift();assert.doesNotThrow(()=>save(s));
 assert.deepEqual(config.profile.geometry,native.geometry);
});
test('unknown motif, option, malformed quantity and geometry rejected',()=>{
 let s=state();s.objects.find(o=>o.type==='motif').motif='not-in-library';assert.throws(()=>save(s),/Bibliothek/);
 s=state();s.objects.find(o=>o.type==='text').x=1000;assert.throws(()=>save(s),/Gestaltungsfläche/);
 assert.throws(()=>quote(config,[],s.designId,{other:'value'}),/Optionsgruppe/);
 for(const quantity of [0,100,1.5,NaN])assert.throws(()=>quote(config,[],s.designId,{},quantity),/Menge/);
});
test('template motifs included once, extra copy costs 169 cents',()=>{
 const s=state(), original=s.objects.find(o=>o.type==='motif');
 assert.equal(quote(config,s.objects,s.designId).unitCents,2999);
 s.objects.push({...original,id:'extra'});assert.equal(quote(config,s.objects,s.designId).unitCents,3168);
 s.objects.push({...original});assert.equal(quote(config,s.objects,s.designId).unitCents,3337);
});
test('configured add-ons and quantity calculated in cents',()=>{
 for(const group of config.profile.optionGroups)for(const value of group.values){const s=state();assert.equal(quote(config,s.objects,s.designId,{[group.id]:value.id},2).totalCents,(2999+value.priceCents)*2);}
});
test('selected holes preserve given diameter and coordinates without mutating source',()=>{
 for(const group of config.profile.optionGroups)for(const value of group.values.filter(v=>v.holes)){const p=selectedProfile(config,{[group.id]:value.id});assert.deepEqual(p.geometry.holes,value.holes);}
 assert.deepEqual(config.profile.geometry.holes,[]);
});
test('upload accepts only explicit raster types and positive sizes within limit',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])validatePhotoFile({type,size:100});
 for(const file of [{type:'image/svg+xml',size:100},{type:'image/jpeg',size:0},{type:'image/png',size:MAX_PHOTO_BYTES+1}])assert.throws(()=>validatePhotoFile(file),/15 MB/);
});


test('photo background instructions roundtrip and reject invalid or misplaced values',()=>{
 const s=state(),photo=s.objects.find(o=>o.type==='photoSlot');photo.uxUploadId='test-photo';photo.uxUploadKind='photo';photo.uxPhotoBackground='keep';
 const loaded=readDraft(config,save(s),fonts,motifs);assert.equal(loaded.design.objects.find(o=>o.id===photo.id).uxPhotoBackground,'keep');
 photo.uxPhotoBackground='unknown';assert.throws(()=>save(s),/Foto-Aufbereitung/);
 delete photo.uxPhotoBackground;const text=s.objects.find(o=>o.type==='text');text.uxPhotoBackground='remove';assert.throws(()=>save(s),/Foto-Aufbereitung/);
});

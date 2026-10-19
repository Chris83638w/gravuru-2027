import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PROCESSING_PROFILES, getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {prepareConfig,quote,saveDraft,readDraft,selectedProfile,validatePhotoFile,MAX_PHOTO_BYTES,newEditableObject,validateDesign} from './contract.mjs';
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
 assert.equal(getProcessingProfile({...config.profile,material:{kind:'steel'},processing:{profileId:'steel-engraving'}}).ink,'#000000');
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


// K1 (Ü3.1/Ü2.2): Limits und Pflichtfelder kommen aus der Vorlage, nie aus dem Kundenobjekt.
const themed=(designPatch={},objectPatch={},profilePatch={})=>{
 const input=structuredClone(native);Object.assign(input,profilePatch);
 const d=input.designs[0];Object.assign(d,designPatch);
 Object.assign(d.objects.find(o=>o.type==='text'&&o.fieldKey==='name'),objectPatch);
 return prepareConfig({profile:input,basePriceCents:2999,extraMotifCents:169,photo:{enabled:true,mode:'upload-only'}});
};
const themedState=cfg=>({designId:cfg.profile.designs[0].id,objects:structuredClone(cfg.profile.designs[0].objects)});
const themedSave=(cfg,s)=>saveDraft(cfg,s,{},fonts,motifs);
test('text over theme limit is rejected in chars without surrounding spaces',()=>{
 const cfg=themed({themes:['namensschilder']}),s=themedState(cfg),name=s.objects.find(o=>o.fieldKey==='name');name.size=4;
 name.text='  '+'A'.repeat(32)+'  ';assert.doesNotThrow(()=>themedSave(cfg,s));
 name.text='A'.repeat(33);assert.throws(()=>themedSave(cfg,s),/Text zu lang: höchstens 32 Zeichen\./);
 // Ohne Thema gilt der Standard 40 / 2, der Mustertext der Vorlage bleibt zulässig.
 const plain=themed(),p=themedState(plain),pn=p.objects.find(o=>o.fieldKey==='name');pn.size=4;
 pn.text='A'.repeat(41);assert.throws(()=>themedSave(plain,p),/höchstens 40 Zeichen/);
 for(const d of plain.profile.designs)assert.doesNotThrow(()=>saveDraft(plain,{designId:d.id,objects:structuredClone(d.objects)},{},fonts,motifs),d.id);
});
test('too many lines are rejected per theme',()=>{
 const cfg=themed({themes:['namensschilder']}),s=themedState(cfg),name=s.objects.find(o=>o.fieldKey==='name');
 name.text='Balu\nLuna';assert.doesNotThrow(()=>themedSave(cfg,s));
 name.text='Balu\nLuna\nRex';assert.throws(()=>themedSave(cfg,s),/Höchstens 2 Zeilen\./);
 const memorial=themed({themes:['tiergedenktafeln']}),m=themedState(memorial);
 m.objects.find(o=>o.fieldKey==='name').text='Balu\nLuna\nRex\nMax';assert.doesNotThrow(()=>themedSave(memorial,m));
});
test('object limit overrides theme and product theme; client-side limits are ignored',()=>{
 const cfg=themed({themes:['gedenktafeln']},{maxLength:6,maxLines:1},{themeId:'hinweisschilder'}),s=themedState(cfg),name=s.objects.find(o=>o.fieldKey==='name');
 name.text='Balu';assert.doesNotThrow(()=>themedSave(cfg,s));
 name.text='Balu und Luna';assert.throws(()=>themedSave(cfg,s),/höchstens 6 Zeichen/);
 name.text='Ba\nlu';assert.throws(()=>themedSave(cfg,s),/Höchstens 1 Zeilen/);
 name.text='Balu und Luna';name.maxLength=500;name.maxLines=10;assert.throws(()=>themedSave(cfg,s),/höchstens 6 Zeichen/);
 const product=themed({},{},{themeId:'hinweisschilder'});assert.doesNotThrow(()=>{const t=themedState(product),n=t.objects.find(o=>o.fieldKey==='name');n.size=4;n.x=150;n.text='A'.repeat(52);themedSave(product,t);});
 assert.throws(()=>themed({},{maxLength:0}),/Zeichenlimit/);assert.throws(()=>themed({},{maxLines:11}),/Zeilenlimit/);
 assert.throws(()=>themed({},{maxLength:3}),/Mustertext/);
});
test('required text must differ from the template sample text',()=>{
 const cfg=themed({},{required:true}),s=themedState(cfg),name=s.objects.find(o=>o.fieldKey==='name');
 assert.throws(()=>themedSave(cfg,s),/Bitte das Feld „name“ ausfüllen\./);
 name.text=' balu ';assert.throws(()=>themedSave(cfg,s),/Bitte das Feld „name“ ausfüllen\./);
 name.uxHidden=true;name.text='Luna';assert.throws(()=>themedSave(cfg,s),/Bitte das Feld „name“ ausfüllen\./);
 delete name.uxHidden;s.objects=s.objects.filter(o=>o.id!==name.id);assert.throws(()=>themedSave(cfg,s),/Bitte das Feld „name“ ausfüllen\./);
 // Der Kunde kann das Pflichtkennzeichen nicht selbst abschalten.
 const t=themedState(cfg);Object.assign(t.objects.find(o=>o.fieldKey==='name'),{required:false});assert.throws(()=>themedSave(cfg,t),/ausfüllen/);
 assert.throws(()=>themed({},{required:'ja'}),/Pflichtfeld/);assert.throws(()=>themed({},{required:true,customerEditable:false}),/bearbeitbar/);
});
test('required text filled in passes, roundtrips and stays required; template self-check only with explicit option',()=>{
 const cfg=themed({},{required:true}),s=themedState(cfg),name=s.objects.find(o=>o.fieldKey==='name');
 name.text='Luna';const loaded=readDraft(cfg,themedSave(cfg,s),fonts,motifs);
 assert.equal(loaded.design.objects.find(o=>o.fieldKey==='name').text,'Luna');assert.equal(loaded.design.objects.find(o=>o.fieldKey==='name').required,true);
 const template=cfg.profile.designs[0];
 assert.throws(()=>validateDesign(cfg,structuredClone(template),{},fonts,motifs),/ausfüllen/);
 assert.doesNotThrow(()=>validateDesign(cfg,structuredClone(template),{},fonts,motifs,{template:true}));
});
test('server gate (K2): element rights, additions and template layer order are enforced in saveDraft and readDraft',()=>{
 const designId=config.profile.designs[0].id,source=config.profile.designs[0].objects;
 const none={content:false,color:false,replace:false,move:false,scale:false,delete:false};
 const withRights=(rights,extra={})=>({...config,...extra,workshopElementRights:{[designId]:Object.fromEntries(source.map(o=>[o.id,{...none,...(rights[o.id]||{})}]))}});
 const textId=source.find(o=>o.type==='text').id,motifId=source.find(o=>o.type==='motif').id,photoId=source.find(o=>o.type==='photoSlot').id;
 const draftOf=(c,s)=>saveDraft(c,s,{},fonts,motifs);
 // (a) delete or hide a template element without the delete right
 let c=withRights({});let s=state();s.objects=s.objects.filter(o=>o.id!==textId);assert.throws(()=>draftOf(c,s),/darf nicht entfernt oder ausgeblendet/);
 s=state();s.objects.find(o=>o.id===motifId).uxHidden=true;assert.throws(()=>draftOf(c,s),/darf nicht entfernt oder ausgeblendet/);
 s=state();s.objects.find(o=>o.id===motifId).opacity=0;assert.throws(()=>draftOf(c,s),/darf nicht entfernt oder ausgeblendet/);
 c=withRights({[textId]:{delete:true},[motifId]:{delete:true}});s=state();s.objects=s.objects.filter(o=>o.id!==textId);s.objects.find(o=>o.id===motifId).uxHidden=true;assert.doesNotThrow(()=>draftOf(c,s));
 // (b) change without the respective right; text width/height may follow permitted content; structure never
 c=withRights({});s=state();s.objects.find(o=>o.id===textId).text='Luna';assert.throws(()=>draftOf(c,s),/„name“ darf nicht verändert werden \(Recht content fehlt\)/);
 s=state();s.objects.find(o=>o.id===textId).x+=1;assert.throws(()=>draftOf(c,s),/Recht move fehlt/);
 s=state();s.objects.find(o=>o.id===textId).color='#123456';assert.throws(()=>draftOf(c,s),/Recht color fehlt/);
 s=state();Object.assign(s.objects.find(o=>o.id===photoId),{uxUploadId:'u',uxUploadKind:'photo'});assert.throws(()=>draftOf(c,s),/Recht replace fehlt/);
 c=withRights({[textId]:{content:true}});s=state();const t=s.objects.find(o=>o.id===textId);t.text='Luna';t.w+=20;t.h+=2;assert.doesNotThrow(()=>draftOf(c,s));
 s=state();s.objects.find(o=>o.id===textId).size+=1;assert.throws(()=>draftOf(c,s),/Recht scale fehlt/);
 c=withRights({[textId]:{content:true,color:true,move:true,scale:true},[photoId]:{replace:true}});s=state();Object.assign(s.objects.find(o=>o.id===textId),{text:'Luna',color:'#123456',x:140,size:9});Object.assign(s.objects.find(o=>o.id===photoId),{uxUploadId:'u',uxUploadKind:'photo'});assert.doesNotThrow(()=>draftOf(c,s));
 s=state();s.objects.find(o=>o.id===textId).fieldKey='other';assert.throws(()=>draftOf(c,s),/Vorlageneigenschaften nicht ändern/);
 s=state();s.objects.find(o=>o.id===textId).customerEditable=false;assert.throws(()=>draftOf(c,s),/Vorlageneigenschaften nicht ändern/);
 // (c) additions only when the product allows them; never photo areas
 const own=newEditableObject(config,{type:'text',text:'Eigen',font:'Montserrat',size:8},'own-text',fonts,motifs),ownMotif=newEditableObject(config,{type:'motif',motif:motifs[0].key},'own-motif',fonts,motifs);
 s=state();s.objects.push(own,ownMotif);assert.doesNotThrow(()=>draftOf(config,s));
 const closed=prepareConfig({...structuredClone(config),customerAdditions:{text:false,motifs:false,maxElements:0}});
 assert.throws(()=>draftOf(closed,s),/Eigener Text ist bei diesem Produkt nicht vorgesehen/);
 assert.throws(()=>newEditableObject(closed,{type:'text',text:'Eigen',font:'Montserrat',size:8},'own-text',fonts,motifs),/Eigener Text/);
 assert.throws(()=>newEditableObject(closed,{type:'motif',motif:motifs[0].key},'own-motif',fonts,motifs),/Eigene Motive/);
 const textOnly=prepareConfig({...structuredClone(config),customerAdditions:{text:true,motifs:false,maxElements:1}});
 s=state();s.objects.push(own);assert.doesNotThrow(()=>draftOf(textOnly,s));
 s.objects.push(ownMotif);assert.throws(()=>draftOf(textOnly,s),/Eigene Motive sind bei diesem Produkt nicht vorgesehen/);
 s=state();s.objects.push(own,{...own,id:'own-text-2',y:own.y+12});assert.throws(()=>draftOf(textOnly,s),/höchstens 1 zusätzliche Elemente/);
 s=state();s.objects.push({...structuredClone(s.objects.find(o=>o.id===photoId)),id:'own-photo',fieldKey:'photo-own'});assert.throws(()=>draftOf(config,s),/nicht zum freien Hinzufügen/);
 assert.throws(()=>prepareConfig({...structuredClone(config),customerAdditions:{text:true}}),/Kundenfreigaben/);
 // (d) template layer order stays, additions only above
 s=state();s.objects.reverse();assert.throws(()=>draftOf(config,s),/Ebenenreihenfolge der Vorlagenelemente/);
 s=state();s.objects.unshift(own);assert.throws(()=>draftOf(config,s),/oberhalb der Vorlagenelemente/);
 s=state();s.objects.splice(1,0,own);assert.throws(()=>draftOf(config,s),/oberhalb der Vorlagenelemente/);
 s=state();s.objects.push(own);const draft=draftOf(config,s);assert.equal(readDraft(config,draft,fonts,motifs).design.objects.at(-1).id,'own-text');
 const forged=structuredClone(draft);forged.design.objects.reverse();assert.throws(()=>readDraft(config,forged,fonts,motifs),/Ebenenreihenfolge/);
 const hidden=structuredClone(draft);hidden.design.objects=hidden.design.objects.filter(o=>o.id!==photoId);assert.throws(()=>readDraft(withRights({}),hidden,fonts,motifs),/nicht entfernt/);
});

test('photo background instructions roundtrip and reject invalid or misplaced values',()=>{
 const s=state(),photo=s.objects.find(o=>o.type==='photoSlot');photo.uxUploadId='test-photo';photo.uxUploadKind='photo';photo.uxPhotoBackground='keep';
 const loaded=readDraft(config,save(s),fonts,motifs);assert.equal(loaded.design.objects.find(o=>o.id===photo.id).uxPhotoBackground,'keep');
 photo.uxPhotoBackground='unknown';assert.throws(()=>save(s),/Foto-Aufbereitung/);
 delete photo.uxPhotoBackground;const text=s.objects.find(o=>o.type==='text');text.uxPhotoBackground='remove';assert.throws(()=>save(s),/Foto-Aufbereitung/);
});

test('photo alignment survives the actual render/draft contract and rejects invalid payloads',()=>{
 const s=state(),photo=s.objects.find(o=>o.type==='photoSlot');photo.uxUploadId='test-photo';photo.uxUploadKind='photo';
 photo.uxPhotoCrop={zoom:1,x:.4,y:-.2,angle:15};
 const loaded=readDraft(config,save(s),fonts,motifs);
 assert.deepEqual(loaded.design.objects.find(o=>o.id===photo.id).uxPhotoCrop,photo.uxPhotoCrop);
 for(const invalid of [{zoom:0,x:0,y:0},{zoom:1,x:2,y:0},{zoom:1,x:0,y:0,angle:'15'},{zoom:1,x:0,y:0,url:'untrusted'},null]){photo.uxPhotoCrop=invalid;assert.throws(()=>save(s),/Foto-Ausrichtung/);}
 delete photo.uxPhotoCrop;s.objects.find(o=>o.type==='text').uxPhotoCrop={zoom:1,x:0,y:0};assert.throws(()=>save(s),/Foto-Ausrichtung/);
});

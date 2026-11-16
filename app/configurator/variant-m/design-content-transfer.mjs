import {changedCustomerTexts,transferTexts} from './workflow-model.mjs';
import {designElementRights,customerAdditionPolicy} from './element-rights.mjs';
import {textLimits,textLimitIssue} from '../../workshop/theme-limits.mjs';
import {moduleEnabled} from './module-profile.mjs';
import {newPhotoBounds} from './photo-upload-geometry.mjs';

// Chris 13.11.2026: Kann das neue Produkt generell Fotos, kommt das Foto mit (eigener Fotobereich
// oder frei platziert). Ohne Fotofunktion wird es nach diesem Hinweis entfernt (dropPhotos).
export const PHOTO_UNSUPPORTED_MESSAGE='Achtung: Dieses Produkt hat keine Fotofunktion. Dein Foto wird beim Wechsel entfernt.';
export const photoAllowed=config=>config?.photo?.enabled===true&&moduleEnabled(config,'photo');

// A new template supplies layout, fonts, artwork and permissions. Only customer
// text and uploaded photos follow it. Size changes use the existing full state.
export function captureDesignContent(objects,template){
 const originals=new Map((template?.objects||[]).map(o=>[o.id,o]));
 const texts=new Set(changedCustomerTexts(objects,template).map(o=>o.id));
 for(const o of objects)if(o.type==='text'&&!o.uxHidden&&String(o.text??'').trim()&&(o.uxCustomerText||o.text!==originals.get(o.id)?.text))texts.add(o.id);
 // original/x/y/size: Zuordnung nach Inhalt und Leserichtung (transferTexts), keine Gestaltung.
 return {texts:objects.filter(o=>texts.has(o.id)).map(o=>({id:o.id,type:'text',fieldKey:o.fieldKey,text:o.text,original:originals.get(o.id)?.type==='text'?originals.get(o.id).text:undefined,x:o.x,y:o.y,size:o.size})),photos:objects.filter(o=>o.uxUploadId&&o.uxUploadKind==='photo'&&!o.uxHidden).map(o=>structuredClone(o))};
}

export function carryDesignContent(content,template,config,{id=()=>crypto.randomUUID(),dropPhotos=false,geometry=config?.profile?.geometry}={}){
 const objects=structuredClone(template.objects),rights=designElementRights(config,template.id,template.objects);
 const editable=objects.filter(o=>o.type==='text'&&rights[o.id]?.content),policy=customerAdditionPolicy(config);
 const remaining=transferTexts(content?.texts||[],editable),added=[];
 if(remaining.length&&(!policy.text||remaining.length>policy.maxElements||!editable.length))throw Error('Nicht alle eigenen Texte passen in diese Vorlage. Deine bisherige Gestaltung bleibt erhalten.');
 const used=new Set(objects.map(o=>o.id));
 for(const source of remaining){
  let key=id();if(used.has(key))throw Error('Die neue Textkennung ist bereits vergeben. Bitte erneut versuchen.');used.add(key);
  const sample=editable[0],o={id:key,type:'text',text:source.text,font:sample.font,size:sample.size,x:sample.x,y:sample.y,w:sample.w,h:sample.h,rotation:0,customerEditable:true,uxPersonal:true,uxCustomerText:true};
  if(sample.color!==undefined)o.color=sample.color;
  objects.push(o);added.push(key);
 }
 for(const o of objects.filter(o=>o.type==='text'&&o.uxCustomerText)){
  const problem=textLimitIssue(o.text,textLimits(template.objects.find(s=>s.id===o.id),template,config?.profile,config));
  if(problem)throw Error(problem+' Deine bisherige Gestaltung bleibt erhalten.');
 }
 const slots=objects.filter(o=>o.type==='photoSlot'&&rights[o.id]?.replace&&!o.uxUploadId);
 const allowed=photoAllowed(config),photos=allowed||!dropPhotos?content?.photos||[]:[];
 if(photos.length&&!allowed){const error=Error(PHOTO_UNSUPPORTED_MESSAGE);error.code='photo-unsupported';throw error;}
 for(const photo of photos){
  let slot=slots.find(s=>s.fieldKey&&s.fieldKey===photo.fieldKey)||slots[0];
  if(slot)slots.splice(slots.indexOf(slot),1);
  else{
   // Kein freier Fotobereich: wie ein neu hochgeladenes freies Foto (ux.mjs), Seitenverhältnis bleibt.
   let key=id();if(used.has(key))throw Error('Die neue Fotokennung ist bereits vergeben. Bitte erneut versuchen.');used.add(key);
   const box=newPhotoBounds(geometry?.width||100,geometry?.height||100),ratio=photo.w>0&&photo.h>0?photo.w/photo.h:1,scale=Math.min(box.w/ratio,box.h);
   slot={id:key,type:'photoSlot',x:box.x,y:box.y,w:scale*ratio,h:scale,rotation:0,photoShape:'rect',fieldKey:'photo-'+key,required:false,customerEditable:true,uxPersonal:true};
   objects.push(slot);added.push(key);
  }
  for(const key of ['uxUploadId','uxUploadKind','uxPhotoCrop','uxPhotoColor','uxPhotoBackground'])if(photo[key]!==undefined)slot[key]=structuredClone(photo[key]);
  slot.uxHidden=false;
 }
 return {objects,added,textCount:content?.texts?.length||0,photoCount:photos.length,droppedPhotos:(content?.photos?.length||0)-photos.length};
}

// Original Files and processed Blobs stay in the private same-origin page.
// No URL, cart identity or previous product permission crosses this boundary.
export function capturePhotoFiles(content,files){
 return [...new Set(content.photos.map(o=>o.uxUploadId))].map(id=>{
  const asset=files.get(id);if(!asset?.file)throw Error('Die Fotodatei ist nicht verfügbar. Bitte das Foto erneut auswählen; deine Gestaltung bleibt erhalten.');
  const {url,...data}=asset;return {id,asset:data};
 });
}

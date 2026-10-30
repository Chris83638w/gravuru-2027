import {changedCustomerTexts,transferTexts} from './workflow-model.mjs';
import {designElementRights,customerAdditionPolicy} from './element-rights.mjs';
import {textLimits,textLimitIssue} from '../../workshop/theme-limits.mjs';

// A new template supplies layout, fonts, artwork and permissions. Only customer
// text and uploaded photos follow it. Size changes use the existing full state.
export function captureDesignContent(objects,template){
 const originals=new Map((template?.objects||[]).map(o=>[o.id,o]));
 const texts=new Set(changedCustomerTexts(objects,template).map(o=>o.id));
 for(const o of objects)if(o.type==='text'&&!o.uxHidden&&String(o.text??'').trim()&&(o.uxCustomerText||o.text!==originals.get(o.id)?.text))texts.add(o.id);
 return {texts:objects.filter(o=>texts.has(o.id)).map(o=>({id:o.id,type:'text',fieldKey:o.fieldKey,text:o.text})),photos:objects.filter(o=>o.uxUploadId&&o.uxUploadKind==='photo'&&!o.uxHidden).map(o=>structuredClone(o))};
}

export function carryDesignContent(content,template,config,{id=()=>crypto.randomUUID()}={}){
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
 const photos=content?.photos||[];
 if(photos.length&&(!config?.photo?.enabled||photos.length>slots.length))throw Error('Diese Vorlage bietet nicht genügend Fotobereiche für deine Fotos. Deine bisherige Gestaltung bleibt erhalten.');
 for(const photo of photos){
  const slot=slots.find(s=>s.fieldKey&&s.fieldKey===photo.fieldKey)||slots[0];slots.splice(slots.indexOf(slot),1);
  for(const key of ['uxUploadId','uxUploadKind','uxPhotoCrop','uxPhotoColor','uxPhotoBackground'])if(photo[key]!==undefined)slot[key]=structuredClone(photo[key]);
  slot.uxHidden=false;
 }
 return {objects,added,textCount:content?.texts?.length||0,photoCount:photos.length};
}

// Original Files and processed Blobs stay in the private same-origin page.
// No URL, cart identity or previous product permission crosses this boundary.
export function capturePhotoFiles(content,files){
 return [...new Set(content.photos.map(o=>o.uxUploadId))].map(id=>{
  const asset=files.get(id);if(!asset?.file)throw Error('Die Fotodatei ist nicht verfügbar. Bitte das Foto erneut auswählen; deine Gestaltung bleibt erhalten.');
  const {url,...data}=asset;return {id,asset:data};
 });
}

import {validContentId} from './design-content.mjs';
import {validColor} from './processing-profiles.mjs';
const ownKeys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k));
export function validateMediaReference(ref){
 if(!ownKeys(ref,['mediaId','revisionId'])||!validContentId(ref.mediaId)||!validContentId(ref.revisionId))throw Error('Medium und feste Medienrevision fehlen oder sind ungültig.');
}
export function validatePhotoSettings(object){
 if(object.media!==undefined)validateMediaReference(object.media);
 if(object.crop!==undefined){const c=object.crop;if(!ownKeys(c,['x','y','width','height'])||!['x','y','width','height'].every(k=>Number.isFinite(c[k]))||c.x<0||c.y<0||c.width<=0||c.height<=0||c.x+c.width>1.0000001||c.y+c.height>1.0000001)throw Error('Der Bildausschnitt muss innerhalb des Originalfotos liegen.');}
 if(object.photoProcessing!==undefined){const v=object.photoProcessing;if(!ownKeys(v,['brightness','contrast','invert'])||!['brightness','contrast'].every(k=>Number.isFinite(v[k])&&v[k]>=0&&v[k]<=2)||typeof v.invert!=='boolean')throw Error('Ungültige Fotoeinstellungen.');}
 // Public template media only. Customer originals belong to the private order pipeline.
 if(['src','url','dataUrl','photoDataUrl','originalPhoto','imageData'].some(k=>object[k]!==undefined))throw Error('Fotos über die Medienbibliothek mit fester Revision zuordnen.');
}
export function validateUniversalElements(design){
 if(design.marks!==undefined){
  if(!Array.isArray(design.marks)||design.marks.length>100)throw Error('Ungültige Anzahl grafischer Linien.');
  for(const mark of design.marks)if(!mark||typeof mark.d!=='string'||mark.d.length>20000||!/^\s*[Mm]/.test(mark.d)||!/^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/.test(mark.d)||!Number.isFinite(mark.width)||mark.width<=0||mark.width>100||(mark.color!==undefined&&!validColor(mark.color)))throw Error('Grafische Linien: Pfad, Strichstärke oder Farbe ungültig.');
 }
 for(const object of design.objects){
  if(object.color!==undefined&&!validColor(object.color))throw Error('Elementfarbe bitte als gültige RGB-Farbe angeben.');
  // Ebenenrolle: 'guide' bleibt sichtbar im Editor, erscheint nie in der Fertigungsdatei; Standard 'print'.
  if(object.role!==undefined&&!['guide','print'].includes(object.role))throw Error('Ebenenrolle bitte als guide oder print angeben.');
  if(object.type==='motif-raster'&&(!/^[a-f0-9]{64}$/.test(object.assetId||'')||typeof object.locked!=='boolean'||object.locked!==true||object.opacity!==undefined&&(!Number.isFinite(object.opacity)||object.opacity<0||object.opacity>1)))throw Error('Rastermotiv braucht eine feste Bildkennung, Sperre und gültige Deckkraft.');
  if(object.preserveColors!==undefined&&(object.type!=='motif'||typeof object.preserveColors!=='boolean'))throw Error('Originalfarben können nur für Motive ein- oder ausgeschaltet werden.');
  if(['image','photoSlot'].includes(object.type)){
   validatePhotoSettings(object);
   if(object.type==='image')validateMediaReference(object.media);
  }else if(['media','crop','photoProcessing'].some(k=>object[k]!==undefined))throw Error('Fotoeinstellungen gehören nur zu Bildern und Fotobereichen.');
  if(object.type==='graphic'){
   if(!['line','rect','ellipse'].includes(object.shape)||typeof object.filled!=='boolean'||!Number.isFinite(object.strokeWidth)||object.strokeWidth<=0||object.strokeWidth>Math.min(object.w,object.h))throw Error('Grafisches Extra: Form und Strichstärke prüfen.');
  }
 }
}
export function validateOptionGroups(groups){
 if(groups===undefined)return;
 if(!Array.isArray(groups)||groups.length>20)throw Error('Höchstens 20 Gruppen für kaufbare Extras verwenden.');
 const ids=new Set();
 for(const group of groups){
  if(!group||!validContentId(group.id)||ids.has(group.id)||typeof group.name!=='string'||!group.name.trim()||group.name.length>100||typeof group.required!=='boolean')throw Error('Kaufbare Extras brauchen eindeutige Gruppen und Namen.');
  ids.add(group.id);
  if(!Array.isArray(group.values)||!group.values.length||group.values.length>40)throw Error('Eine Extragruppe braucht 1 bis 40 Auswahlmöglichkeiten.');
  const values=new Set();
  for(const value of group.values){
   if(!value||!validContentId(value.id)||values.has(value.id)||typeof value.label!=='string'||!value.label.trim()||value.label.length>100)throw Error('Extras brauchen eindeutige Kennungen und Bezeichnungen.');
   values.add(value.id);
   if(!Number.isSafeInteger(value.priceCents)||value.priceCents<0||value.priceCents>100000000||value.currency!=='EUR')throw Error('Aufpreise als ganze Centbeträge in EUR angeben.');
  }
  if(!group.required&&!group.values.some(v=>v.priceCents===0))throw Error('Eine optionale Extragruppe braucht eine kostenlose Auswahl, zum Beispiel „Ohne Extra“.');
 }
}


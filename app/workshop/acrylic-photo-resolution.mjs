import {photoFrameCovered} from './photo-frame-coverage.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {PROCESS_PROFILES} from './process-profiles.mjs';

// Ü5.1/Ü5.2: Ampel aus effektiver Auflösung und Soll-DPI des Fertigungsprofils.
// Grün ab Soll, Gelb ab 60 % des Solls, Rot darunter. Nie eine Sperre und keine
// Bestätigung: jedes Foto wird angenommen (Entscheidung 19.10.2026).
export const DEFAULT_TARGET_DPI=300;
export const RESOLUTION_GRADES=Object.freeze(['gruen','gelb','rot']);
export const LOW_RESOLUTION_HINT='Das Foto ist klein, wir holen das Beste raus.';
// Reihenfolge: gebundenes Fertigungsprofil (output.dpi) → Verfahrensprofil (K10,
// targetDpi; Objekt aus process-profiles.mjs oder dessen Kennung) → 300.
export function resolutionTargetDpi(productionProfile,processProfile=null){
 const dpi=productionProfile?.document?.output?.dpi;
 if(Number.isFinite(dpi)&&dpi>0)return dpi;
 const process=typeof processProfile==='string'?PROCESS_PROFILES.find(p=>p.id===processProfile):processProfile;
 return Number.isFinite(process?.targetDpi)&&process.targetDpi>0?process.targetDpi:DEFAULT_TARGET_DPI;
}
export function resolutionGrade(effectiveDpi,targetDpi=DEFAULT_TARGET_DPI){
 if(!Number.isFinite(effectiveDpi)||effectiveDpi<0||!Number.isFinite(targetDpi)||targetDpi<=0)throw Error('Ungültige Auflösungsangabe.');
 return effectiveDpi>=targetDpi?'gruen':effectiveDpi>=targetDpi*.6?'gelb':'rot';
}
// Kundentext zur Ampel. Grün: kein Text. Gelb/Rot: freundlicher Hinweis, nie eine Sperre.
export function resolutionHint(grade){
 if(grade==='rot')return LOW_RESOLUTION_HINT;
 if(grade==='gelb')return 'Das Foto ist für diese Größe etwas knapp aufgelöst; ein größeres Original bringt mehr Details.';
 return '';
}
// Vermerk je Fotoobjekt für Entwurf, Bestellung und Fertigungspaket (K4 liest das Feld).
export function photoResolutionNote(effectiveDpi,targetDpi=DEFAULT_TARGET_DPI){
 const grade=resolutionGrade(effectiveDpi,targetDpi);
 return {grade,effectiveDpi,targetDpi,hint:resolutionHint(grade),productionNote:grade==='rot'?'Auflösung niedrig':grade==='gelb'?'Auflösung knapp':''};
}

// Match cover + crop for photo slots and xMidYMid meet for other uploads.
// This measures available pixels, not focus, compression or prior upscaling.
export function acrylicPhotoResolution(object,photo,scale,{targetDpi=DEFAULT_TARGET_DPI}={}){
 const source=photo.edited||photo;
 if(![source.width,source.height,object.w,object.h,scale].every(n=>Number.isFinite(n)&&n>0))return null;
 const fit=object.type==='photoSlot'?photoPlacement(object,source):(()=>{
  const ratio=Math.min(object.w/source.width,object.h/source.height);
  return {w:source.width*ratio,h:source.height*ratio};
 })();
 const widthMm=fit.w*scale,heightMm=fit.h*scale;
 const effectiveDpi=Math.floor(Math.min(source.width/widthMm,source.height/heightMm)*25.4);
 return {objectId:object.id,uploadId:photo.uploadId,label:object.label||object.name||(object.type==='photoSlot'?'Foto':'Hinzugefügtes Bild'),
  source:photo.edited?'edited':'original',path:source.path,width:source.width,height:source.height,
  placedWidthMm:Number(widthMm.toFixed(3)),placedHeightMm:Number(heightMm.toFixed(3)),
  frameCovered:photoFrameCovered(object,source),
  effectiveDpi,...photoResolutionNote(effectiveDpi,targetDpi)};
}

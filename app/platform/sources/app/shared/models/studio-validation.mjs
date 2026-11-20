import {DOORBELL_SCHEMA,doorbellLayoutIssue} from '../../../../../configurator/variant-m/product-model-module.mjs';
import {validateContourGeometry} from './contour-geometry.mjs';
import {validateDesignContent,surfaceObjectIssue,isBoundaryIssue,validateGeometryHoles,validContentId,DESIGN_LIMITS} from './design-content.mjs';
import {validateProcessingProfile} from './processing-profiles.mjs';
import {validateUniversalElements,validateOptionGroups} from './universal-elements.mjs';
import {validateProfile} from './product-legacy-validation-module.mjs';
export function dimensions(p){return p.kind==='layered-doorbell'&&p.doorbellSchema!==DOORBELL_SCHEMA?{width:160,height:280,margin:10,shape:'rect'}:{width:p.geometry.width,height:p.geometry.height,margin:p.geometry.safeMarginMm??2,shape:p.geometry.shape||'rect',radius:p.geometry.cornerRadiusMm||0};}
export function validateStudio(p,original,{extraFontIds=[],motifs=[],fonts,catalogSizes=false,catalogDesigns=false,templateBoundary='reject'}={}){
 if(!p||!original)throw Error('Ungültige Produktvorlage.');
 if(p.kind==='layered-doorbell'&&p.doorbellSchema===DOORBELL_SCHEMA){
  if(!validContentId(p.id)||p.id!==original.id||JSON.stringify(p.binding)!==JSON.stringify(original.binding)||!p.binding?.productId)throw Error('Ungültige native Funkklingelzuordnung.');
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>200||!p.geometry||!Number.isFinite(p.geometry.width)||!Number.isFinite(p.geometry.height))throw Error('Ungültige native Funkklingelvorlage.');
  validateProcessingProfile(p);validateOptionGroups(p.optionGroups);validateGeometryHoles(p);
  if(!Array.isArray(p.designs)||!p.designs.length||p.designs.length>DESIGN_LIMITS.maxDesigns||new Set(p.designs.map(d=>d.id)).size!==p.designs.length)throw Error('Eindeutige native Funkklingelvorlagen fehlen.');
  for(const d of p.designs){validateDesignContent(d,{universal:true,extraFontIds});validateUniversalElements(d);for(const o of d.objects){const issue=doorbellLayoutIssue(o,p);if(issue)throw Error(d.name+': '+issue);}}
  return p;
 }
 if(p.kind==='layered-doorbell'){validateOptionGroups(p.optionGroups);return validateProfile(p,original,{extraFontIds});}
 if(p.kind!=='universal-product'||!validContentId(p.id)||p.id!==original.id||JSON.stringify(p.binding)!==JSON.stringify(original.binding))throw Error('Ungültige Produktzuordnung.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>200)throw Error('Bitte einen Produktnamen eingeben.');
 if(!p.geometry||!p.material)throw Error('Produktgeometrie oder Material fehlt.');
 const {width,height,margin,shape,radius}=dimensions(p);
 if(![width,height,margin,radius].every(Number.isFinite)||width<10||height<10||width>2000||height>2000||margin<0||margin*2>=Math.min(width,height)||!['rect','ellipse','contour'].includes(shape)||radius<0||radius>Math.min(width,height)/2)throw Error('Bitte gültige Produktmaße und eine passende Form eingeben.');
 if(!['steel','acrylic','wood','slate','other','print'].includes(p.material.kind)||!/^#[0-9a-f]{6}$/i.test(p.material.color)||!Number.isFinite(p.material.thicknessMm)||p.material.thicknessMm<=0||p.material.thicknessMm>100)throw Error('Bitte Material, Farbe und Stärke prüfen.');
 validateProcessingProfile(p);validateOptionGroups(p.optionGroups,{catalogSizes});
 if(p.workingArea!==undefined){const a=p.workingArea;if(shape!=='contour'||!a||![a.headHeightMm,a.previewHeightMm].every(Number.isFinite)||a.headHeightMm<10||a.previewHeightMm>height||Math.abs(a.previewHeightMm-a.headHeightMm-10)>.001)throw Error('Ungültige Grabstecker-Kopfansicht.');}
 if(shape==='contour'){validateContourGeometry(p.geometry);for(const group of p.optionGroups||[])for(const value of group.values||[])if(value.holes!==undefined)validateGeometryHoles({...p,geometry:{...p.geometry,holes:value.holes}});}
 validateGeometryHoles(p);
 // A validated catalog family includes all approved themes (#139). The
 // merchant's manual-template cap must not truncate that source-bound gallery.
 if(!Array.isArray(p.designs)||!p.designs.length||!catalogSizes&&!catalogDesigns&&p.designs.length>DESIGN_LIMITS.maxDesigns||p.designs.some(d=>!d)||new Set(p.designs.map(d=>d.id)).size!==p.designs.length)throw Error(catalogSizes||catalogDesigns?'Katalogdesigns mit eindeutigen Kennungen fehlen.':'Bitte 1 bis '+DESIGN_LIMITS.maxDesigns+' Designs mit eindeutigen Kennungen verwenden.');
 for(const d of p.designs){if(typeof d.name!=='string'||!d.name.trim()||d.name.length>200)throw Error('Jedes Design braucht einen Namen mit höchstens 200 Zeichen.');validateDesignContent(d,{universal:true,extraFontIds});validateUniversalElements(d);for(const o of d.objects){
  // Chris, 20.11.2026, 16:49 Uhr, zu einer Vorlage, die sich im Shop nicht öffnen ließ: „Allerdings muss das generell
  // möglich sein. Es darf keine Fehlermeldung kommen. Beim export kann es dann beschnitten sein“. Der Editor öffnet eine
  // veröffentlichte Vorlage deshalb auch dann, wenn ein Element über die Gestaltungsfläche ragt (templateBoundary:'allow',
  // nur beim Laden im Editor gesetzt). Alle anderen Befunde (ungültige Maße, unter der Klingel) bleiben Fehler. Die Ausgabe
  // schneidet am Schild ab (Gravur an der Außenkontur, Druck an der Seite).
  // Ohne diese Angabe bleibt die Prüfung streng: Speichern in der Werkstatt, Produktanlage aus Familien und die
  // Katalog-Umrechnung („passt nicht“) entscheiden weiter, welche Designs überhaupt in ein Produkt kommen. Die erste
  // Fassung (ea2c9670) hatte das für alle Aufrufer gelockert; der Gesamtlauf zeigte drei Tests dieser Stellen rot.
  const issue=surfaceObjectIssue(o,p,{motifs,fonts});if(issue&&!(templateBoundary==='allow'&&isBoundaryIssue(issue)))throw Error(d.name+': '+issue);}}
 return p;
}

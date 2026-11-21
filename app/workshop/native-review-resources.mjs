// Native customer review uses the same bundled library as the editor. Only used
// additions are frozen into the immutable snapshot; browser SVG/font sources are never accepted.
import {workshopResources} from './catalog.mjs';
import {SUPPORTED_FONT_IDS} from '../platform/sources/app/shared/models/design-content.mjs';
import {isLayeredDoorbell,selectedDoorbellProfile} from '../configurator/variant-m/doorbell-selection.mjs';
import {isFamilyFormats,selectedFamilyProfile} from '../configurator/variant-m/family-formats.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'native_review_resource'});};
function privateCopy(config){
 const shared=config?.localResources;
 if(!shared||typeof shared!=='object'||Array.isArray(shared)||!shared.fonts||typeof shared.fonts!=='object'||Array.isArray(shared.fonts)||!Array.isArray(shared.motifs))return structuredClone(config);
 // Platzhalter halten die Reihenfolge der Schlüssel; die großen Daten werden danach als dieselben Objekte eingesetzt.
 const copy=structuredClone({...config,localResources:{...shared,fonts:null,motifs:null}});
 copy.localResources.fonts={...shared.fonts};copy.localResources.motifs=[...shared.motifs];
 return copy;
}
export function nativeReviewConfig(config,input){
 // #265: Schrift- und Motivdaten sind nach dem Laden unveränderlich (dieselbe Grundlage wie checkedGlyphs und checkedMotifs
 // in local-pilot.mjs). Sie werden nicht mehr bei jedem Klick mitkopiert (live rund 0,2 s), sondern als dieselben Objekte
 // weitergereicht; die Listen selbst und alles Übrige bleiben eine eigene Kopie dieser Anfrage. Dieselben Schriftobjekte
 // lassen product-model.mjs die geprüfte Fassung des gehaltenen Produktstands wiederfinden.
 const copy=privateCopy(config),local=copy.localResources,profile=isFamilyFormats(copy)?selectedFamilyProfile(copy,input?.options):isLayeredDoorbell(copy)?selectedDoorbellProfile(copy,input?.options):copy.profile,source=profile.designs.find(d=>d.id===input?.designId);
 if(!source||!Array.isArray(input?.objects))return copy;
 const known=new Map(source.objects.map(o=>[o.id,o])),usedMotifs=new Set(input.objects.filter(o=>o.type==='motif').map(o=>o.motif));
 const usedFonts=new Set(input.objects.filter(o=>o.type==='text').map(o=>o.font));
 const selections=copy.workshopProfiles?.selections;
 for(const o of input.objects){
  const old=known.get(o.id);
  if(o.type==='motif'&&(!old||old.motif!==o.motif)&&Array.isArray(selections?.motifs)&&!selections.motifs.includes(o.motif))fail('Dieses Motiv ist für das Produkt nicht freigegeben.');
  if(o.type==='text'&&(!old||old.font!==o.font)&&Array.isArray(selections?.fonts)&&!selections.fonts.includes(o.font))fail('Diese Schrift ist für das Produkt nicht freigegeben.');
 }
 let library;
 const resources=()=>library??=workshopResources(local);
 const keys=new Set(local.motifs.map(m=>m.key));
 for(const key of usedMotifs)if(!keys.has(key)){
  const motif=resources().motifs.find(m=>m.key===key);
  if(!motif)fail('Motiv ist nicht in der Bibliothek.');
  local.motifs.push(structuredClone(motif));keys.add(key);
 }
 for(const key of usedFonts)if(!Object.hasOwn(local.fonts,key)){
  const font=resources().fonts[key];if(!font)fail('Diese Schrift ist nicht in der Bibliothek.');
  // Ohne Schriftauswahl im Profil gilt wie bisher: nur Produktschriften und das feste Grundset.
  if(!Array.isArray(selections?.fonts)&&!SUPPORTED_FONT_IDS.includes(key))fail('Diese Schrift ist für das Produkt nicht freigegeben.');
  local.fonts[key]=font;
 }
 return copy;
}

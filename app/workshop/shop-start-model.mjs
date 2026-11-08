import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {isFamilyFormats,isAllSizesFamily,designNumber,projectFamilyDesign} from '../configurator/variant-m/family-formats.mjs';
export {isAllSizesFamily};

// Türschild-Konfi (Chris 03.11.2026, ENTSCHEIDUNGEN 4.42): ein Produkt mit allen Formen und Größen
// (Produktschnitt groessenWahl:"alle"). Der Start schickt alle Formate (Form → Größe → Befestigung),
// aber nur das Startdesign und je Format die eine Vorlage, die ein Größenwechsel im Konfi nehmen würde.
// Alle übrigen Designs kommen erst über die Designauswahl (Vorschaubild, Laden beim Klick).

const unavailable=()=>{throw Object.assign(Error('Dieses Design ist nicht verfügbar.'),{status:404,code:'shop_entry_design'});};
const usable=d=>d&&d.hidden!==true&&d.released!==false&&d.katalog?.fit!=='passt nicht';

// Dieselbe Wahl wie familyFormatState im Konfi: gleiches Design, sonst gleiche Designnummer, sonst das erste.
function fallbackFor(ids,source,byId){
 if(ids.includes(source.id))return source.id;
 const number=designNumber(source);
 return (number!==null&&ids.find(id=>designNumber(byId.get(id))===number))||ids[0];
}
function allSizesKeep(config,designId,options){
 const f=config.familyFormats,byId=new Map(f.designs.map(d=>[d.id,d]));
 const format=f.formats.find(s=>s.key===options?.size)||f.formats.find(s=>s.key===f.defaultSize);
 const variant=format?.variants.find(v=>v.color===(options?.color??f.defaultColor));
 const ids=(variant?.designIds||[]).filter(id=>usable(byId.get(id)));
 const wanted=designId||config.profile.defaultDesignId;
 if(designId&&!ids.includes(designId))unavailable();
 const start=ids.includes(wanted)?wanted:(byId.get(wanted)?fallbackFor(ids,byId.get(wanted),byId):ids[0]);
 if(!start)unavailable();
 const keep=new Set([start]),source=byId.get(start);
 for(const s of f.formats)for(const v of s.variants){const list=v.designIds.filter(id=>usable(byId.get(id)));if(list.length)keep.add(fallbackFor(list,source,byId));}
 return {start,keep,size:format.key,format};
}

// Only the public shop entry uses this projection. The stored document and
// server-side price/order validation always retain all designs.
export function shopStartModel(model,designId=null,{deferFonts=false,options=null}={}){
 const config=model.universal,allSizes=isAllSizesFamily(config);
 if(isLayeredDoorbell(config)||(isFamilyFormats(config)&&!config.familyFormats.fixedSize&&!allSizes))return structuredClone(model);
 const profile=config.profile,lazy=allSizes?allSizesKeep(config,designId,options):null;
 const id=lazy?lazy.start:designId||profile.defaultDesignId||profile.designs[0]?.id;
 const keep=lazy?lazy.keep:new Set([id]);
 const design=allSizes?config.familyFormats.designs.find(d=>d.id===id):profile.designs.find(d=>d.id===id&&usable(d));
 if(!design)unavailable();
 // Project before cloning: never copy the complete design library twice.
 // The root profile may still belong to the catalogue's original start size.
 // Project the approved selected template for the actual binding instead of
 // filtering that old profile, which can omit a valid design of another form.
 const profileDesigns=allSizes?[projectFamilyDesign(config,id,lazy.format)]:[design];
 const selected={...profile,defaultDesignId:id,designs:profileDesigns};
 const keptDesigns=allSizes?config.familyFormats.designs.filter(d=>keep.has(d.id)):[design];
 const used=new Set(keptDesigns.concat(profileDesigns).flatMap(d=>d.objects.filter(o=>o.type==='motif').map(o=>o.motif)));
 const resources=config.localResources?{...config.localResources,motifs:config.localResources.motifs?.filter(m=>!m.embeddedOnly||used.has(m.key)),...(deferFonts?{fonts:{}}:{})}:undefined;
 if(resources)for(const key of ['photoExamples','photoPlaceholders'])if(resources[key])resources[key]=resources[key].filter(item=>keep.has(item.designId));
 const family=isFamilyFormats(config)?{...config.familyFormats,designs:config.familyFormats.designs.filter(d=>keep.has(d.id))}:undefined;
 const rights=config.workshopElementRights?Object.fromEntries([...keep].filter(k=>config.workshopElementRights[k]).map(k=>[k,config.workshopElementRights[k]])):undefined;
 const copy=structuredClone({...model,universal:{...config,profile:selected,...(resources?{localResources:resources}:{}),...(family?{familyFormats:family}:{}),...(rights?{workshopElementRights:rights}:{})},...(model.legacy?{legacy:{...model.legacy,defaultDesignId:id,designs:profileDesigns}}:{})});
 // The caller immediately serializes these immutable outlines to hash files
 // and removes the shallow keys; no outline is edited or sent in the model.
 if(deferFonts&&resources)copy.universal.localResources.fonts={...config.localResources.fonts};
 if(copy.universal.photo?.hints)copy.universal.photo.hints=copy.universal.photo.hints.filter(h=>keep.has(h.designId));
 if(isFamilyFormats(config)){
  const family=copy.universal.familyFormats;
  if(!family.designs.length)throw Object.assign(Error('Familienvorlage fehlt.'),{status:404,code:'shop_entry_design'});
  for(const format of family.formats)for(const variant of format.variants)variant.designIds=variant.designIds.filter(key=>keep.has(key));
  // This is the selected customer view, not a new catalogue product cut.
  const template=family.designs.find(d=>d.id===id),theme=template.themes?.includes(profile.themeId)?profile.themeId:template.themes?.[0];
  copy.universal.profile.themeId=theme;
  family.source.shopProduct={...family.source.shopProduct,defaultDesignId:template.katalog.designId,themeId:theme};
  if(lazy){
   // Startformat = gewählte Shopify-Variante; der Konfi beginnt dort, nicht bei der Katalog-Startgröße.
   family.defaultSize=lazy.size;
   const group=copy.universal.profile.optionGroups?.find(g=>g.id==='size');if(group)group.defaultValueId=lazy.size;
  }
 }
 return copy;
}

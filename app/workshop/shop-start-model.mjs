import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {isFamilyFormats} from '../configurator/variant-m/family-formats.mjs';

// Only the public, fixed-size shop entry uses this projection. The stored
// document and server-side price/order validation always retain all designs.
export function shopStartModel(model,designId=null,{deferFonts=false}={}){
 const config=model.universal;
 if(isLayeredDoorbell(config)||(isFamilyFormats(config)&&!config.familyFormats.fixedSize))return structuredClone(model);
 const profile=config.profile,id=designId||profile.defaultDesignId||profile.designs[0]?.id;
 const design=profile.designs.find(d=>d.id===id&&d.hidden!==true&&d.released!==false&&d.katalog?.fit!=='passt nicht');
 if(!design)throw Object.assign(Error('Dieses Design ist nicht verfügbar.'),{status:404,code:'shop_entry_design'});
 // Project before cloning: never copy the complete design library twice.
 const selected={...profile,defaultDesignId:id,designs:[design]};
 const used=new Set(design.objects.filter(o=>o.type==='motif').map(o=>o.motif));
 const resources=config.localResources?{...config.localResources,motifs:config.localResources.motifs?.filter(m=>!m.embeddedOnly||used.has(m.key)),...(deferFonts?{fonts:{}}:{})}:undefined;
 if(resources)for(const key of ['photoExamples','photoPlaceholders'])if(resources[key])resources[key]=resources[key].filter(item=>item.designId===id);
 const family=isFamilyFormats(config)?{...config.familyFormats,designs:config.familyFormats.designs.filter(d=>d.id===id)}:undefined;
 const copy=structuredClone({...model,universal:{...config,profile:selected,...(resources?{localResources:resources}:{}),...(family?{familyFormats:family}:{}),...(config.workshopElementRights?{workshopElementRights:{[id]:config.workshopElementRights[id]}}:{})},...(model.legacy?{legacy:{...model.legacy,defaultDesignId:id,designs:[design]}}:{})});
 // The caller immediately serializes these immutable outlines to hash files
 // and removes the shallow keys; no outline is edited or sent in the model.
 if(deferFonts&&resources)copy.universal.localResources.fonts={...config.localResources.fonts};
 if(copy.universal.photo?.hints)copy.universal.photo.hints=copy.universal.photo.hints.filter(h=>h.designId===id);
 if(isFamilyFormats(config)){
  const family=copy.universal.familyFormats;
  family.designs=family.designs.filter(d=>d.id===id);
  if(!family.designs.length)throw Object.assign(Error('Familienvorlage fehlt.'),{status:404,code:'shop_entry_design'});
  for(const format of family.formats)for(const variant of format.variants)variant.designIds=variant.designIds.filter(key=>key===id);
  // This is the selected customer view, not a new catalogue product cut.
  const template=family.designs[0],theme=template.themes?.includes(profile.themeId)?profile.themeId:template.themes?.[0];
  copy.universal.profile.themeId=theme;
  family.source.shopProduct={...family.source.shopProduct,defaultDesignId:template.katalog.designId,themeId:theme};
 }
 return copy;
}

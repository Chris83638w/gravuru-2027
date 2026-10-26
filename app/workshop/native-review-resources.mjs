// Native customer review uses the same bundled library as the editor. Only used
// additions are frozen into the immutable snapshot; browser SVG/font sources are never accepted.
import {workshopResources} from './catalog.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'native_review_resource'});};
export function nativeReviewConfig(config,input){
 const copy=structuredClone(config),local=copy.localResources,source=copy.profile.designs.find(d=>d.id===input?.designId);
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
  local.fonts[key]=structuredClone(font);
 }
 return copy;
}

// K9 (Benchmark 19.10.2026, Ü10.1/Ü10.2/V4): Design-Galerie je Thema, Miniaturen
// mit Kundentext und Direktlink. Reine Regeln ohne DOM, damit Vertrag, Editor
// und Tests dieselbe Reihenfolge und dieselben Prüfungen verwenden.
import {themeId as resolveThemeId,textLimits,clampText,TEXT_LIMIT_RANGES} from '../../workshop/theme-limits.mjs';
import {transferTexts,changedCustomerTexts} from './workflow-model.mjs';
import {inThemeCategory} from './customer-tools-model.mjs';

export const DIRECT_LINK_PARAMS=Object.freeze(['design','size','text']);
const normalizeId=value=>{
 const id=typeof value==='string'?value:value&&typeof value==='object'&&typeof value.id==='string'?value.id:'';
 return id.trim()?id.trim().toLowerCase():null;
};
// Thema eines Designs: `themes:[…]` aus design.json (Strings oder {id}); leer = ohne Thema.
export function designThemes(design){
 const list=Array.isArray(design?.themes)?design.themes:[];
 return [...new Set(list.map(normalizeId).filter(Boolean))];
}
// Thema des Produkts bzw. der Unterkategorie (`profile.themeId`, wie K1).
export function productTheme(profile){return resolveThemeId(null,profile);}
// Themen-Definition aus `themen.json` ({themes:[{id,name,fontSet,motifCategories,designTags}]}),
// im Editor unter `config.themes` (Liste oder das ganze Dokument).
export function themeDefinition(config,profile){
 const id=productTheme(profile);if(!id)return null;
 const list=Array.isArray(config?.themes)?config.themes:Array.isArray(config?.themes?.themes)?config.themes.themes:[];
 return list.find(t=>normalizeId(t)===id)||null;
}
// Reihenfolge im Tab „Designs“: zuerst Designs mit dem Thema des Produkts
// (Bestseller zuerst, sonst Reihenfolge im Profil = neu), Designs ohne Thema
// bleiben wie bisher sichtbar. Designs anderer Themen landen eingeklappt unter
// „Weitere Designs“. Ohne Produktthema gibt es keine zweite Gruppe.
export function galleryOrder(designs,theme){
 const id=normalizeId(theme);
 // Chris 05.11., #85/6658238343: Neue-Struktur originals precede even bestsellers.
 const byBestseller=list=>[...list].sort((a,b)=>(b.katalog?.prio===1)-(a.katalog?.prio===1)||(b.bestseller===true)-(a.bestseller===true));
 const all=Array.isArray(designs)?designs.filter(Boolean):[];
 if(!id)return {theme:null,primary:byBestseller(all).map(d=>d.id),more:[]};
 const primary=all.filter(d=>{const themes=designThemes(d);return !themes.length||themes.includes(id);});
 const more=all.filter(d=>!primary.includes(d));
 return {theme:id,primary:byBestseller(primary).map(d=>d.id),more:byBestseller(more).map(d=>d.id)};
}
// Motivkategorien des Themas zuerst, danach die übrigen in der vorhandenen Reihenfolge.
export function orderMotifCategories(categories,theme){
 const wanted=(Array.isArray(theme?.motifCategories)?theme.motifCategories:[]).map(c=>String(c??'').trim()).filter(Boolean);
 const list=(Array.isArray(categories)?categories:[]).map(c=>String(c??''));
 const lower=s=>s.toLocaleLowerCase('de');
 const first=wanted.flatMap(w=>list.filter(c=>lower(c)===lower(w)));
 return [...new Set([...first,...list])];
}
export {inThemeCategory};
// Kundentexte, die vom Mustertext der aktuellen Vorlage abweichen (gleiche Regel wie der Designwechsel).
export function customerTexts(objects,template){
 // Chris 21.10.2026: nur geänderte Namen und Lebensdaten (Sprüche bleiben beim Design).
 return changedCustomerTexts(objects,template).filter(o=>o.fieldKey);
}
export const thumbnailSignature=source=>JSON.stringify(source.map(o=>[o.fieldKey,o.text]));
// Miniatur eines anderen Designs mit dem aktuellen Kundentext (Textübernahme wie beim
// Designwechsel, nur per Feldschlüssel). `measure(o)` misst geänderte Texte neu; das
// Original bleibt unverändert, nicht übertragbare Texte werden nicht erzwungen.
export function thumbnailDesign(design,source,measure=()=>{}){
 if(!source?.length)return design;
 const copy=structuredClone(design);
 const before=new Map(copy.objects.filter(o=>o.type==='text').map(o=>[o.id,o.text]));
 transferTexts(source,copy.objects);
 let changed=false;
 for(const o of copy.objects)if(o.type==='text'&&before.get(o.id)!==o.text){changed=true;try{measure(o);}catch{}}
 return changed?copy:design;
}
// Direktlink-Text: nur Text, keine Steuerzeichen, Zeilenumbrüche normalisiert, Obergrenze des Vertrags.
export function sanitizeLinkText(value){
 if(typeof value!=='string')return null;
 const text=value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,'').trim();
 if(!text)return null;
 const chars=[...text];
 return chars.length>TEXT_LIMIT_RANGES.maxLength[1]?chars.slice(0,TEXT_LIMIT_RANGES.maxLength[1]).join(''):text;
}
const sizeGroup=profile=>(profile?.optionGroups||[]).find(g=>g.id==='size');
// Größe aus dem Link: Größen-ID oder SKU der Größenoption (genau, sonst ohne Groß/Klein).
export function resolveLinkSize(profile,value){
 const group=sizeGroup(profile);const wanted=String(value??'').trim();
 if(!group||!wanted)return null;
 const match=group.values.find(v=>v.id===wanted||v.sku===wanted)||group.values.find(v=>String(v.id).toLowerCase()===wanted.toLowerCase()||String(v.sku??'').toLowerCase()===wanted.toLowerCase());
 return match?.id??null;
}
// `?design=<design-id>&size=<sku-oder-größen-id>&text=<Name>`: ungültige Werte werden
// ignoriert und als Hinweis gemeldet, nie als Fehler.
export function parseDirectLink(query,profile){
 const params=query instanceof URLSearchParams?query:new URLSearchParams(typeof query==='string'?query:'');
 const result={designId:null,sizeId:null,text:null,notes:[],present:DIRECT_LINK_PARAMS.some(k=>params.has(k))};
 const design=params.get('design');
 if(design!==null){const wanted=design.trim();const found=(profile?.designs||[]).find(d=>d.id===wanted)||(profile?.designs||[]).find(d=>String(d.id).toLowerCase()===wanted.toLowerCase());if(found)result.designId=found.id;else result.notes.push('Das verlinkte Design ist für dieses Produkt nicht verfügbar.');}
 const size=params.get('size');
 if(size!==null){const id=resolveLinkSize(profile,size);if(id)result.sizeId=id;else result.notes.push('Die verlinkte Größe ist für dieses Produkt nicht verfügbar.');}
 const text=params.get('text');
 if(text!==null){result.text=sanitizeLinkText(text);if(!result.text)result.notes.push('Der verlinkte Text ist leer und wurde nicht übernommen.');}
 return result;
}
// Zielfeld für den Link-Text: erstes Pflichtfeld, sonst erstes bearbeitbares Namens-/Textfeld.
export function linkTextTarget(objects,design){
 const texts=(objects||[]).filter(o=>o.type==='text'&&!o.uxHidden&&!o.technicalLocked&&o.customerEditable!==false);
 const template=id=>design?.objects?.find(t=>t.id===id&&t.type==='text');
 return texts.find(o=>template(o.id)?.required===true)||texts.find(o=>['name','names','heading'].includes(o.fieldKey))||texts[0]||null;
}
// Übernimmt den Text in das Zielfeld; Zeichen- und Zeilenlimit der Vorlage gelten (K1).
export function applyLinkText(objects,design,profile,text,config){
 const target=linkTextTarget(objects,design);const clean=sanitizeLinkText(text);
 if(!target||!clean)return null;
 const template=design?.objects?.find(t=>t.id===target.id&&t.type==='text'),limits=textLimits(template,design,profile,config);
 const lines=clean.split('\n').slice(0,limits.maxLines).join('\n');
 const next=clampText(lines,limits,'');
 if(!next.trim())return null;
 target.text=next;target.uxCustomerText=true;
 return {id:target.id,text:next,truncated:next!==clean};
}
// Direktlink ohne Kundentext für „Link zu diesem Design“.
export function designLink(href,{designId,sizeId=null}={}){
 const url=new URL(href,'http://localhost/');
 for(const key of DIRECT_LINK_PARAMS)url.searchParams.delete(key);
 if(designId)url.searchParams.set('design',designId);
 if(sizeId)url.searchParams.set('size',sizeId);
 return url.href;
}
export function withoutDirectLinkParams(href){
 const url=new URL(href,'http://localhost/');
 if(!DIRECT_LINK_PARAMS.some(k=>url.searchParams.has(k)))return null;
 for(const key of DIRECT_LINK_PARAMS)url.searchParams.delete(key);
 return url.href;
}

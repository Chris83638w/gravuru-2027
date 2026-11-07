// Ladezeit-Regeln des Kundeneditors (ohne DOM, in Node prüfbar).
// Beim Start werden nur Schriften und Bibliotheksmotive geladen, die ein Design des aktiven
// Produkts verwendet (die Galerie zeichnet alle Designs des Produkts). Weitere Schriften lädt
// die Schriftauswahl bzw. „Text hinzufügen“, die Motivbibliothek der Reiter „Motive“,
// Entwürfe (Sitzungsschutz, Kundenkonto, Warenkorb) vor dem Einlesen genau ihre Ressourcen.
import {isLayeredDoorbell} from './product-model-module.mjs';
import {isBrowserResourceUrl} from './browser-model-resources.mjs';
export const LAZY_BASE='/_runtime/lazy/';
export const LAZY_MOTIF_KEY=/^[A-Za-z0-9_-]{1,80}$/;

export function fontFileName(name){
  const slug=String(name).normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!slug)throw Error('Ungültiger Schriftname: '+name);
  return slug+'.json';
}

const objectsOf=design=>Array.isArray(design?.objects)?design.objects:[];

// Schriften und Motive, die Objekte verwenden; `local` (Produktressourcen) und Grundmotive sind schon da.
export function resourceNeeds(objects,{localFonts=[],localMotifs=[],baseMotifs=[]}={}){
  const fonts=new Set(),motifs=new Set(),skipFonts=new Set(localFonts),skipMotifs=new Set([...localMotifs,...baseMotifs]);
  for(const o of objects||[]){
    if(o?.type==='text'&&typeof o.font==='string'&&!skipFonts.has(o.font))fonts.add(o.font);
    if(o?.type==='motif'&&typeof o.motif==='string'&&!skipMotifs.has(o.motif)&&!o.motif.startsWith('ux-line-'))motifs.add(o.motif);
  }
  return {fonts:[...fonts],motifs:[...motifs]};
}

export function startNeeds(config,{baseMotifs=[]}={}){
  const local=config?.localResources;
  const designs=config?.profile?.designs||[];
  const initial=isLayeredDoorbell(config)?[designs.find(d=>d.id===config.profile.defaultDesignId)||designs[0]].filter(Boolean):designs;
  return resourceNeeds(initial.flatMap(objectsOf),{localFonts:Object.keys(local?.fonts||{}),localMotifs:(local?.motifs||[]).map(m=>m.key),baseMotifs});
}

export function draftNeeds(draft,options){return resourceNeeds(objectsOf(draft?.design),options);}

// Produktschriften (Shop-Einstieg, Chris 27.10.2026): eigene Schriften eines Produkts, die kein Design zum Start
// braucht, liefert der Server nicht mehr im Modell, sondern als inhaltsadressierte Datei auf dem eigenen Host.
export const PRODUCT_FONT_URL=/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/schriften\/[a-f0-9]{64}\.json$/;
export function productFontIndex(config){
  const list=config?.localResources?.lazyFonts;
  if(list===undefined)return [];
  if(!Array.isArray(list)||list.length>64)throw Error('Nachladbare Produktschriften ungültig.');
  return list.map(f=>{
    if(!f||typeof f.name!=='string'||!f.name.trim()||f.name.length>120||!PRODUCT_FONT_URL.test(f.url||''))throw Error('Nachladbare Produktschrift ungültig.');
    return {name:f.name,url:f.url,...(typeof f.label==='string'?{label:f.label}:{}),...(typeof f.category==='string'?{category:f.category}:{})};
  });
}
// Shared private product payloads stay demand-loaded. Explicit font selection,
// current product designs and draft restoration still use the complete index.
export function prefetchFontNames(fontIndex,{names=null}={}){
  return fontIndex.filter(f=>!isBrowserResourceUrl(f.url)&&(!names||names.includes(f.name))).map(f=>f.name);
}
// Nur bekannte Namen werden angefragt; unbekannte meldet der Entwurfsprüfer wie bisher.
export function lazyUrls({fonts=[],motifs=[]},{fontIndex=[],motifIndex=[]},base=LAZY_BASE){
  const fontFiles=new Map(fontIndex.map(f=>[f.name,typeof f.url==='string'&&PRODUCT_FONT_URL.test(f.url)?f.url:typeof f.file==='string'?base+'schriften/'+encodeURIComponent(f.file):null]).filter(([,url])=>url)),motifKeys=new Set(motifIndex.map(m=>m.key));
  return {
    fonts:fonts.filter(n=>fontFiles.has(n)).map(name=>({name,url:fontFiles.get(name)})),
    motifs:motifs.filter(k=>motifKeys.has(k)&&LAZY_MOTIF_KEY.test(k)).map(key=>({key,url:base+'motive/'+key+'.json'}))
  };
}
export const motifLibraryUrl=(base=LAZY_BASE)=>base+'motive-alle.json';
export const coreCatalogUrl=(base=LAZY_BASE)=>base+'katalog-kern.json';

// Motivliste in Bibliotheksreihenfolge: geladene Einträge vollständig, übrige nur mit Name/Kategorie.
export function libraryEntries(motifIndex,loaded){
  const byKey=new Map((loaded||[]).map(m=>[m.key,m]));
  return motifIndex.map(i=>byKey.get(i.key)||{key:i.key,name:i.name,category:i.category});
}

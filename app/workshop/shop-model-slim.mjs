// Schlankes Kundenmodell für den Shop-Einstieg (Chris 27.10.2026: „prüfe alles“, Konfigurator schneller öffnen).
// Gemessen: 11,2 MB Modell, davon 9,3 MB eigene Schriften und 1,9 MB Rohlingbild als PNG.
// 1. Eigene Schriften, die bytegleich (Normal- und Fettschnitt) im Schriftenkatalog des ausgelieferten Editors
//    liegen, entfallen aus dem Modell: Der Editor kennt sie über den Katalog-Index und lädt sie bei Bedarf
//    nach (Startdesign sofort, übrige bei Auswahl). Die Server-Prüfung nutzt weiter die gespeicherte Konfiguration.
// 2. Übrige eigene Schriften, die nirgends im Modell als `font` vorkommen (Designs, Formate, Vorgaben), kommen als
//    inhaltsadressierte Datei (`fontUrl(hash)`, vom Shop-Einstieg ausgeliefert) und stehen nur im Nachlade-Index
//    `lazyFonts`. Gleichnamige, aber abweichende Katalogschriften bleiben eingebettet (sonst gewänne im Editor der Katalog).
//    Verdrängte Dateien liefert `fontFile` aus dem gespeicherten Modell nach (`source`, Hash wird geprüft).
// 3. Rohlingbilder, zu denen im Repo eine gleichnamige WebP-Fassung liegt, werden durch diese ersetzt (nur Vorschau).
// Ohne geladenen Katalog oder bei jedem Fehler bleibt das Modell unverändert.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';

const FONT_FILE=/^[a-z0-9-]{1,80}\.json$/;
export const fontKey=font=>JSON.stringify([font?.regular??null,font?.bold??null]);

export function surfaceSwapsFrom(directory){
 const swaps=new Map();
 let names=[];try{names=fs.readdirSync(directory);}catch{return swaps;}
 for(const name of names.filter(n=>n.endsWith('.png'))){
  const webp=name.replace(/\.png$/,'.webp');if(!names.includes(webp))continue;
  try{swaps.set('data:image/png;base64,'+fs.readFileSync(path.join(directory,name)).toString('base64'),'data:image/webp;base64,'+fs.readFileSync(path.join(directory,webp)).toString('base64'));}catch{}
 }
 return swaps;
}
export const DEFAULT_SURFACE_DIR=path.join(path.dirname(fileURLToPath(import.meta.url)),'../designs/aosu-labrador/runtime/images');

// Alle Schriftnamen, die das Modell außerhalb der Ressourcen als `font` nennt (Designs, Funkklingel-Formate,
// Vorgaben …). Großzügig: lieber eine Schrift zu viel eingebettet als eine fehlende beim Start.
export function designFontNames(universal){
 const names=new Set(),stack=[];
 for(const [key,value] of Object.entries(universal&&typeof universal==='object'?universal:{}))if(key!=='localResources'&&key!=='materialSurface')stack.push(value);
 while(stack.length){
  const value=stack.pop();
  if(!value||typeof value!=='object')continue;
  if(Array.isArray(value)){for(const item of value)stack.push(item);continue;}
  for(const [key,item] of Object.entries(value)){if(key==='font'&&typeof item==='string')names.add(item);else if(item&&typeof item==='object')stack.push(item);}
 }
 return names;
}
const hashOf=body=>createHash('sha256').update(body).digest('hex');
export function createModelSlimmer({fetchJson=null,surfaceSwaps=new Map(),cacheSize=16,fontUrl=null,maxFontFiles=1024,maxFontBytes=96*1024*1024,maxSources=4096}={}){
 let catalog=null,loading=null,fontBytes=0;
 const decisions=new Map(),fontFiles=new Map(),sources=new Map();
 function remember(body,hash=hashOf(body)){
  if(fontFiles.has(hash)){fontBytes-=fontFiles.get(hash).length;fontFiles.delete(hash);}
  fontFiles.set(hash,body);fontBytes+=body.length;
  while(fontFiles.size>1&&(fontFiles.size>maxFontFiles||fontBytes>maxFontBytes)){const [old,bytes]=fontFiles.entries().next().value;fontFiles.delete(old);fontBytes-=bytes.length;}
  return hash;
 }
 function note(entries,source){
  if(typeof source!=='function')return;
  for(const e of entries){sources.delete(e.hash);sources.set(e.hash,{source,name:e.name});}
  while(sources.size>maxSources)sources.delete(sources.keys().next().value);
 }
 // Datei zum Hash: aus dem Speicher (zuletzt genutzt bleibt) oder aus dem gespeicherten Modell neu abgeleitet.
 function fontFile(hash){
  const hit=fontFiles.get(hash);if(hit){fontFiles.delete(hash);fontFiles.set(hash,hit);return hit;}
  const origin=sources.get(hash);if(!origin)return null;
  try{
   const font=origin.source()?.[origin.name];if(!font||typeof font!=='object')return null;
   const body=Buffer.from(JSON.stringify(font));if(hashOf(body)!==hash)return null;
   remember(body,hash);return body;
  }catch{return null;}
 }
 // Ungenutzte eigene Schriften als Datei ablegen; Ergebnis: Einträge für den Nachlade-Index.
 function defer(key,fonts,universal,source,all=false){
  const cached=key?decisions.get(key)?.defer:null;
  if(cached&&cached.every(e=>fontFiles.has(e.hash))){note(cached,source);return cached;}
  const used=designFontNames(universal),entries=[];
  for(const [name,font] of Object.entries(fonts)){
   if((!all&&(used.has(name)||catalog.has(name)))||!font||typeof font!=='object')continue;
   const hash=remember(Buffer.from(JSON.stringify(font)));
   entries.push({name,hash,...(typeof font.label==='string'?{label:font.label}:{}),...(typeof font.category==='string'?{category:font.category}:{})});
  }
  if(key){const d=decisions.get(key)||{};d.defer=entries;decisions.set(key,d);}
  note(entries,source);
  return entries;
 }
 async function load(){
  if(catalog||typeof fetchJson!=='function')return catalog;
  loading??=(async()=>{
   const core=await fetchJson('/_acryl-runtime/lazy/katalog-kern.json');const map=new Map();
   for(const entry of Array.isArray(core?.font_index)?core.font_index:[]){
    if(typeof entry?.name!=='string'||!FONT_FILE.test(entry?.file||''))continue;
    try{map.set(entry.name,fontKey(await fetchJson('/_acryl-runtime/lazy/schriften/'+entry.file)));}catch{}
   }
   catalog=map;return map;
  })().catch(()=>{loading=null;return null;});
  return loading;
 }
 // Entscheidung je fester Produktrevision einmal treffen (der Vergleich serialisiert die Schriften).
 function removable(key,fonts){
  if(key&&decisions.get(key)?.remove){const hit=decisions.get(key);decisions.delete(key);decisions.set(key,hit);return hit.remove;}
  const names=Object.entries(fonts).filter(([name,font])=>catalog.has(name)&&catalog.get(name)===fontKey(font)).map(([name])=>name);
  if(key){decisions.set(key,{...(decisions.get(key)||{}),remove:names});while(decisions.size>cacheSize)decisions.delete(decisions.keys().next().value);}
  return names;
 }
 // Verändert die übergebene (bereits kopierte) Modellstruktur und meldet, was entfiel.
 function slim(universal,{key=null,source=null,deferAll=false}={}){
  const report={fonts:[],deferred:[],surface:false};
  try{
   const fonts=universal?.localResources?.fonts;
   if(!deferAll&&catalog&&fonts&&typeof fonts==='object')for(const name of removable(key,fonts)){delete fonts[name];report.fonts.push(name);}
   if((catalog||deferAll)&&typeof fontUrl==='function'&&fonts&&typeof fonts==='object'&&universal.localResources.lazyFonts===undefined){
    const entries=defer(key,fonts,universal,source,deferAll);
    if(entries.length){
     universal.localResources.lazyFonts=entries.map(({name,hash,label,category})=>({name,url:fontUrl(hash),...(label?{label}:{}),...(category?{category}:{})}));
     for(const e of entries){delete fonts[e.name];report.deferred.push(e.name);}
    }
   }
   const surface=universal?.materialSurface;
   if(typeof surface==='string'&&surfaceSwaps.has(surface)){universal.materialSurface=surfaceSwaps.get(surface);report.surface=true;}
  }catch{}
  return report;
 }
 return {load,slim,ready:()=>!!catalog,fontFile};
}

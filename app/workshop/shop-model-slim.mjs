// Schlankes Kundenmodell für den Shop-Einstieg (Chris 27.10.2026: „prüfe alles“, Konfigurator schneller öffnen).
// Gemessen: 11,2 MB Modell, davon 9,3 MB eigene Schriften und 1,9 MB Rohlingbild als PNG.
// 1. Eigene Schriften, die bytegleich (Normal- und Fettschnitt) im Schriftenkatalog des ausgelieferten Editors
//    liegen, entfallen aus dem Modell: Der Editor kennt sie über den Katalog-Index und lädt sie bei Bedarf
//    nach (Startdesign sofort, übrige bei Auswahl). Die Server-Prüfung nutzt weiter die gespeicherte Konfiguration.
// 2. Rohlingbilder, zu denen im Repo eine gleichnamige WebP-Fassung liegt, werden durch diese ersetzt (nur Vorschau).
// Ohne geladenen Katalog oder bei jedem Fehler bleibt das Modell unverändert.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';

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

export function createModelSlimmer({fetchJson=null,surfaceSwaps=new Map(),cacheSize=16}={}){
 let catalog=null,loading=null;
 const decisions=new Map();
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
  if(key&&decisions.has(key)){const hit=decisions.get(key);decisions.delete(key);decisions.set(key,hit);return hit;}
  const names=Object.entries(fonts).filter(([name,font])=>catalog.has(name)&&catalog.get(name)===fontKey(font)).map(([name])=>name);
  if(key){decisions.set(key,names);while(decisions.size>cacheSize)decisions.delete(decisions.keys().next().value);}
  return names;
 }
 // Verändert die übergebene (bereits kopierte) Modellstruktur und meldet, was entfiel.
 function slim(universal,{key=null}={}){
  const report={fonts:[],surface:false};
  try{
   const fonts=universal?.localResources?.fonts;
   if(catalog&&fonts&&typeof fonts==='object')for(const name of removable(key,fonts)){delete fonts[name];report.fonts.push(name);}
   const surface=universal?.materialSurface;
   if(typeof surface==='string'&&surfaceSwaps.has(surface)){universal.materialSurface=surfaceSwaps.get(surface);report.surface=true;}
  }catch{}
  return report;
 }
 return {load,slim,ready:()=>!!catalog};
}

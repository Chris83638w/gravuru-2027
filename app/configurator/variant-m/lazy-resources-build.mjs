// Ladezeit: zerlegt die geprüften Laufzeitpakete (Katalog, Schriften, Motive) beim Build in
// einzeln ladbare Dateien unter `<ausgabe>/lazy/`. Die Quellen in designs/aosu-labrador/runtime
// bleiben unverändert (Prüfsummen in RESOURCE-INVENTORY.json); die Teile sind reine Ableitungen.
//   katalog-kern.json      Katalog ohne Schriftkonturen (Designvorschaubilder entfernt) + Schrift- und Motivindex
//   schriften/<datei>.json eine Schriftfamilie (Konturen regular/bold)
//   motive/<schlüssel>.json ein Bibliotheksmotiv (für Designs, die es verwenden)
//   motive-alle.json       alle Bibliotheksmotive (erst beim Öffnen des Reiters „Motive“)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {fontFileName,LAZY_MOTIF_KEY} from './lazy-resources-model.mjs';

// Dieselbe Zuordnung setzt der Altpfad des Editors (editor-source.html) für die sechs Grundschriften.
export const BASE_FONT_CATEGORIES={'Montserrat':'Schlicht & modern','Ubuntu':'Schlicht & modern','Lora':'Klassisch & elegant','Lora Italic':'Klassisch & elegant','Dancing Script':'Geschwungen & festlich','Source Code Pro':'Schreibmaschine'};
export const EXPECTED={fonts:30,motifs:703,baseMotifs:18};

const readText=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8');
const gunzipBase64=text=>JSON.parse(zlib.gunzipSync(Buffer.from(text,'base64')).toString('utf8'));

export function readRuntimeBundles(runtimeDir,urls){
  const file=url=>url.split('/').pop();
  const base=JSON.parse(readText(runtimeDir,file(urls.catalog)));
  const catalog=base.format==='gravuru-catalog-parts-v1'?JSON.parse(base.parts.map(p=>readText(runtimeDir,file(p))).join('')):base;
  const extraFonts=gunzipBase64(urls.fonts.map(u=>readText(runtimeDir,file(u))).join(''));
  const motifs=gunzipBase64(urls.parts.map(u=>readText(runtimeDir,file(u))).join(''));
  return {catalog,extraFonts,motifs};
}

export function splitRuntimeBundles({catalog,extraFonts,motifs}){
  const fonts={...structuredClone(catalog.fonts),...extraFonts};
  for(const [name,category] of Object.entries(BASE_FONT_CATEGORIES)){if(!fonts[name])throw Error('Grundschrift fehlt: '+name);fonts[name].category=category;}
  if(Object.keys(fonts).length!==EXPECTED.fonts)throw Error('Schriftbibliothek unvollständig');
  if(motifs.length!==EXPECTED.motifs||Object.keys(catalog.motifs).length!==EXPECTED.baseMotifs)throw Error('Motivbibliothek unvollständig');
  const files=new Set();
  const fontIndex=Object.entries(fonts).map(([name,font])=>{
    const file=fontFileName(name);if(files.has(file))throw Error('Schriftdateiname doppelt: '+file);files.add(file);
    if(!font.regular?.glyphs)throw Error('Schrift ohne Konturen: '+name);
    return {name,label:font.label||name,category:font.category||null,hasBold:font.hasBold===false?false:!!font.bold,file};
  });
  const keys=new Set();
  for(const m of motifs){if(!LAZY_MOTIF_KEY.test(m.key)||keys.has(m.key)||typeof m.svgFragment!=='string')throw Error('Ungültiges Bibliotheksmotiv: '+m.key);keys.add(m.key);}
  // Die Vorschaubilder der Alt-Designs (je ~68 KB) zeigt nur die ausgeblendete Altvorlagenleiste;
  // der Editor setzt fehlende Vorschauen bereits ohne Bild um (build.mjs).
  const {fonts:_outlines,designs,...rest}=catalog;
  const core={...structuredClone(rest),fonts:{},designs:designs.map(({preview:_preview,...design})=>structuredClone(design)),
    font_index:fontIndex,motif_index:motifs.map(({key,name,category})=>({key,name,category}))};
  return {core,fonts,motifs};
}

// Version der Zerlegung; bei Änderung des Ausgabeformats erhöhen.
export const LAZY_FORMAT='gravuru-lazy-runtime/v1';
const writeAtomic=(target,data)=>{const temp=target+'.'+process.pid+'-'+Math.random().toString(36).slice(2)+'.tmp';fs.writeFileSync(temp,data);fs.renameSync(temp,target);};

// Schreibt die Teile in ein gemeinsames Verzeichnis (unabhängig vom Build-Ausgabeordner der Tests).
// Ein Stempel (Format + SHA-256 der Quellpakete) überspringt unveränderte Läufe; Dateien werden
// atomar ersetzt, damit parallele Builds/Server nie halbe Dateien lesen.
export function writeLazyResources(dir,runtimeDir,urls){
  const hash=createHash('sha256').update(LAZY_FORMAT);
  for(const url of [urls.catalog,...urls.fonts,...urls.parts])hash.update(fs.readFileSync(path.join(runtimeDir,url.split('/').pop())));
  const base=JSON.parse(readText(runtimeDir,urls.catalog.split('/').pop()));
  for(const p of base.parts||[])hash.update(fs.readFileSync(path.join(runtimeDir,p.split('/').pop())));
  const stamp=hash.digest('hex'),stampFile=path.join(dir,'stempel.json');
  try{const known=JSON.parse(fs.readFileSync(stampFile,'utf8'));if(known.stamp===stamp)return {...known.summary,cached:true};}catch{}
  const parts=splitRuntimeBundles(readRuntimeBundles(runtimeDir,urls));
  fs.mkdirSync(path.join(dir,'schriften'),{recursive:true});fs.mkdirSync(path.join(dir,'motive'),{recursive:true});
  let bytes=0;
  const write=(name,value)=>{const data=Buffer.from(JSON.stringify(value));bytes+=data.length;writeAtomic(path.join(dir,name),data);};
  write('katalog-kern.json',parts.core);
  for(const entry of parts.core.font_index)write('schriften/'+entry.file,parts.fonts[entry.name]);
  for(const m of parts.motifs)write('motive/'+m.key+'.json',m);
  write('motive-alle.json',parts.motifs);
  const summary={fonts:parts.core.font_index.length,motifs:parts.motifs.length,bytes};
  writeAtomic(stampFile,JSON.stringify({format:LAZY_FORMAT,stamp,summary}));
  return {...summary,cached:false};
}

// Editor-Anpassungen für das Nachladen (auf den fertig umgeschriebenen Editorquelltext angewandt,
// d. h. nach den Bild-URL-Ersetzungen in build.mjs). Jeder Anker muss genau einmal vorkommen.
export function patchEditorLoading(source){
  const once=(from,to)=>{if(source.split(from).length!==2)throw Error('Ladezeit-Anker ist nicht eindeutig: '+from.slice(0,90));source=source.replace(from,()=>to);};
  const between=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0||source.indexOf(start,a+1)>=0)throw Error('Ladezeit-Block nicht eindeutig: '+start.slice(0,60));return source.slice(a,b+end.length);};
  // 1. Start: im Produktmodus (UniversalConfig) Kernkatalog + benötigte Schriften/Motive statt aller Pakete.
  const bundles=between("const base=JSON.parse(await fetchText(urls.catalog));","throw Error('Motivbibliothek unvollständig');");
  once(bundles,"if(window.parent.UniversalConfig){window.GravuruLazyResources=await import('/configurator/variant-m/lazy-resources.mjs');({catalog,entries}=await window.GravuruLazyResources.loadStart(window.parent.UniversalConfig));}else{"+bundles+"}");
  // 2. Schraubenkopf nur bei sichtbarer Schraubbefestigung (Altpfad: weiterhin vor dem Start).
  const screw=between("const screwResponse=await fetch(","window.FunkklingelScrew=screwCanvas.toDataURL('image/png');");
  once(screw,"if(!window.parent.UniversalConfig)await ensureScrew();");
  once("let catalog,entries,screwImage,sequence=0;","let catalog,entries,screwImage,sequence=0,screwLoad=null;const ensureScrew=()=>screwLoad??=(async()=>{"+screw.replace('/_runtime/images/gravuru-schraubenkopf-fotorealistisch.png','/_runtime/images/gravuru-schraubenkopf-fotorealistisch.webp')+"})().catch(error=>{screwLoad=null;throw error;});");
  once("if(!preview||!['B02S','B04S'].includes(this.state.mountingKey))return body;","if(!preview||!['B02S','B04S'].includes(this.state.mountingKey))return body;if(!screwImage){ensureScrew().then(()=>this.sync()).catch(()=>{});return body;}");
  // 3. Edelstahloberfläche des Altpfads nicht im Produktmodus (dort zeichnet material-surface.mjs).
  once('if(cfg?.assignment?.schemaVersion===2&&!this.materialData)try{','if(cfg?.assignment?.schemaVersion===2&&!this.materialData&&!window.parent.UniversalConfig)try{');
  once('/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png','/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.webp');
  // 4. Motive ohne geladene Kontur stehen nur mit Name/Kategorie in der Liste; Nachlader anhängen.
  once('for(const e of entries){el.motifs[e.key]=e.svgFragment;el.catalog.motifs[e.key]=e.svgFragment;el.catalog.motif_bounds[e.key]=e.bounds;el.labels[e.key]=e.name;}',
    "for(const e of entries){el.labels[e.key]=e.name;if(typeof e.svgFragment!=='string')continue;el.motifs[e.key]=e.svgFragment;el.catalog.motifs[e.key]=e.svgFragment;el.catalog.motif_bounds[e.key]=e.bounds;}window.GravuruLazyResources?.attach(el,{catalog,entries,prepare:prepareMotifGeometry});");
  const best=between("bestsellers.querySelector('[data-bestseller-grid]').innerHTML=popular.map(","}).join('');");
  once(best,'const renderBestsellers=()=>{'+best.replace("'+el.motifs[key]+'","'+(el.motifs[key]||'')+'")+'};renderBestsellers();');
  once("'+el.motifs[e.key]+'","'+(el.motifs[e.key]||'')+'");
  once("panel.querySelector('[data-library-less]').addEventListener('click',()=>{visibleCount=6;render();search.focus();});render();",
    "panel.querySelector('[data-library-less]').addEventListener('click',()=>{visibleCount=6;render();search.focus();});render();el.uxLibraryRefresh=()=>{renderBestsellers();render();};");
  // 5. Alte Schriftauswahl: nach dem Nachladen neu aufbauen; beim Öffnen alle Schriften laden.
  once("filter.addEventListener('change',choices);","filter.addEventListener('change',choices);el.uxFontChoicesRefresh=choices;root.addEventListener('focusin',event=>{if(event.target.matches('[data-prop=\"font\"],[data-font-category]'))el.uxEnsureAllFonts?.().catch(()=>{});});");
  return source;
}

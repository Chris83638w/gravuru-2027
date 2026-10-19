// K12 / B1: Die Werkstatt liest Familien, Linien, Themen, Schriften, Motive und
// Designs aus dem Katalog-Repo (`gravuru-katalog`, Issue #5) statt aus
// `app/designs/`. Dieses Modul liest nur; es schreibt nie in den Katalog.
// Pfad: Argument `--katalog=<pfad>` am Server bzw. Umgebung `GRAVURU_KATALOG`.
// Fehler sind deutsch und nennen die Datei. Unbekanntes bleibt `null` (offen).
import fs from 'node:fs';
import path from 'node:path';
import {validateFamily} from './product-families.mjs';
import {parseThemeCatalog,findTheme} from './theme-catalog.mjs';

export const LINE_SCHEMA='gravuru-line/v2';
export const FONT_SET_ALWAYS=Object.freeze(['Michroma','Lato']);// Katalogregel 11: in jedem Schrift-Set
const fail=(file,message)=>{throw Object.assign(Error(file+': '+message),{status:422,code:'katalog_invalid',file});};
const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(v);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

export function katalogPath({argv=process.argv,env=process.env}={}){
 const arg=argv.find(v=>v.startsWith('--katalog='))?.slice('--katalog='.length);
 const value=arg||env.GRAVURU_KATALOG||'';
 return value.trim()?path.resolve(value.trim()):null;
}
function readJson(file){
 let raw;
 try{raw=fs.readFileSync(file,'utf8').replace(/^﻿/,'');}catch{fail(file,'Datei nicht lesbar.');}
 try{return JSON.parse(raw);}catch(e){fail(file,'kein gültiges JSON ('+e.message+').');}
}
const exists=file=>{try{return fs.statSync(file).isFile();}catch{return false;}};
const isDir=dir=>{try{return fs.statSync(dir).isDirectory();}catch{return false;}};
const listDirs=dir=>isDir(dir)?fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort():[];
const listFiles=(dir,ext)=>isDir(dir)?fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith(ext)).sort():[];

// Linie (`linien/<linie>.json`, Schema gravuru-line/v2): physisches Produkt mit
// Familien und Unterkategorien (Thema, Schrift-Set, Preisüberschreibungen).
export function validateLine(line,{families,themes,fontSets,file='linie'}={}){
 if(!record(line))fail(file,'Linie fehlt.');
 if(line.schema!==LINE_SCHEMA)fail(file,'unbekanntes Linienformat „'+line.schema+'“ (erwartet '+LINE_SCHEMA+').');
 if(!id(line.id)||!text(line.name,160))fail(file,'Linie braucht Kennung und Namen.');
 // Leere Familienliste = Familie noch offen (Status „Familie offen“); der Import meldet das.
 if(!Array.isArray(line.families)||line.families.some(f=>!id(f)))fail(file,'Linie „'+line.id+'“: families ist eine Liste von Familien-Kennungen.');
 for(const f of line.families)if(families&&!families.has(f))fail(file,'Linie „'+line.id+'“ verweist auf die unbekannte Familie „'+f+'“.');
 if(line.status!==undefined&&typeof line.status!=='string')fail(file,'Status der Linie prüfen.');
 if(!Array.isArray(line.subcategories)||line.subcategories.length>100)fail(file,'Linie „'+line.id+'“: höchstens 100 Unterkategorien.');
 const seen=new Set();
 for(const s of line.subcategories){
  if(!record(s)||!id(s.id)||!text(s.name,160))fail(file,'Unterkategorie ohne Kennung oder Namen in Linie „'+line.id+'“.');
  if(seen.has(s.id))fail(file,'Unterkategorie „'+s.id+'“ doppelt in Linie „'+line.id+'“.');seen.add(s.id);
  if(s.themeId!==null&&s.themeId!==undefined){if(!id(s.themeId))fail(file,'Unterkategorie „'+s.id+'“: ungültige Themen-Kennung.');if(themes&&!findTheme(themes,s.themeId))fail(file,'Unterkategorie „'+s.id+'“ verweist auf das unbekannte Thema „'+s.themeId+'“.');}
  if(s.fontSet!==null&&s.fontSet!==undefined){if(!id(s.fontSet))fail(file,'Unterkategorie „'+s.id+'“: ungültiges Schrift-Set.');if(fontSets&&!fontSets.has(s.fontSet))fail(file,'Unterkategorie „'+s.id+'“ verweist auf das unbekannte Schrift-Set „'+s.fontSet+'“.');}
  const o=s.priceOverrides??{};
  if(!record(o)||Object.keys(o).some(k=>!['sizes','mounting','options'].includes(k)))fail(file,'Unterkategorie „'+s.id+'“: priceOverrides kennt nur sizes, mounting, options.');
  for(const [group,values] of Object.entries(o)){if(!record(values))fail(file,'Unterkategorie „'+s.id+'“: priceOverrides.'+group+' ist eine Zuordnung Kennung → Cent.');for(const [k,v] of Object.entries(values))if(v!==null&&!(Number.isSafeInteger(v)&&v>=0))fail(file,'Unterkategorie „'+s.id+'“: Preis '+group+'/'+k+' in ganzen Cent oder null.');}
  if(s.sizesOffered!==null&&s.sizesOffered!==undefined&&(!Array.isArray(s.sizesOffered)||s.sizesOffered.some(k=>!id(k))))fail(file,'Unterkategorie „'+s.id+'“: sizesOffered ist null oder eine Liste von Größen-Schlüsseln.');
  if(s.options!==null&&s.options!==undefined&&(!Array.isArray(s.options)||s.options.some(k=>!id(k))))fail(file,'Unterkategorie „'+s.id+'“: options ist null oder eine Liste von Optionsgruppen.');
  if(s.collectionHandle!==null&&s.collectionHandle!==undefined&&!text(s.collectionHandle,200))fail(file,'Unterkategorie „'+s.id+'“: collectionHandle prüfen.');
 }
 return line;
}

// Schriften: Metadaten aus `schriften/schriften.json`, Sets aus `schriften/sets.json`
// (gleicher Inhalt wie `sets.xlsx`, das Chris ändert). Dateien unter `schriften/dateien/`
// werden nur als Pfad geführt; Glyphen entstehen erst über `fontResources()`.
function readFonts(root){
 const file=path.join(root,'schriften','schriften.json');
 const fonts=new Map();
 if(exists(file)){
  const data=readJson(file);
  if(!Array.isArray(data.fonts))fail(file,'erwartet {fonts:[…]}.');
  for(const f of data.fonts){
   if(!record(f)||!text(f.name,120))fail(file,'Schrift ohne Namen.');
   if(fonts.has(f.name))fail(file,'Schrift „'+f.name+'“ doppelt.');
   const rel=typeof f.file==='string'&&f.file.trim()?f.file:null;
   const abs=rel?path.join(root,rel):null;
   fonts.set(f.name,Object.freeze({name:f.name,category:f.category??null,license:f.license??null,status:f.status??null,inPlatform:f.inPlatform===true,file:abs&&exists(abs)?abs:null,fileListed:rel,glyphs:Number.isInteger(f.glyphs)?f.glyphs:null}));
  }
 }
 const setsFile=path.join(root,'schriften','sets.json'),sets=new Map();
 if(exists(setsFile)){
  const data=readJson(setsFile);
  if(!Array.isArray(data.sets))fail(setsFile,'erwartet {sets:[…]}.');
  for(const s of data.sets){
   if(!record(s)||!id(s.id)||!text(s.name,120)||!Array.isArray(s.fonts)||s.fonts.some(n=>!text(n,120)))fail(setsFile,'Schrift-Set ohne Kennung, Namen oder Schriftliste.');
   if(sets.has(s.id))fail(setsFile,'Schrift-Set „'+s.id+'“ doppelt.');
   for(const n of FONT_SET_ALWAYS)if(!s.fonts.includes(n))fail(setsFile,'Schrift-Set „'+s.id+'“ ohne „'+n+'“ (Katalogregel 11).');
   if(fonts.size)for(const n of s.fonts)if(!fonts.has(n))fail(setsFile,'Schrift-Set „'+s.id+'“ nennt die unbekannte Schrift „'+n+'“.');
   sets.set(s.id,Object.freeze({id:s.id,name:s.name,note:s.note??null,fonts:Object.freeze([...s.fonts])}));
  }
 }
 return {fonts,sets};
}

function readMotifs(root){
 const file=path.join(root,'motive','motive.json'),list=[];
 if(!exists(file))return {list,file:null};
 const data=readJson(file);
 if(!Array.isArray(data.motifs))fail(file,'erwartet {motifs:[…]}.');
 const keys=new Set();
 for(const m of data.motifs){
  if(!record(m)||!/^[\w.-]{1,120}$/.test(m.key||'')||!text(m.name,120)||typeof m.file!=='string')fail(file,'Motiv ohne Kennung, Namen oder Datei.');
  if(keys.has(m.key))fail(file,'Motiv „'+m.key+'“ doppelt.');keys.add(m.key);
  const abs=path.join(root,'motive',m.file);
  list.push(Object.freeze({key:m.key,name:m.name,category:m.category??null,file:exists(abs)?abs:null,bounds:Array.isArray(m.bounds)&&m.bounds.length===4&&m.bounds.every(Number.isFinite)?Object.freeze([...m.bounds]):null,sha256:typeof m.sha256==='string'?m.sha256:null}));
 }
 return {list,file};
}

// Designs, Lieferform 2: `designs/<reihe>/<id>/design.svg` + `design.json`. Ordner, die
// mit `_` beginnen (z. B. `_testlauf-beispiele`), und `bestand/` sind keine freigegebenen
// Master. Maße in mm aus `design.json.plateMm` oder aus dem SVG-viewBox.
const svgSizeMm=svg=>{
 const vb=svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/);
 if(vb)return [Number(vb[3]),Number(vb[4])];
 const w=svg.match(/\swidth\s*=\s*["']([\d.]+)mm["']/),h=svg.match(/\sheight\s*=\s*["']([\d.]+)mm["']/);
 return w&&h?[Number(w[1]),Number(h[1])]:null;
};
export function readDesignFolder(dir,{source='lieferform2',index=null}={}){
 const svgFile=path.join(dir,'design.svg'),jsonFile=path.join(dir,'design.json');
 if(!exists(svgFile))fail(svgFile,'design.svg fehlt.');
 const json=exists(jsonFile)?readJson(jsonFile):{};
 if(!record(json))fail(jsonFile,'design.json ist kein Objekt.');
 const designId=typeof json.id==='string'&&json.id.trim()?json.id.trim():path.basename(dir);
 if(!/^[A-Za-z0-9][A-Za-z0-9_.,:-]{0,119}$/.test(designId))fail(jsonFile,'ungültige Design-Kennung „'+designId+'“.');
 let plate=null;
 if(Array.isArray(json.plateMm)&&json.plateMm.length===2&&json.plateMm.every(v=>Number.isFinite(v)&&v>0))plate=[json.plateMm[0],json.plateMm[1]];
 else if(record(json.plate)&&Number.isFinite(json.plate.widthMm)&&Number.isFinite(json.plate.heightMm))plate=[json.plate.widthMm,json.plate.heightMm];
 else{const size=svgSizeMm(fs.readFileSync(svgFile,'utf8'));if(size)plate=size;}
 if(!plate)fail(svgFile,'Plattenmaß fehlt (design.json plateMm oder SVG-viewBox in mm).');
 const themes=json.themes===undefined?null:Array.isArray(json.themes)&&json.themes.every(t=>typeof t==='string')?json.themes.map(t=>t.trim().toLowerCase()).filter(Boolean):fail(jsonFile,'themes ist eine Liste von Themen-Kennungen.');
 if(json.bestseller!==undefined&&typeof json.bestseller!=='boolean')fail(jsonFile,'bestseller ist true oder false.');
 if(json.fields!==undefined&&!record(json.fields))fail(jsonFile,'fields ist eine Zuordnung Ebene → Regeln.');
 return {id:designId,name:typeof json.name==='string'&&json.name.trim()?json.name.trim():designId,dir,svgFile,jsonFile:exists(jsonFile)?jsonFile:null,plateMm:plate,themes,bestseller:json.bestseller===true,fields:json.fields??{},fonts:Array.isArray(json.fonts)?json.fonts.filter(f=>typeof f==='string'):[],source,index,json,svg:()=>fs.readFileSync(svgFile,'utf8')};
}
function readMasters(root){
 const base=path.join(root,'designs'),list=[];
 for(const series of listDirs(base)){
  if(series.startsWith('_')||series==='bestand')continue;
  for(const entry of listDirs(path.join(base,series))){
   const dir=path.join(base,series,entry);
   if(!exists(path.join(dir,'design.svg')))continue;
   list.push({...readDesignFolder(dir),seriesFolder:series});
  }
 }
 const ids=new Set();for(const d of list){if(ids.has(d.id))fail(d.svgFile,'Design-Kennung „'+d.id+'“ doppelt.');ids.add(d.id);}
 return list;
}
// Bestand (`designs/bestand/<linie>/designs.json`): je Eintrag ein Master mit Plattenmaß
// aus der Schnittlinie; Themen fehlen dort (Spalte „Unterkategorie“ in der Excel ist
// noch Vorschlag), deshalb `themes:null`.
function readBestand(root,linie){
 const dir=path.join(root,'designs','bestand',linie),file=path.join(dir,'designs.json');
 if(!exists(file))fail(file,'Bestandsindex fehlt.');
 const data=readJson(file);
 if(!Array.isArray(data))fail(file,'erwartet eine Liste von Designs.');
 return data.map(entry=>{
  if(!record(entry)||typeof entry.key!=='string'||typeof entry.path!=='string')fail(file,'Bestandseintrag ohne key/path.');
  const plate=record(entry.plate)&&Number.isFinite(entry.plate.widthMm)&&Number.isFinite(entry.plate.heightMm)?[entry.plate.widthMm,entry.plate.heightMm]:null;
  const folder=path.join(dir,entry.path),svgFile=path.join(folder,'design.svg');
  return {id:entry.key,name:entry.key,dir:folder,svgFile:exists(svgFile)?svgFile:null,jsonFile:exists(path.join(folder,'design.json'))?path.join(folder,'design.json'):null,plateMm:plate,themes:null,bestseller:false,fields:{},fonts:Array.isArray(entry.fonts)?entry.fonts:[],materials:Array.isArray(entry.materials)?entry.materials:[],sizesInStock:Array.isArray(entry.sizesInStock)?entry.sizesInStock:[],kategorie:record(entry.kategorie)?entry.kategorie:null,source:'bestand',index:entry,json:null,svg:()=>fs.readFileSync(svgFile,'utf8')};
 });
}

export function openKatalog(root){
 if(typeof root!=='string'||!root.trim())throw Object.assign(Error('Katalog-Pfad fehlt (--katalog=<pfad> oder GRAVURU_KATALOG).'),{status:422,code:'katalog_missing'});
 root=path.resolve(root);
 if(!isDir(root))fail(root,'Katalog-Ordner nicht gefunden.');
 const families=new Map(),files=new Map();
 for(const material of listDirs(path.join(root,'familien')))for(const name of listFiles(path.join(root,'familien',material),'.json')){
  const file=path.join(root,'familien',material,name),doc=readJson(file);
  let family;try{family=validateFamily(doc);}catch(e){fail(file,e.message);}
  if(families.has(family.id))fail(file,'Familien-Kennung „'+family.id+'“ doppelt.');
  families.set(family.id,Object.freeze(family));files.set('familie:'+family.id,file);
 }
 const themenFile=path.join(root,'themen.json');
 let themes=[];
 if(exists(themenFile)){try{themes=parseThemeCatalog(readJson(themenFile));}catch(e){fail(themenFile,e.message.replace(/^themen\.json: /,''));}}
 const {fonts,sets}=readFonts(root);
 const lines=new Map();
 for(const name of listFiles(path.join(root,'linien'),'.json')){
  const file=path.join(root,'linien',name),line=validateLine(readJson(file),{families,themes,fontSets:sets,file});
  if(lines.has(line.id))fail(file,'Linien-Kennung „'+line.id+'“ doppelt.');
  lines.set(line.id,Object.freeze(line));files.set('linie:'+line.id,file);
 }
 const motifs=readMotifs(root);
 const masters=readMasters(root);
 const bestandLines=listDirs(path.join(root,'designs','bestand')).filter(n=>!n.startsWith('_')&&exists(path.join(root,'designs','bestand',n,'designs.json')));
 return {
  root,families,lines,themes,files,fonts:{list:fonts,sets,always:FONT_SET_ALWAYS},
  motifs:{list:motifs.list,svg:key=>{const m=motifs.list.find(m=>m.key===key);if(!m)fail(motifs.file||root,'Motiv „'+key+'“ unbekannt.');if(!m.file)fail(motifs.file,'Motivdatei für „'+key+'“ fehlt.');return fs.readFileSync(m.file,'utf8');}},
  designs:{masters,bestandLines,bestand:linie=>readBestand(root,linie)},
  theme:themeId=>findTheme(themes,themeId),
  // Schrift-Set einer Unterkategorie: eigenes Set, sonst Set des Themas; Michroma + Lato immer.
  fontSet(subcategory,theme){
   const setId=subcategory?.fontSet??theme?.fontSet??null;
   const set=typeof setId==='string'?sets.get(setId)||null:null;
   if(typeof setId==='string'&&!set)fail(path.join(root,'schriften','sets.json'),'Schrift-Set „'+setId+'“ unbekannt.');
   return {id:set?.id??null,fonts:[...new Set([...FONT_SET_ALWAYS,...(set?.fonts??[])])]};
  },
  // Glyphenressourcen für Schriften: vorhandene Werkstatt-Ressourcen zuerst, sonst die
  // Katalogdatei über den Schrift-Importer (font-import.py). Fehlende Dateien → `missing`.
  async fontResources(names,{available={},converter}={}){
   const result={},missing=[],cache=glyphCache;
   for(const name of new Set(names)){
    if(available[name]){result[name]=available[name];continue;}
    if(cache.has(name)){result[name]=cache.get(name);continue;}
    const meta=fonts.get(name);
    if(!meta?.file||!converter){missing.push(name);continue;}
    const data=await converter(fs.readFileSync(meta.file).toString('base64'));
    if(!data?.font?.regular?.glyphs){missing.push(name);continue;}
    cache.set(name,data.font);result[name]=data.font;
   }
   return {fonts:result,missing};
  }
 };
}
const glyphCache=new Map();

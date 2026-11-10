// Design-Dashboard (Chris 23.10.2026: „Designs Linie für Linie bearbeiten“): liest die Designs einer
// Katalog-Linie aus dem Katalog-Repo – Lieferform 2 (`designs/<reihe>/<id>/`) bevorzugt, sonst der
// Corel-Rohbestand (`designs/bestand/boegen/<Basis-SKU>/designs.json`) – und bewertet jede Zeile mit
// einer Ampel (ok | prüfen | fehlt). Schreibt nur, was ein Mensch im Dashboard ändert (name/themes/
// hidden) in `zuordnung.json` bzw. `design.json`, atomar, mit Protokoll `_aenderungen.jsonl`.
// Nichts wird erfunden: Unbekanntes bleibt null; der Katalogpfad kommt nur über katalogPath()/Option.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {designTargets,assignTargetSeries} from './design-targets.mjs';
import {dashboardDesignTargets} from './design-target-dashboard.mjs';
import {safeKatalogPath,withKatalogWriteLock,writeKatalogTransaction,recoverKatalogIfNeeded} from './katalog-transaction.mjs';
import path from 'node:path';
import {openKatalog} from './katalog-source.mjs';
import {parseDesignSvg,formatSeries,seriesOf,assignSeries,applyPriceOverrides,priceGaps,katalogDesignToTemplate,scaleTemplate,scaleEmbeddedMotifs,templateFit} from './katalog-convert.mjs';
import {convertFont} from './font-library.mjs';
import {FAMILY_MATERIALS,familyProcess} from './product-families.mjs';
import {importKey} from './katalog-import.mjs';

export const MIN_TEXT_MM=3;// Chris 23.10.2026 („3 mm Text“): kleinere Mustertexte sind zu prüfen
export const SELECTABLE_LABEL='#00ff00';// Bogenetikett grün = im Konfigurator wählbar
export const DESIGN_FILES=Object.freeze(['design.svg','design-produktion.svg','original.png','preview.png']);
export const PATCH_FIELDS=Object.freeze(['reihe','designId','name','themes','hidden','freigegeben','familie','zieleHinzufuegen','checksum','onlyPassing']);
const PT_TO_MM=25.4/72;
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const natural=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
const exists=f=>{try{return fs.statSync(f).isFile();}catch{return false;}};
const isDir=d=>{try{return fs.statSync(d).isDirectory();}catch{return false;}};
const readJson=file=>{let raw;try{raw=fs.readFileSync(file,'utf8').replace(/^﻿/,'');}catch{fail(503,'katalog_unreadable',file+': Datei nicht lesbar.');}try{return JSON.parse(raw);}catch(e){fail(503,'katalog_invalid',file+': kein gültiges JSON ('+e.message+').');}};
const round=v=>Math.round(v*100)/100;
const SEGMENT=/^[A-Za-z0-9][A-Za-z0-9_.,-]{0,119}$/;// Ordnernamen unter designs/ (Reihe, Design-ID, Bogen-Basis)
const validSegment=v=>typeof v==='string'&&SEGMENT.test(v)&&!v.includes('..');
const slug=v=>String(v).replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'x';// wie katalog-convert templateId
// Materialnamen aus Katalogdateien („Edelstahl“, „Acryl“, „Acrylglas“) vergleichbar machen.
const materialKey=v=>typeof v==='string'?v.trim().toLowerCase().replace(/glas$/,'').replace(/\s+/g,' '):null;
const processKey=v=>typeof v==='string'?v.trim().toLowerCase():null;
const familyMaterialName=f=>FAMILY_MATERIALS[f.material?.kind]?.name??null;
const familyProcessName=f=>{let p=null;try{p=familyProcess(f);}catch{}return p?.method==='print'?'UV':p?.method==='engraving'?'Gravur':null;};

// Geöffneter Katalog je Pfad für zwei Sekunden gemerkt (die Seite fragt Zeilen und Vorschauen kurz hintereinander).
const opened=new Map();
export function katalogFor(root,{maxAgeMs=2000,now=Date.now()}={}){
 if(typeof root!=='string'||!root.trim())fail(503,'katalog_missing','Kein Katalog verbunden. Server mit --katalog=<pfad> starten oder GRAVURU_KATALOG setzen.');
 root=path.resolve(root);
 if(recoverKatalogIfNeeded(root))opened.delete(root);
 const hit=opened.get(root);if(hit&&now-hit.at<maxAgeMs)return hit.katalog;
 if(!isDir(root))fail(503,'katalog_missing','Katalog-Ordner nicht gefunden: '+root);
 let katalog;try{katalog=openKatalog(root);}catch(e){fail(503,'katalog_invalid','Katalog nicht lesbar: '+e.message);}
 opened.set(root,{at:now,katalog});return katalog;
}
export const forgetKatalog=()=>opened.clear();

// ---- Zwischenspeicher über Anfragen hinweg (Chris 10.11.2026: Designliste lädt zu langsam) ----
// Teuer sind je Design die SVG-Analyse und die Prüfsummen der Ziele. Das Ergebnis hängt nur an
// design.json/design.svg (Zeitstempel+Größe) und am Katalogkontext (Familien, Linien, Schriften,
// verfügbare Formschriften). Ändert sich eins davon, wird neu gerechnet; nichts wird geraten.
const targetCache=new Map(),targetsOfCache=new Map();
const fileStamp=file=>{try{const s=fs.statSync(file);return s.mtimeMs+':'+s.size;}catch{return 'x';}};
export const designStamp=d=>fileStamp(path.join(d.dir,'design.json'))+'|'+fileStamp(path.join(d.dir,'design.svg'));
const contextSigs=new WeakMap();
export function katalogContextSig(katalog,available={}){
 let byAvailable=contextSigs.get(katalog);if(!byAvailable){byAvailable=new Map();contextSigs.set(katalog,byAvailable);}
 const availableKey=JSON.stringify(Object.entries(available||{}).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]).sort());
 if(byAvailable.has(availableKey))return byAvailable.get(availableKey);
 const fonts=[...katalog.fonts.list].map(([name,meta])=>[name,meta?.file??null,meta?.file?fileStamp(meta.file):null]);
 const sig=createHash('sha256').update(JSON.stringify([...katalog.families.values()])).update(JSON.stringify([...katalog.lines.values()])).update(JSON.stringify(katalog.themes)).update(JSON.stringify(fonts)).update(availableKey).digest('hex');
 byAvailable.set(availableKey,sig);return sig;
}
function cachedTargetsOf(d,katalog){
 const sig=designStamp(d)+'|'+katalogContextSig(katalog),hit=targetsOfCache.get(d.dir);
 if(hit&&hit.sig===sig)return hit.value;
 const value=designTargets(d,katalog);targetsOfCache.set(d.dir,{sig,value});return value;
}
export const forgetDashboardCache=()=>{targetCache.clear();targetsOfCache.clear();};

// Reihenfolge (Chris 10.11.2026: „Prio haben immer unsere Designs aus dem Katalog“):
// 0 = unser Design aus dem Corel-Bestand (Original oder Übertragung), 1 = neu entworfen, 2 = nur Bestand ohne Lieferform 2.
export function herkunftRang(j){
 const from=j?.transfer?.fromKey??j?.transfer?.from??null;
 if(typeof from==='string'&&from)return 0;
 return typeof j?.source==='string'&&/^\S+ \(Bestand[,)]/.test(j.source)?0:1;
}

// ---- Schriften ----
function fontReplacements(root){
 const dir=path.join(root,'schriften'),map=new Map();
 if(!isDir(dir))return map;
 for(const name of fs.readdirSync(dir).filter(n=>/^ersatz-.*\.json$/i.test(n)).sort()){
  const data=readJson(path.join(dir,name));if(!record(data))continue;
  for(const [from,to] of Object.entries(data))if(!from.startsWith('_')&&typeof to==='string'&&!map.has(from))map.set(from,{to,file:'schriften/'+name});
 }
 return map;
}
function fontStatus(name,katalog,replacements){
 const meta=katalog.fonts.list.get(name);
 if(meta)return {name,status:'vorhanden',file:Boolean(meta.file),license:meta.license??null,replacement:null};
 const r=replacements.get(name);
 if(r)return {name,status:'ersatz',file:false,license:null,replacement:r.to,source:r.file};
 return {name,status:'fehlt',file:false,license:null,replacement:null};
}

// ---- Geometrieprüfungen (mm) ----
const TOL=0.3;
function outsidePlate(box,plate){const [x,y,w,h]=box;return x<-TOL||y<-TOL||x+w>plate[0]+TOL||y+h>plate[1]+TOL;}
function geometryIssues(texts,motifs,plate){
 const issues=[];
 if(!plate)return issues;
 texts.forEach((t,i)=>{
  const label='Text '+(i+1)+(t.text?' „'+String(t.text).split('\n')[0].slice(0,24)+'“':'');
  if(Array.isArray(t.box)&&t.box.length===4&&t.box.every(Number.isFinite)){if(outsidePlate(t.box,plate))issues.push(label+' liegt außerhalb der Platte.');}
  else if(Array.isArray(t.anchorMm)&&t.anchorMm.length===2&&t.anchorMm.every(Number.isFinite)){const [x,y]=t.anchorMm;if(x<-TOL||y<-TOL||x>plate[0]+TOL||y>plate[1]+TOL)issues.push(label+': Ankerpunkt liegt außerhalb der Platte.');}
 });
 motifs.forEach((m,i)=>{if(Array.isArray(m.box)&&m.box.length===4&&m.box.every(Number.isFinite)&&outsidePlate(m.box,plate))issues.push('Motiv '+(i+1)+' liegt außerhalb der Platte.');});
 return issues;
}
function smallTexts(texts){
 const out=[];
 texts.forEach((t,i)=>{const mm=Number.isFinite(t.sizeMm)?t.sizeMm:Number.isFinite(t.sizePt)?t.sizePt*PT_TO_MM:null;if(mm!==null&&mm<MIN_TEXT_MM-0.005)out.push('Text '+(i+1)+' ist mit '+round(mm)+' mm kleiner als '+MIN_TEXT_MM+' mm.');});
 return out;
}

// ---- Linie → Familien, Formatreihen, Themen ----
function lineContext(katalog,line){
 const families=line.families.map(id=>katalog.families.get(id)).filter(Boolean);
 const materials=[...new Set(families.map(familyMaterialName).filter(Boolean))];
 const processes=[...new Set(families.map(familyProcessName).filter(Boolean))];
 const series=families.map(f=>({family:f,series:formatSeries(f)}));
 const themeIds=new Set(line.subcategories.map(s=>s.themeId).filter(Boolean));
 return {families,materials,processes,series,themeIds,katalog,line};
}
// Design-Plattenmaß → Formatreihe einer Familie der Linie (±1 % wie der Import), sonst null.
function seriesFor(ctx,plateMm){
 for(const {family,series} of ctx.series){const hit=seriesOf(series,plateMm);if(hit)return {familyId:family.id,key:hit.key,sizes:hit.sizes,masterMm:[hit.widthMm,hit.heightMm]};}
 return null;
}
const materialMatches=(ctx,material)=>{const key=materialKey(material);if(key===null)return null;return ctx.materials.some(m=>materialKey(m)===key);};

// ---- Bestand (Corel-Bögen) ----
function bestandOverviews(root){
 const dir=path.join(root,'designs','bestand','boegen');
 if(!isDir(dir))return [];
 return fs.readdirSync(dir).filter(n=>/^_linie-.*\.json$/.test(n)).sort().map(n=>{const data=readJson(path.join(dir,n));return {slug:n.slice('_linie-'.length,-'.json'.length),file:'designs/bestand/boegen/'+n,linie:data.linie??null,material:data.material??null,process:data.process??null,sheets:Array.isArray(data.sheets)?data.sheets.filter(record):[]};});
}
// Welche Bestandsübersichten gehören zur Linie? 1. ausdrücklich (`?bestand=` oder Feld `bestand` in der
// Linie: Übersichts-Kennungen oder Bogen-Basen), 2. abgeleitet: Bögen, aus denen Lieferform-2-Designs der
// Linie übertragen wurden (design.json `transfer.fromKey`). Kein Raten über Namen oder Material allein.
function resolveBestand(overviews,line,l2,explicit){
 const wanted=new Set((Array.isArray(explicit)?explicit:[]).concat(Array.isArray(line.bestand)?line.bestand:[]).filter(v=>typeof v==='string'));
 const derived=new Set();
 for(const d of l2){const from=d.json?.transfer?.fromKey??d.json?.transfer?.from??null;if(typeof from==='string')derived.add(from.replace(/-D\d+.*$/,''));}
 const chosen=[],why=[];
 for(const o of overviews){
  const bases=new Set(o.sheets.map(s=>s.base));
  if(wanted.has(o.slug)||[...bases].some(b=>wanted.has(b))){chosen.push(o);why.push({overview:o.slug,grund:'ausdrücklich'});continue;}
  if([...derived].some(b=>bases.has(b))){chosen.push(o);why.push({overview:o.slug,grund:'Herkunft der Lieferform-2-Designs'});}
 }
 return {overviews:chosen,why};
}
function readBogen(root,base){
 const file=path.join(root,'designs','bestand','boegen',base,'designs.json');
 if(!exists(file))return null;
 const data=readJson(file);return Array.isArray(data)?data.filter(e=>record(e)&&typeof e.id==='string'):null;
}

// ---- Zeilen ----
const previewUrl=(params)=>'/api/workshop/designs/svg?'+new URLSearchParams(params).toString();
function filesFor(root,{reihe=null,bestand=null,id}){
 const dir=reihe?path.join(root,'designs',reihe,id):path.join(root,'designs','bestand','boegen',bestand,id);
 const where=reihe?{reihe,id}:{bestand,id};
 const svg=exists(path.join(dir,'design.svg'))?previewUrl({...where,file:'design.svg'}):null;
 const pngName=reihe?'original.png':'preview.png';
 const png=exists(path.join(dir,pngName))?previewUrl({...where,file:pngName}):null;
 const production=reihe&&exists(path.join(dir,'design-produktion.svg'))?previewUrl({...where,file:'design-produktion.svg'}):null;
 return {svg,png,production};
}
function konfiProducts(repository,line,ctx,design){
 if(!repository)return {imported:null,products:[]};
 const products=[],cache=new Map(),templateId='katalog-'+slug(design.id);
 const product=id=>{if(!cache.has(id)){let r=null;try{r=repository.get(id);}catch{}cache.set(id,r);}return cache.get(id);};
 for(const sub of line.subcategories){
  if(!sub.themeId||!(design.themes||[]).includes(sub.themeId))continue;
  const mains=Array.isArray(sub.mainProducts)&&sub.mainProducts.length?sub.mainProducts:[null];
  for(const main of mains){
   const offered=main?.sizesOffered??sub.sizesOffered??design.series?.sizes??[];
   for(const sizeKey of offered){
    if(design.series&&!design.series.sizes.includes(sizeKey))continue;
    const key=importKey(line.id,sub.id,sizeKey)+(main?':'+main.id:''),hit=repository.importItem(key);if(!hit)continue;
    const r=product(hit.id);if(!r)continue;
    const designs=r.document?.config?.profile?.designs||r.document?.designs||[];
    if(!designs.some(d=>d.id===templateId||d.katalog?.designId===design.id))continue;
    products.push({productId:r.id,revision:r.revision,importKey:key,subcategory:sub.id,mainProduct:main?.id??null,sizeKey,templateId,status:r.status??null,href:'/werkstatt/?configuration='+encodeURIComponent(r.id)+'&design='+encodeURIComponent(templateId)});
   }
  }
 }
 return {imported:products.length>0,products};
}

// Hauptproduktreferenzen bleiben sichtbar, auch wenn der Import sie derzeit sperrt.
// Eine Bindung je Hauptprodukt × angebotener Größe; CustomizationID wird nie aus main.id erfunden.
// Freigabe ist weiterhin row.released und wird nicht mit dem fachlichen Größen-/Fitstatus vermischt.
const mainReferences=line=>line.subcategories.flatMap(sub=>(sub.mainProducts||[]).map(main=>({sub,main})));
const transferId=design=>design.json?.transfer?.fromKey??design.json?.transfer?.from??null;
function referencedMasters(katalog,line){
 const ids=new Set(mainReferences(line).map(({main})=>main.startDesign));
 return katalog.designs.masters.filter(design=>ids.has(design.id)||ids.has(transferId(design)));
}
function missingReferenceRow(id,message){
 return {id,name:id,nameSheet:null,source:'missing',reihe:null,formatreihe:null,familyId:null,series:null,
  material:null,process:null,form:null,plate:null,labelColor:null,selectable:false,hidden:false,released:false,freigabe:null,bestseller:false,
  production:{isProduction:false,hasVersion:false,of:null},duplicate:null,texts:{count:0,fonts:[],sample:[]},fonts:[],fontsOriginal:[],motifs:null,photos:null,themes:[],
  lieferform2:null,bestand:null,files:{svg:null,png:null,production:null},reasons:[message],warnings:[],konfi:{imported:false,products:[]}};
}
function attachMainProducts(katalog,line,rows,{fonts=null}={}){
 const references=mainReferences(line),masters=new Map(katalog.designs.masters.map(design=>[design.id,design])),pricedCache=new Map(),templateCache=new Map(),resolved=new Map();
 for(const row of rows){row.mainProducts=[];row.isStartDesign=false;}
 const blocker=(code,message)=>({code,message});
 for(const {sub,main} of references){
  // Direct IDs take precedence; only explicit transfer metadata may link a Bestand alias.
  if(!resolved.has(main.startDesign)){
   let row=rows.find(row=>row.id===main.startDesign),alias=false,ambiguous=false;
   if(!row){const aliases=rows.filter(row=>row.lieferform2?.transferFrom===main.startDesign);if(aliases.length===1){row=aliases[0];alias=true;}else ambiguous=aliases.length>1;}
   if(!row){row=missingReferenceRow(main.startDesign,ambiguous?'Startdesign „'+main.startDesign+'“ hat mehrere ausdrücklich verknüpfte Herkunftsdesigns; Zuordnung prüfen.':'Startdesign „'+main.startDesign+'“ fehlt im Designbestand der Linie.');row.mainProducts=[];rows.push(row);}
   resolved.set(main.startDesign,{row,alias,ambiguous});
  }
  const {row,alias,ambiguous}=resolved.get(main.startDesign);
  row.isStartDesign=true;
  const master=row.lieferform2?masters.get(row.id):null,offered=main.sizesOffered??sub.sizesOffered;
  const keys=Array.isArray(offered)?[...new Set(offered)]:[...new Set(line.families.flatMap(id=>katalog.families.get(id).sizes.map(size=>size.key)))];
  const targets=keys.flatMap(sizeKey=>{const found=line.families.map(id=>katalog.families.get(id)).filter(family=>family.sizes.some(size=>size.key===sizeKey));return found.length?found.map(family=>({family,sizeKey})):[{family:null,sizeKey}];});
  if(!targets.length)targets.push({family:null,sizeKey:null});
  for(const {family,sizeKey} of targets){
   const baseSize=family?.sizes.find(size=>size.key===sizeKey),entry={id:main.id,customizationId:main.externalIds?.customizationId??null,name:main.name??null,
    lineId:line.id,subcategoryId:sub.id,startDesign:main.startDesign,resolvedDesignId:master?.id??null,
    familyId:family?.id??null,sizeKey,sizeLabel:baseSize?.label??null,basePriceCents:null,fit:{status:'nicht geprüft',issues:[]},blockers:[]};
   if(ambiguous)entry.blockers.push(blocker('design_ambiguous','Startdesign „'+main.startDesign+'“ ist über mehrere Herkunftsangaben verknüpft.'));
   else if(!master)entry.blockers.push(blocker('design_missing','Startdesign „'+main.startDesign+'“ fehlt als Lieferform 2.'));
   else if(alias)entry.blockers.push(blocker('design_alias','„'+main.startDesign+'“ ist die Herkunft von „'+master.id+'“. Der Import benötigt die eindeutige Lieferform-2-Kennung als startDesign.'));
   if(!family){entry.blockers.push(blocker(sizeKey?'size_unknown':'size_missing',sizeKey?'Größe „'+sizeKey+'“ gehört zu keiner Familie der Linie.':'Keine angebotene Größe mit Familie vorhanden.'));row.mainProducts.push(entry);continue;}
   const pricedKey=family.id+'\0'+sub.id;
   if(!pricedCache.has(pricedKey)){try{pricedCache.set(pricedKey,{family:applyPriceOverrides(family,sub)});}catch(error){pricedCache.set(pricedKey,{error:error.message});}}
   const priced=pricedCache.get(pricedKey);
   if(priced.error)entry.blockers.push(blocker('price_configuration',priced.error));
   else{const size=priced.family.sizes.find(size=>size.key===sizeKey);entry.basePriceCents=size.baseCents;entry.blockers.push(...priceGaps(priced.family,size).map(message=>blocker('price_open',message)));}
   if(master){
    const assigned=assignSeries(family,[master])[0],allowed=!assigned.oldSize&&assigned.sizes.includes(sizeKey);
    if(!allowed)entry.blockers.push(blocker('size_mismatch','Startdesign „'+main.startDesign+'“ ist nach seiner Größenbindung nicht für '+baseSize.label+' ('+sizeKey+') vorgesehen.'));
    if(!master.themes?.includes(sub.themeId))entry.blockers.push(blocker('theme_mismatch','Das Startdesign ist dem Thema der Unterkategorie „'+sub.id+'“ nicht zugeordnet.'));
    if(master.hidden)entry.blockers.push(blocker('design_hidden','Das Startdesign ist ausgeblendet und wird nicht importiert.'));
    if(sub.photoDesigns!=null){const hasPhoto=Array.isArray(master.json?.photos)?master.json.photos.length>0:/class="[^"]*\bfoto\b/.test(master.svg());if((sub.photoDesigns==='mit')!==hasPhoto)entry.blockers.push(blocker('photo_mismatch','Fotofeld-Zuordnung passt nicht zur Unterkategorie „'+sub.id+'“.'));}
    if(allowed&&fonts!==null){
     try{
      const templateKey=family.id+'\0'+sub.themeId+'\0'+master.id;
      if(!templateCache.has(templateKey)){try{templateCache.set(templateKey,katalogDesignToTemplate(master,family,katalog.theme(sub.themeId),{fonts}));}catch(error){templateCache.set(templateKey,{error});}}
      const converted=templateCache.get(templateKey);if(converted.error)throw converted.error;
      const scaled=scaleTemplate(converted.template,converted.template.katalog.plateMm,[baseSize.widthMm,baseSize.heightMm],fonts,{contain:family.groups.find(group=>group.key===baseSize.groupKey)?.shape==='contour'});
      entry.fit=templateFit(scaled,family,baseSize,fonts,{motifs:()=>scaleEmbeddedMotifs(converted.motifs,scaled.katalog.scale)});
      if(entry.fit.status==='passt nicht')entry.blockers.push(...entry.fit.issues.map(message=>blocker('size_fit',message)));
     }catch(error){const missingFont=/Schrift fehlt|vorhandene Schriftart/.test(error.message);entry.fit={status:missingFont?'nicht geprüft':'passt nicht',issues:[error.message]};entry.blockers.push(blocker(missingFont?'fit_unavailable':'design_invalid',error.message));}
    }
   }
   row.mainProducts.push(entry);
  }
 }
 return {references:references.length,rows:rows.filter(row=>row.isStartDesign).length,assignments:rows.reduce((n,row)=>n+row.mainProducts.length,0),
  missingReferences:references.filter(({main})=>!masters.has(main.startDesign)).length,fitChecked:fonts!==null};
}

// HTTP uses this asynchronous adapter to obtain real font metrics. The existing synchronous
// dashboard remains usable without glyph conversion, with fit explicitly marked unverified.
export async function designDashboardWithFit(root,options={}){
 if(!options.linie)return designDashboard(root,options);
 const katalog=katalogFor(root),line=katalog.lines.get(options.linie);
 if(!line)return designDashboard(root,options);
 const names=[...new Set(referencedMasters(katalog,line).flatMap(design=>design.fonts||[]))],fonts={},issues=[];
 for(const name of names){try{const result=await katalog.fontResources([name],{available:options.available??{},converter:options.converter??convertFont});Object.assign(fonts,result.fonts);if(result.missing.length)issues.push('Fit-Prüfung: Schrift fehlt: '+name+'.');}catch(error){issues.push('Fit-Prüfung der Schrift „'+name+'“ nicht möglich: '+error.message);}}
 const result=designDashboard(root,{...options,fonts});result.notes.push(...issues);return result;
}

export function designDashboard(root,{linie=null,reihe=null,material=null,status=null,freigabe=null,bestand=null,repository=null,startDesigns=false,fonts=null,available={}}={}){
 const katalog=katalogFor(root);root=katalog.root;
 if(typeof startDesigns!=='boolean')fail(422,'designs_query','startDesigns ist true oder false.');
 if(linie===null||linie===undefined||linie===''){
  const overviews=bestandOverviews(root);
  return {linien:[...katalog.lines.values()].map(line=>{const ctx=lineContext(katalog,line);const l2=katalog.designs.masters.filter(d=>designOfLine(ctx,d));const b=resolveBestand(overviews,line,l2,null);return {id:line.id,name:line.name,status:line.status??null,ausfuehrungen:line.ausfuehrungen??null,families:line.families,materials:ctx.materials,subcategories:line.subcategories.map(s=>({id:s.id,name:s.name,themeId:s.themeId??null,mainProducts:(s.mainProducts||[]).map(m=>m.id)})),designsLieferform2:l2.length,bestand:b.overviews.map(o=>o.slug)};}),themes:katalog.themes.map(t=>({id:t.id,name:t.name}))};
 }
 if(status!==null&&!['ok','prüfen','fehlt'].includes(status))fail(422,'designs_query','Status ist ok, prüfen oder fehlt.');
 if(freigabe!==null&&!['ja','nein'].includes(freigabe))fail(422,'designs_query','freigabe ist ja oder nein.');
 const line=katalog.lines.get(linie);if(!line)fail(404,'line_unknown','Linie „'+linie+'“ ist im Katalog nicht vorhanden ('+[...katalog.lines.keys()].join(', ')+').');
 const ctx=lineContext(katalog,line),replacements=fontReplacements(root),notes=[];
 if(!ctx.families.length)notes.push('Linie ohne Familie: Formatreihen und Material sind offen; Lieferform-2-Designs lassen sich nicht zuordnen.');
 const themeName=id=>katalog.theme(id)?.name??id;
 // Lieferform 2
 const referenced=new Set(referencedMasters(katalog,line));
 const l2=katalog.designs.masters.filter(d=>designOfLine(ctx,d)||referenced.has(d));
 const rows=[],byBestandId=new Map(),targetVersionCache=new Map();
 // Katalogkontext einmal je Anfrage: die Signatur enthält die verfügbaren Formschriften (mehrere MB). Je Design neu gebildet
 // kostete das auf dem Server rund zwei Minuten je Linie (Befund 10.11.2026, #229).
 const contextSig=katalogContextSig(katalog,available);
 for(const d of l2){
  const j=d.json||{},texts=Array.isArray(j.texts)?j.texts.filter(record):[],motifs=Array.isArray(j.motifs)?j.motifs.filter(record):[];
  const fonts=[...new Set([...(Array.isArray(j.fonts)?j.fonts:[]),...texts.map(t=>t.font)].filter(f=>typeof f==='string'&&f))].map(n=>fontStatus(n,katalog,replacements));
  const series=seriesFor(ctx,d.plateMm);
  const row={id:d.id,name:d.name,nameSheet:typeof j.nameSheet==='string'?j.nameSheet:null,source:'lieferform2',reihe:d.seriesFolder,formatreihe:series?.key??null,familyId:series?.familyId??null,series:series?{key:series.key,sizes:series.sizes}:null,
   material:typeof j.material==='string'?j.material:(ctx.materials.length===1?ctx.materials[0]:null),process:typeof j.process==='string'?j.process:(ctx.processes.length===1?ctx.processes[0]:null),form:typeof j.form==='string'&&j.form?j.form:null,
   plate:[d.plateMm[0],d.plateMm[1]],labelColor:null,selectable:true,hidden:j.hidden===true,released:d.released===true,freigabe:d.freigabe??null,bestseller:d.bestseller,
   production:{isProduction:false,hasVersion:exists(path.join(d.dir,'design-produktion.svg')),of:null},duplicate:null,
   texts:{count:texts.length,fonts:fonts.map(f=>f.name),sample:texts.map(t=>typeof t.text==='string'?t.text:'').filter(Boolean).slice(0,4)},fonts,fontsOriginal:Array.isArray(j.fontsOriginal)?j.fontsOriginal.filter(f=>typeof f==='string'):[],
   motifs:motifs.length,photos:Array.isArray(j.photos)?j.photos.length:0,themes:(d.themes||[]).map(id=>({id,name:themeName(id)})),
   lieferform2:{reihe:d.seriesFolder,dir:path.relative(root,d.dir).split(path.sep).join('/'),transferFrom:j.transfer?.fromKey??j.transfer?.from??null},bestand:null,
   files:filesFor(root,{reihe:d.seriesFolder,id:d.id}),reasons:[],warnings:Array.isArray(j.warnings)?j.warnings.filter(w=>typeof w==='string'):[],
   herkunftRang:herkunftRang(j)};
  {const sig=designStamp(d)+'|'+line.id+'|'+contextSig,hit=targetCache.get(d.dir);
   let value=hit&&hit.sig===sig?hit.value:null;
   if(!value){let svgText=null,versions=null;// SVG und Schriftstände einmal je Design, nicht je Familie
    value=dashboardDesignTargets(d,katalog,line,{checksumFor:family=>{try{svgText??=d.svg();versions??=targetFontVersions({...d,svg:()=>svgText},katalog,available,targetVersionCache);return designTargetChecksum(d,family,svgText,versions);}catch{return null;}}});targetCache.set(d.dir,{sig,value});}
   Object.assign(row,structuredClone(value));}
  if(!series)row.reasons.push(ctx.families.length?'alte Größe: '+row.plate[0]+' × '+row.plate[1]+' mm passt in keine Formatreihe der Familie (nur Einpassen, keine Übernahme).':'Formatreihe offen (Linie ohne Familie).');
  if(!d.themes||!d.themes.length)row.reasons.push('kein Thema zugeordnet.');
  else if(!d.themes.some(t=>ctx.themeIds.has(t)))row.reasons.push('Thema passt zu keiner Unterkategorie der Linie ('+d.themes.join(', ')+').');
  for(const f of fonts)if(f.status==='fehlt')row.reasons.push('Schrift fehlt: '+f.name+'.');
  row.reasons.push(...smallTexts(texts),...geometryIssues(texts,motifs,row.plate));
  const k=konfiProducts(repository,line,ctx,{id:d.id,themes:d.themes,series});row.konfi=k;
  rows.push(row);
  if(row.lieferform2.transferFrom)byBestandId.set(row.lieferform2.transferFrom,row);
  byBestandId.set(d.id,row);
 }
 // Bestand
 const overviews=bestandOverviews(root),chosen=resolveBestand(overviews,line,l2,bestand?[bestand]:null);
 const bestandInfo={overviews:chosen.why,sheets:[]};
 if(!chosen.overviews.length&&overviews.length)notes.push('Kein Bestand zugeordnet: Linie nennt kein Feld „bestand“, und keine Lieferform-2-Herkunft zeigt auf einen Bogen. Vorhandene Übersichten: '+overviews.map(o=>o.slug).join(', ')+'.');
 for(const o of chosen.overviews){
  // Material der Übersicht muss zur Familie passen (sofern beide bekannt), sonst bleibt sie außen vor.
  const fits=materialMatches(ctx,o.material);
  if(fits===false){notes.push('Bestandsübersicht „'+o.slug+'“ ('+o.material+') passt nicht zum Material der Linie ('+ctx.materials.join(', ')+') und bleibt außen vor.');continue;}
  for(const sheet of o.sheets){
   if(!validSegment(sheet.base))continue;
   const entries=readBogen(root,sheet.base);
   bestandInfo.sheets.push({base:sheet.base,formatreihe:sheet.formatreihe??null,alteGroesse:sheet.alteGroesse===true,designs:entries?entries.length:null,green:sheet.green??null,ok:sheet.ok!==false});
   if(!entries)continue;
   const productionOf=new Map();for(const e of entries)if(e.production===true&&typeof e.productionOf==='string')productionOf.set(e.productionOf,e.id);
   for(const e of entries){
    if(e.production===true)continue;// Produktionsfassung hängt am Design (zwei Fassungen bleiben zwei, Chris 22.10.2026)
    const l2row=byBestandId.get(e.id);
    const texts=Array.isArray(e.texts)?e.texts.filter(record):[];
    const selectable=e.labelColor===SELECTABLE_LABEL;
    if(l2row){
     l2row.bestand={base:sheet.base,id:e.id,labelColor:e.labelColor??null,formatreihe:sheet.formatreihe??null,alteGroesse:sheet.alteGroesse===true,customizationIds:Array.isArray(e.customizationIds)?e.customizationIds:[]};
     l2row.labelColor=e.labelColor??null;
     if(productionOf.has(e.id))l2row.production={...l2row.production,hasVersion:true,of:productionOf.get(e.id)};
     if(typeof e.duplicateOf==='string'){l2row.duplicate={of:e.duplicateOf,identical:e.identicalDuplicate===true};l2row.reasons.push(e.identicalDuplicate===true?'Doppelt: wie '+e.duplicateOf+'.':'Abweichende Fassung zu '+e.duplicateOf+'.');}
     continue;
    }
    const plate=record(e.plate)&&Number.isFinite(e.plate.widthMm)&&Number.isFinite(e.plate.heightMm)?[e.plate.widthMm,e.plate.heightMm]:null;
    const fonts=[...new Set([...(Array.isArray(e.fonts)?e.fonts:[]),...texts.map(t=>t.font)].filter(f=>typeof f==='string'&&f))].map(n=>fontStatus(n,katalog,replacements));
    const series=plate?seriesFor(ctx,plate):null;
    const row={id:e.id,name:typeof e.name==='string'&&e.name?e.name:e.id,nameSheet:typeof e.sheetLabel==='string'?e.sheetLabel:null,source:'bestand',reihe:sheet.base,formatreihe:sheet.formatreihe||series?.key||null,familyId:series?.familyId??null,series:series?{key:series.key,sizes:series.sizes}:null,
     material:e.material??o.material??null,process:e.process??o.process??null,form:e.form||null,plate,labelColor:e.labelColor??null,selectable,hidden:false,released:false,freigabe:null,bestseller:false,
     production:{isProduction:false,hasVersion:productionOf.has(e.id),of:productionOf.get(e.id)??null},duplicate:typeof e.duplicateOf==='string'?{of:e.duplicateOf,identical:e.identicalDuplicate===true}:null,
     texts:{count:texts.length,fonts:fonts.map(f=>f.name),sample:texts.map(t=>typeof t.text==='string'?t.text:'').filter(Boolean).slice(0,4)},fonts,fontsOriginal:[],motifs:Number.isInteger(e.motifCount)?e.motifCount:null,photos:Array.isArray(e.photoFiles)?e.photoFiles.length:0,themes:[],
     lieferform2:null,bestand:{base:sheet.base,id:e.id,labelColor:e.labelColor??null,formatreihe:sheet.formatreihe??null,alteGroesse:sheet.alteGroesse===true,customizationIds:Array.isArray(e.customizationIds)?e.customizationIds:[]},
     files:filesFor(root,{bestand:sheet.base,id:e.id}),herkunftRang:2,reasons:['keine Lieferform 2.'+(selectable?'':' Im Bogen rot = nicht wählbar.')],warnings:[],konfi:{imported:false,products:[]}};
    if(sheet.alteGroesse===true)row.reasons.push('alte Größe (Bogen außerhalb der neuen Formatreihen).');
    if(row.duplicate)row.reasons.push(row.duplicate.identical?'Doppelt: wie '+row.duplicate.of+'.':'Abweichende Fassung zu '+row.duplicate.of+'.');
    for(const f of fonts)if(f.status==='fehlt')row.reasons.push('Schrift fehlt: '+f.name+'.');
    row.reasons.push(...smallTexts(texts),...geometryIssues(texts,[],plate));
    rows.push(row);
   }
  }
 }
 const startDesignSummary=attachMainProducts(katalog,line,rows,{fonts});
 for(const row of rows)row.status=row.lieferform2?(row.reasons.length?'prüfen':'ok'):'fehlt';
 rows.sort((a,b)=>a.herkunftRang-b.herkunftRang||natural.compare(a.id,b.id));
 const count=list=>{const c={total:list.length,ok:0,'prüfen':0,fehlt:0,selectable:0,lieferform2:0,bestandOnly:0,hidden:0,freigegeben:0};for(const r of list){c[r.status]++;if(r.released)c.freigegeben++;if(r.selectable)c.selectable++;if(r.lieferform2)c.lieferform2++;else if(r.source==='bestand')c.bestandOnly++;if(r.hidden)c.hidden++;}return c;};
 const groups=(key)=>{const m=new Map();for(const r of rows){const k=r[key]??'offen';if(!m.has(k))m.set(k,[]);m.get(k).push(r);}return [...m].sort((a,b)=>natural.compare(a[0],b[0])).map(([k,list])=>({key:k,counts:count(list)}));};
 const reihen=groups('reihe'),formatreihen=groups('formatreihe'),materials=groups('material');
 let filtered=startDesigns?rows.filter(row=>row.isStartDesign):rows;
 if(reihe)filtered=filtered.filter(r=>r.reihe===reihe||r.formatreihe===reihe);
 if(material)filtered=filtered.filter(r=>materialKey(r.material)===materialKey(material));
 if(status)filtered=filtered.filter(r=>r.status===status);
 if(freigabe)filtered=filtered.filter(r=>r.released===(freigabe==='ja'));
 return {linie:{id:line.id,name:line.name,status:line.status??null,ausfuehrungen:line.ausfuehrungen??null,families:ctx.families.map(f=>({id:f.id,name:f.name,material:familyMaterialName(f),process:familyProcessName(f)})),subcategories:line.subcategories.map(s=>({id:s.id,name:s.name,themeId:s.themeId??null,mainProducts:(s.mainProducts||[]).map(m=>({id:m.id,name:m.name??null,startDesign:m.startDesign}))}))},
  familien:[...katalog.families.values()].map(f=>({id:f.id,name:f.name,sizes:f.sizes.map(s=>({key:s.key,label:s.label})),linien:[...katalog.lines.values()].filter(l=>l.families.includes(f.id)).map(l=>({id:l.id,name:l.name}))})),
  themes:katalog.themes.map(t=>({id:t.id,name:t.name})),availableFormGroups:availableFormGroups(katalog,ctx.families,l2,rows),counts:count(rows),reihen,formatreihen,materials,bestand:bestandInfo,notes,startDesignSummary,filter:{reihe,material,status,freigabe,startDesigns},rows:filtered,minTextMm:MIN_TEXT_MM};
}
// Count only assigned target masters with a compatible size, never stock aliases or invented series.
// No SVG/font conversion is needed: this is shape/size compatibility, not a review or approval.
function availableFormGroups(katalog,families,masters,rows){
 const targets=new Map(rows.filter(row=>row.lieferform2).map(row=>[JSON.stringify([row.lieferform2.reihe,row.id]),new Set((row.ziele??[]).map(target=>target.familie))]));
 return families.flatMap(family=>{
  const groups=new Map(family.groups.filter(group=>family.sizes.some(size=>size.groupKey===group.key)).map(group=>[group.key,{familyId:family.id,familyName:family.name,groupKey:group.key,groupName:group.name,shape:group.shape,count:0}]));
  const sizeGroups=new Map(family.sizes.map(size=>[size.key,size.groupKey]));
  const assigned=masters.filter(master=>targets.get(JSON.stringify([master.seriesFolder,master.id]))?.has(family.id));
  for(const entry of assignTargetSeries(family,assigned,katalog))for(const key of new Set(entry.sizes.map(size=>sizeGroups.get(size))))groups.get(key).count++;
  return [...groups.values()];
 });
}
// Bestätigte oder eindeutig aufgelöste Legacy-Ziele bestimmen die Linienzugehörigkeit.
function designOfLine(ctx,d){return cachedTargetsOf(d,ctx.katalog).some(target=>ctx.line.families.includes(target.familie));}

// ---- Dateien unter designs/ (SVG/PNG-Vorschau) ----
export function designFile(root,{reihe=null,bestand=null,id,file}){
 const katalog=katalogFor(root);root=katalog.root;
 if(!DESIGN_FILES.includes(file))fail(404,'design_file','Unbekannte Designdatei.');
 if(!validSegment(id)||(reihe!==null&&!validSegment(reihe))||(bestand!==null&&!validSegment(bestand))||(reihe===null)===(bestand===null))fail(404,'design_file','Ungültiger Designpfad.');
 if(reihe!==null&&(reihe.startsWith('_')||reihe==='bestand'))fail(404,'design_file','Ungültiger Designpfad.');
 const designsRoot=fs.realpathSync(path.join(root,'designs')),dir=reihe!==null?path.join(designsRoot,reihe,id):path.join(designsRoot,'bestand','boegen',bestand,id);
 let real;try{real=fs.realpathSync(path.join(dir,file));}catch{fail(404,'design_file','Datei nicht vorhanden.');}
 const within=path.relative(designsRoot,real);
 if(within.startsWith('..')||path.isAbsolute(within)||!exists(real))fail(404,'design_file','Datei nicht vorhanden.');
 return {file:real,type:file.endsWith('.png')?'image/png':'image/svg+xml; charset=utf-8'};
}

// ---- Rückschreiben (nur menschliche Änderungen: name, themes, hidden) ----
// Ein Feld der obersten Ebene im JSON-Text ersetzen (Zeile ` "key": …`), damit die Datei sonst
// unverändert bleibt (Python schreibt 70.0, JSON.stringify 70 – der Git-Diff soll nur die Änderung zeigen).
function replaceTopLevel(text,key,value){
 const indent=text.match(/^\{\r?\n( +)"/)?.[1]??' ',valueText=JSON.stringify(value,null,indent).split('\n').map((l,i)=>i?indent+l:l).join('\n');
 const line=indent+JSON.stringify(key)+': ';
 const start=text.indexOf('\n'+line);
 if(start<0){// Feld fehlt: vor der schließenden Klammer ergänzen
  const end=text.lastIndexOf('}');if(end<0)return null;
  const before=text.slice(0,end).replace(/\s+$/,''),needsComma=!before.endsWith('{');
  return before+(needsComma?',':'')+'\n'+line+valueText+'\n'+text.slice(end);
 }
 // Ende des Werts: nächste Zeile, die mit `indent"` (nächstes Feld) oder `}` (Ende) beginnt
 const rest=text.slice(start+1),m=rest.match(new RegExp('\\n(?='+indent+'"|\\}\\s*$)'));
 if(!m)return null;
 const valueEnd=start+1+m.index,hadComma=/,\s*$/.test(rest.slice(0,m.index));
 return text.slice(0,start+1)+line+valueText+(hadComma?',':'')+text.slice(valueEnd);
}
function rewriteJson(file,changes){
 const text=fs.readFileSync(file,'utf8'),parsed=JSON.parse(text.replace(/^﻿/,''));
 const expected={...parsed};for(const [k,v] of Object.entries(changes))expected[k]=v;
 let next=text;for(const [k,v] of Object.entries(changes)){next=next===null?null:replaceTopLevel(next,k,v);}
 let ok=false;try{ok=next!==null&&JSON.stringify(JSON.parse(next))===JSON.stringify(expected);}catch{ok=false;}
 if(!ok)next=JSON.stringify(expected,null,1)+'\n';// Rückfall: vollständig neu schreiben (gleicher Inhalt)
 return next;
}
const shortKey=id=>{const m=id.match(/-(D\d+)$/);return m?m[1]:null;};
export function patchDesign(root,input,options={}){return withKatalogWriteLock(root,root=>patchDesignLocked(root,input,options));}
function patchDesignLocked(root,input,{actor='werkstatt',now=new Date(),targetReview=null,available={}}={}){
 const katalog=katalogFor(root,{maxAgeMs:0});root=katalog.root;
 if(!record(input))fail(422,'design_patch','Änderung als Objekt senden.');
 const unknown=Object.keys(input).filter(k=>!PATCH_FIELDS.includes(k));if(unknown.length)fail(422,'design_patch','Unbekannte Felder: '+unknown.join(', ')+'. Erlaubt sind name, themes, hidden.');
 if(input.onlyPassing!==undefined&&typeof input.onlyPassing!=='boolean')fail(422,'design_patch','onlyPassing ist true oder false.');
 if(input.onlyPassing===true&&(input.freigegeben!==true||typeof input.checksum!=='string'||!/^[a-f0-9]{64}$/.test(input.checksum)))fail(422,'design_patch','Sammelfreigabe benötigt eine geprüfte Zielvorschau mit aktueller Prüfsumme.');
 const {reihe,designId}=input;
 if(!validSegment(reihe)||reihe.startsWith('_')||reihe==='bestand')fail(422,'design_patch','Formatreihe (Ordner unter designs/) prüfen.');
 if(!validSegment(designId))fail(422,'design_patch','Design-Kennung prüfen.');
 const dir=path.join(root,'designs',reihe,designId),jsonFile=path.join(dir,'design.json');
 if(!isDir(dir)||!exists(path.join(dir,'design.svg')))fail(404,'design_missing','Design „'+designId+'“ hat in „'+reihe+'“ keine Lieferform 2 – nur Lieferform-2-Designs lassen sich hier ändern.');
 if(!exists(jsonFile))fail(404,'design_missing','design.json fehlt für „'+designId+'“.');
 safeKatalogPath(root,'designs/'+reihe+'/'+designId+'/design.json');safeKatalogPath(root,'designs/'+reihe+'/'+designId+'/design.svg');
 safeKatalogPath(root,'designs/'+reihe+'/_aenderungen.jsonl',{missing:true});
 for(const relative of ['designs/'+reihe+'/zuordnung.json','designs/'+reihe+'-zuordnung.json','designs/'+reihe+'/index.json'])safeKatalogPath(root,relative,{missing:true});
 const current=readJson(jsonFile);if(!record(current))fail(422,'design_patch','design.json ist kein Objekt.');
 const changes={};
 if(input.name!==undefined){if(typeof input.name!=='string'||!input.name.trim()||input.name.length>160||/[\x00-\x1f]/.test(input.name))fail(422,'design_patch','Name: 1 bis 160 Zeichen, eine Zeile.');const name=input.name.trim();if(name!==(current.name??null))changes.name={from:current.name??null,to:name};}
 if(input.themes!==undefined){if(!Array.isArray(input.themes)||input.themes.length>20||input.themes.some(t=>typeof t!=='string'))fail(422,'design_patch','themes ist eine Liste von Themen-Kennungen.');const themes=[...new Set(input.themes.map(t=>t.trim().toLowerCase()))];const bad=themes.filter(t=>!katalog.theme(t));if(bad.length)fail(422,'design_patch','Unbekannte Themen: '+bad.join(', ')+' (themen.json).');if(JSON.stringify(themes)!==JSON.stringify(current.themes??null))changes.themes={from:current.themes??null,to:themes};}
 if(input.hidden!==undefined){if(typeof input.hidden!=='boolean')fail(422,'design_patch','hidden ist true oder false.');if(input.hidden!==(current.hidden===true))changes.hidden={from:current.hidden===true,to:input.hidden};}
 // Ziele are authoritative; historical global approval is never widened.
 const master=katalog.designs.masters.find(d=>d.seriesFolder===reihe&&d.id===designId),targets=designTargets(master??current,katalog).map(t=>structuredClone(t));
 let selected=null;
 if(input.zieleHinzufuegen!==undefined){
  if(!Array.isArray(input.zieleHinzufuegen)||!input.zieleHinzufuegen.length||input.zieleHinzufuegen.length>100||input.zieleHinzufuegen.some(id=>typeof id!=='string'||!katalog.families.has(id)))fail(422,'design_patch','Neue Ziele müssen vorhandene Familien sein.');
  if(input.freigegeben!==undefined)fail(422,'design_patch','Ziele bestätigen und freigeben sind getrennte Schritte.');
  for(const familie of new Set(input.zieleHinzufuegen))if(!targets.some(t=>t.familie===familie))targets.push({familie,freigabe:null});
 }
 if(input.freigegeben!==undefined){
  if(typeof input.freigegeben!=='boolean')fail(422,'design_patch','freigegeben ist true oder false.');
  const familyId=input.familie??(targets.length===1?targets[0].familie:null);
  selected=targets.find(t=>t.familie===familyId);if(!selected)fail(422,'design_patch','Ein bestätigtes Ziel für diese Freigabe auswählen.');
  const was=selected.freigabe?.status==='freigegeben';
  if(input.freigegeben!==was){
   if(input.freigegeben){
    const replacements=fontReplacements(root),fonts=(Array.isArray(current.fonts)?current.fonts:[]).filter(f=>typeof f==='string').map(f=>fontStatus(f,katalog,replacements)),missing=fonts.filter(f=>f.status==='fehlt').map(f=>f.name);
    if(missing.length)fail(422,'design_patch','Freigabe nicht möglich: Schrift fehlt ('+missing.join(', ')+').');
    if(!targetReview||targetReview.familie!==familyId||targetReview.fit?.status==='passt nicht')fail(422,'design_patch','Zielpassung muss vor der Freigabe serverseitig geprüft werden.');
    if(input.onlyPassing===true&&targetReview.fit?.status!=='passt')fail(422,'design_patch','Sammelfreigabe nur bei „passt“. Dieses Ziel muss einzeln geprüft werden.');
    if(targetReview.checksum!==designTargetChecksum(master,katalog.families.get(familyId),master.svg(),targetFontVersions(master,katalog,available)))fail(409,'design_conflict','Das Design oder die Familie wurde inzwischen geändert. Vorschau neu öffnen.');
   }
   selected.freigabe={status:input.freigegeben?'freigegeben':'offen',am:now.toISOString(),von:String(actor).slice(0,160)};
  }
 }
 if(JSON.stringify(targets)!==JSON.stringify(designTargets(master??current,katalog)))changes.ziele={from:current.ziele??null,to:targets};
 if(input.name===undefined&&input.themes===undefined&&input.hidden===undefined&&input.freigegeben===undefined&&input.zieleHinzufuegen===undefined)fail(422,'design_patch','Keine Änderung angegeben.');
 const files=[],pending=[];
 const rel=f=>path.relative(root,f).split(path.sep).join('/');
 if(Object.keys(changes).length){
  const jsonChanges={};for(const [k,c] of Object.entries(changes))jsonChanges[k]=c.to;
  if(jsonChanges.hidden===false)jsonChanges.hidden=false;// bleibt ausdrücklich im Dokument (Verlauf im Diff)
  pending.push({relative:rel(jsonFile),text:rewriteJson(jsonFile,jsonChanges)});files.push(rel(jsonFile));
  // Zuordnung (Kundennamen/Themen je Design): im Reihenordner oder daneben; Schlüssel D<n> oder volle Kennung.
  const zuordnungFile=[path.join(root,'designs',reihe,'zuordnung.json'),path.join(root,'designs',reihe+'-zuordnung.json')].find(exists);
  if(zuordnungFile&&(changes.name||changes.themes)){
   const z=readJson(zuordnungFile);
   if(record(z)){
    const key=[designId,shortKey(designId)].find(k=>k&&record(z[k]))??shortKey(designId)??designId;
    const entry=record(z[key])?{...z[key]}:{};
    if(changes.name)entry.name=changes.name.to;
    if(changes.themes&&(entry.themen!==undefined||!record(z[key])))entry.themen=changes.themes.to;
    z[key]=entry;pending.push({relative:rel(zuordnungFile),text:JSON.stringify(z,null,1)+'\n'});files.push(rel(zuordnungFile));
   }
  }
  // Erzeugter Index der Reihe (index.json) bleibt konsistent, wenn er das Design kennt.
  const indexFile=path.join(root,'designs',reihe,'index.json');
  if(exists(indexFile)&&(changes.name||changes.themes)){
   const idx=readJson(indexFile);
   if(Array.isArray(idx)){const e=idx.find(x=>record(x)&&x.key===designId);if(e){if(changes.name)e.name=changes.name.to;if(changes.themes)e.themen=changes.themes.to;pending.push({relative:rel(indexFile),text:JSON.stringify(idx,null,1)+'\n'});files.push(rel(indexFile));}}
  }
  const protocol=path.join(root,'designs',reihe,'_aenderungen.jsonl');
  pending.push({relative:rel(protocol),text:(fs.existsSync(protocol)?fs.readFileSync(protocol,'utf8'):'')+JSON.stringify({at:now.toISOString(),actor:String(actor).slice(0,160),reihe,designId,changes,files})+'\n'});
  writeKatalogTransaction(root,pending);
  files.push(rel(protocol));
  forgetKatalog();
 }
 const after=readJson(jsonFile);
 return {changed:Object.keys(changes).length>0,reihe,designId,changes,files,design:{id:designId,name:after.name??designId,themes:Array.isArray(after.themes)?after.themes:null,hidden:after.hidden===true,released:targets.length>0&&targets.every(t=>t.freigabe?.status==='freigegeben'),freigabe:selected?.freigabe??after.freigabe??null,ziele:targets}};
}

// Offene Änderungen (Protokolle je Reihe) für den Commit durch den Betreiber.
export function pendingChanges(root){
 const base=path.join(root,'designs'),out=[];
 if(!isDir(base))return out;
 for(const reihe of fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort(natural.compare)){
  const file=path.join(base,reihe,'_aenderungen.jsonl');if(!exists(file))continue;
  const entries=fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return {invalid:l};}});
  out.push({reihe,protocol:'designs/'+reihe+'/_aenderungen.jsonl',entries,files:[...new Set(entries.flatMap(e=>e.files||[]))].sort()});
 }
 return out;
}

// The trusted review binds source geometry and family rules to the atomic write.
export function targetFontVersions(master,katalog,available={},cache=null){
 const versions={},names=[...new Set(parseDesignSvg(master.svg()).layers.filter(l=>l.kind==='text'||l.text).map(l=>l.font))];
 for(const name of names){if(available[name]){const key=available[name];if(!cache?.has(key)){const hash=createHash('sha256').update(JSON.stringify(available[name])).digest('hex');cache?.set(key,hash);versions[name]=hash;}else versions[name]=cache.get(key);continue;}
  const meta=katalog.fonts.list.get(name);if(!meta?.file){versions[name]=null;continue;}
  const file=safeKatalogPath(katalog.root,path.relative(katalog.root,meta.file).split(path.sep).join('/'));if(!cache?.has(file)){const hash=createHash('sha256').update(fs.readFileSync(file)).digest('hex');cache?.set(file,hash);versions[name]=hash;}else versions[name]=cache.get(file);
 }
 return versions;
}
const familyJsonText=new WeakMap();// gleiche Prüfsumme wie bisher, Familie nur einmal je geöffnetem Katalog serialisiert
const familyJson=family=>{if(!family||typeof family!=='object')return JSON.stringify(family);let text=familyJsonText.get(family);if(text===undefined){text=JSON.stringify(family);familyJsonText.set(family,text);}return text;};
export function designTargetChecksum(master,family,svgText=master.svg(),versions={}){return createHash('sha256').update(JSON.stringify(master.json)).update(svgText).update(familyJson(family)).update(JSON.stringify(Object.entries(versions).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');}

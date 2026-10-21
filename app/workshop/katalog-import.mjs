// K12 / B1: Import-Lauf Katalog → Werkstatt-DB je Linie. `planKatalogImport` baut je
// Unterkategorie und Größe das Produktdokument (Familie + Vorlagen der Formatreihe des
// Themas) und vergleicht mit dem Bestand (neu / aktualisieren / unverändert / gesperrt),
// ohne zu schreiben. `applyKatalogImport` schreibt den geprüften Plan: Familie in die
// Familienablage (Revision), Produkte über das Import-Journal (`importBatch`) bzw. als neue
// Produktrevision (`save`). Freigabe „importieren“ bleibt beim Nutzer (CLI `--commit`).
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {katalogDesignToTemplate,assignSeries,formatSeries,scaleTemplate,scaleEmbeddedMotifs,templateFit,katalogFamilyToProduct,priceGaps} from './katalog-convert.mjs';
import {FAMILY_MATERIALS,familyReady} from './product-families.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'katalog_import'});};
export const importKey=(lineId,subId,sizeKey)=>'katalog:'+lineId+':'+subId+':'+sizeKey;
// Bestandsdesigns tragen Materialnamen des Servers (Edelstahl/V2A, Acryl, Schiefer, Holz).
const MATERIAL_WORDS={steel:/edelstahl|v2a/i,acrylic:/acryl/i,slate:/schiefer/i};
const materialMatch=(family,design)=>design.source!=='bestand'||!design.materials?.length||design.materials.some(m=>MATERIAL_WORDS[family.material.kind]?.test(m));
const stripFamily=f=>{const {_file,_material,...rest}=f;return structuredClone(rest);};

// Schrift-Set → Schriftprofil der Profilbibliothek. Schriften, die die Werkstatt schon kennt
// (Laufzeitkatalog oder Schriftbibliothek, Abgleich über sha256 der Katalogdatei), werden
// wiederverwendet; sonst wird die Katalogdatei in die Schriftbibliothek importiert (E4-Prüfung;
// ohne Pflichtzeichen bleibt die Schrift draußen und wird gemeldet). Das Profil heißt
// „Schrift-Set <id> (Katalog)“ und bekommt nur bei geänderter Liste eine neue Revision.
export async function ensureFontSet(katalog,fontSet,{fontLibrary=null,profiles=null,runtimeFonts={}}={}){
 const items=[],missing=[],imported=[];
 if(!fontLibrary||!profiles)return {profileId:null,items,missing:fontSet.fonts.filter(n=>!runtimeFonts[n]),imported,available:fontSet.fonts.filter(n=>runtimeFonts[n])};
 for(const name of fontSet.fonts){
  if(runtimeFonts[name]){items.push(name);continue;}
  const meta=katalog.fonts.list.get(name);
  if(!meta?.file){missing.push(name+' (Datei fehlt im Katalog)');continue;}
  const bytes=fs.readFileSync(meta.file),hash=sha(bytes);
  let row=fontLibrary.list().find(r=>r.sha256===hash);
  if(!row){try{row=await fontLibrary.import({name:path.basename(meta.file),bytes:bytes.toString('base64')});imported.push(name);}catch(e){missing.push(name+' ('+e.message+')');continue;}}
  items.push(row.id);
 }
 profiles.registerFonts(fontLibrary.list());
 const name='Schrift-Set '+fontSet.id+' (Katalog)',existing=profiles.list({type:'fonts'}).find(p=>p.name===name);
 let profile=existing;
 if(!existing)profile=profiles.create({name,type:'fonts',items});
 else if(JSON.stringify(existing.items)!==JSON.stringify(items))profile=profiles.save(existing.id,{name,type:'fonts',items},existing.revision);
 return {profileId:profile.id,profileRevision:profile.revision,items,missing,imported,available:fontSet.fonts.filter(n=>!missing.some(m=>m.startsWith(n+' ')))};
}

export async function planKatalogImport(katalog,lineId,{repository,families,bestand=null,available={},converter=null,fontLibrary=null,profiles=null,assets=null}={}){
 const line=katalog.lines.get(lineId);if(!line)fail('Linie „'+lineId+'“ ist im Katalog nicht vorhanden ('+[...katalog.lines.keys()].join(', ')+').');
 const report={line:{id:line.id,name:line.name,status:line.status??null,file:katalog.files.get('linie:'+line.id)},families:[],subcategories:[],designs:{masters:katalog.designs.masters.length,bestand:0,considered:0,withSeries:0,oldSize:[],withoutTheme:0,failed:[]},counts:{products:0,new:0,update:0,unchanged:0,blocked:0,templates:0,sizes:0,pricesOpen:0,designsWithoutSeries:0,fit:{passt:0,'prüfen':0,'passt nicht':0}},notes:[]};
 if(!line.families.length)report.notes.push('Linie „'+line.id+'“ hat noch keine Familie (Status: '+(line.status??'offen')+').');
 const designs=[...katalog.designs.masters];
 if(bestand){const list=katalog.designs.bestand(bestand);report.designs.bestand=list.length;designs.push(...list);}
 const items=[],familyPlans=[],fontSets=new Map(),seenDesigns=new Map();
 for(const familyId of line.families){
  const family=katalog.families.get(familyId),doc=stripFamily(family);
  const ready=familyReady(doc),series=formatSeries(doc),assigned=assignSeries(doc,designs.filter(d=>materialMatch(doc,d)));
  const priceOpen=doc.sizes.flatMap(s=>priceGaps(doc,s));
  const existing=families?.list().find(f=>f.id===familyId)?families.get(familyId):null;
  const familyAction=!existing?'neu':JSON.stringify(existing.document)===JSON.stringify(doc)?'unverändert':'aktualisieren';
  const revision=existing?existing.revision+(familyAction==='aktualisieren'?1:0):1;
  familyPlans.push({id:familyId,document:doc,action:familyAction,expectedRevision:existing?.revision??null,revision});
  const old=assigned.filter(a=>a.oldSize).map(a=>a.design.id);
  // Je Design über alle Familien der Linie: „ohne Reihe“ nur, wenn es in keine Reihe passt.
  for(const a of assigned){const d=seenDesigns.get(a.design.id)||{series:false,themed:!!a.design.themes};d.series||=!a.oldSize;seenDesigns.set(a.design.id,d);}
  report.families.push({id:familyId,name:doc.name,file:katalog.files.get('familie:'+familyId),material:FAMILY_MATERIALS[doc.material.kind].name,action:familyAction,revision,sizes:doc.sizes.length,series:series.map(r=>({key:r.key,sizes:r.sizes.length,designs:assigned.filter(a=>a.series===r.key).length})),ready:ready.ready,reason:ready.ready?null:ready.reason,pricesOpen:priceOpen,designsOldSize:old.length});
  report.counts.sizes+=doc.sizes.length;report.counts.pricesOpen+=priceOpen.length;
  for(const sub of line.subcategories){
   const theme=sub.themeId?katalog.theme(sub.themeId):null,fontSet=katalog.fontSet(sub,theme);
   const hasPhotoField=d=>Array.isArray(d.json?.photos)?d.json.photos.length>0:/class="[^"]*\bfoto\b/.test(d.svg?.()||'');
   const photoMatch=a=>sub.photoDesigns==null||(sub.photoDesigns==='mit')===hasPhotoField(a.design);
   const themed=assigned.filter(a=>!a.oldSize&&(a.design.themes?a.design.themes.includes(sub.themeId):false)&&photoMatch(a));
   const withoutTheme=assigned.filter(a=>!a.oldSize&&!a.design.themes).length;
   // Schrift-Set als Profil (nicht je Produkt eingebettet); Glyphen nur für Vorlagenschriften.
   const setKey=fontSet.id??'ohne';if(!fontSets.has(setKey))fontSets.set(setKey,await ensureFontSet(katalog,{id:setKey,fonts:fontSet.fonts},{fontLibrary,profiles,runtimeFonts:available}));
   const set=fontSets.get(setKey);
   const {fonts,missing:glyphsMissing}=await katalog.fontResources([...new Set(themed.flatMap(a=>a.design.fonts||[]))],{available,converter});
   const subReport={id:sub.id,name:sub.name,family:familyId,themeId:sub.themeId??null,fontSet:fontSet.id,fontProfileId:set.profileId,fonts:{set:fontSet.fonts,missing:set.missing,imported:set.imported,templateFontsMissing:glyphsMissing},designs:themed.length,designsWithoutTheme:withoutTheme,products:[]};
   const converted=new Map();
   const templateFor=async a=>{
    if(converted.has(a.design.id))return converted.get(a.design.id);
    let result;try{result={ok:true,...katalogDesignToTemplate(a.design,doc,theme,{fonts})};}catch(e){result={ok:false,error:e.message};report.designs.failed.push({design:a.design.id,subcategory:sub.id,error:e.message});}
    // Platzhalterbilder (Musterfoto mit Upload-Hinweis) als Werkstatt-Designressource; ohne Ablage bleibt das Fotofeld neutral.
    if(result.ok&&result.placeholders?.length&&assets&&a.design.dir){
     result.examples=[];
     for(const ph of result.placeholders){
      const file=path.join(a.design.dir,ph.file);
      if(!fs.existsSync(file)){report.notes.push(a.design.id+': Platzhalterbild '+ph.file+' fehlt.');continue;}
      try{const asset=await assets.importPhotoExample({bytes:fs.readFileSync(file).toString('base64'),widthMm:ph.widthMm,heightMm:ph.heightMm});result.examples.push({slotId:ph.slotId,assetId:asset.assetId});}
      catch(e){report.notes.push(a.design.id+': Platzhalterbild nicht übernommen – '+e.message);}
     }
    }
    converted.set(a.design.id,result);return result;
   };
   const offered=Array.isArray(sub.sizesOffered)?doc.sizes.filter(s=>sub.sizesOffered.includes(s.key)):doc.sizes;
   for(const size of offered){
    const key=importKey(line.id,sub.id,size.key),entry={key,sizeKey:size.key,label:size.label,templates:[],fit:{passt:0,'prüfen':0,'passt nicht':0},excluded:[]};
    const templates=[];
    for(const a of themed.filter(a=>a.sizes.includes(size.key))){
     const t=await templateFor(a);if(!t.ok)continue;
     try{
      const scaled=scaleTemplate(t.template,t.template.katalog.plateMm,[size.widthMm,size.heightMm],fonts),motifs=scaleEmbeddedMotifs(t.motifs,scaled.katalog.scale);
      const fit=templateFit(scaled,doc,size,fonts);entry.fit[fit.status]++;report.counts.fit[fit.status]++;
      if(fit.status==='passt nicht'){entry.excluded.push({design:a.design.id,issues:fit.issues});continue;}
      scaled.katalog.fit=fit.status;if(fit.issues.length)scaled.katalog.review=fit.issues;
      templates.push({template:scaled,motifs,rights:t.rights,examples:t.examples});entry.templates.push({design:a.design.id,fit:fit.status,issues:fit.issues});
     }catch(e){entry.excluded.push({design:a.design.id,issues:[e.message]});}
    }
    try{
     const product=katalogFamilyToProduct(doc,line,sub,{size,theme,fontSet:{...fontSet,available:set.available},fontProfileId:set.profileId,fonts,templates,revision});
     const prior=repository.importItem(key),current=prior?repository.get(prior.id):null;
     const action=!prior?'neu':JSON.stringify(current.document)===JSON.stringify(product.document)?'unverändert':'aktualisieren';
     Object.assign(entry,{action,productId:prior?.id??null,productRevision:current?.revision??null,name:product.document.name,fontsMissing:product.fontsMissing});
     items.push({key,fingerprint:sha(key),document:product.document,action,productId:prior?.id??null,expectedRevision:current?.revision??null});
     report.counts[action==='neu'?'new':action==='aktualisieren'?'update':'unchanged']++;report.counts.templates+=templates.length;
    }catch(e){entry.action='gesperrt';entry.reason=e.message;report.counts.blocked++;}
    report.counts.products++;subReport.products.push(entry);
   }
   report.subcategories.push(subReport);
  }
 }
 report.designs.considered=seenDesigns.size;
 report.designs.oldSize=[...seenDesigns].filter(([,d])=>!d.series).map(([id])=>id);
 report.designs.withSeries=seenDesigns.size-report.designs.oldSize.length;
 report.designs.withoutTheme=[...seenDesigns.values()].filter(d=>d.series&&!d.themed).length;
 report.counts.designsWithoutSeries=report.designs.oldSize.length;
 return {line:line.id,families:familyPlans,items,report,token:sha(JSON.stringify({line:line.id,items:items.map(i=>[i.key,i.action,sha(JSON.stringify(i.document))])}))};
}

export function applyKatalogImport(plan,{repository,families}){
 const results={families:[],products:[]};
 for(const f of plan.families){
  // Wiederholter Lauf desselben Plans: bereits gleich angelegte Familie ist kein Fehler.
  const current=f.action==='neu'&&families.list().some(x=>x.id===f.id)?families.get(f.id):null;
  if(current&&JSON.stringify(current.document)===JSON.stringify(f.document))results.families.push({id:f.id,action:'unverändert',revision:current.revision});
  else if(f.action==='neu')results.families.push({id:f.id,action:'neu',revision:families.create(f.document).revision});
  else if(f.action==='aktualisieren')results.families.push({id:f.id,action:'aktualisieren',revision:families.save(f.id,f.document,f.expectedRevision).revision});
  else results.families.push({id:f.id,action:'unverändert',revision:f.revision});
 }
 const fresh=plan.items.filter(i=>i.action==='neu');
 for(let i=0;i<fresh.length;i+=100)for(const r of repository.importBatch(fresh.slice(i,i+100).map(({key,fingerprint,document})=>({key,fingerprint,document}))))results.products.push({key:r.key,id:r.id,action:r.created?'neu':'vorhanden'});
 for(const item of plan.items.filter(i=>i.action==='aktualisieren')){
  const saved=repository.save(item.productId,item.document,item.expectedRevision);
  results.products.push({key:item.key,id:saved.id,action:'aktualisiert',revision:saved.revision});
 }
 for(const item of plan.items.filter(i=>i.action==='unverändert'))results.products.push({key:item.key,id:item.productId,action:'unverändert'});
 return results;
}

// Kurzer Bericht (Dry-run) als Text.
export function formatReport(report){
 const lines=[`Linie ${report.line.id} – ${report.line.name}${report.line.status?' ('+report.line.status+')':''}`];
 for(const f of report.families)lines.push(`Familie ${f.id}: ${f.sizes} Größen, ${f.series.length} Formatreihen (${f.series.map(r=>r.key+'·'+r.sizes+'·D'+r.designs).join(', ')}), ${f.action}${f.ready?'':' – nicht erzeugbar: '+f.reason}${f.pricesOpen.length?' – '+f.pricesOpen.length+' offene Preise':''}`);
 for(const s of report.subcategories)lines.push(`Unterkategorie ${s.id} (${s.family}): Thema ${s.themeId??'–'}, Schrift-Set ${s.fontSet??'–'} (${s.fonts.set.length} Schriften${s.fontProfileId?', Profil '+s.fontProfileId:''}${s.fonts.imported?.length?', neu importiert: '+s.fonts.imported.length:''}${s.fonts.missing.length?', fehlen: '+s.fonts.missing.join('; '):''}), Designs ${s.designs}, Produkte ${s.products.length} (neu ${s.products.filter(p=>p.action==='neu').length}, aktualisieren ${s.products.filter(p=>p.action==='aktualisieren').length}, unverändert ${s.products.filter(p=>p.action==='unverändert').length}, gesperrt ${s.products.filter(p=>p.action==='gesperrt').length})`);
 const c=report.counts;
 lines.push(`Summe: ${c.products} Produkte (neu ${c.new}, aktualisieren ${c.update}, unverändert ${c.unchanged}, gesperrt ${c.blocked}), ${c.templates} Vorlagen (passt ${c.fit.passt}, prüfen ${c.fit['prüfen']}, passt nicht ${c.fit['passt nicht']}), ${c.sizes} Größen, ${c.pricesOpen} offene Preise, Designs: ${report.designs.masters} Master + ${report.designs.bestand} Bestand, davon ${report.designs.considered} zum Material passend, mit Reihe ${report.designs.withSeries}, ohne Reihe (alte Größe) ${c.designsWithoutSeries}, ohne Thema ${report.designs.withoutTheme}, nicht umwandelbar ${report.designs.failed.length}`);
 const blocked=report.subcategories.flatMap(s=>s.products.filter(p=>p.action==='gesperrt').map(p=>p.reason));
 for(const [reason,n] of Object.entries(blocked.reduce((m,r)=>(m[r]=(m[r]||0)+1,m),{})).sort((a,b)=>b[1]-a[1]).slice(0,8))lines.push(`  gesperrt ×${n}: ${reason}`);
 for(const [reason,n] of Object.entries(report.designs.failed.reduce((m,f)=>(m[f.error.replace(/^[^:]+: /,'')]=(m[f.error.replace(/^[^:]+: /,'')]||0)+1,m),{})).sort((a,b)=>b[1]-a[1]).slice(0,8))lines.push(`  Design nicht umwandelbar ×${n}: ${reason}`);
 for(const n of report.notes)lines.push('  Hinweis: '+n);
 return lines.join('\n');
}

// One editable source: the catalogue working tree. Profiles are derived by the
// same importer, while published product revisions and designs stay untouched.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {openKatalog,validateFontSet,FONT_SET_ALWAYS} from './katalog-source.mjs';
import {safeKatalogPath,withKatalogWriteLock,writeKatalogTransaction,recoverKatalogIfNeeded} from './katalog-transaction.mjs';
import {forgetKatalog} from './design-dashboard.mjs';
import {ensureFontSet} from './katalog-import.mjs';
import warnings from './font-quality-notes.json' with {type:'json'};
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const setsPath='schriften/sets.json',logPath='schriften/_aenderungen.jsonl';
const effect='Die Auswahl wird im Katalog gespeichert. Im Shop wirkt sie erst nach Synchronisieren und Veröffentlichen des neuen Produktstands. Bestehende Entwürfe und Bestellungen behalten ihren Stand.';

export function createCatalogFontSets({root,profiles,fontLibrary,repository,runtimeFonts={}}){
 const location=()=>typeof root==='function'?root():root;
 function read(){
  const dir=location();recoverKatalogIfNeeded(dir);
  const file=safeKatalogPath(dir,setsPath),bytes=fs.readFileSync(file),document=JSON.parse(bytes),katalog=openKatalog(dir);
  return {dir,file,document,katalog,sourceSha256:hash(bytes)};
 }
 function usage(katalog,setId){
  const themes=katalog.themes.filter(t=>t.fontSet===setId).map(t=>({id:t.id,name:t.name}));
  const subcategories=[];
  for(const line of katalog.lines.values())for(const sub of line.subcategories){
   const theme=sub.themeId?katalog.theme(sub.themeId):null;
   if((sub.fontSet??theme?.fontSet)!==setId)continue;
   subcategories.push({lineId:line.id,id:sub.id,name:sub.name,explicit:sub.fontSet!=null,mainProductCount:sub.mainProducts?.length??0});
  }
  const profile=profiles.catalogFontSet(setId),products=[],exceptions=[];
  for(const row of repository.list({includeArchived:true})){
   const d=row.document,assignment=d.profileAssignments?.fonts;
   const matches=subcategories.some(s=>(d.categoryIds??[]).includes('unterkategorie-'+s.lineId+'-'+s.id));
   const resolved=d.profileAssignments?profiles.resolve(d).sources.fonts:null;
   const follows=profile&&resolved?.profileId===profile.id;
   const item={id:row.id,name:d.name,revision:row.revision,status:row.status};
   if(follows)products.push(item);
   else if(matches)exceptions.push({...item,profileId:resolved?.profileId??assignment?.profileId??null});
  }
  return {themes,subcategories,products,exceptions};
 }
 function quality(katalog,name){
  const meta=katalog.fonts.list.get(name),notes=[];
  if(meta?.glyphException)notes.push(meta.glyphException.reason);
  const finding=warnings.fonts.find(f=>f.name===name);
  if(finding&&meta?.file){try{const file=safeKatalogPath(katalog.root,meta.fileListed);if(hash(fs.readFileSync(file))===finding.sha256)notes.push(...finding.notes);}catch{}}
  if(!runtimeFonts[name]&&!meta?.file)notes.push('Schriftdatei fehlt.');
  return [...new Set(notes)];
 }
 function migration(katalog){
  const all=profiles.list({type:'fonts'}),sets=[...katalog.fonts.sets.keys()];
  return all.filter(p=>!p.source&&/^Schrift-Set .+ \(Katalog\)$/.test(p.name)).map(p=>{
   const setId=p.name.slice(12,-10),matches=all.filter(v=>v.name===p.name&&!v.source),valid=sets.includes(setId)&&matches.length===1&&!profiles.catalogFontSet(setId);
   return {profileId:p.id,revision:p.revision,name:p.name,setId,items:p.items,eligible:valid,reason:valid?'Namenshinweis – Herkunft vor Übernahme prüfen.':'Nicht eindeutig zuordenbar; keine automatische Übernahme.'};
  });
 }
 function list(){
  const s=read(),names=[...s.katalog.fonts.list.keys()],resolved=new Map(),library=fontLibrary.list();
  const item=name=>{if(resolved.has(name))return resolved.get(name);let id=runtimeFonts[name]?name:null;const meta=s.katalog.fonts.list.get(name);if(!id&&meta?.file){const digest=hash(fs.readFileSync(safeKatalogPath(s.dir,meta.fileListed)));id=library.find(r=>r.sha256===digest)?.id??null;}resolved.set(name,id);return id;};
  return {sourceSha256:s.sourceSha256,effect,requiredFonts:[...FONT_SET_ALWAYS],sets:[...s.katalog.fonts.sets.values()].map(set=>{const profile=profiles.catalogFontSet(set.id),items=set.fonts.map(item);return {...set,profile,synchronized:!!profile&&items.every(Boolean)&&JSON.stringify(items)===JSON.stringify(profile.items)};}),fonts:names.map(name=>({name,available:!!runtimeFonts[name]||!!s.katalog.fonts.list.get(name)?.file,notes:quality(s.katalog,name)})),migration:migration(s.katalog)};
 }
 function checked(input){
  const s=read();
  if(!input||input.sourceSha256!==s.sourceSha256)fail(409,'catalog_fontset_stale','Die Schriftgruppen wurden inzwischen geändert. Bitte neu laden; deine Auswahl bleibt erhalten.');
  const set=s.katalog.fonts.sets.get(input.setId);if(!set)fail(404,'catalog_fontset_missing','Schriftgruppe nicht gefunden.');
  validateFontSet({...set,fonts:input.fonts},{known:new Set(s.katalog.fonts.list.keys())});
  const unresolved=migration(s.katalog).filter(p=>p.setId===set.id);if(unresolved.length)fail(409,'catalog_source_unresolved','Bitte zuerst die Herkunft der bestehenden Schriftliste prüfen und übernehmen.');
  for(const name of input.fonts){const meta=s.katalog.fonts.list.get(name);if(!runtimeFonts[name]){if(!meta?.file)fail(422,'catalog_font_missing','Schriftdatei fehlt: '+name);safeKatalogPath(s.dir,meta.fileListed);}}
  return {...s,set};
 }
 function impact(input){
  const s=checked(input),scope=usage(s.katalog,s.set.id),profile=profiles.catalogFontSet(s.set.id);
  // Bind the preview to the exact resources and glyph exceptions converted by
  // the importer; replacing a file during asynchronous conversion invalidates it.
  const resources=input.fonts.map(name=>{const meta=s.katalog.fonts.list.get(name);return runtimeFonts[name]?[name,hash(runtimeFonts[name])]:[name,hash(fs.readFileSync(safeKatalogPath(s.dir,meta.fileListed))),meta.glyphException??null];});
  const detail={setId:s.set.id,name:s.set.name,before:s.set.fonts,after:input.fonts,...scope,profileRevision:profile?.revision??null,effect};
  return {...detail,sourceSha256:s.sourceSha256,token:hash({detail,settings:profiles.settings(),profileId:profile?.id??null,source:s.sourceSha256,resources})};
 }
 async function save(input,{actor='werkstatt'}={}){
  const before=impact(input);if(input.impactToken!==before.token)fail(409,'catalog_fontset_impact','Bitte die aktuellen Auswirkungen vor dem Speichern prüfen.');
  // Font conversion can wait; do it before writing the source/profile. Recheck
  // both catalogue and affected products under the write lock after awaiting.
  const initial=checked(input),prepared=await ensureFontSet(initial.katalog,{id:input.setId,fonts:input.fonts},{fontLibrary,profiles,runtimeFonts,prepareOnly:true});
  if(prepared.missing.length)fail(422,'catalog_font_import','Schriftprüfung fehlgeschlagen: '+prepared.missing.join('; '));
  return withKatalogWriteLock(initial.dir,()=>{
   const current=impact(input);if(current.token!==input.impactToken)fail(409,'catalog_fontset_impact','Der Stand hat sich während der Prüfung geändert. Bitte Auswirkungen neu prüfen.');
   const s=checked(input),changed=JSON.stringify(s.set.fonts)!==JSON.stringify(input.fonts);
   if(changed){
    s.document.sets.find(v=>v.id===s.set.id).fonts=[...input.fonts];
    const log=safeKatalogPath(s.dir,logPath,{missing:true}),prior=fs.existsSync(log)?fs.readFileSync(log,'utf8'):'';
    const entry={at:new Date().toISOString(),actor:String(actor).slice(0,160),action:'fontset',setId:s.set.id,changes:{fonts:{from:s.set.fonts,to:input.fonts}}};
    writeKatalogTransaction(s.dir,[{relative:setsPath,text:JSON.stringify(s.document,null,1)+'\n'},{relative:logPath,text:prior+JSON.stringify(entry)+'\n'}]);forgetKatalog();
   }
   // The catalogue is canonical; sync is idempotent. An I/O failure here must
   // be reported as saved-but-pending, never as a failed source write.
   try{const profile=profiles.syncCatalogFontSet(s.set.id,prepared.items);return {changed,profile,sourceSha256:hash(fs.readFileSync(s.file)),effect,uncommitted:changed,synchronized:true};}
   catch(error){return {changed,sourceSha256:hash(fs.readFileSync(s.file)),effect,uncommitted:changed,synchronized:false,warning:'Im Katalog gespeichert. Die Profilübernahme steht noch aus: '+error.message};}
  });
 }
 function adopt(input){
  return withKatalogWriteLock(location(),()=>{
   const s=read();if(input.sourceSha256!==s.sourceSha256)fail(409,'catalog_fontset_stale','Bitte die Übernahme erneut prüfen.');
   const candidate=migration(s.katalog).find(p=>p.profileId===input.profileId&&p.setId===input.setId&&p.revision===input.expectedRevision);
   if(!candidate?.eligible)fail(409,'catalog_source_unresolved','Die Herkunft ist nicht eindeutig. Keine Übernahme.');
   if(input.confirmOrigin!==true)fail(422,'catalog_origin_confirmation','Bitte die geprüfte Herkunft ausdrücklich bestätigen.');
   return profiles.adoptCatalogFontSet(input.setId,input.profileId,input.expectedRevision);
  });
 }
 return {list,impact,save,adopt};
}

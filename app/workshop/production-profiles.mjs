import {formEngravingSettings} from './form-engraving-proof.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {FORM_MATERIALS} from './form-product.mjs';
import {formPrintSettings} from './form-print-proof.mjs';
export const PRODUCTION_MACHINES=Object.freeze(['Roland LEF-200','Roland MO-240','Mimaki 2513 EX']); // Nutzerangabe 05.10.2026; keine RIP-/Materialfreigabe.
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'production_profile'});};
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail(422,'Fertigungsprofil: Felder fehlen oder sind unbekannt.');};
const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)||required&&!v.trim())fail(422,'Bitte gültige Profilangaben eingeben.');return v.trim();};
export function productionProfileDocument(input){
 exact(input,['name','method','materialId','thicknessMm','machine','rip','notes','output','archived']);
 const d=structuredClone(input);d.name=text(d.name,160,true);d.machine=text(d.machine,200);d.rip=text(d.rip,200);d.notes=text(d.notes,2000);
 if(!['print','engraving'].includes(d.method)||typeof d.archived!=='boolean'||!FORM_MATERIALS.some(m=>m.id===d.materialId)||!Number.isFinite(d.thicknessMm)||d.thicknessMm<=0||d.thicknessMm>100)fail(422,'Verfahren, Material und tatsächliche Stärke sind erforderlich.');
 if(d.method==='print')d.output=formPrintSettings(d.output);
 else{exact(d.output,['mode','dpi','mirror']);d.output=formEngravingSettings(d.output);}
 return d;
}
export function profileBlockers(profile){
 const d=profile.document;return [...(!d.machine?['Die konkrete Maschine ist noch nicht eingetragen.']:[]),...(d.method==='print'?['Gemessenes Druck-/Material-ICC-Profil ist noch nicht angebunden.']:[]),'Reale Maschinenprobe und Fertigungsfreigabe stehen aus.'];
}
export function createProductionProfiles({filename}){
 const db=new DatabaseSync(filename);db.exec(`PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS manufacturing_profiles(id TEXT PRIMARY KEY,revision INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS manufacturing_profile_revisions(profile_id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,sha256 TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(profile_id,revision));
 CREATE TRIGGER IF NOT EXISTS manufacturing_revision_immutable BEFORE UPDATE ON manufacturing_profile_revisions BEGIN SELECT RAISE(ABORT,'Manufacturing revisions are immutable');END;
 CREATE TRIGGER IF NOT EXISTS manufacturing_revision_no_delete BEFORE DELETE ON manufacturing_profile_revisions BEGIN SELECT RAISE(ABORT,'Manufacturing revisions are immutable');END;`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 function get(id,revision){
  if(revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))fail(422,'Ungültiger Profilstand.');
  const row=db.prepare('SELECT r.* FROM manufacturing_profile_revisions r JOIN manufacturing_profiles p ON p.id=r.profile_id WHERE p.id=? AND r.revision=COALESCE(?,p.revision)').get(id,revision??null);if(!row)fail(404,'Fertigungsprofil oder Stand nicht gefunden.');
  const p={id:row.profile_id,revision:row.revision,document:JSON.parse(row.document),sha256:row.sha256,createdAt:row.created_at,productionReady:false};return {...p,blockers:profileBlockers(p)};
 }
 function append(id,rev,d){const json=JSON.stringify(d),hash=createHash('sha256').update(json).digest('hex');db.prepare('INSERT INTO manufacturing_profile_revisions VALUES(?,?,?,?,?)').run(id,rev,json,hash,new Date().toISOString());return get(id,rev);}
 return {get,list:()=>db.prepare('SELECT id FROM manufacturing_profiles ORDER BY rowid DESC').all().map(r=>get(r.id)),
  history:id=>{get(id);return db.prepare('SELECT revision FROM manufacturing_profile_revisions WHERE profile_id=? ORDER BY revision DESC').all(id).map(r=>get(id,r.revision));},
  create:input=>{const d=productionProfileDocument(input);return tx(()=>{const id='mfg_'+randomUUID();db.prepare('INSERT INTO manufacturing_profiles VALUES(?,1)').run(id);return append(id,1,d);});},
  save:(id,input,expected)=>{const d=productionProfileDocument(input);return tx(()=>{const old=get(id);if(!Number.isSafeInteger(expected)||old.revision!==expected)fail(409,'Profil inzwischen geändert. Deine Eingaben bleiben erhalten; bitte aktuellen Stand prüfen.');if(old.document.method!==d.method)fail(422,'Für ein anderes Verfahren bitte ein eigenes Profil anlegen.');db.prepare('UPDATE manufacturing_profiles SET revision=? WHERE id=?').run(old.revision+1,id);return append(id,old.revision+1,d);});},
  resolve:document=>{const ref=document.productionProfile;if(!ref)return null;exact(ref,['id','revision']);const p=get(ref.id,ref.revision),d=p.document;if(d.archived||d.method!==document.processingMethod||d.materialId!==document.material.id||d.thicknessMm!==document.material.thicknessMm)fail(422,'Profilstand passt nicht zu Verfahren, Material oder Stärke beziehungsweise ist archiviert.');return p;},close:()=>db.close()};
}

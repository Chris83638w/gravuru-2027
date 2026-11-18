// Read-only inspection. Run against a consistent COPY/SQLite backup of the
// existing profile DB. Does not migrate, adopt, save, import or publish anything.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function inspectFontSetOrigins({filename,katalogDir,tenantId='gravuru'}){
 const sets=JSON.parse(fs.readFileSync(path.join(katalogDir,'schriften/sets.json'))).sets;
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  const version=db.prepare('PRAGMA user_version').get().user_version;
  if(![2,3].includes(version))throw Error('Expected profile schema v2 or v3; no changes made.');
  const rows=db.prepare('SELECT id,name,revision,type FROM profiles WHERE tenant_id=? AND type=? ORDER BY name,id').all(tenantId,'fonts');
  const origins=version===3?db.prepare('SELECT profile_id,set_id FROM profile_catalog_sources WHERE tenant_id=?').all(tenantId):[];
  const managed=new Map(origins.map(o=>[o.profile_id,o.set_id]));
  const candidates=rows.filter(r=>!managed.has(r.id)&&/^Schrift-Set .+ \(Katalog\)$/.test(r.name)).map(r=>{const setId=r.name.slice(12,-10);return {...r,setId,eligible:sets.some(s=>s.id===setId)&&rows.filter(p=>p.name===r.name&&!managed.has(p.id)).length===1&&!origins.some(o=>o.set_id===setId)};});
  return {readOnly:true,schemaVersion:version,tenantId,profileCount:rows.length,managed:origins,candidates,unmapped:rows.filter(r=>!managed.has(r.id)&&!candidates.some(c=>c.id===r.id)),note:'Names are hints only. Explicit origin verification is required before adoption.'};
 }finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [filename,katalogDir,tenantId='gravuru']=process.argv.slice(2);
 if(!filename||!katalogDir)throw Error('Usage: node scripts/inspect-fontset-origins.mjs <profile-db-copy> <catalogue-directory> [tenant]');
 console.log(JSON.stringify(inspectFontSetOrigins({filename,katalogDir,tenantId}),null,2));
}

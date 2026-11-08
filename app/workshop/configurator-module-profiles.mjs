// Mikail, 08.11.2026: one configurator, reusable module settings per product group.
// These profiles contain permissions, never new production processes or prices.
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {tenantOption} from './tenant.mjs';
import {MODULE_PROFILE_SCHEMA,validateModuleProfile} from '../configurator/variant-m/module-profile.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v));
const hash=v=>createHash('sha256').update(json(v)).digest('hex');
const label=v=>{if(typeof v!=='string'||!v.trim()||v.length>160||/[\x00-\x1f\x7f]/.test(v))fail(422,'module_profile_name','Bitte eine gültige Bezeichnung angeben.');return v.trim();};
const identifier=v=>{if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v))fail(422,'module_profile_id','Ungültige Modulprofil-ID.');return v;};
const revision=v=>{if(!Number.isSafeInteger(v)||v<1)fail(422,'module_profile_revision','Ein fester Profilstand ist erforderlich.');return v;};
function document(input){
 if(!plain(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'name')||!Object.hasOwn(input,'modules'))fail(422,'module_profile_fields','Ein Profil braucht einen Namen und seine Modulschalter.');
 const d={name:label(input.name),modules:structuredClone(input.modules)};
 validateModuleProfile({schema:MODULE_PROFILE_SCHEMA,id:'validation',revision:1,modules:d.modules});return d;
}

/** Shares the tenant's workshop SQLite file. Old revisions are immutable and
 * products carry a pinned snapshot, so saving a profile never mutates products. */
export function createConfiguratorModuleProfiles({filename,tenantId}={}){
 if(typeof filename!=='string'||!filename)throw Error('Modulprofil-Datenbank fehlt.');
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
 const tenant=tenantOption({tenantId}),db=new DatabaseSync(filename);
 db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS configurator_module_profiles(tenant_id TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(tenant_id,id));
 CREATE TABLE IF NOT EXISTS configurator_module_profile_revisions(tenant_id TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,sha256 TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(tenant_id,id,revision));
 CREATE TRIGGER IF NOT EXISTS configurator_module_revision_immutable BEFORE UPDATE ON configurator_module_profile_revisions BEGIN SELECT RAISE(ABORT,'Module profile revisions are immutable');END;
 CREATE TRIGGER IF NOT EXISTS configurator_module_revision_retained BEFORE DELETE ON configurator_module_profile_revisions BEGIN SELECT RAISE(ABORT,'Module profile revisions are immutable');END;`);
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}};
 function get(id,{revision:requested}={}){
  identifier(id);if(requested!==undefined)revision(requested);
  const row=db.prepare('SELECT r.* FROM configurator_module_profile_revisions r JOIN configurator_module_profiles h ON h.tenant_id=r.tenant_id AND h.id=r.id WHERE r.tenant_id=? AND r.id=? AND r.revision=COALESCE(?,h.revision)').get(tenant,id,requested??null);
  if(!row)fail(404,'module_profile_missing','Modulprofil nicht gefunden.');
  const d=JSON.parse(row.document);return {id:row.id,revision:row.revision,document:d,profile:{schema:MODULE_PROFILE_SCHEMA,id:row.id,revision:row.revision,modules:structuredClone(d.modules)},sha256:row.sha256,actor:row.actor,createdAt:row.created_at};
 }
 function append(id,version,d,actor){db.prepare('INSERT INTO configurator_module_profile_revisions VALUES(?,?,?,?,?,?,?)').run(tenant,id,version,json(d),hash(d),label(actor||'werkstatt'),new Date().toISOString());return get(id,{revision:version});}
 return {tenantId:tenant,get,
  list:()=>db.prepare('SELECT id FROM configurator_module_profiles WHERE tenant_id=? ORDER BY rowid DESC').all(tenant).map(r=>get(r.id)),
  history:id=>{get(id);return db.prepare('SELECT revision FROM configurator_module_profile_revisions WHERE tenant_id=? AND id=? ORDER BY revision DESC').all(tenant,id).map(r=>get(id,{revision:r.revision}));},
  create:(input,{actor}={})=>transaction(()=>{const d=document(input),id='cmp_'+randomUUID();db.prepare('INSERT INTO configurator_module_profiles VALUES(?,?,1)').run(tenant,id);return append(id,1,d,actor);}),
  save:(id,input,expectedRevision,{actor}={})=>transaction(()=>{const old=get(id);revision(expectedRevision);if(old.revision!==expectedRevision)fail(409,'module_profile_conflict','Das Modulprofil wurde inzwischen geändert. Bitte neu laden und vergleichen.');const d=document(input);if(old.sha256===hash(d))return old;db.prepare('UPDATE configurator_module_profiles SET revision=revision+1 WHERE tenant_id=? AND id=?').run(tenant,id);return append(id,old.revision+1,d,actor);}),
  close:()=>db.close()
 };
}

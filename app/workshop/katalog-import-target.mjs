import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {DEFAULT_TENANT} from './tenant.mjs';

// Run before createWorkshop: even opening its registry/profiles can write.
function inspect(filename,requiredVersion,kind,tenant){
 if(!fs.existsSync(filename))return {filename,kind,exists:false,requiredVersion,version:null,products:0,tenantProducts:0};
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  const version=db.prepare('PRAGMA user_version').get().user_version;
  let products=0,tenantProducts=0;
  if(kind==='workshop'&&db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='products'").get()){
   products=db.prepare('SELECT count(*) AS n FROM products').get().n;
   const scoped=db.prepare('PRAGMA table_info(products)').all().some(c=>c.name==='tenant_id');
   tenantProducts=scoped?db.prepare('SELECT count(*) AS n FROM products WHERE tenant_id=?').get(tenant).n:tenant===DEFAULT_TENANT?products:0;
  }
  return {filename,kind,exists:true,requiredVersion,version,products,tenantProducts};
 }finally{db.close();}
}
export function inspectImportTarget(filename,{tenantId=DEFAULT_TENANT}={}){
 if(filename===':memory:')return {filename,tenantId,products:0,tenantProducts:0,databases:[]};
 const target=path.resolve(filename),databases=[inspect(target,4,'workshop',tenantId),inspect(path.join(path.dirname(target),'profiles.sqlite'),2,'profiles',tenantId)];
 return {filename:target,tenantId,products:databases[0].products,tenantProducts:databases[0].tenantProducts,databases};
}
export function checkImportTarget(filename,{migrate=false,tenantId=DEFAULT_TENANT,log=console.log}={}){
 const target=inspectImportTarget(filename,{tenantId});
 log('Import-Zieldatei: '+target.filename);
 log('Mandant: '+target.tenantId+' · Produktanzahl im Zielspeicher: '+target.products+' (einschließlich Master; davon Mandant: '+target.tenantProducts+')');
 for(const db of target.databases)log(db.kind+': '+db.filename+' · '+(db.exists?'Schema '+db.version:'neue Datei')+' · benötigt '+db.requiredVersion);
 const newer=target.databases.filter(db=>db.exists&&db.version>db.requiredVersion);
 if(newer.length)throw Object.assign(Error('Import abgebrochen: neuere Datenbankversion – '+newer.map(db=>db.filename+' (Schema '+db.version+')').join('; ')),{code:'unsupported_database_version'});
 const old=target.databases.filter(db=>db.exists&&db.version<db.requiredVersion);
 if(old.length&&!migrate)throw Object.assign(Error('Import abgebrochen: bestehende Datenbank benötigt Migration – '+old.map(db=>db.filename+' (Schema '+db.version+' → '+db.requiredVersion+')').join('; ')+'. Erst Zieldatei und Sicherung prüfen; nur mit ausdrücklichem --migrieren fortfahren.'),{code:'katalog_import_migration_required'});
 if(old.length)log('Migration mit --migrieren ausdrücklich angefordert: '+old.map(db=>db.filename).join(', '));
 return target;
}

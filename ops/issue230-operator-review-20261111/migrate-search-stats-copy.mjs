import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {copyPath,argumentsOf,isCLI,printResult} from './copy-guard.mjs';

const legacy=['tenant','day','product_group','term','source','searches','without_results'];
const modern=['tenant','day','product_group','term','source','search_kind','searches','without_results'];
const stringify=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v);
const sha=value=>createHash('sha256').update(value).digest('hex');
function snapshot(file){
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000; BEGIN');
  const columns=db.prepare('PRAGMA table_info(motif_search_daily)').all(),names=columns.map(c=>c.name),hasKind=names.includes('search_kind');
  if(stringify(names)!==stringify(hasKind?modern:legacy))throw Error('Statistiktabelle fehlt oder hat ein unbekanntes Schema; vor jeder Mutation abgebrochen.');
  const key=columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
  if(key.join(',')!=='tenant,day,product_group,term,source'+(hasKind?',search_kind':''))throw Error('Unbekannter Statistikschlüssel.');
  const custom=db.prepare("SELECT name FROM sqlite_schema WHERE (tbl_name='motif_search_daily' AND type<>'table' AND sql IS NOT NULL) OR name='motif_search_daily_with_kind'").all();
  if(custom.length)throw Error('Zusätzliche Statistikobjekte oder Migrationstabelle vorhanden; manuell prüfen.');
  const read=db.prepare(`SELECT tenant,day,product_group,term,source,${hasKind?'search_kind':"'motif' AS search_kind"},searches,without_results FROM motif_search_daily ORDER BY tenant,day,product_group,term,source${hasKind?',search_kind':''}`);read.setReadBigInts(true);
  const digest=createHash('sha256');let rows=0,searches=0n,withoutResults=0n,motifRows=0,designRows=0;
  for(const row of read.iterate()){digest.update(stringify(row)+'\n');rows++;searches+=row.searches;withoutResults+=row.without_results;if(row.search_kind==='motif')motifRows++;else if(row.search_kind==='design')designRows++;else throw Error('Unbekannte Suchart.');}
  const otherSchema=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE tbl_name<>'motif_search_daily' ORDER BY type,name").all();
  const result={columns:names,primaryKey:key,rows,motifRows,designRows,searches:String(searches),withoutResults:String(withoutResults),normalizedRowsSha256:digest.digest('hex'),otherSchemaSha256:sha(stringify(otherSchema))};
  db.exec('COMMIT');return result;
 }finally{db.close();}
}
export async function migrateSearchStatsCopy({copy,confirmation,codeRoot,moduleSha256,expectedRows=8}){
 const file=copyPath(copy,{confirmation,write:true});
 if(!Number.isSafeInteger(expectedRows)||expectedRows<0)throw Error('Erwartete Zeilenzahl muss ausdrücklich nichtnegativ sein.');
 if(typeof codeRoot!=='string'||!path.isAbsolute(codeRoot)||!/^[a-f0-9]{64}$/.test(moduleSha256||''))throw Error('Absolutes --code-root und belegtes --module-sha256 sind erforderlich.');
 const moduleFile=path.join(fs.realpathSync(codeRoot),'app/workshop/motif-search-stats.mjs'),actualHash=sha(fs.readFileSync(moduleFile));
 if(actualHash!==moduleSha256)throw Error('Suchstatistik-Modul stimmt nicht mit dem bestätigten Codehash überein.');
 const before=snapshot(file);if(before.rows!==expectedRows)throw Error('Zeilenzahl weicht vom bestätigten Bestand ab; keine Migration.');
 // Exact public application entry point. It migrates all tenants in this one
 // table; no record/report call and no createWorkshop/repository constructor.
 const {createMotifSearchStats}=await import(pathToFileURL(moduleFile).href);
 let stats;try{stats=createMotifSearchStats({filename:file,tenantId:'gravuru'});}finally{stats?.close();}
 const after=snapshot(file);
 for(const key of ['rows','motifRows','designRows','searches','withoutResults','normalizedRowsSha256','otherSchemaSha256'])if(before[key]!==after[key])throw Error('Nachprüfung fehlgeschlagen: '+key+'. Kopie verwerfen, Live-Datei nicht ändern.');
 if(after.columns.join(',')!==modern.join(',')||after.primaryKey.join(',')!=='tenant,day,product_group,term,source,search_kind')throw Error('Neues Schema fehlt.');
 return {copyOnly:true,moduleSha256:actualHash,entryPoint:'createMotifSearchStats({filename: copy, tenantId: "gravuru"}); stats.close()',alreadyMigrated:before.columns.includes('search_kind'),before,after,exactHistoricalRowsPreserved:true,otherSchemaUnchanged:true,eventsWritten:0,limits:['No live database opened. This result applies only to the explicitly supplied copy.','Keep the original consistent backup unchanged. Do not run the old seven-column writer against this schema.','No application startup, products, bindings, orders or authorizations are invoked.']};
}
if(isCLI(import.meta.url))try{
 const a=argumentsOf(process.argv.slice(2),['--copy','--confirm-copy','--code-root','--module-sha256','--expected-rows']);
 if(a['--expected-rows']===undefined||!/^\d+$/.test(a['--expected-rows']))throw Error('--expected-rows muss ausdrücklich angegeben werden (bestätigter Bestand: 8).');
 printResult(await migrateSearchStatsCopy({copy:a['--copy'],confirmation:a['--confirm-copy'],codeRoot:a['--code-root'],moduleSha256:a['--module-sha256'],expectedRows:Number(a['--expected-rows'])}));
}catch(error){console.error(error.message);process.exitCode=1;}

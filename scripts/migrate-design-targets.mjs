// Explicit catalogue path, dry-run by default. Each JSON + audit entry is one
// recoverable transaction under the shared catalogue lock. An interrupted batch
// can be rerun: already migrated designs retain their exact target approvals.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {planDesignTargetMigration} from '../app/workshop/design-targets.mjs';
import {safeKatalogPath,withKatalogWriteLock,writeKatalogTransaction} from '../app/workshop/katalog-transaction.mjs';
const fail=(message,status=422)=>{throw Object.assign(Error(message),{status,code:'design_target_migration'});};
function addTargets(text,targets){
 const json=JSON.parse(text.replace(/^\uFEFF/,''));if(Object.hasOwn(json,'ziele'))fail('Bereits migrierten Stand nicht überschreiben.');
 const end=text.lastIndexOf('}');if(end<0)fail('Ungültiges design.json.');const before=text.slice(0,end).trimEnd();
 const next=before+(Object.keys(json).length?',':'')+'\n "ziele": '+JSON.stringify(targets,null,1).replaceAll('\n','\n ')+'\n}\n';
 if(JSON.stringify(JSON.parse(next.replace(/^\uFEFF/,'')))!==JSON.stringify({...json,ziele:targets}))fail('Zielmigration verändert bestehende Designdaten.');
 return next.replaceAll('\r\n','\n');
}
export function migrateDesignTargets(root,{apply=false,actor='migrate-design-targets',now=new Date(),beforeReplace}={}){
 if(typeof root!=='string'||!root.trim())fail('Ein ausdrücklicher Katalogpfad ist erforderlich.');
 root=fs.realpathSync(path.resolve(root));
 if(typeof actor!=='string'||!actor.trim()||actor.length>160||/[\x00-\x1f]/.test(actor))fail('Urheber für das Protokoll prüfen.');
 const run=resolved=>{
  const katalog=openKatalog(resolved),report=planDesignTargetMigration(katalog),written=[];
  if(!apply)return {...report,mode:'dry-run',written};
  const masters=new Map(katalog.designs.masters.map(d=>[d.id,d]));
  const pending=report.rows.filter(row=>row.status==='ready').map(row=>{
   const design=masters.get(row.id),relative=path.relative(resolved,path.join(design.dir,'design.json')).split(path.sep).join('/'),file=safeKatalogPath(resolved,relative,{missing:true}),svg=path.relative(resolved,design.svgFile).split(path.sep).join('/');
   safeKatalogPath(resolved,svg);const logRelative='designs/'+row.reihe+'/_aenderungen.jsonl';safeKatalogPath(resolved,logRelative,{missing:true});
   const text=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'{}\n';return {row,relative,text:addTargets(text,row.targets),logRelative};
  });
  for(const item of pending){
   const {row,relative,text,logRelative}=item,logFile=safeKatalogPath(resolved,logRelative,{missing:true});
   const entry={at:now.toISOString(),actor,action:'migrate-design-targets',reihe:row.reihe,designId:row.id,changes:{ziele:{from:null,to:row.targets}},legacyFreigabePreserved:true,files:[relative]};
   const log=(fs.existsSync(logFile)?fs.readFileSync(logFile,'utf8'):'')+JSON.stringify(entry)+'\n';
   const files=writeKatalogTransaction(resolved,[{relative,text},{relative:logRelative,text:log}],{beforeReplace:(file,index)=>beforeReplace?.(file,index,row)});
   written.push({id:row.id,reihe:row.reihe,files});
  }
  return {...report,mode:'applied',written};
 };
 if(apply)return withKatalogWriteLock(root,run);
 if(fs.existsSync(path.join(root,'designs/.werkstatt-write-journal.json')))fail('Unterbrochene Katalogtransaktion: vor einem verlässlichen Dry-run zuerst wiederherstellen.',409);
 return run(root);
}
function argumentsFor(argv){
 const result={apply:false};
 for(let i=0;i<argv.length;i++){
  const [name,inline]=argv[i].split(/=(.*)/s);if(name==='--apply'){if(inline!==undefined)fail('--apply hat keinen Wert.');result.apply=true;continue;}
  if(!['--katalog','--json','--actor'].includes(name))fail('Unbekanntes Argument: '+name);
  const value=inline??argv[++i];if(!value||value.startsWith('--'))fail('Wert fehlt für '+name);const key=name.slice(2);if(result[key]!==undefined)fail('Argument doppelt: '+name);result[key]=value;
 }
 if(!result.katalog)fail('Pfad ausdrücklich angeben: --katalog <pfad> [--apply].');return result;
}
export function main(argv=process.argv.slice(2)){
 const args=argumentsFor(argv),root=fs.realpathSync(path.resolve(args.katalog));
 // A report must never overwrite catalogue source, even during a dry-run.
 if(args.json){const reportPath=path.resolve(args.json),parent=fs.realpathSync(path.dirname(reportPath)),real=path.join(parent,path.basename(reportPath)),rel=path.relative(root,real);if(fs.existsSync(reportPath)){const st=fs.lstatSync(reportPath);if(st.isSymbolicLink()||!st.isFile()||st.nlink>1)fail('Bericht benötigt eine reguläre, unverknüpfte Datei.');}if(!rel||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))fail('Bericht außerhalb des Katalogordners speichern.');args.json=real;}
 const report=migrateDesignTargets(root,{apply:args.apply,...(args.actor?{actor:args.actor}:{})});
 if(args.json)fs.writeFileSync(path.resolve(args.json),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({mode:report.mode,counts:report.counts,written:report.written.length,blocked:report.rows.filter(r=>r.status==='blocked').map(r=>({id:r.id,issues:r.issues})),note:args.apply?'Keine Freigabe gesetzt. Globale Freigabe bleibt historische Quelle; ziele ist maßgeblich. Blockierte Designs blieben unangetastet.':'Dry-run: keine Dateien geschrieben. --apply migriert nur eindeutig zuordenbare Designs.'},null,2));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {testConfig,privateTestEnvironment,externalPath,verifyStorage,fail} from './config.mjs';

// Explicit one-time installation into NEW private directories only. No runtime
// restart, host setting, credential generation or original-data import here.
try{
  const env=privateTestEnvironment(process.env),config=testConfig(env,{credentials:false});
  if(!config.slateReviewPackage)fail('GRAVURU_SLATE_REVIEW_PACKAGE fehlt.');
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--snapshot')fail('Ein überprüftes Paket mit --snapshot <absoluter Pfad> angeben.');
  const snapshot=externalPath(args[1],'Snapshot');
  if(fs.existsSync(config.data)||fs.existsSync(config.slateReviewPackage))fail('Nur neue, noch nicht vorhandene Schiefer-Daten- und Galerieordner verwenden.');
  const python=env.GRAVURU_BOOTSTRAP_PYTHON;
  if(!python||!path.isAbsolute(python))fail('Absoluten GRAVURU_BOOTSTRAP_PYTHON-Pfad angeben.');
  const result=spawnSync(python,[fileURLToPath(new URL('./slate-review-snapshot.py',import.meta.url)),'install','--snapshot',snapshot,'--data',config.data,'--gallery',config.slateReviewPackage,'--origin',config.origin],{encoding:'utf8',timeout:900000,maxBuffer:1024*1024});
  if(result.status!==0)fail('Schiefer-Snapshot nicht installiert. Neue Zielpfade, vollständige Prüfsummen und Python prüfen; vorhandene Daten werden nicht überschrieben.');
  verifyStorage(config);
  console.log(result.stdout.trim());
}catch(error){console.error(error.message);process.exitCode=1;}

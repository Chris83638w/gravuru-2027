import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {testConfig,privateTestEnvironment,verifyDirectory,verifyStorage,markerValue,DATA_MARKER,PYTHON_MARKER,fail} from './config.mjs';

export function initializeDirectory(directory,marker,expected){
  if(fs.existsSync(directory)&&fs.readdirSync(directory).length){verifyDirectory(directory,marker,expected);return;}
  if(!fs.existsSync(directory))fs.mkdirSync(directory,{mode:0o700});
  fs.chmodSync(directory,0o700);
  fs.writeFileSync(path.join(directory,marker),JSON.stringify(expected)+'\n',{mode:0o600,flag:'wx'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const env=privateTestEnvironment(process.env),config=testConfig(env,{credentials:false});process.umask(0o077);
    const bootstrap=env.GRAVURU_BOOTSTRAP_PYTHON||'/usr/bin/python3';
    if(!path.isAbsolute(bootstrap))fail('GRAVURU_BOOTSTRAP_PYTHON muss ein absoluter Python-3.11+-Programmpfad sein.');
    const run=(binary,args,label)=>{
      const result=spawnSync(binary,args,{encoding:'utf8',timeout:900000,maxBuffer:4*1024*1024});
      if(result.status!==0){
        const reason=result.error?.code==='ETIMEDOUT'?'Zeitlimit von 900 Sekunden erreicht':Number.isInteger(result.status)?'Exitcode '+result.status:'Prozess konnte nicht abgeschlossen werden';
        fail(label+' fehlgeschlagen ('+reason+'). Python/venv/pip, System-Cairo, Speicher und Paketnetzwerk prüfen; keine Fremdumgebung verändern.');
      }
    };
    run(bootstrap,['-c','import sys; assert sys.version_info >= (3,11)'],'Python-Voraussetzung');
    initializeDirectory(config.data,DATA_MARKER,markerValue(config,'private-test-data'));verifyStorage(config);
    initializeDirectory(config.pythonDir,PYTHON_MARKER,markerValue(config,'test-python'));
    if(!fs.existsSync(config.python))run(bootstrap,['-m','venv',config.pythonDir],'Neue Test-Python-Umgebung');
    run(config.python,['-m','pip','install','--disable-pip-version-check','-r',fileURLToPath(new URL('./requirements.txt',import.meta.url))],'Test-Python-Pakete');
    console.log(JSON.stringify({prepared:true,scope:'separate-private-test',serverStarted:false,shopifyConnected:false}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}

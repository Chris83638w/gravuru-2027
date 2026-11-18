import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseFontMaintenanceArguments,readFontMaintenanceConfig,runFontConnectionMaintenance} from './lib/font-connection-maintenance.mjs';

// Explicit invocation only, never imported by either app entry point.
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const controller=new AbortController();
  const stop=()=>controller.abort();
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  try{
    const {filename,request}=parseFontMaintenanceArguments(process.argv.slice(2));
    const config=readFontMaintenanceConfig(filename);
    const result=await runFontConnectionMaintenance({config,request,signal:controller.signal});
    console.log(JSON.stringify(result));
  }catch(error){
    const code=controller.signal.aborted?130:1;
    // If closing an owner failed, exiting this one-shot process is the only
    // safe way to release its OS resources and the lock child's stdin pipe.
    process.stderr.write(JSON.stringify({error:/^(font_|gallery_|shop_binding_)[a-z0-9_]+$/.test(error?.code||'')?error.code:'font_maintenance_failed'})+'\n',()=>process.exit(code));
  }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}

import fs from 'node:fs';
import path from 'node:path';
import {planMotifRightsRevision} from '../app/workshop/motif-rights-revision.mjs';

const usage='node scripts/prepare-motif-rights-revision.mjs --record <private-record.json> --design <id> [--out <new-private-plan.json>]';
try{
 const args=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i];if(!['--record','--design','--out'].includes(key)||!args[i+1]||Object.hasOwn(options,key))throw Error(usage);
  options[key]=args[i+1];
 }
 if(!options['--record']||!options['--design'])throw Error(usage);
 const input=path.resolve(options['--record']),bytes=fs.readFileSync(input);
 const plan=planMotifRightsRevision(JSON.parse(bytes.toString('utf8')),{designId:options['--design']});
 if(options['--out'])fs.writeFileSync(path.resolve(options['--out']),JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
 if(!fs.readFileSync(input).equals(bytes))throw Error('Quelldatei wurde während der Vorbereitung verändert.');
 const {document,...summary}=plan;
 console.log(JSON.stringify({...summary,written:Boolean(options['--out']),liveWrite:false},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}

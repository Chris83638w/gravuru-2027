// Offline preparation only: reads actual native execute/get records supplied by
// the operator; writes a NEW review file. No database, network or Shopify mutation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadNativeFunctions,prepareSixDrafts} from './six-drafts.mjs';
export async function run(argv){
 if(argv.length!==6||argv[0]!=='--native-root'||argv[2]!=='--executed-records'||argv[4]!=='--out')throw Error('Aufruf: --native-root <geprüftes Repo> --executed-records <sechs echte Plan/execute/get-Records.json> --out <neue Reviewdatei.json>');
 const root=path.resolve(argv[1]),input=path.resolve(argv[3]),output=path.resolve(argv[5]);
 if(fs.existsSync(output))throw Error('Reviewausgabe existiert bereits.');
 const records=JSON.parse(fs.readFileSync(input,'utf8')),native=await loadNativeFunctions(root);
 const review=prepareSixDrafts(records,{native});fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({reviewHash:review.reviewHash,groups:6,variants:45,shopifyWrites:0,published:false,output}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});

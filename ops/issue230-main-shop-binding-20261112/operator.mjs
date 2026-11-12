import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {loadPinnedMapping,prepareMainExecution,applyMainExecution,reconcileMainExecution,completeMainCatalogApproval} from './main-operator.mjs';
import {openExecutionJournal,writeNewJson} from './journal.mjs';
const fail=code=>{throw Object.assign(Error(code),{code});};
function argsOf(argv){
 const args={},allowed=['--mode','--connections','--out','--mapping','--plan','--approval','--journal','--step','--execute'];
 for(let i=0;i<argv.length;i+=2){if(!allowed.includes(argv[i])||!argv[i+1]||argv[i+1].startsWith('--')||args[argv[i]])fail('operator_arguments');args[argv[i]]=argv[i+1];}
 if(!['plan','apply','reconcile','finish-catalog'].includes(args['--mode'])||!args['--connections']||!args['--out'])fail('operator_arguments');
 if(args['--mode']!=='plan'&&(!args['--plan']||!args['--approval']||!args['--journal']||args['--execute']!=='yes'))fail('operator_explicit_apply_arguments');
 if(args['--mode']==='reconcile'&&!/^(shop-variants|shop-pricing|bindings:[0-7]|catalog-main-r2)$/.test(args['--step']??''))fail('operator_reconcile_step');
 if(args['--mode']==='plan'&&['--plan','--approval','--journal','--step','--execute'].some(k=>args[k]))fail('operator_plan_is_read_only');
 return args;
}
function regular(filename){const f=path.resolve(filename);if(!fs.statSync(f).isFile()||fs.lstatSync(f).isSymbolicLink())fail('operator_regular_file');return f;}
export async function run(argv,{connect}={}){
 const args=argsOf(argv),mode=args['--mode'],out=path.resolve(args['--out']);
 if(fs.existsSync(out)||!fs.statSync(path.dirname(out)).isDirectory())fail('operator_new_output_required');
 const moduleFile=regular(args['--connections']),mapping=loadPinnedMapping(args['--mapping']??fileURLToPath(new URL('./variant-mapping.preview.json.gz',import.meta.url)));
 const read=file=>JSON.parse(fs.readFileSync(regular(file),'utf8'));
 const plan=mode==='plan'?null:read(args['--plan']),approval=mode==='plan'?null:read(args['--approval']);
 let context,journal;
 try{
  const factory=connect??(await import(pathToFileURL(moduleFile).href)).createConnections;
  if(typeof factory!=='function')fail('operator_connections_factory');
  context=await factory({readOnly:mode==='plan'||mode==='reconcile',mode});
  if(!context?.shopify||!context.native||!context.pricing)fail('operator_connections_missing');
  let result;
  if(mode==='plan')result=await prepareMainExecution({mapping,shopify:context.shopify,native:context.native,pricing:context.pricing});
  else{
   journal=openExecutionJournal(args['--journal'],plan.planHash);
   const input={mapping,plan,approval,journal,execute:true};
   result=mode==='apply'?await applyMainExecution(context,input):mode==='finish-catalog'?await completeMainCatalogApproval(context,input):await reconcileMainExecution(context,{...input,key:args['--step']});
  }
  const receipt=writeNewJson(out,result);return {mode,output:out,...receipt,planHash:result.planHash??plan?.planHash,shopifyProductPublished:false};
 }finally{context?.pricing?.disarm();journal?.close();await context?.close?.();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(JSON.stringify({ok:false,code:error.code??'operator_error',action:'Stop. Inspect the journal; do not repeat an uncertain mutation.'}));process.exitCode=1;});

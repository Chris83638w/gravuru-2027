import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadExistingProductionShopifyReader,loadProductionModuleIdentity} from '../../scripts/lib/gallery-production-private-settings.mjs';
import {openProductionModuleReadonlyTarget} from '../../scripts/lib/gallery-production-readonly-target.mjs';
import {createProductionModulePreflight} from '../../scripts/lib/gallery-production-connection.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
let target;
try{
 const [configFilename,dbFilename,metadataFilename,metadataSha,idsFilename,idsSha,outputFilename]=process.argv.slice(2);
 if(process.argv.length!==9||!path.isAbsolute(outputFilename)||fs.existsSync(outputFilename)||!pin(metadataSha)||!pin(idsSha))fail('preflight_arguments');
 // Exact operator-provided existing private runtime config; no discovery or
 // secret output. Reuse its established app authentication/token provider.
 const shopify=loadExistingProductionShopifyReader(configFilename);
 const expected=loadProductionModuleIdentity({metadataFilename,metadataSha256:metadataSha,originalIdsFilename:idsFilename,originalIdsSha256:idsSha});
 target=openProductionModuleReadonlyTarget({filename:dbFilename,expected});
 const preflight=createProductionModulePreflight({...target,shopify,expected}),proof=await preflight.run();
 fs.writeFileSync(outputFilename,JSON.stringify({...proof,initialMetadataSha256:metadataSha,originalIdsSha256:idsSha},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({ok:true,outputFilename,sha256:sha(fs.readFileSync(outputFilename)),counts:proof.counts,revision:proof.productRevision,pricingRevision:proof.pricingRevision,readOnly:true,shopifyWrites:0,nativeWrites:0}));
}catch(error){console.log(JSON.stringify({ok:false,code:error.code||'production_preflight_failed',readOnly:true,shopifyWrites:0,nativeWrites:0}));process.exitCode=1;}
finally{target?.close();}
function pin(v){return /^[a-f0-9]{64}$/.test(v||'');}

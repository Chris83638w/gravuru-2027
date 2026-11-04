// Read-only compatibility check. Deliberately imports the specified deployed runtime,
// not the preparation checkout. No database or Shopify access.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function checkRuntime(bundle,runtime){
 if(!runtime)throw Error('Die tatsächlich verwendete Server-Laufzeit muss mit --runtime angegeben werden.');
 runtime=fs.realpathSync(runtime);
 const files=['app/workshop/product-model.mjs','app/workshop/shop-preparation.mjs','app/configurator/variant-m/contract.mjs'];
 const hashes=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(runtime,f)))]));
 const {validateProductDocument}=await import(pathToFileURL(path.join(runtime,files[0])));
 const {prepareShopProduct}=await import(pathToFileURL(path.join(runtime,files[1])));
 const products=bundle.products.map(p=>{
  try{
   if(hash(JSON.stringify(p.document))!==p.fingerprint)throw Error('Produktprüfsumme abweichend');
   const document=validateProductDocument(p.document);
   if(!same(document,p.document))throw Error('Laufzeit verändert das native Produktdokument');
   const prepared=prepareShopProduct({id:p.productId,revision:p.revision,status:'draft',document});
   const actual=prepared.variants.map(v=>({options:v.options,priceCents:v.priceCents}));
   const expected=p.variants.map(v=>({options:v.options,priceCents:v.priceCents}));
   if(!same(actual,expected))return {sourceDesignId:p.sourceDesignId,compatible:false,reason:'Serverpreise oder Varianten weichen ab',expected,actual};
   return {sourceDesignId:p.sourceDesignId,compatible:true,variants:actual.length};
  }catch(e){return {sourceDesignId:p.sourceDesignId,compatible:false,reason:e.message};}
 });
 return {schema:'gravuru-slate-runtime-check/v1',runtime,hashes,compatible:products.every(p=>p.compatible),products};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const arg=k=>process.argv[process.argv.indexOf(k)+1];
 try{
  if(!process.argv.includes('--bundle')||!process.argv.includes('--runtime'))throw Error('--bundle <Paket.json.gz> --runtime <aktive Codewurzel> erforderlich.');
  const result=await checkRuntime(JSON.parse(gunzipSync(fs.readFileSync(arg('--bundle')))),arg('--runtime'));
  console.log(JSON.stringify(result));if(!result.compatible)process.exitCode=2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}

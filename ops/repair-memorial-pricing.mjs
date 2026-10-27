import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createShopifyClient,readCredentials} from '../scripts/shop-export.mjs';
import {linkMemorialPricing,patchLegacyPricingModel,patchLegacyPricingCommerce,patchLegacyPricingUX} from '../legacy-patches/memorial-pricing-compat.mjs';
import {patchPreviewManifest} from '../legacy-patches/memorial-editor-compat.mjs';
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];},sha=b=>createHash('sha256').update(b).digest('hex');
for(const k of ['--preview','--runtime','--credentials','--out'])if(!value(k))throw Error(k+' fehlt.');
const preview=fs.realpathSync(value('--preview')),runtime=fs.realpathSync(value('--runtime')),out=path.resolve(value('--out')),backup=value('--backup')&&path.resolve(value('--backup')),apply=args.includes('--apply');
const inside=(child,parent)=>child===parent||child.startsWith(parent+path.sep);
if(fs.existsSync(out)||inside(out,preview)||inside(out,runtime))throw Error('Neue private Ausgabe außerhalb der Laufzeit erforderlich.');
if(apply&&(!backup||fs.existsSync(backup)||inside(backup,preview)||inside(backup,runtime)||inside(backup,out)||inside(out,backup)))throw Error('Neue unabhängige private Sicherung erforderlich.');
const safeRead=(root,rel)=>{const file=path.join(root,rel);let cursor=root;for(const part of rel.split('/')){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('Symlink nicht erlaubt: '+rel);}return fs.readFileSync(file);};
const values=JSON.parse(fs.readFileSync(value('--credentials'),'utf8')).values;
const client=createShopifyClient({credentials:readCredentials(values),maxRetries:1});
async function currentPricing(){
 const result=await client.graphql('{product(id:"gid://shopify/Product/16138083107196"){metafield(namespace:"$app",key:"personalization"){value}}}');
 const raw=result.data?.product?.metafield?.value;if(!raw)throw Error('App-eigener Shopify-Preisvertrag fehlt.');
 return JSON.parse(raw);
}
const pricing=await currentPricing(),modelsBytes=safeRead(preview,'models.json'),bindingBytes=safeRead(preview,'commerce.json');
const linked=linkMemorialPricing(JSON.parse(modelsBytes),JSON.parse(bindingBytes),pricing),plans=[];
const add=(scope,root,rel,after,before=safeRead(root,rel))=>plans.push({scope,rel,file:path.join(root,rel),before,after:Buffer.isBuffer(after)?after:Buffer.from(after.replace(/\r\n/g,'\n')),mode:before===null?0o644:fs.statSync(path.join(root,rel)).mode});
add('preview',preview,'models.json',JSON.stringify(linked.models),modelsBytes);
add('preview',preview,'commerce.json',JSON.stringify(linked.binding),bindingBytes);
for(const [scope,root] of [['preview',preview],['runtime',runtime]]){
 for(const [rel,patch] of [['commerce-model.mjs',patchLegacyPricingModel],['commerce.mjs',patchLegacyPricingCommerce],['ux.mjs',patchLegacyPricingUX]]){
  const name='configurator/variant-m/'+rel,before=safeRead(root,name);add(scope,root,name,patch(before.toString('utf8')),before);
 }
 for(const name of ['legacy-pricing-link.mjs','quantity-tiers.mjs']){
  const rel='configurator/variant-m/'+name;if(fs.existsSync(path.join(root,rel)))throw Error('Preismodul bereits vorhanden.');
  add(scope,root,rel,fs.readFileSync(new URL('../app/configurator/variant-m/'+name,import.meta.url)),null);
 }
}
const manifestFile=preview+'.json';if(fs.lstatSync(manifestFile).isSymbolicLink())throw Error('Manifest-Symlink nicht erlaubt.');
const manifestBefore=fs.readFileSync(manifestFile),manifestAfter=Buffer.from(JSON.stringify(patchPreviewManifest(JSON.parse(manifestBefore),plans.filter(p=>p.scope==='preview').map(p=>({path:p.rel,before:p.before===null?null:sha(p.before),beforeBytes:p.before?.length,after:sha(p.after),bytes:p.after.length}))),null,2)+'\n');
plans.push({scope:'preview',rel:'preview-manifest.json',file:manifestFile,before:manifestBefore,after:manifestAfter,mode:fs.statSync(manifestFile).mode});
fs.mkdirSync(out,{recursive:true,mode:0o700});
for(const p of plans){const dest=path.join(out,p.scope,p.rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,p.after,{flag:'wx',mode:0o600});if(dest.endsWith('.mjs')&&spawnSync(process.execPath,['--check',dest],{encoding:'utf8'}).status!==0)throw Error('Syntaxfehler: '+p.rel);}
const report={schema:'gravuru-memorial-pricing-repair/v1',applied:false,productId:pricing.productId,designRevision:linked.binding.revision,pricingRevision:pricing.revision,variants:linked.binding.variants.length,quantityTiers:pricing.quantityTiers,quantityTierScope:pricing.quantityTierScope,designsChanged:false,shopifyWritten:false,databasesOpened:false,restartRequired:true,files:plans.map(p=>({scope:p.scope,path:p.rel,before:p.before===null?null:sha(p.before),after:sha(p.after)}))};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
if(apply){
 if(JSON.stringify(await currentPricing())!==JSON.stringify(pricing))throw Error('Shopify-Preisstand wurde während der Vorbereitung geändert.');
 for(const p of plans)if(p.before===null?fs.existsSync(p.file):sha(fs.readFileSync(p.file))!==sha(p.before))throw Error('Gleichzeitige Dateiänderung: '+p.rel);
 fs.mkdirSync(backup,{recursive:true,mode:0o700});
 for(const p of plans)if(p.before){const dest=path.join(backup,p.scope,p.rel);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.writeFileSync(dest,p.before,{flag:'wx',mode:0o600});}
 fs.writeFileSync(path.join(backup,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 const changed=[];
 try{
  for(const p of plans){const next=p.file+'.pricing-next';fs.writeFileSync(next,p.after,{flag:'wx',mode:p.mode});fs.renameSync(next,p.file);changed.push(p);}
  for(const p of plans)if(sha(fs.readFileSync(p.file))!==sha(p.after))throw Error('Rückprüfung fehlgeschlagen: '+p.rel);
  report.applied=true;fs.writeFileSync(path.join(backup,'APPLIED.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 }catch(error){for(const p of changed.reverse()){if(sha(fs.readFileSync(p.file))!==sha(p.after))throw Error('Gleichzeitige Änderung verhindert Rücknahme: '+p.rel);if(p.before===null)fs.unlinkSync(p.file);else{const rollback=p.file+'.pricing-rollback';fs.writeFileSync(rollback,p.before,{flag:'wx',mode:p.mode});fs.renameSync(rollback,p.file);}}throw error;}
}
console.log(JSON.stringify({applied:report.applied,designRevision:report.designRevision,pricingRevision:report.pricingRevision,variants:report.variants,files:report.files.length,quantityTiers:report.quantityTiers,shopifyWritten:false}));

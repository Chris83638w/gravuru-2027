// Local build preparation only. No Shopify API calls, deployment or release.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const [source,destination]=process.argv.slice(2).map(p=>path.resolve(p));
if(!source||!destination||fs.existsSync(destination)||source===destination)throw Error('New isolated destination required');
const baseline='1c3c61f';
fs.mkdirSync(destination,{recursive:true});
for(const name of ['shopify.app.toml','package.json','extensions'])fs.cpSync(path.join(source,name),path.join(destination,name),{recursive:true,errorOnExist:true,force:false});
const src=path.join(destination,'extensions/gravuru-personalization-price/src');
const baselineFiles=['master-release/cart_transform_run.mjs','master-release/price-v1.mjs','master-release/legacy-price.mjs','checkout-image/cart-image.mjs'];
for(const name of baselineFiles){const file=path.join(src,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,execFileSync('git',['show',`${baseline}:ops/shopify/${name}`],{cwd:root}));}
fs.copyFileSync(path.join(root,'ops/shopify/master-release/pricing-history.mjs'),path.join(src,'master-release/pricing-history.mjs'));
fs.writeFileSync(path.join(src,'cart_transform_run.graphql'),execFileSync('git',['show',`${baseline}:ops/shopify/checkout-image/cart_transform_run.graphql`],{cwd:root}));
for(const name of ['index.js','cart_transform_run.js'])fs.writeFileSync(path.join(src,name),"export {cartTransformRun} from './master-release/cart_transform_run.mjs';\n");
const hashes=Object.fromEntries([...baselineFiles,'master-release/pricing-history.mjs','cart_transform_run.graphql'].map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join(src,name))).digest('hex')]));
fs.writeFileSync(path.join(destination,'pricing-input-build.json'),JSON.stringify({schema:'gravuru-pricing-input-build/v1',baseline,source,destination,onlyLogicChange:'master-release/pricing-history.mjs',hashes,noDeployment:true,appConfigNeedsFreshActiveVersionComparison:true},null,2)+'\n');
console.log(JSON.stringify({prepared:true,destination,baseline,noDeployment:true}));

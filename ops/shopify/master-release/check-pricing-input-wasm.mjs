// Synthetic local WASM execution. No Shopify mutation or real customer input.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {encodeFunctionPricing} from './pricing-storage.mjs';
const [project,cli,out]=process.argv.slice(2).map(p=>path.resolve(p));
fs.mkdirSync(out,{recursive:true});
const dir=path.join(project,'extensions/gravuru-personalization-price');
const {cartTransformRun}=await import(pathToFileURL(path.join(dir,'src/master-release/cart_transform_run.mjs')));
const productId='gid://shopify/Product/16190784438652';
const variants=Object.fromEntries(Array.from({length:404},(_,i)=>[String(58104613339516+i*32768),1748+i]));
const old={schema:'gravuru-personalization-pricing/v1',enabled:true,productId,revision:1,currency:'EUR',variants,extraMotifCents:169,extraPhotoCents:999};
const raw={...old,schema:'gravuru-personalization-pricing/v2',revision:2,extraLogoCents:1299,history:[structuredClone(old)]},pricing=encodeFunctionPricing(raw).pricing;
function line(id,revision=2,logos=0){return {id,quantity:1,revision:{value:String(revision)},designFile:{value:'synthetic'},motifs:{value:'0'},uploads:{value:'0'},logos:{value:String(logos)},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/58104613339516',product:{id:productId,pricing:{jsonValue:pricing}}}};}
const cases=[{name:'three-steel-lines-404-variants-old-and-new',input:{presentmentCurrencyRate:'1',cart:{lines:[line('old',1),line('new'),line('logo',2,1)]}}}];
cases.push({name:'ordinary-item-no-price-contract',input:{presentmentCurrencyRate:'1',cart:{lines:[{id:'ordinary',quantity:1,merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/1',product:{id:'gid://shopify/Product/1',pricing:null}}}]}}});
const missing=structuredClone(cases[0].input);missing.cart.lines[0].merchandise.product.pricing=null;cases.push({name:'reject-missing-price-contract',input:missing,reject:true});
const dangling=structuredClone(cases[0].input);dangling.cart.lines[0].merchandise.product.pricing.jsonValue.history[0].variantsFromRevision=99;cases.push({name:'reject-dangling-history-map',input:dangling,reject:true});
const report=[];
for(const [i,c] of cases.entries()){
 const file=path.join(out,`input-${i}.json`);fs.writeFileSync(file,JSON.stringify(c.input));
 const r=spawnSync(process.execPath,[cli,'app','function','run','--path',dir,'--input',file,'--json','--no-input'],{encoding:'utf8',timeout:60000});
 fs.writeFileSync(path.join(out,`case-${i}.log`),(r.stdout||'')+(r.stderr||''));
 let result;try{result=JSON.parse(r.stdout.slice(0,r.stdout.indexOf('\n}')+2));}catch{throw Error(`Invalid WASM result ${c.name}`);}
 if(c.reject){assert.notEqual(result.success,true);}
 else{assert.equal(result.success,true);assert.deepEqual(result.output,cartTransformRun(c.input));}
 report.push({name:c.name,passed:true,rejected:!!c.reject,instructions:result.instructions??result.instructionsConsumed??null,inputBytes:fs.statSync(file).size});
}
const wasm=fs.readFileSync(path.join(dir,'dist/function.wasm'));
const proof={compiled:true,noRelease:true,noShopMutation:true,baseline:'1c3c61f',wasm:{bytes:wasm.length,sha256:createHash('sha256').update(wasm).digest('hex')},cases:report};
fs.writeFileSync(path.join(out,'compiled-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));

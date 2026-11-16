// Local WASM execution with synthetic carts and optional private price export.
// No Shopify mutation or real customer input.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {encodeFunctionPricing} from './pricing-storage.mjs';
const [project,cli,out,privatePricing]=process.argv.slice(2).map(p=>path.resolve(p));
fs.mkdirSync(out,{recursive:true});
const dir=path.join(project,'extensions/gravuru-personalization-price');
const {cartTransformRun}=await import(pathToFileURL(path.join(dir,'src/master-release/cart_transform_run.mjs')));
const productId='gid://shopify/Product/16190784438652';
const variants=Object.fromEntries(Array.from({length:404},(_,i)=>[String(58104613339516+i*32768),1748+i]));
const old={schema:'gravuru-personalization-pricing/v1',enabled:true,productId,revision:1,currency:'EUR',variants,extraMotifCents:169,extraPhotoCents:999};
const raw=privatePricing?JSON.parse(fs.readFileSync(privatePricing)):{...old,schema:'gravuru-personalization-pricing/v2',revision:2,extraLogoCents:1299,history:[structuredClone(old)]},pricing=encodeFunctionPricing(raw).pricing;
const oldVariant=Object.keys(raw.variants).find(k=>raw.variants[k]!==raw.history[0].variants[k])||'58104613339516';
function line(id,revision=2,logos=0,variant='58104613339516'){return {id,quantity:1,revision:{value:String(revision)},designFile:{value:'synthetic'},motifs:{value:'0'},uploads:{value:'0'},logos:{value:String(logos)},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+variant,product:{id:productId,pricing:{jsonValue:pricing}}}};}
const cases=[{name:'three-steel-lines-404-variants-old-and-new',input:{presentmentCurrencyRate:'1',cart:{lines:[line('old',1,0,oldVariant),line('new'),line('logo',2,1)]}}}];
if(privatePricing){
 for(const quantity of [20,50,99]){const l=line('quantity-'+quantity,2,1);l.quantity=quantity;cases.push({name:'one-logo-line-quantity-'+quantity,input:{presentmentCurrencyRate:'1',cart:{lines:[l]}}});}
 cases.push({name:'three-historical-lines-with-old-prices',input:{presentmentCurrencyRate:'1',cart:{lines:[line('old-a',1,0,oldVariant),line('old-b',1,0,'58104613339516'),line('old-c',1,0,Object.keys(raw.variants).at(-1))]}}});
 cases.push({name:'three-current-lines-with-logo',input:{presentmentCurrencyRate:'1',cart:{lines:[line('new-a'),line('new-b'),line('logo',2,1)]}}});
 cases.push({name:'four-historical-lines',input:{presentmentCurrencyRate:'1',cart:{lines:Array.from({length:4},(_,i)=>line('old-'+i,1,0,Object.keys(raw.variants)[i]))}}});
 cases.push({name:'six-current-lines',input:{presentmentCurrencyRate:'1',cart:{lines:Array.from({length:6},(_,i)=>line('new-'+i,2,i%2,Object.keys(raw.variants)[i]))}}});
 cases.push({name:'ten-mixed-lines',input:{presentmentCurrencyRate:'1',cart:{lines:Array.from({length:10},(_,i)=>line('mixed-'+i,i%2?2:1,i%2,Object.keys(raw.variants)[i]))}}});
 cases.push({name:'twenty-current-lines',input:{presentmentCurrencyRate:'1',cart:{lines:Array.from({length:20},(_,i)=>line('new-'+i,2,i%2,Object.keys(raw.variants)[i]))}}});
 cases.push({name:'twenty-historical-lines',input:{presentmentCurrencyRate:'1',cart:{lines:Array.from({length:20},(_,i)=>line('old-'+i,1,0,Object.keys(raw.variants)[i]))}}});
 cases.push({name:'twenty-mixed-lines',input:{presentmentCurrencyRate:'1',cart:{lines:Array.from({length:20},(_,i)=>line('mixed-'+i,i%2?2:1,i%2,Object.keys(raw.variants)[i]))}}});
}
cases.push({name:'ordinary-item-no-price-contract',input:{presentmentCurrencyRate:'1',cart:{lines:[{id:'ordinary',quantity:1,merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/1',product:{id:'gid://shopify/Product/1',pricing:null}}}]}}});
const missing=structuredClone(cases[0].input);missing.cart.lines[0].merchandise.product.pricing=null;cases.push({name:'reject-missing-price-contract',input:missing,reject:true});
const dangling=structuredClone(cases[0].input);dangling.cart.lines[0].merchandise.product.pricing.jsonValue.history[0].variantsFromRevision=99;cases.push({name:'reject-dangling-history-map',input:dangling,reject:true});
if(privatePricing){const invalid=structuredClone(cases[0].input);invalid.cart.lines[0].merchandise.product.pricing.jsonValue.history[0].variantDeltas=[[20,'0-99999']];cases.push({name:'reject-outside-historical-delta-range',input:invalid,reject:true});}
const report=[];
for(const [i,c] of cases.entries()){
 const actual=structuredClone(c.input);
 for(const line of actual.cart.lines){const field=line.merchandise?.product?.pricing;if(field?.jsonValue)line.merchandise.product.pricing={value:JSON.stringify(field.jsonValue)};}
 const file=path.join(out,`input-${i}.json`);fs.writeFileSync(file,JSON.stringify(actual));
 const r=spawnSync(process.execPath,[cli,'app','function','run','--path',dir,'--input',file,'--json','--no-input'],{encoding:'utf8',timeout:60000});
 fs.writeFileSync(path.join(out,`case-${i}.log`),(r.stdout||'')+(r.stderr||''));
 let result;try{result=JSON.parse(r.stdout.slice(0,r.stdout.indexOf('\n}')+2));}catch{throw Error(`Invalid WASM result ${c.name}`);}
 if(c.reject){assert.notEqual(result.success,true);}
 else{assert.equal(result.success,true);assert.deepEqual(result.output,cartTransformRun(c.input));assert.deepEqual(result.output,cartTransformRun(actual));}
 report.push({name:c.name,priceSemanticsPassed:true,withinShopifyInstructionLimit:result.instructions<=11000000,rejected:!!c.reject,instructions:result.instructions??result.instructionsConsumed??null,inputBytes:fs.statSync(file).size});
}
const wasm=fs.readFileSync(path.join(dir,'dist/function.wasm'));
const proof={compiled:true,noRelease:true,noShopMutation:true,allWithinInstructionLimit:report.every(c=>c.withinShopifyInstructionLimit),baseline:'1c3c61f',realPrivatePricing:!!privatePricing,pricingBytes:Buffer.byteLength(JSON.stringify(pricing)),wasm:{bytes:wasm.length,sha256:createHash('sha256').update(wasm).digest('hex')},cases:report};
fs.writeFileSync(path.join(out,'compiled-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
if(!proof.allWithinInstructionLimit)process.exitCode=1;

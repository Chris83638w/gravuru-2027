// Local, read-only proof against the exact private Admin API export. Never
// commits or prints the price table; only hashes and equivalence counters.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {planSteelPricingInput} from '../../plesk/steel-pricing-input-cas.mjs';
import {resolvedPricingHistory,expandPricingVariants} from './pricing-history.mjs';
import {cartTransformRun} from './cart_transform_run.mjs';
const p=planSteelPricingInput(fs.readFileSync(process.argv[2],'utf8'));
assert.deepEqual(resolvedPricingHistory(p.after),p.before.history);
assert.deepEqual(expandPricingVariants(p.after).variants,p.before.variants);
const productId=p.before.productId;
function input(pricing,id,revision,logos,quantity,motifs=0,uploads=0){return {presentmentCurrencyRate:'1',cart:{lines:[{id:'proof',quantity,revision:{value:String(revision)},designFile:{value:'synthetic-proof'},motifs:{value:String(motifs)},uploads:{value:String(uploads)},logos:{value:String(logos)},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+id,product:{id:productId,pricing:{jsonValue:pricing}}}}]}};}
let comparisons=0;
for(const id of Object.keys(p.before.variants))for(const revision of [1,2])for(const logos of revision===1?[0]:[0,1,4])for(const quantity of [1,10,20,50,99])for(const [motifs,uploads] of [[0,0],[2,1]]){
 if(logos+uploads>4)continue;
 assert.deepEqual(cartTransformRun(input(p.after,id,revision,logos,quantity,motifs,uploads)),cartTransformRun(input(p.before,id,revision,logos,quantity,motifs,uploads)));comparisons++;
}
const exact=cartTransformRun(input(p.after,'58104613339516',2,1,1)).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount;
assert.equal(exact,'30.47');
const changedHistoricalPrices=Object.keys(p.before.variants).filter(k=>p.before.variants[k]!==p.before.history[0].variants[k]).length;
console.log(JSON.stringify({ok:true,privateInputNotPrinted:true,beforeSha:p.beforeSha,afterSha:p.afterSha,beforeBytes:p.beforeBytes,afterBytes:p.afterBytes,variants:404,revisions:[1,2],changedHistoricalPrices,comparisons,logoUnitAmount:exact}));

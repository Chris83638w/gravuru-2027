import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {compareNativeVariants} from './issue230-native-plans.mjs';
const root=path.resolve(process.argv[2]||'');
const inputs=JSON.parse(gunzipSync(fs.readFileSync('docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz')));
const summary=JSON.parse(fs.readFileSync(path.join(root,'summary.json')));
let variants=0,negativeChecks=0;
for(const w of inputs.workbooks){
 const plan=JSON.parse(fs.readFileSync(path.join(root,w.name.replace(/\.xlsx$/,''),'plan.json')));
 const good=compareNativeVariants(w,plan);assert.deepEqual(good.differences,[]);variants+=good.actual;
 const row=plan.products[0].variantReview[0];row.unitCents++;
 assert.ok(compareNativeVariants(w,plan).differences.some(d=>d.code==='price'));negativeChecks++;row.unitCents--;
 plan.products[0].variantReview.pop();
 assert.ok(compareNativeVariants(w,plan).differences.some(d=>d.code==='variant_count'));negativeChecks++;
}
assert.equal(variants,823);assert.equal(summary.confirmations,0);assert.equal(summary.executions,0);
console.log(JSON.stringify({workbooks:7,comparedVariants:variants,priceDifferences:0,negativeChecks,confirmations:0,executions:0}));

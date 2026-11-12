import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const SHEETS = ['HauptzielV7','Preisabgleich158','Groessenlabels30','Erhalten30','BelegeV7','AblaufV7'];
export const OUTPUT = 'Tuerschild-Acrylglas-3mm_v7.xlsx';
export const PIN = Object.freeze({
  source: '37a704d892b0f24fffdd87c7c5090652e5a949f3091dd8117ff83567e49d1429',
  targetGzip: '2a7b1adf55afbda5728cf062e91208f42c559fa1578b771b0ad4aa5912ffadb1',
  mappingGzip: '3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf',
  mappingJson: '3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591',
  adapter: '6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571',
  category: '52a8c92658d09e234761ffa2767769a361c940c30b5606ff6330ce0be5984381',
  v9PlanId: 'pgp_80a0c3b9-b599-428f-8626-05e3ace880b6',
  v9PlanHash: '83cd95dc900fcbc9631086f54c26591e2dbab75d285cc80fa46d64673f63bb33',
});
export function argumentsFor(argv, required, optional=[]) {
  const result={};
  for(let i=0;i<argv.length;i++) {
    const key=argv[i].replace(/^--/,'');
    assert(argv[i].startsWith('--') && [...required,...optional].includes(key), 'Unknown argument '+argv[i]);
    assert(!(key in result),'Duplicate argument '+key);
    if(key==='check-only')result[key]=true;
    else {assert(argv[i+1] && !argv[i+1].startsWith('--'),'Missing value '+key);result[key]=argv[++i];}
  }
  for(const k of required)assert(result[k], 'Missing required --'+k);
  return result;
}
export const writeNew = (file,data) => fs.writeFile(file,data,{flag:'wx',mode:0o600});
export const writeJson = (file,value) => writeNew(file,JSON.stringify(value,null,2)+'\n');
const hex = v => typeof v==='string' && /^[0-9a-f]{64}$/.test(v) && !/^0+$/.test(v);

export async function loadInputs(args) {
  for(const k of ['review-sha256','observation-sha256'])assert(hex(args[k]),'Actual nonempty '+k+' required');
  assert(/^https:\/\/github\.com\/Chris83638w\/gravuru-2027\/issues\/168#issuecomment-\d+$/.test(args['evidence-source']), 'Exact actual operator comment URL required');
  const files={};
  for(const k of ['source-xlsx','target','mapping','review','observation','adapter','validator-source']) files[k]=await fs.readFile(args[k]);
  for(const [key,pin]of [['source-xlsx',PIN.source],['target',PIN.targetGzip],['mapping',PIN.mappingGzip],['adapter',PIN.adapter],['review',args['review-sha256']],['observation',args['observation-sha256']]])assert.equal(sha(files[key]),pin,key+' SHA mismatch');
  const adapter=await import(pathToFileURL(path.resolve(args.adapter)).href);
  const target=JSON.parse(gunzipSync(files.target));
  const mappingBytes=gunzipSync(files.mapping);assert.equal(sha(mappingBytes),PIN.mappingJson);
  const mapping=JSON.parse(mappingBytes),review=JSON.parse(files.review),observation=JSON.parse(files.observation);
  adapter.verifyUpdateReview(review,target);
  assert.equal(adapter.digest(review.observation),adapter.digest(observation),'Separate actual observation does not match review');
  assert.deepEqual(review.origin,{excelFile:'Tuerschild-Acrylglas-3mm_v6.xlsx',excelSha256:PIN.source,v9PlanId:PIN.v9PlanId,v9PlanHash:PIN.v9PlanHash});
  assert.equal(review.observation.evidence.categoryComparisonSha256,PIN.category);
  assert.equal(review.observation.evidence.categoryComparisonPassed,true);
  assert.equal(sha(files['validator-source']),review.observation.evidence.nativeValidatorSourceSha256,'Actual validator wiring source SHA mismatch');
  assert.equal(mapping.matches.length,778);assert.equal(mapping.residualVariants.length,30);
  const allIds=[...mapping.matches.map(x=>x.shopifyVariantId),...mapping.residualVariants.map(x=>x.id)];
  assert.equal(new Set(allIds).size,808,'Duplicate/missing variant identity');
  const prices=mapping.matches.filter(x=>x.currentShopUnitCents!==x.targetUnitCents);
  const labels=mapping.matches.filter(x=>x.displayLabelChanges?.length);
  assert.equal(prices.length,158);assert.equal(labels.length,30);
  assert.equal(prices.filter(x=>x.nativeOptions.mounting==='B02S' && x.targetUnitCents-x.currentShopUnitCents===-30).length,138);
  assert.equal(prices.filter(x=>x.nativeOptions.mounting==='B04S' && x.targetUnitCents-x.currentShopUnitCents===-10).length,20);
  assert(mapping.matches.every(x=>x.v9UnitCents===x.targetUnitCents),'v9 target price changed');
  assert.equal(labels.filter(x=>x.currentShopUnitCents!==x.targetUnitCents).length,6);
  assert(mapping.residualVariants.every(x=>x.proposedDeletion===false),'Residual deletion');
  const inputPins=Object.fromEntries(Object.entries(files).map(([k,b])=>[k,{file:path.basename(args[k]),sha256:sha(b)}]));
  return {target,mapping,review,observation,prices,labels,inputPins,evidenceSource:args['evidence-source']};
}

export const BUILD_ARGS=['source-xlsx','target','mapping','adapter','review','review-sha256','observation','observation-sha256','validator-source','evidence-source','out'];

import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {manifest,sourceEvidence} from './load-pricing.mjs';
import {observedSummary} from './observed-product.mjs';
const cwd=fileURLToPath(new URL('.',import.meta.url));
const result=spawnSync(process.execPath,['--test','--test-reporter=tap','pricing.test.mjs','observed-product.test.mjs'],{cwd,encoding:'utf8',timeout:60000});
const text=(result.stdout||'')+(result.stderr||'');
fs.writeFileSync(new URL('./results.tap',import.meta.url),text);
const count=name=>Number(text.match(new RegExp('^# '+name+' (\\d+)$','m'))?.[1]||0);
const report={
 checkedAt:new Date().toISOString(),node:process.version,repository:manifest.repository,branch:manifest.branch,commit:manifest.commit,
 exitCode:result.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),
 sources:sourceEvidence,observedProduct:observedSummary(),scope:'Isolated source-linked native-slate pricing and handoff checks, no editor/server/shop changes',
 limitations:[
 'Source modules are hash-verified; module linking is replaced solely for this isolated harness. Unrelated renderer, font, acrylic and full schema paths are not tested.',
 'Genuine source family Gedenktafel Naturschiefer 30x20 supplies the 2999-cent base and 299/399-cent mounting. Extra photo price 899 cents and additional-field/back fixtures are synthetic test inputs, not a published product price.',
 'Open tier null disables the whole optional tier; it does not block the purchase. Open photo/back pricing is rejected. This matches source behavior.',
 'No Shopify request, real product binding, cart transform, customer account, database, or server deployment was exercised.'
 ]};
fs.writeFileSync(new URL('./report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
process.stdout.write(text);if(result.error)console.error(result.error.message);process.exit(result.status??1);


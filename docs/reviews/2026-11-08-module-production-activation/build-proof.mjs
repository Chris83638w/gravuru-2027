import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const base='df468325dc7480c5da10510ced62c5ef1cb080d1';
const files=['app/workshop/gallery-shop-sync-transport.mjs','app/workshop/gallery-shop-sync.mjs','scripts/lib/gallery-production-shopify-read.mjs','scripts/lib/gallery-production-module-target.mjs','scripts/lib/gallery-production-activation.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest={schema:'gravuru-module-activation-code-proof/v1',base,liveInstalled:false,gates:{executionEnabled:false,writesEnabled:false},customerFilesChanged:0,files:files.map(file=>{const before=spawnSync('git',['show',base+':'+file]),after=fs.readFileSync(file);return {path:file,beforeSha256:before.status===0?sha(before.stdout):null,afterSha256:sha(after),bytes:after.length};}),tests:{newUnique:3,existingConnectionAndPagination:11,historicalOrders:1,realBank:{sha256:'2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0',designs:251,formats:80,variants:404,wholeScenarioMs:247704.9221,shopify:'simulated',nativeStores:'isolated temporary SQLite',externalWrites:0}},independentReview:'pending'};
fs.writeFileSync('docs/reviews/2026-11-08-module-production-activation/file-manifest.json',JSON.stringify(manifest,null,2)+'\n');

// Independent delivered-artifact check only. No operator imports, tests, DB or network.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as same} from 'node:util';
const [pkgArg,codeArg,targetArg,outArg]=process.argv.slice(2);
if(!pkgArg||!codeArg||!targetArg||!outArg)throw Error('package codeRoot targetGzip newOutput required');
const pkg=path.resolve(pkgArg),code=path.resolve(codeArg),out=path.resolve(outArg);
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const read=f=>fs.readFileSync(path.join(pkg,f)),json=f=>JSON.parse(read(f));
const checks=[];
function check(name,passed,detail){checks.push({name,passed:Boolean(passed),...(detail===undefined?{}:{detail})});}
const manifestBytes=read('manifest.json'),manifest=JSON.parse(manifestBytes);
const files=manifest.files.map(entry=>{
 const f=path.resolve(pkg,entry.path);if(!f.startsWith(pkg+path.sep))throw Error('manifest path outside package');
 const bytes=fs.readFileSync(f);return {path:entry.path,bytes:bytes.length,sha256:hash(bytes),matches:bytes.length===entry.bytes&&hash(bytes)===entry.sha256};
});
check('all final manifest file bytes and hashes',files.every(f=>f.matches),{files:files.length});
const nativePins=[...json('dependency-pins.json').files,...Object.entries(json('pricing-pins.json')).map(([p,sha256])=>({path:p,sha256}))];
const pinChecks=nativePins.map(pin=>({path:pin.path,expectedSha256:pin.sha256,actualSha256:hash(fs.readFileSync(path.join(code,pin.path)))}));
check('native source dependency hashes',pinChecks.every(p=>p.expectedSha256===p.actualSha256),{files:pinChecks.length});
const beforeBytes=read('fixtures/personalization.value.json'),before=JSON.parse(beforeBytes),afterBytes=read('pricing-value.preview.json'),after=JSON.parse(afterBytes);
check('actual original app metafield',beforeBytes.length===18108&&hash(beforeBytes)==='7c997f49153d43a937a75501ed5bc016eda1003e129d1735528b801ee7962cf5');
check('bounded proposed metafield',afterBytes.length===3898&&hash(afterBytes)==='37ef02c6f98f6b463179093aca38a715a153141d8281203a158ddbc3e49b0705');
const gzip=read('variant-mapping.preview.json.gz'),raw=gunzipSync(gzip),mapping=JSON.parse(raw);
check('unchanged frozen full mapping',hash(gzip)==='3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf'&&hash(raw)==='3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591');
// Independently decode only the sequence/range shape actually delivered here.
const seq=after.variantSequence,variants={};
if(!seq||seq.width!==3||seq.prices36.length!==808*3||seq.step!==32768)throw Error('unexpected actual sequence shape');
for(let i=0;i<808;i++)variants[String(BigInt(seq.first)+BigInt(i*seq.step))]=parseInt(seq.prices36.slice(i*3,i*3+3),36);
const {history,variantSequence,...topFields}=after;
const top={...topFields,variants};
check('top contract v2 revision2 fixed product and EUR',top.schema==='gravuru-personalization-pricing/v2'&&top.revision===2&&top.productId==='gid://shopify/Product/16190784602492'&&top.currency==='EUR'&&top.enabled===true);
const {variantsFromRevision,variantDeltas,...oldFields}=history[0];
const oldTable={...variants},keys=Object.keys(variants).sort(),touched=new Set();
for(const [cents,ranges] of variantDeltas){for(const range of ranges.split(',')){const [a,b]=range.split('-').map(Number);for(let n=a;n<=(b??a);n++){if(touched.has(n)||!keys[n])throw Error('duplicate/outside history range');touched.add(n);oldTable[keys[n]]+=cents;}}}
check('entire immutable R1 contract including808 prices preserved',history.length===1&&variantsFromRevision===2&&same({...oldFields,variants:oldTable},before),{restoredHistoricalPrices:Object.keys(oldTable).length,deltaIndices:touched.size});
const ids=new Set([...mapping.matches.map(r=>r.shopifyVariantId),...mapping.residualVariants.map(r=>r.id)]);
check('778 plus30 disjoint mapping partition',mapping.matches.length===778&&mapping.residualVariants.length===30&&ids.size===808);
check('all778 proposed prices match frozen source',mapping.matches.every(r=>variants[r.shopifyVariantId.split('/').at(-1)]===r.targetUnitCents));
check('all30 residual current prices unchanged',mapping.residualVariants.every(r=>variants[r.id.split('/').at(-1)]===Math.round(Number(r.price)*100)));
const priceRows=mapping.matches.filter(r=>r.currentShopUnitCents!==r.targetUnitCents),labelRows=mapping.matches.filter(r=>!same(r.currentShopSelectedOptions,r.proposedSelectedOptions));
check('exact182 union of158 price and30 label corrections',priceRows.length===158&&labelRows.length===30&&new Set([...priceRows,...labelRows].map(r=>r.shopifyVariantId)).size===182);
const targetBytes=fs.readFileSync(targetArg),target=JSON.parse(gunzipSync(targetBytes)),c=target.config;
check('actual full R2 target binding fingerprint',hash(canonical(target))==='f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285');
check('R2 costs and tiers from exact target',top.extraMotifCents===c.extraMotifCents&&top.extraPhotoCents===c.photo.extraPriceCents&&top.extraLogoCents===1299&&c.moduleProfile.modules.photo===true&&c.moduleProfile.modules.logo===true&&same(top.quantityTiers,c.quantityTiers)&&top.quantityTierScope===c.quantityTierScope);
const proof=json('pricing-proof-local.json');
check('synthetic Function evidence explicitly disclaimed',proof.syntheticFunctionEvidence===true&&proof.actualActiveFunctionVerified===false&&proof.newBindingContracts===778&&proof.preservedActiveR1===30&&proof.targetSha256===hash(afterBytes));
const result={schema:'gravuru-main-v2-independent-artifact-check/v1',mode:'read-only delivered bytes and independent decoding; no operator execution, no test run, no DB, no network',packageManifestSha256:hash(manifestBytes),allPassed:checks.every(c=>c.passed),checks,files,nativeSourcePins:pinChecks,productScope:{productId:'16190784602492',retainedShopVariants:808,newR2Contracts:778,activeR1Retained:30,historicalR1Contracts:808,priceCorrections:158,labelCorrections:30,mutatedVariants:182},limits:{actualActiveFunctionVerified:false,privateHostFactoryVerified:false,nativeDatabasePilotPerformed:false,productionApprovalGranted:false}};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({allPassed:result.allPassed,checks:checks.length,files:files.length,sha256:hash(fs.readFileSync(out))}));
if(!result.allPassed)process.exitCode=1;

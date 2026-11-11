// A targeted read-only check of prices, start projection, rights and unchanged inputs.
import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const [code,priorFile,targetFile,mappingFile]=process.argv.slice(2);assert.equal(process.argv.length,6);
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const hash=v=>sha(JSON.stringify(canon(v))),read=f=>JSON.parse(gunzipSync(fs.readFileSync(f)));
const old=read(priorFile),d=read(targetFile),mapping=read(mappingFile);
const familyFile=path.join(code,'app/configurator/variant-m/family-formats.mjs');
const {familyFormatCombinations,familyFormatPrice,familyFormatSelection,selectedFamilyDesign}=await import(pathToFileURL(familyFile));
const entries=familyFormatCombinations(d.config);assert.equal(entries.length,778);assert.equal(mapping.matches.length,778);assert.equal(mapping.residualVariants.length,30);
for(const row of mapping.matches){const o=row.nativeOptions;assert.equal(familyFormatPrice(d.config,o),row.v9UnitCents);assert.equal(familyFormatPrice(old.config,o),row.v9UnitCents);const s=familyFormatSelection(d.config,o);assert.equal(s.format.geometry.width,row.widthMm);assert.equal(s.format.geometry.height,row.heightMm);}
const unchanged={};for(const key of ['elementRights','profileAssignments','productionProfile']){assert.equal(hash(old[key]??null),hash(d[key]??null));unchanged[key]=hash(d[key]??null);}
for(const key of Object.keys(old.config)){if(key==='profile')continue;assert.equal(hash(old.config[key]),hash(d.config[key]));}
const oldProfile=structuredClone(old.config.profile),newProfile=structuredClone(d.config.profile);delete oldProfile.name;delete newProfile.name;assert.equal(hash(oldProfile),hash(newProfile));
const start=familyFormatSelection(d.config),des=selectedFamilyDesign(d.config,d.config.profile.defaultDesignId);
assert.equal(start.format.geometry.width,120);assert.equal(start.format.geometry.height,80);assert.deepEqual(des.katalog.targetMm,[120,80]);
assert.equal(hash(des),hash(selectedFamilyDesign(old.config,old.config.profile.defaultDesignId)));
const motifFlags={};for(const design of d.config.familyFormats.designs)for(const o of design.objects)if(o.type==='motif'){for(const key of ['templateOrigin','role','uxDecoration'])if(o[key]!==undefined){const s=key+':'+String(o[key]);motifFlags[s]=(motifFlags[s]||0)+1;}}
console.log(JSON.stringify({passed:true,readOnly:true,variants:778,pricesEqualToV9:778,residualVariantsUnchanged:30,mappingFileSha256:sha(fs.readFileSync(mappingFile)),unchanged,configExceptProfileNameUnchanged:true,profileExceptNameUnchanged:true,familyFormatsProductGroupSha256:hash(d.config.familyFormats),profileExceptNameProductGroupSha256:hash(newProfile),nativePricingSourceSha256:sha(fs.readFileSync(familyFile)),start:{defaultDesignId:d.config.profile.defaultDesignId,sourcePlateMm:des.katalog.plateMm,projectedTargetMm:des.katalog.targetMm,geometry:start.format.geometry,projectedObjects:des.objects.map(o=>({id:o.id,type:o.type,text:o.text,x:o.x,y:o.y,w:o.w,h:o.h})),projectedDesignProductGroupSha256:hash(des),sameAsPriorTarget:true},motifFlags},null,2));

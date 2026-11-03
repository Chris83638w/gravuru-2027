import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {openKatalog} from './issue139-latency/app/workshop/katalog-source.mjs';import {run} from './issue139-latency/scripts/shop-schnitt-plan.mjs';import {convertFont} from './issue139-latency/app/workshop/font-library.mjs';
const catalog=path.resolve('work/issue139-katalog-modules'),base=path.resolve('work/grabstecker-alle-20261103'),textFile=path.resolve('work/issue139-latency/scripts/shop-inhalte/grabstecker-edelstahl-texte.json');
process.env.GRAVURU_PYTHON='C:/Users/Christopher Koch/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const k=openKatalog(catalog),cache=new Map();const converter=async bytes=>{const key=createHash('sha256').update(bytes).digest('hex');if(!cache.has(key))cache.set(key,convertFont(bytes));return structuredClone(await cache.get(key));};
const texts=JSON.parse(fs.readFileSync(textFile)),reports=[];fs.mkdirSync(base,{recursive:true});
for(let offset=0;;){
 const output=base+'/batch-'+offset;
 const r=fs.existsSync(output+'/summary.json')?JSON.parse(fs.readFileSync(output+'/summary.json')):await run(['--katalog='+catalog,'--linie=grabstecker-edelstahl','--unterkategorie=andenkenschilder','--form','--limit=100','--offset='+offset,'--texte='+textFile,'--output='+output],{katalog:k,converter});reports.push({...r,output});
 assert.equal(r.counts.blockiert,0);assert.equal(r.counts.offen,0);assert.equal(r.counts.ohneTexte,0);assert.equal(r.duplicateHandles.length,0);assert.equal(r.duplicateContent.sameFields.length,0);assert.ok((r.duplicateContent.pairs[0]?.shared||0)<=8);
 if(r.batch.nextOffset===null)break;offset=r.batch.nextOffset;
}
const entries=reports.flatMap(r=>r.entries.filter(e=>e.state==='geplant').map(e=>({...e,directory:r.output+'/'+e.handle}))),counts=[];
for(const e of entries){assert.equal(e.textSource,'datei');const text=texts[e.handle],numeric=text.descriptionHtml.replace(/dreißig/gi,'30').replace(/zwanzig/gi,'20');const matches=[...numeric.matchAll(/(\d+)\s+(?:verschiedene\s+)?(?:Designs|Vorlagen|Gestaltungen|Entwürfe)|insgesamt\s+(\d+)|(\d+)\s+an der Zahl/g)].map(m=>Number(m[1]??m[2]??m[3]));assert.ok(matches.length,e.handle+' design count absent');assert.ok(matches.every(n=>n===e.designsInGroup),e.handle+' description count differs '+matches+' / '+e.designsInGroup);const source=k.designs.masters.find(d=>d.id===e.startDesign);assert.ok(source);counts.push({handle:e.handle,designs:e.designsInGroup,source:source.svgFile});}
assert.equal(entries.length,102);const f=k.families.get('grabstecker-edelstahl'),cuts=JSON.parse(fs.readFileSync(catalog+'/schneidvorlagen/grabstecker/grabstecker.json')).groessen;
for(const s of f.sizes)assert.deepEqual(s.cutoutPaths||[],cuts[s.key.replace('GS-V2A-','')].innenausschnitte||[]);
fs.writeFileSync(base+'/complete.json',JSON.stringify({createdAt:new Date().toISOString(),count:entries.length,fontConversions:cache.size,entries,counts},null,2));console.log(JSON.stringify({complete:true,count:entries.length,fontConversions:cache.size}));

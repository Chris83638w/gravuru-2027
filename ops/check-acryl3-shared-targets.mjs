import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {validateFamily,geometryOf} from '../app/workshop/product-families.mjs';
import {assignTargetSeries,approvedForFamily} from '../app/workshop/design-targets.mjs';
const root=path.resolve(process.argv[2]||(()=>{throw Error('Katalogpfad angeben')})()),k=openKatalog(root),steel=k.families.get('steel-door-signs');
const ids=['acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit'];
const inventory={masters:k.designs.masters.filter(m=>m.targets.some(t=>t.familie==='steel-door-signs')).map(m=>({file:path.relative(root,m.jsonFile).replaceAll(String.fromCharCode(92),'/')}))},base='60657f6cb63584a7061f221294ecdc6bf7c13ed5';
const names=inventory.masters.map(m=>m.file),batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:names.map(f=>base+':'+f+'\n').join(''),maxBuffer:100e6});
const originals=new Map();let offset=0;for(const name of names){const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString(),size=Number(header.split(' ')[2]);assert(Number.isFinite(size),header);offset=end+1;originals.set(name,JSON.parse(batch.subarray(offset,offset+size)));offset+=size+1;}
for(const f of k.families.values())validateFamily(f);
const mapping=JSON.parse(fs.readFileSync(path.join(root,'auftraege/2026-10-31-acryl3-designs/native-zuordnung.json'))),byKey=new Map(mapping.sizeMap.map(r=>[r.key,r]));
for(const id of ids){const f=k.families.get(id);assert.equal(f.sizes.length,80);assert.equal(f.withoutMounting,steel.withoutMounting);assert.deepEqual(f.designArea,steel.designArea);assert.deepEqual(f.groups,steel.groups.filter(g=>g.key!=='EL'));
 for(const s of f.sizes){const row=byKey.get(s.key),source=steel.sizes.find(s=>s.key===row.steelSourceKey);assert.deepEqual(geometryOf(f,s),geometryOf(steel,source));assert.deepEqual(s.mounting,source.mounting);assert.equal(s.baseCents,row.baseCents);assert.equal(s.netWeightG,undefined);}
 for(const r of f.mountingRules){const orig=steel.mountingRules.find(x=>x.id===r.id);assert.deepEqual({...r,priceCents:orig.priceCents},orig);assert.equal(r.priceCents,mapping.mountingSurcharges[r.skuSuffix]);}
}
assert.deepEqual(k.lines.get('acryl-tuerschilder').families,ids);assert(k.lines.get('acryl-tuerschilder').mainProductPolicy.colorIsOption);
const masters=k.designs.masters.filter(m=>m.targets.some(t=>t.familie==='steel-door-signs'));assert.equal(masters.length,737);
const differences=[];let approvedSteel=0,retroMasters=0,roundMatches=0;
for(const [i,m] of masters.entries()){
 const file=path.relative(root,m.jsonFile).replaceAll('\\','/'),original=originals.get(file);assert(original,file);
 assert.deepEqual({...m.json,ziele:m.json.ziele.filter(t=>!ids.includes(t.familie))},original,'Only new targets may differ: '+file);
 if(approvedForFamily(m,steel.id,k))approvedSteel++;
 const originalSizes=assignTargetSeries(steel,[m],k)[0].sizes.sort();roundMatches+=originalSizes.filter(key=>steel.sizes.find(s=>s.key===key).groupKey==='R').length;
 if(originalSizes.some(key=>steel.sizes.find(s=>s.key===key).groupKey.startsWith('RT')))retroMasters++;
 for(const id of ids){assert.deepEqual(m.targets.find(t=>t.familie===id),{familie:id,freigabe:null});assert.equal(approvedForFamily(m,id,k),false);
  const actual=assignTargetSeries(k.families.get(id),[m],k)[0].sizes.map(key=>byKey.get(key).steelSourceKey).sort();
  if(JSON.stringify(originalSizes)!==JSON.stringify(actual))differences.push({id:m.id,family:id,originalSizes,actual});
 }
 if((i+1)%150===0)console.log('Checked '+(i+1)+' / 737 masters');
}
const result={passed:differences.length===0,base,catalogFamilies:k.families.size,lines:k.lines.size,newFamilies:2,sizesEach:80,pricedEach:79,openPrices:mapping.openPrices.map(r=>r.key),masters:737,addedTargets:1474,unchangedSteelApprovals:approvedSteel,acrylApprovedTargets:0,retroMasters,roundMatches,sameAvailabilityDifferences:differences.length,liveActions:0,imports:0,designCopies:0};
if(differences.length)console.log(JSON.stringify(differences));

console.log(JSON.stringify(result));assert.equal(differences.length,0,'Native size availability differs; see report');

// Verify every delivered size/finish through the native preview, read-only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openKatalog} from '../../app/workshop/katalog-source.mjs';
import {targetDesignPreview} from '../../app/workshop/design-target-preview.mjs';
const arg=n=>process.argv.find(s=>s.startsWith('--'+n+'='))?.slice(n.length+3);
const root=path.resolve(arg('katalog')),out=path.resolve(arg('out')),catalog=openKatalog(root),rows=[];
const masters=catalog.designs.masters.filter(m=>m.seriesFolder.startsWith('tierbestand-'));
assert.equal(masters.length,260);
for(const master of masters)for(const target of master.json.ziele){
 const result=await targetDesignPreview(root,{reihe:master.seriesFolder,id:master.id,familie:target.familie,mounting:'K00'});
 const family=catalog.families.get(target.familie),size=family.sizes.find(s=>s.key===result.size.key);
 assert.deepEqual([size.widthMm,size.heightMm],master.plateMm,master.id+' must preview its actual size');
 assert.equal(result.variantRequired,false,master.id);
 const thicknessOpen=target.familie==='schiefer-knochen-23x10'&&family.material.thicknessMm===null;
 if(thicknessOpen)assert.deepEqual(result.reviewFit.issues,['Vorschau offen: Materialstärke']);
 else {assert.notEqual(result.reviewFit.status,'passt nicht',master.id+': '+result.reviewFit.issues.join('; '));assert.ok(result.svg);}
 rows.push({id:master.id,family:target.familie,size:size.key,plateMm:master.plateMm,fit:result.reviewFit,materialThicknessOpen:thicknessOpen});
}
const counts=rows.reduce((r,x)=>(r[x.materialThicknessOpen?'Materialstärke offen':x.fit.status]=(r[x.materialThicknessOpen?'Materialstärke offen':x.fit.status]??0)+1,r),{});
fs.writeFileSync(out,JSON.stringify({designs:masters.length,targets:rows.length,counts,rows},null,2)+'\n');
console.log(JSON.stringify({designs:masters.length,targets:rows.length,counts}));

// Published native target-preview handler; explicit K00, no server/import/release.
import fs from 'node:fs';import path from 'node:path';
import {targetDesignPreview} from '../app/workshop/design-target-preview.mjs';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
const root=process.argv[2],out=process.argv[3],k=openKatalog(root),results=[];
fs.mkdirSync(out,{recursive:true});
for(const m of k.designs.masters.filter(m=>m.seriesFolder.startsWith('boxenschilder-gravur-'))){
 for(const target of m.json.ziele){
  const family=k.families.get(target.familie),size=family.sizes.find(s=>Math.abs(s.widthMm-m.plateMm[0])<.1&&Math.abs(s.heightMm-m.plateMm[1])<.1&&family.groups.find(g=>g.key===s.groupKey).shape===(m.json.form==='Oval'?'ellipse':'rect'));
  if(!size)throw Error('Mastergröße fehlt '+m.id+' '+family.id);
  const r=await targetDesignPreview(root,{reihe:m.seriesFolder,id:m.id,familie:family.id,size:size.key,mounting:'K00'});
  if(!r.svg||r.reviewFit.status==='passt nicht')throw Error(m.id+' '+family.id+': '+r.reviewFit.issues.join(' | '));
  const name=m.id+'--'+family.id+'.svg';fs.writeFileSync(path.join(out,name),r.svg);
  results.push({id:m.id,series:m.seriesFolder,name:m.name,familie:family.id,masterSize:size.key,mounting:'K00',svg:name,reviewFit:r.reviewFit,fit:r.fit,source:m.json.source});
 }
}
const summary={masters:new Set(results.map(r=>r.id)).size,targetPreviews:results.length,sizeChecks:results.reduce((n,r)=>n+r.reviewFit.sizes.length,0),failures:results.filter(r=>r.reviewFit.status==='passt nicht').length,passing:results.filter(r=>r.reviewFit.status==='passt').length,review:results.filter(r=>r.reviewFit.status==='prüfen').length};
fs.writeFileSync(path.join(out,'pruefung.json'),JSON.stringify({summary,results},null,1)+'\n');console.log(JSON.stringify(summary));

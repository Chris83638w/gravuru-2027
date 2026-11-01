import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {avoidMounting,placementBox} from '../app/configurator/variant-m/mounting-placement.mjs';
import {projectFamilyDesign} from '../app/configurator/variant-m/family-formats.mjs';
import {corners,overlaps} from '../app/configurator/variant-m/customer-tools-model.mjs';
// Independent circle-to-polygon distances and SAT overlap check over every
// selected-family/size/design/fastening combination in a saved review plan.
const [output,...files]=process.argv.slice(2);if(!output||!files.length||fs.existsSync(output))throw Error('Usage: <new-report.json> <review-config.json> [...]');
const cache=new Map(),rows=[];let computed=0;
const visible=o=>!o.uxHidden&&o.w>0&&o.h>0&&!(o.type==='text'&&!o.text?.trim());
const sameSide=(a,b)=>(a.surfaceId||'front')===(b.surfaceId||'front');
function clearance(o,h,r){const poly=corners(o),c={x:h.x,y:h.y},cross=(a,b)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(poly.every((p,i)=>cross(p,poly[(i+1)%4])>=0))return -r;return Math.min(...poly.map((p,i)=>{const q=poly[(i+1)%4],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((c.x-p.x)*dx+(c.y-p.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(c.x-p.x-t*dx,c.y-p.y-t*dy)-r;}));}
for(const file of files){const c=JSON.parse(fs.readFileSync(file)),f=c.familyFormats,resources=c.localResources;assert(c.reviewOnly&&c.profile.features.orderEnabled===false);for(const format of f.formats)for(const v of format.variants){assert(v.mounting.some(m=>m.id==='K00'&&!m.holes.length));for(const id of v.designIds){const d=projectFamilyDesign(c,id,format);for(const m of v.mounting.filter(m=>m.holes.length)){
 const p={...c.profile,geometry:{...format.geometry,holes:m.holes},material:v.material,mountingPreview:{keepoutMm:m.mountingRule?.keepoutMm??0}},key=createHash('sha256').update(JSON.stringify([p.geometry,p.mountingPreview,d.objects])).digest('hex');let result=cache.get(key);
 if(!result){const start=Date.now(),r=avoidMounting(d.objects,p,resources),before=d.objects.filter(visible).map(o=>placementBox(o,resources)),after=r.objects.filter(visible).map(o=>placementBox(o,resources)),newOverlaps=[],hits=[];
  for(let i=0;i<after.length;i++){const a=after[i];for(const h of m.holes){const hole={...h,x:a.surfaceId==='back'?p.geometry.width-h.x:h.x},distance=clearance(a,hole,Math.max(h.diameter,4.5)/2+p.mountingPreview.keepoutMm);if(distance< -1e-5)hits.push({id:a.id,distanceMm:distance});}
   for(let j=i+1;j<after.length;j++)if(sameSide(a,after[j])&&overlaps(a,after[j])&&!overlaps(before[i],before[j]))newOverlaps.push([a.id,after[j].id]);
  }
  const invariantErrors=[];for(let i=0;i<d.objects.length;i++){const a=d.objects[i],b=r.objects[i];if(a.text!==b.text||a.motif!==b.motif||a.rotation!==b.rotation||Math.abs(b.w/a.w-b.h/a.h)>1e-8||a.type==='text'&&b.size<Math.min(a.size,3)-1e-8)invariantErrors.push(a.id);}
  result={status:hits.length?'prüfen':'passt',hits,newOverlaps,invariantErrors,unresolved:r.unresolved,changed:r.changed.map(v=>v.id),ms:Date.now()-start};cache.set(key,result);computed++;
 }
 rows.push({familyId:v.familyId,sizeKey:v.sizeKey,designId:d.katalog.designId,mounting:m.id,...result});
 if(rows.length%250===0){console.log(JSON.stringify({checked:rows.length,computed}));fs.writeFileSync(output+'.progress.json',JSON.stringify({checked:rows.length,computed,last:rows.at(-1)}));}
 }}}}
const errors=rows.filter(r=>r.newOverlaps.length||r.invariantErrors.length||r.hits.some(h=>!r.unresolved.includes(h.id)));
const report={configFiles:files.map(f=>({name:path.basename(path.dirname(f)),sha256:createHash('sha256').update(fs.readFileSync(f)).digest('hex')})),checked:rows.length,computed,passed:rows.filter(r=>r.status==='passt').length,needsReview:rows.filter(r=>r.status==='prüfen').length,errors:errors.length,rows};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));if(errors.length)process.exitCode=1;

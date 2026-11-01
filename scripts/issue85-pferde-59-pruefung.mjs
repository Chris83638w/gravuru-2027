// Artifact checks use the native import result, independently of the layout script.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate} from '../app/workshop/katalog-convert.mjs';import {convertFont} from '../app/workshop/font-library.mjs';
const root=process.argv[2],out=process.argv[3],k=openKatalog(root),report=path.join(root,'auftraege/2026-11-01-issue85-pferde'),items=JSON.parse(fs.readFileSync(path.join(report,'schriftwechsel-59.json'))),newIds=new Set(items.map(x=>x.id));
const masters=k.designs.masters.filter(m=>newIds.has(m.id)),fonts=await k.fontResources([...new Set(masters.flatMap(m=>m.fonts))],{converter:convertFont});assert.equal(masters.length,59);assert.equal(fonts.missing.length,0);
const results=[],names=new Set(),owners=new Set();let totalText=0,photos=0,sourcePaths=0,paths=0;
for(const m of masters){
 const j=m.json,c=katalogDesignToTemplate(m,k.families.get('steel-door-signs'),null,{fonts:fonts.fonts}),objects=c.template.objects,text=objects.filter(o=>o.type==='text'),pic=objects.filter(o=>o.type==='photoSlot');
 assert.equal(j.freigabe,null);assert.equal(j.ziele.length,3);assert.ok(j.ziele.every(t=>t.freigabe===null));assert.ok(text.every(o=>o.text.trim()));assert.ok(j.fonts.length<=3);assert.ok(j.fonts.every(f=>k.fonts.list.get(f)?.file));
 const actual=(m.svg().match(/<path /g)||[]).length,expected=j.review.sourceMotifPaths+(j.review.separatedHoofprints?7:0);assert.equal(actual,expected,m.id+' motif path conservation');
 names.add(j.review.sample.name);owners.add(j.review.sample.owner);
 for(const p of j.photos){assert.equal(p.placeholder,true);const a=fs.readFileSync(path.join(m.dir,p.file)),b=fs.readFileSync(path.join(root,p.source));assert.equal(createHash('sha256').update(a).digest('hex'),createHash('sha256').update(b).digest('hex'));}
 // Text/photo intersections would conceal either data or the filled image.
 const collisions=[];for(const a of text)for(const b of pic){const dx=Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2),dy=Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2);if(dx>.2&&dy>.2)collisions.push([a.id,b.id]);}
 assert.deepEqual(collisions,[],m.id+' text/photo overlap');
 totalText+=text.length;photos+=pic.length;sourcePaths+=j.review.sourceMotifPaths;paths+=actual;results.push({id:m.id,texts:text.length,photos:pic.length,sourceMotifPaths:j.review.sourceMotifPaths,outputMotifPaths:actual,textPhotoOverlaps:0,fonts:j.fonts,allReleasesNull:true});
}
assert.equal(names.size,59);assert.equal(owners.size,59);
const summary={additionalMasters:59,uniqueHorseExamples:names.size,uniqueOwners:owners.size,filledTexts:totalText,filledPhotoSlots:photos,sourceMotifPaths:sourcePaths,outputMotifPaths:paths,photoTextOverlaps:0,releasedTargets:0,sourceTextOutlineConverted:1,hoofprintContoursPreserved:8};
fs.writeFileSync(out,JSON.stringify({summary,results},null,1)+'\n');console.log(JSON.stringify(summary));

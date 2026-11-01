import fs from 'node:fs';
import path from 'node:path';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {katalogDesignToTemplate,scaleTemplate} from '../app/workshop/katalog-convert.mjs';
import {selectedProfile} from '../app/configurator/variant-m/contract.mjs';
import {avoidMounting,touchesMounting,SIGN_PLACEMENT_FAMILIES} from '../app/configurator/variant-m/mounting-placement.mjs';
const [catalogPath,outputPath]=process.argv.slice(2);if(!catalogPath||!outputPath)throw Error('Usage: node scripts/prove-mounting-placement.mjs <catalog> <new-output-directory>');const output=path.resolve(outputPath);if(fs.existsSync(output))throw Error('Output already exists');fs.mkdirSync(output,{recursive:true});const k=openKatalog(path.resolve(catalogPath)),f=k.families.get('steel-door-signs');
const requested=[['TAE-V2A-8x5-D15'],['TAE-V2A-8x5-D8'],['TR1-V2A-9x6-D65'],['TRE-V2A-5x2-D5'],['TRE-V2A-5x2-D45'],['TRE-V2A-9x3-D73'],['TRE-V2A-8x5-D13',90,60],['TQ-V2A-8x8-D15',160,160]];
const masters=requested.map(([id])=>{const d=k.designs.masters.find(d=>d.id===id);if(!d)throw Error(id);return d;});
const {fonts,missing}=await k.fontResources(masters.flatMap(d=>d.fonts),{converter:convertFont});if(missing.length)throw Error(missing.join(','));
const audit=[];
for(const fid of SIGN_PLACEMENT_FAMILIES){const family=k.families.get(fid);for(const size of family.sizes){try{
 const view={...family,groups:family.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};
 const c=familyProductConfig(view,size,1),group=c.profile.optionGroups.find(g=>g.id==='mounting');audit.push({family:fid,size:size.key,default:group.defaultValueId,holes:group.values.find(v=>v.id===group.defaultValueId).holes.length});
 }catch(e){audit.push({family:fid,size:size.key,error:e.message});}}}
fs.mkdirSync(path.join(output,'cases'),{recursive:true});const results=[];
for(let i=0;i<requested.length;i++){
 const d=masters[i],[,w=d.plateMm[0],h=d.plateMm[1]]=requested[i];
 const s=f.sizes.find(s=>s.widthMm===w&&s.heightMm===h&&s.groupKey===(d.id.startsWith('TAE')?'AB':d.id.startsWith('TR1')?'RT1':d.id.startsWith('TQ')?'QU':'RE'));
 if(!s)throw Error(JSON.stringify({id:d.id,w,h,sizes:f.sizes.filter(s=>s.widthMm===w)}));
 const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))};
 const c=familyProductConfig(view,s,1),t=katalogDesignToTemplate(d,f,null,{fonts}),design=scaleTemplate(t.template,d.plateMm,[w,h],fonts,{contain:true});
 c.profile.designs=[design];c.profile.defaultDesignId=design.id;c.localResources.fonts=fonts;c.localResources.motifs=t.motifs;
 const m=c.profile.optionGroups.find(g=>g.id==='mounting').values.find(v=>v.mountingRule?.accessory==='screws')||c.profile.optionGroups.find(g=>g.id==='mounting').values.find(v=>v.holes.length);
 const p=selectedProfile(c,{mounting:m.id}),started=Date.now(),r=avoidMounting(design.objects,p,{fonts,motifs:t.motifs});
 const result={id:d.id,size:s.key,mounting:m.id,holes:p.geometry.holes,before:design.objects.filter(o=>touchesMounting(o,p)).map(o=>o.id),after:r.objects.filter(o=>touchesMounting(o,p)).map(o=>o.id),changes:r.changed.map(v=>({id:v.id,dx:v.after.x-v.before.x,dy:v.after.y-v.before.y,scale:v.after.w/v.before.w})),unresolved:r.unresolved,ms:Date.now()-started};
 results.push(result);console.log(JSON.stringify(result));fs.writeFileSync(path.join(output,'cases',i+'.json'),JSON.stringify(c));
}
fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(audit,null,2)+'\n');fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');

// Review-only design corrections. Geometry, prices, bindings and source files
// are never written. Apply the returned designs to a NEW product revision only.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {selectedDoorbellProfile,doorbellLayoutIssue} from '../app/configurator/variant-m/doorbell-selection.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const clone=structuredClone;
export function prepareDoorbellDesignRepair(input){
 const result=clone(input),config={...input,profile:{...input.profile,optionGroups:input.optionGroups||input.profile.optionGroups}};
 const reference=input.doorbell.formats.find(f=>f.key==='16x28');
 if(!reference)throw Error('Originalvorlagen 16x28 fehlen.');
 const mappings=[];
 for(const target of result.doorbell.formats){
  if(target.key==='16x28')continue;
  const p=selectedDoorbellProfile(config,{format:target.key,frame:'FK-RUNDUM',color:'schwarz',mounting:'K00',position:'standard'}),a=p.geometry.designArea;
  target.profile.designs=reference.profile.designs.map(source=>{
   // Preserve the complete composition, fonts and motif aspect ratios. Only a
   // uniform display/design scale and translation change for the new free area.
   const corners=source.objects.flatMap(o=>{const r=(o.rotation||0)*Math.PI/180;return [-1,1].flatMap(x=>[-1,1].map(y=>({x:o.x+x*o.w/2*Math.cos(r)-y*o.h/2*Math.sin(r),y:o.y+x*o.w/2*Math.sin(r)+y*o.h/2*Math.cos(r)})));});
   const x=Math.min(...corners.map(o=>o.x)),y=Math.min(...corners.map(o=>o.y));
   const width=Math.max(...corners.map(o=>o.x))-x,height=Math.max(...corners.map(o=>o.y))-y;
   // 5% visual whitespace is an explicit proposal, not a manufacturing keepout.
   const scale=.9*Math.min((a.right-a.left)/width,(a.bottom-a.top)/height),tx=a.left+(a.right-a.left)*.05-x*scale,ty=a.top+(a.bottom-a.top)*.05-y*scale;
   const objects=source.objects.map(o=>{
    const n={...clone(o),x:o.x*scale+tx,y:o.y*scale+ty,w:o.w*scale,h:o.h*scale};
    if(o.type==='text'){n.size=o.size*scale;if(!Number.isFinite(n.size)||n.size<=0)throw Error(input.modelKey+'/'+target.key+'/'+source.id+': Ungültige Schriftgröße');if(o.lineHeight!==undefined)n.lineHeight=o.lineHeight*scale;}
    const issue=doorbellLayoutIssue(n,p);if(issue)throw Error(input.modelKey+'/'+target.key+'/'+source.id+': '+issue);
    return n;
   });
   const old=target.profile.designs.find(d=>d.id===source.id);
   mappings.push({designId:source.id,targetFormat:target.key,sourceFormat:'16x28',mode:'Referenz',fonts:[...new Set(source.objects.filter(o=>o.type==='text').map(o=>o.font))],motifs:source.objects.filter(o=>o.type==='motif').map(o=>o.motif),transform:{scale,tx,ty},sourceDesignSha256:hash(JSON.stringify(source)),freigabe:null});
   return {...clone(old),objects,marks:[]};
  });
 }
 // Chris, 29.10.2026: individual doorbell design elements may move/delete.
 // Persist rights in the proposed revision, rather than bypassing client guards.
 for(const f of result.doorbell.formats)for(const d of f.profile.designs)for(const o of d.objects){
  if(!['text','motif'].includes(o.type)||o.technicalLocked||o.locked||o.acrylicFixed)continue;
  o.customerEditable=true;
  if(result.workshopElementRights){
   const rights=result.workshopElementRights[d.id]??={};
   rights[o.id]={...rights[o.id],move:true,delete:true,...(o.type==='motif'?{replace:true}:{})};
  }
 }
 result.profile.designs=clone(result.doorbell.formats.find(f=>f.key===result.doorbell.defaultFormatKey).profile.designs);
 return {input:result,mappings};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [sourceDir,outDir]=process.argv.slice(2);if(!sourceDir||!outDir)throw Error('Aufruf: <native-inputs> <neuer Prüfordner>');
 if(fs.existsSync(outDir))throw Error('Prüfordner existiert bereits.');fs.mkdirSync(outDir,{recursive:true});
 let models=0,designs=0;for(const file of fs.readdirSync(sourceDir).filter(f=>f.endsWith('.json'))){
  const bytes=fs.readFileSync(path.join(sourceDir,file)),source=JSON.parse(bytes),repair=prepareDoorbellDesignRepair(source);
  const record={schema:'gravuru-doorbell-design-repair-review/v1',modelKey:source.modelKey,sourcePath:'migrationen/funkklingeln-42x3-20261027/native-inputs/'+file,sourceSha256:hash(bytes),status:'Sichtprüfung erforderlich – nicht freigegeben',mappings:repair.mappings};
  fs.writeFileSync(path.join(outDir,file),JSON.stringify(record,null,2)+'\n');models++;designs+=repair.mappings.length;
 }
 console.log(JSON.stringify({models,adaptedDesigns:designs,sourceFormat:'16x28',targetFormats:['24x20','35x18'],sourceWrites:0,liveWrites:0}));
}


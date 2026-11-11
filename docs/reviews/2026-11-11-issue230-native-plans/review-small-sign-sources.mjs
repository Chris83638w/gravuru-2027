import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [runArg,codeArg,catalogArg,outArg]=process.argv.slice(2);if(!outArg)throw Error('RUN CODE CATALOG OUT required');
const run=path.resolve(runArg),code=path.resolve(codeArg),catalog=path.resolve(catalogArg),imp=p=>import(pathToFileURL(path.join(code,p)).href);
const {smallSignMotifMode,smallSignMotifPosition}=await imp('app/configurator/variant-m/motif-placement.mjs');
const {selectedFamilyDesign}=await imp('app/configurator/variant-m/family-formats.mjs');
const {textOutlineBounds}=await imp('app/platform/sources/app/shared/models/text-outline-fit.mjs');
const {objectIssue}=await imp('app/platform/sources/app/shared/models/design-content.mjs');
const list=JSON.parse(execFileSync('git',['-C',catalog,'show','8236b8bfab7322447ec46661c116fa526331af3d:motive/motive.json'],{encoding:'utf8',maxBuffer:32*1024*1024})).motifs.filter(m=>m.file.startsWith('motive-kleine-schilder/')&&!m.file.endsWith('/schmetterlinge-1.svg'));
if(list.length!==13)throw Error('Wrong original selection');
const summary=JSON.parse(fs.readFileSync(path.join(run,'summary.json'))),rows=[];
for(const pair of summary.results){
 const c=JSON.parse(fs.readFileSync(path.join(run,pair.workbook.replace(/\.xlsx$/,''),'plan.json'))).products[0].document.config,small=!!c.familyFormats.fixedSize,objects=structuredClone(selectedFamilyDesign(c,c.profile.defaultDesignId).objects),before=JSON.stringify(objects),g=c.profile.geometry,width=Math.ceil(g.width*2),height=Math.ceil(g.height*2),alpha=new Uint8ClampedArray(width*height*4),fonts=c.localResources.fonts;
 // Conservative coverage of the real saved object ink boxes. This tests the
 // adapter on true IDs/text/fonts/transforms, not browser rasterization.
 for(const o of objects){if(o.uxHidden||o.role==='guide')continue;const b=o.type==='text'&&textOutlineBounds(o,fonts)||{left:-o.w/2,top:-o.h/2,right:o.w/2,bottom:o.h/2},a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),corners=[[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]].map(([x,y])=>[o.x+x*c-y*s,o.y+x*s+y*c]),xs=corners.map(p=>p[0]*2),ys=corners.map(p=>p[1]*2);for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<Math.min(height,Math.ceil(Math.max(...ys)));y++)for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<Math.min(width,Math.ceil(Math.max(...xs)));x++)alpha[(y*width+x)*4+3]=255;}
 const motifs=list.map(m=>{const isLine=/\/(strich-horizontal|feine-trennlinie)\.svg$/.test(m.file),o={id:'independent-new',type:'motif',motif:m.key,x:g.width/2,y:g.height/2,w:20,h:isLine?.32:20,rotation:0},mode=smallSignMotifMode(c,o),p=mode?smallSignMotifPosition({mode,object:o,objects,fonts,alpha,width,height,minScale:.5}):null;return {key:m.key,file:m.file,mode,scopeCorrect:mode===(small?(isLine?'center':'side'):null),placement:p,placementSafe:!p||(!objectIssue({...o,...p},{kind:'universal-product',geometry:{...g,safeMarginMm:0,holes:[]}})&&Math.abs(p.w/p.h-o.w/o.h)<1e-8),logoExcluded:smallSignMotifMode(c,{...o,type:'image',uxUploadId:'checked-svg'})===null,originalExcluded:smallSignMotifMode(c,{...o,templateOrigin:true})===null};});
 const dense=[{id:'full-name',type:'text',text:'Sehr langer vollständiger Name',x:g.width/2,y:g.height/2,w:g.width,h:g.height,rotation:0}],full=new Uint8ClampedArray(width*height*4);full.fill(255);
 const noSide=smallSignMotifPosition({mode:'side',object:{w:20,h:20},objects:dense,alpha:full,width,height,minScale:.5});
 rows.push({workbook:pair.workbook,planId:pair.planId,fixedSize:c.familyFormats.fixedSize??null,lineId:c.familyFormats.source.lineId,defaultDesign:c.profile.defaultDesignId,motifs,allPassed:motifs.every(m=>m.scopeCorrect&&m.placementSafe&&m.logoExcluded&&m.originalExcluded)&&before===JSON.stringify(objects)&&noSide===null,sourceObjectsUnchanged:before===JSON.stringify(objects),noSpaceRetainsFailure:noSide===null});
}
const result={readOnly:true,rows,allPassed:rows.every(r=>r.allPassed),smallChecks:rows.filter(r=>r.fixedSize).reduce((n,r)=>n+r.motifs.length,0),mainExclusionChecks:rows.filter(r=>!r.fixedSize).reduce((n,r)=>n+r.motifs.length,0),limitation:'Uses actual persisted configs, template objects, embedded fonts and pinned motif IDs. Conservative coverage of real object bounds; line sample aspect is explicit synthetic geometry. No browser raster/screenshot acceptance inferred.'};fs.writeFileSync(outArg,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({allPassed:result.allPassed,smallChecks:result.smallChecks,mainExclusionChecks:result.mainExclusionChecks,rows:rows.map(r=>({workbook:r.workbook,allPassed:r.allPassed,positions:r.motifs.filter(m=>m.placement).length}))},null,2));if(!result.allPassed)process.exitCode=1;

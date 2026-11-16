import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseDesignSvg} from '../search-material-final/app/workshop/katalog-convert.mjs';
import {flattenClosedSvgPath} from '../search-material-final/app/platform/sources/app/shared/models/contour-geometry.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const root='work/product-plans-run-v8', prior=read(root+'/review/geometry-analysis.json'), current=read('work/geometry-final-audit/reproduced.json');
assert.deepEqual(current.results,prior.results);
const git=p=>execFileSync('git',['-C','work/product-plans-catalog','show',current.catalogPin+':'+p],{maxBuffer:32*1024*1024});
const micro=[];
for(const row of current.results){
 assert.equal(sha(git(row.jsonPath)),row.jsonSha256);assert.equal(sha(git(row.svgPath)),row.svgSha256);
 if(!['TO-V2A-12x4-D5','TO-V2A-15x8-D5'].includes(row.id))continue;
 const parsed=parseDesignSvg(git(row.svgPath).toString()),layer=parsed.layers.find(x=>x.id==='motiv-2');
 const exactVertices=[];
 for(const d of layer.paths){
  // Inspect only exact M/L/C segment endpoints, never Bezier control points or
  // flattened approximations. These two source paths use explicit commands.
  assert(!/[QASTHVqastvhmcl]/.test(d));
  for(const segment of d.matchAll(/([MLCZ])([^MLCZ]*)/g)){
   if(segment[1]==='Z')continue;
   const n=segment[2].match(/-?(?:\d+\.?\d*|\.\d+)/g).map(Number);
   assert.equal(n.length,segment[1]==='C'?6:2);
   exactVertices.push([n.at(-2)+layer.translation[0],n.at(-1)+layer.translation[1]]);
  }
 }
 const [w,h]=row.sourceMm,a=w/2,b=h/2;
 const vertices=exactVertices.map(([x,y])=>({x,y,q:((x-a)/a)**2+((y-b)/b)**2})).sort((a,b)=>b.q-a.q);
 const p=vertices[0],toInt=n=>BigInt(Math.round(n*1000));
 const xi=toInt(p.x)-toInt(a),yi=toInt(p.y)-toInt(b),ai=toInt(a),bi=toInt(b);
 const numerator=xi*xi*bi*bi+yi*yi*ai*ai-ai*ai*bi*bi;
 assert(numerator>0n);
 micro.push({id:row.id,sourceMm:row.sourceMm,vertexMm:[p.x,p.y],normalizedEllipseValue:p.q,integerOutsideNumerator:numerator.toString(),integerDenominator:(ai*ai*bi*bi).toString(),meaning:'Exact 0.001-mm original vertex lies mathematically outside ideal ellipse; no flattening or converted-object rounding needed. This is not a manufacturing-tolerance statement.'});
}
const d803=current.results.find(r=>r.id==='TR-V2A-6.5x6.5-D803'),svg=git(d803.svgPath).toString(),parsed=parseDesignSvg(svg),layer=parsed.layers.find(l=>l.id==='text-1');
const source=read(root+'/Tuerschild-Acrylglas-3mm_v4/source-document.json'),font=source.config.localResources.fonts['Bebas Neue'].regular;
// Independently apply the source SVG anchor/baseline and its explicit -90-degree
// pivot, without using katalogDesignToTemplate, textGlyphLayout or scaleTemplate.
assert.equal(layer.rotation,-90);assert.equal(layer.text,'HARTMANN');assert.equal(layer.anchor,'middle');
const scale=11.92/font.units,width=[...layer.text].reduce((s,c)=>s+font.glyphs[c].a,0)*scale;
let advance=-width/2,worst={clearanceMm:Infinity},count=0;
for(const char of layer.text){const glyph=font.glyphs[char];for(const part of glyph.d.trim().slice(1).split('M')){
 const ring=flattenClosedSvgPath('M'+part,{toleranceMm:.00001/scale});
 for(const [gx,gy] of ring){const dx=advance+gx*scale,dy=-gy*scale,p=[15.567+dy,35.426-dx],clearanceMm=32.5-Math.hypot(p[0]-32.5,p[1]-32.5);count++;if(clearanceMm<worst.clearanceMm)worst={clearanceMm,pointMm:p,char};}
 }advance+=glyph.a*scale;}
assert(worst.clearanceMm< -1);
const summary=read(root+'/summary.json'),ids=current.results.map(r=>r.id),products=[];
for(const row of summary.results){
 const folder=path.join(root,row.workbook.replace(/\.xlsx$/,'')),plan=read(folder+'/plan.json'),config=plan.products[0].document.config,ff=config.familyFormats;
 const allIds=new Set(ff.designs.map(d=>d.katalog.designId));
 const presentExcluded=ids.filter(id=>allIds.has(id));assert.equal(presentExcluded.length,0);
 const allRefs=ff.formats.flatMap(f=>f.variants.flatMap(v=>v.designIds));
 const excludedRefs=allRefs.filter(id=>ids.some(x=>id==='katalog-'+x));assert.equal(excludedRefs.length,0);
 const report=read(folder+'/family-report.json');
 products.push({workbook:row.workbook,planId:row.planId,planHash:row.planHash,planFileSha256:sha(fs.readFileSync(folder+'/plan.json')),designs:allIds.size,formats:ff.formats.length,formatColorEntries:ff.formats.reduce((n,f)=>n+f.variants.length,0),emptyFormatColors:ff.formats.flatMap(f=>f.variants).filter(v=>!v.designIds.length).length,presentExcluded,excludedRefs,reportBlocked:report.blocked,reportUnavailable:report.unavailable,issues:plan.issues,valid:plan.valid});
 assert(plan.issues.every(x=>x.code==='open_question'));
}
const result={schema:'issue230-final-geometry-audit/v1',readOnly:true,catalogPin:current.catalogPin,codeHead:current.codeHead,sameNineMeasurementsAsPrior:true,verifiedOriginalFiles:18,reportedExcludedTargetColorOccurrences:current.results.reduce((n,r)=>n+r.allReportedOccurrences.length,0),noToleranceChanges:true,noOriginalChanges:true,measuredOneTargetPerDesign:true,microExactSourceVertices:micro,originalD803Text:{font:'Bebas Neue',fontSha256:sha(JSON.stringify(font)),sizeMm:11.92,pivotMm:[15.567,35.426],rotation:-90,points:count,...worst,target85mmClearanceApproxMm:worst.clearanceMm*85/65,method:'Original SVG coordinates and actual pinned font glyphs, source baseline/anchor and rotation; no converter object or centre/size rounding.'},exceptions:current.results.map(r=>({id:r.id,sourceMm:r.sourceMm,targetMm:r.occurrences[0].targetMm,minimumClearanceMm:r.minimumClearanceMm,classification:r.occurrences[0].objects[0].classification,objects:r.occurrences[0].objects.map(o=>o.objectId),targetColorOccurrences:r.allReportedOccurrences.length,sizes:[...new Set(r.allReportedOccurrences.map(o=>o.sizeKey.replace(/-(SW|AN)$/, '')))],jsonPath:r.jsonPath,jsonSha256:r.jsonSha256,svgPath:r.svgPath,svgSha256:r.svgSha256})),products};
fs.mkdirSync('outputs/Geometrie-230',{recursive:true});fs.writeFileSync('outputs/Geometrie-230/Abschlussaudit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ok:true,originalFiles:18,measurementsIdentical:true,microExactOutside:micro.map(x=>({id:x.id,q:x.normalizedEllipseValue})),d803Original:worst,products:products.map(x=>({name:x.workbook,designs:x.designs,empty:x.emptyFormatColors,issueCodes:x.issues.map(y=>y.code)}))}));

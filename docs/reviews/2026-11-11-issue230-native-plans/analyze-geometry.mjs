import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [runArg='work/product-plans-run-v6',catalogArg='work/product-plans-catalog',codeArg='work/product-plans-final',outArg='work/search-preview/geometry-analysis.json']=process.argv.slice(2);
const run=path.resolve(runArg),catalog=path.resolve(catalogArg),code=path.resolve(codeArg),pin='8236b8bfab7322447ec46661c116fa526331af3d';
const imp=p=>import(pathToFileURL(path.join(code,p)).href);
const {katalogDesignToTemplate,scaleTemplate,templateFit,parseDesignSvg}=await imp('app/workshop/katalog-convert.mjs');
const {geometryOf}=await imp('app/workshop/product-families.mjs');
const {embeddedMotifFits}=await imp('app/platform/sources/app/shared/models/embedded-motif-fit.mjs');
const {textOutlineFits}=await imp('app/platform/sources/app/shared/models/text-outline-fit.mjs');
const {measureText,textGlyphLayout}=await imp('app/platform/sources/app/shared/models/text-paths.mjs');
const {flattenClosedSvgPath,flattenContourPath,ellipseEdgeDistance}=await imp('app/platform/sources/app/shared/models/contour-geometry.mjs');
const {objectIssue,surfaceObjectIssue}=await imp('app/platform/sources/app/shared/models/design-content.mjs');
const sha=v=>createHash('sha256').update(v).digest('hex');
const read=p=>execFileSync('git',['-C',catalog,'show',pin+':'+p],{encoding:'utf8',maxBuffer:32*1024*1024});
const paths=execFileSync('git',['-C',catalog,'ls-tree','-r','--name-only',pin,'designs'],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split(/\r?\n/).filter(p=>p.startsWith('designs/edelstahl-')&&p.endsWith('/design.json'));
const folder=path.join(run,'Tuerschild-Acrylglas-3mm_v4'),report=JSON.parse(fs.readFileSync(path.join(folder,'family-report.json'))),source=JSON.parse(fs.readFileSync(path.join(folder,'source-document.json'))),fonts=source.config.localResources.fonts;
const families=new Map(['schwarz','anthrazit'].map(color=>{const p='familien/acryl/acryl-3mm-tuerschilder-'+color+'.json';return [JSON.parse(read(p)).id,{family:JSON.parse(read(p)),path:p,hash:sha(read(p))}];}));
const ids=JSON.parse(fs.readFileSync(path.join(folder,'pair.json'))).designs.fitExcludedIds;
const distanceSegment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function signedEllipse(x,y,a,b){const q=(x/a)**2+(y/b)**2;if(q<=1)return ellipseEdgeDistance(x,y,a,b);let lo=0,hi=Math.max(a,b)*Math.hypot(x,y);for(let i=0;i<70;i++){const t=(lo+hi)/2,v=(a*x/(t+a*a))**2+(b*y/(t+b*b))**2;if(v>1)lo=t;else hi=t;}const t=(lo+hi)/2;return -Math.hypot(a*a*x/(t+a*a)-x,b*b*y/(t+b*b)-y);}
function inside(ring,p){let v=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;}
function splitRings(d,tolerance){if(!d.trim().startsWith('M')||d.includes('m'))throw Error('Unsupported relative subpath origin');return d.trim().slice(1).split('M').flatMap(part=>{let start=null;return part.split('Z').filter(x=>x.trim()).map(chunk=>{const closed='M'+(start?start.join(' ')+' ':'')+chunk.trim()+'Z',ring=flattenClosedSvgPath(closed,{toleranceMm:Math.min(1,tolerance)});start=ring[0];return ring;});});}
function worldRings(o,resource,tolerance){
 const a=o.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),world=([x,y])=>[o.x+x*c-y*s,o.y+x*s+y*c];
 if(o.type==='text'){
  const {scale,lines}=textGlyphLayout(o,fonts),skew=o.italic?Math.tan(-Math.PI/15):0;
  return lines.flatMap(({baseline,glyphs})=>glyphs.flatMap(({glyph,x:advance})=>glyph.d.trim()?splitRings(glyph.d,tolerance/scale).map(r=>r.map(([gx,gy])=>{const y=baseline-gy*scale;return world([(advance+gx)*scale+skew*y,y]);})):[]));
 }
 const [bx,by,bw,bh]=resource.bounds,scale=Math.min(o.w/bw,o.h/bh),cx=bx+bw/2,cy=by+bh/2;
 return [...resource.svgFragment.matchAll(/<path\b([^>]+)\/>/g)].flatMap(match=>{
  const a=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  if(a.fill==='none'||a.stroke&&a.stroke!=='none'||a.opacity&&a.opacity!=='1')throw Error('Paint requires independent stroke/opacity analysis');
  return splitRings(a.d,tolerance/scale).map(r=>r.map(([x,y])=>world([(x-cx)*scale,(y-cy)*scale])));
 });
}
const results=[];
for(const id of ids){
 const p=paths.find(p=>p.endsWith('/'+id+'/design.json'));if(!p)throw Error('Missing original '+id);
 const raw=read(p),json=JSON.parse(raw),svgPath=p.replace(/json$/,'svg'),svg=read(svgPath),master={...json,json,id,plateMm:json.plateMm,source:json.source,svg:()=>svg};
 const occurrences=report.excluded.filter(r=>r.designId===id&&r.issues.some(s=>/ragt über/.test(s))),family=families.get(occurrences[0].familyId).family,converted=katalogDesignToTemplate(master,family,{id:'familienschilder'},{fonts});
 const parsed=parseDesignSvg(svg),row={id,jsonPath:p,jsonSha256:sha(raw),svgPath,svgSha256:sha(svg),sourceMm:master.plateMm,allReportedOccurrences:occurrences,occurrences:[],minimumClearanceMm:Infinity};
 for(const occ of occurrences.slice(0,1)){
  const f=families.get(occ.familyId).family,size=f.sizes.find(s=>s.key===occ.sizeKey),scaled=scaleTemplate(converted.template,converted.template.katalog.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true}),g0=geometryOf(f,size),g={...g0,width:g0.width,height:g0.height,shape:g0.shape==='plaque'?'rect':g0.shape,safeMarginMm:f.designArea.marginMm??0,holes:[]},profile={kind:'universal-product',geometry:g},contour=g.shape==='contour'?flattenContourPath(g.outlinePath):null;
  const clear=p=>{if(g.shape==='ellipse')return signedEllipse(p[0]-g.width/2,p[1]-g.height/2,g.width/2,g.height/2);if(g.shape==='contour'){const d=Math.min(...contour.map((a,i)=>distanceSegment(p,a,contour[(i+1)%contour.length])));return (inside(contour,p)?1:-1)*d;}throw Error('Unsupported '+g.shape);};
  const objects=[];
  for(const o0 of scaled.objects){const o=o0.type==='text'?measureText({...o0},fonts):o0,issue=surfaceObjectIssue(o,profile,{fonts,motifs:converted.motifs});if(!issue)continue;
   const resource=converted.motifs.find(r=>r.key===o.motif),nativeActual=o.type==='text'?textOutlineFits(o,g,fonts):embeddedMotifFits(o,g,resource);
   let actual;
   try{const rings=worldRings(o,resource,.00005);let min=Infinity,point=null,count=0;for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.02));for(let j=0;j<=steps;j++){const p=[a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps],d=clear(p);count++;if(d<min){min=d;point=p;}}}actual={minimumClearanceMm:min,worstPointMm:point,points:count,ringCount:rings.length,classification:min<-.0021?'actual_path_outside':min>.0021?'box_or_fallback_false_positive':'submillimetre_boundary_uncertainty'};row.minimumClearanceMm=Math.min(row.minimumClearanceMm,min);}catch(e){actual={error:e.message,classification:'needs_extended_path_analysis'};}
   let sourceOriginal;
   if(g.shape==='ellipse'&&o.type==='motif'){
    const layer=parsed.layers.find(l=>l.id===o.id),scale=scaled.katalog.scale,[dx,dy]=scaled.katalog.offsetMm;
    if(layer.rotation)throw Error('Source rotation requires separate check');
    const tolerance=id==='TO-V2A-9x6-D46'?.00005:.00001;
    const rings=layer.paths.flatMap(d=>splitRings(d,tolerance/scale)).map(r=>r.map(([x,y])=>[(x+layer.translation[0])*scale+dx,(y+layer.translation[1])*scale+dy]));
    let min=Infinity,point=null;for(const ring of rings)for(const p of ring){const v=clear(p);if(v<min){min=v;point=p;}}
    sourceOriginal={minimumClearanceMm:min,worstPointMm:point,flatteningToleranceMm:tolerance,transform:'Original SVG coordinates plus original layer translation, then exact proportional contain; no converter center/size rounding'};
   }
   objects.push({objectId:o.id,type:o.type,issue,boxIssue:objectIssue(o,profile),nativeActual,object:o,resourceBounds:resource?.bounds,...actual,...(sourceOriginal?{sourceOriginal}:{})});
  }
  row.occurrences.push({familyId:f.id,sizeKey:size.key,targetMm:[size.widthMm,size.heightMm],geometry:g,objects});
 }
 results.push(row);
 console.log(id+' '+JSON.stringify(row.occurrences[0].objects.map(x=>({object:x.objectId,nativeActual:x.nativeActual,min:x.minimumClearanceMm,classification:x.classification}))));
}
const output={catalogPin:pin,codeHead:execFileSync('git',['-C',code,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFontSha256:sha(JSON.stringify(fonts)),method:'Native conversion repeated from git-show pinned originals; same glyph outlines and rendering transforms; path flattening 0.00005 mm, sampled connecting segments at <=0.02 mm; contour reference flattening 0.002 mm. Signed clearance negative means sampled actual painted path outside. Values within +/-0.0021 mm are inconclusive. Strokes/opacity/relative subpaths fail closed. No source or object changed.',results};
fs.writeFileSync(outArg,JSON.stringify(output,null,2)+'\n');

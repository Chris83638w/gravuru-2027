import {flattenClosedSvgPath,contourContainsPolygon,ellipseEdgeDistance} from './contour-geometry.mjs';

// Narrow fallback for catalogue vector motifs whose conservative object box
// crosses an oval/contour. This is validation only: no object, resource bounds,
// customer drag clamp or physical outline is rewritten.
export const MOTIF_PATH_TOLERANCE_MM=.0005;
const cache=new WeakMap(),fitCache=new WeakMap(),MAX_POINTS=100000,MAX_SUBPATHS=2048;
const pathTag=/<path d="([MLHVCSQTAZ\d.,+eE\s-]+)" fill="currentColor" fill-rule="(evenodd|nonzero)"\/>/g;
const unsupported=()=>{throw Error('Unsupported embedded motif geometry');};
function pathsOf(resource,scale){
 const fragment=resource.svgFragment,tolerance=MOTIF_PATH_TOLERANCE_MM/scale;
 if(typeof fragment!=='string'||!fragment||fragment.length>1000000||resource.artwork||!Array.isArray(resource.bounds)||resource.bounds.length!==4||!resource.bounds.every(Number.isFinite)||resource.bounds[2]<=0||resource.bounds[3]<=0)unsupported();
 let entry=cache.get(resource);
 if(!entry||entry.fragment!==fragment){entry={fragment,values:new Map()};cache.set(resource,entry);}
 if(entry.values.has(tolerance))return entry.values.get(tolerance);
 const paths=[];let end=0,subpaths=0,points=0;
 for(const match of fragment.matchAll(pathTag)){
  if(match.index!==end||paths.length>=256)unsupported();end=match.index+match[0].length;
  const source=match[1].trim();if(!source.startsWith('M'))unsupported();
  const rings=[];
  for(const part of source.slice(1).split('M')){
   if(!part.trim())unsupported();let start=null;
   for(const chunk of part.split('Z')){
    if(!chunk.trim())continue;
    if(++subpaths>MAX_SUBPATHS)unsupported();
    // Fill implicitly closes open subpaths. Z is idempotent. A drawing command
    // after Z starts at the preceding subpath's start, as SVG specifies.
    const closed='M'+(start?start.join(' ')+' ':'')+chunk.trim()+'Z';
    const ring=flattenClosedSvgPath(closed,{toleranceMm:tolerance});
    start=ring[0];if(!start)unsupported();
    points+=ring.length;if(points>MAX_POINTS)unsupported();if(ring.length>=3)rings.push(ring);
   }
  }
  paths.push({rule:match[2],rings});
 }
 if(end!==fragment.length||!paths.length)unsupported();
 if(entry.values.size>=4)entry.values.delete(entry.values.keys().next().value);
 entry.values.set(tolerance,paths);return paths;
}
function distanceToSegment(p,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function winding(ring,p){
 let value=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],side=(b[0]-a[0])*(p[1]-a[1])-(p[0]-a[0])*(b[1]-a[1]);
  if(a[1]<=p[1]&&b[1]>p[1]&&side>0)value++;
  if(a[1]>p[1]&&b[1]<=p[1]&&side<0)value--;
 }
 return value;
}
function insideEllipse(ring,g,margin){
 const a=g.width/2,b=g.height/2;
 if(!(a>0&&b>0))unsupported();
 // The inset of an ellipse is convex, so complete straight segments fit when
 // their endpoints do. Reserve the curve approximation in target millimetres.
 return ring.every(([px,py])=>{
  const x=px-a,y=py-b,q=(x/a)**2+(y/b)**2;
  return q<=1&&(Math.min(a,b)*(1-Math.sqrt(q))>=margin||ellipseEdgeDistance(x,y,a,b)>=margin);
 });
}
// Null means unsupported and must retain the original box error. False is a
// supported, proven violation. True alone may clear a geometric box error.
function calculateFit(object,geometry,resource){
 if(!resource||resource.embeddedOnly!==true||object?.type!=='motif'||object.templateOrigin!==true||resource.key!==object.motif||!['ellipse','contour'].includes(geometry?.shape))return null;
 try{
  if(!['x','y','w','h','rotation'].every(k=>Number.isFinite(object[k]))||object.w<=0||object.h<=0||Math.abs(object.rotation)>360)unsupported();
  const [bx,by,bw,bh]=resource.bounds||[],scale=Math.min(object.w/bw,object.h/bh);
  if(!Number.isFinite(scale)||scale<=0||scale>1e6)unsupported();
  const angle=object.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=bx+bw/2,cy=by+bh/2;
  const transform=([x,y])=>{x=(x-cx)*scale;y=(y-cy)*scale;return [object.x+x*c-y*s,object.y+x*s+y*c];};
  const paths=pathsOf(resource,scale).map(path=>({...path,rings:path.rings.map(ring=>ring.map(transform))}));
  const margin=geometry.safeMarginMm??2;
  if(!Number.isFinite(margin)||margin<0)unsupported();
  // Reserve both the artwork approximation (here) and the physical contour
  // approximation (inside contourContainsPolygon) on the unsafe side.
  for(const path of paths)for(const ring of path.rings){
   const reserve=margin+MOTIF_PATH_TOLERANCE_MM;
   if(!(geometry.shape==='ellipse'?insideEllipse(ring,geometry,reserve):contourContainsPolygon(geometry,ring,{marginMm:reserve,holes:false})))return false;
  }
  const keepout=geometry.holeKeepoutMm??0;
  if(!Number.isFinite(keepout)||keepout<0)unsupported();
  for(const hole of geometry.holes||[]){
   if(![hole.x,hole.y,hole.diameter].every(Number.isFinite)||hole.diameter<=0)unsupported();
   const p=[hole.x,hole.y],radius=hole.diameter/2+keepout+MOTIF_PATH_TOLERANCE_MM;
   for(const path of paths){
    // Paths paint independently. Subpaths combine by this path's fill rule;
    // a hole in one path cannot erase another path's painted material.
    const turns=path.rings.reduce((n,ring)=>n+winding(ring,p),0);
    if(path.rule==='evenodd'?Math.abs(turns)%2===1:turns!==0)return false;
    for(const ring of path.rings)for(let i=0;i<ring.length;i++)if(distanceToSegment(p,ring[i],ring[(i+1)%ring.length])<radius)return false;
   }
  }
  return true;
 }catch{return null;}
}

// Repeated validation/rendering of the same imported resource does not flatten
// its large paths again. Any resource, object transform or geometry change gets
// a different result; the cache is bounded and released with the resource.
export function embeddedMotifFits(object,geometry,resource){
 if(!resource||typeof resource!=='object'||resource.artwork||resource.embeddedOnly!==true||object?.type!=='motif'||object.templateOrigin!==true||resource.key!==object.motif)return null;
 let entry=fitCache.get(resource);
 if(!entry||entry.fragment!==resource.svgFragment){entry={fragment:resource.svgFragment,values:new Map()};fitCache.set(resource,entry);}
 const key=JSON.stringify([resource.bounds,object.x,object.y,object.w,object.h,object.rotation,geometry?.shape,geometry?.width,geometry?.height,geometry?.outlinePath,geometry?.safeMarginMm,geometry?.holeKeepoutMm,geometry?.holes]);
 if(entry.values.has(key))return entry.values.get(key);
 const result=calculateFit(object,geometry,resource);
 if(entry.values.size>=8)entry.values.delete(entry.values.keys().next().value);
 entry.values.set(key,result);return result;
}

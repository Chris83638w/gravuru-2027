import {contourNearestPolygonBoundary} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {transformedCorners} from './usability-model.mjs';
const extent=o=>{const a=(o.rotation||0)*Math.PI/180;return {x:(Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)))/2,y:(Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a)))/2};};
export function createDragSnap(base,getArea,getGeometry){
 const engine={...base,alignmentTargets(state,object){
  const existing=base.alignmentTargets(state,object),targets={x:[...existing.x],y:[...existing.y]},half=extent(object),area=getArea(),geometry=getGeometry();
  for(const other of state.objects){if(other.id===object.id||other.uxHidden||other.role==='guide')continue;const otherHalf=extent(other);for(const axis of ['x','y'])for(const edge of [0,-1,1]){const key=other.id+'-'+axis+'-'+edge;if(!targets[axis].some(t=>t.key===key))targets[axis].push({key,value:other[axis]+edge*(otherHalf[axis]-half[axis]),line:other[axis]+edge*otherHalf[axis],other});}}
  for(const axis of ['x','y']){const start=axis==='x'?area.left:area.top,end=axis==='x'?area.right:area.bottom;targets[axis].push({key:'safe-'+axis+'-start',value:start+half[axis],line:start},{key:'safe-'+axis+'-end',value:end-half[axis],line:end});targets[axis]=targets[axis].filter(t=>!objectIssue({...object,rotation:object.rotation||0,[axis]:t.value},{geometry}));}
  return targets;
 }};
 return (state,object,physicalScale=1,locks={})=>engine.snap(state,object,1.5/physicalScale,locks);
}
function outline(g){
 const w=g.width,h=g.height,r=Math.min(g.cornerRadiusMm||0,w/2,h/2);
 if(g.shape==='contour')return g.outlinePath;
 if(g.shape==='ellipse')return 'M0 '+h/2+'A'+w/2+' '+h/2+' 0 1 0 '+w+' '+h/2+'A'+w/2+' '+h/2+' 0 1 0 0 '+h/2+'Z';
 return r?'M'+r+' 0H'+(w-r)+'A'+r+' '+r+' 0 0 1 '+w+' '+r+'V'+(h-r)+'A'+r+' '+r+' 0 0 1 '+(w-r)+' '+h+'H'+r+'A'+r+' '+r+' 0 0 1 0 '+(h-r)+'V'+r+'A'+r+' '+r+' 0 0 1 '+r+' 0Z':'M0 0H'+w+'V'+h+'H0Z';
}
export function nearestPlateEdge(object,{geometry,scale=1,x=0,y=0}){
 const corners=transformedCorners(object,{x:-object.w/2,y:-object.h/2,width:object.w,height:object.h}).map(p=>[p.x*scale+x,p.y*scale+y]);
 const found=contourNearestPolygonBoundary({...geometry,outlinePath:outline(geometry)},corners),back=p=>({x:(p[0]-x)/scale,y:(p[1]-y)/scale});
 return {distanceMm:found.distance,object:back(found.object),edge:back(found.edge),label:new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(found.distance)+' mm zum Rand'};
}
export function alignmentLabel(target){return target.key.startsWith('plate-')?'Mitte':target.key.startsWith('safe-')?'Sicherheitsrand':'bündig mit „'+String(target.other?.text||target.other?.label||'Element').replace(/\s+/g,' ').slice(0,32)+'“';}

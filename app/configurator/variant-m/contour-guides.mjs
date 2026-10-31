import {contourSafeAreaSvg} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {fitsSurface} from './usability-model.mjs';

const fits=(object,geometry)=>fitsSurface(object,{x:-object.w/2,y:-object.h/2,width:object.w,height:object.h},geometry);
// Keep the existing targets and hysteresis, but never snap an element across the
// outer contour margin. Artwork may cover fixed holes, just like free placement.
export function contourGuides(base,getGeometry){
 return {...base,
  alignmentTargets(state,object){
   const targets=base.alignmentTargets.call(base,state,object),geometry=getGeometry();
   if(geometry?.shape!=='contour')return targets;
   return Object.fromEntries(['x','y'].map(axis=>[axis,targets[axis].filter(t=>fits({...object,[axis]:t.value},geometry))]));
  },
  snap(state,object,tolerance,previous={}){
   const geometry=getGeometry();
   if(geometry?.shape!=='contour')return base.snap.call(this,state,object,tolerance,previous);
   const result=base.snap.call(this,state,object,tolerance,previous);
   if(fits({...object,x:result.x,y:result.y},geometry))return result;
   // Two individually valid axis targets can combine into an invalid corner.
   for(const axis of ['x','y'])if(result.locks[axis]&&fits({...object,[axis]:result[axis]},geometry))return {x:object.x,y:object.y,[axis]:result[axis],locks:{[axis]:result.locks[axis]}};
   return {x:object.x,y:object.y,locks:{}};
  }
 };
}
let guideSerial=0;
export function maskContourGuides(group,geometry){
 if(geometry?.shape!=='contour')return;
 const area=contourSafeAreaSvg(geometry,'contour-guides-'+(++guideSerial));
 group.innerHTML='<defs>'+area.defs+'</defs><g '+area.attribute+'>'+group.innerHTML+'</g>';
}

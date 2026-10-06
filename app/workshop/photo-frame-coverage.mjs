import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
import {photoArchCurves} from '../platform/sources/app/shared/models/photo-shape.mjs';

// Extrema of one cubic Bézier projected onto a rectangle's local axis.
function cubicRange(values){
 const [p0,p1,p2,p3]=values,a=-p0+3*p1-3*p2+p3,b=2*(p0-2*p1+p2),c=p1-p0;
 const ts=[0,1];
 if(Math.abs(a)<1e-12){if(Math.abs(b)>1e-12)ts.push(-c/b);}
 else {const d=b*b-4*a*c;if(d>=0){ts.push((-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a));}}
 const result=ts.filter(t=>t>=0&&t<=1).map(t=>(1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3);
 return [Math.min(...result),Math.max(...result)];
}

 // Centred mask dimensions; curves are shared with the actual renderer.
function maskRange(slot,nx,ny){
 const rx=slot.w/2,ry=slot.h/2;
 if(['circle','ellipse'].includes(slot.photoShape)){
  const extent=Math.hypot(nx*rx,ny*ry);return [-extent,extent];
 }
 if(slot.photoShape!=='arch'){
  const extent=Math.abs(nx)*rx+Math.abs(ny)*ry;return [-extent,extent];
 }
 const dot=([x,y])=>x*nx+y*ny;
 const ranges=[[-rx,ry],[rx,ry]].map(dot);
 for(const curve of photoArchCurves(slot))ranges.push(...cubicRange(curve.map(dot)));
 return [Math.min(...ranges),Math.max(...ranges)];
}

// Geometry only: transparent pixels inside an uploaded image are not evaluated.
// Rotation and position of the whole slot do not change its local coverage.
export function photoFrameCovered(slot,asset){
 if(slot.type!=='photoSlot')return null;
 const p=photoPlacement(slot,asset),a=p.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [[c,s,p.w/2],[-s,c,p.h/2]].every(([nx,ny,half])=>{
  const [min,max]=maskRange(slot,nx,ny),center=p.cx*nx+p.cy*ny;
  return min>=center-half-1e-7&&max<=center+half+1e-7;
 });
}

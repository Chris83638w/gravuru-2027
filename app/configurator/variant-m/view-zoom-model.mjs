// Display coordinates only. This module never receives or edits design objects.
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const viewScale=value=>clamp(finite(value,1),1,4);
export const fitView=()=>({scale:1,x:0,y:0});
export function interpolateView(from,to,progress){const t=clamp(finite(progress),0,1),ease=1-(1-t)**3;return Object.fromEntries(['scale','x','y'].map(key=>[key,from[key]+(to[key]-from[key])*ease]));}
export function constrainView(view,bounds){
 const scale=viewScale(view.scale);if(scale===1)return fitView();
 const {plate}=bounds;
 // Preserve the fitted plate footprint (including its surrounding stage padding).
 // Clamping to the outer stage would break cursor anchoring near 100%.
 const axis=(key,size)=>{const limit=plate[size]*(scale-1)/2;return clamp(finite(view[key]),-limit,limit);};
 return {scale,x:axis('x','width'),y:axis('y','height')};
}
export function projectView(point,view,bounds){const p=bounds.plate,c={x:p.x+p.width/2,y:p.y+p.height/2};return {x:c.x+(point.x-c.x)*view.scale+view.x,y:c.y+(point.y-c.y)*view.scale+view.y};}
export function unprojectView(point,view,bounds){const p=bounds.plate,c={x:p.x+p.width/2,y:p.y+p.height/2};return {x:c.x+(point.x-c.x-view.x)/view.scale,y:c.y+(point.y-c.y-view.y)/view.scale};}
export function zoomViewAt(view,nextScale,anchor,bounds){
 const scale=viewScale(nextScale),p=bounds.plate,c={x:p.x+p.width/2,y:p.y+p.height/2},ratio=scale/view.scale;
 return constrainView({scale,x:anchor.x-c.x-(anchor.x-c.x-view.x)*ratio,y:anchor.y-c.y-(anchor.y-c.y-view.y)*ratio},bounds);
}
export function panView(view,delta,bounds){return constrainView({...view,x:view.x+delta.x,y:view.y+delta.y},bounds);}
export function pinchView(view,start,current,bounds){
 const center=points=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}),distance=points=>Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);
 const before=center(start),after=center(current),scale=viewScale(view.scale*distance(current)/Math.max(1,distance(start))),p=bounds.plate,c={x:p.x+p.width/2,y:p.y+p.height/2},ratio=scale/view.scale;
 return constrainView({scale,x:after.x-c.x-(before.x-c.x-view.x)*ratio,y:after.y-c.y-(before.y-c.y-view.y)*ratio},bounds);
}
export function autoZoomView(view,box,bounds){
 const v=bounds.viewport;if(!(box.width>0)||box.width>=v.width*.5)return fitView();
 const scale=Math.min(3,Math.max(1,Math.min(v.width*.7/box.width,v.height*.7/Math.max(1,box.height)))),p=bounds.plate,c={x:p.x+p.width/2,y:p.y+p.height/2};
 return constrainView({scale,x:v.x+v.width/2-c.x-(box.x+box.width/2-c.x)*scale,y:v.y+v.height/2-c.y-(box.y+box.height/2-c.y)*scale},bounds);
}
export function visibleViewRect(view,bounds){
 const p=bounds.plate,v=bounds.viewport,a=unprojectView({x:v.x,y:v.y},view,bounds),b=unprojectView({x:v.x+v.width,y:v.y+v.height},view,bounds),x=Math.max(p.x,a.x),y=Math.max(p.y,a.y);
 return {x,y,width:Math.max(0,Math.min(p.x+p.width,b.x)-x),height:Math.max(0,Math.min(p.y+p.height,b.y)-y)};
}

// Gesture arbitration is shared by mouse/touch tests and the real event adapter.
// A second touch cancels an unfinished object drag before changing the view.
export function createViewGesture({getView,setView,getBounds,cancelObject=()=>{},onTap=()=>{},onBlankTap=()=>{},photoActive=()=>false}){
 const pointers=new Map();let gesture=null;
 const handled=()=>gesture?.kind==='pan'||gesture?.kind==='pinch'||gesture?.kind==='wait';
 return {
  has:id=>pointers.has(id),
  down(point){
   if(point.kind==='control'||photoActive())return false;
   if(point.pointerType!=='touch'&&point.button!==0)return false;
   pointers.set(point.id,{...point,start:{x:point.x,y:point.y},moved:false});
   const touches=[...pointers.values()].filter(p=>p.pointerType==='touch');
   if(touches.length===2){cancelObject();gesture={kind:'pinch',ids:touches.map(p=>p.id),start:touches.map(p=>({x:p.x,y:p.y})),view:{...getView()}};return true;}
   if(handled())return true;
   if(point.kind==='blank'&&getView().scale>1){gesture={kind:'pan',id:point.id,start:{x:point.x,y:point.y},view:{...getView()}};return true;}
   return false;
  },
  move(point){
   const prior=pointers.get(point.id);if(!prior)return false;
   Object.assign(prior,{x:point.x,y:point.y,moved:prior.moved||Math.hypot(point.x-prior.start.x,point.y-prior.start.y)>5});
   if(gesture?.kind==='pinch'){
    const points=gesture.ids.map(id=>pointers.get(id));if(points.every(Boolean))setView(pinchView(gesture.view,gesture.start,points,getBounds()));return true;
   }
   if(gesture?.kind==='pan'&&gesture.id===point.id){setView(panView(gesture.view,{x:point.x-gesture.start.x,y:point.y-gesture.start.y},getBounds()));return true;}
   return !!handled();
  },
  up(point,{cancelled=false}={}){
   const prior=pointers.get(point.id);if(!prior)return false;const used=!!handled();pointers.delete(point.id);
   if(!cancelled&&!prior.moved&&Math.hypot(point.x-prior.start.x,point.y-prior.start.y)<=5&&prior.kind==='blank'&&(!used||gesture?.kind==='pan'))onBlankTap(prior);
   if(used)gesture=pointers.size?{kind:'wait'}:null;
   else if(!cancelled&&!prior.moved&&Math.hypot(point.x-prior.start.x,point.y-prior.start.y)<=5&&prior.kind==='object'&&prior.pointerType==='touch')onTap(prior.objectId);
   return used;
  },
  reset(){pointers.clear();gesture=null;},
  ids:()=>[...pointers.keys()],
 };
}
